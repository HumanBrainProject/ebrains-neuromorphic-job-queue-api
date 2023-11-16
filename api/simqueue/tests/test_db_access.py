import os
from datetime import date, datetime, timezone
from copy import deepcopy
from uuid import uuid4, UUID
import json
import pytz
import pytest
import pytest_asyncio

from .. import db, settings
from ..data_models import ProjectStatus

TEST_COLLAB = "neuromorphic-testing-private"
TEST_USER = "adavisontesting"
EXPECTED_TEST_DB_ADDRESS = "148.187.148.64"


# ---- Define fixtures ------------------------------------


@pytest_asyncio.fixture()
async def database_connection():
    if settings.DATABASE_HOST != EXPECTED_TEST_DB_ADDRESS:
        pytest.skip("Database address does not match the expected one")
    try:
        await db.database.connect()
    except Exception:
        pytest.skip("Database not available. Are the necessary environment variables set?")
    yield
    await db.database.disconnect()


@pytest_asyncio.fixture()
async def submitted_job(new_tag):
    data = {
        "code": "import antigravity\n",
        "command": None,
        "collab_id": TEST_COLLAB,
        "status": "submitted",
        "hardware_platform": "TestPlatform",
        "hardware_config": json.dumps({"answer": "42"}),
        "tags": sorted(["test", new_tag]),
    }
    response = await db.create_job(user_id=TEST_USER, job=data)
    yield response
    response2 = await db.delete_job(response["id"])


@pytest_asyncio.fixture()
async def new_tag():
    tag = str(uuid4())  # we create a random tag that is almost certainly new
    yield tag
    response = await db.delete_tag(tag)


@pytest_asyncio.fixture()
async def new_project():
    data = {
        "collab": TEST_COLLAB,
        "owner": TEST_USER,
        "title": "Test Project - to delete",
        "abstract": "this is the abstract",
        "description": "this is the description",
    }
    response = await db.create_project(data)
    yield response
    response2 = await db.delete_project(response["context"])


@pytest_asyncio.fixture()
async def new_session():
    data = {
        "collab_id": TEST_COLLAB,
        "user_id": TEST_USER,
        "status": "submitted",
        "hardware_platform": "TestPlatform",
        "hardware_config": json.dumps({"answer": "42"}),
        "timestamp_start": datetime(2022, 11, 22, 12, 23, 45, tzinfo=timezone.utc),
        "resource_usage": 0.0,
    }
    response = await db.create_session(data)
    yield response
    response2 = await db.delete_session(response["id"])


# ---- Test jobs, tags, comments --------------------------


@pytest.mark.asyncio
async def test_query_jobs_no_filters(database_connection):
    jobs = await db.query_jobs(size=5, from_index=5)
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
    jobs = await db.query_jobs(
        status=["finished"],
        collab=["neuromorphic-testing-private"],
        user_id=["adavison"],
        hardware_platform=["SpiNNaker"],
        tags=["test"],
        date_range_start=date(2021, 3, 1),
        date_range_end=date(2021, 3, 31),
        size=100,
        from_index=0,
    )
    assert len(jobs) > 0
    for job in jobs:
        assert job["status"] == "finished"
        assert job["collab_id"] == "neuromorphic-testing-private"
        assert job["user_id"] == "adavison"
        assert job["hardware_platform"] == "SpiNNaker"
        assert "test" in job["tags"]
        assert (
            datetime(2021, 3, 1, 0, tzinfo=pytz.UTC)
            <= job["timestamp_submission"]
            <= datetime(2021, 3, 31, 23, 59, 59, tzinfo=pytz.UTC)
        )


@pytest.mark.asyncio
async def test_get_job(database_connection):
    job = await db.get_job(142972)
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
async def test_get_nonexistent_job(database_connection):
    job = await db.get_job(-1)
    assert job is None


@pytest.mark.asyncio
async def test_get_next_job(database_connection, submitted_job):
    next_job = await db.get_next_job(submitted_job["hardware_platform"])
    assert next_job["id"] == submitted_job["id"]


@pytest.mark.asyncio
async def test_get_comments(database_connection):
    comments = await db.get_comments(122685)
    expected_keys = {"user", "content", "job_id", "id", "created_time"}
    assert len(comments) > 0
    assert set(comments[0].keys()) == expected_keys


@pytest.mark.asyncio
async def test_get_log(database_connection):
    log = await db.get_log(142972)
    assert isinstance(log, str)


@pytest.mark.asyncio
async def test_create_job(database_connection, new_tag):
    data = {
        "code": "import antigravity\n",
        "command": None,
        "collab_id": TEST_COLLAB,
        "status": "submitted",
        "hardware_platform": "testPlatform",
        "hardware_config": json.dumps({"answer": "42"}),
        "tags": sorted(["test", new_tag]),
    }
    response = await db.create_job(user_id=TEST_USER, job=data)
    response2 = await db.get_job(response["id"])
    assert response == response2
    response3 = await db.delete_job(response["id"])
    expected = {
        "code": data["code"],
        "command": "",
        "collab_id": data["collab_id"],
        "input_data": [],
        "hardware_platform": data["hardware_platform"],
        "hardware_config": data["hardware_config"],
        "tags": sorted(["test", new_tag]),
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
                path="datafile1.txt",
                content_type="text/plain",
                size=42,
                hash="fedcba9876543210",
            ),
            dict(
                url="http://example.com/datafile2.json",
                path="datafile2.json",
                content_type="application/json",
                size=1234,
                hash="edcba9876543210f",
            ),
        ],
        "provenance": json.dumps({"foo": "bar"}),
        "resource_usage": 999.0,
        "log": "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
    }
    response = await db.update_job(job_id=submitted_job["id"], job_patch=data)
    response.pop("timestamp_completion")
    for data_item in response["output_data"]:
        data_item.pop("id")
    response["output_data"].sort(key=lambda item: item["url"])
    expected = deepcopy(submitted_job)
    expected.pop("timestamp_completion")
    expected.update(data)
    expected.pop("log")  # by default we don't include the log in responses
    assert response == expected


@pytest.mark.asyncio
async def test_add_and_remove_tags(database_connection, submitted_job):
    original_tags = submitted_job["tags"]
    assert "test2" not in original_tags
    additional_tags = ["test2", "test3"]
    response = await db.add_tags_to_job(submitted_job["id"], additional_tags)
    assert response == sorted(original_tags + additional_tags)

    response2 = await db.get_job(submitted_job["id"])
    assert response2["tags"] == sorted(original_tags + additional_tags)

    expected_tags = response2["tags"][:]
    expected_tags.remove("test")
    expected_tags.remove("test3")
    response3 = await db.remove_tags(submitted_job["id"], ["test", "test3"])
    assert response3 == expected_tags

    response4 = await db.get_job(submitted_job["id"])
    assert response4["tags"] == expected_tags


@pytest.mark.asyncio
async def test_add_update_and_remove_comments(database_connection, submitted_job):
    comment1 = (
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor "
        "incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis "
        "nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
    )
    comment2 = (
        "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum "
        "dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, "
        "sunt in culpa qui officia deserunt mollit anim id est laborum."
    )
    response = await db.add_comment(submitted_job["id"], TEST_USER, comment1)
    assert response["job_id"] == submitted_job["id"]
    assert response["user"] == TEST_USER
    assert response["content"] == comment1

    response2 = await db.get_comments(submitted_job["id"])
    assert len(response2) == 1
    assert response2[0]["content"] == comment1

    response3 = await db.add_comment(submitted_job["id"], TEST_USER, comment2)
    response4 = await db.get_comments(submitted_job["id"])
    assert len(response4) == 2
    assert response4[0]["content"] == comment1  # oldest to newest
    assert response4[1]["content"] == comment2

    modified_comment1 = comment1.upper()
    response5 = await db.update_comment(response["id"], modified_comment1)
    for key in ("id", "job_id", "user"):
        assert response5[key] == response[key]
        assert response5["content"] == modified_comment1

    response6 = await db.delete_comment(response["id"])

    response7 = await db.get_comments(submitted_job["id"])
    assert len(response7) == 1


# ---- Sessions -------------------------------------------


@pytest.mark.asyncio
async def test_create_session(database_connection, new_session):
    expected = {
        "collab_id": TEST_COLLAB,
        "user_id": TEST_USER,
        "status": "running",
        "hardware_platform": "TestPlatform",
        "hardware_config": json.dumps({"answer": "42"}),
        "timestamp_start": datetime.fromisoformat("2022-11-22T12:23:45+00:00"),
        "timestamp_end": None,
        "resource_usage": 0.0,
    }
    new_session = dict(new_session)
    new_session.pop("id")
    assert new_session == expected


# ---- Other ----------------------------------------------


@pytest.mark.asyncio
async def test_get_provider(database_connection):
    response = await db.get_provider("not-a-real-api-key")
    assert response is None
    if "NMPI_TESTING_APIKEY" in os.environ:
        response = await db.get_provider(os.environ["NMPI_TESTING_APIKEY"])
        assert response == "nmpi"
    else:
        pytest.skip("This test needs an environment variable 'NMPI_TESTING_APIKEY'")


@pytest.mark.asyncio
async def test_query_tags(database_connection):
    all_tags = await db.query_tags()
    assert len(all_tags) > 0
    assert isinstance(all_tags[0], str)

    tags_used_in_collab = await db.query_tags(collab=TEST_COLLAB)
    assert len(tags_used_in_collab) > 0
    assert len(tags_used_in_collab) < len(all_tags)
    assert isinstance(tags_used_in_collab[0], str)


# ---- Test projects/quotas -------------------------------


@pytest.mark.asyncio
async def test_query_projects_no_filters(database_connection):
    projects = await db.query_projects(size=5, from_index=5)
    assert len(projects) > 0
    expected_keys = {
        "abstract",
        "accepted",
        "collab",
        "decision_date",
        "description",
        "duration",
        "context",
        "owner",
        "start_date",
        "submission_date",
        "title",
    }
    assert set(projects[0].keys()) == expected_keys


@pytest.mark.asyncio
async def test_query_projects_with_filters(database_connection):
    projects = await db.query_projects(status=ProjectStatus.accepted, size=5, from_index=0)
    assert len(projects) > 0
    assert projects[0]["accepted"] is True
    assert projects[0]["decision_date"] is not None
    assert projects[0]["submission_date"] is not None

    projects = await db.query_projects(status=ProjectStatus.rejected, size=5, from_index=0)
    assert len(projects) > 0
    assert projects[0]["accepted"] is False
    assert projects[0]["decision_date"] is not None
    assert projects[0]["submission_date"] is not None

    projects = await db.query_projects(
        status=ProjectStatus.under_review,
        size=5,
        from_index=0,
        collab=["neuromorphic-testing-private"],
        owner=["adavison"],
    )
    assert len(projects) > 0
    assert projects[0]["accepted"] is False
    assert projects[0]["decision_date"] is None
    assert projects[0]["submission_date"] is not None
    for project in projects:
        assert project["collab"] == "neuromorphic-testing-private"
        assert project["owner"] == "adavison"

    projects = await db.query_projects(status=ProjectStatus.in_prep, size=5, from_index=0)
    assert len(projects) > 0
    assert projects[0]["accepted"] is False
    assert projects[0]["decision_date"] is None
    assert projects[0]["submission_date"] is None


@pytest.mark.asyncio
async def test_create_project(database_connection, new_project):
    expected = {
        "abstract": "this is the abstract",
        "accepted": False,
        "collab": TEST_COLLAB,
        "decision_date": None,
        "description": "this is the description",
        "duration": 0,
        "context": new_project["context"],
        "owner": TEST_USER,
        "start_date": None,
        "submission_date": None,
        "title": "Test Project - to delete",
    }
    assert dict(new_project) == expected
    assert isinstance(new_project["context"], UUID)


@pytest.mark.asyncio
async def test_update_project(database_connection, new_project):
    updated_project = dict(new_project)
    updated_project["submission_date"] = date.today()
    updated_project["abstract"] = "This is the abstract."

    project = await db.update_project(new_project["context"], updated_project)

    assert project["submission_date"] == updated_project["submission_date"]
    assert project["abstract"] == updated_project["abstract"]
    assert project["context"] == updated_project["context"]


@pytest.mark.asyncio
async def test_query_quotas_no_filters(database_connection):
    quotas = await db.query_quotas(size=5, from_index=5)
    assert len(quotas) > 0
    expected_keys = ("id", "project_id", "usage", "limit", "units", "platform")
    assert set(quotas[0].keys()) == set(expected_keys)


@pytest.mark.asyncio
async def test_create_quota(database_connection, new_project):
    data = {"units": "bushels", "limit": 5000, "usage": 0, "platform": "TestPlatform"}
    response = await db.create_quota(new_project["context"], data)
    quota_id = response["id"]
    assert isinstance(quota_id, int)

    response2 = await db.query_quotas(new_project["context"])
    assert len(response2) == 1
    expected = deepcopy(data)
    expected["id"] = quota_id
    expected["project_id"] = new_project["context"]
    assert dict(response2[0]) == expected


@pytest.mark.asyncio
async def test_update_quota(database_connection, new_project):
    data = {"units": "bushels", "limit": 5000, "usage": 0, "platform": "TestPlatform"}
    quota = await db.create_quota(new_project["context"], data)

    update = {"limit": 10000, "usage": 999}
    response2 = await db.update_quota(quota["id"], update)

    expected = dict(quota)
    expected.update(update)
    assert dict(response2) == expected


# ---- Test statistics access functions -------------------


@pytest.mark.asyncio
async def test_get_users_count(database_connection):
    count = await db.get_users_count(
        hardware_platform=["SpiNNaker"],
        date_range_start=date(2018, 1, 1),
        date_range_end=date(2018, 12, 31),
    )
    assert count > 0


@pytest.mark.asyncio
async def test_get_users_list(database_connection):
    users = await db.get_users_list(
        hardware_platform=["SpiNNaker"],
        date_range_start=date(2018, 1, 1),
        date_range_end=date(2018, 12, 31),
    )
    assert len(users) > 0
    # to review - is this what we want this function to do?
    #             shouldn't it just return a list of usernames?
    assert "user_id" in users[0]


@pytest.mark.asyncio
async def test_count_jobs(database_connection):
    count = await db.count_jobs(hardware_platform=["BrainScaleS"], status=["error", "finished"])
    assert count > 0
