from datetime import datetime, date
import pytz
from typing import List
from uuid import UUID
import json

from sqlalchemy import create_engine, Column, ForeignKey, Integer, Float, String, DateTime, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship

from . import settings
from .globals import RESOURCE_USAGE_UNITS

SQLALCHEMY_DATABASE_URL = f"postgresql://{settings.DATABASE_USERNAME}:{settings.DATABASE_PASSWORD}@{settings.DATABASE_HOST}:{settings.DATABASE_PORT}/nmpi"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db_session():
    db_session = SessionLocal()
    try:
        yield db_session
    finally:
        db_session.close()


def now_in_utc():
    return datetime.now(pytz.UTC)


job_output_data = Table('simqueue_job_output_data', Base.metadata,
    Column('job_id', ForeignKey('simqueue_job.id'), primary_key=True),
    Column('dataitem_id', ForeignKey('simqueue_dataitem.id'), primary_key=True)
)


class DataItem(Base):
    __tablename__ = "simqueue_dataitem"
    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(1000))
    generated_by = relationship("Job", secondary="simqueue_job_output_data", back_populates="output_data")


class Job(Base):
    __tablename__ = "simqueue_job"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, nullable=False)
    command = Column(String(200), nullable=False)
    collab_id = Column(String(40), nullable=False)
    user_id = Column(String(36), nullable=False)
    status = Column(String(15), default="submitted", nullable=False)
    #input_data = Column(ManyToManyField('DataItem', related_name="input_to", blank=True)
    output_data = relationship("DataItem", secondary="simqueue_job_output_data", back_populates="generated_by")
    hardware_platform = Column(String(20), nullable=False)
    hardware_config_str = Column("hardware_config", String)
    timestamp_submission = Column(DateTime(timezone=True), default=now_in_utc, nullable=False)
    timestamp_completion = Column(DateTime(timezone=True))
    provenance_str = Column("provenance", String)
    resource_usage_value = Column("resource_usage", Float)

    @property
    def resource_usage(self):
        return {
            "value": self.resource_usage_value,
            "units": RESOURCE_USAGE_UNITS.get(self.hardware_platform, "hours")
        }

    @property
    def hardware_config(self):
        return json.load(self.hardware_config_str)

    @property
    def provenance(self):
        return json.load(self.provenance_str)


def query_jobs(
    db: Session,
    status: str = None,
    #tag: List[str] = None,
    #project_id: List[str] = None,
    user_id: List[str] = None,
    hardware_platform: List[str] = None,
    date_range_start: date = None,
    date_range_end: date = None,
    from_index: int = 0,
    size: int = 100
):
    filters = []
    if status:
        filters.append(Job.status == status)
    if user_id:
        if len(user_id) > 0:
            filters.append(Job.user_id.in_(user_id))
        else:
            filters.append(Job.user_id == user_id[0])
    if hardware_platform:
        if len(hardware_platform) > 0:
            filters.append(Job.hardware_platform.in_(hardware_platform))
        else:
            filters.append(Job.hardware_platform == hardware_platform[0])
    if date_range_start:
        if date_range_end:
            filters.append(Job.timestamp_submission.between(date_range_start,  date_range_end))
        else:
            filters.append(Job.timestamp_submission >= date_range_start)
    elif date_range_end:
        filters.append(Job.timestamp_submission <= date_range_end)

    if filters:
        return db.query(Job).filter(*filters).offset(from_index).limit(size).all()
    else:
        return db.query(Job).offset(from_index).limit(size).all()
