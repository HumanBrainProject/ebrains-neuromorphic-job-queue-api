from fastapi import HTTPException, status as status_codes

from .data_models import ProjectStatus, ResourceUsage
from . import db
from .globals import RESOURCE_USAGE_UNITS


async def get_available_quotas(collab, hardware_platform):
    available_projects = await db.query_projects(collab=[collab], status=ProjectStatus.accepted)
    available_quotas = []
    for project in available_projects:
        available_quotas.extend(
            await db.query_quotas(project["context"], platform=hardware_platform, size=100)
        )
    return available_quotas


async def check_quotas(collab, hardware_platform):
    available_quotas = await get_available_quotas(collab, hardware_platform)
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
            # breakpoint()
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
