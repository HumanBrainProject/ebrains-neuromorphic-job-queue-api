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
