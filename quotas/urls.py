from django.conf.urls import url
from .views import (ProjectResource, ProjectListResource,
                    QuotaResource, QuotaListResource)

uuid_pattern = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}"
# simplified from http://stackoverflow.com/questions/11384589/what-is-the-correct-regex-for-matching-values-generated-by-uuid-uuid4-hex
# will accept some patterns that are not strictly UUID v4

urlpatterns = (
    url(r'^projects/$',
        ProjectListResource.as_view(),
        name="project-list-resource"),
    url(r'^projects/(?P<project_id>{})$'.format(uuid_pattern),
        ProjectResource.as_view(),
        name="project-resource"),
    url(r'^projects/(?P<project_id>{})/quotas/$'.format(uuid_pattern),
        QuotaListResource.as_view(),
        name="quota-list-resource"),
    url(r'^projects/(?P<project_id>{})/quotas/(?P<quota_id>\d+)$'.format(uuid_pattern),
        QuotaResource.as_view(),
        name="quota-resource"),
)