from uuid import UUID
from typing import List
import logging
import asyncio

from fastapi import APIRouter, Depends, Query, Path, HTTPException, status as status_codes
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.security.api_key import APIKey


from ..data_models import (
    Job,
    JobPatch,
    Project,
    Quota,
    QuotaUpdate,
)
from .. import db, oauth

logger = logging.getLogger("simqueue")

auth = HTTPBearer()
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
    # todo: check api_key matches hardware_platform
    provider_name = await api_key
    job = await db.get_next_job(hardware_platform)
    if job:
        # raise NotImplementedError("todo: take the job off the queue")
        return job
    else:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"No queued job for {hardware_platform}",
        )


@router.put("/jobs/{job_id}", status_code=status_codes.HTTP_200_OK)
async def update_job(
    job: JobPatch,
    job_id: int = Path(..., title="Job ID", description="ID of the job to be retrieved"),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
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
    # todo: check provider_name matches old_job.platform
    result = await db.update_job(job_id, job)
    return result


def to_dictQ(quota):

    data = {}
    for field in ("units", "limit", "usage", "platform"):
        if getattr(quota, field, None) is not None:
            data[field] = getattr(quota, field)

    return data


@router.put("/projects/{project_id}/quotas/{quota_id}", status_code=status_codes.HTTP_200_OK)
async def update_quota(
    quota: QuotaUpdate,
    quota_id: int,
    project_id: UUID = Path(
        ...,
        title="Project ID",
        description="ID of the project whose quotas should be added",
    ),
    # from header
    token: HTTPAuthorizationCredentials = Depends(auth),
):

    get_user_task = asyncio.create_task(oauth.User.from_token(token.credentials))
    get_project_task = asyncio.create_task(db.get_project(project_id))
    user = await get_user_task
    project = await get_project_task
    if project is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"Either there is no project with id {project_id}, or you do not have access to it",
        )

    if not user.is_admin:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"Only admins can update quotas",
        )

    quota_old = await db.get_quota(quota_id)

    if quota_old is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"There is no Quota with this id",
        )

    content = to_dictQ(quota)
    # perhaps `to_dictQ` should compare `quota` and `quota_old`.
    # If there are no changes we could avoid doing the database update.
    if content is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND, detail=f"No content to change"
        )

    await db.update_quota(quota_id, content)
