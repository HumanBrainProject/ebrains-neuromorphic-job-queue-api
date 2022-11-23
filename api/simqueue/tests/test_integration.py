"""
Integration tests: exercise the full system from API requests to database access to API responses.
"""

import os
from time import sleep
from datetime import datetime, date, timezone
from fastapi.testclient import TestClient
from httpx import AsyncClient
import pytest
import pytest_asyncio

from simqueue.main import app
from simqueue import db


API_KEY = os.environ["NMPI_TESTING_APIKEY"]
AUTH_TOKEN = os.environ["EBRAINS_AUTH_TOKEN"]
TEST_COLLAB = "neuromorphic-testing-private"
TEST_USER = "adavisontesting"
TEST_PLATFORM = "nmpi"


@pytest_asyncio.fixture()
async def database_connection():
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
        project_id, {"units": "litres", "limit": 100, "usage": 0, "platform": TEST_PLATFORM}
    )

    yield quota

    await db.delete_project(project_id)  # this also deletes the quota


@pytest.mark.asyncio
async def test_job_lifetime(database_connection, adequate_quota):
    """
    In this test, a user submits a job, which is retrieved and handled by
    the compute system provider.
    While this is happening the user checks the job status.
    When the job is finished the user retrieves the result.
    """

    user_auth = {"Authorization": f"Bearer {AUTH_TOKEN}"}
    provider_auth = {"x-api-key": API_KEY}

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
        job_update_data = {
            "status": "finished",
            "log": "Job started\nJob completed successfully",
            "output_data": [
                {
                    "url": "https://example.com/job_id/results.json",
                    "content_type": "application/json",
                    "size": 423,
                    "hash": "abcdef0123456789",
                }
            ],
            "provenance": {"platform_version": "1.2.3"},
            "resource_usage": {"value": 42, "units": "litres"},
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

    # user checks their quota
    async with AsyncClient(app=app, base_url="http://test") as client:
        q = adequate_quota
        response8 = await client.get(
            f"/projects/{q['project_id']}/quotas/{q['id']}",
            headers={"Authorization": f"Bearer {AUTH_TOKEN}"},
        )
        assert response8.status_code == 200
        result = response8.json()
        assert result["usage"] == 42

    # todo: delete the job, which is not part of the normal lifecycle,
    #       but it's good to clean up after tests


@pytest.mark.asyncio
async def test_session_lifetime(database_connection, adequate_quota):
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
            headers={"x-api-key": API_KEY},
        )
    assert response1.status_code == 201
    result = response1.json()
    expected = {
        "collab": "neuromorphic-testing-private",
        "hardware_config": {"python_version": "3.9"},
        "hardware_platform": "nmpi",
        "resource_usage": {"units": "litres", "value": 0.0},
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
            json={"status": "finished", "resource_usage": {"value": 25, "units": "litres"}},
            headers={"x-api-key": API_KEY},
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
            headers={"Authorization": f"Bearer {AUTH_TOKEN}"},
        )
    assert response.status_code == 200
    result = response.json()
    assert result["usage"] == 25

    # todo: delete the session, which is not part of the normal lifecycle,
    #       but it's good to clean up after tests
