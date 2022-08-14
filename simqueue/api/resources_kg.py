import json
from django.conf import settings
from tastypie.resources import Resource
from tastypie import fields
from tastypie.bundle import Bundle


from fairgraph.client import KGClient
from fairgraph.base import KGQuery
from fairgraph.core import Person, use_namespace as use_core_namespace
from fairgraph.commons import AbstractionLevel, model_format_to_content_type
from fairgraph.brainsimulation import (
    Simulation, ModelProject, ModelInstance, SimulationOutput, ModelScript, SimulationConfiguration,
    use_namespace as use_simulation_namespace)
from fairgraph.computing import (
    HardwareSystem, ComputingEnvironment,
    use_namespace as use_computing_namespace)


use_core_namespace("neuromorphic")
use_computing_namespace("neuromorphic")
use_simulation_namespace("neuromorphic")

CODE_MAX_LENGTH = 15000


class ResultsResource(Resource):
    timestamp_submission = fields.DateTimeField(attribute="start_time")
    timestamp_completion = fields.DateTimeField(attribute="end_time", null=True)
    code = fields.CharField()  #attribute="model_instance.main_script.code_location", blank=True, null=True)
    #code = fields.CharField(attribute="model_instance.main_script.code_content")
    command = fields.CharField()  #attribute="sim_config.config_file.content", blank=True, null=True)
    collab_id = fields.CharField()  # attribute="model_instance.project.collab_id") - need to resolve KG Query
    user_id = fields.CharField()  #attribute="started_by")
    status = fields.CharField(attribute="status")
    hardware_platform = fields.CharField()  #attribute="computing_environment.hardware.name")
    resource_usage = fields.CharField(attribute="resource_usage", blank=True, null=True)
    output_data = fields.ListField(attribute="result", use_in="detail")
    hardware_config = fields.DictField()  #attribute="computing_environment.config.input", blank=True, null=True, use_in="detail")
    provenance = fields.DictField()  #attribute="computing_environment.config.provenance", blank=True, null=True, use_in="detail")
    #tags = fields.ListField()
    id = fields.IntegerField(attribute="job_id")

    # comments = fields.ToManyField('simqueue.api.resources.CommentResource', 'comments', null=True, full=True)
    # input_data = fields.ToManyField(DataItemResource, "input_data", full=True, null=True, use_in="detail")

    class Meta:
        resource_name = "results-kg"
        # you can only retrieve the list
        list_allowed_methods = ['get']
        # you can retrieve and modify each item
        detail_allowed_methods = ['get', 'put', 'patch', 'delete']

    def dehydrate_user_id(self, bundle):
        return bundle.obj.started_by.instance.data.get("user_id")

    def dehydrate_code(self, bundle):
        script = bundle.obj.model_instance.main_script
        if script.code_location.endswith("attachment"):
            kg_client = self.get_kg_client(bundle)
            code = script.read_content(kg_client)
            if len(code) > CODE_MAX_LENGTH:
                code = code[:CODE_MAX_LENGTH] + "\n\n...truncated..."
        else:
            code = script.code_location
        return code

    def dehydrate_command(self, bundle):
        config = bundle.obj.simulation_config
        if config:
            return str(config.config_file)
        else:
            return None

    def dehydrate_collab_id(self, bundle):
        return bundle.data["collab_id"]

    def dehydrate_hardware_platform(self, bundle):
        return bundle.obj.computing_environment.hardware.name

    def dehydrate_provenance(self, bundle):
        return json.loads(bundle.obj.computing_environment.config)["provenance"]

    def dehydrate_hardware_config(self, bundle):
        return json.loads(bundle.obj.computing_environment.config)["input"]

    def detail_uri_kwargs(self, bundle_or_obj):
        if isinstance(bundle_or_obj, Bundle):
            kwargs = {'pk': bundle_or_obj.obj.job_id}
        else:
            kwargs = {'pk': bundle_or_obj.job_id}
        return kwargs

    # def get_object_list(self, request):


    #     return results

    def get_kg_client(self, bundle):
        auth = bundle.request.META["HTTP_AUTHORIZATION"]
        token = auth.split("Bearer ")[1]
        return KGClient(nexus_endpoint=settings.NEXUS_ENDPOINT,
                        token=token)

    def obj_get_list(self, bundle, **kwargs):
        # Filtering...
        kg_client = self.get_kg_client(bundle)
        simulations = Simulation.list(kg_client, api="nexus", size=50, resolved=True)
        for sim in simulations:
            project = sim.model_instance.project.resolve(kg_client, api="nexus")
            if project:
                bundle.data["collab_id"] = project.collab_id
            else:
                bundle.data["collab_id"] = None
        #return self.get_object_list(bundle.request)
        return simulations

    # def obj_get(self, bundle, **kwargs):


    #     return obj
