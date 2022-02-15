"""
docstring goes here
"""

"""
   Copyright 2022 CNRS

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
"""

from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.requests import Request
from ..oauth import oauth
from ..settings import BASE_URL

router = APIRouter()
auth = HTTPBearer()


@router.get("/")
def about_this_api():
    return {
        "about": "This is the EBRAINS Neuromorphic Computing Job Queue API.",
        "version": "3",
        "links": {
            "documentation": "/docs"
        }
    }


@router.get("/login")
async def login_via_ebrains(request: Request):
    redirect_uri = BASE_URL + "/auth"
    return await oauth.ebrains.authorize_redirect(request, redirect_uri)


@router.get("/auth")
async def auth_via_ebrains(request: Request):
    token = await oauth.ebrains.authorize_access_token(request)
    user = await oauth.ebrains.parse_id_token(request, token)
    user2 = await oauth.ebrains.userinfo(token=token)
    user.update(user2)
    response = {
        "access_token": token["access_token"],
        "user": {
            "name": user["name"],
            "user_id_v1": user.get("mitreid-sub"),
            "username": user["preferred_username"],
            "given_name": user["given_name"],
            "family_name": user["family_name"]
            # todo: add group info
        },
    }
    full_response = {"token": token, "user": user}
    return full_response
