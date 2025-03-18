import os

EBRAINS_IAM_SERVICE_URL = os.environ.get(
    "EBRAINS_IAM_SERVICE_URL", "https://iam.ebrains.eu/auth/realms/hbp"
)
EBRAINS_COLLAB_SERVICE_URL = os.environ.get(
    "EBRAINS_COLLAB_SERVICE_URL", "https://wiki.ebrains.eu/rest/v1/"
)
EBRAINS_DRIVE_SERVICE_URL = os.environ.get("EBRAINS_DRIVE_SERVICE_URL", "drive.ebrains.eu")
EBRAINS_BUCKET_SERVICE_URL = os.environ.get("EBRAINS_BUCKET_SERVICE_URL", "data-proxy.ebrains.eu")
EBRAINS_IAM_CLIENT_ID = os.environ.get("EBRAINS_IAM_CLIENT_ID")
EBRAINS_IAM_SECRET = os.environ.get("EBRAINS_IAM_SECRET")
SESSIONS_SECRET_KEY = os.environ.get("SESSIONS_SECRET_KEY")
DATABASE_USERNAME = os.environ.get("NMPI_DATABASE_USER", "nmpi_dbadmin")
DATABASE_PASSWORD = os.environ.get("NMPI_DATABASE_PASSWORD")
DATABASE_HOST = os.environ.get("NMPI_DATABASE_HOST")
DATABASE_PORT = os.environ.get("NMPI_DATABASE_PORT")
BASE_URL = os.environ.get("NMPI_BASE_URL", "")
# ADMIN_GROUP_ID = ""
AUTHENTICATION_TIMEOUT = 20
TMP_FILE_URL = BASE_URL + "/tmp_download"
TMP_FILE_ROOT = os.environ.get("NMPI_TMP_FILE_ROOT", "tmp_download")
