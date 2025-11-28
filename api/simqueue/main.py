import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.cors import CORSMiddleware

from . import settings
from .resources import for_users, for_providers, for_admins, statistics, auth
from .db import database


description = """
The EBRAINS neuromorphic computing remote access service allows users to run simulations/emulations
on the [SpiNNaker](https://www.ebrains.eu/tools/spinnaker)
and [BrainScaleS](https://www.ebrains.eu/tools/brainscales) systems
by submitting a [PyNN](http://neuralensemble.org/docs/PyNN/) script
and associated job configuration information to a central queue.

The system consists of:
- a web API (this service) [[Source code](https://github.com/HumanBrainProject/hbp_neuromorphic_platform)]
- a GUI client (the [Job Manager app](https://job-manager.hbpneuromorphic.eu/))
- a [Python/command-line client](https://github.com/HumanBrainProject/hbp-neuromorphic-client).

Users can submit scripts stored locally on their own machine, in a public Git repository,
in the [EBRAINS Knowledge Graph](https://search.kg.ebrains.eu/?category=Model),
or in [EBRAINS Collaboratory](https://wiki.ebrains.eu/) storage (Drive/Bucket).
Users can track the progress of their job, and view and/or download the results,
log files, and provenance information.

To use the API, <a href="/login" target="_blank">login here</a>, click on "Authorize" then
copy the *access_token* into the "HTTPBearer" box
(this process will be streamlined for the final release).

For more information, visit the [EBRAINS website](https://www.ebrains.eu/modelling-simulation-and-computing/simulation/neuromorphic-computing-3).

This service was developed in the Human Brain Project,
funded from the European Union’s Horizon 2020 Framework Programme for Research and Innovation
under Specific Grant Agreements No. 720270, No. 785907 and No. 945539
(Human Brain Project SGA1, SGA2 and SGA3).
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Before the application starts, connect to the database
    await database.connect()
    yield
    # When the application shuts down, disconnect from the database
    await database.disconnect()


service_status = getattr(settings, "SERVICE_STATUS", "ok")
if service_status != "ok":
    warning_message = f"---\n> ⚠️ **_NOTE:_**  _{service_status}_\n---\n\n"
    description = warning_message + description


app = FastAPI(
    title="EBRAINS Neuromorphic Computing Job Queue API",
    description=description,
    version="3.0",
    lifespan=lifespan,
)

app.add_middleware(SessionMiddleware, secret_key=settings.SESSIONS_SECRET_KEY)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def check_service_status(request: Request, call_next):
    if request.url.path != "/" and (
        "down" in service_status
        or ("read-only" in service_status and request.method in ("POST", "PUT", "PATCH"))
    ):
        return JSONResponse(
            status_code=503,
            content={"error": service_status},
        )
    response = await call_next(request)
    return response


app.include_router(for_users.router, tags=["For all users"])
app.include_router(for_providers.router, tags=["For use by computing system providers"])
app.include_router(for_admins.router, tags=["For use by administrators"])
app.include_router(statistics.router, tags=["Statistics"])
app.include_router(auth.router, tags=["Authentication and authorization"])

this_dir = os.path.dirname(__file__)
dashboard_path = os.path.join(this_dir, "..", "dashboard")
app.mount("/dashboard", StaticFiles(directory=dashboard_path, html=True), name="dashboard")
