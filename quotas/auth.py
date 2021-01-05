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
    url = 'https://services.humanbrainproject.eu/idm/v1/api/group/hbp-neuromorphic-platform-admin/members?pageSize=100'
    headers = get_authorization_header(request)
    res = requests.get(url, headers=headers)
    #logger.debug(headers)
    if res.status_code != 200:
        raise Exception("Couldn't get list of administrators." + res.content + str(headers))
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

    def __init__(self, request, context=None, collab_id=None):
        # must provide either context or collab
        svc_url = settings.HBP_COLLAB_SERVICE_URL
        headers = get_authorization_header(request)
        if collab_id is None:
            if context is None:
                self.permissions = {}
                logger.error("Can't have both context and collab be None")
            else:
                url = '%scollab/context/%s/' % (svc_url, context)
                res = requests.get(url, headers=headers)
                if res.status_code != 200:
                    self.permissions = {}
                    return
                collab_id = res.json()['collab']['id']
        url = '%scollab/%s/permissions/' % (svc_url, collab_id)
        res = requests.get(url, headers=headers)
        if res.status_code in (200, 403):
            self.permissions = res.json()
        else:
            logger.error(res.content)
            self.permissions = {}
        logger.debug(str(self.permissions))

    @property
    def can_view(self):
        return self.permissions.get('VIEW', False)

    @property
    def is_team_member(self):
        return self.permissions.get('UPDATE', False)