from datetime import datetime, date, timezone
from enum import Enum
from typing import List, Dict
from uuid import UUID
import json
from urllib.parse import urlparse
from pydantic import BaseModel, AnyUrl, constr

from .globals import RESOURCE_USAGE_UNITS
from .data_repositories import repository_lookup_by_host, repository_lookup_by_name


class JobStatus(str, Enum):
    submitted = "submitted"
    validated = "validated"  # unused at the moment
    running = "running"
    mapped = "mapped"  # unused at the moment
    finished = "finished"
    error = "error"
    removed = "removed"


class SessionStatus(str, Enum):
    running = "running"
    finished = "finished"
    error = "error"
    removed = "removed"


class Comment(BaseModel):
    job_id: int = None
    content: str
    user_id: str = None
    timestamp: datetime = None

    @classmethod
    def from_db(cls, comment):
        return {
            "id": comment["id"],
            "job_id": comment["job_id"],
            "content": comment["content"],
            "user_id": comment["user"],
            "timestamp": comment["created_time"],
        }


Tag = constr(min_length=2, max_length=100, strip_whitespace=True)


class CommentBody(BaseModel):
    content: constr(min_length=1, max_length=10000)


class TimeSeries(BaseModel):
    dates: List
    values: List[int]


class DataItem(BaseModel):
    url: AnyUrl
    path: str = None
    content_type: str = None
    size: int = None  # in bytes
    hash: str = None

    @classmethod
    def from_db(cls, data_item, repository_obj=None):
        if (data_item["path"] is None) and repository_obj:
            data_item["path"] = repository_obj.get_path(data_item["url"])
        return cls(**data_item)

    def to_db(self):
        return {
            "url": str(self.url),
            "path": self.path,
            "hash": self.hash,
            "size": self.size,
            "content_type": self.content_type,
        }


class DataSet(BaseModel):
    repository: str
    files: List[DataItem]

    @classmethod
    def from_db(cls, data_items):
        urls = [item["url"] for item in data_items]
        url_parts = urlparse(urls[0])
        repository_obj = repository_lookup_by_host[url_parts.hostname]
        return cls(
            repository=repository_obj.name,
            files=[DataItem.from_db(data_item, repository_obj) for data_item in data_items],
        )

    def to_db(self):
        return [item.to_db() for item in self.files]

    def move_to(self, new_repository, user):
        if new_repository not in repository_lookup_by_name:
            raise ValueError(f"Repository '{new_repository}' does not exist or is not supported")
        repository_obj = repository_lookup_by_name[new_repository]
        self.repository = new_repository
        for file in self.files:
            file.url = repository_obj.copy(file, user)
            # todo: delete from old repository if possible
        return self


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
    collab: str
    input_data: List[DataItem] = None
    hardware_platform: str
    hardware_config: dict = None
    tags: List[Tag] = None

    def to_db(self):
        return {
            "code": self.code,
            "command": self.command,
            "collab_id": self.collab,
            "input_data": [data_item.to_db() for data_item in self.input_data]
            if self.input_data is not None
            else None,
            "hardware_platform": self.hardware_platform,
            "hardware_config": json.dumps(self.hardware_config) if self.hardware_config else None,
            "tags": self.tags,
        }


class AcceptedJob(SubmittedJob):
    id: int
    user_id: str
    status: JobStatus = JobStatus.submitted
    timestamp_submission: datetime = None
    resource_uri: str


class CompletedJob(AcceptedJob):
    output_data: DataSet = None
    provenance: dict = None
    timestamp_completion: datetime = None
    resource_usage: ResourceUsage = None
    comments: List[Comment] = None
    log: str = None


class Job(CompletedJob):
    """Used where we want to return jobs with different statuses"""

    @classmethod
    def from_db(cls, job):
        """Change certain fields that are stored as strings or floats into richer Python types"""
        data = {
            "id": job["id"],
            "code": job["code"],
            "command": job["command"],
            "collab": job["collab_id"],
            "input_data": job["input_data"],
            "hardware_platform": job["hardware_platform"],
            "tags": [tag for tag in job["tags"] if len(tag) > 1],  # filter out invalid tags
        }
        if job["hardware_config"]:
            data["hardware_config"] = json.loads(job["hardware_config"])
        if job["provenance"]:
            data["provenance"] = json.loads(job["provenance"])
        if job["resource_usage"] is not None:  # can be 0.0
            data["resource_usage"] = {
                "value": job["resource_usage"],
                "units": RESOURCE_USAGE_UNITS.get(job["hardware_platform"], "hours"),
            }
        if job["id"]:
            data["resource_uri"] = f"/jobs/{job['id']}"
        for field in ("user_id", "status", "timestamp_submission", "timestamp_completion", "log"):
            if job.get(field, None):
                data[field] = job[field]
        if job["output_data"]:
            data["output_data"] = DataSet.from_db(job["output_data"])
        if job.get("comments", None):
            data["comments"] = [Comment.from_db(comment) for comment in job["comments"]]
        return cls(**data)


class JobPatch(BaseModel):  # todo: rename to JobUpdate
    status: JobStatus
    output_data: DataSet = None
    provenance: dict = None
    resource_usage: ResourceUsage = None
    log: str = None

    def to_db(self):
        values = {
            "status": self.status.value,
        }
        if self.output_data is not None:
            values["output_data"] = self.output_data.to_db()
        if self.provenance is not None:
            values["provenance"] = json.dumps(self.provenance)
        if self.resource_usage is not None:
            values["resource_usage"] = self.resource_usage.value
        if self.log is not None:
            values["log"] = self.log
        if self.status in (JobStatus.finished, JobStatus.error):
            values["timestamp_completion"] = datetime.now(timezone.utc)
        return values


class SessionCreation(BaseModel):
    collab: str
    user_id: str
    hardware_platform: str
    hardware_config: dict = None

    def to_db(self):
        return {
            "collab_id": self.collab,
            "hardware_platform": self.hardware_platform,
            "hardware_config": json.dumps(self.hardware_config),
            "user_id": self.user_id,
            "timestamp_start": datetime.now(timezone.utc),
            "resource_usage": 0.0,
        }


class Session(SessionCreation):
    id: int
    user_id: str
    status: SessionStatus = SessionStatus.running
    timestamp_start: datetime = None
    timestamp_end: datetime = None
    resource_uri: str
    resource_usage: ResourceUsage = None

    @classmethod
    def from_db(cls, session):
        data = {
            "id": session["id"],
            "resource_uri": f"/sessions/{session['id']}",
            "collab": session["collab_id"],
            "status": session["status"],
            "hardware_platform": session["hardware_platform"],
            "user_id": session["user_id"],
            "timestamp_start": session["timestamp_start"],
        }
        if session["hardware_config"]:
            data["hardware_config"] = json.loads(session["hardware_config"])
        if session["resource_usage"] is not None:  # can be 0.0
            data["resource_usage"] = {
                "value": session["resource_usage"],
                "units": RESOURCE_USAGE_UNITS.get(session["hardware_platform"], "hours"),
            }
        if session["timestamp_end"]:
            data["timestamp_end"] = session["timestamp_end"]
        return cls(**data)


class SessionUpdate(BaseModel):
    status: SessionStatus = SessionStatus.running
    resource_usage: ResourceUsage

    def to_db(self):
        values = {"status": self.status.value, "resource_usage": self.resource_usage.value}
        if self.status in (SessionStatus.finished, SessionStatus.error):
            values["timestamp_end"] = datetime.now(timezone.utc)
        return values


# class Config #?


# --- Data models for projects and quotas -----


class QuotaSubmission(BaseModel):
    limit: float  # "Quantity of resources granted"
    platform: str  # "System to which quota applies"
    units: str  # core-hours, wafer-hours, GB

    def to_db(self):
        return {"limit": self.limit, "platform": self.platform, "units": self.units}


class QuotaUpdate(BaseModel):
    limit: float = None  # "Quantity of resources granted"
    usage: float  # "Quantity of resources used"

    def to_db(self):
        return {"limit": self.limit, "usage": self.usage}


class Quota(QuotaSubmission, QuotaUpdate):
    # id: int  # do we need this? or just use resource_uri
    project: str
    resource_uri: str = None

    @classmethod
    def from_db(cls, quota):
        data = {
            # "id": quota["id"],
            "limit": quota["limit"],
            "platform": quota["platform"],
            "units": quota["units"],
            "usage": quota["usage"],
            "resource_uri": f"/projects/{quota['project_id']}/quotas/{quota['id']}",
            "project": f"/projects/{quota['project_id']}",
        }
        return cls(**data)


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
    status: ProjectStatus = ProjectStatus.in_prep

    def to_db(self, owner):
        values = {
            "collab": self.collab,
            "title": self.title,
            "abstract": self.abstract,
            "description": self.description,
            "accepted": False,
            "owner": owner,
        }
        if self.status == ProjectStatus.under_review:
            values["submission_date"] = date.today()
        return values


class Project(ProjectSubmission):
    id: UUID
    owner: str
    submission_date: date = None
    decision_date: date = None
    resource_uri: str
    status: ProjectStatus = ProjectStatus.in_prep
    quotas: List[Quota] = None

    @classmethod
    def _get_status(cls, project):
        if project["submission_date"] is None:
            return ProjectStatus.in_prep
        elif project["accepted"]:
            return ProjectStatus.accepted
        elif project["decision_date"] is None:
            return ProjectStatus.under_review
        else:
            return ProjectStatus.rejected

    @classmethod
    def from_db(cls, project, quotas=None):
        if project is None:
            return None
        if quotas is None:
            quotas = []
        data = {
            "id": project["context"],
            "collab": project["collab"],
            "title": project["title"],
            "abstract": project["abstract"],
            "description": project["description"],
            "owner": project["owner"],
            "submission_date": project["submission_date"],
            "decision_date": project["decision_date"],
            "status": cls._get_status(project),
            "resource_uri": f"/projects/{project['context']}",
            "quotas": [Quota.from_db(quota) for quota in quotas],
        }
        return cls(**data)


class ProjectUpdate(BaseModel):
    title: str = None
    abstract: str = None
    description: str = None
    owner: str = None
    status: ProjectStatus = None

    def to_db(self):
        values = {}
        for field in ("title", "abstract", "description", "owner"):
            value = getattr(self, field)
            if value is not None:
                values[field] = value
        if self.status == ProjectStatus.under_review:
            values["submission_date"] = date.today()
        elif self.status == ProjectStatus.accepted:
            values["accepted"] = True
            values["decision_date"] = date.today()
        elif self.status == ProjectStatus.rejected:
            values["accepted"] = False
            values["decision_date"] = date.today()
        return values


# --- Data models for statistics -----


class DateRangeCount(BaseModel):
    start: date
    end: date
    count: Dict[str, int]


class QueueStatus(BaseModel):
    queue_name: str
    running: int
    submitted: int


class Histogram(BaseModel):
    values: List
    bins: List
    platform: str
    status: str
    scale: str
    max: int
