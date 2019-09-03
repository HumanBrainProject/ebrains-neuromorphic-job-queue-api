from django.db import models
from django.utils.encoding import python_2_unicode_compatible


@python_2_unicode_compatible
class ProjectMember(models.Model):
    user_id = models.CharField(max_length=15, help_text="HBP user id")
    approved_by = models.CharField(max_length=15, help_text="HBP user id")
    approved_on = models.DateTimeField(null=True, help_text="If null, applicant has not been approved")
    platform = models.CharField(max_length=20, help_text="System to which approval applies")

    def __str__(self):
        return "{} on {}".format(self.user_id, self.platform)


@python_2_unicode_compatible
class Project(models.Model):
    context = models.UUIDField(primary_key=True, unique=True)
    collab = models.CharField(max_length=32, help_text="Collab id")
    owner = models.CharField(max_length=32, help_text="HBP user id")
    title = models.CharField(max_length=200, blank=True)
    abstract = models.TextField(blank=True)
    description = models.TextField(blank=True)
    duration = models.PositiveIntegerField(default=0, help_text="Requested/granted duration in days")
    start_date = models.DateField(null=True, blank=True, help_text="Value set when project is accepted")
    members = models.ManyToManyField(ProjectMember, blank=True)
    accepted = models.BooleanField(default=False)
    submission_date = models.DateField(null=True, blank=True)
    decision_date = models.DateField(null=True, blank=True, help_text="Value set when project is accepted/refused")

    def status(self):
        if self.submission_date is None:
            return "in preparation"
        elif self.accepted:
            return "accepted"
        elif self.decision_date is None:
            return "under review"
        else:
            return "rejected"

    def __str__(self):
        return self.title


@python_2_unicode_compatible
class Quota(models.Model):
    units = models.CharField(max_length=15)   # core-hours, wafer-hours, GB  # necessary?
    limit = models.FloatField(help_text="Quantity of resources granted")
    usage = models.FloatField(help_text="Quantity of resources used")
    platform = models.CharField(max_length=20, help_text="System to which quota applies")
    project = models.ForeignKey(Project, on_delete=models.CASCADE)

    def exhausted(self):
        return self.usage >= self.limit

    def __str__(self):
        return "'{}' on {}: {}/{} {}".format(self.project.title, self.platform, self.usage, self.limit, self.units)


@python_2_unicode_compatible
class Review(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    reviewer = models.CharField(max_length=15, help_text="HBP user id")
    content = models.TextField()
    type = models.CharField(max_length=10, choices=(("technical", "technical"), ("scientific", "scientific")))
    date_due = models.DateField(help_text="Date when review due")
    date_completed = models.DateField(help_text="Date when review submitted")

    def __str__(self):
        return "{} review of {} by {}".format(self.type.title(), self.project.title, self.reviewer)
