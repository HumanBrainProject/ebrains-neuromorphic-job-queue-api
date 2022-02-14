from datetime import date, datetime
import pytz
import pytest
import pytest_asyncio
from simqueue.db import database, query_jobs, get_job, query_projects


@pytest_asyncio.fixture()
async def database_connection():
    await database.connect()
    yield
    await database.disconnect()


@pytest.mark.asyncio
async def test_query_jobs_no_filters(database_connection):
    jobs = await query_jobs(size=5, from_index=5)
    assert len(jobs) == 5
    expected_keys = (
        'id', 'input_data', 'provenance', 'resource_usage', 'status', 'user_id',
        'hardware_config', 'output_data', 'code', 'command', 'timestamp_submission',
         'timestamp_completion', 'collab_id', 'hardware_platform'
    )
    assert set(jobs[0].keys()) == set(expected_keys)


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
