
from uuid import uuid4
from uuid import UUID


from simqueue.main import app
from simqueue.oauth import User
from simqueue.data_models import ProjectStatus
import simqueue.db
import json

import pytest
import pytest_asyncio

from fastapi.encoders import jsonable_encoder
from simqueue.db import database
from async_asgi_testclient import TestClient





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


class MockUserPub(User):

    @classmethod
    async def from_token(cls, token):
        user_data = {
            "preferred_username": "roldlloyd",
            "roles": {
               "group": [
                   "comic-film-actors-from-the-silent-era"
               ],
               "team": [
                   "collab-some-other-collab-viewer",
                  
                 
               ]
        }
        }
        return cls(**user_data)




mock_projects = [
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


@pytest.mark.asyncio 
async def test_query_projects_no_auth():
    async with TestClient(app) as ac:
      response = await ac.get("/projects/")
      assert response.status_code == 403


@pytest.mark.asyncio 
async def test_query_projects(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.query_projects", return_value=mock_projects)
    async with TestClient(app) as ac:
       response = await ac.get("/projects/",
                          headers={"Authorization": "Bearer notarealtoken"})
       assert response.status_code == 200

       status = None
       collab_id = ['neuromorphic-platform-admin', 'neuromorphic-testing-private'] # user can_edit
       owner_id = None
       from_index = 0
       size = 10
       expected_args = (status, collab_id, owner_id, from_index, size)
       assert simqueue.db.query_projects.await_args.args == expected_args

@pytest.mark.asyncio 
async def test_query_projects_with_valid_filters(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.query_projects", return_value=mock_projects)
    async with TestClient(app) as ac:
        response = await ac.get(
        "/projects/?size=10&from_index=0&as_admin=false",
        headers={"Authorization": "Bearer notarealtoken"}
        )
        assert response.status_code == 200

        status = None
        collab_id =['neuromorphic-platform-admin', 'neuromorphic-testing-private']
        owner_id = None
        from_index = 0
        size = 10
    
        expected_args = (status, collab_id, owner_id,from_index,  size )
        assert simqueue.db.query_projects.await_args.args == expected_args

@pytest.mark.asyncio
async def test_query_collabs(mocker):
    mocker.patch("simqueue.oauth.User", MockUser)
    mocker.patch("simqueue.db.query_projects", return_value=mock_projects)
    async with TestClient(app) as ac:
        response = await ac.get("/collabs/",
                          headers={"Authorization": "Bearer notarealtoken"})
                          
        assert response.status_code == 200

        status = None
        collab_id =['neuromorphic-platform-admin', 'neuromorphic-testing-private']
        owner_id = None
        from_index = 0
        size = 10
        expected_args = (status, collab_id)
        assert simqueue.db.query_projects.await_args.args == expected_args
   
  
  
@pytest.mark.asyncio 
async def test_get_project(mocker):
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
    async with TestClient(app) as ac:
        response = await ac.get("/projects/b52ebde9-116b-4419-894a-5f330ec3b484?as_admin=false",
                          headers={"Authorization": "Bearer notarealtoken"})
        assert response.status_code == 200
        project_id = UUID('b52ebde9-116b-4419-894a-5f330ec3b484')
    
    
        expected_args = (project_id,)
        assert simqueue.db.get_project.await_args.args == expected_args
    
    
@pytest.mark.asyncio 
async def test_create_item_asmember(mocker): 
           mocker.patch("simqueue.oauth.User", MockUser)
           datap = {
                   "collab": "neuromorphic-testing-private",
                   "title": "testing Collaboratory v2 integration",
                   "abstract": "abstract goes here",
                   "description": "dddddd",
                   
                   }
           mocker.patch("simqueue.db.post_project")
          
           json_compatible_item_data = jsonable_encoder(datap)           
          
           async with TestClient(app) as ac:
                response = await ac.post(
                "/projects/?as_admin=false", 
              
                headers={"accept": "application/json","Authorization": "Bearer notarealtoken", "Content-Type": "application/json"},
                json= json_compatible_item_data
                
                )
          
                assert response.status_code == 201
          
          
@pytest.mark.asyncio        
async def test_create_item_asNon_member(mocker): 
           mocker.patch("simqueue.oauth.User", MockUserPub)
           datap = {
                   "collab": "neuromorphic-testing-private",
                   "title": "testing Collaboratory v2 integration",
                   "abstract": "abstract goes here",
                   "description": "dddddd",
                   
           }
           
           mocker.patch("simqueue.db.post_project")
          
          

           json_compatible_item_data = jsonable_encoder(datap)           
           y = json.dumps(datap)
           json_compatible_item_data = jsonable_encoder(datap)
           
           async with TestClient(app) as ac:
                response = await ac.post(
                "/projects/?as_admin=false", 
              
                headers={"accept": "application/json","Authorization": "Bearer notarealtoken", "Content-Type": "application/json"},
                json= json_compatible_item_data)
                
                assert response.status_code == 403
          
           
@pytest.mark.asyncio 
async def test_update_item(mocker): 
           mocker.patch("simqueue.oauth.User", MockUser)
           data = {
                   "collab": "neuromorphic-testing-private",
                   "title": "testing Collaboratory v2 integration",
                   "abstract": "abstract goes here",
                   "description": "dddddd",
                   
                   "duration": 0,
                   "status": "in preparation",
                   "submited": False
                
                   }
           mocker.patch("simqueue.db.put_project")
         
           

           json_compatible_item_data = jsonable_encoder(data)
           async with TestClient(app) as ac:
                response = await ac.put(
                "/projects/fe326dcc-5aaf-11ed-937f-89eb17b89281?as_admin=false",
              
                headers={"accept": "application/json","Authorization": "Bearer notarealtoken", "Content-Type": "application/json"},
                json = json_compatible_item_data
                
                )
          
                assert response.status_code == 200
          
   

           
@pytest.mark.asyncio
async def test_only_admins_can_edit_accepted_rejected_projects(mocker): 
           mocker.patch("simqueue.oauth.User", MockUser)
           data = {
                   "collab": "neuromorphic-testing-private",
                   "title": "fff lorem ipsum lorme ipsum",
                   "abstract": "lorem ipsum vvvvv fff",
                   "description": "lorem ipsum",
                   
                   "duration": 0,
                   "status": "accepted",
                   "submitted": True
                
                   }
           mocker.patch("simqueue.db.put_project")
         
   

           json_compatible_item_data = jsonable_encoder(data)
           async with TestClient(app) as ac:
                response = await ac.put(
                "/projects/ff4e494f-6f44-47c6-9a85-7091ff788b17?as_admin=false",
              
                headers={"accept": "application/json","Authorization": "Bearer notarealtoken", "Content-Type": "application/json"},
                json = json_compatible_item_data
                
                )
          
                assert response.status_code == 403
           
@pytest.mark.asyncio
async def test_editing_forbidden_after_submission(mocker): 
           mocker.patch("simqueue.oauth.User", MockUser)
           data = {
                   "collab": "neuromorphic-testing-private",
                   "title": "testing Collaboratory v2 integration",
                   "abstract": "abstract goes here lorem ipsum",
                   "description": "lorem ipsum lorem ipsum testing private  lorem ipsum idadad lorem ipsummmm",
                   
                   "duration": 0,
                   "status": "under review",
                   "submitted": True
                
                   }
           mocker.patch("simqueue.db.put_project")
         
   

           json_compatible_item_data = jsonable_encoder(data)
           async with TestClient(app) as ac:
                response = await ac.put(
                "/projects/6709066e-90f8-4d81-b9f4-503b18f2452a?as_admin=false",
              
                headers={"accept": "application/json","Authorization": "Bearer notarealtoken", "Content-Type": "application/json"},
                json = json_compatible_item_data
                
                )
          
                assert response.status_code == 403
        
