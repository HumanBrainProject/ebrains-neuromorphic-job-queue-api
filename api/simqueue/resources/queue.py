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
from .. import db


logger = logging.getLogger("simqueue")

auth = HTTPBearer()
router = APIRouter()


@router.get("/jobs/", response_model=List[Job])
def query_jobs(
    status: JobStatus = Query(None, description="status"),
    tag: List[str] = Query(None, description="tags"),
    project_id: List[UUID] = Query(None, description="project id"),
    user_id: List[str] = Query(None, description="user id"),
    hardware_platform: List[str] = Query(None, description="hardware platform (e.g. SpiNNaker, BrainScales)"),
    date_range_start: date = Query(None, description="jobs submitted after this date"),
    date_range_end: date = Query(None, description="jobs submitted before this date"),
    size: int = Query(100, description="Number of jobs to return"),
    from_index: int = Query(0, description="Index of the first job to return"),
    # from header
    token: HTTPAuthorizationCredentials = Depends(auth),
    # we need to have an independent database session/connection per request,
    # use the same session through all the request and then close it after the request is finished.
    db_session: Session = Depends(db.get_db_session)
):
    """
    Return a list of jobs
    """
    jobs = db.query_jobs(db_session, status, user_id, hardware_platform,
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
    pass


@router.get("/jobs/{job_id}/comments", response_model=List[Comment])
async def get_comments(
    job_id: str = Path(..., title="Job ID", description="ID of the job to be retrieved"),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Return an individual job
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