from uuid import UUID
from typing import List
from datetime import date
import logging

from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from ..data_models import (
    Project, ProjectSubmission, ProjectStatus, Quota
)

logger = logging.getLogger("simqueue")

auth = HTTPBearer()
router = APIRouter()


@router.get("/projects/", response_model=List[Project])
async def query_projects(
    status: ProjectStatus = Query(None, description="status"),
    user_id: List[str] = Query(None, description="user id"),
    date_range_start: date = Query(None, description="jobs submitted after this date"),
    date_range_end: date = Query(None, description="jobs submitted before this date"),
    # from header
    token: HTTPAuthorizationCredentials = Depends(auth),
):
    """
    Return a list of projects
    """
    pass


# url(r'^projects/$',
#         ProjectListResource.as_view(),
#         name="project-list-resource"),
#     url(r'^projects/(?P<project_id>{})$'.format(uuid_pattern),
#         ProjectResource.as_view(),
#         name="project-resource"),
#     url(r'^projects/(?P<project_id>{})/quotas/$'.format(uuid_pattern),
#         QuotaListResource.as_view(),
#         name="quota-list-resource"),
#     url(r'^projects/(?P<project_id>{})/quotas/(?P<quota_id>\d+)$'.format(uuid_pattern),
#         QuotaResource.as_view(),
#         name="quota-resource"),
