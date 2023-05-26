"""
Integration tests: exercise the full system from API requests to database access to API responses.
"""

import os
from datetime import date
from tempfile import NamedTemporaryFile
from httpx import AsyncClient
import pytest
import pytest_asyncio

from simqueue.data_repositories import EBRAINSDrive
from simqueue.main import app
from simqueue import db, settings


TEST_COLLAB = "neuromorphic-testing-private"
TEST_USER = "adavisontesting"
TEST_REPOSITORY = "Fake repository used for testing"
TEST_PLATFORM = "TestPlatform"
EXPECTED_TEST_DB_ADDRESS = "148.187.148.64"


@pytest.fixture(scope="module")
def user_auth():
    token = os.environ.get("EBRAINS_AUTH_TOKEN", None)
    if token:
        return {"Authorization": f"Bearer {token}"}
    else:
        pytest.skip("Environment variable NMPI_TESTING_APIKEY not set")


@pytest.fixture(scope="module")
def provider_auth():
    api_key = os.environ.get("NMPI_TESTING_APIKEY", None)
    if api_key:
        return {"x-api-key": api_key}
    else:
        pytest.skip("Environment variable NMPI_TESTING_APIKEY not set")


@pytest_asyncio.fixture()
async def database_connection():
    if settings.DATABASE_HOST != EXPECTED_TEST_DB_ADDRESS:
        raise Exception("Database address does not match the expected one")
    await db.database.connect()
    yield
    await db.database.disconnect()


@pytest_asyncio.fixture()
async def adequate_quota(database_connection):
    project = await db.create_project(
        {
            "collab": TEST_COLLAB,
            "owner": TEST_USER,
            "title": "Test Project created by test_integration - to delete",
            "abstract": "This project should be automatically deleted by pytest",
            "description": "this is the description",
            "submission_date": date.today(),
        }
    )
    project_id = project["context"]
    project = await db.update_project(
        project_id, {"accepted": True, "decision_date": date.today()}
    )
    quota = await db.create_quota(
        project_id, {"units": "bushels", "limit": 100, "usage": 0, "platform": TEST_PLATFORM}
    )

    yield quota

    await db.delete_project(project_id)  # this also deletes the quota


def fake_download(url):
    if "example.com" in url:
        fp = NamedTemporaryFile(delete=False, mode="w")
        fp.write('{"foo": "bar"}\n')
        fp.close()
        return fp.name
    else:
        raise Exception(f"Unexpected url {url}")


@pytest.mark.asyncio
async def test_job_lifetime(database_connection, adequate_quota, mocker, provider_auth, user_auth):
    """
    In this test, a user submits a job, which is retrieved and handled by
    the compute system provider.
    While this is happening the user checks the job status.
    When the job is finished the user retrieves the result.
    """

    mocker.patch("simqueue.data_repositories.download_file_to_tmp_dir", fake_download)

    # user submits a job
    initial_job_data = {
        "code": "import pyNN\n",
        "command": "python run.py --with-figure",
        "collab": TEST_COLLAB,
        "input_data": None,
        "hardware_platform": TEST_PLATFORM,
        "hardware_config": {"python_version": "3.9"},
        "tags": None,
    }
    async with AsyncClient(app=app, base_url="http://test") as client:
        response1 = await client.post(
            "/jobs/",
            json=initial_job_data,
            headers=user_auth,
        )
        assert response1.status_code == 201
        queued_job = response1.json()
        assert queued_job["resource_uri"] == f"/jobs/{queued_job['id']}"

    # user checks the job status
    async with AsyncClient(app=app, base_url="http://test") as client:
        response2 = await client.get(
            queued_job["resource_uri"],
            headers=user_auth,
        )
        assert response2.status_code == 200
        assert response2.json()["status"] == "submitted"

    # provider picks up the job and sets it to "running"
    async with AsyncClient(app=app, base_url="http://test") as client:
        response3 = await client.get(f"/jobs/next/{TEST_PLATFORM}", headers=provider_auth)
        assert response3.status_code == 200
        retrieved_job = response3.json()
        for field in ("code", "collab", "command", "hardware_config", "hardware_platform"):
            assert retrieved_job[field] == initial_job_data[field]
        assert retrieved_job["resource_uri"] == queued_job["resource_uri"]
        assert retrieved_job["timestamp_submission"] is not None
        assert retrieved_job["user_id"] == TEST_USER

        response4 = await client.put(
            retrieved_job["resource_uri"],
            json={"status": "running", "log": "Job started"},
            headers=provider_auth,
        )
        assert response4.status_code == 200

    # user checks the job status again
    async with AsyncClient(app=app, base_url="http://test") as client:
        response5 = await client.get(
            queued_job["resource_uri"],
            headers=user_auth,
        )
        assert response5.status_code == 200
        assert response5.json()["status"] == "running"

    # provider finishes handling the job and uploads the results
    async with AsyncClient(app=app, base_url="http://test") as client:
        job_id = retrieved_job["id"]
        job_update_data = {
            "status": "finished",
            "log": "Job started\nJob completed successfully",
            "output_data": {
                "repository": TEST_REPOSITORY,
                "files": [
                    {
                        "url": f"https://example.com/testing/job_{job_id}/results.json",
                        "path": f"{TEST_COLLAB}/testing/job_{job_id}/results.json",
                        "content_type": "application/json",
                        "size": 423,
                        "hash": "abcdef0123456789",
                    }
                ],
            },
            "provenance": {"platform_version": "1.2.3"},
            "resource_usage": {"value": 42, "units": "bushels"},
        }
        response6 = await client.put(
            retrieved_job["resource_uri"],
            json=job_update_data,
            headers=provider_auth,
        )
        assert response6.status_code == 200

    # user retrieves the results
    async with AsyncClient(app=app, base_url="http://test") as client:
        response7 = await client.get(
            queued_job["resource_uri"] + "?with_log=true",
            headers=user_auth,
        )
        assert response7.status_code == 200
        final_job = response7.json()
        assert final_job["status"] == "finished"
        for field in ("code", "collab", "command", "hardware_config", "hardware_platform"):
            assert final_job[field] == initial_job_data[field]
        assert final_job["resource_uri"] == queued_job["resource_uri"]
        assert final_job["timestamp_submission"] is not None
        assert final_job["timestamp_completion"] is not None
        assert final_job["user_id"] == TEST_USER
        for field, expected_value in job_update_data.items():
            assert final_job[field] == expected_value

    # user copies data to the Drive
    async with AsyncClient(app=app, base_url="http://test") as client:
        response8 = await client.put(
            final_job["resource_uri"] + "/output_data",
            json={
                "repository": "EBRAINS Drive",
                "files": [],  # doesn't matter what goes in 'files'
            },
            headers=user_auth,
        )
        assert response8.status_code == 200
        for item in response8.json()["files"]:
            assert item["url"].startswith("https://drive.ebrains.eu")

    # user checks their quota
    async with AsyncClient(app=app, base_url="http://test") as client:
        q = adequate_quota
        response9 = await client.get(
            f"/projects/{q['project_id']}/quotas/{q['id']}",
            headers=user_auth,
        )
        assert response9.status_code == 200
        result = response9.json()
        assert result["usage"] == 42

    # cleanup
    auth_token = user_auth["Authorization"].split(" ")[1]
    EBRAINSDrive._delete(TEST_COLLAB, f"/testing/job_{job_id}", auth_token)
    # todo: delete the job, which is not part of the normal lifecycle,
    #       but it's good to clean up after tests


@pytest.mark.asyncio
async def test_session_lifetime(database_connection, adequate_quota, provider_auth, user_auth):
    """
    In this test, a compute system provider starts a session
    then closes it some time later, and reports on resource usage.
    """

    # start a session
    async with AsyncClient(app=app, base_url="http://test") as client:
        response1 = await client.post(
            "/sessions/",
            json={
                "collab": TEST_COLLAB,
                "user_id": TEST_USER,
                "hardware_platform": TEST_PLATFORM,
                "hardware_config": {"python_version": "3.9"},
            },
            headers=provider_auth,
        )
    assert response1.status_code == 201
    result = response1.json()
    expected = {
        "collab": "neuromorphic-testing-private",
        "hardware_config": {"python_version": "3.9"},
        "hardware_platform": TEST_PLATFORM,
        "resource_usage": {"units": "bushels", "value": 0.0},
        "status": "running",
        "timestamp_end": None,
        "user_id": "adavisontesting",
    }
    session_uri = result.pop("resource_uri")
    for field in ("id", "timestamp_start"):
        result.pop(field)
    assert result == expected

    # close the session, and report resource usage
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.put(
            session_uri,
            json={"status": "finished", "resource_usage": {"value": 25, "units": "bushels"}},
            headers=provider_auth,
        )
    assert response.status_code == 200
    result = response.json()
    expected = None
    assert result == expected

    # check the quota has been updated to reflect the resource usage
    async with AsyncClient(app=app, base_url="http://test") as client:
        q = adequate_quota
        response = await client.get(
            f"/projects/{q['project_id']}/quotas/{q['id']}",
            headers=user_auth,
        )
    assert response.status_code == 200
    result = response.json()
    assert result["usage"] == 25

    # todo: delete the session, which is not part of the normal lifecycle,
    #       but it's good to clean up after tests
