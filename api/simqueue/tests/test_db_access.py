from datetime import date, datetime

from simqueue.db import database, query_jobs, get_job, query_projects, query_quotas, get_comments, get_log, post_project
from simqueue.data_models import ProjectStatus


@pytest_asyncio.fixture()
async def database_connection():
    await database.connect()
    yield
    await database.disconnect()


@pytest.mark.asyncio
async def test_query_jobs_no_filters(database_connection):
    jobs = await query_jobs(size=5, from_index=5)
    assert len(jobs) == 5
    expected_keys = {
        'id', 'input_data', 'provenance', 'resource_usage', 'status', 'user_id',
        'hardware_config', 'output_data', 'code', 'command', 'timestamp_submission',
         'timestamp_completion', 'collab_id', 'hardware_platform'
    }
    assert set(jobs[0].keys()) == expected_keys


@pytest.mark.asyncio
async def test_query_jobs_with_filters(database_connection):
    jobs = await query_jobs(
        status="finished",
        collab_id=["neuromorphic-testing-private"],
        user_id=["adavison"],
        hardware_platform=["SpiNNaker"],
        date_range_start=date(2021, 3, 1),
        date_range_end=date(2021, 3, 31),
        size=100,
        from_index=0
    )
    for job in jobs:
        assert job["status"] == "finished"
        assert job["collab_id"] == "neuromorphic-testing-private"
        assert job["user_id"] == "adavison"
        assert job["hardware_platform"] == "SpiNNaker"
        assert datetime(2021, 3, 1, 0, tzinfo=pytz.UTC) <= job["timestamp_submission"] <= datetime(2021, 3, 31, 23, 59, 59, tzinfo=pytz.UTC)


@pytest.mark.asyncio
async def test_get_job(database_connection):
    job = await get_job(142972)
    expected_keys = (
        'id', 'input_data', 'provenance', 'resource_usage', 'status', 'user_id',
        'hardware_config', 'output_data', 'code', 'command', 'timestamp_submission',
         'timestamp_completion', 'collab_id', 'hardware_platform'
    )
    assert job["id"] == 142972
    assert job["collab_id"] == "neuromorphic-testing-private"


@pytest.mark.asyncio
async def test_get_comments(database_connection):
    comments = await get_comments(122685)
    expected_keys = {'user', 'content', 'job_id', 'id', 'created_time'}
    assert len(comments) > 0
    assert set(comments[0].keys()) == expected_keys


@pytest.mark.asyncio
async def test_get_log(database_connection):
    log = await get_log(142972)
    expected_keys = {'job_id', 'content'}
    assert set(log.keys()) == expected_keys


@pytest.mark.asyncio
async def test_query_projects_no_filters(database_connection):
    projects = await query_projects(size=5, from_index=5)
    assert len(projects) > 0
    expected_keys = {
        'abstract', 'accepted', 'collab', 'decision_date', 'description', 'duration',
        'id', 'owner', 'start_date', 'submission_date', 'title',
    }
    assert set(projects[0].keys()) == expected_keys


@pytest.mark.asyncio
async def test_query_projects_with_filters(database_connection):
    projects = await query_projects(
        status=ProjectStatus.accepted, size=5, from_index=0
    )
    assert len(projects) > 0
    assert projects[0]["accepted"] is True
    assert projects[0]["decision_date"] is not None
    assert projects[0]["submission_date"] is not None

    projects = await query_projects(
        status=ProjectStatus.rejected, size=5, from_index=0
    )
    assert len(projects) > 0
    assert projects[0]["accepted"] is False
    assert projects[0]["decision_date"] is not None
    assert projects[0]["submission_date"] is not None

    projects = await query_projects(
        status=ProjectStatus.under_review, size=5, from_index=0,
        collab_id=["neuromorphic-testing-private"], owner_id=["adavison"]
    )
    assert len(projects) > 0
    assert projects[0]["accepted"] is False
    assert projects[0]["decision_date"] is None
    assert projects[0]["submission_date"] is not None

    projects = await query_projects(
        status=ProjectStatus.in_prep, size=5, from_index=0
    )
    assert len(projects) > 0
    assert projects[0]["accepted"] is False
    assert projects[0]["decision_date"] is None 
    assert projects[0]["submission_date"] is None

"""
@pytest.mark.asyncio
async def test_post_project(database_connection):

    projects = await post_project( project_id= "b52ebde9-116b-4419-894a-5f330ec3b484",  rcollab = "test", rtitle = "test collab" , rabstract = "lorem ipsum", rdescription= "lorem ipsum lorem ipsum",rowner= "jonathan", rduration = 0  ,   raccepted = False  )
    assert response.status_code == 400
"""    
