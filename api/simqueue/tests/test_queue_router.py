from datetime import date
from fastapi.testclient import TestClient
from simqueue.main import app
from simqueue.oauth import User
from simqueue.data_models import JobStatus, SubmittedJob
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
        "command": "",
        "user_id": "haroldlloyd",
        "hardware_platform": "SpiNNaker",
        "hardware_config": None,
        "provenance": None,
        "id": 999999,
        "input_data": [],
        "output_data": [],
        "tags": ["tag 1"],
        "resource_usage": 0.0,
        "status": "submitted",
        "timestamp_submission": "2022-10-11T02:44:23.746231+00:00",
        "timestamp_completion": "2022-10-11T02:46:23.746231+00:00",
    }
]
mock_accepted_job = {
    "code": "import numpy",
    "collab_id": "neuromorphic-testing-private",
    "command": "",
    "user_id": "haroldlloyd",
    "hardware_platform": "SpiNNaker",
    "hardware_config": None,
    "provenance": None,
    "id": 999999,
    "status": "submitted",
    "timestamp_submission": "2022-10-11T02:44:23.746231+00:00",
    "timestamp_completion": "2022-10-11T02:46:23.746231+00:00",
    "input_data": [],
    "output_data": [],
    "tags": ["tag 1"],
    "resource_usage": 0.0,
    "status": "finished",
}
mock_submitted_job = {
    "code": "test post",
    "command": "",
    "collab": "neuromorphic-testing-private",
    "input_data": [],
    "hardware_platform": "BrainScaleS",
    "hardware_config": None,
}
mock_tags = ["first tag", "second tag"]
mock_comments = [
    {
        "job_id": 999999,
        "content": "comment 1",
        "user_id": "haroldlloyd",
        "timestamp": "2022-11-02T01:53:14.944Z",
    },
    {
        "job_id": 999999,
        "content": "comment 2",
        "user_id": "haroldlloyd",
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
            "url": "https://BrainScaleS-r.kip.uni-heidelberg.de:7443/nmpi/job_165928/run.py",
            "content_type": "application/x-python",
            "size": 1,
            "hash": "string",
        }
    ],
    # "log": None,
    # "resource_usage": None,
    # "provenance": None,
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
    collab = None
    user_id = ["haroldlloyd"]
    hardware_platform = None
    date_range_start = None
    date_range_end = None
    from_index = 0
    size = 10
    # expected_args = (status, collab, user_id, hardware_platform,
    #                  date_range_start, date_range_end, from_index, size)
    expected_args = {
        "status": status,
        "collab": collab,
        "user_id": user_id,
        "hardware_platform": hardware_platform,
        "date_range_start": date_range_start,
        "date_range_end": date_range_end,
        "size": size,
        "from_index": from_index,
        "tags": None,
    }
    assert simqueue.db.query_jobs.await_args.kwargs == expected_args


def test_query_jobs_with_valid_filters(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.query_jobs", return_value=mock_jobs)
    response = client.get(
        "/jobs/?status=finished&hardware_platform=SpiNNaker&hardware_platform=BrainScaleS&user_id=haroldlloyd&collab=neuromorphic-testing-private&date_range_start=2021-03-01",
        headers={"Authorization": "Bearer notarealtoken"},
    )
    assert response.status_code == 200

    status = [JobStatus.finished]
    collab = ["neuromorphic-testing-private"]
    user_id = ["haroldlloyd"]
    hardware_platform = ["SpiNNaker", "BrainScaleS"]
    date_range_start = date(2021, 3, 1)
    date_range_end = None
    from_index = 0
    size = 10
    expected_args = {
        "status": status,
        "collab": collab,
        "user_id": user_id,
        "hardware_platform": hardware_platform,
        "date_range_start": date_range_start,
        "date_range_end": date_range_end,
        "size": size,
        "from_index": from_index,
        "tags": None,
    }
    assert simqueue.db.query_jobs.await_args.kwargs == expected_args


def test_get_job(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_job", return_value=mock_jobs[0])
    response = client.get("/jobs/999999", headers={"Authorization": "Bearer notarealtoken"})
    assert response.status_code == 200
    assert simqueue.db.get_job.await_args.args == (999999,)


def test_get_job_with_log_and_comments(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_job", return_value=mock_jobs[0])
    mocker.patch(
        "simqueue.db.get_comments",
        return_value=[
            {
                "id": 888,
                "job_id": 999999,
                "user": "haroldlloyd",
                "content": "comment1",
                "created_time": "1938-01-01T12:00:00",
            },
            {
                "id": 889,
                "job_id": 999999,
                "user": "charliechaplin",
                "content": "comment2",
                "created_time": "1938-01-01T12:00:01",
            },
        ],
    )
    mocker.patch("simqueue.db.get_log", return_value="...")
    response = client.get(
        "/jobs/999999?with_log=true&with_comments=true",
        headers={"Authorization": "Bearer notarealtoken"},
    )
    assert response.status_code == 200
    assert simqueue.db.get_job.await_args.args == (999999,)
    assert simqueue.db.get_log.await_args.args == (999999,)
    assert simqueue.db.get_comments.await_args.args == (999999,)


def test_get_next_job(mocker):
    mocker.patch("simqueue.db.get_next_job", return_value=mock_jobs[0])
    mocker.patch("simqueue.db.get_provider", return_value="SpiNNaker")
    response = client.get("/jobs/next/SpiNNaker", headers={"x-api-key": "valid-api-key"})
    assert response.status_code == 200
    assert simqueue.db.get_next_job.await_args.args == ("SpiNNaker",)
    assert simqueue.db.get_provider.await_args.args == ("valid-api-key",)


def test_get_tags(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_job", return_value=mock_jobs[0])
    response = client.get("/jobs/999999/tags", headers={"Authorization": "Bearer notarealtoken"})
    assert response.status_code == 200
    assert simqueue.db.get_job.await_args.args == (999999,)
    assert response.json() == mock_jobs[0]["tags"]


def test_add_tags(mocker):
    new_tags = ["yellow", "green"]
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_job", return_value=mock_jobs[0])
    mocker.patch("simqueue.db.add_tags_to_job", return_value=new_tags)
    response = client.post(
        "/jobs/999999/tags/", json=new_tags, headers={"Authorization": "Bearer notarealtoken"}
    )
    assert response.status_code == 200
    assert simqueue.db.get_job.await_args.args == (999999,)
    assert simqueue.db.add_tags_to_job.await_args.args == (999999, new_tags)
    assert response.json() == new_tags


def test_remove_tags(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_job", return_value=mock_jobs[0])
    mocker.patch("simqueue.db.remove_tags", return_value=[])
    response = client.delete(
        "/jobs/999999/tags/",
        json=mock_jobs[0]["tags"],
        headers={"Authorization": "Bearer notarealtoken"},
    )
    assert response.status_code == 200
    assert simqueue.db.get_job.await_args.args == (999999,)
    assert simqueue.db.remove_tags.await_args.args == (999999, mock_jobs[0]["tags"])


def test_query_tags(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.query_tags", return_value=["some", "tags"])
    response = client.get(
        "/tags/?collab=neuromorphic-testing-private",
        headers={"Authorization": "Bearer notarealtoken"},
    )
    assert response.status_code == 200
    assert simqueue.db.query_tags.await_args.args == ("neuromorphic-testing-private",)


def test_get_comments(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_job", return_value=mock_jobs[0])
    mocker.patch("simqueue.db.get_comments", return_value=mock_comments)
    response = client.get(
        "/jobs/999999/comments", headers={"Authorization": "Bearer notarealtoken"}
    )
    assert response.status_code == 200
    assert simqueue.db.get_job.await_args.args == (999999,)
    assert simqueue.db.get_comments.await_args.args == (999999,)


def test_get_log(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_job", return_value=mock_jobs[0])
    mocker.patch("simqueue.db.get_log", return_value=mock_log)
    response = client.get("/jobs/999999/log", headers={"Authorization": "Bearer notarealtoken"})
    assert response.status_code == 200
    assert simqueue.db.get_job.await_args.args == (999999,)
    assert simqueue.db.get_log.await_args.args == (999999,)


def test_post_job(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.create_job", return_value=mock_accepted_job)
    mocker.patch("simqueue.db.query_projects", return_value=[{"context": "xyz"}])
    mocker.patch("simqueue.db.query_quotas", return_value=[{"usage": 0, "limit": 100}])
    response = client.post(
        "/jobs/", json=mock_submitted_job, headers={"Authorization": "Bearer notarealtoken"}
    )
    assert response.status_code == 201
    assert simqueue.db.create_job.await_args.kwargs == {
        "user_id": "haroldlloyd",
        "job": {
            "code": mock_submitted_job["code"],
            "command": mock_submitted_job["command"],
            "collab_id": mock_submitted_job["collab"],
            "input_data": mock_submitted_job["input_data"],
            "hardware_platform": mock_submitted_job["hardware_platform"],
            "hardware_config": mock_submitted_job["hardware_config"],
            "tags": None,
        },
    }


def test_put_job(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_job", return_value=mock_jobs[0])
    mocker.patch("simqueue.db.update_job", return_value=mock_jobs[0])
    mocker.patch("simqueue.db.get_provider", return_value="SpiNNaker")
    response = client.put(
        "/jobs/999999", json=mock_job_patch, headers={"Authorization": "Bearer notarealtoken"}
    )
    assert response.status_code == 200
    assert simqueue.db.get_job.await_args.args == (999999,)
    assert simqueue.db.update_job.await_args.args == (999999, mock_job_patch)


def test_delete_job(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_job", return_value=mock_jobs[0])
    mocker.patch("simqueue.db.delete_job", return_value=None)
    response = client.delete("/jobs/999999", headers={"Authorization": "Bearer notarealtoken"})
    assert response.status_code == 200
    assert simqueue.db.get_job.await_args.args == (999999,)
    assert simqueue.db.delete_job.await_args.args == (999999,)


def test_add_comment(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_job", return_value=mock_jobs[0])
    mocker.patch("simqueue.db.add_comment", return_value=mock_comments[0])
    response = client.post(
        "/jobs/999999/comments/",
        json={"comment": mock_comments[0]["content"]},
        headers={"Authorization": "Bearer notarealtoken"},
    )
    assert response.status_code == 201
    assert simqueue.db.get_job.await_args.args == (999999,)
    assert simqueue.db.add_comment.await_args.kwargs == {
        "job_id": 999999,
        "user_id": mock_comments[0]["user_id"],
        "new_comment": mock_comments[0]["content"],
    }


def test_update_comment(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_job", return_value=mock_jobs[0])
    mocker.patch("simqueue.db.get_comment", return_value=mock_comments[0])
    mocker.patch("simqueue.db.update_comment", return_value=mock_comments[0])
    response = client.put(
        "/jobs/999999/comments/42",
        json={"comment": "this is an updated comment"},
        headers={"Authorization": "Bearer notarealtoken"},
    )
    assert response.status_code == 200
    assert simqueue.db.get_job.await_args.args == (999999,)
    assert simqueue.db.get_comment.await_args.args == (42,)
    assert simqueue.db.update_comment.await_args.args == (42, "this is an updated comment")


def test_remove_comment(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_job", return_value=mock_jobs[0])
    mocker.patch("simqueue.db.get_comment", return_value=mock_comments[0])
    mocker.patch("simqueue.db.delete_comment", return_value=None)
    response = client.delete(
        "/jobs/999999/comments/42",
        headers={"Authorization": "Bearer notarealtoken"},
    )
    assert response.status_code == 200
    assert simqueue.db.get_job.await_args.args == (999999,)
    assert simqueue.db.get_comment.await_args.args == (42,)
    assert simqueue.db.delete_comment.await_args.args == (42,)
