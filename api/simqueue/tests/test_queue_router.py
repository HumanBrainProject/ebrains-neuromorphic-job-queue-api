from datetime import date
from fastapi.testclient import TestClient
from simqueue.main import app
from simqueue.oauth import User
from simqueue.data_models import JobStatus
import simqueue.db

client = TestClient(app)


class MockUser(User):

    @classmethod
    async def from_token(cls, token):
        user_data = {
            "preferred_username": "haroldlloyd",
            "roles": {
                "group": [
                    "comic-film-actors-from-the-silent-era"
                ],
                "team": [
                    "collab-some-other-collab-viewer",
                    "collab-neuromorphic-testing-private-editor",
                    "collab-neuromorphic-platform-admin-administrator"
                ]
            }
        }
        return cls(**user_data)


mock_jobs = [
    {
        "code": "import numpy",
        "collab_id": "neuromorphic-testing-private",
        "user_id": "haroldlloyd",
        "hardware_platform": "SpiNNaker",
        "id": 999999
    }
]

def test_query_jobs_no_auth():
    response = client.get("/jobs/")
    assert response.status_code == 403


def test_query_jobs(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.query_jobs", return_value=mock_jobs)
    response = client.get("/jobs/",
                          headers={"Authorization": "Bearer notarealtoken"})
    assert response.status_code == 200

    status = None
    collab_id = None
    user_id = ["haroldlloyd"]
    hardware_platform = None
    date_range_start = None
    date_range_end = None
    from_index = 0
    size = 10
    expected_args = (status, collab_id, user_id, hardware_platform,
                     date_range_start, date_range_end, from_index, size)
    assert simqueue.db.query_jobs.await_args.args == expected_args


def test_query_jobs_with_valid_filters(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.query_jobs", return_value=mock_jobs)
    response = client.get(
        "/jobs/?status=finished&hardware_platform=SpiNNaker&hardware_platform=BrainScaleS&user_id=haroldlloyd&collab_id=neuromorphic-testing-private&date_range_start=2021-03-01",
        headers={"Authorization": "Bearer notarealtoken"}
    )
    assert response.status_code == 200

    status = JobStatus.finished
    collab_id = ["neuromorphic-testing-private"]
    user_id = ["haroldlloyd"]
    hardware_platform = ["SpiNNaker", "BrainScaleS"]
    date_range_start = date(2021, 3, 1)
    date_range_end = None
    from_index = 0
    size = 10
    expected_args = (status, collab_id, user_id, hardware_platform,
                     date_range_start, date_range_end, from_index, size)
    assert simqueue.db.query_jobs.await_args.args == expected_args


def test_get_job(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_job", return_value=mock_jobs[0])
    response = client.get("/jobs/999999",
                          headers={"Authorization": "Bearer notarealtoken"})
    assert response.status_code == 200
