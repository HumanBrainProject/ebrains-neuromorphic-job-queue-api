from uuid import UUID
import logging
import asyncio

from fastapi import APIRouter, Depends, Query, Path, HTTPException, status as status_codes
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials


from ..data_models import QuotaSubmission
from .. import db, oauth

logger = logging.getLogger("simqueue")

auth = HTTPBearer()
router = APIRouter()


@router.delete("/jobs/{job_id}", status_code=status_codes.HTTP_200_OK)
async def delete_job(
    job_id: int = Path(..., title="Job ID", description="ID of the job to be deleted"),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    If called normally this sets the job status to "removed".
    If called by an admin with "?as_admin=true", the job is completely deleted from the database.
    """

    get_user_task = asyncio.create_task(oauth.User.from_token(token.credentials))
    get_job_task = asyncio.create_task(db.get_job(job_id))
    user = await get_user_task
    job = await get_job_task
    if job is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"Either there is no job with id {job_id}, or you do not have access to it",
        )
    if as_admin and user.is_admin:
        result = await db.delete_job(job_id)
        return result

    access_allowed = job["user_id"] == user.username or await user.can_edit(job["collab_id"])
    if access_allowed:
        result = await db.update_job(job_id, {"status": "removed"})
        return None
    else:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"Either there is no job with id {job_id}, or you do not have access to it",
        )


@router.post("/projects/{project_id}/quotas/", status_code=status_codes.HTTP_201_CREATED)
async def create_quota(
    quota: QuotaSubmission,
    project_id: UUID = Path(
        ...,
        title="Project ID",
        description="ID of the project to which quotas should be added",
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
            detail="Only admins can add quotas",
        )
    await db.create_quota(str(project_id), quota.to_db())
