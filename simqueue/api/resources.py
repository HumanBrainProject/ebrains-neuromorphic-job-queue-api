"""
Definition of Resources for the Job Queue REST API

"""

from datetime import date, datetime, timedelta
import logging
from collections import Counter, defaultdict
import pytz

from django.conf.urls import url
from django.core.mail import send_mail
from django.http import HttpResponseForbidden, HttpResponseNotFound
from django.contrib.auth.models import User
from django.db.models import DurationField, F, ExpressionWrapper

from tastypie.resources import Resource, ModelResource
from tastypie import fields
from tastypie.authentication import MultiAuthentication, Authentication
from tastypie.authorization import Authorization
from tastypie.serializers import Serializer
from tastypie.exceptions import NotFound, Unauthorized, ImmediateHttpResponse

import numpy as np

from ..models import DataItem, Job, Log
from .auth import CollabAuthorization, HBPAuthentication, ProviderAuthentication
from quotas.models import Quota

# J.D.
from django.shortcuts import render_to_response
from django.template.context import RequestContext
from django.http import HttpResponse
from django.contrib.auth.decorators import login_required
import json
import requests
from hbp_app_python_auth.auth import get_access_token, get_token_type
from django.conf import settings

# import os.path
import os
import tempfile
import shutil
import mimetypes
from simqueue.models import Job
try:
    from urlparse import urlparse
    from urllib import urlretrieve
except ImportError:  # Py3
    from urllib.parse import urlparse
    from urllib.request import urlretrieve
import errno

import re
import zipfile
# end J.D.

CODE_MAX_LENGTH = 10000
STANDARD_QUEUES = ("BrainScaleS", "BrainScaleS-ESS", "Spikey", "SpiNNaker")

logger = logging.getLogger("simqueue")


def is_provider(self, request):
    for backend in self.backends:
        if backend.is_provider(request):
            return True
    return False
MultiAuthentication.is_provider = is_provider


class ISO8601UTCOffsetSerializer(Serializer):
    """
    Default is ``iso-8601``, which looks like "2014-01-21T19:31:58.150273+00:00".
    """
    # Tastypie>=0.9.6,<=0.11.0
    def format_datetime(self, data):
        # data = make_naive(data) # Skipping this line..
        if self.datetime_formatting == 'iso-8601-strict':
            # Remove microseconds to strictly adhere to iso-8601
            data = data - datetime.timedelta(microseconds=data.microsecond)

        return data.isoformat()


class DataItemResource(ModelResource):

    class Meta:
        queryset = DataItem.objects.all()
        resource_name = 'dataitem'
        authentication = Authentication()
        authorization = Authorization()
        # todo: authentication = MultiAuthentication(ProviderAuthentication(), HBPAuthentication())
        # todo: authorization = CollabAuthorization()
        list_allowed_methods = ['get', 'post']  # you can retrieve all items and add item
        # you can retrieve and modify each item
        detail_allowed_methods = ['get', 'put', 'patch', 'delete']
        always_return_data = False

    def prepend_urls(self):
        return [
            url(r"^(?P<resource_name>%s)/last$" % self._meta.resource_name, self.wrap_view('get_last'), name="api_get_last"),
        ]

    def get_last(self, request, **kwargs):
        obj = DataItem.objects.all().order_by('-id')[0:]
        return super(DataItemResource, self).get_detail(request, id=obj[0].pk)



# JOB views: QUEUE and RESULTS
# The status flag determines to which view each job belongs.
# Jobs can be moved by a patch command.
# No delete http verb is allowed, it is just patched to a status 'R'emoved

def get_quotas(collab, platform):
    return Quota.objects.filter(platform=platform,
                                project__collab=collab)  # todo: exclude exhausted quotas


class ErrorWithHttpResponse(Exception):

    def __init__(self, message="forbidden"):
        self.message = message
        self.response = HttpResponseForbidden(message)


class QuotaInsufficientError(ErrorWithHttpResponse):
    pass


class QuotaAbsentError(ErrorWithHttpResponse):
    pass


class BaseJobResource(ModelResource):

    def obj_delete(self, bundle, **kwargs):
        bundle.data['status'] = 'removed'
        return super(BaseJobResource, self).obj_update(bundle, **kwargs)

    def authorized_read_detail(self, object_list, bundle):
        """
        Handles checking of permissions to see if the user has authorization
        to GET this resource.

        Over-riding version from parent class because we want to allow raising
        NotFound errors.
        """
        try:
            auth_result = self._meta.authorization.read_detail(object_list, bundle)
            if not auth_result is True:
                raise Unauthorized()
        except Unauthorized as e:
            self.unauthorized_result(e)
        except NotFound as e:
            raise ImmediateHttpResponse(response=HttpResponseNotFound())

        return auth_result

    def authorized_update_detail(self, object_list, bundle):
        """
        Handles checking of permissions to see if the user has authorization
        to PUT this resource.

        Over-riding version from parent class because we want to allow raising
        NotFound errors.
        """
        try:
            auth_result = self._meta.authorization.update_detail(object_list, bundle)
            if auth_result is not True:
                raise Unauthorized()
        except Unauthorized as e:
            #self.unauthorized_result(e)
            raise ImmediateHttpResponse(response=HttpResponseForbidden())
        except NotFound as e:
            raise ImmediateHttpResponse(response=HttpResponseNotFound())

        return auth_result

# QUEUE contains unfinished jobs (jobs whose status is not 'finished', 'error' or 'removed')
# You can only put, get and patch (to another status) jobs using this view
class QueueResource(BaseJobResource):
    input_data = fields.ToManyField(DataItemResource, "input_data", blank=True, full=True, use_in="detail")
    output_data = fields.ToManyField(DataItemResource, "output_data", blank=True, full=True, use_in="detail")
    hardware_config = fields.DictField(attribute="hardware_config", blank=True, null=True, use_in="detail")
    collab_id = fields.CharField(attribute="collab_id", blank=False, null=False)
    provenance = fields.DictField(attribute="provenance", blank=True, null=True, use_in="detail")

    class Meta:
        queryset = Job.objects.exclude(status__in=["removed", "error", "finished"]).order_by('-timestamp_submission')
        object_class = Job
        authentication = MultiAuthentication(ProviderAuthentication(), HBPAuthentication())
        authorization = CollabAuthorization()
        serializer = ISO8601UTCOffsetSerializer(formats=['json'])
        resource_name = "queue"  # TODO: copy this class with another resource_name and filterQ applied
        list_allowed_methods = ['get', 'post'] # you can retrieve all items and add item
        detail_allowed_methods = ['get', 'put', 'patch', 'delete'] # you can retrieve and modify each item
        filtering = {
            'status': ['exact'],
            'id': ['exact'],
            'collab_id': ['exact'],
            'user_id': ['exact'],
            'hardware_platform': ['exact']
        }
        always_return_data = False
        #paginator_class = Paginator

    def hydrate_collab_id(self, bundle):
        if ("code" in bundle.data  # ignore this for update status
              and not bundle.data.get("collab_id", None)):
            # this just checks collab_id isn't blank
            # should maybe check that collab actually exists
            raise fields.ApiFieldError("The `collab_id` field must not be empty")
        return bundle

    def hydrate_hardware_platform(self, bundle):
        if ("code" in bundle.data  # ignore this for update status
              and not bundle.data.get("hardware_platform", None)):
            # this checks hardware_platform isn't blank
            raise fields.ApiFieldError("The `hardware_platform` field must not be empty")
        return bundle

    #def hydrate_code(self, bundle):
    #    # this could be a good place to use PyFlakes, or something, just to check valid syntax

    def prepend_urls(self):
        return [
            url(r"^(?P<resource_name>%s)/(?P<pk>\d+)/$" % self._meta.resource_name, self.wrap_view('dispatch_detail'), name="api_dispatch_detail"),
            url(r"^(?P<resource_name>%s)/(?P<status>[\w\d_.-]+)/$" % self._meta.resource_name, self.wrap_view('dispatch_list'), name="api_dispatch_list"),
            url(r"^(?P<resource_name>%s)/(?P<status>[\w\d_.-]+)/(?P<pk>\d+)/$" % self._meta.resource_name, self.wrap_view('dispatch_detail'), name="api_dispatch_detail"),
            url(r"^(?P<resource_name>%s)/submitted/next/(?P<hardware_platform>[\w\d_.-]+)/$" % self._meta.resource_name, self.wrap_view('get_next'), name="api_get_next"),
        ]

    def obj_create(self, bundle, **kwargs):
        # todo: check user is either an HBP member or has permission to use the platform
        selected_tab = str(bundle.data.get('selected_tab'))
        logger.info("selected tab : " + selected_tab)
        logger.info("code : "+str(bundle.data.get("code")))
        logger.info("hardware_config : "+str(bundle.data.get("hardware_config")))
        if selected_tab == "upload_script" :
            self.copy_code_file_from_collab_storage(bundle);
        self._check_quotas(bundle)
        #return super(QueueResource, self).obj_create(bundle, **kwargs)

    def copy_code_file_from_collab_storage(self, bundle):#request, job_id):
        # upload local files to collab storage
        from bbp_client.oidc.client import BBPOIDCClient
        from bbp_client.document_service.client import Client as DocClient
        import bbp_services.client as bsc
        services = bsc.get_services()

        request = bundle.request
        
        access_token = get_access_token(request.user.social_auth.get())
        oidc_client = BBPOIDCClient.bearer_auth(services['oidc_service']['prod']['url'], access_token)
        doc_client = DocClient(services['document_service']['prod']['url'], oidc_client)

        collab_id = bundle.data.get('collab_id', None)
        collab_id_str = str(collab_id)
        # logger.debug("collab_id : "+collab_id_str)

        local_dir = tempfile.mkdtemp()
        collab_id_dir = "/"+collab_id_str
        project = doc_client.get_project_by_collab_id(collab_id)
        root = doc_client.get_path_by_id(project["_uuid"])
        collab_path = os.path.join(local_dir, collab_id_dir)

        headers = {'Authorization': self._get_auth_header(request)}
        # logger.info("header : "+headers)
        req = requests.get(str(bundle.data.get("code")), headers=headers)
        req_infos = json.loads(req.text)

        req_content = requests.get(str(bundle.data.get("code"))+"/content/download", headers=headers)
        # logger.info("file type : "+str(req_infos['_contentType']))
        # creation of destination directory
        dir_code_file = os.mkdir(local_dir + root)
        dir_code_file = os.mkdir(local_dir + root + collab_path)

        # text file
        if re.search("text" , str(req_infos['_contentType'])):
            os.chdir(local_dir + root + collab_path)
            file_content_code = open(str(req_infos['_name']), "w")
            file_content_code.write(req_content.text)
            file_content_code.close()
            # logger.info("file modified")
        # binary file
        else:
            os.chdir(local_dir + root + collab_path)
            # logger.info("req content : "+str(req_content.content))
            file_content_bin = open(str(req_infos['_name']), "w")
            file_content_bin.write(req_content.content)
            file_content_bin.close()
            # logger.info("file modified")
        return False


    def _check_quotas(self, bundle):
        collab = bundle.data.get('collab_id', None)
        platform = bundle.data.get('hardware_platform', None)
        if collab and platform:  # if either of these are missing, we pass through,
                                 # as the error response will be generated later
            logger.info("Creating job in collab {} for {}".format(collab, platform))
            quotas = get_quotas(collab, platform)  # there could be multiple projects and hence multiple quotas
            logger.info("Quotas: {}".format(quotas))
            requested_resources = 0.0  # or get from submitted job
            if quotas:
                insufficient_quota = True
                for quota in quotas:
                    available_resources = quota.limit - quota.usage
                    if available_resources >= requested_resources:
                        insufficient_quota = False
                        if ('hardware_config' not in bundle.data
                              or bundle.data['hardware_config'] is None):
                            bundle.data['hardware_config'] = {}
                        bundle.data['hardware_config']['resource_allocation_id'] = quota.pk
                        logger.info("Using quota {}".format(quota))
                        break  # take quota from the first project in the list
                if insufficient_quota:
                    logger.info("Insufficient quota")
                    raise QuotaInsufficientError("Insufficient quota")  # --> 403
            else:
                logger.info("No quotas")
                msg = "You do not have a compute time allocation for the {} platform. Please submit a resource request.".format(
                    platform)
                raise QuotaAbsentError(msg)  # --> 403

    def _send_email(self, bundle):
        users = User.objects.filter(social_auth__uid=bundle.data['user_id'])

        if len(users) > 0:
            email = users[0].email
            if len(users) > 1:
                logger.warning("Multiple users found with the same oidc id.")
            if email:
                logger.info("Sending e-mail about job #{} to {}".format(str(bundle.data['id']), bundle.request.user.email))
                logs_list = Log.objects.filter(pk=bundle.data['id'])
                if len(logs_list) == 0:
                    logs_content = " "
                else:
                    logs_lines = logs_list[0].content.split("\n")
                    nb_lines = len(logs_lines)
                    logs_content = ""
                    for (i, item) in enumerate(logs_lines):
                        if (i == 11):
                            logs_content = logs_content + "\n" + "..................."
                        if (i < 10) | (i>=(nb_lines-10)):
                            logs_content = logs_content + "\n" +item
                subject = 'NMPI: job ' + str(bundle.data['id']) + ' ' + bundle.data['status']
                content = subject + "\n" + str(logs_content)
                try:
                    send_mail(
                        subject,
                        content,
                        'hbp.nmpi@gmail.com',  # sender
                        [email],  # recipient
                        fail_silently=False
                    )

                except Exception as err:
                    logger.error(err)
            else:
                logger.info("E-mail not available for user {}".format(users[0].username))
        else:
            logger.error("User matching job owner {} not found.".format(bundle.data['user_id']))


    def obj_update(self, bundle, **kwargs):
        # update quota usage
        update = super(QueueResource, self).obj_update(bundle, **kwargs)
        logger.info("Updating status of job {} to {}".format(bundle.data['id'], bundle.data['status']))
        if bundle.data['status'] in ('finished', 'error'):
            self._send_email(bundle)
            resources_used = bundle.data['resource_usage']
            logger.debug("Resources used: {}".format(resources_used))
            if resources_used is not None:
                quota_id = bundle.data['hardware_config']['resource_allocation_id']
                quota = Quota.objects.get(pk=quota_id)
                quota.usage += resources_used/3600.0  # convert from seconds to hours
                quota.save()
            logger.info("E-mail sent and quota updated")
        else:
            logger.info("Doing nothing for status {}".format(bundle.data['status']))
        return update

    def get_next(self, request, **kwargs):
        if self._meta.authentication.is_provider(request):
            platform = kwargs.pop('hardware_platform')
            obj = Job.objects.filter(status='submitted', hardware_platform=platform).order_by('timestamp_submission').first()
            if obj is None:
                data = {'warning': 'No queued job.'}
                return self.create_response(request, data)
            # return super(QueueResource, self).get_detail(request, id=obj.pk)
            bundle = self.build_bundle(obj=obj, request=request)
            bundle = self.full_dehydrate(bundle)
            bundle = self.alter_detail_data_to_serialize(request, bundle)
            return self.create_response(request, bundle)
        else:
            return HttpResponseForbidden("You do not have permission to access this endpoint.")

    def authorized_create_detail(self, object_list, bundle):
        """
        Handles checking of permissions to see if the user has authorization
        to POST this resource.

        Over-riding version from parent class because we want to allow raising
        Forbidden errors.
        """
        try:
            auth_result = self._meta.authorization.create_detail(object_list, bundle)
            if auth_result is not True:
                raise ImmediateHttpResponse(response=HttpResponseForbidden("You do not have permission to create a job"))
        except Unauthorized as e:
            self.unauthorized_result(e)

        return auth_result

    def _get_auth_header(self, request):
        '''return authentication header'''
        return '%s %s' % (request.user.social_auth.get().extra_data['token_type'],
                          self._get_access_token(request))

    def _get_access_token(self, request):
        return request.user.social_auth.get().extra_data['access_token']


# RESULTS contains finished jobs (jobs whose status is either 'finished' or 'error')
# You can only get and patch (to another status) jobs using this view
class ResultsResource(BaseJobResource):
    input_data = fields.ToManyField(DataItemResource, "input_data", full=True, null=True, use_in="detail")
    output_data = fields.ToManyField(DataItemResource, "output_data", full=True, null=True, use_in="detail")
    hardware_config = fields.DictField(attribute="hardware_config", blank=True, null=True, use_in="detail")
    provenance = fields.DictField(attribute="provenance", blank=True, null=True, use_in="detail")

    class Meta:
        queryset = Job.objects.filter(status__in=['finished', 'error']).order_by('-timestamp_submission')
        authentication = MultiAuthentication(ProviderAuthentication(), HBPAuthentication())
        authorization = CollabAuthorization()
        serializer = ISO8601UTCOffsetSerializer(formats=['json'])
        resource_name = "results"
        list_allowed_methods = ['get']  # you can only retrieve the list
        # you can retrieve and modify each item
        detail_allowed_methods = ['get', 'put', 'patch', 'delete']
        always_return_data = False
        filtering = {
            'status': ['exact'],
            'id': ['exact'],
            'collab_id': ['exact'],
            'hardware_platform': ['exact']
        }

    def dehydrate_code(self, bundle):
        """Limit the maximum size of the 'code' field."""
        if len(bundle.data['code']) > CODE_MAX_LENGTH:
            return bundle.data['code'][:CODE_MAX_LENGTH] + "\n\n...truncated..."
        else:
            return bundle.data['code']

class LogResource(ModelResource):
    class Meta:
        queryset = Log.objects.all()
        resource_name = 'log'
        authentication = Authentication()
        authorization = Authorization()
        # todo: authentication = MultiAuthentication(ProviderAuthentication(), HBPAuthentication())
        # todo: authorization = CollabAuthorization()
        list_allowed_methods = ['post']
        # you can retrieve and modify each item
        detail_allowed_methods = ['get', 'put', 'patch', 'delete']
        always_return_data = False


class DateRangeCount(object):

    def __init__(self, start, end, counts):
        self.start_date = start.date()
        self.end_date = end.date()
        self.counts = counts.copy()


class DateValue(object):

    def __init__(self, when, value):
        self.date = when.date()
        self.value = value

    def __str__(self):
        return "({}, {})".format(self.date, self.value)

    def __repr__(self):
        return self.__str__()


class TimeSeries(object):

    def __init__(self, dates, values):
        self.dates = dates
        self.values = values


class QueueStatus(object):

    def __init__(self, name, submitted, running):
        self.name = name
        self.submitted = submitted
        self.running = running


class Histogram(object):

    def __init__(self, values, bins, platform, status, scale='linear', max=None):
        self.values = values
        self.bins = bins[:-1]  # left-hand edges
        self.platform = platform
        self.status = status
        self.scale = scale
        if max is None:
            max = bins[-1]
        self.max = max


def daterange(start_date, end_date, interval=1):
    for n in range(0, int((end_date - start_date).days), interval):
        yield start_date + timedelta(n)



class StatisticsResource(Resource):
    """
    Base class
    """

    def obj_get_list(self, bundle, **kwargs):
        return self.get_object_list(bundle.request)

    def dehydrate_resource_uri(self, bundle):
        return ''


class JobCountResource(StatisticsResource):
    """
    Number of jobs for each backend in a given time period
    """
    start_date = fields.DateField(attribute="start_date")
    end_date = fields.DateField(attribute="end_date")
    counts = fields.DictField(attribute="counts")

    class Meta:
        resource_name = "statistics/job-count"
        list_allowed_methods = ['get']
        detail_allowed_methods = []

    def get_object_list(self, request):
        if "start" in request.GET:
            period_start = datetime(*map(int, request.GET["start"].split("-")), tzinfo=pytz.UTC)
            period_end = datetime(*map(int, request.GET["end"].split("-")), tzinfo=pytz.UTC)
        else:
            today = date.today()
            period_end = datetime(today.year, today.month, today.day, tzinfo=pytz.UTC)
            period_start = period_end - timedelta(30)
        interval = int(request.GET.get("interval", 1))

        date_list = list(daterange(period_start, period_end, interval))
        date_list.append(period_end)
        results = []
        for start, end in zip(date_list[:-1], date_list[1:]):
            job_counts = {}
            for platform in STANDARD_QUEUES:
                job_counts[platform] = Job.objects.filter(status__in=('finished', 'error'),
                                                          hardware_platform=platform,
                                                          timestamp_completion__range=(start, end)).count()
            new_obj = DateRangeCount(start, end, job_counts)
            results.append(new_obj)
        return results


class CumulativeJobCountResource(StatisticsResource):
    """
    Cumulative number of jobs for each backend in a given time period
    """
    start_date = fields.DateField(attribute="start_date")
    end_date = fields.DateField(attribute="end_date")
    counts = fields.DictField(attribute="counts")

    class Meta:
        resource_name = "statistics/cumulative-job-count"
        list_allowed_methods = ['get']
        detail_allowed_methods = []

    def get_object_list(self, request):
        if "start" in request.GET:
            period_start = datetime(*map(int, request.GET["start"].split("-")), tzinfo=pytz.UTC)
            period_end = datetime(*map(int, request.GET["end"].split("-")), tzinfo=pytz.UTC)
        else:
            today = date.today()
            period_end = datetime(today.year, today.month, today.day, tzinfo=pytz.UTC)
            period_start = period_end - timedelta(30)
        interval = int(request.GET.get("interval", 1))

        date_list = list(daterange(period_start, period_end, interval))
        date_list.append(period_end)
        results = []
        job_counts = Counter()
        for start, end in zip(date_list[:-1], date_list[1:]):
            for platform in STANDARD_QUEUES:
                job_counts[platform] += Job.objects.filter(status__in=('finished', 'error'),
                                                           hardware_platform=platform,
                                                           timestamp_completion__range=(start, end)).count()
            new_obj = DateRangeCount(start, end, job_counts)
            results.append(new_obj)
        return results


class CumulativeUserCountResource(StatisticsResource):
    """
    Cumulative number of platform users
    """
    dates = fields.DateField(attribute="dates")
    values = fields.ListField(attribute="values")

    class Meta:
        resource_name = "statistics/cumulative-user-count"
        list_allowed_methods = []
        detail_allowed_methods = ['get']

    def obj_get(self, bundle, **kwargs):
        users = Job.objects.values("user_id").distinct()
        first_job_dates = []
        for n, user in enumerate(users):
            user_id = user['user_id']
            first_job_dates.append(Job.objects.filter(user_id=user_id).first().timestamp_submission.date())
        first_job_dates.append(date.today())
        user_counts = list(range(1, len(users) + 1))
        user_counts.append(user_counts[-1])  # repeat last value for today's date
        return TimeSeries(dates=sorted(first_job_dates),
                          values=user_counts)

    def prepend_urls(self):
        return [
            url(r"^(?P<resource_name>%s)/$" % self._meta.resource_name, self.wrap_view('dispatch_detail'), name="api_dispatch_detail"),
        ]


class QueueLength(StatisticsResource):
    """
    Number of jobs in each queue (submitting and running)
    """
    name = fields.CharField(attribute="name")
    running = fields.IntegerField(attribute="running")
    submitted = fields.IntegerField(attribute="submitted")

    class Meta:
        resource_name = "statistics/queue-length"
        list_allowed_methods = ['get']
        detail_allowed_methods = []

    def get_object_list(self, request):
        queue_lengths = []
        running_jobs = Job.objects.filter(status="running")
        submitted_jobs = Job.objects.filter(status="submitted")
        for queue_name in STANDARD_QUEUES:
            r = running_jobs.filter(hardware_platform=queue_name).count()
            s = submitted_jobs.filter(hardware_platform=queue_name).count()
            queue_lengths.append(QueueStatus(queue_name, running=r, submitted=s))
        return queue_lengths


class JobDuration(StatisticsResource):
    """
    Histograms of total job duration (from submission to completion)
    for completed jobs and for error jobs
    """
    status = fields.CharField(attribute="status")
    platform = fields.CharField(attribute="platform")
    values = fields.ListField(attribute="values")
    bins = fields.ListField(attribute="bins")
    max = fields.FloatField(attribute="max")

    class Meta:
        resource_name = "statistics/job-duration"
        list_allowed_methods = ['get']
        detail_allowed_methods = []

    def get_object_list(self, request):
        n_bins = int(request.GET.get("bins", 50))
        scale = request.GET.get("scale", "linear")
        requested_max = request.GET.get("max", None)

        all_jobs = Job.objects.annotate(duration=ExpressionWrapper(F('timestamp_completion') - F('timestamp_submission'),
                                                                   output_field=DurationField()))
        job_durations = []
        for status in ("finished", "error"):
            for platform in STANDARD_QUEUES:
                durations = [x['duration'].total_seconds()
                             for x in all_jobs.filter(status=status, hardware_platform=platform).values('duration')
                             if x['duration'] is not None]
                durations = np.array(durations)
                negative_durations = (durations < 0)
                if negative_durations.any():
                    n_neg = negative_durations.sum()
                    logger.warning("There were {} negative durations ({}%) for status={} and platform={}".format(
                                        n_neg, 100*n_neg/durations.size, status, platform))
                    durations = durations[~negative_durations]
                if durations.size > 0:
                    if requested_max is None:
                        max = (durations.max()//n_bins + 1) * n_bins
                    else:
                        max = float(requested_max)
                    if scale == "log":
                        log_bins = np.linspace(0, np.ceil(np.log10(max)), n_bins)
                        values = np.histogram(np.log10(durations), bins=log_bins)[0]
                        #bins = np.power(10, log_bins)
                        bins = log_bins
                    else:  # linear, whatever the value of `scale`
                        values, bins = np.histogram(durations, bins=n_bins, range=(0, max))
                    job_durations.append(
                        Histogram(platform=platform,
                                  status=status,
                                  values=values.tolist(),
                                  bins=bins,
                                  scale=scale,
                                  max=max))
        return job_durations


# timeseries
#    [x] job counts
#    [x] cumulative job counts
#    [x] users
#    [ ] resources


# instantaneous
#    [x] queue-size

# histograms
#    [ ] job duration
#    [ ] log size (!)
#    [ ] code size (?)
