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
    token = {"access_token": os.environ.get("EBRAINS_AUTH_TOKEN", None)}


@pytest.fixture(scope="module")
def mock_user():
    if MockUser.token["access_token"] is None:
        pytest.skip("Environment variable EBRAINS_AUTH_TOKEN is not set")
    else:
        return MockUser


def fake_urlretrieve(url):
    raise urllib.request.HTTPError(url=url, code=404, msg="Not Found")


class TestDrive:
    def test_copy_small_file(self, mock_user):
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

        updated_url = repo.copy(file, mock_user)
        assert updated_url != file.url

        # read file contents from new URL and check contents
        response = requests.get(updated_url)
        assert response.status_code == 200
        assert response.text == "# test_file\n\n\n\nThis file is used for testing.\n\n\n"

        repo._delete(
            "neuromorphic-testing-private", target_remote_dir, mock_user.token["access_token"]
        )

    def test_copy_file_gone(self, mocker, mock_user):
        mocker.patch("urllib.request.urlretrieve", fake_urlretrieve)
        repo = EBRAINSDrive
        file = DataItem(
            url="http://example.com/this_file_does_not_exist.md",
            path=f"neuromorphic-testing-private/api-testing-{datetime.now().isoformat()}/test_file.md",
            content_type="text/markdown",
            size=48,
        )
        with pytest.raises(SourceFileDoesNotExist):
            result = repo.copy(file, mock_user)

    def test_copy_file_too_large(self, mocker, mock_user):
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
            result = repo.copy(file, mock_user)


class TestBucket:
    def test_copy_small_file(self, mock_user):
        repo = EBRAINSBucket
        file = DataItem(
            url="https://drive.ebrains.eu/f/22862ad196dc4f5b9d4c/?dl=1",
            path="neuromorphic-testing-private/files_for_API_testing/test_file.md",
            content_type="text/markdown",
            size=48,
        )

        # normally we would copy from some other repository to the Bucket
        # here we are copying within the same Bucket,
        # so we artificially change the path
        target_remote_dir = f"/api-testing-{datetime.now().isoformat()}"
        file.path = f"neuromorphic-testing-private{target_remote_dir}/test_file.md"

        updated_url = repo.copy(file, mock_user)
        assert updated_url != file.url

        # get redirect URL
        response = requests.get(
            updated_url + "?redirect=false",
            headers={"Authorization": f"Bearer {mock_user.token['access_token']}"},
        )
        assert response.status_code == 200
        redirect_url = response.json()["url"]

        # read file contents from redirect URL and check contents
        response2 = requests.get(redirect_url)
        assert response2.status_code == 200
        assert response2.text == "# test_file\n\n\n\nThis file is used for testing.\n\n\n"

        with pytest.raises(AssertionError):  # temporary, need fix in ebrains_drive
            repo._delete(
                "neuromorphic-testing-private",
                f"{target_remote_dir}/test_file.md",
                mock_user.token["access_token"],
            )
