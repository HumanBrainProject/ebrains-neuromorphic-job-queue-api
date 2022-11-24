import os
from datetime import datetime
import urllib.request
import requests
import pytest
from simqueue.data_models import DataItem
from simqueue.data_repositories import (
    EBRAINSDrive,
    EBRAINSBucket,
    SourceFileDoesNotExist,
    SourceFileIsTooBig,
)


class MockUser:
    token = {"access_token": os.environ["EBRAINS_AUTH_TOKEN"]}


def fake_urlretrieve(url):
    raise urllib.request.HTTPError(url=url, code=404, msg="Not Found")


class TestDrive:
    def test_copy_small_file(self):
        repo = EBRAINSDrive
        file = DataItem(
            url="https://drive.ebrains.eu/f/22862ad196dc4f5b9d4c/?dl=1",
            path="neuromorphic-testing-private/files_for_API_testing/test_file.md",
            content_type="text/markdown",
            size=48,
        )

        # normally we would copy from some other repository to the Drive
        # here we are copying within the same Drive repository,
        # so we artificially change the path
        target_remote_dir = f"/api-testing-{datetime.now().isoformat()}"
        file.path = f"neuromorphic-testing-private{target_remote_dir}/test_file.md"

        updated_url = repo.copy(file, MockUser)
        assert updated_url != file.url

        # read file contents from new URL and check contents
        response = requests.get(updated_url)
        assert response.status_code == 200
        assert response.text == "# test_file\n\n\n\nThis file is used for testing.\n\n\n"

        repo._delete(
            "neuromorphic-testing-private", target_remote_dir, MockUser.token["access_token"]
        )

    def test_copy_file_gone(self, mocker):
        mocker.patch("urllib.request.urlretrieve", fake_urlretrieve)
        repo = EBRAINSDrive
        file = DataItem(
            url="http://example.com/this_file_does_not_exist.md",
            path=f"neuromorphic-testing-private/api-testing-{datetime.now().isoformat()}/test_file.md",
            content_type="text/markdown",
            size=48,
        )
        with pytest.raises(SourceFileDoesNotExist):
            result = repo.copy(file, MockUser)

    def test_copy_file_too_large(self, mocker):
        mocker.patch(
            "simqueue.data_repositories.get_file_size", return_value=EBRAINSDrive.size_limit * 2
        )
        repo = EBRAINSDrive
        file = DataItem(
            url="https://drive.ebrains.eu/f/22862ad196dc4f5b9d4c/?dl=1",
            path=f"neuromorphic-testing-private/api-testing-{datetime.now().isoformat()}/test_file.md",
            content_type="text/markdown",
            size=48,
        )
        with pytest.raises(SourceFileIsTooBig):
            result = repo.copy(file, MockUser)


class TestBucket:
    def test_copy_small_file(self):
        repo = EBRAINSBucket
        file = DataItem(
            url="https://drive.ebrains.eu/f/22862ad196dc4f5b9d4c/?dl=1",
            path="neuromorphic-testing-private/files_for_API_testing/test_file.md",
            content_type="text/markdown",
            size=48,
        )

        # normally we would copy from some other repository to the Drive
        # here we are copying within the same Drive repository,
        # so we artificially change the path
        target_remote_dir = f"/api-testing-{datetime.now().isoformat()}"
        file.path = f"neuromorphic-testing-private{target_remote_dir}/test_file.md"

        updated_url = repo.copy(file, MockUser)
        assert updated_url != file.url

        # read file contents from new URL and check contents
        response = requests.get(
            updated_url, headers={"Authorization": f"Bearer {MockUser.token['access_token']}"}
        )
        assert response.status_code == 200
        assert response.text == "# test_file\n\n\n\nThis file is used for testing.\n\n\n"

        repo._delete(
            "neuromorphic-testing-private",
            f"{target_remote_dir}/test_file.md",
            MockUser.token["access_token"],
        )
