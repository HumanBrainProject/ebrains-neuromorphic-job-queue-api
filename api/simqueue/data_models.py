
from datetime import datetime, date
from enum import Enum
from typing import List, Dict
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


class Comment(BaseModel):
    job_id: int = None
    content: str
    user_id: str = None
    timestamp: datetime = None


class Tag(BaseModel):
    tag_id: int = None
    content: str = None


class CommentBody(BaseModel):
    content: str

class TimeSeries(BaseModel):
    dates: List
    values:List[int]

class DataItem(BaseModel):
    url: AnyUrl
    content_type: str = None
    size: int = None  # in bytes
    hash: str = None


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
    input_data: List[DataItem] = None
    hardware_platform: str
    hardware_config: dict = None
    tags: List[Tag] = None


class AcceptedJob(SubmittedJob):
    id: int
    user_id: str
    status: JobStatus = JobStatus.submitted
    timestamp_submission: datetime = None


class CompletedJob(AcceptedJob):
    output_data: List[DataItem] = None
    provenance: dict = None
    timestamp_completion: datetime = None
    resource_usage: ResourceUsage = None
    comments: List[Comment] = None
    log: str = None


class Job(CompletedJob):
    """Used where we want to return jobs with different statuses"""
    pass


class JobPatch(BaseModel):
    status: JobStatus
    output_data: List[DataItem] = None
    provenance: dict = None
    resource_usage: ResourceUsage = None
    log: str = None


# class Config #?


class ProjectStatus(str, Enum):
    in_prep = "in preparation"
    accepted = "accepted"
    under_review = "under review"
    rejected = "rejected"
    # todo: consider adding "expired"


class ProjectSubmission(BaseModel):
    collab: str
    title: str
    abstract: str
    description: str = None

class ProjectUpdate(ProjectSubmission):
   
    
    duration: int = None
    status: str
    submitted: bool= False
class QuotaSubmission(BaseModel):
    limit: float   # "Quantity of resources granted"
    platform: str  # "System to which quota applies"
    units: str

class QuotaUpdate(BaseModel):
    limit: float  # "Quantity of resources granted"
    usage: float  # "Quantity of resources used"
    
class Quota(QuotaSubmission, QuotaUpdate):
    
    
    
    resource_uri: str= None     
    
    
class QuotaPK(Quota):
     id: UUID
     project_id: UUID
class Project(ProjectSubmission):
    id:UUID
    owner: str
    duration: int = None
    start_date: date = None
    accepted: bool = False
    submission_date: date = None
    decision_date: date = None
    resource_uri: str= None
    quotas: List[Quota]=None
    def status(self):
        if self.submission_date is None:
            return ProjectStatus.in_prep
        elif self.accepted:
            return ProjectStatus.accepted
        elif self.decision_date is None:
            return ProjectStatus.under_review
        else:
            return ProjectStatus.rejected


    


  

class DateRangeCount(BaseModel):
    start: date
    end: date
    count: Dict[str, int]


class QueueStatus(BaseModel):
    queue_name:str
    running:int
    submitted:int

class Histogram(BaseModel):
    values:List
    bins:List
    platform:str
    status:str
    scale:str
    max:int