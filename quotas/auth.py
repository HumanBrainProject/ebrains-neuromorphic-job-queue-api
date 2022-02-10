"""

"""

import logging
from django.conf import settings
import requests

logger = logging.getLogger("quotas")


def is_admin(request):
    # v2
    admin_collab = CollabService(request, collab_id="neuromorphic-platform-admin")
    if admin_collab.is_team_member:
        return True
    else:
        return False


class CollabService(object):

    def __init__(self, request, collab_id=None):
        if collab_id is None:
            self.permissions = {}
            logger.error("Must provide collab_id")
        else:
            self.permissions = CollabService._get_permissions(request, collab_id)
        logger.debug(str(self.permissions))

    @classmethod
    def _get_permissions(cls, request, collab_id):
        url = f"{settings.HBP_IDENTITY_SERVICE_URL}/userinfo"
        auth = request.META.get("HTTP_AUTHORIZATION", None)
        if auth is None:
            return {"VIEW": False, "UPDATE": False}
        headers = {'Authorization': auth}
        logger.debug("Requesting EBRAINS user information for given access token")
        res = requests.get(url, headers=headers)
        if res.status_code != 200:
            logger.warning("Error requesting {} with headers {}".format(url, headers))
            return {"VIEW": False, "UPDATE": False}

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
            if collab_info.get("isPublic", False):
                permissions = {"VIEW": True, "UPDATE": False}
            else:
                permissions = {"VIEW": False, "UPDATE": False}
        return permissions

    @classmethod
    def get_collab_info(cls, request, collab_id):
        collab_info_url = f"{settings.HBP_COLLAB_SERVICE_URL}collabs/{collab_id}"
        headers = {'Authorization': request.META.get("HTTP_AUTHORIZATION")}
        res = requests.get(collab_info_url, headers=headers)
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

    @property
    def can_view(self):
        return self.permissions.get('VIEW', False)

    @property
    def is_team_member(self):
        return self.permissions.get('UPDATE', False)