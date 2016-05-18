"""

"""

import json
from datetime import date
from django.test import TestCase, Client
from .models import Project, Quota
from .views import ProjectResource


test_project_data = dict(
            context = "aaaaaaaa-1111-5555-eeee-000123456789",
            collab = "collab_id",
            owner = "owner id",
            title = "A project",
            abstract = "In brief",
            description = "kejxfg nsgxfnaiugnf\n",
        )


class ProjectResourceTest(TestCase):

    def setUp(self):
        self.project_data = test_project_data
        self.test_project = Project(**self.project_data)
        self.test_project.save()

    def test_get_resource(self):
        test_project_id = self.test_project.context
        response = ProjectResource().get(request=None,
                                         project_id=test_project_id)
        retrieved = json.loads(response.content)
        for field in self.project_data:
            self.assertEqual(self.project_data[field],
                             retrieved[field])
        self.assertEqual(retrieved["status"], "in preparation")

    def test_get_submitted_resource(self):
        self.test_project.submission_date = date.today()
        self.test_project.save()
        c = Client()
        response = c.get('/projects/' + self.test_project.context)
        retrieved = json.loads(response.content)
        for field in self.project_data:
            self.assertEqual(self.project_data[field],
                             retrieved[field])
        self.assertEqual(retrieved["status"], "under review")

    def test_post_resource(self):
        project_data = dict(
            context = "bbbbbbbb-1111-5555-eeee-000123456789",
            collab = "collab_id_2",
            owner = "owner id",
            title = "Another project",
            abstract = "In summary",
            description = "lisuzgcse ciug\nawiuf awuefyw",
        )
        c = Client()
        response = c.post('/projects', data=json.dumps(project_data),
                          content_type="application/json")
        self.assertEqual(response.status_code, 201)
        result = json.loads(response.content)
        self.assertEqual(result["status"], "in preparation")

    def test_post_and_submit_resource(self):
        project_data = dict(
            context = "bbbbbbbb-1111-5555-eeee-000123456789",
            collab = "collab_id_2",
            owner = "owner id",
            title = "Another project",
            abstract = "In summary",
            description = "lisuzgcse ciug\nawiuf awuefyw",
            submitted = True
        )
        c = Client()
        response = c.post('/projects', data=json.dumps(project_data),
                          content_type="application/json")
        self.assertEqual(response.status_code, 201)
        result = json.loads(response.content)
        self.assertEqual(result["status"], "under review")

    def test_edit_resource(self):
        updated_data = {
            "title": "A project about something",
            "abstract": "It is widely believed..."
        }
        test_project_id = self.test_project.context
        c = Client()
        response = c.put('/projects/{}'.format(test_project_id),
                         data=json.dumps(updated_data),
                         content_type="application/json")
        if response.status_code != 200:
            #self.assertEqual(response.status_code, 200)
            self.fail(response.content)
        project = Project.objects.get(context=test_project_id)
        self.assertEqual(project.status(), "in preparation")
        self.assertEqual(project.abstract, updated_data["abstract"])

    def test_edit_and_submit_resource(self):
        updated_data = {
            "title": "A project about something",
            "abstract": "It is widely believed...",
            "submitted": True
        }
        test_project_id = self.test_project.context
        c = Client()
        response = c.put('/projects/{}'.format(test_project_id),
                         data=json.dumps(updated_data),
                         content_type="application/json")
        if response.status_code != 200:
            #self.assertEqual(response.status_code, 200)
            self.fail(response.content)
        project = Project.objects.get(context=test_project_id)
        self.assertEqual(project.status(), "under review")

    def test_editing_forbidden_after_submission(self):
        self.test_project.submission_date = date.today()
        self.test_project.save()
        updated_data = {
            "title": "A project about something",
            "abstract": "It is widely believed...",
        }
        c = Client()
        test_project_id = self.test_project.context
        response = c.put('/projects/{}'.format(test_project_id),
                         data=json.dumps(updated_data),
                         content_type="application/json")
        self.assertEqual(response.status_code, 403)
        project = Project.objects.get(context=test_project_id)
        self.assertEqual(project.abstract, test_project_data["abstract"])

    def test_post_twice_should_give_error(self):
        c = Client()
        response = c.post('/projects', data=json.dumps(test_project_data),
                          content_type="application/json")
        self.assertEqual(response.status_code, 400)
        error_message = json.loads(response.content)
        self.assertEqual(error_message["context"][0]["message"],
                         "Project with this Context already exists.")


class QuotaResourceTest(TestCase):

    def setUp(self):
        self.project_data = test_project_data
        self.test_project = Project(**self.project_data)
        self.test_project.save()
        self.test_quota_data = dict(project=self.test_project,
                                    limit=1000.0,
                                    units="wafer-hours",
                                    usage=0.0,
                                    platform="BrainScaleS")
        self.test_quota = Quota(**self.test_quota_data)
        self.test_quota.save()

    def test_get_resource(self):
        c = Client()
        response = c.get('/projects/{}/quotas/{}'.format(self.test_project.context,
                                                  self.test_quota.pk))
        #self.assertEqual(response.status_code, 200)
        if response.status_code != 200:
            self.fail(response.content)

        self.test_quota_data["project"] = self.test_quota_data["project"].context
        self.assertDictEqual(self.test_quota_data,
                             json.loads(response.content))

    def test_post_resource(self):
        quota_data = dict(project=self.test_project.context,
                          limit=100000.0,
                          units="core-hours",
                          usage=0.0,
                          platform="SpiNNaker")
        c = Client()
        response = c.post('/projects/{}/quotas/'.format(self.test_project.context),
                          data=json.dumps(quota_data),
                          content_type="application/json")
        self.assertEqual(response.status_code, 201)
        self.assertDictEqual(quota_data,
                             json.loads(response.content))

    #def test_update_usage(self):
