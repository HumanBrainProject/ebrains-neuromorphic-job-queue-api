from datetime import datetime, date, timedelta
import pytz
from typing import List
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
from asyncpg.exceptions import PostgresSyntaxError

from .data_models import (
    ProjectStatus,
    Tag,
)
from . import settings


SQLALCHEMY_DATABASE_URL = f"postgresql://{settings.DATABASE_USERNAME}:{settings.DATABASE_PASSWORD}@{settings.DATABASE_HOST}:{settings.DATABASE_PORT}/nmpi?ssl=false"

database = databases.Database(SQLALCHEMY_DATABASE_URL)

metadata = MetaData()


def now_in_utc():
    return datetime.now(pytz.UTC)


data_items = Table(
    "simqueue_dataitem",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("url", String(1000)),
    Column("path", String(1000)),
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

sessions = Table(
    "simqueue_session",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("collab_id", String(40), nullable=False),
    Column("user_id", String(36), nullable=False),
    Column("status", String(15), default="submitted", nullable=False),
    Column("hardware_platform", String(20), nullable=False),
    Column("hardware_config", String),
    Column("timestamp_start", DateTime(timezone=True), default=now_in_utc, nullable=False),
    Column("timestamp_end", DateTime(timezone=True)),
    Column("resource_usage", Float),
)
"""
CREATE TABLE simqueue_session(
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    collab_id character varying(40) NOT NULL,
    user_id character varying(36) NOT NULL,
    status character varying(15) NOT NULL,
    hardware_platform character varying(20) NOT NULL,
    hardware_config text,
    timestamp_start timestamp with time zone NOT NULL,
    timestamp_end timestamp with time zone,
    resource_usage double precision
);
"""

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


async def create_job_input_data_item(job_id, input_data):
    for item in input_data:
        ins_data_item = data_items.insert().values(**dict(item))
        data_item_id = await database.execute(ins_data_item)
        ins_job_input = job_input_data.insert().values(job_id=job_id, dataitem_id=data_item_id)
        await database.execute(ins_job_input)

    return


async def create_job_output_data_item(job_id, output_data):
    for item in output_data:
        ins_data_item = data_items.insert().values(**item)
        data_item_id = await database.execute(ins_data_item)
        ins_job_output = job_output_data.insert().values(job_id=job_id, dataitem_id=data_item_id)
        await database.execute(ins_job_output)

    return


async def update_job_output_data_item(job_id, output_data):
    for item in output_data:
        if "hash" in item:
            ins = (
                data_items.update()
                .where(
                    data_items.c.id == job_output_data.c.dataitem_id,
                    job_output_data.c.job_id == job_id,
                    data_items.c.hash == item["hash"],
                )
                .values(**item)
            )
            await database.execute(ins)
        else:
            raise ValueError("Modification of data items without hashes not yet implemented.")


async def update_log(job_id, log, append=False):
    query = logs.select().where(logs.c.job_id == job_id)
    result = await database.fetch_one(query)
    if result is None:
        ins = logs.insert().values(job_id=job_id, content=log)
        await database.execute(ins)
    else:
        if append:
            log = result["log"] + log
        ins = logs.update().where(logs.c.job_id == job_id).values(content=log)
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
    collab: List[str] = None,
    user_id: List[str] = None,
    hardware_platform: List[str] = None,
    date_range_start: date = None,
    date_range_end: date = None,
    fields: List[str] = None,
    from_index: int = 0,
    size: int = 10,
    exclude_removed=False,
):
    filters = []
    if exclude_removed:
        filters.append(jobs.c.status != "removed")
    if status:
        filters.append(get_list_filter(jobs.c.status, status))
    if user_id:
        filters.append(get_list_filter(jobs.c.user_id, user_id))
    if hardware_platform:
        filters.append(get_list_filter(jobs.c.hardware_platform, hardware_platform))
    if collab:
        filters.append(get_list_filter(jobs.c.collab_id, collab))
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

    results = await database.fetch_all(query.order_by(desc("id")))

    if fields:
        return [dict(result) for result in results]
    return [await follow_relationships(dict(result)) for result in results]


async def get_job(job_id: int):
    query = jobs.select().where(jobs.c.id == job_id)
    result = await database.fetch_one(query)
    if result is not None:
        intermediate_result = dict(result)
        return await follow_relationships(intermediate_result)
    else:
        return None


async def get_next_job(hardware_platform: str):
    query = (
        jobs.select()
        .where(jobs.c.hardware_platform == hardware_platform, jobs.c.status == "submitted")
        .order_by("timestamp_submission")
        .limit(1)
    )
    result = await database.fetch_one(query)
    if result is not None:
        intermediate_result = dict(result)
        return await follow_relationships(intermediate_result)
    else:
        return None


async def create_job(user_id: str, job: dict):
    ins = jobs.insert().values(
        code=job["code"],
        command=job["command"] or "",
        collab_id=job["collab_id"],
        user_id=user_id,
        status="submitted",
        hardware_platform=job["hardware_platform"],
        hardware_config=job["hardware_config"],
        timestamp_submission=now_in_utc(),
    )
    job_id = await database.execute(ins)

    query = jobs.select().where(jobs.c.id == job_id)
    result = await database.fetch_one(query)
    if job.get("input_data", None) is not None:
        await create_job_input_data_item(job_id, job["input_data"])
    if job.get("tags", None) is not None:
        await add_tags_to_job(job_id, job["tags"])
    return await follow_relationships(dict(result))


async def update_job(job_id: int, job_patch: dict):
    job_patch = job_patch.copy()
    output_data = job_patch.pop("output_data", None)
    log = job_patch.pop("log", None)

    if job_patch:
        try:
            ins = jobs.update().where(jobs.c.id == job_id).values(**job_patch)
            await database.execute(ins)
        except PostgresSyntaxError as err:
            raise PostgresSyntaxError(f"job_patch was {job_patch}") from err

    if output_data:
        await create_job_output_data_item(job_id, output_data)
    if log:
        await update_log(job_id, log)
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


async def query_sessions(
    status: List[str] = None,
    collab: List[str] = None,
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
        filters.append(get_list_filter(sessions.c.status, status))
    if user_id:
        filters.append(get_list_filter(sessions.c.user_id, user_id))
    if hardware_platform:
        filters.append(get_list_filter(sessions.c.hardware_platform, hardware_platform))
    if collab:
        filters.append(get_list_filter(sessions.c.collab_id, collab))
    if date_range_start:
        if date_range_end:
            filters.append(sessions.c.timestamp_start.between(date_range_start, date_range_end))
        else:
            filters.append(sessions.c.timestamp_start >= date_range_start)
    elif date_range_end:
        filters.append(sessions.c.timestamp_start <= date_range_end)

    if fields is None:
        select = sessions.select()
    else:
        select = sessions.select().with_only_columns(*[literal_column(field) for field in fields])

    if filters:
        query = select.where(*filters).offset(from_index).limit(size)
    else:
        query = select.offset(from_index).limit(size)

    results = await database.fetch_all(query)

    if fields:
        return [dict(result) for result in results]
    return results


async def get_session(session_id: int):
    query = sessions.select().where(sessions.c.id == session_id)
    result = await database.fetch_one(query)
    return result


async def create_session(session: dict):
    ins = sessions.insert().values(
        collab_id=session["collab_id"],
        user_id=session["user_id"],
        status="running",
        hardware_platform=session["hardware_platform"],
        hardware_config=session["hardware_config"],
        timestamp_start=session["timestamp_start"],
        resource_usage=session["resource_usage"],
    )
    session_id = await database.execute(ins)
    query = sessions.select().where(sessions.c.id == session_id)
    result = await database.fetch_one(query)
    return result


async def update_session(session_id: int, session_patch: dict):
    session_patch = session_patch.copy()
    ins = sessions.update().where(sessions.c.id == session_id).values(**session_patch)
    await database.execute(ins)
    return await get_session(session_id)


async def delete_session(session_id: int):
    ins = sessions.delete().where(sessions.c.id == session_id)
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


async def query_tags(collab=None):
    query = taglist.select()
    if collab:
        job_query = jobs.select().where(jobs.c.collab_id == collab)
        job_ids = [row["id"] for row in await database.fetch_all(job_query)]
        tag_id_query = tagged_items.select().where(tagged_items.c.object_id.in_(job_ids))
        tag_ids = [row["tag_id"] for row in await database.fetch_all(tag_id_query)]
        query = query.where(taglist.c.id.in_(tag_ids))
    results = await database.fetch_all(query)
    return sorted(result["name"] for result in results if len(result["name"]) > 1)


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
    """Return all the comments for a given job, from oldest to newest"""
    query = comments.select().where(comments.c.job_id == job_id)
    results = await database.fetch_all(query)
    return sorted(results, key=lambda comment: comment["created_time"], reverse=False)


async def get_comment(comment_id: int):
    query = comments.select().where(comments.c.id == comment_id)
    result = await database.fetch_one(query)
    return result


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


async def get_log(job_id: int) -> str:
    query = logs.select().where(logs.c.job_id == job_id)
    result = await database.fetch_one(query)
    if result:
        return result["content"]
    else:
        return ""


async def query_projects(
    status: ProjectStatus = None,
    collab: List[str] = None,
    owner: List[str] = None,
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
    if collab:
        filters.append(get_list_filter(projects.c.collab, collab))
    if owner:
        filters.append(get_list_filter(projects.c.owner, owner))

    if filters:
        query = projects.select().where(*filters).offset(from_index).limit(size)
    else:
        query = projects.select().offset(from_index).limit(size)

    results = await database.fetch_all(query)

    return results


async def create_project(project):
    project_id = str(uuid.uuid4())
    ins = projects.insert().values(
        context=project_id,  # for historical reasons, the id is called 'context'
        collab=project["collab"],
        owner=project["owner"],
        title=project["title"],
        abstract=project["abstract"],
        description=project["description"],
        submission_date=project.get("submission_date", None),
        duration=0,  # we're not using this field, projects are currently of unlimited duration
        accepted=False,
    )
    await database.execute(ins)
    return await get_project(project_id)


async def update_project(project_id, project_update):
    # todo: allow only some fields to be updated

    ins = projects.update().where(projects.c.context == project_id).values(**project_update)
    await database.execute(ins)
    return await get_project(project_id)


async def get_project(project_id):
    query = projects.select().where(projects.c.context == project_id)
    result = await database.fetch_one(query)
    return result


async def delete_project(project_id):
    await delete_quotas_from_project(project_id)
    query = projects.delete().where(projects.c.context == project_id)
    await database.execute(query)


async def query_quotas(
    project_id: UUID = None, platform=None, from_index: int = 0, size: int = 10
):
    query = quotas.select()
    if project_id:
        query = query.where(quotas.c.project_id == project_id)
    if platform:
        query = query.where(quotas.c.platform == platform)
    query = query.offset(from_index).limit(size)
    results = await database.fetch_all(query)
    return [dict(result) for result in results]


async def delete_quotas_from_project(project_id):
    results = await query_quotas(
        project_id, size=1000
    )  # assume we won't have more than 1000 quotas per project
    for result in results:
        await delete_quota(result["id"])


async def get_quota(quota_id):
    query = quotas.select().where(quotas.c.id == quota_id)
    results = await database.fetch_one(query)
    return results


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
