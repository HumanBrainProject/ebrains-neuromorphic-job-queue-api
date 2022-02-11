from uuid import UUID
from typing import List
from datetime import date
import logging

from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
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
    # user = await oauth.User.from_token(token.credentials)
    # if not user.is_admin:
    #     if user_id and user_id != user.username:  # todo: also support user_id_v1
    #         raise HTTPException(
    #             status_code=status.HTTP_403_FORBIDDEN,
    #             detail="User id provided does not match authentication token",
    #         )
    #     if collab_id:
    #         for cid in collab_id:
    #             if not user.can_view(cid):
    #                 raise HTTPException(
    #                     status_code=status.HTTP_403_FORBIDDEN,
    #                     detail="You do not have permission to view collab {cid}"
    #                 )
    #     else:
    #         user_id = [user.username]
    jobs = await db.query_jobs(status, collab_id, user_id, hardware_platform,
                               date_range_start, date_range_end, from_index, size)
    return jobs


@router.get("/jobs/{job_id}", response_model=Job)
async def get_job(
    job_id: str = Path(..., title="Job ID", description="ID of the job to be retrieved"),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Return an individual job
    """
    job = db.get_job(job_id)


@router.get("/jobs/{job_id}/comments", response_model=List[Comment])
async def get_comments(
    job_id: str = Path(..., title="Job ID", description="ID of the job to be retrieved"),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Return the comments on an individual job
    """
    pass


@router.post("/jobs/", response_model=AcceptedJob, status_code=status.HTTP_201_CREATED)
async def create_job(
    job: SubmittedJob,
    token: HTTPAuthorizationCredentials = Depends(auth)
):
    pass


@router.put("/jobs/{job_id}", status_code=status.HTTP_200_OK)
async def update_job(
    job: JobPatch,
    job_id: str = Path(..., title="Job ID", description="ID of the job to be retrieved"),
    token: HTTPAuthorizationCredentials = Depends(auth)
):
    """
    For use by job handlers to update job metadata
    """
    pass


@router.delete("/jobs/{job_id}", status_code=status.HTTP_200_OK)
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