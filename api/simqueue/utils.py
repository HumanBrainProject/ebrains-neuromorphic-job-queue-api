from datetime import date
from fastapi import HTTPException, status as status_codes

from .data_models import ProjectStatus, ResourceUsage
from . import db
from .globals import RESOURCE_USAGE_UNITS, PROVIDER_QUEUE_NAMES, DEMO_QUOTA_SIZES


async def get_available_quotas(collab, hardware_platform):
    available_projects = await db.query_projects(collab=[collab], status=ProjectStatus.accepted)
    available_quotas = []
    for project in available_projects:
        available_quotas.extend(
            await db.query_quotas(project["context"], platform=hardware_platform, size=100)
        )
    return available_quotas


async def check_quotas(collab: str, hardware_platform: str, user: str = None):
    """
    Check if there is a quota for the specified hardware platform associated with the given collab

    If the collab has never had a quota for the given platform and , but a username `user` is specified,
    then a new test/demo quota will be created with the owner set to `user`.
    """
    available_quotas = await get_available_quotas(collab, hardware_platform)
    if len(available_quotas) == 0 and user is not None and hardware_platform in DEMO_QUOTA_SIZES:
        # if this collab has never had a quota for this platform, we create a default test quota
        await create_test_quota(collab, hardware_platform, user)
        return True
    for quota in available_quotas:
        if quota["usage"] < quota["limit"]:
            return True
    return False


async def update_quotas(collab: str, hardware_platform: str, resource_usage: ResourceUsage):
    if resource_usage.units != RESOURCE_USAGE_UNITS[hardware_platform]:
        raise HTTPException(
            status_code=status_codes.HTTP_400_BAD_REQUEST,
            detail=f"Invalid units ({resource_usage.units}) for resource usage. Expected units: {RESOURCE_USAGE_UNITS[hardware_platform]}",
        )
    available_quotas = await get_available_quotas(collab, hardware_platform)
    usage = resource_usage.value
    quotas_to_update = []
    for quota in available_quotas:
        remaining = quota["limit"] - quota["usage"]
        if remaining > 0:
            if usage <= remaining:
                quota["usage"] += usage
                quotas_to_update.append(quota)
                break
            else:
                quota["usage"] = quota["limit"]
                quotas_to_update.append(quota)
                usage -= remaining
    for quota in quotas_to_update:
        await db.update_quota(quota["id"], quota)


def check_provider_matches_platform(provider_name: str, hardware_platform: str) -> bool:
    allowed_platforms = PROVIDER_QUEUE_NAMES[provider_name]
    if hardware_platform not in allowed_platforms:
        raise HTTPException(
            status_code=status_codes.HTTP_403_FORBIDDEN,
            detail=f"The provided API key does not allow access to jobs, sessions, or quotas for {hardware_platform}",
        )
    return True


async def create_test_quota(collab, hardware_platform, owner):
    today = date.today()
    project = await db.create_project(
        {
            "collab": collab,
            "owner": owner,
            "title": f"Test access for the {hardware_platform} platform in collab '{collab}'",
            "abstract": (
                "This project was created automatically for demonstration/testing purposes. "
                f"It gives you a test quota for the {hardware_platform} platform. "
                f"All members of the '{collab}' collab workspace can use this quota. "
                "When the test quotas are used up, you will need to request a new quota "
                "through the Job Manager app or Python client, or by contacting EBRAINS support."
            ),
            "description": "",
            "submission_date": today,
        }
    )
    project_id = project["context"]
    project = await db.update_project(project_id, {"accepted": True, "decision_date": today})
    # for platform, limit in DEMO_QUOTA_SIZES.items():
    quota_data = {
        "platform": hardware_platform,
        "limit": DEMO_QUOTA_SIZES[hardware_platform],
        "usage": 0.0,
        "units": RESOURCE_USAGE_UNITS[hardware_platform],
    }
    quota = await db.create_quota(project_id, quota_data)
    return project, quota
