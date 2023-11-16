import os

HBP_IDENTITY_SERVICE_URL = "https://iam.ebrains.eu/auth/realms/hbp/protocol/openid-connect"
HBP_COLLAB_SERVICE_URL = "https://wiki.ebrains.eu/rest/v1/"
EBRAINS_IAM_CONF_URL = "https://iam.ebrains.eu/auth/realms/hbp/.well-known/openid-configuration"
EBRAINS_IAM_CLIENT_ID = os.environ.get("EBRAINS_IAM_CLIENT_ID")
EBRAINS_IAM_SECRET = os.environ.get("EBRAINS_IAM_SECRET")
SESSIONS_SECRET_KEY = os.environ.get("SESSIONS_SECRET_KEY")
DATABASE_USERNAME = "nmpi_dbadmin"
DATABASE_PASSWORD = os.environ.get("NMPI_DATABASE_PASSWORD")
DATABASE_HOST = os.environ.get("NMPI_DATABASE_HOST")
DATABASE_PORT = os.environ.get("NMPI_DATABASE_PORT")
BASE_URL = os.environ.get("NMPI_BASE_URL")
# ADMIN_GROUP_ID = ""
AUTHENTICATION_TIMEOUT = 20
TMP_FILE_URL = os.environ.get("NMPI_BASE_URL") + "/tmp_download"
TMP_FILE_ROOT = "tmp_download"
