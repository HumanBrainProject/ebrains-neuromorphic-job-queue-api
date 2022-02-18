from typing import List
from datetime import date, timedelta
from collections import defaultdict
import logging
import numpy as np

from fastapi import APIRouter, Depends, Query, Path

from ..data_models import (DateRangeCount)
from .. import db, oauth
from ..globals import STANDARD_QUEUES


logger = logging.getLogger("simqueue")

router = APIRouter()


@router.get("/statistics/job-count", response_model=List[DateRangeCount])
async def job_count(
    start: date = None,
    end: date = None,
    interval: int = 7
):
    """
    Number of jobs for each backend in a given time period
    """
    if start is None:
        today = date.today()
        end = date(today.year, today.month, today.day)
        start = end - timedelta(30)

        results = []
        counts = defaultdict(lambda: 0)
        for platform in STANDARD_QUEUES:
            completion_timestamps = await db.query_jobs(
                status=("finished", "error"),
                hardware_platform=[platform],
                date_range_start=start,
                date_range_end=end,
                size=100000,
                fields=["timestamp_completion"]
            )
            completed = np.array([(timestamp.date() - start).days
                                  for timestamp in completion_timestamps])
            counts[platform], bin_edges = np.histogram(
                completed,
                bins=np.arange(0, (end - start).days, interval))

        for i, days in enumerate(bin_edges[:-1]):
            count = {}
            for platform in counts:
                count[platform] = counts[platform][i]
            results.append({
                "start": start + timedelta(int(days)),  # timedelta doesn't like numpy int64
                "end": start + timedelta(interval + days),
                "count": count
            })
        return results



# class CumulativeJobCountResource(StatisticsResource):
#     """
#     Cumulative number of jobs for each backend in a given time period
#     """
#     start_date = fields.DateField(attribute="start_date")
#     end_date = fields.DateField(attribute="end_date")
#     counts = fields.DictField(attribute="counts")

#     class Meta:
#         resource_name = "statistics/cumulative-job-count"
#         list_allowed_methods = ['get']
#         detail_allowed_methods = []

#     def get_object_list(self, request):
#         if "start" in request.GET:
#             period_start = datetime(*map(int, request.GET["start"].split("-")), tzinfo=pytz.UTC)
#             period_end = datetime(*map(int, request.GET["end"].split("-")), tzinfo=pytz.UTC)
#         else:
#             today = date.today()
#             period_end = datetime(today.year, today.month, today.day, tzinfo=pytz.UTC)
#             period_start = period_end - timedelta(30)
#         interval = int(request.GET.get("interval", 7))

#         assert isinstance(period_start, datetime)
#         assert isinstance(period_end, datetime)
#         assert isinstance(interval, int)

#         results = []
#         counts = defaultdict(lambda: 0)
#         for platform in STANDARD_QUEUES:
#             jobs = Job.objects.filter(status__in=('finished', 'error'),
#                                       hardware_platform=platform,
#                                       timestamp_completion__range=(period_start, period_end)
#                                      ).values('timestamp_completion')
#             completed = np.array([(job['timestamp_completion'] - period_start).days
#                                   for job in jobs])
#             counts[platform], bin_edges = np.histogram(completed,
#                                                        bins=np.arange(0, (period_end - period_start).days, interval))

#         count_cumul = defaultdict(lambda: 0)
#         for i, days in enumerate(bin_edges[:-1]):
#             start = period_start + timedelta(int(days))
#             end = start + timedelta(interval)
#             for platform in counts:
#                 count_cumul[platform] += counts[platform][i]
#             new_obj = DateRangeCount(start, end, count_cumul)
#             results.append(new_obj)
#         return results


# class CumulativeUserCountResource(StatisticsResource):
#     """
#     Cumulative number of platform users
#     """
#     dates = fields.DateField(attribute="dates")
#     values = fields.ListField(attribute="values")

#     class Meta:
#         resource_name = "statistics/cumulative-user-count"
#         list_allowed_methods = []
#         detail_allowed_methods = ['get']

#     def obj_get(self, bundle, **kwargs):
#         users = Job.objects.values("user_id").distinct()
#         first_job_dates = []
#         query = Job.objects
#         if  "platform" in bundle.request.GET:
#             query = query.filter(hardware_platform=bundle.request.GET["platform"])
#         for n, user in enumerate(users):
#             user_id = user['user_id']
#             first_job = query.filter(user_id=user_id).first()
#             if first_job:
#                 first_job_dates.append(first_job.timestamp_submission.date())
#         first_job_dates.append(date.today())
#         user_counts = list(range(1, len(first_job_dates)))
#         user_counts.append(user_counts[-1])  # repeat last value for today's date
#         return TimeSeries(dates=sorted(first_job_dates),
#                           values=user_counts)

#     def prepend_urls(self):
#         return [
#             url(r"^(?P<resource_name>%s)/$" % self._meta.resource_name, self.wrap_view('dispatch_detail'), name="api_dispatch_detail"),
#         ]


# class ActiveUserCountResource(StatisticsResource):
#     """
#     Number of platform users who have submitted at least one job in the last 90 days
#     """
#     start_date = fields.DateField(attribute="start_date")
#     end_date = fields.DateField(attribute="end_date")
#     counts = fields.DictField(attribute="counts")

#     class Meta:
#         resource_name = "statistics/active-user-count"
#         list_allowed_methods = ['get']
#         detail_allowed_methods = []

#     def get_object_list(self, request):
#         if "start" in request.GET:
#             period_start = datetime(*map(int, request.GET["start"].split("-")), tzinfo=pytz.UTC)
#             period_end = datetime(*map(int, request.GET["end"].split("-")), tzinfo=pytz.UTC)
#         else:
#             today = date.today()
#             period_end = datetime(today.year, today.month, today.day, tzinfo=pytz.UTC)
#             period_start = period_end - timedelta(30)
#         interval = int(request.GET.get("interval", 7))

#         date_list = list(daterange(period_start, period_end, interval))
#         date_list.append(period_end)
#         results = []
#         for end in date_list[:-1]:
#             start = end - timedelta(90)
#             active_users = {}
#             for platform in STANDARD_QUEUES:
#                 active_users[platform] = Job.objects.filter(hardware_platform=platform,
#                                                             timestamp_completion__range=(start, end)).values("user_id").distinct().count()
#             # note that the "total" value may be less than the sum of the per-platform values, since some users use multiple platforms
#             #active_users["total"] = Job.objects.filter(timestamp_completion__range=(start, end)).values("user_id").distinct().count()
#             new_obj = DateRangeCount(start, end, active_users)
#             results.append(new_obj)
#         return results



# class QueueLength(StatisticsResource):
#     """
#     Number of jobs in each queue (submitting and running)
#     """
#     name = fields.CharField(attribute="name")
#     running = fields.IntegerField(attribute="running")
#     submitted = fields.IntegerField(attribute="submitted")

#     class Meta:
#         resource_name = "statistics/queue-length"
#         list_allowed_methods = ['get']
#         detail_allowed_methods = []

#     def get_object_list(self, request):
#         queue_lengths = []
#         running_jobs = Job.objects.filter(status="running")
#         submitted_jobs = Job.objects.filter(status="submitted")
#         for queue_name in STANDARD_QUEUES:
#             r = running_jobs.filter(hardware_platform=queue_name).count()
#             s = submitted_jobs.filter(hardware_platform=queue_name).count()
#             queue_lengths.append(QueueStatus(queue_name, running=r, submitted=s))
#         return queue_lengths


# class JobDuration(StatisticsResource):
#     """
#     Histograms of total job duration (from submission to completion)
#     for completed jobs and for error jobs
#     """
#     status = fields.CharField(attribute="status")
#     platform = fields.CharField(attribute="platform")
#     values = fields.ListField(attribute="values")
#     bins = fields.ListField(attribute="bins")
#     max = fields.FloatField(attribute="max")

#     class Meta:
#         resource_name = "statistics/job-duration"
#         list_allowed_methods = ['get']
#         detail_allowed_methods = []

#     def get_object_list(self, request):
#         n_bins = int(request.GET.get("bins", 50))
#         scale = request.GET.get("scale", "linear")
#         requested_max = request.GET.get("max", None)

#         all_jobs = Job.objects.annotate(duration=ExpressionWrapper(F('timestamp_completion') - F('timestamp_submission'),
#                                                                    output_field=DurationField()))
#         job_durations = []
#         for status in ("finished", "error"):
#             for platform in STANDARD_QUEUES:
#                 durations = [x['duration'].total_seconds()
#                              for x in all_jobs.filter(status=status, hardware_platform=platform).values('duration')
#                              if x['duration'] is not None]
#                 durations = np.array(durations)
#                 negative_durations = (durations < 0)
#                 if negative_durations.any():
#                     n_neg = negative_durations.sum()
#                     logger.warning("There were {} negative durations ({}%) for status={} and platform={}".format(
#                                         n_neg, 100*n_neg/durations.size, status, platform))
#                     durations = durations[~negative_durations]
#                 if durations.size > 0:
#                     if requested_max is None:
#                         max = (durations.max()//n_bins + 1) * n_bins
#                     else:
#                         max = float(requested_max)
#                     if scale == "log":
#                         log_bins = np.linspace(0, np.ceil(np.log10(max)), n_bins)
#                         values = np.histogram(np.log10(durations), bins=log_bins)[0]
#                         #bins = np.power(10, log_bins)
#                         bins = log_bins
#                     else:  # linear, whatever the value of `scale`
#                         values, bins = np.histogram(durations, bins=n_bins, range=(0, max))
#                     job_durations.append(
#                         Histogram(platform=platform,
#                                   status=status,
#                                   values=values.tolist(),
#                                   bins=bins,
#                                   scale=scale,
#                                   max=max))
#         return job_durations


# class ProjectCountResource(StatisticsResource):
#     """
#     Cumulative number of collabs for which at least one resource allocation request has been made and accepted
#     """
#     submitted = fields.DictField(attribute="submitted")
#     accepted = fields.DictField(attribute="accepted")
#     rejected = fields.DictField(attribute="rejected")

#     class Meta:
#         resource_name = "statistics/cumulative-project-count"
#         list_allowed_methods = []
#         detail_allowed_methods = ['get']

#     def obj_get(self, bundle, **kwargs):
#         projects = Project.objects.all().order_by('submission_date')
#         dates = {
#             "submitted": [],
#             "accepted": [],
#             "rejected": []
#         }
#         counts = {"submitted": [0],
#                   "accepted": [0],
#                   "rejected": [0]}
#         for project in projects:
#             counts["submitted"].append(counts["submitted"][-1] + 1)
#             dates["submitted"].append(project.submission_date)
#             if project.decision_date:
#                 if project.accepted:
#                     counts["accepted"].append(counts["accepted"][-1] + 1)
#                     dates["accepted"].append(project.submission_date)
#                 else:
#                     counts["rejected"].append(counts["rejected"][-1] + 1)
#                     dates["rejected"].append(project.submission_date)

#         return GenericContainer(**{
#             "submitted": dict(dates=dates["submitted"], values=counts["submitted"][1:]),
#             "accepted": dict(dates=dates["accepted"], values=counts["accepted"][1:]),
#             "rejected": dict(dates=dates["rejected"], values=counts["rejected"][1:]),
#         })

#     def prepend_urls(self):
#         return [
#             url(r"^(?P<resource_name>%s)/$" % self._meta.resource_name, self.wrap_view('dispatch_detail'), name="api_dispatch_detail"),
#         ]


# class QuotaUsageResource(StatisticsResource):
#     """
#     Cumulative quota usage
#     """

#     start_date = fields.DateField(attribute="start_date")
#     end_date = fields.DateField(attribute="end_date")
#     counts = fields.DictField(attribute="counts")

#     class Meta:
#         resource_name = "statistics/resource-usage"
#         list_allowed_methods = ['get']
#         detail_allowed_methods = []

#     def get_object_list(self, request):
#         if "start" in request.GET:
#             period_start = datetime(*map(int, request.GET["start"].split("-")), tzinfo=pytz.UTC)
#             period_end = datetime(*map(int, request.GET["end"].split("-")), tzinfo=pytz.UTC)
#         else:
#             today = date.today()
#             period_end = datetime(today.year, today.month, today.day, tzinfo=pytz.UTC)
#             period_start = period_end - timedelta(30)
#         interval = int(request.GET.get("interval", 7))

#         assert isinstance(period_start, datetime)
#         assert isinstance(period_end, datetime)
#         assert isinstance(interval, int)

#         results = []
#         counts = defaultdict(lambda: 0.0)
#         n_bins = (period_end - period_start).days//interval + 1
#         for platform in STANDARD_QUEUES:
#             jobs = Job.objects.filter(status__in=('finished', 'error'),
#                                       hardware_platform=platform,
#                                       timestamp_completion__range=(period_start, period_end)
#                                      ).values('timestamp_completion', 'resource_usage')
#             completed = np.array([(job['timestamp_completion'] - period_start).days
#                                   for job in jobs])
#             #counts[platform], bin_edges = np.histogram(completed,
#             #                                           bins=np.arange(0, (period_end - period_start).days, interval))
#             resource_usage = np.array([job['resource_usage'] for job in jobs])
#             index = completed//interval
#             counts[platform] = np.zeros((n_bins,))
#             for i, usage in zip(index, resource_usage):
#                 if usage is not None:
#                     counts[platform][i] += usage

#         count_cumul = defaultdict(lambda: 0.0)
#         for i in range(n_bins):
#             start = period_start + timedelta(i * interval)
#             end = start + timedelta(interval)
#             for platform in STANDARD_QUEUES:
#                 count_cumul[platform] += counts[platform][i]
#             new_obj = DateRangeCount(start, end, count_cumul)
#             results.append(new_obj)
#         return results
