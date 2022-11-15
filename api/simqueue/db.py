from datetime import datetime, date,timedelta
import pytz
from typing import List
import json
import uuid
from slugify import slugify

import databases
from sqlalchemy import Column, ForeignKey, Integer, Float, String, Boolean, DateTime, Date, Table, MetaData, literal_column,func,text,distinct,select as slct
from sqlalchemy.dialects.postgresql import UUID

from .data_models import ProjectStatus, CommentBody,SubmittedJob, AcceptedJob, CompletedJob,JobPatch,Tag
from . import settings
from .globals import RESOURCE_USAGE_UNITS

SQLALCHEMY_DATABASE_URL = f"postgresql://{settings.DATABASE_USERNAME}:{settings.DATABASE_PASSWORD}@{settings.DATABASE_HOST}:{settings.DATABASE_PORT}/nmpi?ssl=false"

database = databases.Database(SQLALCHEMY_DATABASE_URL)
metadata = MetaData()


def now_in_utc():
    return datetime.now(pytz.UTC)


job_input_data = Table('simqueue_job_input_data', metadata,
    Column('job_id', ForeignKey('simqueue_job.id'), primary_key=True),
    Column('dataitem_id', ForeignKey('simqueue_dataitem.id'), primary_key=True)
)


job_output_data = Table('simqueue_job_output_data', metadata,
    Column('job_id', ForeignKey('simqueue_job.id'), primary_key=True),
    Column('dataitem_id', ForeignKey('simqueue_dataitem.id'), primary_key=True)
)

data_items = Table(
    "simqueue_dataitem",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("url", String(1000))
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
    Column("resource_usage", Float)
)

comments = Table(
    "simqueue_comment",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("content", String),
    Column("created_time", DateTime(timezone=True), nullable=False),
    Column("user", String(36), nullable=False),
    Column("job_id", Integer, ForeignKey("simqueue_job.id"))
)

logs = Table(
    "simqueue_log",
    metadata,
    Column("job_id", Integer, ForeignKey("simqueue_job.id"), primary_key=True),
    Column("content", String, nullable=False)
)

taglist = Table(
    "taggit_tag",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(100), nullable=False),
    Column("slug", String(100), nullable=False)
)


tagged_items = Table(
    "taggit_taggeditem",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("object_id", Integer,  nullable=False),
    Column("content_type_id", Integer,  nullable=False),
    Column("tag_id", Integer,ForeignKey("taggit_tag.id"),  nullable=False),

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
    Column("decision_date", Date) # Value set when project is accepted/refused
)

quotas = Table(
    "quotas_quota",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("units", String(15), nullable=False),
    Column("limit", Float, nullable=False),
    Column("usage", Float, nullable=False),
    Column("platform", String(20), nullable=False),
    Column("project_id", UUID, ForeignKey("quotas_project.context"), nullable=False)
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
            "units": RESOURCE_USAGE_UNITS.get(job["hardware_platform"], "hours")
        }
    return job


def transform_project_fields(project):
    project["id"] = project.pop("context")
    return project


async def follow_relationships(job):
    # input data
    query = data_items.select().where(data_items.c.id == job_input_data.c.dataitem_id,
                                      job_input_data.c.job_id == job["id"])
    results = await database.fetch_all(query)
    job["input_data"] = [dict(row) for row in results or []]

    # output data
    query = data_items.select().where(data_items.c.id == job_output_data.c.dataitem_id,
                                      job_output_data.c.job_id == job["id"])
    results = await database.fetch_all(query)
    job["output_data"] = [dict(row) for row in results or []]
    
    
    # tags
    query = tagged_items.select().where(tagged_items.c.object_id == job["id"])
    results = await database.fetch_all(query)
    tags=[]
    for tag_item in results:
        query = taglist.select().where(taglist.c.id == tag_item.tag_id)
        used_tag= await database.fetch_one(query)
        tags.append(Tag(tag_id=tag_item.tag_id,content=used_tag["name"]))
        
    job["tags"] = [item for item in tags or []]   
    
    return job

async def delete_dataitems(job_id):
    # input data
    query = data_items.delete().where(data_items.c.id == job_input_data.c.dataitem_id,
                                      job_input_data.c.job_id == job_id)
    await database.execute(query)
    query2 = job_input_data.delete().where(job_input_data.c.job_id == job_id)
    await database.execute(query2)

    # output data
    query = data_items.delete().where(data_items.c.id == job_output_data.c.dataitem_id,
                                      job_output_data.c.job_id == job_id)
    await database.execute(query)
    query2 = job_output_data.delete().where(job_output_data.c.job_id == job_id)
    await database.execute(query2)


 
    
    return 

async def create_job_input_data_item(job,job_id):

    for item in job.input_data:
        ins_data_item = data_items.insert().values(url=item.url)
        data_item_id = await database.execute(ins_data_item)
        ins_job_input = job_input_data.insert().values(job_id=job_id,dataitem_id=data_item_id)
        await database.execute(ins_job_input)


    return 


async def update_job_output_data_item(job,jobPatch):

    for item in jobPatch.output_data:
        ins_data_item = data_items.insert().values(url=item.url)
        data_item_id = await database.execute(ins_data_item)
        ins_job_output = job_output_data.insert().values(job_id=job.id,dataitem_id=data_item_id)
        await database.execute(ins_job_output)


    return 

async def update_log(job,jobPatch):

    query = logs.select().where(logs.c.job_id == job.id)
    result = await database.fetch_one(query)
    if result is None:  
        ins = logs.insert().values(job_id=job.id,content=jobPatch.log)
        await database.execute(ins)
    else:
        ins = logs.update().where(jobs.c.id == job.id).values(content=jobPatch.log)
        await database.execute(ins)


    
    return 

def get_list_filter(attr, value):
    if len(value) > 0:
        return attr.in_(value)
    else:
        return attr == value[0]


async def query_jobs(
    status: List[str] = None,
    #tag: List[str] = None,
    collab_id: List[str] = None,
    user_id: List[str] = None,
    hardware_platform: List[str] = None,
    date_range_start: date = None,
    date_range_end: date = None,
    fields: List[str] = None,
    from_index: int = 0,
    size: int = 10
):
    filters = []
    if status:
        filters.append(get_list_filter(jobs.c.status,status))
    if user_id:
        filters.append(get_list_filter(jobs.c.user_id, user_id))
    if hardware_platform:
        filters.append(get_list_filter(jobs.c.hardware_platform, hardware_platform))
    if collab_id:
        filters.append(get_list_filter(jobs.c.collab_id, collab_id))
    if date_range_start:
        if date_range_end:
            filters.append(jobs.c.timestamp_submission.between(date_range_start,  date_range_end))
        else:
            filters.append(jobs.c.timestamp_submission >= date_range_start)
    elif date_range_end:
        filters.append(jobs.c.timestamp_submission <= date_range_end)
    compiled_query= ""
    if fields is None:
        select = jobs.select()
    else:

        list_fields =["jobs.c."+field for field in fields]
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
        intermediate_result =dict(result)
        return transform_fields(await follow_relationships(intermediate_result))
    else:
        return None

async def post_job(user_id:str,job:SubmittedJob):

    ins = jobs.insert().values( code=job.code,command=job.command,collab_id=job.collab_id,user_id=user_id,status="submitted",hardware_platform=job.hardware_platform,hardware_config=job.hardware_config,timestamp_submission=now_in_utc())
    compiled_query=str(ins.compile(compile_kwargs={"literal_binds": True}))
    job_id = await database.execute(ins)
    
    query = jobs.select().where(jobs.c.id == job_id)
    result = await database.fetch_one(query)
    if job.input_data is not None:
        await create_job_input_data_item(job,job_id)
    if job.tags is not None:
        list_tags =[item["tag_id"] for item in job.tags or [] ]
        await post_tags(job_id, list_tags)
    return transform_fields(await follow_relationships(dict(result)))

async def put_job(job_id:int,user_id:str,jobPatch:JobPatch):
    query = jobs.select().where(jobs.c.id == job_id)
    job = await database.fetch_one(query)
    ins = jobs.update().where(jobs.c.id == job_id).values(provenance=jobPatch.provenance,resource_usage=jobPatch.resource_usage)
    await database.execute(ins)
    
    query = jobs.select().where(jobs.c.id == job_id)
    result = await database.fetch_one(query)
    if jobPatch.output_data is not None:
        await update_job_output_data_item(result,jobPatch)
    if jobPatch.log is not None:
        await update_log(result,jobPatch)
    return transform_fields(await follow_relationships(dict(result)))

async def delete_job(job_id: int):

    await delete_dataitems(job_id)
    
    # delete job's logs 
    
    query = logs.delete().where(logs.c.job_id == job_id)
    await database.fetch_one(query)

    # delete job's tags

    query = tagged_items.delete().where(tagged_items.c.object_id == job_id)
    await database.fetch_all(query)
    
    # delete the job 
    
    ins = jobs.delete().where(jobs.c.id == job_id)
    result = await database.execute(ins)
    

    return 

async def get_users_count(status: List[str] = None,

    hardware_platform: List[str] = None,
    date_range_start: date = None,
    date_range_end: date = None
):
    filters = []
    if status:
        filters.append(get_list_filter(jobs.c.status,status))

    if hardware_platform:
        filters.append(get_list_filter(jobs.c.hardware_platform, hardware_platform))

    if date_range_start:
        if date_range_end:
            filters.append(jobs.c.timestamp_completion.between(date_range_start,  date_range_end))
        else:
            filters.append(jobs.c.timestamp_submission >= date_range_start)
    elif date_range_end:
        filters.append(jobs.c.timestamp_submission <= date_range_end)

    select_query = slct(func.count(distinct(jobs.c.user_id)))
    query = select_query.where(*filters)

    users_count =  await database.execute(query)
    return int(users_count)


async def get_users_list(status: List[str] = None,

    hardware_platform: List[str] = None,
    date_range_start: date = None,
    date_range_end: date = None
):
    filters = []
    if status:
        filters.append(get_list_filter(jobs.c.status,status))

    if hardware_platform:
        filters.append(get_list_filter(jobs.c.hardware_platform, hardware_platform))

    if date_range_start:
        if date_range_end:
            filters.append(jobs.c.timestamp_completion.between(date_range_start,  date_range_end))
        else:
            filters.append(jobs.c.timestamp_submission >= date_range_start)
    elif date_range_end:
        filters.append(jobs.c.timestamp_submission <= date_range_end)


    select_query = slct(distinct(jobs.c.user_id))
    query = select_query.where(*filters)

    users_list =  await database.fetch_all(query)
    return users_list

async def count_jobs(hardware_platform:List[str]= None,status: List[str] = None,):
    filters = []
    if status:
        filters.append(get_list_filter(jobs.c.status,status))
    if hardware_platform:
        filters.append(get_list_filter(jobs.c.hardware_platform, hardware_platform))
    select_query = slct(func.count(jobs.c.id))
    query = select_query.where(*filters)
    compiled_query=str(query.compile(compile_kwargs={"literal_binds": True}))
    jobs_count =  await database.execute(query)
    return int(jobs_count)

def daterange(start_date, end_date, interval=1):
    for n in range(0, int((end_date - start_date).days), interval):
        yield start_date + timedelta(n)



async def get_tags(job_id: int):
    query = tagged_items.select().where(tagged_items.c.object_id == job_id)
    results = await database.fetch_all(query)
    tags=[]
    for tag_item in results:
        query = taglist.select().where(taglist.c.id == tag_item.tag_id)
        used_tag= await database.fetch_one(query)
        compiled_query=str(query.compile(compile_kwargs={"literal_binds": True}))
        tags.append(Tag(tag_id=tag_item.tag_id,content=used_tag["name"]))
    return tags

async def add_tags_to_job_by_tag_id(job_id: int,tagsList:List[int]):

    for tag_id in tagsList:
        query = tagged_items.select().where(tagged_items.c.tag_id == tag_id,tagged_items.c.object_id==job_id)
        used_tag= await database.fetch_one(query)
        if used_tag is None:
            ins = tagged_items.insert().values( object_id=job_id,tag_id=tag_id,content_type_id=7)
            await database.execute(ins)
        
    
    return await get_tags(job_id)


async def remove_tags(job_id: int,tagsList:List[int]):

    for tag_id in tagsList:

        ins = tagged_items.delete().where(tagged_items.c.tag_id == tag_id,tagged_items.c.object_id==job_id)
        await database.execute(ins)
        
    
    return 


async def add_tags_to_job(job_id: int,tagsList:List[str]):
    results = await add_tags_to_taglist(tagsList)
    for tag in results:
        query = tagged_items.select().where(tagged_items.c.tag_id == tag.tag_id,tagged_items.c.object_id==job_id)
        used_tag= await database.fetch_one(query)
        if used_tag is None:
            ins = tagged_items.insert().values( object_id=job_id,tag_id=tag.tag_id,content_type_id=7)
            await database.execute(ins)
        
    
    return await get_tags(job_id)

async def add_tags_to_taglist(tag_names:List[str]):
    results =[]
    for tag in tag_names:
        query = taglist.select().where(taglist.c.slug == slugify(tag))
        used_tag= await database.fetch_one(query)
        if used_tag is None:
            ins = taglist.insert().values( name=tag,slug=slugify(tag))
            await database.execute(ins)
        query = taglist.select().where(taglist.c.slug == slugify(tag))
        returned_tag= await database.fetch_one(query)  
        results.append(Tag(tag_id=returned_tag["id"],content=returned_tag["name"]))     
    
    return results


async def get_comments(job_id: int):
    query = comments.select().where(comments.c.job_id == job_id)
    results = await database.fetch_all(query)
    return [dict(result) for result in results]

async def get_comment(comment_id: int):
    query = comments.select().where(comments.c.id == comment_id)
    result = await database.fetch_one(query)
    return dict(result)

async def create_comment(job_id: int,user_id:str,new_comment:CommentBody):

    ins = comments.insert().values( content=new_comment.content,created_time=now_in_utc(),user=user_id,job_id=job_id)
    comment_id = await database.execute(ins)
    
    query = comments.select().where(comments.c.id == comment_id)
    result = await database.fetch_one(query)
    return dict(result)

async def update_comment(comment_id: int,job_id: int,user_id:str,created_time:DateTime(timezone=True),new_comment:CommentBody):

    ins = comments.update().where(comments.c.id == comment_id).values( id=comment_id,content=new_comment.content,created_time=created_time,user=user_id,job_id=job_id)
    await database.execute(ins)
    
    query = comments.select().where(comments.c.id == comment_id)
    result = await database.fetch_one(query)
    return dict(result)


async def delete_comment(comment_id: int):

    ins = comments.delete().where(comments.c.id == comment_id)
    result = await database.execute(ins)
    

    return result

async def get_log(job_id: int):
    query = logs.select().where(logs.c.job_id == job_id)
    result = await database.fetch_one(query)
    return dict(result)


async def query_projects(
    status: ProjectStatus = None,
    collab_id: List[str] = None,
    owner_id: List[str] = None,
    #date_range_start: date = None,
    #date_range_end: date = None,
    from_index: int = 0,
    size: int = 10
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
                filters.extend((
                    projects.c.submission_date != None,
                    projects.c.decision_date == None
                ))
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


async def get_project(project_id: UUID):
    query = projects.select().where(projects.c.context == project_id)
    result = await database.fetch_one(query)
    return dict(result)


async def query_quotas(
    project_id: List[str] = None,
    from_index: int = 0,
    size: int = 10
):
    query = quotas.select()
    if project_id:
        query = query.where(get_list_filter(quotas.c.project_id, project_id))
    query = query.offset(from_index).limit(size)
    results = await database.fetch_all(query)
    return [dict(result) for result in results]
