import logging
import requests
from authlib.integrations.starlette_client import OAuth
from fastapi.security.api_key import APIKeyHeader
from fastapi import Security, HTTPException, status as status_codes

from . import settings, db


logger = logging.getLogger("simqueue")

oauth = OAuth()

oauth.register(
    name="ebrains",
    server_metadata_url=settings.EBRAINS_IAM_CONF_URL,
    client_id=settings.EBRAINS_IAM_CLIENT_ID,
    client_secret=settings.EBRAINS_IAM_SECRET,
    userinfo_endpoint=f"{settings.HBP_IDENTITY_SERVICE_URL}/userinfo",
    client_kwargs={
        "scope": "openid profile collab.drive clb.drive:read clb.drive:write group team web-origins roles email",
        "trust_env": False,
    },
)


async def get_collab_info(collab, token):
    collab_info_url = f"{settings.HBP_COLLAB_SERVICE_URL}collabs/{collab}"
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
        user_info = await oauth.ebrains.userinfo(
            token={"access_token": token, "token_type": "bearer"}
        )
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
        # first of all, check team permissions
        target_team_names = {
            role: f"collab-{collab}-{role}" for role in ("viewer", "editor", "administrator")
        }
        for role, team_name in target_team_names.items():
            if team_name in self.roles["team"]:
                return True
        # if that fails, check if it's a public collab
        try:
            collab_info = await get_collab_info(collab, self.token["access_token"])
        except ValueError:
            return False
        else:
            return collab_info.get("isPublic", False)

    def can_edit(self, collab):
        target_team_names = {
            role: f"collab-{collab}-{role}" for role in ("editor", "administrator")
        }
        for role, team_name in target_team_names.items():
            if team_name in self.roles["team"]:
                return True

    def get_collabs(self, access=["viewer", "editor", "administrator"]):
        collabs = set()
        for team_access in self.roles["team"]:
            parts = team_access.split("-")
            assert parts[0] == "collab"
            collab = "-".join(parts[1:-1])
            role = parts[-1]
            if role in access:
                collabs.add(collab)
        return sorted(collabs)


api_key_header = APIKeyHeader(name="x-api-key", auto_error=False)


async def get_provider(api_key: str = Security(api_key_header)):
    provider_name = db.get_provider(api_key)
    if provider_name:
        return provider_name
    else:
        raise HTTPException(
            status_code=status_codes.HTTP_403_FORBIDDEN, detail="Could not validate API key"
        )
