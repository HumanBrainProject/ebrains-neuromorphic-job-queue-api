from datetime import date
from copy import deepcopy
import json
from uuid import uuid4, UUID

from fastapi.testclient import TestClient
from fastapi.encoders import jsonable_encoder

from simqueue.main import app
from simqueue.oauth import User
from simqueue.data_models import ProjectStatus, QuotaSubmission
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
                    "collab-charlie-viewer",
                    "collab-my-collab-editor",
                    "collab-some-other-collab-editor",
                ],
            },
        }
        return cls(**user_data)


class MockUserPub(User):
    @classmethod
    async def from_token(cls, token):
        user_data = {
            "preferred_username": "charliechaplin",
            "roles": {
                "group": ["comic-film-actors-from-the-silent-era"],
                "team": [
                    "collab-charlie-editor",
                    "collab-my-collab-viewer",
                    "collab-some-other-collab-viewer",
                ],
            },
        }
        return cls(**user_data)


class MockUserAdmin(User):
    @classmethod
    async def from_token(cls, token):
        user_data = {
            "preferred_username": "admin",
            "roles": {
                "team": ["collab-neuromorphic-platform-admin-administrator"],
            },
        }
        return cls(**user_data)


mock_projects = [
    {
        "collab": "my-collab",
        "title": "Bughouse Bellhops",
        "abstract": "lorem ipsum",
        "description": "lorem ipsum",
        "context": "ff4e494f-6f44-47c6-9a85-7091ff788b17",
        "owner": "haroldlloyd",
        "duration": 0,
        "start_date": "2022-10-15",
        "accepted": True,
        "submission_date": "2022-10-15",
        "decision_date": "2022-10-15",
    },
    {
        "collab": "some-other-collab",
        "title": "Tinkering with Trouble",
        "abstract": "abstract goes here lorem ipsum",
        "description": "lorem ipsum lorem ipsum testing private  lorem ipsum idadad lorem ipsummmm",
        "context": "4948a906-2488-11ed-8c74-e5cdf4879499",
        "owner": "haroldlloyd",
        "duration": 0,
        "start_date": None,
        "accepted": False,
        "submission_date": "2022-10-15",
        "decision_date": None,
    },
    {
        "collab": "charlie",
        "title": "The Dictator",
        "abstract": "abstract goes here lorem ipsum",
        "description": "lorem ipsum lorem ipsum testing private  lorem ipsum idadad lorem ipsummmm",
        "context": "4948a906-2488-11ed-8c74-e5cdf4879499",
        "owner": "charliechaplin",
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
    collab = ["my-collab", "some-other-collab"]  # user can_edit
    owner = None
    from_index = 0
    size = 10
    expected_args = {
        "status": status,
        "collab": collab,
        "owner": owner,
        "from_index": from_index,
        "size": size,
    }
    assert simqueue.db.query_projects.await_args.kwargs == expected_args


def test_query_projects_with_valid_filters(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.query_projects", return_value=mock_projects)
    mocker.patch("simqueue.db.follow_relationships_quotas", return_value=[])
    response = client.get(
        "/projects/?status=accepted&owner=haroldlloyd&collab=my-collab&collab=some-other-collab&date_range_start=2021-03-01&from_index=10",
        headers={"Authorization": "Bearer notarealtoken"},
    )
    assert response.status_code == 200

    status = ProjectStatus.accepted
    collab = ["my-collab", "some-other-collab"]
    owner = ["haroldlloyd"]
    from_index = 10
    size = 10
    expected_args = {
        "status": status,
        "collab": collab,
        "owner": owner,
        "from_index": from_index,
        "size": size,
    }
    assert simqueue.db.query_projects.await_args.kwargs == expected_args


def test_query_collabs(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.query_projects", return_value=mock_projects)
    response = client.get(
        "/collabs/?size=100&from_index=0",
        headers={"Authorization": "Bearer notarealtoken"},
    )

    assert response.status_code == 200

    status = None
    collabs = ["my-collab", "some-other-collab"]  # user can_edit
    owner = None
    from_index = 0
    size = 100
    expected_args = {
        "collab": collabs,
        "from_index": from_index,
        "owner": owner,
        "size": size,
        "status": status,
    }
    assert simqueue.db.query_projects.await_args.kwargs == expected_args


def test_get_project(mocker):
    data = {
        "context": "b52ebde9-116b-4419-894a-5f330ec3b484",
        "collab": "my-collab",
        "title": "testing Collaboratory v2 integration",
        "abstract": "for testing, created with Python client",
        "description": "",
        "owner": "haroldlloyd",
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
        "/projects/b52ebde9-116b-4419-894a-5f330ec3b484",
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
        "collab": "my-collab",
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
        "/projects/",
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


def test_create_project_as_non_member(mocker):
    mocker.patch("simqueue.oauth.User", MockUserPub)
    mocker.patch("simqueue.db.create_project")

    datap = {
        "collab": "my-collab",
        "title": "testing Collaboratory v2 integration",
        "abstract": "abstract goes here",
        "description": "dddddd",
        "context": "02461c47-1262-4f8a-ad23-e58d67bdd6db",
        "owner": "charliechaplin",
        "duration": 0,
        "status": "in preparation",
        "submited": False,
    }

    json_compatible_item_data = jsonable_encoder(datap)
    response = client.post(
        "/projects/",
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


def test_update_project_as_user(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    existing_project = {
        "collab": "my-collab",
        "title": "testing Collaboratory v2 integration",
        "abstract": "abstract goes here",
        "description": "dddddd",
        "context": "2b79a1a8-5825-4359-9b2d-2b6a11537e6b",
        "owner": "haroldlloyd",
        "duration": 0,
        "submission_date": None,
        "decision_date": None,
    }
    mocker.patch("simqueue.db.update_project")
    mocker.patch("simqueue.db.get_project", return_value=existing_project)

    data = {
        "collab": "my-collab",
        "title": "testing Collaboratory v2 integration...",
        "abstract": "this is the abstract",
        "description": "eeeeee",
        "owner": "haroldlloyd",
        "status": "in preparation",
        "submitted": False,
    }

    json_compatible_item_data = jsonable_encoder(data)
    response = client.put(
        "/projects/2b79a1a8-5825-4359-9b2d-2b6a11537e6b",
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


def test_update_project_as_admin(mocker):
    mocker.patch("simqueue.oauth.User", MockUserAdmin)
    existing_project = {
        "collab": "my-collab",
        "title": "testing Collaboratory v2 integration",
        "abstract": "abstract goes here",
        "description": "dddddd",
        "context": "2b79a1a8-5825-4359-9b2d-2b6a11537e6b",
        "owner": "haroldlloyd",
        "duration": 0,
        "submission_date": "2021-01-05",
        "decision_date": None,
        "accepted": False,
    }
    mocker.patch("simqueue.db.update_project")
    mocker.patch("simqueue.db.get_project", return_value=existing_project)

    data = deepcopy(existing_project)
    data.update({"status": "accepted"})
    json_compatible_item_data = jsonable_encoder(data)
    response = client.put(
        "/projects/2b79a1a8-5825-4359-9b2d-2b6a11537e6b?as_admin=true",
        headers={
            "accept": "application/json",
            "Authorization": "Bearer notarealtoken",
            "Content-Type": "application/json",
        },
        json=json_compatible_item_data,
    )

    assert response.status_code == 200


def test_only_admins_can_edit_accepted_rejected_projects(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    existing_project = {
        "collab": "my-collab",
        "title": "testing Collaboratory v2 integration",
        "abstract": "abstract goes here",
        "description": "dddddd",
        "context": "2b79a1a8-5825-4359-9b2d-2b6a11537e6b",
        "owner": "haroldlloyd",
        "duration": 0,
        "submission_date": None,
        "decision_date": None,
        "accepted": False,
    }
    mocker.patch("simqueue.db.update_project")
    mocker.patch("simqueue.db.get_project", return_value=existing_project)

    data = {
        "collab": "my-collab",
        "title": "fff lorem ipsum lorme ipsum",
        "abstract": "lorem ipsum vvvvv fff",
        "description": "lorem ipsum",
        "context": "ff4e494f-6f44-47c6-9a85-7091ff788b17",
        "owner": "haroldlloyd",
        "status": "accepted",
    }

    json_compatible_item_data = jsonable_encoder(data)
    response = client.put(
        "/projects/ff4e494f-6f44-47c6-9a85-7091ff788b17",
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
        "collab": "my-collab",
        "title": "testing Collaboratory v2 integration",
        "abstract": "abstract goes here",
        "description": "dddddd",
        "context": "2b79a1a8-5825-4359-9b2d-2b6a11537e6b",
        "owner": "haroldlloyd",
        "duration": 0,
        "submission_date": date.today(),
        "decision_date": None,
        "accepted": False,
    }
    mocker.patch("simqueue.db.update_project")
    mocker.patch("simqueue.db.get_project", return_value=existing_project)

    data = {
        "collab": "my-collab ssss",
        "title": "testing Collaboratory v2 integration",
        "abstract": "abstract goes here lorem ipsum",
        "description": "lorem ipsum lorem ipsum testing private  lorem ipsum idadad lorem ipsummmm",
        "context": "4948a906-2488-11ed-8c74-e5cdf4879499",
        "owner": "haroldlloyd",
    }
    mocker.patch("simqueue.db.update_project")

    json_compatible_item_data = jsonable_encoder(data)
    response = client.put(
        "/projects/4948a906-2488-11ed-8c74-e5cdf4879499",
        headers={
            "accept": "application/json",
            "Authorization": "Bearer notarealtoken",
            "Content-Type": "application/json",
        },
        json=json_compatible_item_data,
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Can't edit a submitted form."}


def test_delete_project(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_project", return_value=mock_projects[0])
    mocker.patch("simqueue.db.delete_quotas_from_project", return_value=None)
    mocker.patch("simqueue.db.delete_project", return_value=None)
    response = client.delete(
        "/projects/b52ebde9-116b-4419-894a-5f330ec3b484",
        headers={"Authorization": "Bearer notarealtoken"},
    )
    assert response.status_code == 200
    assert simqueue.db.delete_quotas_from_project.await_args.args == (
        "b52ebde9-116b-4419-894a-5f330ec3b484",
    )
    assert simqueue.db.delete_project.await_args.args == ("b52ebde9-116b-4419-894a-5f330ec3b484",)


def test_query_quotas(mocker):
    project_id = "b52ebde9-116b-4419-894a-5f330ec3b484"
    mock_quotas = [
        {
            "id": 999,
            "platform": "TestPlatform",
            "limit": 5000,
            "usage": 42,
            "units": "bushels",
            "project_id": project_id,
        },
        {
            "id": 777,
            "platform": "BrainScaleS",
            "limit": 0.1,
            "usage": 0.00123,
            "units": "wafer-hours",
            "project_id": project_id,
        },
    ]
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_project", return_value=mock_projects[0])
    mocker.patch("simqueue.db.query_quotas", return_value=mock_quotas)
    response = client.get(
        f"/projects/{project_id}/quotas/",
        headers={"Authorization": "Bearer notarealtoken"},
    )
    assert response.status_code == 200
    assert simqueue.db.get_project.await_args.args == (UUID(project_id),)
    assert simqueue.db.query_quotas.await_args.kwargs == {
        "project_id": UUID(project_id),
        "size": 10,
        "from_index": 0,
    }


def test_get_quota(mocker):
    project_id = "b52ebde9-116b-4419-894a-5f330ec3b484"
    mock_quota = {
        "id": 999,
        "platform": "TestPlatform",
        "limit": 5000,
        "usage": 42,
        "units": "bushels",
        "project_id": project_id,
    }
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_project", return_value=mock_projects[0])
    mocker.patch("simqueue.db.get_quota", return_value=mock_quota)
    response = client.get(
        f"/projects/{project_id}/quotas/999",
        headers={"Authorization": "Bearer notarealtoken"},
    )
    assert response.status_code == 200
    assert simqueue.db.get_project.await_args.args == (UUID(project_id),)
    assert simqueue.db.get_quota.await_args.args == (999,)


def test_create_quota(mocker):
    project_id = "b52ebde9-116b-4419-894a-5f330ec3b484"
    new_quota = {
        "platform": "TestPlatform",
        "limit": 5000,
        "usage": 42,
        "units": "bushels",
    }
    mocker.patch("simqueue.oauth.User", MockUserAdmin)
    mocker.patch("simqueue.db.get_project", return_value=mock_projects[0])
    mocker.patch("simqueue.db.create_quota", return_value=new_quota)
    response = client.post(
        f"/projects/{project_id}/quotas/",
        json=new_quota,
        headers={"Authorization": "Bearer notarealtoken"},
    )
    assert response.status_code == 201
    assert simqueue.db.get_project.await_args.args == (UUID(project_id),)
    assert simqueue.db.create_quota.await_args.args == (
        project_id,
        QuotaSubmission(**new_quota),
    )


def test_update_quota(mocker):
    project_id = "b52ebde9-116b-4419-894a-5f330ec3b484"
    update = {"limit": None, "usage": 63.0}

    mocker.patch("simqueue.oauth.User", MockUserAdmin)
    mocker.patch("simqueue.db.get_project", return_value=mock_projects[0])
    mocker.patch("simqueue.db.get_quota", return_value={})
    mocker.patch("simqueue.db.update_quota", return_value={})
    response = client.put(
        f"/projects/{project_id}/quotas/999",
        json=update,
        headers={"Authorization": "Bearer notarealtoken"},
    )
    assert response.status_code == 200
    assert simqueue.db.get_project.await_args.args == (UUID(project_id),)
    assert simqueue.db.get_quota.await_args.args == (999,)
    assert simqueue.db.update_quota.await_args.args == (
        999,
        update,
    )


def test_remove_quota_as_normal_user(mocker):
    mock_quota = {}
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.get_project", return_value=mock_projects[0])
    mocker.patch("simqueue.db.get_quota", return_value=mock_quota)
    mocker.patch("simqueue.db.delete_quota", return_value=None)
    response = client.delete(
        "/projects/b52ebde9-116b-4419-894a-5f330ec3b484/quotas/23",
        headers={"Authorization": "Bearer notarealtoken"},
    )
    assert response.status_code == 403


def test_remove_quota_as_admin_user(mocker):
    mock_quota = {}
    mocker.patch("simqueue.oauth.User", MockUserAdmin)
    mocker.patch("simqueue.db.get_project", return_value=mock_projects[0])
    mocker.patch("simqueue.db.get_quota", return_value=mock_quota)
    mocker.patch("simqueue.db.delete_quota", return_value=None)
    response = client.delete(
        "/projects/b52ebde9-116b-4419-894a-5f330ec3b484/quotas/23",
        headers={"Authorization": "Bearer notarealtoken"},
    )
    assert response.status_code == 200
