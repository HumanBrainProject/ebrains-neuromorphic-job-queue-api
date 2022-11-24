import os
from urllib.request import urlretrieve, urlcleanup, HTTPError
from ebrains_drive.client import DriveApiClient, BucketApiClient
from ebrains_drive.exceptions import DoesNotExist


class SourceFileDoesNotExist(Exception):
    pass


class SourceFileIsTooBig(Exception):
    pass


def convert_bytes(size_in_bytes, unit):
    size_units = ["bytes", "KiB", "MiB", "GiB", "TiB"]
    return size_in_bytes / (1024 ** size_units.index(unit))


def get_file_size(file_path, unit):
    if os.path.isfile(file_path):
        file_info = os.stat(file_path)
        return convert_bytes(file_info.st_size, unit)


def drive_mkdir_p(base_dir, relative_path):
    # to move to ebrains_drive
    path_parts = relative_path.split("/")
    parent = base_dir
    for dirname in path_parts:
        subdirs = {
            subdir.name: subdir for subdir in parent.ls(entity_type="dir", force_refresh=False)
        }
        try:
            dir = subdirs[dirname]
        except KeyError:
            # create directory
            dir = parent.mkdir(dirname)
        parent = dir
    return dir


def download_file_to_tmp_dir(url):

    try:
        local_path, headers = urlretrieve(url)
    except HTTPError as err:
        if err.code == 404:
            raise SourceFileDoesNotExist(err.reason)
        else:
            raise
    return local_path


class SpiNNakerTemporaryStorage:
    name = "SpiNNaker Manchester temporary storage"
    host = "spinnaker.cs.man.ac.uk"
    modes = ("read",)

    @classmethod
    def get_path(cls, url):
        # example url: http://spinnaker.cs.man.ac.uk/services/rest/output/neuromorphic-testing-private/142973/reports.zip
        prefix = "http://spinnaker.cs.man.ac.uk/services/rest/output/"
        return url.lstrip(prefix)


class BrainScaleSTemporaryStorage:
    name = "BrainScaleS temporary storage"
    host = "brainscales-r.kip.uni-heidelberg.de"
    modes = ("read",)

    @classmethod
    def get_path(cls, url):
        # example url: https://brainscales-r.kip.uni-heidelberg.de:7443/nmpi/job_165928/slurm-4215780.out
        prefix = "https://brainscales-r.kip.uni-heidelberg.de:7443/nmpi/"
        return url.lstrip(prefix)


class EBRAINSDrive:
    name = "EBRAINS Drive"
    host = "drive.ebrains.eu"
    modes = ("read", "write")
    size_limit = 1.0  # GiB

    @classmethod
    def copy(cls, file, user):

        access_token = user.token["access_token"]
        ebrains_drive_client = DriveApiClient(token=access_token)

        path_parts = file.path.split("/")
        collab_name = path_parts[0]
        remote_path = "/".join([""] + path_parts[1:])

        target_repository = ebrains_drive_client.repos.get_repo_by_url(collab_name)

        try:
            file_obj = target_repository.get_file(remote_path)
            # todo: add option to overwrite files
        except DoesNotExist:
            local_path = download_file_to_tmp_dir(file.url)
            # upload the temporary copy to the Drive
            file_size = get_file_size(local_path, "GiB")
            if file_size > EBRAINSDrive.size_limit:
                raise SourceFileIsTooBig(
                    f"The file is too large ({file_size} GiB) to be moved to the Drive (limit {EBRAINSDrive.size_limit} GiB"
                )
            root_dir = target_repository.get_dir("/")
            dir_path = "/".join(path_parts[1:-1])
            dir_obj = drive_mkdir_p(root_dir, dir_path)
            file_name = path_parts[-1]
            file_obj = dir_obj.upload_local_file(local_path, name=file_name, overwrite=True)
            urlcleanup()

        return file_obj.get_download_link()

    @classmethod
    def _delete(cls, collab_name, path, access_token):
        # private method for use by test framework to clean up
        ebrains_drive_client = DriveApiClient(token=access_token)
        target_repository = ebrains_drive_client.repos.get_repo_by_url(collab_name)
        dir_obj = target_repository.get_dir(path)
        dir_obj.delete()


class EBRAINSBucket:
    name = "EBRAINS Bucket"
    host = "data-proxy.ebrains.eu"
    modes = ("read", "write")

    def copy(file, user):

        access_token = user.token["access_token"]
        ebrains_bucket_client = BucketApiClient(token=access_token)

        path_parts = file.path.split("/")
        collab_name = path_parts[0]
        remote_path = "/".join([""] + path_parts[1:])

        target_bucket = ebrains_bucket_client.buckets.get_bucket(collab_name)
        all_files = {dpf.name for dpf in target_bucket.ls()}

        if remote_path in all_files:
            pass  # todo: add option to overwrite files
        else:
            local_path = download_file_to_tmp_dir(file.url)
            target_bucket.upload(local_path, remote_path)

        return f"https://data-proxy.ebrains.eu/api/v1/buckets/{collab_name}/{remote_path}"

    @classmethod
    def _delete(cls, collab_name, path, access_token):
        # private method for use by test framework to clean up
        ebrains_bucket_client = BucketApiClient(token=access_token)
        bucket = ebrains_bucket_client.buckets.get_bucket(collab_name)
        file_obj = bucket.get_file(path)
        file_obj.delete()


class TestRepository:
    name = "Fake repository used for testing"
    host = "example.com"
    modes = ("read", "write")

    def copy(file, user):
        return "https://example.com/" + file.path


available_repositories = (
    SpiNNakerTemporaryStorage,
    BrainScaleSTemporaryStorage,
    EBRAINSDrive,
    EBRAINSBucket,
    TestRepository,
)

repository_lookup_by_host = {r.host: r for r in available_repositories}

repository_lookup_by_name = {r.name: r for r in available_repositories}
