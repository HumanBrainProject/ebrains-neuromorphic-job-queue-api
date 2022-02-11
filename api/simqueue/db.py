from datetime import datetime, date
import pytz
from typing import List
from uuid import UUID
import json

import databases
from sqlalchemy import Column, ForeignKey, Integer, Float, String, DateTime, Table, MetaData
from sqlalchemy.sql import select

from . import settings
from .globals import RESOURCE_USAGE_UNITS

SQLALCHEMY_DATABASE_URL = f"postgresql://{settings.DATABASE_USERNAME}:{settings.DATABASE_PASSWORD}@{settings.DATABASE_HOST}:{settings.DATABASE_PORT}/nmpi"

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
    Column("command", String(200), nullable=False),
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


def get_list_filter(attr, value):
    if len(value) > 0:
        return attr.in_(value)
    else:
        return attr == value[0]


async def query_jobs(
    status: str = None,
    #tag: List[str] = None,
    collab_id: List[str] = None,
    user_id: List[str] = None,
    hardware_platform: List[str] = None,
    date_range_start: date = None,
    date_range_end: date = None,
    from_index: int = 0,
    size: int = 100
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

    if filters:
        query = jobs.select().where(*filters).offset(from_index).limit(size)
    else:
        query = jobs.select().offset(from_index).limit(size).all()

    results = await database.fetch_all(query)
    return [transform_fields(await follow_relationships(dict(result))) for result in results]


async def get_job(job_id: int):
    query = jobs.select().where(jobs.c.id == job_id)
    return await database.fetch_one(query)
