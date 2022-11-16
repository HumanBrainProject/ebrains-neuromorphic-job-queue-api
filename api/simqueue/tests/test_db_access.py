from datetime import date, datetime, timezone
from copy import deepcopy
import pytz
import pytest
import pytest_asyncio
from ..db import (
    database,
    query_jobs,
    get_job,
    query_projects,
    query_quotas,
    get_comments,
    get_log,
    create_job,
    update_job,
    delete_job,
    create_project,
)
from ..data_models import ProjectStatus, SubmittedJob, JobPatch, ResourceUsage, DataItem


TEST_COLLAB = "neuromorphic-testing-private"
TEST_USER = "adavisontesting"


@pytest_asyncio.fixture()
async def database_connection():
    await database.connect()
    yield
    await database.disconnect()


@pytest_asyncio.fixture()
async def submitted_job():
    data = {
        "code": "import antigravity\n",
        "command": None,
        "collab_id": TEST_COLLAB,
        "status": "submitted",
        "hardware_platform": "TestPlatform",
        "hardware_config": {"answer": "42"},
    }
    response = await create_job(user_id=TEST_USER, job=SubmittedJob(**data))
    yield response
    response2 = await delete_job(response["id"])


@pytest.mark.asyncio
async def test_query_jobs_no_filters(database_connection):
    jobs = await query_jobs(size=5, from_index=5)
    assert len(jobs) == 5
    expected_keys = {
        "id",
        "input_data",
        "provenance",
        "resource_usage",
        "status",
        "user_id",
        "hardware_config",
        "output_data",
        "code",
        "command",
        "timestamp_submission",
        "timestamp_completion",
        "collab_id",
        "hardware_platform",
        "tags",
    }
    assert set(jobs[0].keys()) == expected_keys


@pytest.mark.asyncio
async def test_query_jobs_with_filters(database_connection):
    jobs = await query_jobs(
        status=["finished"],
        collab_id=["neuromorphic-testing-private"],
        user_id=["adavison"],
        hardware_platform=["SpiNNaker"],
        date_range_start=date(2021, 3, 1),
        date_range_end=date(2021, 3, 31),
        size=100,
        from_index=0,
    )
    for job in jobs:
        assert job["status"] == "finished"
        assert job["collab_id"] == "neuromorphic-testing-private"
        assert job["user_id"] == "adavison"
        assert job["hardware_platform"] == "SpiNNaker"
        assert (
            datetime(2021, 3, 1, 0, tzinfo=pytz.UTC)
            <= job["timestamp_submission"]
            <= datetime(2021, 3, 31, 23, 59, 59, tzinfo=pytz.UTC)
        )


@pytest.mark.asyncio
async def test_get_job(database_connection):
    job = await get_job(142972)
    expected_keys = (
        "id",
        "input_data",
        "provenance",
        "resource_usage",
        "status",
        "user_id",
        "hardware_config",
        "output_data",
        "code",
        "command",
        "timestamp_submission",
        "timestamp_completion",
        "collab_id",
        "hardware_platform",
    )
    assert job["id"] == 142972
    assert job["collab_id"] == "neuromorphic-testing-private"


@pytest.mark.asyncio
async def test_get_comments(database_connection):
    comments = await get_comments(122685)
    expected_keys = {"user", "content", "job_id", "id", "created_time"}
    assert len(comments) > 0
    assert set(comments[0].keys()) == expected_keys


@pytest.mark.asyncio
async def test_get_log(database_connection):
    log = await get_log(142972)
    expected_keys = {"job_id", "content"}
    assert set(log.keys()) == expected_keys


@pytest.mark.asyncio
async def test_create_job(database_connection):
    data = {
        "code": "import antigravity\n",
        "command": None,
        "collab_id": TEST_COLLAB,
        "status": "submitted",
        "hardware_platform": "testPlatform",
        "hardware_config": {"answer": "42"},
    }
    response = await create_job(user_id=TEST_USER, job=SubmittedJob(**data))
    response2 = await get_job(response["id"])
    assert response == response2
    response3 = await delete_job(response["id"])
    expected = {
        "code": data["code"],
        "command": "",
        "collab_id": data["collab_id"],
        "input_data": [],
        "hardware_platform": data["hardware_platform"],
        "hardware_config": data["hardware_config"],
        "tags": [],
        "id": response["id"],
        "user_id": TEST_USER,
        "status": "submitted",
        "timestamp_completion": None,
        "output_data": [],
        "provenance": None,
        "resource_usage": None,
    }
    assert response.pop("timestamp_submission")
    assert response == expected


@pytest.mark.asyncio
async def test_update_job(database_connection, submitted_job):
    data = {
        "status": "error",
        "output_data": [
            dict(
                url="http://example.com/datafile1.txt",
                content_type="text/plain",
                size=42,
                hash="fedcba9876543210",
            ),
            dict(
                url="http://example.com/datafile2.json",
                content_type="application/json",
                size=1234,
                hash="edcba9876543210f",
            ),
        ],
        "provenance": {"foo": "bar"},
        "resource_usage": dict(value=999.0, units="bushels"),
    }
    response = await update_job(job_id=submitted_job["id"], job_patch=JobPatch(**data))
    response.pop("timestamp_completion")
    for data_item in response["output_data"]:
        data_item.pop("id")
    response["output_data"].sort(key=lambda item: item["url"])
    expected = deepcopy(submitted_job)
    expected.pop("timestamp_completion")
    expected.update(data)
    assert response == expected


@pytest.mark.asyncio
async def test_query_projects_no_filters(database_connection):
    projects = await query_projects(size=5, from_index=5)
    assert len(projects) > 0
    expected_keys = {
        "abstract",
        "accepted",
        "collab",
        "decision_date",
        "description",
        "duration",
        "id",
        "owner",
        "start_date",
        "submission_date",
        "title",
    }
    assert set(projects[0].keys()) == expected_keys


@pytest.mark.asyncio
async def test_query_projects_with_filters(database_connection):
    projects = await query_projects(status=ProjectStatus.accepted, size=5, from_index=0)
    assert len(projects) > 0
    assert projects[0]["accepted"] is True
    assert projects[0]["decision_date"] is not None
    assert projects[0]["submission_date"] is not None

    projects = await query_projects(status=ProjectStatus.rejected, size=5, from_index=0)
    assert len(projects) > 0
    assert projects[0]["accepted"] is False
    assert projects[0]["decision_date"] is not None
    assert projects[0]["submission_date"] is not None

    projects = await query_projects(
        status=ProjectStatus.under_review,
        size=5,
        from_index=0,
        collab_id=["neuromorphic-testing-private"],
        owner_id=["adavison"],
    )
    assert len(projects) > 0
    assert projects[0]["accepted"] is False
    assert projects[0]["decision_date"] is None
    assert projects[0]["submission_date"] is not None

    projects = await query_projects(status=ProjectStatus.in_prep, size=5, from_index=0)
    assert len(projects) > 0
    assert projects[0]["accepted"] is False
    assert projects[0]["decision_date"] is None
    assert projects[0]["submission_date"] is None


@pytest.mark.asyncio
async def test_query_quotas_no_filters(database_connection):
    quotas = await query_quotas(size=5, from_index=5)
    assert len(quotas) > 0
    expected_keys = ("id", "project_id", "usage", "limit", "units", "platform")
    assert set(quotas[0].keys()) == set(expected_keys)
