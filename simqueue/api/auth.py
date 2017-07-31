
import logging
from tastypie.authorization import Authorization
from tastypie.authentication import Authentication, ApiKeyAuthentication
from tastypie.exceptions import NotFound
from django.conf import settings
import requests
from social.apps.django_app.default.models import UserSocialAuth


logger = logging.getLogger("simqueue")


class CollabService(object):

    @classmethod
    def _get_permissions(cls, request, collab_id):
        logger.debug("Checking permissions for collab {}".format(collab_id))
        svc_url = settings.HBP_COLLAB_SERVICE_URL
        url = '{}/collab/{}/permissions'.format(svc_url, collab_id)
        headers = {'Authorization': request.META["HTTP_AUTHORIZATION"]}
        res = requests.get(url, headers=headers)
        if res.status_code in (200, 403):
            permissions = res.json()
        else:
            logger.error(res.content)
            permissions = {}
        logger.debug(str(permissions))
        return permissions

    @classmethod
    def can_view(cls, request, collab_id):
        perms = cls._get_permissions(request, collab_id)
        return perms.get('VIEW', False)

    @classmethod
    def is_team_member(cls, request, collab_id):
        perms = cls._get_permissions(request, collab_id)
        return perms.get('UPDATE', False)


class IdentityService(object):

    @classmethod
    def get_user(cls, request):
        url = "{}/user/me".format(settings.HBP_IDENTITY_SERVICE_URL)
        #import pdb; pdb.set_trace()
        headers = {'Authorization': request.META["HTTP_AUTHORIZATION"]}
        logger.debug("Requesting user information for given access token")
        res = requests.get(url, headers=headers)
        if res.status_code != 200:
            logger.debug("Error" + res.content)
            raise Exception(res.content)
        logger.debug("User information retrieved")
        return res.json()

    @classmethod
    def can_use_platform(cls, request):
        user_id = cls.get_user(request)["id"]
        # todo: given that we have previously called get_user during authentication, we should cache this information
        url = "{}/user/{}/member-groups?pageSize=100".format(settings.HBP_IDENTITY_SERVICE_URL, user_id)
        headers = {'Authorization': request.META["HTTP_AUTHORIZATION"]}
        logger.debug("Requesting group membership for user id {}".format(user_id))
        res = requests.get(url, headers=headers)
        if res.status_code != 200:
            logger.debug("Error" + res.content)
            raise Exception(res.content)
        groups = [g["name"] for g in res.json()['_embedded']['groups']]
        logger.debug("Groups: {}".format(groups))
        return 'hbp-sga1-sp09-member' in groups \
               or 'hbp-neuromorphic-platform-users' in groups \
               or 'hbp-sp09-member' in groups


class ProviderAuthentication(ApiKeyAuthentication):

    def is_provider(self, request):
        return self.is_authenticated(request) is True


class HBPAuthentication(Authentication):

    def is_authenticated(self, request, **kwargs):
        try:
            user = IdentityService.get_user(request)
        except Exception as err:
            logger.debug("OIDC Service exception: {}".format(err))
            return False
        logger.debug("Got OIDC user {}".format(user["username"]))
        return True
        # try:
        #     usa = UserSocialAuth.objects.get(uid=user["id"])
        # except UserSocialAuth.DoesNotExist:
        #     logger.debug("No social auth for uid" + user["id"])
        #     return False
        # logger.debug("Bearer {}".format(usa.access_token))
        # logger.debug(request.META["HTTP_AUTHORIZATION"])
        # return "Bearer {}".format(usa.access_token) == request.META["HTTP_AUTHORIZATION"]

    # Optional but recommended
    #def get_identifier(self, request):
    #    return request.user.username

    def is_provider(self, request):
        return False


class CollabAuthorization(Authorization):
    collab_service = CollabService
    identity_service = IdentityService

    def _is_provider(self, request):
        return ProviderAuthentication().is_provider(request)

    def read_list(self, object_list, bundle):
        collab_id = bundle.request.GET.get("collab_id", None)
        logger.debug("Checking authorization for listing jobs in collab {}".format(collab_id))
        if collab_id:
            if self.collab_service.can_view(bundle.request, collab_id):
                return object_list
            else:
                return []
        elif self._is_provider(bundle.request):
            return object_list
        else:
            user = self.identity_service.get_user(bundle.request)
            return object_list.filter(user_id=user["id"])

    def read_detail(self, object_list, bundle):
        collab_id = bundle.obj.collab_id
        logger.debug("Checking authorization for viewing job in collab {}".format(collab_id))
        if self._is_provider(bundle.request):
            logger.debug("auth for collab {}: provider".format(collab_id))
            return True  # we could limit this to "own platform" jobs
        elif collab_id and self.collab_service.can_view(bundle.request, collab_id):
            logger.debug("auth for collab {}: user can view".format(collab_id))
            return True
        else:
            user = self.identity_service.get_user(bundle.request)
            if bundle.obj.user_id == user["id"]:
                return True
            else:
                raise NotFound()

    def create_detail(self, object_list, bundle):
        collab_id = bundle.data["collab_id"]
        if (self.collab_service.is_team_member(bundle.request, collab_id)
              and self.identity_service.can_use_platform(bundle.request)):
            return True
        else:
            return False

    def update_detail(self, object_list, bundle):
        if self._is_provider(bundle.request):
            return True
        else:
            if (bundle.request.method == "PUT" and
                    self.collab_service.is_team_member(bundle.request, bundle.data["collab_id"])
                    and self.identity_service.can_use_platform(bundle.request)):
                return True
            user = self.identity_service.get_user(bundle.request)
            if bundle.obj.user_id == user["id"]:
                # can only delete own jobs
                if bundle.request.method == "DELETE":
                    return True
                else:
                    return False
            else:
                raise NotFound()
