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
from .auth import CollabService, get_authorization_header, get_admin_list, is_admin

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


def json_err(response_cls, msg):
     return response_cls(json.dumps({"error": msg}),
                         content_type="application/json; charset=utf-8")


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

        collab = CollabService(request, context=kwargs["project_id"])
        if (collab.can_view  # public collab, or a member of a private collab
            and (collab.is_team_member or project.accepted)):  # for public collabs, only accepted projects can be viewed
            content = self.serializer.serialize(project)
            return HttpResponse(content, content_type="application/json; charset=utf-8", status=200)
        else:
            return json_err(HttpResponseForbidden, "You do not have permission to view this resource.")

    def put(self, request, *args, **kwargs):
        """Edit a proposal"""
        data = json.loads(request.body)

        if data.get('status', None) in ('accepted', 'rejected'):
            logger.info("Changing status")
            return self.change_status(request, kwargs["project_id"], data['status'])
        else:
            logger.info("Updating project: %s", data)
            collab = CollabService(request, context=kwargs["project_id"])
            if not collab.is_team_member:
                logger.info(collab.permissions)
                return json_err(HttpResponseForbidden, "You do not have permission to modify this project.")
            project = self._get_project(kwargs["project_id"])
            if project is None:
                return HttpResponseNotFound()
            if project.submission_date is not None:
                return json_err(HttpResponseForbidden, "Can't edit a submitted form.")
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
            return json_err(HttpResponseBadRequest, "Status can only be changed to 'accepted' or 'rejected'")
            # in future, might want to set project back to "in preparation" to allow further editing


class ProjectListResource(BaseResource):
    serializer = ProjectSerializer

    def get(self, request, *args, **kwargs):
        """
        View proposals, filtered by collab and/or by status

        Non-admins *must* filter by a public collab or a private collab of which they are a member;
        only admins can view all proposals.
        """
        filters = {}
        if "collab" in request.GET:
            filters["collab"] = request.GET["collab"]
        if "status" in request.GET:
            requested_status = request.GET["status"]
            if requested_status == "accepted":
                filters["accepted"] = True
            elif requested_status == "rejected":
                filters["accepted"] = False
                filters["decision_date__isnull"] = False
            elif requested_status == "under review":
                filters["submission_date__isnull"] = False
                filters["decision_date__isnull"] = True
            elif requested_status == "in preparation":
                filters["submission_date__isnull"] = True
            else:
                return json_err(HttpResponseBadRequest, "Invalid status: '{}'".format(requested_status))

        if not is_admin(request):
            if "collab" in filters:
                collab = CollabService(request, collab_id=filters["collab"])
                if not collab.can_view:
                    return json_err(HttpResponseForbidden, "You do not have permission to view the list of projects.")
                if not collab.is_team_member:
                    filters["accepted"] = True  # non-members only see accepted projects.
            else:
                return json_err(HttpResponseForbidden, "You must specify a collab id.")
        projects = Project.objects.filter(**filters)
        content = self.serializer.serialize(projects)
        return HttpResponse(content, content_type="application/json; charset=utf-8", status=200)

    def post(self, request, *args, **kwargs):
        """Create a proposal"""
        form = ProposalForm(json.loads(request.body))
        if form.is_valid():
            collab = CollabService(request, collab_id=form.cleaned_data["collab"])
            if not collab.is_team_member:
                return json_err(HttpResponseForbidden, "You do not have permission to create a project.")
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
            return json_err(HttpResponseNotFound, "No such project")

        collab = CollabService(request, context=kwargs["project_id"])
        if not collab.is_team_member:
            return json_err(HttpResponseForbidden, "You do not have permission to view this resource.")

        quota = self._get_quota(kwargs["quota_id"])  # use project+platform instead of quota id
        if quota is None:
            return json_err(HttpResponseNotFound, "No such quota")
        assert quota.project == project
        content = self.serializer.serialize(quota)
        return HttpResponse(content, content_type="application/json; charset=utf-8", status=200)


class QuotaListResource(BaseResource):
    serializer = QuotaSerializer

    def post(self, request, *args, **kwargs):
         """Add a quota to a project"""
         if not is_admin(request):
             return json_err(HttpResponseForbidden, "You do not have permission to add a quota to a project.")
         form = AddQuotaForm(json.loads(request.body))
         if form.is_valid():
             quota = form.save()
             content = self.serializer.serialize(quota)
             return HttpResponse(content, content_type="application/json; charset=utf-8", status=201)
         else:
             print(form.data)
             return HttpResponseBadRequest(form.errors.as_json(),
                                           content_type="application/json; charset=utf-8")

    def get(self, request, *args, **kwargs):
        project = self._get_project(kwargs["project_id"])
        if project is None:
            return json_err(HttpResponseNotFound, "No such project")
        collab = CollabService(request, context=kwargs["project_id"])
        if not collab.is_team_member:
            # todo: admins should be able to see quotas even if they are not a member of the collab
            return json_err(HttpResponseForbidden, "You do not have permission to view this resource.")
        quotas = Quota.objects.filter(project=project)
        content = self.serializer.serialize(quotas)
        return HttpResponse(content, content_type="application/json; charset=utf-8", status=200)
