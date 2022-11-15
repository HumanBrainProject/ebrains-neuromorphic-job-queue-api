from datetime import date
import json
from uuid import uuid4, UUID

from fastapi.testclient import TestClient
from fastapi.encoders import jsonable_encoder

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
                "group": ["comic-film-actors-from-the-silent-era"],
                "team": [
                    "collab-some-other-collab-viewer",
                    "collab-neuromorphic-testing-private-editor",
                    "collab-neuromorphic-platform-admin-administrator",
                ],
            },
        }
        return cls(**user_data)


class MockUserPub(User):
    @classmethod
    async def from_token(cls, token):
        user_data = {
            "preferred_username": "roldlloyd",
            "roles": {
                "group": ["comic-film-actors-from-the-silent-era"],
                "team": [
                    "collab-some-other-collab-viewer",
                ],
            },
        }
        return cls(**user_data)


class MockUserPriv(User):
    @classmethod
    async def from_token(cls, token):
        user_data = {
            "preferred_username": "alloyd",
            "roles": {
                "group": ["comic-film-actors-from-the-silent-era"],
                "team": [
                    "andrew-public-test-editor",
                    "collab-some-other-collab-viewer",
                    "collab-neuromorphic-testing-private-editor",
                    "nmc-jupytertestcollab-editor",
                ],
            },
        }
        return cls(**user_data)


class MockUseradmin(User):
    @classmethod
    async def from_token(cls, token):
        user_data = {
            "preferred_username": "loyd",
            "roles": {
                "group": ["comic-film-actors-from-the-silent-era"],
                "team": [
                    "andrew-public-test-administrator" "collab-some-other-collab-viewer",
                    "collab-neuromorphic-testing-private-adminstrator",
                    "collab-neuromorphic-platform-admin-administrator",
                    "collab-neuromorphic-platform-admin-editor",
                    "nmc-jupytertestcollab-administrator",
                ],
            },
        }
        return cls(**user_data)


mock_projects = [
    {
        "collab": "neuromorphic-testing-private",
        "title": "fff lorem ipsum lorme ipsum",
        "abstract": "lorem ipsum",
        "description": "lorem ipsum",
        "id": "ff4e494f-6f44-47c6-9a85-7091ff788b17",
        "owner": "haroldlloyd",
        "duration": 0,
        "start_date": "2022-10-15",
        "accepted": True,
        "submission_date": "2022-10-15",
        "decision_date": "2022-10-15",
    },
    {
        "collab": "neuromorphic-testing-private ssss",
        "title": "testing Collaboratory v2 integration",
        "abstract": "abstract goes here lorem ipsum",
        "description": "lorem ipsum lorem ipsum testing private  lorem ipsum idadad lorem ipsummmm",
        "id": "4948a906-2488-11ed-8c74-e5cdf4879499",
        "owner": "haroldlloyd",
        "duration": 0,
        "start_date": None,
        "accepted": False,
        "submission_date": "2022-10-15",
        "decision_date": None,
    },
]


def test_query_projects_no_auth():
    response = client.get("/projects/")
    assert response.status_code == 403


def test_query_projects(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.query_projects", return_value=mock_projects)
    mocker.patch("simqueue.db.follow_relationships_quotas", return_value=[])
    response = client.get("/projects/", headers={"Authorization": "Bearer notarealtoken"})
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
    mocker.patch("simqueue.db.follow_relationships_quotas", return_value=[])
    response = client.get(
        "/projects/?status=accepted&owner_id=haroldlloyd&collab_id=neuromorphic-testing-private&collab_id=neuromorphic-platform-admin&date_range_start=2021-03-01&from_index=10",
        headers={"Authorization": "Bearer notarealtoken"},
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
    response = client.get(
        "/collabs/?size=100&from_index=0&as_admin=false",
        headers={"Authorization": "Bearer notarealtoken"},
    )

    assert response.status_code == 200

    status = None
    collab_id = ["neuromorphic-platform-admin", "neuromorphic-testing-private"]  # user can_edit
    owner_id = None
    from_index = 0
    size = 10
    expected_args = (status, collab_id)
    assert simqueue.db.query_projects.await_args.args == expected_args


def test_get_project(mocker):
    data = {
        "id": "b52ebde9-116b-4419-894a-5f330ec3b484",
        "collab": "neuromorphic-testing-private",
        "title": "testing Collaboratory v2 integration",
        "abstract": "for testing, created with Python client",
        "description": "",
        "owner": "adavison",
        "duration": 0,
        "start_date": "2021-01-05",
        "accepted": True,
        "submission_date": "2021-01-05",
        "decision_date": "2021-01-05",
    }
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_project", return_value=data)
    mocker.patch("simqueue.db.follow_relationships_quotas", return_value=[])

    response = client.get(
        "/projects/b52ebde9-116b-4419-894a-5f330ec3b484?as_admin=false",
        headers={"Authorization": "Bearer notarealtoken"},
    )
    assert response.status_code == 200
    project_id = UUID("b52ebde9-116b-4419-894a-5f330ec3b484")

    expected_args = (project_id,)
    assert simqueue.db.get_project.await_args.args == expected_args


def test_create_project_asmember(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.create_project")

    datap = {
        "collab": "neuromorphic-testing-private",
        "title": "testing Collaboratory v2 integration",
        "abstract": "abstract goes here",
        "description": "dddddd",
        "context": "3da3e111-6a73-4a78-a850-67fabd524cba",
        "owner": "haroldlloyd",
        "duration": 0,
        "status": "in preparation",
        "submitted": False,
    }

    json_compatible_item_data = jsonable_encoder(datap)

    response = client.post(
        "/projects/?as_admin=false",
        headers={
            "accept": "application/json",
            "Authorization": "Bearer notarealtoken",
            "Content-Type": "application/json",
        },
        json=json_compatible_item_data,
    )

    assert response.status_code == 201
    """
           reste à vérifier qu'on doit ou pas mettre response comme dict
           """


def test_create_item_as_non_member(mocker):
    mocker.patch("simqueue.oauth.User", MockUserPub)
    mocker.patch("simqueue.db.create_project")

    datap = {
        "collab": "neuromorphic-testing-private",
        "title": "testing Collaboratory v2 integration",
        "abstract": "abstract goes here",
        "description": "dddddd",
        "context": "02461c47-1262-4f8a-ad23-e58d67bdd6db",
        "owner": "haroldlloyd",
        "duration": 0,
        "status": "in preparation",
        "submited": False,
    }

    json_compatible_item_data = jsonable_encoder(datap)
    response = client.post(
        "/projects/?as_admin=false",
        headers={
            "accept": "application/json",
            "Authorization": "Bearer notarealtoken",
            "Content-Type": "application/json",
        },
        json=json_compatible_item_data,
    )

    assert response.status_code == 403
    """
           reste à vérifier qu'on doit ou pas mettre response comme dict
           """


def test_update_item(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    existing_project = {
        "collab": "neuromorphic-testing-private",
        "title": "testing Collaboratory v2 integration",
        "abstract": "abstract goes here",
        "description": "dddddd",
        "id": "2b79a1a8-5825-4359-9b2d-2b6a11537e6b",
        "owner": "haroldlloyd",
        "duration": 0,
        "submission_date": None,
    }
    mocker.patch("simqueue.db.update_project")
    mocker.patch("simqueue.db.get_project", return_value=existing_project)

    data = {
        "collab": "neuromorphic-testing-private",
        "title": "testing Collaboratory v2 integration...",
        "abstract": "this is the abstract",
        "description": "eeeeee",
        "owner": "haroldlloyd",
        "status": "in preparation",
        "submitted": False,
    }

    json_compatible_item_data = jsonable_encoder(data)
    response = client.put(
        "/projects/2b79a1a8-5825-4359-9b2d-2b6a11537e6b?as_admin=false",
        headers={
            "accept": "application/json",
            "Authorization": "Bearer notarealtoken",
            "Content-Type": "application/json",
        },
        json=json_compatible_item_data,
    )

    assert response.status_code == 200
    """
    reste à vérifier qu'on doit ou pas mettre response comme dict
    """


def test_only_admins_can_edit_accepted_rejected_projects(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    existing_project = {
        "collab": "neuromorphic-testing-private",
        "title": "testing Collaboratory v2 integration",
        "abstract": "abstract goes here",
        "description": "dddddd",
        "id": "2b79a1a8-5825-4359-9b2d-2b6a11537e6b",
        "owner": "haroldlloyd",
        "duration": 0,
        "submission_date": None,
    }
    mocker.patch("simqueue.db.update_project")
    mocker.patch("simqueue.db.get_project", return_value=existing_project)

    data = {
        "collab": "neuromorphic-testing-private",
        "title": "fff lorem ipsum lorme ipsum",
        "abstract": "lorem ipsum vvvvv fff",
        "description": "lorem ipsum",
        "context": "ff4e494f-6f44-47c6-9a85-7091ff788b17",
        "owner": "haroldlloyd",
        "duration": 0,
        "status": "accepted",
        "submitted": True,
    }

    json_compatible_item_data = jsonable_encoder(data)
    response = client.put(
        "/projects/ff4e494f-6f44-47c6-9a85-7091ff788b17?as_admin=false",
        headers={
            "accept": "application/json",
            "Authorization": "Bearer notarealtoken",
            "Content-Type": "application/json",
        },
        json=json_compatible_item_data,
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "You do not have permission to change the status of this project."
    }
    """
    reste à vérifier qu'on doit ou pas mettre response comme dict
    """


def test_editing_forbidden_after_submission(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    existing_project = {
        "collab": "neuromorphic-testing-private",
        "title": "testing Collaboratory v2 integration",
        "abstract": "abstract goes here",
        "description": "dddddd",
        "id": "2b79a1a8-5825-4359-9b2d-2b6a11537e6b",
        "owner": "haroldlloyd",
        "duration": 0,
        "submission_date": date.today(),
    }
    mocker.patch("simqueue.db.update_project")
    mocker.patch("simqueue.db.get_project", return_value=existing_project)

    data = {
        "collab": "neuromorphic-testing-private ssss",
        "title": "testing Collaboratory v2 integration",
        "abstract": "abstract goes here lorem ipsum",
        "description": "lorem ipsum lorem ipsum testing private  lorem ipsum idadad lorem ipsummmm",
        "context": "4948a906-2488-11ed-8c74-e5cdf4879499",
        "owner": "haroldlloyd",
        "duration": 0,
        "status": "under review",
        "submitted": True,
    }
    mocker.patch("simqueue.db.update_project")

    json_compatible_item_data = jsonable_encoder(data)
    response = client.put(
        "/projects/4948a906-2488-11ed-8c74-e5cdf4879499?as_admin=false",
        headers={
            "accept": "application/json",
            "Authorization": "Bearer notarealtoken",
            "Content-Type": "application/json",
        },
        json=json_compatible_item_data,
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Can't edit a submitted form."}
