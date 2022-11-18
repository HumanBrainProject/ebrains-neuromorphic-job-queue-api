from uuid import UUID
from typing import List
from datetime import date
import logging
import asyncio

from fastapi import APIRouter, Depends, Query, Path, HTTPException, status as status_codes
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.security.api_key import APIKey


from ..data_models import (
    SubmittedJob,
    AcceptedJob,
    CompletedJob,
    Job,
    JobStatus,
    JobPatch,
    Comment,
    CommentBody,
    Tag,
)
from .. import db, oauth


logger = logging.getLogger("simqueue")

auth = HTTPBearer()
router = APIRouter()


@router.get("/jobs/", response_model=List[Job])
async def query_jobs(
    status: List[JobStatus] = Query(None, description="status"),
    tag: List[Tag] = Query(None, description="tags"),
    collab_id: List[str] = Query(None, description="collab id"),
    user_id: List[str] = Query(None, description="user id"),
    hardware_platform: List[str] = Query(
        None, description="hardware platform (e.g. SpiNNaker, BrainScales)"
    ),
    date_range_start: date = Query(None, description="jobs submitted after this date"),
    date_range_end: date = Query(None, description="jobs submitted before this date"),
    size: int = Query(10, description="Number of jobs to return"),
    from_index: int = Query(0, description="Index of the first job to return"),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
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
                    detail="Only admins can directly query other users' jobs, try querying by collab_id",
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
                        detail="You do not have permission to view collab {cid}",
                    )
        else:
            user_id = [user.username]
    elif not user.is_admin:
        raise HTTPException(
            status_code=status_codes.HTTP_403_FORBIDDEN,
            detail=f"The token provided does not give admin privileges",
        )
    jobs = await db.query_jobs(
        status,
        collab_id,
        user_id,
        hardware_platform,
        date_range_start,
        date_range_end,
        from_index=from_index,
        size=size,
    )
    return jobs


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


@router.get("/jobs/{job_id}", response_model=Job)
async def get_job(
    job_id: int = Path(..., title="Job ID", description="ID of the job to be retrieved"),
    with_comments: bool = Query(False, description="Include comments"),
    with_log: bool = Query(False, description="Include log"),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Return an individual job
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
    if (
        (as_admin and user.is_admin)
        or job["user_id"] == user.username
        or await user.can_view(job["collab_id"])
    ):
        if with_comments:
            job["comments"] = await db.get_comments(job_id)
        if with_log:
            log = await db.get_log(job_id)
            job["log"] = log
        return job

    raise HTTPException(
        status_code=status_codes.HTTP_404_NOT_FOUND,
        detail=f"Either there is no job with id {job_id}, or you do not have access to it",
    )


@router.get("/jobs/{job_id}/log", response_model=str)
async def get_log(
    job_id: int = Path(
        ..., title="Job ID", description="ID of the job whose log is to be retrieved"
    ),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Return the log for an individual job
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
    if (
        (as_admin and user.is_admin)
        or job["user_id"] == user.username
        or await user.can_view(job["collab_id"])
    ):
        log = await db.get_log(job_id)
        return log["content"]

    raise HTTPException(
        status_code=status_codes.HTTP_404_NOT_FOUND,
        detail=f"Either there is no job with id {job_id}, or you do not have access to it",
    )


@router.get("/jobs/{job_id}/comments", response_model=List[Comment])
async def get_comments(
    job_id: int = Path(
        ..., title="Job ID", description="ID of the job whose comments are to be retrieved"
    ),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Return the comments on an individual job
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
    if (
        (as_admin and user.is_admin)
        or job["user_id"] == user.username
        or await user.can_view(job["collab_id"])
    ):
        return await db.get_comments(job_id)

    raise HTTPException(
        status_code=status_codes.HTTP_404_NOT_FOUND,
        detail=f"Either there is no job with id {job_id}, or you do not have access to it",
    )


@router.post("/jobs/", response_model=AcceptedJob, status_code=status_codes.HTTP_201_CREATED)
async def create_job(
    job: SubmittedJob,
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    token: HTTPAuthorizationCredentials = Depends(auth),
):

    get_user_task = asyncio.create_task(oauth.User.from_token(token.credentials))
    user = await get_user_task
    if (as_admin and user.is_admin) or user.can_edit(job.collab_id):

        accepted_job = await db.create_job(user.username, job)
        return accepted_job
    raise HTTPException(
        status_code=status_codes.HTTP_404_NOT_FOUND,
        detail=f"You do not have access to this collab or there is no collab with this id",
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

    provider_name = api_key
    old_job = await db.get_job(job_id)
    if old_job is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"Either there is no job with id {job_id}, or you do not have access to it",
        )
    # todo: check provider_name matches old_job.platform
    result = await db.update_job(job_id, job)
    return result


@router.delete("/jobs/{job_id}", status_code=status_codes.HTTP_200_OK)
async def delete_job(
    job_id: int = Path(..., title="Job ID", description="ID of the job to be deleted"),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    For use by job handlers to delete job metadata
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
    if (as_admin and user.is_admin) or job["user_id"] == user.username:
        result = await db.delete_job(job_id)
        return result

    raise HTTPException(
        status_code=status_codes.HTTP_404_NOT_FOUND,
        detail=f"Either there is no job with id {job_id}, or you do not have access to it",
    )


@router.post(
    "/jobs/{job_id}/comments/", response_model=Comment, status_code=status_codes.HTTP_201_CREATED
)
async def add_comment(
    comment: CommentBody,
    job_id: int = Path(..., title="Job ID", description="ID of the job being commented on"),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Post a comment
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
    if (
        (as_admin and user.is_admin)
        or job["user_id"] == user.username
        or await user.can_view(job["collab_id"])
    ):
        return await db.add_comment(job_id, user.username, comment.comment)

    raise HTTPException(
        status_code=status_codes.HTTP_404_NOT_FOUND,
        detail=f"Either there is no job with id {job_id}, or you do not have access to it",
    )


# todo: endpoint to get individual comment
# @router.get("/jobs/{job_id}/comments/{comment_id}", response_model=Comment)


@router.put("/jobs/{job_id}/comments/{comment_id}", response_model=Comment)
async def update_comment(
    comment: CommentBody,
    job_id: int = Path(..., title="Job ID", description="ID of the job being commented on"),
    comment_id: int = Path(..., title="Comment ID", description="ID of the comment being edited"),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Edit a comment
    """
    get_comment_task = asyncio.create_task(db.get_comment(comment_id))
    old_comment = await get_comment_task
    job_id = old_comment["job_id"]
    get_user_task = asyncio.create_task(oauth.User.from_token(token.credentials))
    get_job_task = asyncio.create_task(db.get_job(job_id))

    user = await get_user_task
    job = await get_job_task
    if job is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"Either there is no job with id {job_id}, or you do not have access to it",
        )

    if (as_admin and user.is_admin) or (
        old_comment["user_id"] == user.username and await user.can_view(job["collab_id"])
    ):
        return await db.update_comment(comment_id, comment.comment)

    raise HTTPException(
        status_code=status_codes.HTTP_404_NOT_FOUND,
        detail=f"Either there is no comment with id {comment_id}, or you do not have access to it",
    )


@router.delete("/jobs/{job_id}/comments/{comment_id}", status_code=status_codes.HTTP_200_OK)
async def remove_comment(
    job_id: int = Path(..., title="Job ID", description="ID of the job being commented on"),
    comment_id: int = Path(..., title="Comment ID", description="ID of the comment being edited"),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Remove a comment from a job
    """
    get_comment_task = asyncio.create_task(db.get_comment(comment_id))
    old_comment = await get_comment_task
    job_id = old_comment["job_id"]
    get_user_task = asyncio.create_task(oauth.User.from_token(token.credentials))
    get_job_task = asyncio.create_task(db.get_job(job_id))

    user = await get_user_task
    job = await get_job_task
    if job is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"Either there is no job with id {job_id}, or you do not have access to it",
        )

    if (as_admin and user.is_admin) or (
        old_comment["user_id"] == user.username and await user.can_view(job["collab_id"])
    ):
        return await db.delete_comment(comment_id)

    raise HTTPException(
        status_code=status_codes.HTTP_404_NOT_FOUND,
        detail=f"Either there is no comment with id {comment_id}, or you do not have access to it",
    )


@router.get("/jobs/{job_id}/tags/", response_model=List[Tag])
async def get_tags(
    job_id: int = Path(
        ..., title="Job ID", description="ID of the job whose comments are to be retrieved"
    ),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Return the tags on an individual job
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
    if (
        (as_admin and user.is_admin)
        or job["user_id"] == user.username
        or await user.can_view(job["collab_id"])
    ):
        return job["tags"]

    raise HTTPException(
        status_code=status_codes.HTTP_404_NOT_FOUND,
        detail=f"Either there is no job with id {job_id}, or you do not have access to it",
    )


@router.post("/jobs/{job_id}/tags/", response_model=List[Tag])
async def add_tags(
    tags: List[Tag] = None,
    job_id: int = Path(..., title="Job ID", description="ID of the job being commented on"),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Add tags to a job
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

    if (
        (as_admin and user.is_admin)
        or job["user_id"] == user.username
        or user.can_edit(job["collab_id"])
    ):
        if tags is not None:
            return await db.add_tags_to_job(job_id, tags)

    raise HTTPException(
        status_code=status_codes.HTTP_404_NOT_FOUND,
        detail=f"Either there is no job with id {job_id}, or you do not have access to it",
    )


# this is not fully RESTful, maybe use "/jobs/{job_id}/tags/{tag}" for individual tags,
# then this endpoint would remove _all_ tags from a job
@router.delete("/jobs/{job_id}/tags/", status_code=status_codes.HTTP_200_OK)
async def remove_tags(
    tags: List[Tag] = None,
    job_id: int = Path(..., title="Job ID", description="ID of the job to remove tags from"),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Remove tags from a job
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
    if (
        (as_admin and user.is_admin)
        or job["user_id"] == user.username
        or user.can_edit(job["collab_id"])
    ):
        return await db.remove_tags(job_id, tags)

    raise HTTPException(
        status_code=status_codes.HTTP_404_NOT_FOUND,
        detail=f"Either there is no job with id {job_id}, or you do not have access to it",
    )


@router.get("/tags/", response_model=List[Tag])
async def query_tags(
    collab_id: str = Query(None, description="collab id"),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Return a list of tags used by existing jobs
    """
    user = await oauth.User.from_token(token.credentials)
    if collab_id:
        if not (user.is_admin or user.can_view(collab_id)):
            raise HTTPException(
                status_code=status_codes.HTTP_404_FORBIDDEN,
                detail=f"Either collab {collab_id} does not exist, or you do not have access to it",
            )
    elif not user.is_admin:
        raise HTTPException(
            status_code=status_codes.HTTP_403_FORBIDDEN, detail="Please specify a collab_id"
        )
    return await db.query_tags(collab_id)
