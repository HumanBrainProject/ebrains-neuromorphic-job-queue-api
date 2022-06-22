"""
Definition of Resources for the Job Queue REST API

"""

from datetime import date, datetime, timedelta
import logging
from collections import Counter, defaultdict
import os
import tempfile
import shutil
import re
import pytz
import json
import requests

from django.conf.urls import url
from django.core.mail import send_mail
from django.http import HttpResponseForbidden, HttpResponseNotFound
from django.contrib.auth.models import User
from django.db.models import DurationField, F, ExpressionWrapper, Sum
from django.conf import settings

from tastypie.resources import Resource, ModelResource, ALL
from tastypie import fields
from tastypie.authentication import MultiAuthentication, Authentication
from tastypie.authorization import Authorization
from tastypie.serializers import Serializer
from tastypie.exceptions import NotFound, Unauthorized, ImmediateHttpResponse

import numpy as np

import ebrains_drive

from ..utils import copy_code_from_collab_drive
from ..models import DataItem, Job, Log, Comment
from taggit.models import Tag
from .auth import CollabAuthorization, EBRAINSAuthentication, ProviderAuthentication
from quotas.models import Quota, Project


CODE_MAX_LENGTH = 15000
STANDARD_QUEUES = ("BrainScaleS", "BrainScaleS-ESS", "Spikey", "SpiNNaker", "BrainScaleS-2")

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
    tags = fields.ListField()

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

    def dehydrate_tags(self, bundle):
        """
        Extract tags to display them as a list of strings
        """
        return [tag.name for tag in bundle.obj.tags.all()]

    def save_m2m(self, bundle):
        """
        Save tags
        """
        tags = bundle.data.get('tags', [])
        bundle.obj.tags.set(*tags)
        return super(BaseJobResource, self).save_m2m(bundle)


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
        authentication = MultiAuthentication(ProviderAuthentication(), EBRAINSAuthentication())
        authorization = CollabAuthorization()
        serializer = ISO8601UTCOffsetSerializer(formats=['json'])
        resource_name = "queue"  # TODO: copy this class with another resource_name and filterQ applied
        list_allowed_methods = ['get', 'post'] # you can retrieve all items and add item
        detail_allowed_methods = ['get', 'put', 'patch', 'delete'] # you can retrieve and modify each item
        filtering = {
            'tags': ALL,
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
        if selected_tab == "upload_script":
            # bundle.data["code"] = self.copy_code_file_from_collab_storage(bundle)
            bundle.data["code"] = self.copy_code_from_collab_drive(bundle)
            # putting the temporary download path in the code field is not ideal.
            # perhaps we can temporarily store the collab file id somewhere, and
            # restore it once the job has been launched
        self._check_quotas(bundle)
        return super(QueueResource, self).obj_create(bundle, **kwargs)
        
    def copy_code_from_collab_drive(self, bundle):
        """
        Download code from Collab storage
        """
        import ebrains_drive
        
        access_token = bundle.request.META.get('HTTP_AUTHORIZATION').replace("Bearer ", "")
        ebrains_drive_client = ebrains_drive.connect(token=access_token)

        entity_id = bundle.data.get("code")
        print('entity_id', entity_id)
        local_dir = settings.TMP_FILE_ROOT
        # print(os.path.isdir(local_dir))
        if(not os.path.isdir(local_dir)): 
            os.mkdir(local_dir)
        # print(os.path.isdir(local_dir))
        # print(local_dir)
        os.chdir(local_dir)
        temp_dir = tempfile.mkdtemp(dir=local_dir)
        basename_temp_dir = os.path.basename(temp_dir)
        print('he',temp_dir)
        # print('she',bundle.data.get('id'))
        os.chdir(temp_dir)
        print(len(entity_id))
        # for item in range(2, len(splitted_path)):
        for item in entity_id:
            print(item)
            repo_obj = ebrains_drive_client.repos.get_repo(item[3])
            entity_type = item[1]
            entity_name = item[0]
            collab_path = item[2].split('/')
            # print(collab_path)
            my_path = ''
            for d in range(2, len(collab_path)):
                my_path += '/'+collab_path[d]
            my_path += '/'+entity_name
            print(my_path)
            if entity_type == 'file':
                content = repo_obj.get_file(my_path).get_content()
                ext = item[0].split('.')[-1]
                if ext == 'ipynb' and len(entity_id)==1:
                    content = self.filter_ipynb_content(content)
                    return content
                else:
                    with open(entity_name, "wb") as fp:
                        fp.write(content)
                    if ext in ('zip', 'tgz', 'gz') and len(entity_id)==1:
                        print(os.path.basename(temp_dir))
                        temporary_url = bundle.request.build_absolute_uri(settings.TMP_FILE_URL +
                                                                          basename_temp_dir + '/' +
                                                                          entity_name)
                        content = temporary_url
                        print(content)
                print(os.listdir())
            elif entity_type == 'dir':
                my_dir = repo_obj.get_dir(my_path)
                my_dir.download(name='temp.zip')
                shutil.unpack_archive('temp.zip')
                print(os.listdir())
                os.remove('temp.zip')
                print(os.listdir())
                # print(repo_obj.__dict__)
            else:
                raise ValueError("Can't handle entity type '{}'".format(entity_type))
            
        shutil.make_archive(temp_dir, 'zip',
                            root_dir=temp_dir)
                            # base_dir='.')
        filename = basename_temp_dir + ".zip"
        shutil.rmtree(temp_dir)
        # Test the content of the archive; should be without parent directory
        # os.chdir(settings.TMP_FILE_ROOT)
        # shutil.unpack_archive(basename_temp_dir + '.zip')
        temporary_url = bundle.request.build_absolute_uri(settings.TMP_FILE_URL + filename)
        print(temporary_url)
        return temporary_url

    def filter_ipynb_content(self, content_in):
        cells = json.loads(content_in)["cells"]
        logger.debug(content_in)
        sections = []
        for cell in cells:
            if cell["cell_type"] == "code":
                sections.append("".join(cell["source"]))
            elif cell["cell_type"] == "markdown":
                sections.append('"""\n' + "".join(cell["source"]) + '\n"""')
        content_out = "\n\n".join(sections)
        logger.debug(content_out)
        return content_out

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
                msg = "You do not have a compute time allocation for the {} platform in collab {}. Please submit a resource request.".format(
                    platform, collab)
                raise QuotaAbsentError(msg)  # --> 403

    def _send_email(self, bundle):
        users = User.objects.filter(social_auth__uid=bundle.data['user_id'])

        if len(users) > 0:
            email = users[0].email
            if len(users) > 1:
                logger.warning("Multiple users found with the same oidc id.")
            if email:
                logger.info("Sending e-mail about job #{} to {}".format(str(bundle.data['id']), email))
                log_list = Log.objects.filter(pk=bundle.data['id'])
                if log_list.count() == 0:
                    log_content = ""
                else:
                    log_lines = log_list[0].content.split("\n")
                    nb_lines = len(log_lines)
                    if nb_lines <= 100:
                        log_content = "\n".join(log_lines)
                    else:
                        log_content = "\n".join(log_lines[:30])
                        log_content += "\n\n.  .  .\n\n"
                        log_content += "\n".join(log_lines[-70:])
                subject = '[HBP Neuromorphic] job ' + str(bundle.data['id']) + ' ' + bundle.data['status']
                content = 'HBP Neuromorphic Computing Platform: Job {} {}\n\n'.format(bundle.data['id'],
                                                                                      bundle.data['status'])
                target_url = "https://collab.humanbrainproject.eu/#/collab/{}".format(bundle.data['collab_id'])
                if bundle.data['provenance'] and 'collaboratory' in bundle.data['provenance']:
                    target_url += "/nav/{}?state=job.{}".format(bundle.data['provenance']['collaboratory'].get('nav_item', 'unknown'),
                                                                bundle.data['id'])
                content += target_url + "\n\n"
                content += log_content
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
            logger.debug(str(bundle.data))
            if "timestamp_completion" not in bundle.data or not bundle.data["timestamp_completion"]:
                bundle.obj.timestamp_completion = datetime.now()
                bundle.obj.save()
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


# RESULTS contains finished jobs (jobs whose status is either 'finished' or 'error')
# You can only get and patch (to another status) jobs using this view
class ResultsResource(BaseJobResource):
    comments = fields.ToManyField('simqueue.api.resources.CommentResource', 'comments', null=True, full=True)
    input_data = fields.ToManyField(DataItemResource, "input_data", full=True, null=True, use_in="detail")
    output_data = fields.ToManyField(DataItemResource, "output_data", full=True, null=True, use_in="detail")
    hardware_config = fields.DictField(attribute="hardware_config", blank=True, null=True, use_in="detail")
    provenance = fields.DictField(attribute="provenance", blank=True, null=True, use_in="detail")

    class Meta:
        queryset = Job.objects.filter(status__in=['finished', 'error']).order_by('-timestamp_submission')
        authentication = MultiAuthentication(ProviderAuthentication(), EBRAINSAuthentication())
        authorization = CollabAuthorization()
        serializer = ISO8601UTCOffsetSerializer(formats=['json'])
        resource_name = "results"
        list_allowed_methods = ['get']  # you can only retrieve the list
        # you can retrieve and modify each item
        detail_allowed_methods = ['get', 'put', 'patch', 'delete']
        always_return_data = False
        filtering = {
            'tags': ALL,
            'comments': ALL,
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


# Comments for the Results resource
class CommentResource(ModelResource):
    content = fields.CharField(attribute="content", blank=True, null=True)
    user = fields.CharField(attribute="user", blank=False, null=False)
    job = fields.ToOneField(ResultsResource, 'job', blank=True, null=True, full=False)

    class Meta:
        queryset = Comment.objects.all()
        resource_name = 'comment'
        list_allowed_methods = ['get', 'post']  # you can retrieve all items and add item
        detail_allowed_methods = ['get', 'put', 'patch', 'delete']  # you can retrieve and modify each item
        authentication = Authentication()
        authorization = Authorization()


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


# Resource for tags (django-taggit app)
class TagsResource(ModelResource):
    class Meta:
        queryset = Tag.objects.all()
        resource_name = 'tags'
        authentication = Authentication()
        authorization = Authorization()
        list_allowed_methods = ['get']  # you can only retrieve the list
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


class GenericContainer(object):

    def __init__(self, **kwargs):
        for key, val in kwargs.items():
            setattr(self, key, val)


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
        interval = int(request.GET.get("interval", 7))

        assert isinstance(period_start, datetime)
        assert isinstance(period_end, datetime)
        assert isinstance(interval, int)

        results = []
        counts = defaultdict(lambda: 0)
        for platform in STANDARD_QUEUES:
            jobs = Job.objects.filter(status__in=('finished', 'error'),
                                      hardware_platform=platform,
                                      timestamp_completion__range=(period_start, period_end)
                                     ).values('timestamp_completion')
            completed = np.array([(job['timestamp_completion'] - period_start).days
                                  for job in jobs])
            counts[platform], bin_edges = np.histogram(completed,
                                                       bins=np.arange(0, (period_end - period_start).days, interval))

        for i, days in enumerate(bin_edges[:-1]):
            count = {}
            start = period_start + timedelta(int(days))  # timedelta doesn't like numpy int64
            end = start + timedelta(interval)
            for platform in counts:
                count[platform] = counts[platform][i]
            new_obj = DateRangeCount(start, end, count)
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
        interval = int(request.GET.get("interval", 7))

        assert isinstance(period_start, datetime)
        assert isinstance(period_end, datetime)
        assert isinstance(interval, int)

        results = []
        counts = defaultdict(lambda: 0)
        for platform in STANDARD_QUEUES:
            jobs = Job.objects.filter(status__in=('finished', 'error'),
                                      hardware_platform=platform,
                                      timestamp_completion__range=(period_start, period_end)
                                     ).values('timestamp_completion')
            completed = np.array([(job['timestamp_completion'] - period_start).days
                                  for job in jobs])
            counts[platform], bin_edges = np.histogram(completed,
                                                       bins=np.arange(0, (period_end - period_start).days, interval))

        count_cumul = defaultdict(lambda: 0)
        for i, days in enumerate(bin_edges[:-1]):
            start = period_start + timedelta(int(days))
            end = start + timedelta(interval)
            for platform in counts:
                count_cumul[platform] += counts[platform][i]
            new_obj = DateRangeCount(start, end, count_cumul)
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
        query = Job.objects
        if  "platform" in bundle.request.GET:
            query = query.filter(hardware_platform=bundle.request.GET["platform"])
        for n, user in enumerate(users):
            user_id = user['user_id']
            first_job = query.filter(user_id=user_id).first()
            if first_job:
                first_job_dates.append(first_job.timestamp_submission.date())
        first_job_dates.append(date.today())
        user_counts = list(range(1, len(first_job_dates)))
        user_counts.append(user_counts[-1])  # repeat last value for today's date
        return TimeSeries(dates=sorted(first_job_dates),
                          values=user_counts)

    def prepend_urls(self):
        return [
            url(r"^(?P<resource_name>%s)/$" % self._meta.resource_name, self.wrap_view('dispatch_detail'), name="api_dispatch_detail"),
        ]


class ActiveUserCountResource(StatisticsResource):
    """
    Number of platform users who have submitted at least one job in the last 90 days
    """
    start_date = fields.DateField(attribute="start_date")
    end_date = fields.DateField(attribute="end_date")
    counts = fields.DictField(attribute="counts")

    class Meta:
        resource_name = "statistics/active-user-count"
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
        interval = int(request.GET.get("interval", 7))

        date_list = list(daterange(period_start, period_end, interval))
        date_list.append(period_end)
        results = []
        for end in date_list[:-1]:
            start = end - timedelta(90)
            active_users = {}
            for platform in STANDARD_QUEUES:
                active_users[platform] = Job.objects.filter(hardware_platform=platform,
                                                            timestamp_completion__range=(start, end)).values("user_id").distinct().count()
            # note that the "total" value may be less than the sum of the per-platform values, since some users use multiple platforms
            #active_users["total"] = Job.objects.filter(timestamp_completion__range=(start, end)).values("user_id").distinct().count()
            new_obj = DateRangeCount(start, end, active_users)
            results.append(new_obj)
        return results



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


class ProjectCountResource(StatisticsResource):
    """
    Cumulative number of collabs for which at least one resource allocation request has been made and accepted
    """
    submitted = fields.DictField(attribute="submitted")
    accepted = fields.DictField(attribute="accepted")
    rejected = fields.DictField(attribute="rejected")

    class Meta:
        resource_name = "statistics/cumulative-project-count"
        list_allowed_methods = []
        detail_allowed_methods = ['get']

    def obj_get(self, bundle, **kwargs):
        projects = Project.objects.all().order_by('submission_date')
        dates = {
            "submitted": [],
            "accepted": [],
            "rejected": []
        }
        counts = {"submitted": [0],
                  "accepted": [0],
                  "rejected": [0]}
        for project in projects:
            counts["submitted"].append(counts["submitted"][-1] + 1)
            dates["submitted"].append(project.submission_date)
            if project.decision_date:
                if project.accepted:
                    counts["accepted"].append(counts["accepted"][-1] + 1)
                    dates["accepted"].append(project.submission_date)
                else:
                    counts["rejected"].append(counts["rejected"][-1] + 1)
                    dates["rejected"].append(project.submission_date)

        return GenericContainer(**{
            "submitted": dict(dates=dates["submitted"], values=counts["submitted"][1:]),
            "accepted": dict(dates=dates["accepted"], values=counts["accepted"][1:]),
            "rejected": dict(dates=dates["rejected"], values=counts["rejected"][1:]),
        })

    def prepend_urls(self):
        return [
            url(r"^(?P<resource_name>%s)/$" % self._meta.resource_name, self.wrap_view('dispatch_detail'), name="api_dispatch_detail"),
        ]


class QuotaUsageResource(StatisticsResource):
    """
    Cumulative quota usage
    """

    start_date = fields.DateField(attribute="start_date")
    end_date = fields.DateField(attribute="end_date")
    counts = fields.DictField(attribute="counts")

    class Meta:
        resource_name = "statistics/resource-usage"
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
        interval = int(request.GET.get("interval", 7))

        assert isinstance(period_start, datetime)
        assert isinstance(period_end, datetime)
        assert isinstance(interval, int)

        results = []
        counts = defaultdict(lambda: 0.0)
        n_bins = (period_end - period_start).days//interval + 1
        for platform in STANDARD_QUEUES:
            jobs = Job.objects.filter(status__in=('finished', 'error'),
                                      hardware_platform=platform,
                                      timestamp_completion__range=(period_start, period_end)
                                     ).values('timestamp_completion', 'resource_usage')
            completed = np.array([(job['timestamp_completion'] - period_start).days
                                  for job in jobs])
            #counts[platform], bin_edges = np.histogram(completed,
            #                                           bins=np.arange(0, (period_end - period_start).days, interval))
            resource_usage = np.array([job['resource_usage'] for job in jobs])
            index = completed//interval
            counts[platform] = np.zeros((n_bins,))
            for i, usage in zip(index, resource_usage):
                if usage is not None:
                    counts[platform][i] += usage

        count_cumul = defaultdict(lambda: 0.0)
        for i in range(n_bins):
            start = period_start + timedelta(i * interval)
            end = start + timedelta(interval)
            for platform in STANDARD_QUEUES:
                count_cumul[platform] += counts[platform][i]
            new_obj = DateRangeCount(start, end, count_cumul)
            results.append(new_obj)
        return results

# timeseries
#    [x] job counts
#    [x] cumulative job counts
#    [x] users
#    [x] resources


# instantaneous
#    [x] queue-size

# histograms
#    [x] job duration
#    [ ] log size (!)
#    [ ] code size (?)
