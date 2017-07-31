from datetime import datetime
from django.db import models
import jsonfield
import pytz
from taggit.managers import TaggableManager


def now_in_utc():
    return datetime.now(pytz.UTC)


class Job(models.Model):
    """
    Job

    Each job has an entry with all the required information to be run on the hardware.
    """
    status_choices = (
        ("submitted", "submitted"),
        ("validated", "validated"),
        ("running", "running"),
        ("mapped", "mapped"),
        ("finished", "finished"),
        ("error", "error"),
        ("removed", "removed")
    )
    code = models.TextField()
    command = models.CharField(max_length=200, blank=True)
    collab_id = models.TextField(null=False, blank=False, max_length=25)  # should be a CharField
    user_id = models.CharField(default="me", max_length=25)
    status = models.CharField(choices=status_choices, default="submitted", blank=True, max_length=15)
    input_data = models.ManyToManyField('DataItem', related_name="input_to", blank=True)
    output_data = models.ManyToManyField('DataItem', related_name="generated_by", blank=True)
    hardware_platform = models.CharField(max_length=20)
    hardware_config = jsonfield.JSONField(null=True, blank=True)
    timestamp_submission = models.DateTimeField(default=now_in_utc, blank=True)
    timestamp_completion = models.DateTimeField(null=True, blank=True)
    provenance = jsonfield.JSONField(null=True, blank=True)
    resource_usage = models.FloatField(null=True, blank=True)
    tags = TaggableManager(blank=True)

    def __str__(self):
        return "Job #%d" % self.pk

    # UUIDField is not supported by the automatic JSON serializer
    # so we add a method that retrieves a more convenient dict.
    def as_json(self):
        return {
            'code': self.code,
            'command': self.command,
            'status': self.status,
            'collab_id': self.collab_id,
            'user_id': self.user_id,
            'input_data': self.input_data.all(),
            'output_data': self.output_data.all(),
            'hardware_platform': self.hardware_platform,
            'hardware_config': self.hardware_config,
            'timestamp_submission': self.timestamp_submission,
            'timestamp_completion': self.timestamp_completion,
            'provenance': self.provenance,
            'resource_usage': self.resource_usage,
            'tags': [tag.name for tag in self.tags.all()],
        }
        
    def __unicode__(self):
        return "Job #%d - %s" % (self.pk, str(self.collab_id))


class DataItem(models.Model):
    """
    DataItem

    General purpose URL field for input and output data.
    """
    url = models.URLField(max_length=1000)

    def __str__(self):
        return self.url


class Log(models.Model):
    job = models.OneToOneField(Job, on_delete=models.CASCADE, primary_key=True)
    content = models.TextField(blank=True)
