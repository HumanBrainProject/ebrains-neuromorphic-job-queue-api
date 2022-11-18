from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.cors import CORSMiddleware

from . import settings
from .resources import for_users, for_providers, for_admins, statistics, auth
from .db import database


description = """
This is a work in progress.

Many of the endpoints work, but not all features have been implemented.

To use the API, <a href="/login" target="_blank">login here</a>, click on "Authorize" then
copy the <i>access_token</i> into the "HTTPBearer" box
(this process will be streamlined for the beta release).
"""

app = FastAPI(
    title="EBRAINS Neuromorphic Computing Job Queue API", description=description, version="3.0"
)


@app.on_event("startup")
async def startup():
    await database.connect()


@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()


app.add_middleware(SessionMiddleware, secret_key=settings.SESSIONS_SECRET_KEY)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(for_users.router, tags=["For all users"])
app.include_router(for_providers.router, tags=["For use by computing system providers"])
app.include_router(for_admins.router, tags=["For use by administrators"])
app.include_router(statistics.router, tags=["Statistics"])
app.include_router(auth.router, tags=["Authentication and authorization"])
