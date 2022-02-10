
from datetime import datetime
from enum import Enum
from typing import List
from uuid import UUID
import json

#from fairgraph.brainsimulation import SimulationConfiguration

from pydantic import BaseModel, HttpUrl, AnyUrl, validator, ValidationError
from fastapi.encoders import jsonable_encoder
from fastapi import HTTPException, status



class JobStatus(str, Enum):
    submitted = "submitted"
    validated = "validated"  # unused at the moment
    running = "running"
    mapped = "mapped"  # unused at the moment
    finished = "finished"
    error = "error"
    removed = "removed"


class Log(BaseModel):
    content: str
    job_id: UUID


class DataItem(BaseModel):
    url: AnyUrl
    content_type: str = None
    size: int = None  # in bytes
    hash: str = None

    class Config:
        orm_mode = True


class ResourceUsage(BaseModel):
    value: float
    units: str


class SubmittedJob(BaseModel):
    """
    Job

    Each job has an entry with all the required information to be run on the hardware.
    """
    code: str
    command: str = None
    collab_id: str
    #input_data: List[DataItem] = None
    hardware_platform: str
    hardware_config: dict = None
    #tags: List[str] = None

    # @validator("hardware_config", "provenance", pre=True)
    # def convert_str(cls, value):
    #     if isinstance(value, str):
    #         return json.loads(value)
    #     return value


class AcceptedJob(SubmittedJob):
    id: int
    user_id: str
    status: JobStatus = JobStatus.submitted
    timestamp_submission: datetime = None

    class Config:
        orm_mode = True


class CompletedJob(AcceptedJob):
    output_data: List[DataItem] = None
    provenance: dict = None
    timestamp_completion: datetime = None
    resource_usage: ResourceUsage = None
    #log: str = None


class Job(CompletedJob):
    """Used where we want to return jobs with different statuses"""
    pass


class JobPatch(BaseModel):
    status: JobStatus
    output_data: List[DataItem] = None
    provenance: dict = None
    resource_usage: ResourceUsage = None
    log: str = None


class Comment(BaseModel):
    job_id: UUID = None
    content: str
    user_id: str
    timestamp: datetime = None


class CommentBody(BaseModel):
    content: str

#sclass Config #?


class ProjectStatus(str, Enum):
    in_prep = "in preparation"
    accepted = "accepted"
    under_review = "under review"
    rejected = "rejected"


class ProjectSubmission(BaseModel):
    collab: str
    title: str
    abstract: str
    description: str = None


class Project(ProjectSubmission):
    id: UUID
    owner: str
    duration: int = None
    start_date: datetime = None
    accepted: bool = False
    submission_date: datetime = None
    decision_date: datetime = None

    def status(self):
        if self.submission_date is None:
            return ProjectStatus.in_prep
        elif self.accepted:
            return ProjectStatus.accepted
        elif self.decision_date is None:
            return ProjectStatus.under_review
        else:
            return ProjectStatus.rejected


class Quota(BaseModel):
    units: str     # core-hours, wafer-hours, GB
    limit: float   # "Quantity of resources granted"
    usage: float   # "Quantity of resources used"
    platform: str  # "System to which quota applies")
    project_id: UUID
