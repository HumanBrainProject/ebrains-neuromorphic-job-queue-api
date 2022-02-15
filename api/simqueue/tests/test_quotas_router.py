from datetime import date
from uuid import uuid4
from fastapi.testclient import TestClient
from simqueue.main import app
from simqueue.oauth import User
from simqueue.data_models import ProjectStatus
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


mock_projects = [
    {
        "collab": "neuromorphic-testing-private",
        "owner": "haroldlloyd",
        "id": uuid4(),
        "title": "title goes here",
        "abstract": "abstract goes here"
    }
]

def test_query_projects_no_auth():
    response = client.get("/projects/")
    assert response.status_code == 403


def test_query_projects(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.query_projects", return_value=mock_projects)
    response = client.get("/projects/",
                          headers={"Authorization": "Bearer notarealtoken"})
    assert response.status_code == 200

    status = None
    collab_id = ["neuromorphic-platform-admin", "neuromorphic-testing-private"]  # user can_edit
    owner_id = None
    from_index = 0
    size = 10
    expected_args = (status, collab_id, owner_id, from_index, size)
    assert simqueue.db.query_projects.await_args.args == expected_args


def test_query_projects_with_valid_filters(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.query_projects", return_value=mock_projects)
    response = client.get(
        "/projects/?status=accepted&owner_id=haroldlloyd&collab_id=neuromorphic-testing-private&collab_id=neuromorphic-platform-admin&date_range_start=2021-03-01&from_index=10",
        headers={"Authorization": "Bearer notarealtoken"}
    )
    assert response.status_code == 200

    status = ProjectStatus.accepted
    collab_id = ["neuromorphic-testing-private", "neuromorphic-platform-admin"]
    owner_id = ["haroldlloyd"]
    from_index = 10
    size = 10
    expected_args = (status, collab_id, owner_id, from_index, size)
    assert simqueue.db.query_projects.await_args.args == expected_args


def test_query_collabs(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.query_projects", return_value=mock_projects)
    response = client.get("/collabs/",
                          headers={"Authorization": "Bearer notarealtoken"})
    assert response.status_code == 200

    status = None
    collab_id = ["neuromorphic-platform-admin", "neuromorphic-testing-private"]  # user can_edit
    owner_id = None
    from_index = 0
    size = 10
    expected_args = (status, collab_id)
    assert simqueue.db.query_projects.await_args.args == expected_args
