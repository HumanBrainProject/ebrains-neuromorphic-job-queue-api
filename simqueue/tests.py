"""
Tests of the Job Queue API.

"""

from __future__ import unicode_literals
from datetime import datetime
import pytz
import random
from copy import copy
import json
from uuid import uuid4

from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.core import mail
from tastypie.authentication import Authentication
from tastypie.models import ApiKey
from social.apps.django_app.default.models import UserSocialAuth

from .models import Job, DataItem
from .api.resources import QueueResource, ResultsResource
from .api.auth import CollabAuthorization
from quotas.models import Quota, Project


USE_MOCKS = True

PublicCollab = '51'
PrivateCollab = '141'
TEST_COLLABS = [PublicCollab, PrivateCollab]
Alice = '300005'    # testuser123
Bob = '300141'      # testuser124
Charlie = '207149'  # adavison
TEST_USERS = {
    PublicCollab: [Alice, Charlie],
    PrivateCollab: [Bob, Charlie]
}

if USE_MOCKS:
    tokens = {
        Alice: 'Bearer abcdefghijklmnopqrstuvwxyz',
        Bob: 'Bearer zyxwvutsrqponmlkjihgfedcba',
        Charlie: 'Bearer supercalifragilisticexpialidocious',
        "nmpi": 'ApiKey nmpi:jackandjillwentupthehilltofetchapailofwater'
    }
else:
    # before running tests, (re-)generate test_tokens.json using misc/get_tokens.py
    with open("test_tokens.json") as fp:
        tokens = json.load(fp)
    tokens["nmpi"] = ''


token_map = dict((v, k) for k, v in tokens.items())


class MockCollabService(object):

    @classmethod
    def can_view(cls, request, collab_id):
        if collab_id == PublicCollab:
            return True
        else:
            return cls.is_team_member(request, collab_id)

    @classmethod
    def is_team_member(cls, request, collab_id):
        access_token = request.META.get('HTTP_AUTHORIZATION', None)
        user_id = token_map.get(access_token, None)
        if user_id in TEST_USERS[collab_id]:
            return True
        else:
            return False


class MockIdentityService(object):

    @classmethod
    def get_user(cls, request):
        access_token = request.META.get('HTTP_AUTHORIZATION', None)
        user_id = token_map.get(access_token, None)
        return {"id": user_id}

    @classmethod
    def can_use_platform(cls, request):
        # todo: add tests with someone who is not allowed to use the platform
        return True


class MockAuthentication(Authentication):

    def is_authenticated(self, request, **kwargs):
        user = MockIdentityService.get_user(request)
        return user["id"] in (Alice, Bob, Charlie, "nmpi")

    def is_provider(self, request):
        token = request.META.get('HTTP_AUTHORIZATION', None)
        return token == tokens["nmpi"]


class MockAuthorization(CollabAuthorization):
    collab_service = MockCollabService
    identity_service = MockIdentityService

    def _is_provider(self, request):
        return MockAuthentication().is_provider(request)


def mock_check_quotas(self, bundle):
    pass



def generate_data_file():
    id = random.randint(90000000, 99999999)
    item = {
        'id': id,
        'url': 'http://example.com/files/demo{}.dat'.format(id)
    }
    return item

def generate_job(status):
    timestamp = 1.5e9 + random.randint(0, 1e8)
    collab_id = random.sample(TEST_COLLABS, 1)[0]
    job = {
        'code': 'this is the code',
        'collab_id': collab_id,
        'command': 'run.py',
        'hardware_config': {},
        'hardware_platform': random.sample(['SpiNNaker', 'BrainScaleS'], 1)[0],
        'input_data': [generate_data_file() for i in range(random.randint(0, 2))],
        'user_id': random.sample(TEST_USERS[collab_id], 1)[0],
        'provenance': {'collaboratory': {'nav_item': '4567'}}
    }
    if status != "new":
        job["id"] = random.randint(90000000, 99999999)
        job["status"] = status
        job["timestamp_submission"] = datetime.fromtimestamp(timestamp, pytz.UTC)
    if status in ("finished", "error", "removed"):
        job['resource_usage'] = random.uniform(0.0, 100.0)
        job['timestamp_completion'] = datetime.fromtimestamp(timestamp + random.randint(10, 10000),
                                                             pytz.UTC)
        if status in ("finished", "removed"):
            job['output_data'] = [generate_data_file() for i in range(random.randint(0, 5))]
    return job


def setUpModule():
    global finished_jobs, error_jobs, removed_jobs, submitted_jobs, running_jobs, completed_jobs, all_jobs
    # create jobs
    finished_jobs = [generate_job("finished") for i in range(random.randint(25, 35))]
    error_jobs = [generate_job("error") for i in range(random.randint(16, 20))]
    removed_jobs = [generate_job("removed") for i in range(random.randint(9, 15))]
    submitted_jobs = [generate_job("submitted") for i in range(random.randint(19, 29))]
    running_jobs = [generate_job("running") for i in range(random.randint(3, 9))]
    completed_jobs = finished_jobs + error_jobs
    all_jobs = completed_jobs + removed_jobs + submitted_jobs + running_jobs
    # patch mock services
    if USE_MOCKS:
        for resource in QueueResource, ResultsResource:
            resource._meta.authorization = MockAuthorization()
            resource._meta.authentication = MockAuthentication()
        QueueResource._check_quotas = mock_check_quotas


def _create_test_jobs():
    for job in all_jobs:
        cjob = copy(job)
        input_data = cjob.pop("input_data")
        output_data = cjob.pop("output_data", [])
        obj = Job(**cjob)
        obj.save()
        for item in input_data:
            obj.input_data.create(**item)
        for item in output_data:
            obj.output_data.create(**item)
        obj.save()


class TestAPI_NoCollab_AsUser(TestCase):
    """
    Tests of the API as seen by an authenticated user with no Collab specified.
    """
    maxDiff = None

    def setUp(self):
        _create_test_jobs()
        self.alice = Client(HTTP_AUTHORIZATION=tokens[Alice])
        self.bob = Client(HTTP_AUTHORIZATION=tokens[Bob])

    def test__schema_at_api_root(self):
        response = self.alice.get("/api/v2/")
        self.assertJSONEqual(response.content.decode('utf-8'),
                             {"comment": {"list_endpoint": "/api/v2/comment", "schema": "/api/v2/comment/schema"},
                              "dataitem": {"list_endpoint": "/api/v2/dataitem", "schema": "/api/v2/dataitem/schema"},
                              "log": {"list_endpoint": "/api/v2/log", "schema": "/api/v2/log/schema"},
                              "queue": {"list_endpoint": "/api/v2/queue", "schema": "/api/v2/queue/schema"},
                              "results": {"list_endpoint": "/api/v2/results", "schema": "/api/v2/results/schema"},
                              "statistics/active-user-count": {
                                  "list_endpoint": "/api/v2/statistics/active-user-count",
                                  "schema": "/api/v2/statistics/active-user-count/schema"},
                              "statistics/cumulative-job-count": {
                                  "list_endpoint": "/api/v2/statistics/cumulative-job-count",
                                  "schema": "/api/v2/statistics/cumulative-job-count/schema"},
                              "statistics/cumulative-project-count": {
                                  "list_endpoint": "/api/v2/statistics/cumulative-project-count",
                                  "schema": "/api/v2/statistics/cumulative-project-count/schema"},
                              "statistics/cumulative-user-count": {
                                  "list_endpoint": "/api/v2/statistics/cumulative-user-count",
                                  "schema": "/api/v2/statistics/cumulative-user-count/schema"},
                              "statistics/job-count": {
                                  "list_endpoint": "/api/v2/statistics/job-count",
                                  "schema": "/api/v2/statistics/job-count/schema"},
                              "statistics/job-duration": {
                                  "list_endpoint": "/api/v2/statistics/job-duration",
                                  "schema": "/api/v2/statistics/job-duration/schema"},
                              "statistics/queue-length": {
                                  "list_endpoint": "/api/v2/statistics/queue-length",
                                  "schema": "/api/v2/statistics/queue-length/schema"},
                              "statistics/resource-usage": {
                                  "list_endpoint": "/api/v2/statistics/resource-usage",
                                  "schema": "/api/v2/statistics/resource-usage/schema"}})

    def test__queue_endpoint(self):
        """The queue endpoint with no filtering should return all jobs submitted by the user
        that are not yet finished."""
        response = self.alice.get("/api/v2/queue")
        data = response.json()
        alices_submitted_jobs = [job for job in (submitted_jobs + running_jobs)
                                 if job["user_id"] == Alice]
        self.assertEqual(data["meta"]["total_count"], len(alices_submitted_jobs))
        self.assertEqual(set(job["user_id"] for job in data["objects"]), set([Alice]))

    def test__queue_endpoint_filtered(self):
        """In the absence of filtering by collab, the queue endpoint should return the jobs
        submitted by the user, with filtering possible by status and platform."""
        response1 = self.alice.get("/api/v2/queue?status=running")
        data1 = response1.json()
        alices_running_jobs = [job for job in running_jobs if job["user_id"] == Alice]
        self.assertEqual(data1["meta"]["total_count"], len(alices_running_jobs))
        if len(data1["objects"]) > 0:
            self.assertEqual(data1["objects"][0]["status"], "running")

        response2 = self.alice.get("/api/v2/queue?status=submitted&hardware_platform=SpiNNaker")
        data2 = response2.json()
        submitted_SpiNNaker_jobs = [job for job in submitted_jobs
                                   if (job["user_id"] == Alice and job["hardware_platform"] == "SpiNNaker")]
        self.assertEqual(data2["meta"]["total_count"], len(submitted_SpiNNaker_jobs))
        self.assertEqual(set(job["hardware_platform"] for job in data2["objects"]), set(["SpiNNaker"]))  # maybe occasionally fail due to randomness in job generation

    def test__queue_endpoint_get_individual_job(self):
        """In the absence of filtering by collab, a user should be able to access only jobs they submitted"""
        alices_submitted_job = [job for job in submitted_jobs if job["user_id"] == Alice][0].copy()
        alices_submitted_job["timestamp_submission"] = alices_submitted_job["timestamp_submission"].isoformat()
        response1 = self.alice.get("/api/v2/queue/{}".format(alices_submitted_job["id"]))
        #import pdb; pdb.set_trace()
        data = response1.json()
        data_files_submitted = alices_submitted_job.pop("input_data")
        data_files_retrieved = data.pop("input_data")
        self.assertDictContainsSubset(alices_submitted_job, data)
        # todo: add a test of the data files
        response2 = self.bob.get("/api/v2/queue/{}".format(alices_submitted_job["id"]))
        self.assertEqual(response2.status_code, 404)  # we use 404 so as not to reveal the existence of the job to an unauthorized user

    def test__queue_endpoint_get_nonexistent_individual_job(self):
        """Trying to get a nonexistent job should return a 404 error."""
        response = self.alice.get("/api/v2/queue/0")
        self.assertEqual(response.status_code, 404)

    def test__queue_delete_job(self):
        """Making a DELETE request for an individual job should set the job status to "removed"."""
        job_to_delete = [job["id"] for job in submitted_jobs if job["user_id"] == Alice][0]
        response1 = self.alice.delete("/api/v2/queue/{}".format(job_to_delete))
        #import pdb; pdb.set_trace()
        self.assertEqual(response1.status_code, 204)
        response2 = self.alice.get("/api/v2/queue?status=submitted")
        self.assertNotIn(job_to_delete,
                         [job["id"] for job in response2.json()["objects"]])

    def test__queue_delete_someone_elses_job(self):
        """Making a DELETE request for a job the user doesn't own should fail with a 404 error."""
        # or should we allow members of a Collab to delete all jobs in that collab?
        job_to_delete = [job["id"] for job in submitted_jobs if job["user_id"] == Alice][0]
        response1 = self.bob.delete("/api/v2/queue/{}".format(job_to_delete))
        self.assertEqual(response1.status_code, 404)
        # check the job has not been deleted
        response2 = self.alice.get("/api/v2/queue?status=submitted")
        self.assertIn(job_to_delete,
                      [job["id"] for job in response2.json()["objects"]])

    def test__results_endpoint(self):
        """The results endpoint with no filtering should return all completed jobs submitted by the user."""
        response = self.alice.get("/api/v2/results")
        data = response.json()
        alices_completed_jobs = [job for job in completed_jobs
                                 if job["user_id"] == Alice]
        self.assertEqual(data["meta"]["total_count"], len(alices_completed_jobs))
        self.assertEqual(set(job["user_id"] for job in data["objects"]), set([Alice]))

    def test__results_endpoint_filtered(self):
        """In the absence of filtering by collab, the results endpoint should return the completed jobs
        submitted by the user, with filtering possible by status and platform."""
        response1 = self.alice.get("/api/v2/results?status=error")
        data1 = response1.json()
        alices_errored_jobs = [job for job in error_jobs if job["user_id"] == Alice]
        self.assertEqual(data1["meta"]["total_count"], len(alices_errored_jobs))
        if len(data1["objects"]) > 0:
            self.assertEqual(data1["objects"][0]["status"], "error")

        response2 = self.alice.get("/api/v2/results?status=error&hardware_platform=SpiNNaker")
        data2 = response2.json()
        errored_SpiNNaker_jobs = [job for job in error_jobs
                                   if (job["user_id"] == Alice and job["hardware_platform"] == "SpiNNaker")]
        self.assertEqual(data2["meta"]["total_count"], len(errored_SpiNNaker_jobs))
        platforms = [job["hardware_platform"] for job in data2["objects"]]
        if len(platforms) > 0:
            self.assertEqual(set(platforms), set(["SpiNNaker"]))

    def test__results_endpoint_get_individual_job(self):
        """In the absence of filtering by collab, a user should be able to access only jobs they submitted"""
        alices_finished_job = [job for job in finished_jobs if job["user_id"] == Alice][0].copy()
        alices_finished_job["timestamp_submission"] = alices_finished_job["timestamp_submission"].isoformat()
        alices_finished_job["timestamp_completion"] = alices_finished_job["timestamp_completion"].isoformat()
        response1 = self.alice.get("/api/v2/results/{}".format(alices_finished_job["id"]))
        data = response1.json()
        data_files_submitted = alices_finished_job.pop("input_data") + alices_finished_job.pop("output_data")
        data_files_retrieved = data.pop("input_data") + data.pop("output_data")
        self.assertDictContainsSubset(alices_finished_job, data)
        # todo: add a test of the data files
        response2 = self.bob.get("/api/v2/results/{}".format(alices_finished_job["id"]))
        self.assertEqual(response2.status_code, 404)  # we use 404 so as not to reveal the existence of the job to an unauthorized user

    def test__results_endpoint_get_nonexistent_individual_job(self):
        """Trying to get a nonexistent job should return a 404 error."""
        response = self.alice.get("/api/v2/results/0")
        self.assertEqual(response.status_code, 404)

    def test__results_delete_job(self):
        """Making a DELETE request for an individual job should set the job status to "removed"."""
        job_to_delete = [job["id"] for job in completed_jobs if job["user_id"] == Alice][0]
        response1 = self.alice.delete("/api/v2/results/{}".format(job_to_delete))
        #import pdb; pdb.set_trace()
        self.assertEqual(response1.status_code, 204)
        response2 = self.alice.get("/api/v2/queue?status=finished")
        self.assertNotIn(job_to_delete,
                         [job["id"] for job in response2.json()["objects"]])

    def test__results_delete_someone_elses_job(self):
        """Making a DELETE request for a job the user doesn't own should fail with a 404 error."""
        # or should we allow members of a Collab to delete all jobs in that collab?
        job_to_delete = [job["id"] for job in finished_jobs if job["user_id"] == Alice][0]
        response1 = self.bob.delete("/api/v2/results/{}".format(job_to_delete))
        self.assertEqual(response1.status_code, 404)
        # check the job has not been deleted
        response2 = self.alice.get("/api/v2/results?status=finished")
        self.assertIn(job_to_delete,
                      [job["id"] for job in response2.json()["objects"]])

    def test__update_status_not_available_to_users(self):
        job_id = [job["id"] for job in submitted_jobs if job["user_id"] == Alice][0]
        resource_uri = "/api/v2/queue/{}".format(job_id)
        response1 = self.alice.get(resource_uri)
        job = response1.json()
        job['status'] = "running"
        job["provenance"]["version"] = 123
        # Alice is now allowed to modify jobs, because of tags
        #response2 = self.alice.put(resource_uri, data=json.dumps(job), content_type="application/json")
        #self.assertEqual(response2.status_code, 403)  # Alice knows the job exists, so we say "Not allowed"
        response3 = self.bob.put(resource_uri, data=json.dumps(job), content_type="application/json")
        self.assertEqual(response3.status_code, 404)  # Bob doesn't a priori know the job exists, so we say "Not found"


class TestAPI_PublicCollab_AsUser(TestCase):
    """
    Tests of the API as seen by an authenticated user for a public Collab.

    Alice is a member of the collab, Bob is not.
    """

    def setUp(self):
        _create_test_jobs()
        self.alice = Client(HTTP_AUTHORIZATION=tokens[Alice])
        self.bob = Client(HTTP_AUTHORIZATION=tokens[Bob])
        self.charlie = Client(HTTP_AUTHORIZATION=tokens[Charlie])
        #assert Alice is a member of the Collab and Bob is not
        #assert the Collab is public

    def test__queue_endpoint(self):
        """The queue endpoint with filtering by collab, for a public collab,
        should return the jobs submitted by all collab members, not just the current user."""
        for client in (self.alice, self.bob):
            response = client.get("/api/v2/queue?collab_id=" + str(PublicCollab))
            data = response.json()
            collab_submitted_jobs = [job for job in (submitted_jobs + running_jobs)
                                     if job["collab_id"] == PublicCollab]
            self.assertEqual(data["meta"]["total_count"], len(collab_submitted_jobs))
            self.assertEqual(set(job["user_id"] for job in data["objects"]),
                             set(TEST_USERS[PublicCollab]))

    def test__queue_endpoint_filtered(self):
        """The queue endpoint with filtering by collab, for a public collab,
        should return the jobs submitted by all collab members, not just the current user.
        Further filtering by user, status and platform is possible."""
        for client in (self.alice, self.bob):
            response = client.get("/api/v2/queue?collab_id={}&hardware_platform=BrainScaleS".format(PublicCollab))
            data = response.json()
            brainscales_jobs = [job for job in (submitted_jobs + running_jobs)
                                if (job["collab_id"] == PublicCollab and job["hardware_platform"] == "BrainScaleS")]
            self.assertEqual(data["meta"]["total_count"], len(brainscales_jobs))
            users = [job["user_id"] for job in data["objects"]]
            if len(users) > 0:
                self.assertEqual(set(users),
                                 set(TEST_USERS[PublicCollab]))
            platforms = [job["hardware_platform"] for job in data["objects"]]
            if len(platforms) > 0:
                self.assertEqual(set(platforms),
                                 set(['BrainScaleS']))

    def test__queue_endpoint_get_individual_job(self):
        """Anyone with an HBP account can access any job in a public collab."""
        alices_submitted_job = [job for job in submitted_jobs
                                if (job["user_id"] == Alice and job["collab_id"] == PublicCollab)][0].copy()
        alices_submitted_job["timestamp_submission"] = alices_submitted_job["timestamp_submission"].isoformat()
        resource_uri = "/api/v2/queue/{}?collab_id={}".format(alices_submitted_job["id"], PublicCollab)
        response1 = self.alice.get(resource_uri)
        data1 = response1.json()
        response2 = self.bob.get(resource_uri)
        data2 = response2.json()
        self.assertDictEqual(data1, data2)

        data_files_submitted = alices_submitted_job.pop("input_data")
        data_files_retrieved = data1.pop("input_data")
        self.assertDictContainsSubset(alices_submitted_job, data1)

    def test__queue_endpoint_get_completed_job(self):
        """Completed or error jobs should not be accessible through the Queue endpoint.
        The Result endpoint should be used for that."""
        alices_completed_job = [job for job in completed_jobs
                                if (job["user_id"] == Alice and job["collab_id"] == PublicCollab)][0].copy()
        resource_uri = "/api/v2/queue/{}?collab_id={}".format(alices_completed_job["id"], PublicCollab)
        response = self.alice.get(resource_uri)
        self.assertEqual(response.status_code, 404)

    def test__create_new_job_as_member(self):
        """POSTing a valid job to the Queue endpoint should create a new job in the database."""
        new_job = generate_job("new")
        while new_job["collab_id"] != PublicCollab:
            new_job = generate_job("new")
        test_project = Project(collab=PublicCollab, context=uuid4())
        test_project.save()
        test_quota = Quota(project=test_project, platform=new_job["hardware_platform"],
                           usage=0, limit=1000, units="foo-hours")
        test_quota.save()
        client = {Alice: self.alice, Charlie: self.charlie}[new_job["user_id"]]
        response = client.post("/api/v2/queue", data=json.dumps(new_job), content_type="application/json")
        self.assertEqual(response.status_code, 201)

    def test__create_invalid_job(self):
        """POSTING an invalid job to the Queue endpoint should produce an appropriate error message."""
        new_job = generate_job("new")
        while new_job["collab_id"] != PublicCollab:
            new_job = generate_job("new")
        client = {Alice: self.alice, Charlie: self.charlie}[new_job["user_id"]]

        for missing_field in ('collab_id', 'hardware_platform'):
            partial_job = new_job.copy()
            partial_job.pop(missing_field)
            response = client.post("/api/v2/queue", data=json.dumps(partial_job), content_type="application/json")
            self.assertEqual(response.status_code, 400)
            self.assertDictEqual(response.json(),
                                 {'error': 'The `{}` field must not be empty'.format(missing_field)})

    def test__create_new_job_as_nonmember(self):
        """POSTing a valid job to the Queue endpoint specifying a collab of which the user is
        not a member should fail with a suitable error message"""
        new_job = generate_job("new")
        while new_job["collab_id"] != PublicCollab:
            new_job = generate_job("new")
        response = self.bob.post("/api/v2/queue", data=json.dumps(new_job), content_type="application/json")
        self.assertEqual(response.status_code, 403)

    def test__results_endpoint(self):
        """The results endpoint with filtering by collab, for a public collab,
        should return the jobs of all collab members, not just the current user."""
        for client in (self.alice, self.bob):
            response = client.get("/api/v2/results?collab_id=" + str(PublicCollab))
            data = response.json()
            collab_completed_jobs = [job for job in completed_jobs
                                     if job["collab_id"] == PublicCollab]
            self.assertEqual(data["meta"]["total_count"], len(collab_completed_jobs))
            self.assertEqual(set(job["user_id"] for job in data["objects"]),
                             set(TEST_USERS[PublicCollab]))

    def test__results_endpoint_filtered(self):
        """The results endpoint with filtering by collab, for a public collab,
        should return the jobs of all collab members, not just the current user.
        Further filtering by user, status and platform is possible."""
        for client in (self.alice, self.bob):
            response = client.get("/api/v2/results?collab_id={}&hardware_platform=BrainScaleS".format(PublicCollab))
            data = response.json()
            brainscales_jobs = [job for job in completed_jobs
                                if (job["collab_id"] == PublicCollab and job["hardware_platform"] == "BrainScaleS")]
            self.assertEqual(data["meta"]["total_count"], len(brainscales_jobs))
            users = [job["user_id"] for job in data["objects"]]
            if len(users) > 0:
                self.assertEqual(set(users),
                                 set(TEST_USERS[PublicCollab]))
            self.assertEqual(set(job["hardware_platform"] for job in data["objects"]),
                             set(['BrainScaleS']))

    def test__results_endpoint_get_individual_job(self):
        """Anyone with an HBP account can access any job in a public collab."""
        alices_completed_job = [job for job in completed_jobs
                                if (job["user_id"] == Alice and job["collab_id"] == PublicCollab)][0].copy()
        alices_completed_job["timestamp_submission"] = alices_completed_job["timestamp_submission"].isoformat()
        alices_completed_job["timestamp_completion"] = alices_completed_job["timestamp_completion"].isoformat()
        resource_uri = "/api/v2/results/{}?collab_id={}".format(alices_completed_job["id"], PublicCollab)
        response1 = self.alice.get(resource_uri)
        data1 = response1.json()
        response2 = self.bob.get(resource_uri)
        data2 = response2.json()
        self.assertDictEqual(data1, data2)

        data_files_in = alices_completed_job.pop("input_data") + alices_completed_job.pop("output_data")
        data_files_out = data1.pop("input_data") + data1.pop("output_data")
        self.assertDictContainsSubset(alices_completed_job, data1)

    def test__results_endpoint_get_submitted_job(self):
        """Submitted or running jobs should not be accessible through the Results endpoint.
        The Queue endpoint should be used for that."""
        """Anyone with an HBP account can access any job in a public collab."""
        alices_submitted_job = [job for job in submitted_jobs
                                if (job["user_id"] == Alice and job["collab_id"] == PublicCollab)][0].copy()
        resource_uri = "/api/v2/results/{}?collab_id={}".format(alices_submitted_job["id"], PublicCollab)
        response = self.alice.get(resource_uri)
        self.assertEqual(response.status_code, 404)



class TestAPI_PrivateCollab_AsUser(TestCase):
    """
    Tests of the API as seen by an authenticated user for a private Collab.

    Bob is a member of the collab, Alice is not.
    """

    def setUp(self):
        _create_test_jobs()
        self.alice = Client(HTTP_AUTHORIZATION=tokens[Alice])
        self.bob = Client(HTTP_AUTHORIZATION=tokens[Bob])
        self.charlie = Client(HTTP_AUTHORIZATION=tokens[Charlie])
        #assert Bob and Charlie are members of the Collab and Alice is not
        #assert the Collab is private

    def test__queue_endpoint_as_member(self):
        """The queue endpoint with filtering by collab, for a private collab,
        should return the jobs submitted by all collab members if the user is a member of the collab."""
        response = self.bob.get("/api/v2/queue?collab_id=" + str(PrivateCollab))
        data = response.json()
        collab_submitted_jobs = [job for job in (submitted_jobs + running_jobs)
                                 if job["collab_id"] == PrivateCollab]
        self.assertEqual(data["meta"]["total_count"], len(collab_submitted_jobs))
        self.assertEqual(set(job["user_id"] for job in data["objects"]),
                         set(TEST_USERS[PrivateCollab]))

    def test__queue_endpoint_as_nonmember(self):
        """The queue endpoint with filtering by collab, for a private collab,
        should return an empty list if the user is not a member of the collab.
        """
        response = self.alice.get("/api/v2/queue?collab_id=" + str(PrivateCollab))
        self.assertEqual(response.json()['objects'], [])

    def test__queue_endpoint_get_individual_job(self):
        """
        In a private collab, only collab members can retrieve individual jobs.
        """
        bobs_submitted_job = [job for job in submitted_jobs
                              if job["user_id"] == Bob and job["collab_id"] == PrivateCollab][0].copy()
        bobs_submitted_job["timestamp_submission"] = bobs_submitted_job["timestamp_submission"].isoformat()
        resource_uri = "/api/v2/queue/{}?collab_id={}".format(bobs_submitted_job["id"], PrivateCollab)
        # arguably it shouldn't be necessary to give the collab id as a query, since it is a job attribute
        response1 = self.charlie.get(resource_uri)
        data = response1.json()
        data_files_submitted = bobs_submitted_job.pop("input_data")
        data_files_retrieved = data.pop("input_data")
        self.assertDictContainsSubset(bobs_submitted_job, data)

        response2 = self.alice.get(resource_uri)
        self.assertEqual(response2.status_code, 404)  # we use 404 so as not to reveal the existence of the job to an unauthorized user

    def test__results_endpoint_as_member(self):
        """The results endpoint with filtering by collab, for a private collab,
        should return the completed jobs submitted by all collab members if the user is a member of the collab."""
        response = self.bob.get("/api/v2/results?collab_id=" + str(PrivateCollab))
        data = response.json()
        collab_submitted_jobs = [job for job in completed_jobs
                                 if job["collab_id"] == PrivateCollab]
        self.assertEqual(data["meta"]["total_count"], len(collab_submitted_jobs))
        self.assertEqual(set(job["user_id"] for job in data["objects"]),
                         set(TEST_USERS[PrivateCollab]))

    def test__results_endpoint_as_nonmember(self):
        """The results endpoint with filtering by collab, for a private collab,
        should return an empty list if the user is not a member of the collab.
        """
        response = self.alice.get("/api/v2/results?collab_id=" + str(PrivateCollab))
        self.assertEqual(response.json()['objects'], [])

    def test__results_endpoint_get_individual_job(self):
        """
        In a private collab, only collab members can retrieve individual jobs.
        """
        bobs_finished_job = [job for job in finished_jobs
                             if job["user_id"] == Bob and job["collab_id"] == PrivateCollab][0].copy()
        bobs_finished_job["timestamp_submission"] = bobs_finished_job["timestamp_submission"].isoformat()
        bobs_finished_job["timestamp_completion"] = bobs_finished_job["timestamp_completion"].isoformat()
        resource_uri = "/api/v2/results/{}?collab_id={}".format(bobs_finished_job["id"], PrivateCollab)
        # arguably it shouldn't be necessary to give the collab id as a query, since it is a job attribute
        response1 = self.charlie.get(resource_uri)
        data = response1.json()
        data_files_submitted = bobs_finished_job.pop("input_data") + bobs_finished_job.pop("output_data")
        data_files_retrieved = data.pop("input_data") + data.pop("output_data")
        self.assertDictContainsSubset(bobs_finished_job, data)

        response2 = self.alice.get(resource_uri)
        self.assertEqual(response2.status_code, 404)  # we use 404 so as not to reveal the existence of the job to an unauthorized user


class TestAPI_AsProvider(TestCase):
    """
    Tests of the API as seen by the Neuromorphic systems
    """

    def setUp(self):
        _create_test_jobs()
        if not USE_MOCKS:
            nmpi_user = User.objects.create(username="nmpi")
            key = ApiKey.objects.create(user=nmpi_user)
            tokens["nmpi"] = 'ApiKey nmpi:{}'.format(key.key)
        self.client = Client(HTTP_AUTHORIZATION=tokens["nmpi"])
        self.maxDiff = None

    def test__next_job_endpoint(self):
        resource_uri = "/api/v2/queue/submitted/next/BrainScaleS/"
        brainscales_jobs = [job for job in submitted_jobs
                            if job["hardware_platform"] == "BrainScaleS"]
        oldest_submitted_job = sorted(brainscales_jobs, key=lambda job: job["timestamp_submission"])[0].copy()
        oldest_submitted_job["timestamp_submission"] = oldest_submitted_job["timestamp_submission"].isoformat()

        response = self.client.get(resource_uri)
        data = response.json()

        data_files_submitted = oldest_submitted_job.pop("input_data")
        data_files_retrieved = data.pop("input_data")
        self.assertDictContainsSubset(oldest_submitted_job, data)

    def test__next_job_endpoint_not_accessible_to_users(self):
        resource_uri = "/api/v2/queue/submitted/next/BrainScaleS/"
        brainscales_jobs = [job for job in submitted_jobs
                            if job["hardware_platform"] == "BrainScaleS"]
        oldest_submitted_job = sorted(brainscales_jobs, key=lambda job: job["timestamp_submission"])[0].copy()
        alice = Client(HTTP_AUTHORIZATION=tokens[Alice])
        bob = Client(HTTP_AUTHORIZATION=tokens[Bob])
        charlie = Client(HTTP_AUTHORIZATION=tokens[Charlie])
        client = {Alice: alice, Bob: bob, Charlie: charlie}[oldest_submitted_job["user_id"]]
        response = client.get(resource_uri)
        self.assertEqual(response.status_code, 403)

    def test__all_jobs_for_my_platform(self):
        resource_uri = "/api/v2/queue/submitted/?hardware_platform=BrainScaleS"
        brainscales_jobs = [job for job in submitted_jobs
                            if job["hardware_platform"] == "BrainScaleS"]
        response = self.client.get(resource_uri)
        data = response.json()
        self.assertEqual(data["meta"]["total_count"], len(brainscales_jobs))

    def test__update_status_to_running(self):
        next_job_uri = "/api/v2/queue/submitted/next/SpiNNaker/"
        response = self.client.get(next_job_uri)
        job = response.json()
        job['status'] = "running"
        job["provenance"]["version"] = 123
        resource_uri = "/api/v2/queue/{}".format(job["id"])
        response2 = self.client.put(resource_uri, data=json.dumps(job), content_type="application/json")
        self.assertEqual(response2.status_code, 204)
        response3 = self.client.get(resource_uri)
        job2 = response3.json()
        self.assertDictEqual(job, job2)


class TestEmail(TestCase):
    """

    """

    def setUp(self):
        _create_test_jobs()
        if not USE_MOCKS:
            nmpi_user = User.objects.create(username="nmpi")
            key = ApiKey.objects.create(user=nmpi_user)
            tokens["nmpi"] = 'ApiKey nmpi:{}'.format(key.key)
        self.client = Client(HTTP_AUTHORIZATION=tokens["nmpi"])
        self.maxDiff = None

    def test__email(self):
        job = running_jobs.pop(0)
        test_project = Project(collab=job["collab_id"], context=uuid4())
        test_project.save()
        test_quota = Quota(project=test_project, platform=job["hardware_platform"],
                           usage=0, limit=1000, units="foo-hours")
        test_quota.save()
        if USE_MOCKS:
            user = User(username="testuser", email="testuser@example.com")
            user.save()
            sa = UserSocialAuth(user=user, uid=job['user_id'])
            sa.save()

        log = "\n".join(str(x) for x in range(25))
        log_response = self.client.put("/api/v2/log/{}".format(job["id"]),
                                       data=json.dumps({"content": log}),
                                       content_type="application/json")
        self.assertEqual(log_response.status_code, 201)

        job['timestamp_submission'] = job['timestamp_submission'].isoformat()
        job['status'] = "finished"
        job["provenance"]["version"] = 123
        job["resource_usage"] = 23
        job['hardware_config']["resource_allocation_id"] = test_quota.pk
        resource_uri = "/api/v2/queue/{}".format(job["id"])
        response = self.client.put(resource_uri, data=json.dumps(job), content_type="application/json")
        self.assertEqual(response.status_code, 204)

        message = mail.outbox[0]
        self.assertEqual(message.to, ["testuser@example.com"])
        self.assertEqual(message.subject, "[HBP Neuromorphic] job {} finished".format(job["id"]))
        self.assertIn("Job {} finished".format(job["id"]), message.body)
        self.assertIn("0\n1\n2\n3\n4\n5\n6\n7\n8\n9\n\n.  .  .\n\n15\n16\n17\n18\n19\n20\n21\n22\n23\n24",
                      message.body)
        self.assertIn("https://collab.humanbrainproject.eu/#/collab/{}/nav/{}?state=job.{}".format(job["collab_id"],
                                                                                                   job["provenance"]["collaboratory"]["nav_item"],
                                                                                                   job["id"]),
                      message.body)


class TestAPI_AsAnonymous(TestCase):
    """
    Tests of the API in the absence of authentication
    """

    def setUp(self):
        _create_test_jobs()
        self.anon = Client()

    def test__queue_endpoint(self):
        """Authentication is needed to access the endpoint"""
        response = self.anon.get("/api/v2/queue?collab_id=" + str(PublicCollab))
        self.assertEqual(response.status_code, 401)

    def test__queue_endpoint_get_individual_job(self):
        """Authentication is needed to access the endpoint"""
        alices_submitted_job = [job["id"] for job in submitted_jobs if job["user_id"] == Alice][0]
        response = self.anon.get("/api/v2/queue/{}?collab_id={}".format(alices_submitted_job, PublicCollab))
        self.assertEqual(response.status_code, 401)

    def test__queue_endpoint_get_non_existent_job(self):
        """Authentication is needed to access the endpoint"""
        response = self.anon.get("/api/v2/queue/0?collab_id={}".format(PublicCollab))
        self.assertEqual(response.status_code, 401)

    def test__results_endpoint(self):
        """Authentication is needed to access the endpoint"""
        response = self.anon.get("/api/v2/results?collab_id=" + str(PublicCollab))
        self.assertEqual(response.status_code, 401)

    def test__results_endpoint_get_individual_job(self):
        """Authentication is needed to access the endpoint"""
        alices_finished_job = [job["id"] for job in finished_jobs if job["user_id"] == Alice][0]
        response = self.anon.get("/api/v2/results/{}?collab_id={}".format(alices_finished_job, PublicCollab))
        self.assertEqual(response.status_code, 401)

    def test__results_endpoint_get_non_existent_job(self):
        """Authentication is needed to access the endpoint"""
        response = self.anon.get("/api/v2/results/0?collab_id={}".format(PublicCollab))
        self.assertEqual(response.status_code, 401)
