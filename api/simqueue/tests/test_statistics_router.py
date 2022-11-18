from datetime import datetime
from fastapi.testclient import TestClient
from simqueue.main import app
import simqueue.db


client = TestClient(app)


mock_jobs = [
    {
        "timestamp_submission": datetime.fromisoformat("2022-10-03T02:44:23+00:00"),
        "timestamp_completion": datetime.fromisoformat("2022-10-03T02:44:28+00:00"),
        "user_id": "haroldlloyd",
        "status": "finished",
    },
    {
        "timestamp_submission": datetime.fromisoformat("2022-10-11T02:44:23+00:00"),
        "timestamp_completion": datetime.fromisoformat("2022-10-11T02:44:38+00:00"),
        "user_id": "charliechaplin",
        "status": "finished",
    },
    {
        "timestamp_submission": datetime.fromisoformat("2022-10-12T02:44:23+00:00"),
        "timestamp_completion": datetime.fromisoformat("2022-10-12T02:44:28+00:00"),
        "user_id": "haroldlloyd",
        "status": "finished",
    },
    {
        "timestamp_submission": datetime.fromisoformat("2022-10-16T02:44:23+00:00"),
        "timestamp_completion": datetime.fromisoformat("2022-10-16T02:44:48+00:00"),
        "user_id": "haroldlloyd",
        "status": "error",
    },
]


async def mock_query_jobs(**kwargs):
    if kwargs["hardware_platform"] == ["SpiNNaker"]:
        if "status" in kwargs:
            return [job for job in mock_jobs if job["status"] in kwargs["status"]]
        else:
            return mock_jobs
    else:
        return []


def test_job_count(mocker):
    mocker.patch("simqueue.db.query_jobs", mock_query_jobs)
    response = client.get("/statistics/job-count?start=2022-10-01&end=2022-10-15&interval=7")
    assert response.status_code == 200
    assert response.json() == [
        {
            "start": "2022-10-01",
            "end": "2022-10-08",
            "count": {
                "BrainScaleS": 0,
                "BrainScaleS-ESS": 0,
                "Spikey": 0,
                "SpiNNaker": 1,
                "BrainScaleS-2": 0,
            },
        },
        {
            "start": "2022-10-08",
            "end": "2022-10-15",
            "count": {
                "BrainScaleS": 0,
                "BrainScaleS-ESS": 0,
                "Spikey": 0,
                "SpiNNaker": 2,
                "BrainScaleS-2": 0,
            },
        },
    ]


def test_cumulative_job_count(mocker):
    mocker.patch("simqueue.db.query_jobs", mock_query_jobs)
    response = client.get(
        "/statistics/cumulative-job-count?start=2022-10-01&end=2022-10-15&interval=7"
    )
    assert response.status_code == 200
    assert response.json() == [
        {
            "start": "2022-10-01",
            "end": "2022-10-08",
            "count": {
                "BrainScaleS": 0,
                "BrainScaleS-ESS": 0,
                "Spikey": 0,
                "SpiNNaker": 1,
                "BrainScaleS-2": 0,
            },
        },
        {
            "start": "2022-10-08",
            "end": "2022-10-15",
            "count": {
                "BrainScaleS": 0,
                "BrainScaleS-ESS": 0,
                "Spikey": 0,
                "SpiNNaker": 3,
                "BrainScaleS-2": 0,
            },
        },
    ]


def test_cumulative_users_count(mocker):
    mocker.patch(
        "simqueue.db.get_users_list",
        return_value=[{"user_id": "haroldlloyd"}, {"user_id": "charliechaplin"}],
    )
    mocker.patch("simqueue.db.query_jobs", mock_query_jobs)
    response = client.get("/statistics/cumulative-user-count?hardware_platform=SpiNNaker")
    assert response.status_code == 200
    assert response.json() == {
        "dates": ["2022-10-03", "2022-10-03", "2022-11-18"],
        "values": [1, 2, 2],
    }


def test_active_users_count(mocker):
    async def mock_get_users_count(
        status=None, hardware_platform=None, date_range_start=None, date_range_end=None
    ):
        if hardware_platform == ["SpiNNaker"]:
            users = set()
            for job in mock_jobs:
                if date_range_start <= job["timestamp_completion"].date() < date_range_end:
                    users.add(job["user_id"])
            return len(users)
        else:
            return 0

    mocker.patch(
        "simqueue.db.get_users_count",
        mock_get_users_count,
    )
    response = client.get(
        "/statistics/active-user-count?start=2022-10-01&end=2022-10-15&interval=7"
    )
    assert response.status_code == 200
    assert response.json() == [
        {
            "start": "2022-10-01",
            "end": "2022-10-08",
            "count": {
                "BrainScaleS": 0,
                "BrainScaleS-ESS": 0,
                "Spikey": 0,
                "SpiNNaker": 1,
                "BrainScaleS-2": 0,
            },
        },
        {
            "start": "2022-10-08",
            "end": "2022-10-15",
            "count": {
                "BrainScaleS": 0,
                "BrainScaleS-ESS": 0,
                "Spikey": 0,
                "SpiNNaker": 2,
                "BrainScaleS-2": 0,
            },
        },
    ]


def test_queue_length(mocker):
    mocker.patch(
        "simqueue.db.count_jobs",
        return_value=7,
    )
    response = client.get("/statistics/queue-length")
    assert response.status_code == 200
    assert response.json() == [
        {"queue_name": "BrainScaleS", "running": 7, "submitted": 7},
        {"queue_name": "BrainScaleS-ESS", "running": 7, "submitted": 7},
        {"queue_name": "Spikey", "running": 7, "submitted": 7},
        {"queue_name": "SpiNNaker", "running": 7, "submitted": 7},
        {"queue_name": "BrainScaleS-2", "running": 7, "submitted": 7},
    ]


def test_job_duration(mocker):
    mocker.patch("simqueue.db.query_jobs", mock_query_jobs)
    response = client.get("/statistics/job-duration?n_bins=5&requested_max=30")
    assert response.status_code == 200
    # job durations are [5, 15, 5, 25]
    assert response.json() == [
        {
            "values": [2, 0, 1, 0, 0],
            "bins": [0.0, 6.0, 12.0, 18.0, 24.0, 30.0],
            "platform": "SpiNNaker",
            "status": "finished",
            "scale": "linear",
            "max": 30,
        },
        {
            "values": [0, 0, 0, 0, 1],
            "bins": [0.0, 6.0, 12.0, 18.0, 24.0, 30.0],
            "platform": "SpiNNaker",
            "status": "error",
            "scale": "linear",
            "max": 30,
        },
    ]
