from datetime import date
from uuid import uuid4
from uuid import UUID
from fastapi.testclient import TestClient
from simqueue.main import app
from simqueue.oauth import User
from simqueue.data_models import ProjectStatus
import simqueue.db
import json
import pytz
import pytest
import pytest_asyncio
from fastapi.encoders import jsonable_encoder
from simqueue.db import database


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
mock_createproject = [
    {
    
    
        "id": uuid4(),
    
        "collab": "neuromorphic-testing-private",
        "title": "testing Collaboratory v2 integration",
        "abstract": "abstract goes here",
        "description": "dddddd",
        
        "owner": "haroldlloyd",
        "duration": 0,
        "start_date": None,
        "accepted": True, 
        "submission_date": None,
        "decision_date": None
       
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
  
  
def test_get_project(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    
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
                "decision_date": "2021-01-05"
           }
           
    mocker.patch("simqueue.db.get_project", return_value=data) 
    response = client.get("/projects/b52ebde9-116b-4419-894a-5f330ec3b484?as_admin=false",
                          headers={"Authorization": "Bearer notarealtoken"})
    assert response.status_code == 200
    project_id = UUID('b52ebde9-116b-4419-894a-5f330ec3b484')
    
    
    expected_args = (project_id,)
    assert simqueue.db.get_project.await_args.args == expected_args
def test_create_item(mocker): 
           mocker.patch("simqueue.oauth.User", MockUser)
           data = {
                "id": uuid4(),
                "collab": "neuromorphic-testing-private",
                "title": "testing Collaboratory v2 integration",
                "abstract": "abstract goes here",
                "description": "dddddd",
                "owner": "haroldlloyd",
                "duration": 0,
        
                "accepted": True
           }
           mocker.patch("simqueue.db.post_project", return_value= data)
          
   

           json_compatible_item_data = jsonable_encoder(data)
           response = client.post(
                "/projects/?rcollab=neuromorphic-testing-private&rtitle=testing Collaboratory v2 integration&rabstract=abstract goes here&rdescription=dddddd&rowner=haroldlloyd&rduration=0&raccepted=True",
              
                headers={"Authorization": "Bearer notarealtoken"},
           )
          
           assert response.status_code == 200
           """
           reste à vérifier qu'on doit ou pas mettre response comme dict
           """
def test_update_item(mocker): 
           mocker.patch("simqueue.oauth.User", MockUser)
           data = {
                "collab": "neuromorphic-testing-private",
                "title": "testing Collaboratory v2 integration",
                "abstract": "abstract goes here",
                "description": "dddddd",
                "id": "4948a906-2488-11ed-8c74-e5cdf4879499",
                "owner": "haroldlloyd",
                "duration": 0,
                
                "accepted": True,
                
           }
           mocker.patch("simqueue.db.put_project", return_value= data)
         
   

           json_compatible_item_data = jsonable_encoder(data)
           response = client.put(
                "/projects/4948a906-2488-11ed-8c74-e5cdf4879499?rcollab=neuromorphic-testing-private&rtitle=testing Collaboratory v2 integration&rabstract=abstract goes here&rdescription=dddddd&rowner=haroldlloyd&rduration=0&raccepted=True",
              
                headers={"Authorization": "Bearer notarealtoken"},
           )
          
           assert response.status_code == 200
           """
           reste à vérifier qu'on doit ou pas mettre response comme dict
           """
