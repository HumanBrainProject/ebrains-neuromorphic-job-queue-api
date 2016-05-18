from django.contrib import admin
from .models import Project, Quota, Review, ProjectMember

admin.site.register(Quota)
admin.site.register(Project)
admin.site.register(Review)
admin.site.register(ProjectMember)
