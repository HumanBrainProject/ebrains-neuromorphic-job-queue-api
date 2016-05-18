

from tastypie.authentication import Authentication
from hbp_app_python_auth.auth import HbpAuth


class HBPAuthentication(Authentication):

    def is_authenticated(self, request, **kwargs):
        if 'daniel' in request.user.username:
          return True

        return False

    # Optional but recommended
    def get_identifier(self, request):
        return request.user.username
