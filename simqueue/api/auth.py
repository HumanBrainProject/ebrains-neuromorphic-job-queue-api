
import logging
from tastypie.authorization import Authorization
from tastypie.authentication import Authentication, ApiKeyAuthentication
from tastypie.exceptions import NotFound
from django.conf import settings
import requests


logger = logging.getLogger("simqueue")


class CollabService(object):

    @classmethod
    def _get_permissions(cls, request, collab_id, check_public=True):
        url = f"{settings.HBP_IDENTITY_SERVICE_URL_V2}/userinfo"
        headers = {'Authorization': request.META["HTTP_AUTHORIZATION"]}
        logger.debug("Requesting EBRAINS user information for given access token")
        res = requests.get(url, headers=headers)
        if res.status_code != 200:
            logger.debug("Error requesting {} with headers {}".format(url, headers))
            raise Exception(res.content)
        logger.debug("User information retrieved")
        userinfo = res.json()

        target_team_names = {role: f"collab-{collab_id}-{role}"
                            for role in ("viewer", "editor", "administrator")}

        highest_collab_role = None
        for role, team_name in target_team_names.items():
            if team_name in userinfo["roles"]["team"]:
                highest_collab_role = role
        if highest_collab_role == "viewer":
            permissions = {"VIEW": True, "UPDATE": False}
        elif highest_collab_role in ("editor", "administrator"):
            permissions = {"VIEW": True, "UPDATE": True}
        elif check_public:
            assert highest_collab_role is None
            collab_info = cls.get_collab_info(request, collab_id)
            if collab_info["isPublic"]:
                permissions = {"VIEW": True, "UPDATE": False}
            else:
                permissions = {"VIEW": False, "UPDATE": False}
        else:
            permissions = {"VIEW": False, "UPDATE": False}
        return permissions

    @classmethod
    def get_collab_info(cls, request, collab_id):
        collab_info_url = f"{settings.HBP_COLLAB_SERVICE_URL_V2}collabs/{collab_id}"
        headers = {'Authorization': request.META["HTTP_AUTHORIZATION"]}
        try:
            res = requests.get(collab_info_url, headers=headers, timeout=5)
        except requests.exceptions.ConnectionError as err:
            response = {
                "error": {
                    "status_code": 500,
                    "message": f"Error getting collab info for {collab_id}: {err}"
                }
            }
            logger.error(f"Error connecting to Collaboratory API: {err}")
        else:
            if res.status_code != 200:
                response = {
                    "error": {
                        "status_code": res.status_code,
                        "message": f"Error getting collab info for {collab_id}: {res.content}"
                    }
                }
            else:
                response = res.json()
        return response

    @classmethod
    def can_view(cls, request, collab_id):
        try:
            int(collab_id)
        except ValueError:
            perms = cls._get_permissions(request, collab_id, check_public=True)
            return perms.get('VIEW', False)
        else:
            return False

    @classmethod
    def is_team_member(cls, request, collab_id):
        try:
            int(collab_id)
        except ValueError:
            perms = cls._get_permissions(request, collab_id, check_public=False)
            return perms.get('UPDATE', False)
        else:
            return False


class IdentityService(object):

    @classmethod
    def get_user(cls, request):
        url = f"{settings.HBP_IDENTITY_SERVICE_URL_V2}/userinfo"
        headers = {'Authorization': request.META["HTTP_AUTHORIZATION"]}
        logger.debug("Requesting EBRAINS user information for given access token")
        res = requests.get(url, headers=headers)
        if res.status_code != 200:
            logger.debug("Error requesting {} with headers {}".format(url, headers))
            raise Exception(res.content)
        logger.debug("User information retrieved")
        user_info = res.json()
        # make this compatible with the v1 json
        user_info["id"] = user_info["sub"]
        user_info["username"] = user_info.get("preferred_username", "unknown")
        return user_info

    @classmethod
    def can_use_platform(cls, request):
        return True
        # as of SGA3, the HBP account registration process has access and privacy policies to agree upon
        # as part of the sign up process and it limits accounts to either positive-listed institutional
        # email domains or a manual process to verify something about the account owner.
        # Therefore, we no longer need to restrict access to a specific subset of HBP users.

        # Note that users will still need to be members of a collab with an associated resource quota to submit jobs.


class ProviderAuthentication(ApiKeyAuthentication):

    def is_provider(self, request):
        #logger.debug(request.META)
        return self.is_authenticated(request) is True


class EBRAINSAuthentication(Authentication):

    def is_authenticated(self, request, **kwargs):
        try:
            user = IdentityService.get_user(request)
        except Exception as err:
            logger.debug("IAM Service exception: {}".format(err))
            return False
        logger.debug("Got IAM user {}".format(user["username"]))
        return True

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
        logger.debug("Checking authorization for viewing job associated with collab {}".format(collab_id))
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
            if ((bundle.request.method == "PUT" or bundle.request.method == "POST") and
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
