from datetime import datetime, date
import pytz
from typing import List
import json
import uuid

import databases
from sqlalchemy import Column, ForeignKey, Integer, Float, String, Boolean, DateTime, Date, Table, create_engine, MetaData, literal_column
from sqlalchemy.dialects.postgresql import UUID

from .data_models import ProjectStatus, Project
from . import settings
from .globals import RESOURCE_USAGE_UNITS
from sqlalchemy.ext.declarative import declarative_base

from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import operators, extract

SQLALCHEMY_DATABASE_URL = f"postgresql://{settings.DATABASE_USERNAME}:{settings.DATABASE_PASSWORD}@{settings.DATABASE_HOST}:{settings.DATABASE_PORT}/nmpi"

database = databases.Database(SQLALCHEMY_DATABASE_URL)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
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
    Column("created_time", DateTime(timezone=True), default=now_in_utc, nullable=False),
    Column("user", String(36), nullable=False),
    Column("job_id", Integer, ForeignKey("simqueue_job.id"))
)

logs = Table(
    "simqueue_log",
    metadata,
    Column("job_id", Integer, ForeignKey("simqueue_job.id"), primary_key=True),
    Column("content", String, nullable=False)
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



    
async def put_project_2(project_id, sstart_date, accepted):
     
     status: ProjectStatus = None,
     collab_id: List[str] = None,
     
     
     #date_range_start: date = None,
     #date_range_end: date = None,
     from_index: int = 0,
     size: int = 1000
     filters = []
     
     
     ins = projects.update().where(projects.c.context == project_id).values( decision_date = sstart_date, accepted= accepted)
     await database.execute(ins)
     
   
     
     """
     results = await database.fetch_all(query=projects.select().where(extract("year", projects.c.start_date)<= 2022))
     return [transform_project_fields(dict(result)) for result in results]
     """
    

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


def transform_quotas_fields(quotas):
    quotas["project"] = quotas.pop("project_id")
    return quotas

async def follow_relationships(job):
    # input data
    query = data_items.select().where(data_items.c.id == job_input_data.c.dataitem_id,
                                      job_input_data.c.job_id == job["id"])
    results = await database.fetch_all(query)
    job["input_data"] = [dict(row) for row in results]

    # output data
    query = data_items.select().where(data_items.c.id == job_output_data.c.dataitem_id,
                                      job_output_data.c.job_id == job["id"])
    results = await database.fetch_all(query)
    job["output_data"] = [dict(row) for row in results]
    return job

async def follow_relationships_quotas(id):
    # input data
    query = quotas.select().where(quotas.c.project_id == id)
    await database.execute(query)
    results = await database.fetch_all(query)
   
 
    return [dict(result) for result in results]

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
    
    from_index: int = 0,
    size: int = 10
):
    filters = []
    if status:
        filters.append(jobs.c.status == status)
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

    
    select = jobs.select()
   
    if filters:
        query = select.where(*filters).offset(from_index).limit(size)
    else:
        query = select.offset(from_index).limit(size)

    results = await database.fetch_all(query)
    return [transform_fields(await follow_relationships(dict(result))) for result in results]


async def get_job(job_id: int):
    query = jobs.select().where(jobs.c.id == job_id)
    result = await database.fetch_one(query)
    return transform_fields(await follow_relationships(dict(result)))


async def get_comments(job_id: int):
    query = comments.select().where(comments.c.job_id == job_id)
    results = await database.fetch_all(query)
    return [dict(result) for result in results]


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

async def post_project(project_id,  project, submitted):
     
     status: ProjectStatus = None,
     collab_id: List[str] = None,
     
     #date_range_start: date = None,
     #date_range_end: date = None,
     from_index: int = 0,
     size: int = 1000
     filters = []
     if submitted==True:
       Ssubmission_date = date.today()
     else:
       Ssubmission_date = None
     ins = projects.insert().values( context  = project_id,  collab = project['collab'], owner= project['owner'], title = project['title'] , abstract = project['abstract'], description= project['description'], duration = project['duration'],  accepted = project['accepted'], submission_date=Ssubmission_date)
     await database.execute(ins)
    
async def get_all_quotas(
    status: ProjectStatus = None,
    collab_id: List[str] = None,
    owner_id: List[str] = None,
    #date_range_start: date = None,
    #date_range_end: date = None,
    from_index: int = 0,
    size: int = 10
):

    query = quotas.select()
    await database.execute(query)
    results = await database.fetch_all(query)
    return [dict(result) for result in results]
async def put_project(project_id,  projectR):
     
     status: ProjectStatus = None,
     collab_id: List[str] = None,
     
     
     #date_range_start: date = None,
     #date_range_end: date = None,
     from_index: int = 0,
     size: int = 1000
     filters = []
     
     
     ins = projects.update().where(projects.c.context == project_id).values(  collab = projectR['collab'], owner= projectR['owner'], title = projectR['title'] , abstract = projectR['abstract'], description= projectR['description'], duration = projectR['duration'], start_date=projectR['start_date'],   accepted = projectR['accepted'], submission_date= projectR['submission_date'],  decision_date= projectR['decision_date'])
     await database.execute(ins)
     
    
     
     
     """
     results = await database.fetch_all(query=projects.select().where(extract("year", projects.c.start_date)<= 2022))
     return [transform_project_fields(dict(result)) for result in results]
     """
    
async def get_project(project_id):
    query = projects.select().where(projects.c.context == project_id)
    
    result = await database.fetch_one(query)
    return transform_project_fields(dict(result))


async def query_quotas(
    project_id,
    from_index: int = 0,
    size: int = 10
):
    
    
    if project_id:
        query = quotas.select().where(quotas.c.project_id == project_id)
        query = query.offset(from_index).limit(size)
    
    results = await database.fetch_all(query)
    return [(dict(result)) for result in results]
async def query_onequota(
    project_id,
    id
):
    
    
    
    query = quotas.select().where(quotas.c.id == id) 
        
    
    results = await database.fetch_one(query)
    return dict(results)
        
async def post_quotas( project_id, quota):
    
    
    ins= quotas.insert().values( project_id  = project_id,  units=quota.units, limit=quota.limit, usage=quota.usage, platform=quota.platform)
    await database.execute(ins)
    
async def put_quotas( project_id, quota, id):
    
    
    ins= quotas.update().where(quotas.c.id == id).values( project_id  = project_id,  id= id,  units=quota['units'], limit=quota['limit'], usage=quota['usage'], platform=quota['platform'])
    await database.execute(ins)    
