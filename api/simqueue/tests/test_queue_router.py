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
                "group": ["comic-film-actors-from-the-silent-era"],
                "team": [
                    "collab-some-other-collab-viewer",
                    "collab-neuromorphic-testing-private-editor",
                    "collab-neuromorphic-platform-admin-administrator",
                ],
            },
        }
        return cls(**user_data)


mock_jobs = [
    {
        "code": "import numpy",
        "collab_id": "neuromorphic-testing-private",
        "user_id": "haroldlloyd",
        "hardware_platform": "SpiNNaker",
        "id": 999999,
        "tags": [{"tag_id": 57, "content": "tag 1"}],
    }
]
mock_accepted_job = {
    "code": "import numpy",
    "collab_id": "neuromorphic-testing-private",
    "user_id": "haroldlloyd",
    "hardware_platform": "SpiNNaker",
    "id": 999999,
    "user_id": "haguili",
    "status": "submitted",
    "timestamp_submission": "2022-10-11T02:44:23.746231+00:00",
    "tags": [{"tag_id": 57, "content": "tag 1"}],
}
mock_submitted_job = {
    "code": "test post",
    "command": "",
    "collab_id": "neuromorphic-testing-private",
    "input_data": [],
    "hardware_platform": "Brainscales",
}
mock_tags = [{"tag_id": 100, "content": "first tag"}, {"tag_id": 101, "content": "second tag"}]
mock_comments = [
    {
        "job_id": 999999,
        "content": "comment 1",
        "user_id": "haguili",
        "timestamp": "2022-11-02T01:53:14.944Z",
    },
    {
        "job_id": 999999,
        "content": "comment 2",
        "user_id": "haguili",
        "timestamp": "2022-11-02T01:53:14.944Z",
    },
]
mock_log = {
    "job_id": 999999,
    "content": "Running from /tmp/job3395001697060736013.tmp; changing to spinnaker",
}
mock_job_patch = {
    "status": "submitted",
    "output_data": [
        {
            "url": "https://brainscales-r.kip.uni-heidelberg.de:7443/nmpi/job_165928/run.py",
            "content_type": "string",
            "size": 1,
            "hash": "string",
        }
    ],
    "log": None,
    "resource_usage": None,
    "provenance": None,
}


def test_query_jobs_no_auth():
    response = client.get("/jobs/")
    assert response.status_code == 403


def test_query_jobs(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.query_jobs", return_value=mock_jobs)
    response = client.get("/jobs/", headers={"Authorization": "Bearer notarealtoken"})
    assert response.status_code == 200

    status = None
    collab_id = None
    user_id = ["haroldlloyd"]
    hardware_platform = None
    date_range_start = None
    date_range_end = None
    from_index = 0
    size = 10
    # expected_args = (status, collab_id, user_id, hardware_platform,
    #                  date_range_start, date_range_end, from_index, size)
    expected_args = (
        status,
        collab_id,
        user_id,
        hardware_platform,
        date_range_start,
        date_range_end,
    )
    assert simqueue.db.query_jobs.await_args.args == expected_args


def test_query_jobs_with_valid_filters(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.query_jobs", return_value=mock_jobs)
    response = client.get(
        "/jobs/?status=finished&hardware_platform=SpiNNaker&hardware_platform=BrainScaleS&user_id=haroldlloyd&collab_id=neuromorphic-testing-private&date_range_start=2021-03-01",
        headers={"Authorization": "Bearer notarealtoken"},
    )
    assert response.status_code == 200

    status = [JobStatus.finished]
    collab_id = ["neuromorphic-testing-private"]
    user_id = ["haroldlloyd"]
    hardware_platform = ["SpiNNaker", "BrainScaleS"]
    date_range_start = date(2021, 3, 1)
    date_range_end = None
    from_index = 0
    size = 10
    expected_args = (
        status,
        collab_id,
        user_id,
        hardware_platform,
        date_range_start,
        date_range_end,
    )
    assert simqueue.db.query_jobs.await_args.args == expected_args


def test_get_job(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_job", return_value=mock_jobs[0])
    response = client.get("/jobs/999999", headers={"Authorization": "Bearer notarealtoken"})
    assert response.status_code == 200


def test_get_tags(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_job", return_value=mock_jobs[0])
    mocker.patch("simqueue.db.get_tags", return_value=mock_tags)
    response = client.get("/jobs/999999/tags", headers={"Authorization": "Bearer notarealtoken"})
    assert response.status_code == 200


def test_get_comments(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_job", return_value=mock_jobs[0])
    mocker.patch("simqueue.db.get_comments", return_value=mock_comments)
    response = client.get(
        "/jobs/999999/comments", headers={"Authorization": "Bearer notarealtoken"}
    )
    assert response.status_code == 200


def test_get_log(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_job", return_value=mock_jobs[0])
    mocker.patch("simqueue.db.get_log", return_value=mock_log)
    response = client.get("/jobs/999999/log", headers={"Authorization": "Bearer notarealtoken"})
    assert response.status_code == 200


def test_post_job(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.create_job", return_value=mock_accepted_job)
    response = client.post(
        "/jobs/", json=mock_submitted_job, headers={"Authorization": "Bearer notarealtoken"}
    )
    assert response.status_code == 201


def test_put_job(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_job", return_value=mock_jobs[0])
    mocker.patch("simqueue.db.put_job", return_value=mock_jobs[0])
    response = client.put(
        "/jobs/999999", json=mock_job_patch, headers={"Authorization": "Bearer notarealtoken"}
    )
    assert response.status_code == 200
