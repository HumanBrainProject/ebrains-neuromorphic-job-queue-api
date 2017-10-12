from django.contrib import admin
from simqueue.models import Job, DataItem, Log, Comment


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ('id', 'hardware_platform', 'status')
    date_hierarchy = 'timestamp_submission'
    list_filter = ('status', 'hardware_platform')
    search_fields = ('log', 'code', 'hardware_config')
    filter_horizontal = ('input_data', 'output_data')


admin.site.register(DataItem)

admin.site.register(Log)

admin.site.register(Comment)
