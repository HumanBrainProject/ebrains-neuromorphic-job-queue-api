from curses.ascii import HT
from uuid import UUID
from typing import List
from datetime import date
import logging
import asyncio
from cmd2 import set_default_argument_parser_type

from fastapi import APIRouter, Depends, Query, Path, HTTPException, status as status_codes
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from sqlalchemy.orm import Session

from ..data_models import (
    SubmittedJob, AcceptedJob, CompletedJob, Job, JobStatus, JobPatch,
    Comment, CommentBody
)
from .. import db, oauth


logger = logging.getLogger("simqueue")

auth = HTTPBearer()
router = APIRouter()


@router.get("/jobs/", response_model=List[Job])
async def query_jobs(
    status: JobStatus = Query(None, description="status"),
    tag: List[str] = Query(None, description="tags"),
    collab_id: List[str] = Query(None, description="collab id"),
    user_id: List[str] = Query(None, description="user id"),
    hardware_platform: List[str] = Query(None, description="hardware platform (e.g. SpiNNaker, BrainScales)"),
    date_range_start: date = Query(None, description="jobs submitted after this date"),
    date_range_end: date = Query(None, description="jobs submitted before this date"),
    size: int = Query(100, description="Number of jobs to return"),
    from_index: int = Query(0, description="Index of the first job to return"),
    as_admin: bool = Query(False, description="Run this query with admin privileges, if you have them"),
    # from header
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Return a list of jobs
    """
    # If the user (from the token) is an admin there are no restrictions on the query
    # If the user is not an admin:
    #   - if user_id is provided, it must contain _only_ the user's id
    #   - if collab_id is not provided, only the user's own jobs are returned
    #   - if collab_id is provided the user must be a member of all collabs in the list
    user = await oauth.User.from_token(token.credentials)
    if not as_admin:
        if user_id:
            if len(user_id) > 1:
                raise HTTPException(
                    status_code=status_codes.HTTP_400_BAD_REQUEST,
                    detail="Only admins can directly query other users' jobs, try querying by collab_id"
                )
            elif user_id[0] != user.username:  # todo: also support user_id_v1
                raise HTTPException(
                    status_code=status_codes.HTTP_403_FORBIDDEN,
                    detail=f"User id provided ({user_id[0]}) does not match authentication token ({user.username})",
                )
        if collab_id:
            for cid in collab_id:
                if not await user.can_view(cid):
                    raise HTTPException(
                        status_code=status_codes.HTTP_403_FORBIDDEN,
                        detail="You do not have permission to view collab {cid}"
                    )
        else:
            user_id = [user.username]
    elif not user.is_admin:
        raise HTTPException(
            status_code=status_codes.HTTP_403_FORBIDDEN,
            detail=f"The token provided does not give admin privileges"
        )
    jobs = await db.query_jobs(status, collab_id, user_id, hardware_platform,
                               date_range_start, date_range_end, from_index, size)
    return jobs


@router.get("/jobs/{job_id}", response_model=Job)
async def get_job(
    job_id: int = Path(..., title="Job ID", description="ID of the job to be retrieved"),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Return an individual job
    """
    get_user_task = asyncio.create_task(oauth.User.from_token(token.credentials))
    get_job_task = asyncio.create_task(db.get_job(job_id))
    user = await get_user_task
    job = await get_job_task
    if job["user_id"] == user.username or await user.can_view(job["collab_id"]):
        return job
    raise HTTPException(
        status_code=status_codes.HTTP_404_NOT_FOUND,
        detail=f"Either there is no job with id {job_id}, or you do not have access to it"
    )


@router.get("/jobs/{job_id}/comments", response_model=List[Comment])
async def get_comments(
    job_id: str = Path(..., title="Job ID", description="ID of the job to be retrieved"),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Return the comments on an individual job
    """
    pass


@router.post("/jobs/", response_model=AcceptedJob, status_code=status_codes.HTTP_201_CREATED)
async def create_job(
    job: SubmittedJob,
    token: HTTPAuthorizationCredentials = Depends(auth)
):
    pass


@router.put("/jobs/{job_id}", status_code=status_codes.HTTP_200_OK)
async def update_job(
    job: JobPatch,
    job_id: str = Path(..., title="Job ID", description="ID of the job to be retrieved"),
    token: HTTPAuthorizationCredentials = Depends(auth)
):
    """
    For use by job handlers to update job metadata
    """
    pass


@router.delete("/jobs/{job_id}", status_code=status_codes.HTTP_200_OK)
async def delete_job(
    job_id: str = Path(..., title="Job ID", description="ID of the job to be deleted"),
    token: HTTPAuthorizationCredentials = Depends(auth)
):
    """

    """
    pass


@router.post("/jobs/{job_id}/comments/", response_model=Comment)
async def add_comment(
    comment: CommentBody,
    job_id: str = Path(..., title="Job ID", description="ID of the job being commented on"),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Return an individual job
    """
    pass


# todo: add endpoint for editing comments

# todo: add endpoint for adding and removing tags