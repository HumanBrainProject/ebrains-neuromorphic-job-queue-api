from datetime import datetime, date, timedelta, timezone
import pytz
from typing import List
import json
import uuid
from slugify import slugify

import databases
from sqlalchemy import (
    Column,
    ForeignKey,
    Integer,
    Float,
    String,
    Boolean,
    DateTime,
    Date,
    Table,
    MetaData,
    literal_column,
    func,
    distinct,
    select as slct,
    desc,
)
from sqlalchemy.dialects.postgresql import UUID

from .data_models import (
    ProjectStatus,
    CommentBody,
    SubmittedJob,
    AcceptedJob,
    CompletedJob,
    JobPatch,
    Tag,
    ProjectSubmission,
)
from . import settings
from .globals import RESOURCE_USAGE_UNITS


SQLALCHEMY_DATABASE_URL = f"postgresql://{settings.DATABASE_USERNAME}:{settings.DATABASE_PASSWORD}@{settings.DATABASE_HOST}:{settings.DATABASE_PORT}/nmpi?ssl=false"

database = databases.Database(SQLALCHEMY_DATABASE_URL)

metadata = MetaData()


def now_in_utc():
    return datetime.now(pytz.UTC)


job_input_data = Table(
    "simqueue_job_input_data",
    metadata,
    Column("job_id", ForeignKey("simqueue_job.id"), primary_key=True),
    Column("dataitem_id", ForeignKey("simqueue_dataitem.id"), primary_key=True),
)

job_output_data = Table(
    "simqueue_job_output_data",
    metadata,
    Column("job_id", ForeignKey("simqueue_job.id"), primary_key=True),
    Column("dataitem_id", ForeignKey("simqueue_dataitem.id"), primary_key=True),
)

data_items = Table(
    "simqueue_dataitem",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("url", String(1000)),
    Column("hash", String(256)),
    Column("size", Integer),
    Column("content_type", String(100)),
)

jobs = Table(
    "simqueue_job",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("code", String, nullable=False),
    Column("command", String(500), nullable=False),
    Column("collab_id", String(40), nullable=False),
    Column("user_id", String(36), nullable=False),
    Column("status", String(15), default="submitted", nullable=False),
    Column("hardware_platform", String(20), nullable=False),
    Column("hardware_config", String),
    Column("timestamp_submission", DateTime(timezone=True), default=now_in_utc, nullable=False),
    Column("timestamp_completion", DateTime(timezone=True)),
    Column("provenance", String),
    Column("resource_usage", Float),
)

comments = Table(
    "simqueue_comment",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("content", String),
    Column("created_time", DateTime(timezone=True), default=now_in_utc, nullable=False),
    Column("user", String(36), nullable=False),
    Column("job_id", Integer, ForeignKey("simqueue_job.id")),
)

logs = Table(
    "simqueue_log",
    metadata,
    Column("job_id", Integer, ForeignKey("simqueue_job.id"), primary_key=True),
    Column("content", String, nullable=False),
)

taglist = Table(
    "taggit_tag",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(100), nullable=False),
    Column("slug", String(100), nullable=False),
)

tagged_items = Table(
    "taggit_taggeditem",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("object_id", Integer, nullable=False),
    Column("content_type_id", Integer, nullable=False),
    Column("tag_id", Integer, ForeignKey("taggit_tag.id"), nullable=False),
)

projects = Table(
    "quotas_project",
    metadata,
    Column("context", UUID, primary_key=True, default=uuid.uuid4),
    Column("collab", String(40), nullable=False),
    Column("owner", String(36), nullable=False),
    Column("title", String(200), nullable=False),
    Column("abstract", String, nullable=False),
    Column("description", String, nullable=False),
    Column("duration", Integer, default=0),  # in days
    Column("start_date", Date),  # Value set when project is accepted
    Column("accepted", Boolean, default=False),
    Column("submission_date", Date),
    Column("decision_date", Date),  # Value set when project is accepted/refused
)

quotas = Table(
    "quotas_quota",
    metadata,
    Column("id", Integer, primary_key=True),
    # autoincrement is 'auto' by default. Maybe need to use Sequence(), since the sequence already exists in the DB?
    Column("units", String(15), nullable=False),
    Column("limit", Float, nullable=False),
    Column("usage", Float, default=0, nullable=False),
    Column("platform", String(20), nullable=False),
    Column("project_id", UUID, ForeignKey("quotas_project.context"), nullable=False),
)

api_keys = Table(
    "tastypie_apikey",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("key", String(128), nullable=False),
    Column("created", DateTime(timezone=True), nullable=False),
    Column("user_id", Integer, nullable=False),
)


def transform_fields(job):
    """Change certain fields that are stored as strings or floats into richer Python types"""
    if job.get("hardware_config", None):
        job["hardware_config"] = json.loads(job["hardware_config"])
    if job.get("provenance", None):
        job["provenance"] = json.loads(job["provenance"])
    if job.get("resource_usage", None) is not None:  # can be 0.0
        job["resource_usage"] = {
            "value": job["resource_usage"],
            "units": RESOURCE_USAGE_UNITS.get(job["hardware_platform"], "hours"),
        }
    return job


def transform_project_fields(project):
    project["id"] = project.pop("context")
    return project


def transform_comment_fields(comment):
    return {
        "id": comment["id"],
        "job_id": comment["job_id"],
        "content": comment["content"],
        "user_id": comment["user"],
        "timestamp": comment["created_time"],
    }


async def follow_relationships(job):
    # input data
    query = data_items.select().where(
        data_items.c.id == job_input_data.c.dataitem_id, job_input_data.c.job_id == job["id"]
    )
    results = await database.fetch_all(query)
    job["input_data"] = [dict(row) for row in results or []]

    # output data
    query = data_items.select().where(
        data_items.c.id == job_output_data.c.dataitem_id, job_output_data.c.job_id == job["id"]
    )
    results = await database.fetch_all(query)
    job["output_data"] = [dict(row) for row in results or []]

    # tags
    query = tagged_items.select().where(tagged_items.c.object_id == job["id"])
    results = await database.fetch_all(query)
    tags = []
    for tag_item in results:
        query = taglist.select().where(taglist.c.id == tag_item.tag_id)
        used_tag = await database.fetch_one(query)
        tags.append(Tag(used_tag["name"]))
    job["tags"] = sorted([item for item in tags or []])

    return job


async def follow_relationships_quotas(id):
    query = quotas.select().where(quotas.c.project_id == id)
    results = await database.fetch_all(query)
    return [dict(result) for result in results]


async def delete_dataitems(job_id):
    # input data
    query = job_input_data.delete().where(job_input_data.c.job_id == job_id)
    await database.execute(query)
    query2 = data_items.delete().where(
        data_items.c.id == job_input_data.c.dataitem_id, job_input_data.c.job_id == job_id
    )
    await database.execute(query2)

    # output data
    query3 = job_output_data.delete().where(job_output_data.c.job_id == job_id)
    await database.execute(query3)
    query4 = data_items.delete().where(
        data_items.c.id == job_output_data.c.dataitem_id, job_output_data.c.job_id == job_id
    )
    await database.execute(query4)

    return


async def create_job_input_data_item(job, job_id):

    for item in job.input_data:
        ins_data_item = data_items.insert().values(**dict(item))
        data_item_id = await database.execute(ins_data_item)
        ins_job_input = job_input_data.insert().values(job_id=job_id, dataitem_id=data_item_id)
        await database.execute(ins_job_input)

    return


async def update_job_output_data_item(job_id, job_patch):

    for item in job_patch.output_data:
        ins_data_item = data_items.insert().values(**dict(item))
        data_item_id = await database.execute(ins_data_item)
        ins_job_output = job_output_data.insert().values(job_id=job_id, dataitem_id=data_item_id)
        await database.execute(ins_job_output)

    return


async def update_log(job_id, job_patch):

    query = logs.select().where(logs.c.job_id == job_id)
    result = await database.fetch_one(query)
    if result is None:
        ins = logs.insert().values(job_id=job_id, content=job_patch.log)
        await database.execute(ins)
    else:
        ins = logs.update().where(jobs.c.id == job_id).values(content=job_patch.log)
        await database.execute(ins)

    return


def get_list_filter(attr, value):
    if len(value) > 0:
        return attr.in_(value)
    else:
        return attr == value[0]


async def query_jobs(
    status: List[str] = None,
    tags: List[str] = None,
    collab_id: List[str] = None,
    user_id: List[str] = None,
    hardware_platform: List[str] = None,
    date_range_start: date = None,
    date_range_end: date = None,
    fields: List[str] = None,
    from_index: int = 0,
    size: int = 10,
):
    filters = []
    if status:
        filters.append(get_list_filter(jobs.c.status, status))
    if user_id:
        filters.append(get_list_filter(jobs.c.user_id, user_id))
    if hardware_platform:
        filters.append(get_list_filter(jobs.c.hardware_platform, hardware_platform))
    if collab_id:
        filters.append(get_list_filter(jobs.c.collab_id, collab_id))
    if date_range_start:
        if date_range_end:
            filters.append(jobs.c.timestamp_submission.between(date_range_start, date_range_end))
        else:
            filters.append(jobs.c.timestamp_submission >= date_range_start)
    elif date_range_end:
        filters.append(jobs.c.timestamp_submission <= date_range_end)
    if tags:
        # this is a simplistic implementation where we first fetch the tag ids
        # todo: replace this with a single, more sophisticated SQL query
        tag_query = taglist.select().where(taglist.c.name.in_(tags))
        tag_ids = [row["id"] for row in await database.fetch_all(tag_query)]
        tagged_item_query = tagged_items.select().where(tagged_items.c.tag_id.in_(tag_ids))
        tagged_item_ids = [row["object_id"] for row in await database.fetch_all(tagged_item_query)]
        filters.append(jobs.c.id.in_(tagged_item_ids))

    if fields is None:
        select = jobs.select()
    else:
        select = jobs.select().with_only_columns(*[literal_column(field) for field in fields])

    if filters:
        query = select.where(*filters).offset(from_index).limit(size)
    else:
        query = select.offset(from_index).limit(size)

    results = await database.fetch_all(query)

    if fields:
        return [dict(result) for result in results]
    return [transform_fields(await follow_relationships(dict(result))) for result in results]


async def get_job(job_id: int):
    query = jobs.select().where(jobs.c.id == job_id)
    result = await database.fetch_one(query)
    if result is not None:
        intermediate_result = dict(result)
        return transform_fields(await follow_relationships(intermediate_result))
    else:
        return None


async def get_next_job(hardware_platform: str):
    query = (
        jobs.select()
        .where(jobs.c.hardware_platform == hardware_platform, jobs.c.status == "submitted")
        .order_by(desc("timestamp_submission"))
        .limit(1)
    )
    result = await database.fetch_one(query)
    if result is not None:
        intermediate_result = dict(result)
        return transform_fields(await follow_relationships(intermediate_result))
    else:
        return None


async def create_job(user_id: str, job: SubmittedJob):

    ins = jobs.insert().values(
        code=job.code,
        command=job.command or "",
        collab_id=job.collab_id,
        user_id=user_id,
        status="submitted",
        hardware_platform=job.hardware_platform,
        hardware_config=json.dumps(job.hardware_config) if job.hardware_config else None,
        timestamp_submission=now_in_utc(),
    )
    job_id = await database.execute(ins)

    query = jobs.select().where(jobs.c.id == job_id)
    result = await database.fetch_one(query)
    if job.input_data is not None:
        await create_job_input_data_item(job, job_id)
    if job.tags is not None:
        await add_tags_to_job(job_id, job.tags)
    return transform_fields(await follow_relationships(dict(result)))


async def update_job(job_id: int, job_patch: JobPatch):
    if job_patch.status in ("error", "finished"):
        # todo: check the status wasn't already one of these
        timestamp_completion = datetime.now(timezone.utc)
    else:
        timestamp_completion = None
    ins = (
        jobs.update()
        .where(jobs.c.id == job_id)
        .values(
            provenance=json.dumps(job_patch.provenance),
            resource_usage=job_patch.resource_usage.value,
            status=job_patch.status,
            timestamp_completion=timestamp_completion,
        )
    )
    await database.execute(ins)

    if job_patch.output_data is not None:
        await update_job_output_data_item(job_id, job_patch)
    if job_patch.log is not None:
        await update_log(job_id, job_patch)
    return await get_job(job_id)


async def delete_job(job_id: int):
    # delete associated data items
    await delete_dataitems(job_id)

    # delete job's logs
    query = logs.delete().where(logs.c.job_id == job_id)
    await database.execute(query)

    # delete job's tags
    query = tagged_items.delete().where(tagged_items.c.object_id == job_id)
    await database.execute(query)

    # delete comments
    query = comments.delete().where(comments.c.job_id == job_id)
    await database.execute(query)

    # delete the job
    ins = jobs.delete().where(jobs.c.id == job_id)
    result = await database.execute(ins)

    return


async def get_provider(apikey):
    provider_id_map = {
        2: "uhei",
        3: "uman",
        4: "nmpi",
        50: "benchmark_runner",
        74: "uhei-jenkins-test-user",
    }
    # we could use the auth_user table in the database for mapping user_id to username,
    # but since we only have five users with API keys, we take the simple
    # approach for now
    query = api_keys.select().where(api_keys.c.key == apikey)
    result = await database.fetch_one(query)
    if result:
        return provider_id_map[result["user_id"]]
    else:
        return None


async def get_users_count(
    status: List[str] = None,
    hardware_platform: List[str] = None,
    date_range_start: date = None,
    date_range_end: date = None,
):
    filters = []
    if status:
        filters.append(get_list_filter(jobs.c.status, status))

    if hardware_platform:
        filters.append(get_list_filter(jobs.c.hardware_platform, hardware_platform))

    if date_range_start:
        if date_range_end:
            filters.append(jobs.c.timestamp_completion.between(date_range_start, date_range_end))
        else:
            filters.append(jobs.c.timestamp_submission >= date_range_start)
    elif date_range_end:
        filters.append(jobs.c.timestamp_submission <= date_range_end)

    select_query = slct(func.count(distinct(jobs.c.user_id)))
    query = select_query.where(*filters)

    users_count = await database.execute(query)
    return int(users_count)


async def get_users_list(
    status: List[str] = None,
    hardware_platform: List[str] = None,
    date_range_start: date = None,
    date_range_end: date = None,
):
    filters = []
    if status:
        filters.append(get_list_filter(jobs.c.status, status))

    if hardware_platform:
        filters.append(get_list_filter(jobs.c.hardware_platform, hardware_platform))

    if date_range_start:
        if date_range_end:
            filters.append(jobs.c.timestamp_completion.between(date_range_start, date_range_end))
        else:
            filters.append(jobs.c.timestamp_submission >= date_range_start)
    elif date_range_end:
        filters.append(jobs.c.timestamp_submission <= date_range_end)

    select_query = slct(distinct(jobs.c.user_id))
    query = select_query.where(*filters)

    users_list = await database.fetch_all(query)
    return users_list


async def count_jobs(
    hardware_platform: List[str] = None,
    status: List[str] = None,
):
    filters = []
    if status:
        filters.append(get_list_filter(jobs.c.status, status))
    if hardware_platform:
        filters.append(get_list_filter(jobs.c.hardware_platform, hardware_platform))
    select_query = slct(func.count(jobs.c.id))
    query = select_query.where(*filters)
    jobs_count = await database.execute(query)
    return int(jobs_count)


def daterange(start_date, end_date, interval=1):
    for n in range(0, int((end_date - start_date).days), interval):
        yield start_date + timedelta(n)


async def query_tags(collab_id=None):
    query = taglist.select()
    if collab_id:
        job_query = jobs.select().where(jobs.c.collab_id == collab_id)
        job_ids = [row["id"] for row in await database.fetch_all(job_query)]
        tag_id_query = tagged_items.select().where(tagged_items.c.object_id.in_(job_ids))
        tag_ids = [row["tag_id"] for row in await database.fetch_all(tag_id_query)]
        query = query.where(taglist.c.id.in_(tag_ids))
    results = await database.fetch_all(query)
    return sorted(result["name"] for result in results)


async def get_tags(job_id: int):
    query = tagged_items.select().where(tagged_items.c.object_id == job_id)
    results = await database.fetch_all(query)
    tags = []
    for tag_item in results:
        query = taglist.select().where(taglist.c.id == tag_item.tag_id)
        used_tag = await database.fetch_one(query)
        if len(used_tag["name"]) > 1:
            tags.append(Tag(used_tag["name"]))
    return sorted(tags)


async def delete_tag(tag):
    """Delete a tag entirely from the database"""
    query = taglist.select().where(taglist.c.name == tag)
    result = await database.fetch_one(query)
    if result is None:
        raise ValueError(f"tag '{tag}' not found")
    else:
        ins = tagged_items.delete().where(tagged_items.c.tag_id == result["id"])
        await database.execute(ins)
        ins = taglist.delete().where(taglist.c.id == result["id"])
        await database.execute(ins)


async def remove_tags(job_id: int, tags: List[str]):
    tag_query = taglist.select().where(taglist.c.name.in_(tags))
    tag_ids = [row["id"] for row in await database.fetch_all(tag_query)]
    for tag_id in tag_ids:
        ins = tagged_items.delete().where(
            tagged_items.c.tag_id == tag_id, tagged_items.c.object_id == job_id
        )
        await database.execute(ins)
    return await get_tags(job_id)


async def add_tags_to_job(job_id: int, tags: List[str]):
    results = await add_tags_to_taglist(tags)
    for tag_obj in results:
        query = tagged_items.select().where(
            tagged_items.c.tag_id == tag_obj["id"], tagged_items.c.object_id == job_id
        )
        tagged_item = await database.fetch_one(query)
        if tagged_item is None:
            ins = tagged_items.insert().values(
                object_id=job_id, tag_id=tag_obj["id"], content_type_id=7
            )
            await database.execute(ins)
    return await get_tags(job_id)


async def add_tags_to_taglist(tag_names: List[str]):
    results = []
    for tag in tag_names:
        query = taglist.select().where(taglist.c.name == tag)
        used_tag = await database.fetch_one(query)
        if used_tag is None:
            ins = taglist.insert().values(name=tag, slug=slugify(tag))
            await database.execute(ins)
        query = taglist.select().where(taglist.c.name == tag)
        returned_tag = await database.fetch_one(query)
        results.append(returned_tag)
    return results


async def get_comments(job_id: int):
    """Return all the comments for a given job, from newest to oldest"""
    query = comments.select().where(comments.c.job_id == job_id)
    results = await database.fetch_all(query)
    return sorted(
        [transform_comment_fields(result) for result in results],
        key=lambda comment: comment["timestamp"],
        reverse=True,
    )


async def get_comment(comment_id: int):
    query = comments.select().where(comments.c.id == comment_id)
    result = await database.fetch_one(query)
    return transform_comment_fields(result)


async def add_comment(job_id: int, user_id: str, new_comment: str):

    ins = comments.insert().values(
        content=new_comment, created_time=now_in_utc(), user=user_id, job_id=job_id
    )
    comment_id = await database.execute(ins)
    return await get_comment(comment_id)


async def update_comment(
    comment_id: int,
    new_comment: str,
):
    ins = (
        comments.update()
        .where(comments.c.id == comment_id)
        .values(id=comment_id, content=new_comment)
    )
    await database.execute(ins)
    return await get_comment(comment_id)


async def delete_comment(comment_id: int):

    ins = comments.delete().where(comments.c.id == comment_id)
    result = await database.execute(ins)
    return result


async def get_log(job_id: int):
    query = logs.select().where(logs.c.job_id == job_id)
    result = await database.fetch_one(query)
    return result["content"]


async def query_projects(
    status: ProjectStatus = None,
    collab_id: List[str] = None,
    owner_id: List[str] = None,
    # date_range_start: date = None,
    # date_range_end: date = None,
    from_index: int = 0,
    size: int = 10,
):
    filters = []
    if status:
        if status is ProjectStatus.accepted:
            filters.append(projects.c.accepted == True)
        else:
            filters.append(projects.c.accepted == False)
            if status is ProjectStatus.rejected:
                filters.append(projects.c.decision_date != None)
            elif status is ProjectStatus.under_review:
                filters.extend(
                    (projects.c.submission_date != None, projects.c.decision_date == None)
                )
            else:
                assert status is ProjectStatus.in_prep
                filters.append(projects.c.submission_date == None)
    if collab_id:
        filters.append(get_list_filter(projects.c.collab, collab_id))
    if owner_id:
        filters.append(get_list_filter(projects.c.owner, owner_id))

    if filters:
        query = projects.select().where(*filters).offset(from_index).limit(size)
    else:
        query = projects.select().offset(from_index).limit(size)

    results = await database.fetch_all(query)

    return [transform_project_fields(dict(result)) for result in results]


async def create_project(project):
    if project.get("submitted", False):
        submission_date = date.today()
    else:
        submission_date = None
    project_id = str(uuid.uuid4())
    ins = projects.insert().values(
        context=project_id,  # for historical reasons, the id is called 'context'
        collab=project["collab"],
        owner=project["owner"],
        title=project["title"],
        abstract=project["abstract"],
        description=project["description"],
        submission_date=submission_date,
        duration=0,  # we're not using this field, projects are currently of unlimited duration
        accepted=False,
    )
    await database.execute(ins)
    return await get_project(project_id)


async def update_project(project_id, project_update):
    # todo: allow only some fields to be updated

    ins = (
        projects.update()
        .where(projects.c.context == project_id)
        .values(
            collab=project_update["collab"],
            owner=project_update["owner"],
            title=project_update["title"],
            abstract=project_update["abstract"],
            description=project_update["description"],
            duration=project_update["duration"],
            start_date=project_update["start_date"],
            accepted=project_update["accepted"],
            submission_date=project_update["submission_date"],
            decision_date=project_update["decision_date"],
        )
    )
    await database.execute(ins)
    return await get_project(project_id)


async def get_project(project_id):
    query = projects.select().where(projects.c.context == project_id)
    result = await database.fetch_one(query)

    if result is not None:
        return transform_project_fields(dict(result))
    else:
        return result


async def delete_project(project_id):
    await delete_quotas_from_project(project_id)
    query = projects.delete().where(projects.c.context == project_id)
    await database.execute(query)


async def query_quotas(project_id: UUID = None, from_index: int = 0, size: int = 10):
    query = quotas.select()
    if project_id:
        query = query.where(quotas.c.project_id == str(project_id))
    query = query.offset(from_index).limit(size)
    results = await database.fetch_all(query)
    return [(dict(result)) for result in results]


async def delete_quotas_from_project(project_id):
    results = await query_quotas(
        project_id, size=1000
    )  # assume we won't have more than 1000 quotas per project
    for result in results:
        await delete_quota(result["id"])


async def get_quota(quota_id):
    query = quotas.select().where(quotas.c.id == quota_id)
    results = await database.fetch_one(query)
    if results is not None:
        return dict(results)
    else:
        return None


async def delete_quota(quota_id):
    query = quotas.delete().where(quotas.c.id == quota_id)
    await database.execute(query)


async def create_quota(project_id, quota):
    ins = quotas.insert().values(
        project_id=project_id,
        units=quota["units"],
        limit=quota["limit"],
        usage=quota["usage"],
        platform=quota["platform"],
    )
    quota_id = await database.execute(ins)
    return await get_quota(quota_id)


async def update_quota(quota_id, quota_update):
    ins = (
        quotas.update()
        .where(quotas.c.id == quota_id)
        .values(
            id=quota_id,
            limit=quota_update["limit"],
            usage=quota_update["usage"],
        )
    )
    await database.execute(ins)
    return await get_quota(quota_id)
