import logging
import requests
from authlib.integrations.starlette_client import OAuth
import httpx
from httpx import Timeout
from fastapi.security.api_key import APIKeyHeader
from fastapi import Security, HTTPException, status as status_codes

from . import settings, db
from .globals import PRIVATE_SPACE


logger = logging.getLogger("simqueue")

oauth = OAuth()

oauth.register(
    name="ebrains",
    server_metadata_url=f"{settings.EBRAINS_IAM_SERVICE_URL}/.well-known/openid-configuration",
    client_id=settings.EBRAINS_IAM_CLIENT_ID,
    client_secret=settings.EBRAINS_IAM_SECRET,
    userinfo_endpoint=f"{settings.EBRAINS_IAM_SERVICE_URL}/protocol/openid-connect/userinfo",
    client_kwargs={
        "scope": "openid profile collab.drive group team roles email",
        "trust_env": False,
        "timeout": Timeout(timeout=settings.AUTHENTICATION_TIMEOUT),
    },
)


async def get_collab_info(collab, token):
    collab_info_url = f"{settings.EBRAINS_COLLAB_SERVICE_URL}collabs/{collab}"
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(collab_info_url, headers=headers)
    response = res.json()
    if isinstance(response, dict) and "code" in response and response["code"] == 404:
        raise ValueError("Invalid collab id")
    return response


class User:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    @classmethod
    async def from_token(cls, token):
        try:
            user_info = await oauth.ebrains.userinfo(
                token={"access_token": token, "token_type": "bearer"}
            )
        except httpx.HTTPStatusError as err:
            if "401" in str(err):
                if token:
                    message = "Token may have expired"
                else:
                    message = "No token provided"
                raise HTTPException(
                    status_code=status_codes.HTTP_401_UNAUTHORIZED,
                    detail=message,
                )
            else:
                raise
        user_info["token"] = {"access_token": token, "token_type": "bearer"}
        return cls(**user_info)

    def __repr__(self):
        return f"User('{self.username}')"

    @property
    def is_admin(self):
        return self.can_edit("neuromorphic-platform-admin")

    @property
    def username(self):
        return self.preferred_username

    async def can_view(self, collab):
        if collab == f"{PRIVATE_SPACE}-{self.username}":
            return True
        # first of all, check team permissions
        target_team_names = {
            role: f"collab-{collab}-{role}" for role in ("viewer", "editor", "administrator")
        }
        for role, team_name in target_team_names.items():
            if team_name in self.roles.get("team", []):
                return True
        # if that fails, check if it's a public collab
        try:
            collab_info = await get_collab_info(collab, self.token["access_token"])
        except ValueError:
            return False
        else:
            return collab_info.get("isPublic", False)

    def can_edit(self, collab):
        if collab == f"{PRIVATE_SPACE}-{self.username}":
            return True
        target_team_names = {
            role: f"collab-{collab}-{role}" for role in ("editor", "administrator")
        }
        for role, team_name in target_team_names.items():
            if team_name in self.roles.get("team", []):
                return True

    def get_collabs(self, access=["viewer", "editor", "administrator"]):
        collabs = set([f"{PRIVATE_SPACE}-{self.username}"])
        for team_access in self.roles.get("team", []):
            # note, if team information is missing from userinfo that means
            # the user is not a member of any collab
            parts = team_access.split("-")
            assert parts[0] == "collab"
            collab = "-".join(parts[1:-1])
            role = parts[-1]
            if role in access:
                collabs.add(collab)
        return sorted(collabs)


api_key_header_optional = APIKeyHeader(name="x-api-key", auto_error=False)
api_key_header = APIKeyHeader(name="x-api-key", auto_error=True)


async def _get_provider(api_key):
    provider_name = db.get_provider(api_key)
    if provider_name:
        return provider_name
    else:
        raise HTTPException(
            status_code=status_codes.HTTP_403_FORBIDDEN, detail="Could not validate API key"
        )


async def get_provider(api_key: str = Security(api_key_header)):
    return await _get_provider(api_key)


async def get_provider_optional(api_key: str = Security(api_key_header_optional)):
    if api_key:
        return await _get_provider(api_key)
    else:
        return None
