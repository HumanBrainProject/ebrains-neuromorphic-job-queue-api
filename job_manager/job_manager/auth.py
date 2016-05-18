from hbp_app_python_auth.auth import HbpAuth


class ModifiedHbpAuth(HbpAuth):

    def uses_redirect(self):
        return True
