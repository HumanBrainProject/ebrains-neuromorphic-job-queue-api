from uuid import UUID
import logging
import asyncio

from fastapi import APIRouter, Depends, Path, Request, HTTPException, status as status_codes
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.security.api_key import APIKey


from ..data_models import (
    Job,
    JobPatch,
    QuotaUpdate,
    Session,
    SessionUpdate,
    SessionCreation,
    SessionStatus,
)
from ..globals import PROVIDER_QUEUE_NAMES
from .. import db, oauth, utils

logger = logging.getLogger("simqueue")

auth = HTTPBearer(auto_error=False)
router = APIRouter()


@router.get("/jobs/next/{hardware_platform}", response_model=Job)
async def get_next_job(
    hardware_platform: str = Path(
        ...,
        title="Hardware Platform",
        description="hardware platform (e.g. SpiNNaker, BrainScales)",
    ),
    api_key: APIKey = Depends(oauth.get_provider),
):
    provider_name = await api_key
    utils.check_provider_matches_platform(provider_name, hardware_platform)
    job = await db.get_next_job(hardware_platform)
    if job:
        # raise NotImplementedError("todo: take the job off the queue")
        return Job.from_db(job)
    else:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"No queued job for {hardware_platform}",
        )


@router.put("/jobs/{job_id}", status_code=status_codes.HTTP_200_OK)
async def update_job(
    job_update: JobPatch,
    job_id: int = Path(..., title="Job ID", description="ID of the job to be retrieved"),
    api_key: APIKey = Depends(oauth.get_provider),
):
    """
    For use by job handlers to update job metadata
    """

    provider_name = await api_key
    old_job = await db.get_job(job_id)
    if old_job is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"Either there is no job with id {job_id}, or you do not have access to it",
        )
    utils.check_provider_matches_platform(provider_name, old_job["hardware_platform"])
    result = await db.update_job(job_id, job_update.to_db())
    if job_update.resource_usage:
        await utils.update_quotas(
            old_job["collab_id"], old_job["hardware_platform"], job_update.resource_usage
        )
    return result


@router.put("/jobs/{job_id}/log", status_code=status_codes.HTTP_200_OK)
async def replace_log(
    request: Request,
    job_id: int = Path(
        ..., title="Job ID", description="ID of the job whose log should be updated"
    ),
    api_key: APIKey = Depends(oauth.get_provider),
):
    """
    For use by job handlers to update job logs by replacing the existing content.
    This is available as a separate endpoint since logs can be very large,
    and so might need separate error handling.
    """

    provider_name = await api_key
    job = await db.get_job(job_id)
    if job is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"Either there is no job with id {job_id}, or you do not have access to it",
        )
    utils.check_provider_matches_platform(provider_name, job["hardware_platform"])
    log_update = await request.body()
    result = await db.update_log(job_id, log_update.decode("utf-8"), append=False)
    return result


@router.patch("/jobs/{job_id}/log", status_code=status_codes.HTTP_200_OK)
async def append_to_log(
    request: Request,
    job_id: int = Path(
        ..., title="Job ID", description="ID of the job whose log should be updated"
    ),
    api_key: APIKey = Depends(oauth.get_provider),
):
    """
    For use by job handlers to update job logs by appending to the existing content.
    This is available as a separate endpoint since logs can be very large,
    and so might need separate error handling.
    """

    provider_name = await api_key
    job = await db.get_job(job_id)
    if job is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"Either there is no job with id {job_id}, or you do not have access to it",
        )
    utils.check_provider_matches_platform(provider_name, job["hardware_platform"])
    log_update = await request.body()
    result = await db.update_log(job_id, log_update.decode("utf-8"), append=True)
    return result


@router.put("/projects/{project_id}/quotas/{quota_id}", status_code=status_codes.HTTP_200_OK)
async def update_quota(
    quota_update: QuotaUpdate,
    quota_id: int,
    project_id: UUID = Path(
        ...,
        title="Project ID",
        description="ID of the project whose quotas should be added",
    ),
    # from header
    token: HTTPAuthorizationCredentials = Depends(auth),
    api_key: APIKey = Depends(oauth.get_provider_optional),
):
    get_project_task = asyncio.create_task(db.get_project(project_id))
    project = await get_project_task
    if project is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"Either there is no project with id {project_id}, or you do not have access to it",
        )

    if token:
        get_user_task = asyncio.create_task(oauth.User.from_token(token.credentials))
        user = await get_user_task
        if not user.is_admin:
            raise HTTPException(
                status_code=status_codes.HTTP_404_NOT_FOUND,
                detail="Only admins can update quotas",
            )
    elif api_key:
        pass
    else:
        raise HTTPException(
            status_code=status_codes.HTTP_401_UNAUTHORIZED,
            detail="You must provide either a token or an API key",
        )

    quota_old = await db.get_quota(quota_id)

    if quota_old is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail="There is no Quota with this id",
        )

    if api_key:
        provider_name = await api_key
        utils.check_provider_matches_platform(provider_name, quota_old["platform"])

    # perhaps should compare `quota` and `quota_old`.
    # If there are no changes we could avoid doing the database update.
    if quota_update is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND, detail="No content to change"
        )

    await db.update_quota(quota_id, quota_update.to_db())


@router.post("/sessions/", response_model=Session, status_code=status_codes.HTTP_201_CREATED)
async def start_session(
    session: SessionCreation,
    api_key: APIKey = Depends(oauth.get_provider),
):
    provider_name = await api_key
    utils.check_provider_matches_platform(provider_name, session.hardware_platform)
    proceed = await utils.check_quotas(
        session.collab, session.hardware_platform, user=session.user_id
    )
    if proceed:
        new_session = await db.create_session(session=session.to_db())
        return Session.from_db(new_session)
    else:
        raise HTTPException(
            status_code=status_codes.HTTP_403_FORBIDDEN,
            detail="The user does not have sufficient compute quota to start this session",
        )


@router.put("/sessions/{session_id}", status_code=status_codes.HTTP_200_OK)
async def update_session(
    session_update: SessionUpdate,
    session_id: int = Path(
        ..., title="session ID", description="ID of the session to be retrieved"
    ),
    api_key: APIKey = Depends(oauth.get_provider),
):
    """
    For use by computing system providers to update session metadata
    """

    provider_name = await api_key
    old_session = await db.get_session(session_id)
    if old_session is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"Either there is no session with id {session_id}, or you do not have access to it",
        )
    utils.check_provider_matches_platform(provider_name, old_session["hardware_platform"])
    # todo: update quotas
    if session_update.status in (SessionStatus.finished, SessionStatus.error):
        await utils.update_quotas(
            old_session["collab_id"],
            old_session["hardware_platform"],
            session_update.resource_usage,
        )

    result = await db.update_session(session_id, session_update.to_db())
