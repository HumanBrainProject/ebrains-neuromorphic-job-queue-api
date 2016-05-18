"""


"""

import json
import logging
from datetime import date
from django.shortcuts import render
from django.forms.models import model_to_dict
from django.views.generic import View
from django.http import (HttpResponse, JsonResponse,
                         HttpResponseBadRequest,     # 400
                         HttpResponseForbidden,      # 403
                         HttpResponseNotFound,       # 404
                         HttpResponseNotAllowed,     # 405
                         HttpResponseNotModified,    # 304
                         HttpResponseRedirect)       # 302
from django.core.serializers.json import DjangoJSONEncoder
from django.conf import settings
import requests
from hbp_app_python_auth.auth import get_auth_header

from .models import Project, Quota
from .forms import ProposalForm, AddQuotaForm

logger = logging.getLogger("quotas")

# # === User workflow ===
#
# create new project proposal
# edit project proposal
# view project proposal / accepted project
# view review(s)
# view quota usage
#
#
# # === Reviewer workflow ===
#
# list assigned proposals
# view proposal
# edit review
# view review
#
#
# # === Coordinator workflow ===
#
# list proposals / accepted projects
# view proposal / accepted project
# accept/refuse project
# assign reviewer
# set quotas
#
#
# # === Job manager workflow ===
#
# view quota
# increment usage

def get_authorization_header(request):
    auth = request.META.get("HTTP_AUTHORIZATION", None)
    if auth is None:
        try:
            auth = get_auth_header(request.user.social_auth.get())
            logger.debug("Got authorization from database")
        except AttributeError:
            pass
    # in case of 401 error, need to trap and redirect to login
    else:
        logger.debug("Got authorization from HTTP header")
    return {'Authorization': auth}


def get_permissions(request, context):
    """
    Obtain the permissions of the associated Collab for the user associated with the
    Bearer token in the Authentication header.
    """
    svc_url = settings.HBP_COLLAB_SERVICE_URL
    url = '%scollab/context/%s/' % (svc_url, context)
    headers = get_authorization_header(request)
    res = requests.get(url, headers=headers)
    if res.status_code != 200:
        return {}
    collab_id = res.json()['collab']['id']
    url = '%scollab/%s/permissions/' % (svc_url, collab_id)
    res = requests.get(url, headers=headers)
    if res.status_code != 200:
        return {}
    return res.json()


def get_admin_list(request):
    url = 'https://services.humanbrainproject.eu/idm/v1/api/group/hbp-neuromorphic-platform-admin/members'
    headers = get_authorization_header(request)
    res = requests.get(url, headers=headers)
    logger.debug(headers)
    if res.status_code != 200:
        raise Exception("Couldn't get list of administrators." + res.content + str(headers))
    data = res.json()
    assert data['page']['totalPages'] == 1
    admins = [user['id'] for user in data['_embedded']['users']]
    return admins


def is_admin(request):
    try:
        admins = get_admin_list(request)
    except Exception as err:
        logger.warning(err.message)
        return False
    try:
        user_id = get_user(request)["id"]
    except Exception as err:
        logger.warning(err.message)
        return False
    return user_id in admins


def get_user(request):
    url = "{}/user/me".format(settings.HBP_IDENTITY_SERVICE_URL)
    headers = get_authorization_header(request)
    logger.debug("Requesting user information for given access token")
    res = requests.get(url, headers=headers)
    if res.status_code != 200:
        logger.debug("Error" + res.content)
        raise Exception(res.content)
    logger.debug("User information retrieved")
    return res.json()


def notify_coordinators(request, project):
    coordinators = get_admin_list(request)
    url = 'https://services.humanbrainproject.eu/stream/v0/api/notification/'
    headers = get_authorization_header(request)
    targets = [{"type": "HBPUser", "id": id} for id in coordinators]
    payload = {
        "summary": "New access request for the Neuromorphic Computing Platform: {}".format(project.title),
        "targets": targets,
        "object": {
            "type": "HBPCollaboratoryContext",
            "id": "346173bb-887c-4a47-a8fb-0da5d5980dfc"
        }
    }
    res = requests.post(url, json=payload, headers=headers)
    if res.status_code not in (200, 204):
        logger.error("Unable to notify coordinators. {}: {}".format(res.status_code, res.content))
        return False
    return True


class ProjectSerializer(object):

    @staticmethod
    def _to_dict(project):
        assert isinstance(project, Project), type(project)
        data = {}
        for field in ("context", "collab", "owner", "title", "abstract",
                      "description", "duration"):
            data[field] = getattr(project, field)
        if project.start_date is not None:
            data["start_date"] = project.start_date
        data["status"] = project.status()
        data["resource_uri"] = "/projects/{}".format(project.context)
        data["quotas"] = [QuotaSerializer._to_dict(quota) for quota in project.quota_set.all()]
        return data

    @classmethod
    def serialize(cls, projects):
        encoder = DjangoJSONEncoder(ensure_ascii=False, indent=4)
        if isinstance(projects, Project):
            data = cls._to_dict(projects)
        else:
            data = [cls._to_dict(project) for project in projects]
        return encoder.encode(data)


class QuotaSerializer(object):

    @staticmethod
    def _to_dict(quota):
        data = {
            "project": quota.project.pk,
            "limit": quota.limit,
            "usage": quota.usage,
            "units": quota.units,
            "platform": quota.platform,
            "resource_uri": "/projects/{}/quotas/{}".format(quota.project.pk, quota.pk)
        }
        return data

    @classmethod
    def serialize(cls, quotas):
        if isinstance(quotas, Quota):
            data = cls._to_dict(quotas)
        else:
            data = [cls._to_dict(quota) for quota in quotas]
        encoder = DjangoJSONEncoder(ensure_ascii=False, indent=4)
        return encoder.encode(data)


class BaseResource(View):

    def _get_project(self, project_id):
        try:
            project = Project.objects.get(context=project_id)
        except Project.DoesNotExist:
            project = None
        return project


class ProjectResource(BaseResource):
    serializer = ProjectSerializer

    def get(self, request, *args, **kwargs):
        """View a proposal"""
        project = self._get_project(kwargs["project_id"])
        if project is None:
            return HttpResponseNotFound()
        content = self.serializer.serialize(project)
        return HttpResponse(content, content_type="application/json; charset=utf-8", status=200)

    def put(self, request, *args, **kwargs):
        """Edit a proposal"""
        data = json.loads(request.body)

        if data['status'] in ('accepted', 'rejected'):
            logger.info("Changing status")
            return self.change_status(request, kwargs["project_id"], data['status'])
        else:
            logger.info("Updating project: %s", data)
            permissions = get_permissions(request, kwargs["project_id"])
            if "UPDATE" not in permissions:
                logger.info(permissions)
                return HttpResponseForbidden("You do not have permission to modify this project.")
            project = self._get_project(kwargs["project_id"])
            if project is None:
                return HttpResponseNotFound()
            if project.submission_date is not None:
                return HttpResponseForbidden("Can't edit a submitted form.")
            data = json.loads(request.body)
            for field, value in model_to_dict(project).iteritems():
                if field not in data:
                    data[field] = value
            form = ProposalForm(data, instance=project)
            if form.is_valid():
                project = form.save()
                if form.cleaned_data.get("submitted", False):
                    project.submission_date = date.today()
                    project.save()
                    notify_coordinators(request, project)
                return HttpResponse('', status=200)  # should be 204 No Content ?
            else:
                return HttpResponseBadRequest(form.errors.as_json(),
                                              content_type="application/json; charset=utf-8")

    def change_status(self, request, project_id, new_status):
        if not is_admin(request):
            return HttpResponseForbidden("You do not have permission to change the status of this project.")
        project = self._get_project(project_id)
        current_status = project.status()
        if new_status == current_status:
            return HttpResponse('', status=204)
        elif new_status in ('accepted', 'rejected'):
            project.decision_date = date.today()
            if new_status == 'accepted':
                project.start_date = project.decision_date
                project.accepted = True
            project.save()
            return HttpResponse('', status=204)
        else:
            return HttpResponseBadRequest("Status can only be changed to 'accepted' or 'rejected'")
            # in future, might want to set project back to "in preparation" to allow further editing


class ProjectListResource(BaseResource):
    serializer = ProjectSerializer

    def get(self, request, *args, **kwargs):
        """View all proposals"""
        if not is_admin(request):
            return HttpResponseForbidden("You do not have permission to view the list of projects.")
        # todo: for non-admin users, return projects for which they are the owner
        projects = Project.objects.all()
        content = self.serializer.serialize(projects)
        return HttpResponse(content, content_type="application/json; charset=utf-8", status=200)

    def post(self, request, *args, **kwargs):
        """Create a proposal"""
        form = ProposalForm(json.loads(request.body))
        if form.is_valid():
            permissions = get_permissions(request, form.cleaned_data["context"])  # we have the collab id, so could use that instead of context
            if "UPDATE" not in permissions:
                return HttpResponseForbidden("You do not have permission to create a project.")
            project = form.save()
            if form.cleaned_data.get("submitted", False):
                project.submission_date = date.today()
                project.save()
                notify_coordinators(request, project)
            content = self.serializer.serialize(project)
            return HttpResponse(content, content_type="application/json; charset=utf-8", status=201)
        else:
            logger.info("Bad request: {}\nMessage body: {}".format(form.errors.as_json(), request.body))
            return HttpResponseBadRequest(form.errors.as_json(),
                                           content_type="application/json; charset=utf-8")


class ProjectMemberResource(View):
    pass


class ReviewResource(View):
    pass


class QuotaResource(BaseResource):
    serializer = QuotaSerializer

    def _get_quota(self, quota_id):
        try:
            quota = Quota.objects.get(pk=quota_id)
        except Quota.DoesNotExist:
            quota = None
        return quota

    def get(self, request, *args, **kwargs):
        """View a quota"""
        project = self._get_project(kwargs["project_id"])
        if project is None:
            return HttpResponseNotFound("No such project")
        quota = self._get_quota(kwargs["quota_id"])  # use project+platform instead of quota id
        if quota is None:
            return HttpResponseNotFound("No such quota")
        assert quota.project == project
        content = self.serializer.serialize(quota)
        return HttpResponse(content, content_type="application/json; charset=utf-8", status=200)


class QuotaListResource(BaseResource):
    serializer = QuotaSerializer

    def post(self, request, *args, **kwargs):
         """Add a quota to a project"""
         if not is_admin(request):
             return HttpResponseForbidden("You do not have permission to add a quota to a project.")
         form = AddQuotaForm(json.loads(request.body))
         if form.is_valid():
             quota = form.save()
             content = self.serializer.serialize(quota)
             return HttpResponse(content, content_type="application/json; charset=utf-8", status=201)
         else:
             print(form.data)
             return HttpResponseBadRequest(str(form.errors))  # todo: plain text

    def get(self, request, *args, **kwargs):
        project = self._get_project(kwargs["project_id"])
        if project is None:
            return HttpResponseNotFound("No such project")
        quotas = Quota.objects.filter(project=project)
        content = self.serializer.serialize(quotas)
        return HttpResponse(content, content_type="application/json; charset=utf-8", status=200)
