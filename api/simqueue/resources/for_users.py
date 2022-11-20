from uuid import UUID
from typing import List
from datetime import date
import logging
import asyncio

from fastapi import APIRouter, Depends, Query, Path, HTTPException, status as status_codes
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from ..data_models import (
    SubmittedJob,
    AcceptedJob,
    Job,
    JobStatus,
    Comment,
    CommentBody,
    Tag,
    Project,
    ProjectSubmission,
    ProjectUpdate,
    ProjectStatus,
    Quota,
    QuotaUpdate,
)
from .. import db, oauth

logger = logging.getLogger("simqueue")

auth = HTTPBearer()
router = APIRouter()


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
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Return a list of jobs
    """
    # If the user (from the token) is an admin there are no restrictions on the query
    # If the user is not an admin:
    #   - if user_id is provided, it must contain _only_ the user's id
    #   - if collab is not provided, only the user's own jobs are returned
    #   - if collab is provided the user must be a member of all collabs in the list
    user = await oauth.User.from_token(token.credentials)
    if not as_admin:
        if user_id:
            if len(user_id) > 1:
                raise HTTPException(
                    status_code=status_codes.HTTP_400_BAD_REQUEST,
                    detail="Only admins can directly query other users' jobs, try querying by collab",
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

    def add_resource_uri(job):
        job["resource_uri"] = f"/jobs/{job['id']}"
        return job

    return [add_resource_uri(job) for job in jobs]


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
        or await user.can_view(job["collab"])
    ):
        if with_comments:
            job["comments"] = await db.get_comments(job_id)
        if with_log:
            log = await db.get_log(job_id)
            job["log"] = log
        job["resource_uri"] = f"/jobs/{job_id}"
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
        or await user.can_view(job["collab"])
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
        or await user.can_view(job["collab"])
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
    if (as_admin and user.is_admin) or user.can_edit(job.collab):

        accepted_job = await db.create_job(user_id=user.username, job=job)
        return accepted_job
    raise HTTPException(
        status_code=status_codes.HTTP_404_NOT_FOUND,
        detail=f"You do not have access to this collab or there is no collab with this id",
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
        or await user.can_view(job["collab"])
    ):
        return await db.add_comment(
            job_id=job_id, user_id=user.username, new_comment=comment.comment
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
        old_comment["user_id"] == user.username and await user.can_view(job["collab"])
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
        old_comment["user_id"] == user.username and await user.can_view(job["collab"])
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
        or await user.can_view(job["collab"])
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
        or user.can_edit(job["collab"])
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
        or user.can_edit(job["collab"])
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
    if collab:
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


def to_dictRequestBody(projectRB: Project):

    data = {}
    for field in ("collab", "title", "abstract", "description", "status", "submitted"):
        if getattr(projectRB, field, None) is not None:
            data[field] = getattr(projectRB, field)

    return data


def to_dictQ(quota):

    data = {}
    for field in ("units", "limit", "usage", "platform"):
        if getattr(quota, field, None) is not None:
            data[field] = getattr(quota, field)

    return data


def to_dictSerial(project: Project, quotas: List[Quota]):

    data = dict(project)
    data["status"] = Project(**project).status()
    data["resource_uri"] = f"/projects/{project['id']}"
    content = []
    for quota in quotas:
        content.append(to_dictSerialQuota(quota, project))
    data["quotas"] = content
    return data


def to_dictSerialQuota(quota: Quota, project: Project):
    data = {}
    data["id"] = quota["id"]
    data["limit"] = quota["limit"]
    data["platform"] = quota["platform"]
    data["project_id"] = quota["project_id"]
    data["resource_uri"] = f"/projects/{project['id']}/quotas/{quota['id']}"
    data["units"] = quota["units"]
    data["usage"] = quota["usage"]
    return data


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
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Return a list of projects
    """
    # If the user (from the token) is an admin there are no restrictions on the query
    # If the user is not an admin:
    #   - if owner is provided, it must contain _only_ the user's id
    #   - if collab is not provided, projects for collabs for which the user has edit access are returned
    #   - if collab is provided, the user must have edit access for all collabs in the list
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
                        detail="You do not have permission to view collab {cid}",
                    )
        else:
            collab = user.get_collabs(access=["editor", "administrator"])
    elif not user.is_admin:
        raise HTTPException(
            status_code=status_codes.HTTP_403_FORBIDDEN,
            detail=f"The token provided does not give admin privileges",
        )
    projects = await db.query_projects(
        status=status, collab=collab, owner=owner, from_index=from_index, size=size
    )
    projects_with_quotas = []
    for project in projects:
        quotas = await db.follow_relationships_quotas(project["id"])
        projects_with_quotas.append(to_dictSerial(project, quotas))
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
            quotas = await db.follow_relationships_quotas(project["id"])
            content = to_dictSerial(project, quotas)
            return content
        else:
            raise HTTPException(
                status_code=status_codes.HTTP_403_FORBIDDEN,
                detail=f" You do not have access to this project",
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
            if db.query_quotas([project_id]) is not None:
                await db.delete_quotas_from_project(str(project_id))
            await db.delete_project(str(project_id))
        else:
            raise HTTPException(
                status_code=status_codes.HTTP_403_FORBIDDEN,
                detail=f"You are not allowed to delete this project",
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
            detail=f"You are not allowed to delete quotas from this project",
        )

    if await db.get_quota(quota_id) is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"There is no quota with this id",
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
    content = to_dictRequestBody(projectRB)

    content["accepted"] = False
    if "submitted" not in content.keys():
        content["submitted"] = False
    if not ((as_admin and user.is_admin) or user.can_edit(content["collab"])):
        raise HTTPException(
            status_code=status_codes.HTTP_403_FORBIDDEN,
            detail=f"You do not have permisson to create projects in this Collab",
        )
    content["owner"] = user.username
    await db.create_project(content)


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
            detail=f"You cannot view quotas for this project",
        )
    quotas = await db.query_quotas(project_id=project_id, size=size, from_index=from_index)

    content = []
    for quota in quotas:
        content.append(to_dictSerialQuota(quota, project))

    return content


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
            detail=f" You do not have access to this project",
        )

    quota = await db.get_quota(quota_id)
    if quota is None:
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail=f"There is no quota with this id",
        )
    content = to_dictSerialQuota(quota, project)
    return content


@router.get("/collabs/", response_model=List[str])
async def query_collabs(
    status: ProjectStatus = Query(None, description="project status"),
    user_id: List[str] = Query(None, description="user id"),
    size: int = Query(10, description="Number of collabs to return"),
    from_index: int = Query(0, description="Index of the first collab to return"),
    # todo: consider adding an option to filter by projects that have active quotas (accepted, not expired, and remaining quota > 0)
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
            detail=f"The token provided does not give admin privileges",
        )
    else:
        # todo: if possible, obtain list of collab memberships for the provided user
        raise HTTPException(
            status_code=status_codes.HTTP_501_NOT_IMPLEMENTED,
            detail=f"This option has not been implemented yet",
        )
    projects = await db.query_projects(
        status=status, collab=collabs, owner=None, from_index=from_index, size=size
    )
    collabs = set(prj["collab"] for prj in projects)
    return sorted(collabs)


@router.put("/projects/{project_id}", status_code=status_codes.HTTP_200_OK)
async def update_project(
    projectRB: ProjectUpdate,
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
    project = await get_project_task

    content = to_dictRequestBody(projectRB)

    if not ((as_admin and user.is_admin) or user.can_edit(project["collab"])):
        raise HTTPException(
            status_code=status_codes.HTTP_403_FORBIDDEN,
            detail=f"You do not have permission to modify this project.",
        )

    new_status = content["status"]
    if new_status in ("accepted", "rejected"):
        logger.info("Changing status")
        if not (as_admin and user.is_admin):
            raise HTTPException(
                status_code=status_codes.HTTP_403_FORBIDDEN,
                detail=f"You do not have permission to change the status of this project.",
            )
        current_status = Project(**project).status()
        if new_status == current_status:
            raise HTTPException(
                status_code=status_codes.HTTP_204_NO_CONTENT, detail=f"Same Status"
            )
        elif new_status in ("accepted", "rejected"):
            project["decision_date"] = date.today()

            if new_status == "accepted":
                project["start_date"] = project["decision_date"]
                project["accepted"] = True

            await db.update_project(project_id, project)

            status_code = status_codes.HTTP_201_CREATED
            return status_code
        else:
            raise HTTPException(
                status_code=status_codes.HTTP_400_BAD_REQUEST,
                detail="Status can only be changed to 'accepted' or 'rejected'",
            )

    else:
        if project is None:
            raise HTTPException(
                status_code=status_codes.HTTP_404_NOT_FOUND, detail=f"Project Not Found"
            )

        if project["submission_date"] is not None:
            raise HTTPException(
                status_code=status_codes.HTTP_403_FORBIDDEN,
                detail=f"Can't edit a submitted form.",
            )

        if content["submitted"]:
            project["submission_date"] = date.today()

        for field, value in project.items():
            if field not in content.keys():
                content[field] = value
        await db.update_project(project_id, content)
        logger.info("Updating project")
        return status_codes.HTTP_201_CREATED
