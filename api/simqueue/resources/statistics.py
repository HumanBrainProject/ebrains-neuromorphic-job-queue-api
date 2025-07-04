import asyncio
from typing import List
from datetime import date, timedelta
from collections import defaultdict, Counter
import logging
import numpy as np

from fastapi import APIRouter, Depends, Query, HTTPException, status as status_codes
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from ..data_models import (
    DateRangeCount,
    DateRangeQuantity,
    TimeSeries,
    QueueStatus,
    Histogram,
    ProjectStatus,
    UserStatistics,
)
from .. import db, oauth

from ..globals import STANDARD_QUEUES


logger = logging.getLogger("simqueue")

router = APIRouter()
auth = HTTPBearer()


def normalize_start_end(start: date = None, end: date = None):
    today = date.today()
    if (start is None) and (end is None):
        end = today
        start = end - timedelta(30)
    elif start is None:
        start = end - timedelta(30)
    elif end is None:
        end = today
    return start, end


@router.get("/statistics/job-count", response_model=List[DateRangeCount])
async def job_count(start: date = None, end: date = None, interval: int = 7):
    """
    Number of jobs for each backend in a given time period
    """
    start, end = normalize_start_end(start, end)

    results = []
    counts = defaultdict(lambda: 0)
    for platform in STANDARD_QUEUES:
        completion_timestamps = await db.query_jobs(
            status=["finished", "error"],
            hardware_platform=[platform],
            date_range_start=start,
            date_range_end=end,
            size=100000,
            fields=["timestamp_completion"],
        )

        completed = np.array(
            [
                (timestamp["timestamp_completion"].date() - start).days
                for timestamp in completion_timestamps
                if timestamp["timestamp_completion"]
            ],
            dtype=int,
        )
        counts[platform], bin_edges = np.histogram(
            completed, bins=np.arange(0, (end - start).days + 1, interval)
        )  # the + 1 is because `bins` must include the right-most edge
    for i, days in enumerate(bin_edges[:-1]):
        count = {}
        for platform in counts:
            count[platform] = counts[platform][i]
        results.append(
            {
                "start": start + timedelta(int(days)),  # timedelta doesn't like numpy int64
                "end": start + timedelta(int(interval + days)),
                "count": count,
            }
        )
    return results


@router.get("/statistics/cumulative-job-count", response_model=List[DateRangeCount])
async def cumulative_job_count(start: date = None, end: date = None, interval: int = 7):
    """
    Cumulative number of jobs for each backend in a given time period
    """
    cumulative_job_counts = await job_count(start=start, end=end, interval=interval)
    count_cumul = defaultdict(lambda: 0)
    for entry in cumulative_job_counts:
        for platform, value in entry["count"].items():
            count_cumul[platform] += value
            entry["count"][platform] = count_cumul[platform]
    return cumulative_job_counts


@router.get("/statistics/cumulative-user-count", response_model=TimeSeries)
async def cumulative_user_count(
    hardware_platform: List[str] = Query(
        None, description="hardware platform (e.g. SpiNNaker, BrainScales)"
    )
):
    """
    Cumulative number of platform users
    """

    users = await db.get_users_list()
    first_job_dates = []
    for user in users:
        first_submissions_timestamp = await db.query_jobs(
            user_id=[user["user_id"]],
            hardware_platform=hardware_platform,
            size=1,
            fields=["timestamp_submission"],
        )
        if first_submissions_timestamp:
            first_job_dates.append(first_submissions_timestamp[0]["timestamp_submission"].date())
    first_job_dates.append(date.today())
    user_counts = list(range(1, len(first_job_dates)))
    user_counts.append(user_counts[-1])  # repeat last value for today's date
    return TimeSeries(dates=sorted(first_job_dates), values=user_counts)


@router.get("/statistics/active-user-count", response_model=List[DateRangeCount])
async def active_user_count(start: date = None, end: date = None, interval: int = 7):
    """
    Number of platform users who have submitted at least one job in the last 90 days
    """
    start, end = normalize_start_end(start, end)
    results = []
    date_list = list(db.daterange(start, end, interval))
    date_list.append(end)
    for start_date, end_date in zip(date_list[:-1], date_list[1:]):
        start_active_period = end_date - timedelta(90)
        active_users = {}
        for platform in STANDARD_QUEUES:
            active_users[platform] = await db.get_users_count(
                hardware_platform=[platform],
                date_range_start=start_active_period,
                date_range_end=end_date,
            )
        # note that the "total" value may be less than the sum of the per-platform values,
        # since some users use multiple platforms
        results.append(
            {
                "start": start_date,  # timedelta doesn't like numpy int64
                "end": end_date,
                "count": active_users,
            }
        )

    return results


@router.get("/statistics/queue-length", response_model=List[QueueStatus])
async def queue_length():
    """
    Number of jobs in each queue (submitting and running)
    """

    queue_lengths = []
    for queue_name in STANDARD_QUEUES:
        r = await db.count_jobs(hardware_platform=[queue_name], status=["running"])
        s = await db.count_jobs(hardware_platform=[queue_name], status=["submitted"])
        queue_lengths.append(QueueStatus(queue_name=queue_name, running=r, submitted=s))

    return queue_lengths


@router.get("/statistics/job-duration", response_model=List[Histogram])
async def job_duration(requested_max: int = None, n_bins: int = 50, scale: str = "linear"):
    """
    Histograms of total job duration (from submission to completion)
    for completed jobs and for error jobs
    """
    job_durations = []
    for status in ["finished", "error"]:
        for platform in STANDARD_QUEUES:
            completed_jobs = await db.query_jobs(
                status=[status],
                hardware_platform=[platform],
                size=100000,
                fields=["timestamp_completion", "timestamp_submission"],
            )

            durations = np.array(
                [
                    (job["timestamp_completion"] - job["timestamp_submission"]).seconds
                    for job in completed_jobs
                    if (job["timestamp_completion"] is not None)
                    and (job["timestamp_submission"] is not None)
                ]
            )
            negative_durations = durations < 0
            if negative_durations.any():
                n_neg = negative_durations.sum()
                logger.warning(
                    "There were {} negative durations ({}%) for status={} and platform={}".format(
                        n_neg, 100 * n_neg / durations.size, status, platform
                    )
                )
                durations = durations[~negative_durations]
            if durations.size > 0:
                if requested_max is None:
                    max = (durations.max() // n_bins + 1) * n_bins
                else:
                    max = float(requested_max)
                if scale == "log":
                    log_bins = np.linspace(0, np.ceil(np.log10(max)), n_bins)
                    values = np.histogram(np.log10(durations), bins=log_bins)[0]
                    # bins = np.power(10, log_bins)
                    bins = log_bins
                else:  # linear, whatever the value of `scale`
                    values, bins = np.histogram(durations, bins=n_bins, range=(0, max))
                job_durations.append(
                    Histogram(
                        platform=platform,
                        status=status,
                        values=values.tolist(),
                        bins=bins.tolist(),
                        scale=scale,
                        max=max,
                    )
                )

    return job_durations


@router.get("/statistics/cumulative-project-count", response_model=TimeSeries)
async def cumulative_project_count(
    status: ProjectStatus = Query(
        description="Project status (accepted, rejected, ...)",
        default=ProjectStatus.accepted,
    )
):
    """
    Cumulative number of projects (resource requests) with a given status
    """

    submission_dates = [
        res["submission_date"]
        for res in await db.query_projects(fields=["submission_date"], status=status, size=10000)
    ]

    submission_dates.append(date.today())
    project_counts = list(range(1, len(submission_dates)))
    project_counts.append(project_counts[-1])  # repeat last value for today's date
    return TimeSeries(dates=sorted(submission_dates), values=project_counts)


@router.get("/statistics/resource-usage", response_model=List[DateRangeQuantity])
async def resource_usage(start: date = None, end: date = None, interval: int = 7):
    """
    Cumulative quota usage
    """
    start, end = normalize_start_end(start, end)

    results = []
    usage_per_interval = defaultdict(lambda: 0.0)
    n_bins = (end - start).days // interval + 1
    for platform in STANDARD_QUEUES:
        completed_jobs = await db.query_jobs(
            status=["finished", "error"],
            hardware_platform=[platform],
            date_range_start=start,
            date_range_end=end,
            size=100000,
            fields=["timestamp_completion", "resource_usage"],
        )
        completed = np.array(
            [
                (job["timestamp_completion"].date() - start).days
                for job in completed_jobs
                if job["timestamp_completion"]
            ],
            dtype=int,
        )
        usage_per_job = np.array(
            [job["resource_usage"] for job in completed_jobs if job["timestamp_completion"]]
        )
        index = completed // interval
        usage_per_interval[platform] = np.zeros((n_bins,))
        for i, usage in zip(index, usage_per_job):
            if usage is not None:
                usage_per_interval[platform][i] += usage

    usage_cumul = defaultdict(lambda: 0.0)
    for i in range(n_bins):
        interval_start = start + timedelta(i * interval)
        interval_end = interval_start + timedelta(interval)
        for platform in STANDARD_QUEUES:
            usage_cumul[platform] += usage_per_interval[platform][i]
        new_obj = {"start": interval_start, "end": interval_end, "value": usage_cumul.copy()}
        results.append(new_obj)

    return results


@router.get("/statistics/per-user", response_model=List[UserStatistics])
async def resource_usage(
    start: date = None, end: date = None, token: HTTPAuthorizationCredentials = Depends(auth)
):
    """
    Statistics at the level of individual users (only accessible by platform administrators)
    """
    user = await asyncio.create_task(oauth.User.from_token(token.credentials))
    if not user.is_admin:
        raise HTTPException(
            status_code=status_codes.HTTP_403_FORBIDDEN,
            detail="Only admins can access per-user statistics",
        )
    jobs = await db.query_jobs(
        status=["finished", "error"],
        date_range_start=start,
        date_range_end=end,
        size=100000,
        fields=["user_id"],
    )
    jobs_per_user = Counter(job["user_id"] for job in jobs)
    return [
        UserStatistics(user=user_name, jobs=count) for user_name, count in jobs_per_user.items()
    ]
