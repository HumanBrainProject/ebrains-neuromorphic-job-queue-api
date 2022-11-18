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

from datetime import datetime
from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.requests import Request
from ..oauth import oauth
from ..settings import BASE_URL

router = APIRouter()
auth = HTTPBearer()


@router.get("/login")
async def login_via_ebrains(request: Request):
    redirect_uri = BASE_URL + "/auth"
    return await oauth.ebrains.authorize_redirect(request, redirect_uri)


@router.get("/auth")
async def auth_via_ebrains(request: Request):
    token = await oauth.ebrains.authorize_access_token(request)
    user = token["userinfo"]
    user2 = await oauth.ebrains.userinfo(token=token)
    user.update(user2)
    response = {
        "access_token": token["access_token"],
        "token_expires": datetime.fromtimestamp(token["expires_at"]),
        "user": {
            "name": user["name"],
            "user_id_v1": user.get("mitreid-sub"),
            "username": user["preferred_username"],
            "given_name": user["given_name"],
            "family_name": user["family_name"],
            "team": user["roles"]["team"],
            "group": user["roles"]["group"],
        },
    }
    return response
