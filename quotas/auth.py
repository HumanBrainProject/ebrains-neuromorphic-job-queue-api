"""

"""

import logging
from django.conf import settings
import requests
from hbp_app_python_auth.auth import get_auth_header

logger = logging.getLogger("quotas")


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


def get_admin_list(request):
    # todo: implement this for v2 as well
    url = 'https://services.humanbrainproject.eu/idm/v1/api/group/hbp-neuromorphic-platform-admin/members?pageSize=100'
    headers = get_authorization_header(request)
    res = requests.get(url, headers=headers)
    #logger.debug(headers)
    if res.status_code != 200:
        logger.warning("Couldn't get list of administrators." + res.text + str(headers))
        return []
    data = res.json()
    assert data['page']['totalPages'] == 1, "Too many administrators - need to read data from second page"
    # todo: fix this, get all pages
    admins = [user['id'] for user in data['_embedded']['users']]
    return admins


def is_admin(request):
    try:
        admins = get_admin_list(request)
    except Exception as err:
        logger.warning(str(err))
        return False
    try:
        user_id = get_user(request)["id"]
    except Exception as err:
        logger.warning(str(err))
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


class CollabService(object):

    def __init__(self, request, collab_id=None):
        if collab_id is None:
            self.permissions = {}
            logger.error("Must provide collab_id")
        else:
            try:
                int(collab_id)
                self.permissions = CollabService._get_permissions(request, collab_id)
            except ValueError:
                self.permissions = CollabService._get_permissions_v2(request, collab_id)
        logger.debug(str(self.permissions))

    @classmethod
    def _get_permissions(cls, request, collab_id):
        logger.debug("Checking permissions for collab {}".format(collab_id))
        svc_url = settings.HBP_COLLAB_SERVICE_URL
        url = '{}/collab/{}/permissions'.format(svc_url, collab_id)
        #headers = get_authorization_header(request)
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
    def _get_permissions_v2(cls, request, collab_id):
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
        else:
            assert highest_collab_role is None
            collab_info = cls.get_collab_info(request, collab_id)
            if collab_info["isPublic"]:
                permissions = {"VIEW": True, "UPDATE": False}
            else:
                permissions = {"VIEW": False, "UPDATE": False}
        return permissions

    @property
    def can_view(self):
        return self.permissions.get('VIEW', False)

    @property
    def is_team_member(self):
        return self.permissions.get('UPDATE', False)