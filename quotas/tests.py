"""
Tests of the quotas Django app

Note that in these tests we mostly use the name "project" where "resource request"
is often used in the documentation and web interface, because it seems less confusing
in a Django context.
"""

import json
from datetime import date
from django.test import TestCase, Client
from django.conf import settings
from .models import Project, Quota
from . import views

# These tests should normally run with USE_MOCKS = True,
# but occasionally it is useful to test with the real Collaboratory Service
# If you do this, see below about generating tokens.
USE_MOCKS = True

PublicCollab = '2330'
PrivateCollab = '141'
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
        Charlie: 'Bearer supercalifragilisticexpialidocious'
    }
else:
    # before running tests, (re-)generate test_tokens.json using misc/get_tokens.py
    with open("test_tokens.json") as fp:
        tokens = json.load(fp)

token_map = dict((v, k) for k, v in tokens.items())

test_project_data = {
    "Alice's unsubmitted project": dict(
            accepted = False,
            context = "909006c3-12e5-45fd-b287-f095c48122e8",
            collab = PublicCollab,
            owner = Alice,
            title = "An unsubmitted resource request used for testing",
            abstract = "Do not submit, delete or change the status",
            description = "kejxfg nsgxfnaiugnf\n"
    ),
    "Alice's public project": dict(
            accepted = True,
            context = "ddc5ece4-e85f-4205-a15b-c98d1effb7d0",
            collab = PublicCollab,
            owner = Alice,
            title = "A public resource request used for testing",
            abstract = "Do not deleted or change the status",
            description = "kejxfg nsgxfnaiugnf\n"
    ),
    "Bob's private project": dict(
            accepted = False,
            context = "bb4783b2-69bc-4ca4-b16a-ee469c3db9f7",
            collab = PrivateCollab,
            owner = Bob,
            title = "Another project",
            abstract = "In summary",
            description = "flurgle gurgle\n"
    ),
}

collab_map = dict((p["context"], p["collab"])
                  for p in test_project_data.values())


class MockCollabService(object):

    def __init__(self, request, context=None, collab_id=None):
        if collab_id is None:
            self.collab_id = collab_map[str(context)]
        else:
            self.collab_id = collab_id
        if self.collab_id is None:
            raise ValueError("Invalid context provided: {} not in map {}".format(context, collab_map))
        access_token = request.META.get('HTTP_AUTHORIZATION', None)
        self.user_id = token_map.get(access_token, None)
        self.permissions = {"foo": "bar"}

    @property
    def can_view(self):
        if self.collab_id == PublicCollab and self.user_id is not None:
            return True
        else:
            return self.is_team_member

    @property
    def is_team_member(self):
        if self.user_id in TEST_USERS[self.collab_id]:
            return True
        else:
            return False


def mock_is_admin(request):
    """Charlie is an administrator."""
    access_token = request.META.get('HTTP_AUTHORIZATION', None)
    user_id = token_map.get(access_token, None)
    return user_id == Charlie


def setUpModule():
    # Always mock "notify_coordinators" to avoid notification spam
    views.notify_coordinators = lambda request, project: True

    if USE_MOCKS:
        views.CollabService = MockCollabService
        views.is_admin = mock_is_admin
    else:
        # sanity test: check our map of collab membership is correct
        import requests
        def get_permissions(collab_id, user_id):
            res = requests.get('%scollab/%s/permissions/' % (settings.HBP_COLLAB_SERVICE_URL, collab_id),
                               headers={'Authorization': tokens[user_id]})
            return res.json()
        for collab_id, expected_members in TEST_USERS.items():
            for user_id in (Alice, Bob, Charlie):
                perms = get_permissions(collab_id, user_id)
                if user_id in expected_members:
                    assert perms['user_id'] == user_id
                    assert perms['UPDATE']
                elif collab_id == PublicCollab:
                    assert perms['user_id'] == user_id
                    assert perms['VIEW']
                    assert not perms['UPDATE']
                else:
                    assert perms['detail'] == 'No access to the collab'


class ProjectResourceTest(TestCase):

    def setUp(self):
        self.test_projects = {}
        for label, test_data in test_project_data.items():
            self.test_projects[label] = Project(**test_data)
            self.test_projects[label].save()
        self.alice = Client(HTTP_AUTHORIZATION=tokens[Alice])
        self.bob = Client(HTTP_AUTHORIZATION=tokens[Bob])
        self.charlie = Client(HTTP_AUTHORIZATION=tokens[Charlie])
        self.anon = Client()

    def _get_project(self, client, context):
        response = client.get('/projects/' + context)
        return response.status_code, json.loads(response.content)

    def test_get_unsubmitted_public_project_as_owner(self):
        """Alice should be able to view her own unsubmitted project."""
        project = test_project_data["Alice's unsubmitted project"]
        status_code, retrieved = self._get_project(self.alice,
                                                   project["context"])
        self.assertEqual(status_code, 200)
        for field in ("context", "collab", "owner", "title", "abstract", "description"):
            self.assertEqual(project[field], retrieved[field])
        self.assertEqual(retrieved["status"], "in preparation")

    def test_get_unsubmitted_private_project_as_owner(self):
        """Bob should be able to view his own project."""
        project = test_project_data["Bob's private project"]
        status_code, retrieved = self._get_project(self.bob,
                                                   project["context"])
        self.assertEqual(status_code, 200)
        self.assertEqual(retrieved["owner"], Bob)

    def test_get_unsubmitted_private_project_as_collab_member(self):
        """Since Charlie is a member of the private collab he should be able to view Bob's project."""
        project = test_project_data["Bob's private project"]
        status_code, retrieved = self._get_project(self.charlie,
                                                   project["context"])
        self.assertEqual(status_code, 200)
        self.assertEqual(retrieved["owner"], Bob)

    def test_get_unsubmitted_public_project_as_other(self):
        """Although Alice's project is in a public collab, Bob should not be able to view it
           because it has not been accepted yet."""
        project = test_project_data["Alice's unsubmitted project"]
        status_code, retrieved = self._get_project(self.bob,
                                                   project["context"])
        self.assertEqual(status_code, 403)

    def test_get_unsubmitted_public_project_as_anonymous(self):
        """An account is needed to view public projects."""
        project = test_project_data["Alice's unsubmitted project"]
        status_code, retrieved = self._get_project(self.anon,
                                                   project["context"])
        self.assertEqual(status_code, 403)
        self.assertEqual(retrieved, {"error": "You do not have permission to view this resource."})

    def test_get_unsubmitted_private_project_as_other(self):
        """Alice should not be able to view Bob's private project
           since she is not a member of the collab."""
        project = test_project_data["Bob's private project"]
        status_code, retrieved = self._get_project(self.alice,
                                                   project["context"])
        self.assertEqual(status_code, 403)
        self.assertEqual(retrieved, {"error": "You do not have permission to view this resource."})

    def test_get_accepted_public_project_as_other(self):
        """Since Alice's accepted project is in a public collab, Bob should be able to view it"""
        project = test_project_data["Alice's public project"]
        status_code, retrieved = self._get_project(self.bob,
                                                   project["context"])
        self.assertEqual(status_code, 200)
        self.assertEqual(retrieved["owner"], Alice)

    def test_get_accepted_public_project_as_anonymous(self):
        """An account is needed to view public projects."""
        project = test_project_data["Alice's public project"]
        status_code, retrieved = self._get_project(self.anon,
                                                   project["context"])
        self.assertEqual(status_code, 403)
        self.assertEqual(retrieved, {"error": "You do not have permission to view this resource."})

    def test_project_with_submission_date_should_have_status_under_review(self):
        """A project with a submission date but no decision date should have status under review"""
        project = self.test_projects["Alice's unsubmitted project"]
        project.submission_date = date.today()
        project.save()
        status_code, retrieved = self._get_project(self.alice,
                                                   project.context)
        self.assertEqual(status_code, 200)
        self.assertEqual(retrieved["status"], "under review")

    def test_project_with_decision_date_and_accepted_false_should_have_status_rejected(self):
        """A project with a decision date and accepted=False should have status rejected"""
        project = self.test_projects["Alice's unsubmitted project"]
        project.submission_date = date.today()
        project.decision_date = date.today()
        project.accepted = False
        project.save()
        status_code, retrieved = self._get_project(self.alice,
                                                   project.context)
        self.assertEqual(status_code, 200)
        self.assertEqual(retrieved["status"], "rejected")

    def test_project_with_decision_date_and_accepted_true_should_have_status_accepted(self):
        """A project with a decision date and accepted=True should have status accepted"""
        project = self.test_projects["Alice's unsubmitted project"]
        project.submission_date = date.today()
        project.decision_date = date.today()
        project.accepted = True
        project.save()
        status_code, retrieved = self._get_project(self.alice,
                                                   project.context)
        self.assertEqual(status_code, 200)
        self.assertEqual(retrieved["status"], "accepted")

    def test_post_project(self):
        """Alice can create a new project in a collab of which she is a member."""
        project_data = dict(
            context = "ffffffff-1234-5678-aaaa-000123456789",
            collab = PublicCollab,
            owner = Alice,
            title = "A new project",
            abstract = "I will do some science",
            description = "lsirgjcmrgcoio\nrogicargcagc\niorhrg\n"
        )
        collab_map[project_data["context"]] = project_data["collab"]
        response = self.alice.post('/projects/', data=json.dumps(project_data),
                                   content_type="application/json")
        self.assertEqual(response.status_code, 201)
        result = json.loads(response.content)
        self.assertEqual(result["status"], "in preparation")

    def test_post_project_as_nonmember(self):
        """Bob is not a collab member, so should not be able to create a new project."""
        project_data = dict(
            context = "ffffffff-1234-5678-aaaa-000123456789",
            collab = PublicCollab,
            owner = Bob,
            title = "A better new project",
            abstract = "No, I will do some science",
            description = "Lsirgjcmrgcoio\nRogicargcagc\nIorhrg\n"
        )
        collab_map[project_data["context"]] = project_data["collab"]
        response = self.bob.post('/projects/', data=json.dumps(project_data),
                                 content_type="application/json")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"],
                         "You do not have permission to create a project.")

    def test_post_and_submit_project(self):
        """Alice can create and simultaneously submit a new project in a collab of which she is a member."""
        project_data = dict(
            context = "ffffffff-1234-5678-aaaa-000123456789",
            collab = PublicCollab,
            owner = Alice,
            title = "A new project",
            abstract = "I will do some science",
            description = "lsirgjcmrgcoio\nrogicargcagc\niorhrg\n",
            submitted = True
        )
        collab_map[project_data["context"]] = project_data["collab"]
        response = self.alice.post('/projects/', data=json.dumps(project_data),
                                   content_type="application/json")
        self.assertEqual(response.status_code, 201)
        result = json.loads(response.content)
        self.assertEqual(result["status"], "under review")

    def test_edit_project(self):
        """Charlie can edit the project Alice created because he is a member of the collab."""
        updated_data = {
            "title": "A project about something",
            "abstract": "It is widely believed..."
        }
        test_project_id = test_project_data["Alice's unsubmitted project"]["context"]
        response = self.charlie.put('/projects/{}'.format(test_project_id),
                                    data=json.dumps(updated_data),
                                    content_type="application/json")
        if response.status_code != 200:
            #self.assertEqual(response.status_code, 200)
            self.fail(response.content)
        project = Project.objects.get(context=test_project_id)
        self.assertEqual(project.status(), "in preparation")
        self.assertEqual(project.abstract, updated_data["abstract"])

    def test_edit_project_as_nonmember(self):
        """Bob cannot edit the project Alice created because he is a not member of the collab."""
        updated_data = {
            "title": "A project about something else",
            "abstract": "It is even more widely believed..."
        }
        test_project_id = test_project_data["Alice's unsubmitted project"]["context"]
        response = self.bob.put('/projects/{}'.format(test_project_id),
                                data=json.dumps(updated_data),
                                content_type="application/json")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"],
                         "You do not have permission to modify this project.")
        project = Project.objects.get(context=test_project_id)
        self.assertEqual(project.status(), "in preparation")
        self.assertEqual(project.abstract, test_project_data["Alice's unsubmitted project"]["abstract"])

    def test_edit_and_submit_project(self):
        """Alice can edit and simultaneously submit her project."""
        updated_data = {
            "title": "A project about something",
            "abstract": "It is widely believed...",
            "submitted": True
        }
        test_project_id = test_project_data["Alice's unsubmitted project"]["context"]

        project = Project.objects.get(context=test_project_id)
        self.assertEqual(project.status(), "in preparation")

        response = self.alice.put('/projects/{}'.format(test_project_id),
                                    data=json.dumps(updated_data),
                                    content_type="application/json")
        if response.status_code != 200:
            self.fail(response.content)

        project = Project.objects.get(context=test_project_id)
        self.assertEqual(project.status(), "under review")
        self.assertEqual(project.abstract, updated_data["abstract"])

    def test_editing_forbidden_after_submission(self):
        """A project cannot be edited by a user after it is submitted."""
        # (An administrator first has to set the status back to "in preparation")
        project = self.test_projects["Alice's unsubmitted project"]
        project.submission_date = date.today()
        project.save()

        updated_data = {
            "title": "A project about something",
            "abstract": "It is widely believed...",
        }
        test_project_id = project.context
        response = self.alice.put('/projects/{}'.format(test_project_id),
                                  data=json.dumps(updated_data),
                                  content_type="application/json")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"],
                         "Can't edit a submitted form.")

        project2 = Project.objects.get(context=test_project_id)
        self.assertEqual(project2.abstract, project.abstract)

    def test_post_twice_should_give_error(self):
        """You can't submit the same project twice."""
        response = self.alice.post('/projects/', json.dumps(test_project_data["Alice's unsubmitted project"]),
                                   content_type="application/json")
        self.assertEqual(response.status_code, 400)
        error_message = response.json()
        self.assertEqual(error_message["context"][0]["message"],
                         "Project with this Context already exists.")

#    def test_administrators_can_change_project_status(self):
#    def test_non_administrators_cannot_change_project_status(self):
#    def test_list_projects_public_collab
#    def test_list_projects_public_collab_as_member
#    def test_list_projects_private_collab
#    def test_list_projects_private_collab_as_member



class QuotaResourceTest(TestCase):

    def setUp(self):
        self.test_projects = {}
        for label, test_data in test_project_data.items():
            self.test_projects[label] = Project(**test_data)
            self.test_projects[label].save()
        self.alice = Client(HTTP_AUTHORIZATION=tokens[Alice])
        self.bob = Client(HTTP_AUTHORIZATION=tokens[Bob])
        self.charlie = Client(HTTP_AUTHORIZATION=tokens[Charlie])
        self.anon = Client()
        self.admin = self.charlie

        self.test_quota_data = dict(project=self.test_projects["Alice's public project"],
                                    limit=1000.0,
                                    units="wafer-hours",
                                    usage=0.0,
                                    platform="BrainScaleS")
        self.test_quota = Quota(**self.test_quota_data)
        self.test_quota.save()

    def _get_quota(self, client, quota):
        response = client.get('/projects/{}/quotas/{}'.format(quota.project.context, quota.pk))
        return response.status_code, json.loads(response.content)

    def test_get_quota(self):
        """As a collab member, Charlie can view the quotas."""
        status_code, retrieved = self._get_quota(self.charlie,
                                                 self.test_quota)
        self.assertEqual(status_code, 200)
        for key in ("limit", "units", "usage", "platform"):
            self.assertEqual(self.test_quota_data[key],
                             retrieved[key])
        self.assertEqual(retrieved['project'],
                         self.test_quota_data["project"].context)

    def test_get_quota_as_nonmember(self):
        """As a non-member, Bob cannot view the quotas, even for a public collab."""
        status_code, retrieved = self._get_quota(self.bob,
                                                 self.test_quota)
        self.assertEqual(status_code, 403)

    def test_get_quota_list(self):
        """As a collab member, Alice can get a list of quotas for a given project."""
        project = self.test_projects["Alice's public project"]
        response = self.alice.get('/projects/{}/quotas/'.format(project.context))
        self.assertEqual(response.status_code, 200)
        retrieved = response.json()
        self.assertIsInstance(retrieved, list)
        self.assertEqual(retrieved[0]["limit"], project.quota_set.first().limit)

    def test_get_quota_list_as_nonmember(self):
        """As a non-member, Bob cannot get a list of quotas."""
        project = self.test_projects["Alice's public project"]
        response = self.bob.get('/projects/{}/quotas/'.format(project.context))
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"], "You do not have permission to view this resource.")

    def test_post_quota_as_admin(self):
        """Admins can create quotas."""
        project_id = self.test_projects["Alice's public project"].context
        new_quota_data = dict(project=project_id,
                              limit=100000.0,
                              units="core-hours",
                              usage=0.0,
                              platform="SpiNNaker")
        response = self.admin.post('/projects/{}/quotas/'.format(project_id),
                                   data=json.dumps(new_quota_data),
                                   content_type="application/json")
        self.assertEqual(response.status_code, 201)
        retrieved = response.json()
        for key in ("limit", "units", "usage", "platform", "project"):
            self.assertEqual(new_quota_data[key],
                             retrieved[key])

    def test_post_quota_as_user(self):
        """Non-admins cannot create quotas."""
        project_id = self.test_projects["Alice's public project"].context
        new_quota_data = dict(project=project_id,
                              limit=98765.4,
                              units="core-hours",
                              usage=0.0,
                              platform="SpiNNaker")
        response = self.alice.post('/projects/{}/quotas/'.format(project_id),
                                   data=json.dumps(new_quota_data),
                                   content_type="application/json")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"], "You do not have permission to add a quota to a project.")

#     #def test_update_usage(self):


