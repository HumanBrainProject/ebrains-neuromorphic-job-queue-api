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
    Job,
    JobStatus,
    DataSet,
    Comment,
    CommentBody,
    Tag,
    Project,
    ProjectSubmission,
    ProjectUpdate,
    ProjectStatus,
    Quota,
    Session,
    SessionStatus,
)
from ..data_repositories import SourceFileDoesNotExist, SourceFileIsTooBig
from .. import db, oauth, utils
from ..globals import PROVIDER_QUEUE_NAMES

logger = logging.getLogger("simqueue")

auth_optional = HTTPBearer(auto_error=False)
auth = HTTPBearer()
router = APIRouter()


async def _check_auth_for_list(token, api_key, collab, user_id, hardware_platform, as_admin):
    if token:
        user = await oauth.User.from_token(token.credentials)
        if not as_admin:
            if user_id:
                if len(user_id) > 1:
                    raise HTTPException(
                        status_code=status_codes.HTTP_400_BAD_REQUEST,
                        detail="Only admins can directly query other users' jobs or sessions, try querying by collab",
                    )
                elif user_id[0] != user.username:  # todo: also support user_id_v1
                    raise HTTPException(
                        status_code=status_codes.HTTP_403_FORBIDDEN,
                        detail=f"User id provided ({user_id[0]}) does not match authentication token ({user.username})",
                    )
            if collab:
                for cid in collab:
                    if not await user.can_view(cid):
                        raise HTTPException(
                            status_code=status_codes.HTTP_403_FORBIDDEN,
                            detail=f"You do not have permission to view collab {cid}",
                        )
            else:
                user_id = [user.username]
        elif not user.is_admin:
            raise HTTPException(
                status_code=status_codes.HTTP_403_FORBIDDEN,
                detail="The token provided does not give admin privileges",
            )
    elif api_key:
        provider_name = await api_key
        if hardware_platform:
            for hp in hardware_platform:
                utils.check_provider_matches_platform(provider_name, hp)
        else:
            hardware_platform = PROVIDER_QUEUE_NAMES[provider_name]
    else:
        raise HTTPException(
            status_code=status_codes.HTTP_401_UNAUTHORIZED,
            detail="You must provide either a token or an API key",
        )
    return user_id, hardware_platform


@router.get("/")
def about_this_api():
    return {
        "about": "This is the EBRAINS Neuromorphic Computing Job Queue API.",
        "version": "3",
        "links": {"documentation": "/docs"},
    }


@router.get("/jobs/", response_model=List[Job])
async def query_jobs(
    status: List[JobStatus] = Query(None, description="status"),
    tags: List[Tag] = Query(None, description="tags"),
    collab: List[str] = Query(None, description="collab id"),
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
    token: HTTPAuthorizationCredentials = Depends(auth_optional),
    api_key: APIKey = Depends(oauth.get_provider_optional),
):
    """
    Return a list of jobs
    """
    # If the user (from the token) is an admin there are no restrictions on the query
    # If the user is not an admin:
    #   - if user_id is provided, it must contain _only_ the user's id
    #   - if collab is not provided, only the user's own jobs are returned
    #   - if collab is provided the user must be a member of all collabs in the list
    user_id, hardware_platform = await _check_auth_for_list(
        token, api_key, collab, user_id, hardware_platform, as_admin
    )
    jobs = await db.query_jobs(
        status=status,
        tags=tags,
        collab=collab,
        user_id=user_id,
        hardware_platform=hardware_platform,
        date_range_start=date_range_start,
        date_range_end=date_range_end,
        from_index=from_index,
        size=size,
    )

    return [Job.from_db(job) for job in jobs]


@router.get("/jobs/{job_id}", response_model=Job)
async def get_job(
    job_id: int = Path(..., title="Job ID", description="ID of the job to be retrieved"),
    with_comments: bool = Query(False, description="Include comments"),
    with_log: bool = Query(False, description="Include log"),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    token: HTTPAuthorizationCredentials = Depends(auth_optional),
    api_key: APIKey = Depends(oauth.get_provider_optional),
):
    """
    Return an individual job
    """
    if token:
        get_user_task = asyncio.create_task(oauth.User.from_token(token.credentials))
        user = await get_user_task
    elif api_key:
        provider_name = await api_key
    else:
        raise HTTPException(
            status_code=status_codes.HTTP_401_UNAUTHORIZED,
            detail="You must provide either a token or an API key",
        )

    get_job_task = asyncio.create_task(db.get_job(job_id))
    job = await get_job_task
    if job is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"Either there is no job with id {job_id}, or you do not have access to it",
        )

    if token:
        access_allowed = (
            (as_admin and user.is_admin)
            or job["user_id"] == user.username
            or await user.can_view(job["collab_id"])
        )
    else:
        assert api_key is not None
        access_allowed = utils.check_provider_matches_platform(
            provider_name, job["hardware_platform"]
        )

    if access_allowed:
        if with_comments:
            job["comments"] = await db.get_comments(job_id)
        if with_log:
            log = await db.get_log(job_id)
            job["log"] = log
        return Job.from_db(job)

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
        return await db.get_log(job_id)

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
        return [Comment.from_db(comment) for comment in await db.get_comments(job_id)]

    raise HTTPException(
        status_code=status_codes.HTTP_404_NOT_FOUND,
        detail=f"Either there is no job with id {job_id}, or you do not have access to it",
    )


@router.get("/jobs/{job_id}/output_data", response_model=DataSet)
async def get_output_data(
    job_id: int = Path(
        ..., title="Job ID", description="ID of the job whose output data are to be retrieved"
    ),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
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
        job = await db.get_job(job_id)
        # todo: implement a get_data_items() function in `db` module
        return DataSet.from_db(job["output_data"])

    raise HTTPException(
        status_code=status_codes.HTTP_404_NOT_FOUND,
        detail=f"Either there is no job with id {job_id}, or you do not have access to it",
    )


@router.put("/jobs/{job_id}/output_data", response_model=DataSet)
async def update_output_data(
    updated_dataset: DataSet,
    job_id: int = Path(
        ..., title="Job ID", description="ID of the job whose output data are to be retrieved"
    ),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
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
        or await user.can_edit(job["collab_id"])
    ):
        original_dataset = DataSet.from_db(job["output_data"])
        if updated_dataset.repository == original_dataset.repository:
            raise HTTPException(
                status_code=status_codes.HTTP_304_NOT_MODIFIED, detail="No change of repository"
            )

        try:
            return original_dataset.move_to(
                updated_dataset.repository, user, collab=job["collab_id"]
            )
        except ValueError as err:  # requested repository does not exist
            raise HTTPException(
                status_code=status_codes.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(err)
            )
        except SourceFileIsTooBig as err:
            raise HTTPException(status_code=status_codes.HTTP_406_NOT_ACCEPTABLE, detail=str(err))
        except SourceFileDoesNotExist as err:
            raise HTTPException(status_code=status_codes.HTTP_410_GONE, detail=str(err))

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
    if (as_admin and user.is_admin) or user.can_edit(job.collab):
        proceed = await utils.check_quotas(job.collab, job.hardware_platform, user=user.username)
        if proceed:
            accepted_job = await db.create_job(user_id=user.username, job=job.to_db())
            return Job.from_db(accepted_job)
        else:
            raise HTTPException(
                status_code=status_codes.HTTP_403_FORBIDDEN,
                detail="You do not have sufficient compute quota to submit this job",
            )
    raise HTTPException(
        status_code=status_codes.HTTP_404_NOT_FOUND,
        detail="You do not have access to this collab or there is no collab with this id",
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
        return Comment.from_db(
            await db.add_comment(job_id=job_id, user_id=user.username, new_comment=comment.content)
        )

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
        old_comment["user"] == user.username and await user.can_view(job["collab_id"])
    ):
        return Comment.from_db(await db.update_comment(comment_id, comment.content))

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
        old_comment["user"] == user.username and await user.can_view(job["collab_id"])
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
    collab: str = Query(None, description="collab id"),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Return a list of tags used by existing jobs
    """
    user = await oauth.User.from_token(token.credentials)
    if collab and collab not in ("null", "undefined"):
        if not (user.is_admin or user.can_view(collab)):
            raise HTTPException(
                status_code=status_codes.HTTP_404_FORBIDDEN,
                detail=f"Either collab {collab} does not exist, or you do not have access to it",
            )
    elif not user.is_admin:
        raise HTTPException(
            status_code=status_codes.HTTP_403_FORBIDDEN, detail="Please specify a collab"
        )
    return await db.query_tags(collab)


@router.get("/projects/", response_model=List[Project])
async def query_projects(
    status: ProjectStatus = Query(None, description="status"),
    collab: List[str] = Query(None, description="collab id"),
    owner: List[str] = Query(None, description="owner id"),
    # date_range_start: date = Query(None, description="projects which started after this date"),
    # date_range_end: date = Query(None, description="projects which started before this date"),
    size: int = Query(10, description="Number of projects to return"),
    from_index: int = Query(0, description="Index of the first project to return"),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    # from header
    token: HTTPAuthorizationCredentials = Depends(auth_optional),
    api_key: APIKey = Depends(oauth.get_provider_optional),
):
    """
    Return a list of projects
    """
    # If the user (from the token) is an admin there are no restrictions on the query
    # If the user is not an admin:
    #   - if owner is provided, it must contain _only_ the user's id
    #   - if collab is not provided, projects for collabs for which the user has edit access are returned
    #   - if collab is provided, the user must have edit access for all collabs in the list
    if token:
        user = await oauth.User.from_token(token.credentials)
        if not as_admin:
            if owner:
                if len(owner) > 1:
                    raise HTTPException(
                        status_code=status_codes.HTTP_400_BAD_REQUEST,
                        detail="Only admins can directly query projects they don't own, try querying by collab",
                    )
                elif owner[0] != user.username:  # todo: also support user_id_v1
                    raise HTTPException(
                        status_code=status_codes.HTTP_403_FORBIDDEN,
                        detail=f"Owner id provided ({owner[0]}) does not match authentication token ({user.username})",
                    )
            if collab:
                for cid in collab:
                    if not user.can_edit(cid):
                        raise HTTPException(
                            status_code=status_codes.HTTP_403_FORBIDDEN,
                            detail=f"You do not have permission to view collab {cid}",
                        )
            else:
                collab = user.get_collabs(access=["editor", "administrator"])
        elif not user.is_admin:
            raise HTTPException(
                status_code=status_codes.HTTP_403_FORBIDDEN,
                detail="The token provided does not give admin privileges",
            )
    elif api_key:
        provider_name = await api_key
        if provider_name is None:
            raise HTTPException(
                status_code=status_codes.HTTP_403_FORBIDDEN,
                detail=f"Invalid API key",
            )
        if not collab:
            raise HTTPException(
                status_code=status_codes.HTTP_400_BAD_REQUEST,
                detail="If authenticating via API key, a collab must be specified",
            )
        if status and status != ProjectStatus.accepted:
            raise HTTPException(
                status_code=status_codes.HTTP_400_BAD_REQUEST,
                detail="If authenticating via API key, status must be 'accepted'",
            )
        status = ProjectStatus.accepted
    else:
        raise HTTPException(
            status_code=status_codes.HTTP_401_UNAUTHORIZED,
            detail="You must provide either a token or an API key",
        )
    projects = await db.query_projects(
        status=status, collab=collab, owner=owner, from_index=from_index, size=size
    )
    projects_with_quotas = []
    for project in projects:
        quotas = await db.follow_relationships_quotas(project["context"])
        projects_with_quotas.append(Project.from_db(project, quotas))
    return projects_with_quotas


@router.get("/projects/{project_id}", response_model=Project)
async def get_project(
    project_id: UUID = Path(
        ..., title="Project ID", description="ID of the project to be retrieved"
    ),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Return an individual project
    """
    get_user_task = asyncio.create_task(oauth.User.from_token(token.credentials))
    get_project_task = db.get_project(project_id)

    user = await get_user_task
    project = await get_project_task

    if project is not None:
        if (as_admin and user.is_admin) or await user.can_view(project["collab"]):
            quotas = await db.follow_relationships_quotas(project["context"])
            return Project.from_db(project, quotas)
        else:
            raise HTTPException(
                status_code=status_codes.HTTP_403_FORBIDDEN,
                detail="You do not have access to this project",
            )
    else:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"There is no project with id {project_id}",
        )


@router.delete("/projects/{project_id}", status_code=status_codes.HTTP_200_OK)
async def delete_project(
    project_id: UUID = Path(
        ..., title="Project ID", description="ID of the project to be deleted"
    ),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Delete a project and its associated quotas
    """

    get_user_task = asyncio.create_task(oauth.User.from_token(token.credentials))
    get_project_task = db.get_project(project_id)

    user = await get_user_task
    project = await get_project_task

    if project is not None:
        if (as_admin and user.is_admin) or user.can_edit(project["collab"]):
            if await db.query_quotas([project_id]) is not None:
                await db.delete_quotas_from_project(str(project_id))
            await db.delete_project(str(project_id))
        else:
            raise HTTPException(
                status_code=status_codes.HTTP_403_FORBIDDEN,
                detail="You are not allowed to delete this project",
            )
    else:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"There is no project with id {project_id}",
        )


@router.delete("/projects/{project_id}/quotas/{quota_id}", status_code=status_codes.HTTP_200_OK)
async def delete_quota(
    project_id: UUID = Path(
        ...,
        title="Project ID",
        description="ID of the project from which the quota should be removed",
    ),
    quota_id: int = Path(
        ..., title="Quota ID", description="ID of the quota that should be deleted"
    ),
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Delete a quota
    """

    get_user_task = asyncio.create_task(oauth.User.from_token(token.credentials))
    get_project_task = db.get_project(project_id)

    user = await get_user_task
    project = await get_project_task

    if project is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"Either there is no project with id {project_id}, or you do not have access to it",
        )
    if not user.is_admin:
        raise HTTPException(
            status_code=status_codes.HTTP_403_FORBIDDEN,
            detail="You are not allowed to delete quotas from this project",
        )

    if await db.get_quota(quota_id) is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail="There is no quota with this id",
        )

    await db.delete_quota(project_id, id)


@router.post("/projects/", status_code=status_codes.HTTP_201_CREATED)
async def create_project(
    projectRB: ProjectSubmission,
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    # from header
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    get_user_task = asyncio.create_task(oauth.User.from_token(token.credentials))
    user = await get_user_task

    project = projectRB.to_db(owner=user.username)
    if not ((as_admin and user.is_admin) or user.can_edit(project["collab"])):
        raise HTTPException(
            status_code=status_codes.HTTP_403_FORBIDDEN,
            detail="You do not have permisson to create projects in this Collab",
        )
    await db.create_project(project)


@router.get("/projects/{project_id}/quotas/", response_model=List[Quota])
async def query_quotas(
    project_id: UUID = Path(
        ...,
        title="Project ID",
        description="ID of the project whose quotas should be retrieved",
    ),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    size: int = Query(10, description="Number of quotas to return"),
    from_index: int = Query(0, description="Index of the first quota to return"),
    # from header
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Return a list of quotas for a given project
    """
    get_user_task = asyncio.create_task(oauth.User.from_token(token.credentials))
    get_project_task = asyncio.create_task(db.get_project(project_id))
    user = await get_user_task
    project = await get_project_task
    if project is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"There is no project with id {project_id}",
        )
    if not ((as_admin and user.is_admin) or await user.can_view(project["collab"])):
        raise HTTPException(
            status_code=status_codes.HTTP_403_FORBIDDEN,
            detail="You cannot view quotas for this project",
        )
    quotas = await db.query_quotas(project_id=project_id, size=size, from_index=from_index)
    return [Quota.from_db(quota) for quota in quotas]


@router.get("/projects/{project_id}/quotas/{quota_id}", response_model=Quota)
async def get_quota(
    project_id: UUID = Path(
        ...,
        title="Project ID",
        description="ID of the project whose quotas should be retrieved",
    ),
    quota_id: int = Path(
        ..., title="Quota ID", description="ID of the quota thats should be retrieved"
    ),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    size: int = Query(10, description="Number of projects to return"),
    from_index: int = Query(0, description="Index of the first project to return"),
    # from header
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Return a list of quotas for a given project
    """

    get_user_task = asyncio.create_task(oauth.User.from_token(token.credentials))
    get_project_task = asyncio.create_task(db.get_project(project_id))
    user = await get_user_task
    project = await get_project_task
    if project is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"Either there is no project with id {project_id}, or you do not have access to it",
        )
    if not ((as_admin and user.is_admin) or await user.can_view(project["collab"])):
        raise HTTPException(
            status_code=status_codes.HTTP_403_FORBIDDEN,
            detail="You do not have access to this project",
        )

    quota = await db.get_quota(quota_id)
    if quota is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail="There is no quota with this id",
        )
    return Quota.from_db(quota)


@router.get("/collabs/", response_model=List[str])
async def query_collabs(
    status: ProjectStatus = Query(None, description="project status"),
    user_id: List[str] = Query(None, description="user id"),
    size: int = Query(10, description="Number of collabs to return"),
    from_index: int = Query(0, description="Index of the first collab to return"),
    # todo: consider adding an option to filter by projects that have active quotas
    # (accepted, not expired, and remaining quota > 0)
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    # from header
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Return a list of collabs for which the user has edit permissions and a neuromorphic computing project exists
    """
    # If the user (from the token) is an admin there are no restrictions on the query
    # If the user is not an admin:
    #   - if user_id is provided, it must contain _only_ the user's id
    #   - if collab is not provided, projects for collabs for which the user has edit access are returned
    #   - if collab is provided, the user must have edit access for all collabs in the list
    user = await oauth.User.from_token(token.credentials)
    if not as_admin:
        if user_id:
            if len(user_id) > 1:
                raise HTTPException(
                    status_code=status_codes.HTTP_400_BAD_REQUEST,
                    detail="Only admins can run queries for users other than themselves",
                )
            elif user_id[0] != user.username:  # todo: also support user_id_v1
                raise HTTPException(
                    status_code=status_codes.HTTP_403_FORBIDDEN,
                    detail=f"User id provided ({user_id[0]}) does not match authentication token ({user.username})",
                )
        collabs = user.get_collabs(access=["editor", "administrator"])
    elif not user.is_admin:
        raise HTTPException(
            status_code=status_codes.HTTP_403_FORBIDDEN,
            detail="The token provided does not give admin privileges",
        )
    else:
        # todo: if possible, obtain list of collab memberships for the provided user
        raise HTTPException(
            status_code=status_codes.HTTP_501_NOT_IMPLEMENTED,
            detail="This option has not been implemented yet",
        )
    projects = await db.query_projects(
        status=status, collab=collabs, owner=None, from_index=from_index, size=size
    )
    collabs = set(prj["collab"] for prj in projects)
    return sorted(collabs)


@router.put("/projects/{project_id}", status_code=status_codes.HTTP_200_OK)
async def update_project(
    project_update: ProjectUpdate,
    project_id: UUID = Path(
        ..., title="Project ID", description="ID of the project to be retrieved"
    ),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    # from header
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    get_user_task = asyncio.create_task(oauth.User.from_token(token.credentials))
    get_project_task = asyncio.create_task(db.get_project(project_id))
    user = await get_user_task
    original_project = Project.from_db(await get_project_task)

    if original_project is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND, detail="Project Not Found"
        )

    if not ((as_admin and user.is_admin) or user.can_edit(original_project.collab)):
        raise HTTPException(
            status_code=status_codes.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this project.",
        )

    new_status = project_update.status
    if new_status in ("accepted", "rejected"):
        logger.info("Changing status")
        if not (as_admin and user.is_admin):
            raise HTTPException(
                status_code=status_codes.HTTP_403_FORBIDDEN,
                detail="You do not have permission to change the status of this project.",
            )
        current_status = original_project.status
        if new_status == current_status:
            raise HTTPException(status_code=status_codes.HTTP_204_NO_CONTENT, detail="Same Status")
        else:
            await db.update_project(project_id, project_update.to_db())
            status_code = status_codes.HTTP_201_CREATED
            return status_code

    else:
        if original_project is None:
            raise HTTPException(
                status_code=status_codes.HTTP_404_NOT_FOUND, detail="Project Not Found"
            )

        if original_project.submission_date is not None:
            raise HTTPException(
                status_code=status_codes.HTTP_403_FORBIDDEN,
                detail="Can't edit a submitted form.",
            )

        await db.update_project(project_id, project_update.to_db())
        logger.info("Updating project")
        return status_codes.HTTP_201_CREATED


@router.get("/sessions/", response_model=List[Session])
async def query_sessions(
    status: List[SessionStatus] = Query(None, description="status"),
    collab: List[str] = Query(None, description="collab id"),
    user_id: List[str] = Query(None, description="user id"),
    hardware_platform: List[str] = Query(
        None, description="hardware platform (e.g. SpiNNaker, BrainScales)"
    ),
    date_range_start: date = Query(None, description="sessions started after this date"),
    date_range_end: date = Query(None, description="sessions started before this date"),
    size: int = Query(10, description="Number of sessions to return"),
    from_index: int = Query(0, description="Index of the first session to return"),
    as_admin: bool = Query(
        False, description="Run this query with admin privileges, if you have them"
    ),
    # from header
    token: HTTPAuthorizationCredentials = Depends(auth_optional),
    api_key: APIKey = Depends(oauth.get_provider_optional),
):
    """
    Return a list of sessions
    """
    # If the user (from the token) is an admin there are no restrictions on the query
    # If the user is not an admin:
    #   - if user_id is provided, it must contain _only_ the user's id
    #   - if collab is not provided, only the user's own sessions are returned
    #   - if collab is provided the user must be a member of all collabs in the list
    user_id, hardware_platform = await _check_auth_for_list(
        token, api_key, collab, user_id, hardware_platform, as_admin
    )
    sessions = await db.query_sessions(
        status=status,
        collab=collab,
        user_id=user_id,
        hardware_platform=hardware_platform,
        date_range_start=date_range_start,
        date_range_end=date_range_end,
        from_index=from_index,
        size=size,
    )

    return [Session.from_db(session) for session in sessions]
