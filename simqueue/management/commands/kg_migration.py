"""
Script to migrate data to HBP Knowledge Graph

"""

import os
import hashlib
import json
from urllib.parse import quote
from datetime import timedelta
from django.core.management.base import BaseCommand
from simqueue.models import Job
from openid_http_client.http_client import HttpClient
from requests.exceptions import HTTPError
from datetime import datetime
from dateutil import parser as date_parser

from fairgraph.client import KGClient
from fairgraph.base import KGQuery
from fairgraph.core import Person, use_namespace as use_core_namespace
from fairgraph.commons import AbstractionLevel, model_format_to_content_type
from fairgraph.brainsimulation import (
    Simulation, ModelProject, ModelInstance, SimulationOutput, ModelScript, SimulationConfiguration,
    use_namespace as use_simulation_namespace, ATTACHMENT_SIZE_LIMIT)
from fairgraph.computing import (
    HardwareSystem, ComputingEnvironment,
    use_namespace as use_computing_namespace)


use_core_namespace("neuromorphic")
use_computing_namespace("neuromorphic")
use_simulation_namespace("neuromorphic")

token = os.environ["HBP_AUTH_TOKEN"]
kg_client = KGClient(token, nexus_endpoint="https://nexus-int.humanbrainproject.org/v0")
#kg_client = KGClient(token, nexus_endpoint="https://nexus.humanbrainproject.org/v0")

http_client = HttpClient("https://services.humanbrainproject.eu", prefix="",
                         auth_client=kg_client._nexus_client._http_client.auth_client)
user_info_cache = {}
collab_info_cache = {}


def _get_user_info(user_id):
    if user_id in user_info_cache:
        user_info = user_info_cache[user_id]
    else:
        user_info = http_client.get("idm/v1/api/user/{}".format(user_id))
        user_info_cache[user_id] = user_info
    return user_info


def get_user_email(user_id):
    user_info = _get_user_info(user_id)
    for entry in user_info["emails"]:
        if entry["primary"]:
            return entry["value"]


def get_user_name(user_id):
    user_info = _get_user_info(user_id)
    return user_info["familyName"], user_info["givenName"]


def _get_collab_info(collab_id):
    if collab_id in collab_info_cache:
        collab_info = collab_info_cache[collab_id]
    else:
        try:
            collab_info = http_client.get("collab/v0/collab/{}".format(collab_id))
        except HTTPError as err:
            if err.response.status_code == 403:
                # private collab, no access
                collab_info = {
                    "title": "Collab #{}".format(collab_id),
                    "created": None
                }
            else:
                raise
        collab_info_cache[collab_id] = collab_info
    return collab_info


def get_collab_name(collab_id):
    return _get_collab_info(collab_id)["title"]


def get_collab_creation_date(collab_id):
    return _get_collab_info(collab_id)["created"]  # parse this to return a datetime object?


class Command(BaseCommand):

    def handle(self, *args, **options):


        hardware_systems = {
            #obj.name: obj
            #for obj in HardwareSystem.list(kg_client)
            "SpiNNaker": HardwareSystem(name="SpiNNaker"),
            "Spikey": HardwareSystem(name="Spikey"),
            "BrainScaleS": HardwareSystem(name="BrainScaleS"),
            "BrainScaleS-ESS": HardwareSystem(name="BrainScaleS-ESS")
        }
        for hs in hardware_systems.values():
            hs.save(kg_client)
        print(hardware_systems)

        #for job in Job.objects.all()[:100]:
        for job in Job.objects.filter(collab_id=633):
            print("\n" + "-" * 79)
            email = get_user_email(job.user_id)
            query_filter = {"nexus": {
                'path': 'schema:email',
                'op': 'eq',
                'value': email
            }}
            print(email)
            user = KGQuery(Person, query_filter, {"schema": "http://schema.org/"}).resolve(kg_client, api="nexus")
            if not user:
                family_name, given_name = get_user_name(job.user_id)
                user = Person(email=email, given_name=given_name, family_name=family_name)
                user.save(kg_client)

            # a bit of a hack, since we don't have a proper place to store
            # the user id
            user.instance.data["user_id"] = job.user_id
            kg_client.update_instance(user.instance)

            print(user)
            # todo: we need to distinguish the user account that was used, not just the person
            #       (mainly for where we use different accounts for testing)

            collab_name = get_collab_name(job.collab_id)
            #if job.code.startswith("https://github.com"):  # todo: look through current values of job.code to check for other VCS websites like bitbucket
            #    #version = extract_from_url
            #    raise NotImplementedError("to do")
            #else:
            version = "unknown-{}".format(job.timestamp_submission.isoformat())
            name = "Neuromorphic model instance run on {} system at {}".format(job.hardware_platform, job.timestamp_submission.isoformat())

            if job.code.startswith("http"):
                script = ModelScript(name, code_location=job.code, code_format="PyNN")
            elif len(job.code) < ATTACHMENT_SIZE_LIMIT:
                script = ModelScript(name, code_content=job.code, code_format="PyNN")
            else:
                filename = "nmpi_job_{}_script.py".format(job.id)
                with open(filename, "w") as fp:
                    fp.write(job.code)
                script = ModelScript(name,
                                     code_location="https://object.cscs.ch/v1/AUTH_fake_nmpi_url_to_fix/{}".format(filename),
                                     code_format="PyNN")
                print("Very large scripts will need to be saved to a file at CSCS")
            script.save(kg_client)

            model_instance = ModelInstance(
                name=name, brain_region=None, species=None, model_of=None,
                main_script=script, release=None, version=version, timestamp=job.timestamp_submission,
                part_of=None, description=None, parameters=None)
            print(model_instance)
            model_instance.save(kg_client)

            # as a first pass, assume that one Collab maps to one ModelProject
            # we can fix this on a case-by-case basis where it doesn't hold
            filter_query = {"nexus": {
                'path': "nsg:collabID",
                'op': 'eq',
                'value': job.collab_id
            }}
            context = {"nsg": "https://bbp-nexus.epfl.ch/vocabs/bbp/neurosciencegraph/core/v0.1.0/"}
            model_project = KGQuery(ModelProject, filter_query, context).resolve(kg_client, api="nexus")
            if not model_project:
                name = collab_name
                collab_creation_date = get_collab_creation_date(job.collab_id)
                if collab_creation_date:
                    collab_creation_date = date_parser.parse(collab_creation_date)
                else:
                    collab_creation_date = datetime(2000, 1, 1)  # to fix later
                model_project = ModelProject(
                    name=name, owners=[user], authors=[user],
                    date_created=collab_creation_date, private=True,
                    collab_id=int(job.collab_id),
                    description=name,
                    abstraction_level=AbstractionLevel("spiking neurons: point neuron"))
            print(model_project)

            try:
                model_project.instances.append(model_instance)
            except AttributeError:
                model_project.instances = [model_instance]
            model_project.save(kg_client)

            if job.input_data.count():
                print("Warning: cannot handle input data yet: {}".format(job.input_data))

            if job.output_data:
                simulation_results = []
                for data_item in job.output_data.all():
                    name = "job_{}_{}".format(job.id, data_item.url.split("/")[-1])
                    output = SimulationOutput(name=name,
                                              result_file=quote(data_item.url, safe="%/:=&?~#+!$,;'@()*[]"),
                                              timestamp=job.timestamp_completion)
                    output.save(kg_client)
                # create VariableReports for individual recordings, if they can be inferred?

            # todo: handle log - just make part of output data dataset?
            # or should we always store log files in CSCS, in a special container?


        #    hw_config = HardwareConfiguration.query(**job.hardware_config, kg_client)
        #    if not hw_config:
        #        hw_config.save(kg_client)

            hw_system = hardware_systems[job.hardware_platform]

            env_summary = {"platform": job.hardware_platform}
            env_summary.update(job.hardware_config or {})
            env_summary.update(job.provenance or {})
            env = ComputingEnvironment(
                name=hashlib.sha1(json.dumps(env_summary, sort_keys=True).encode('utf-8')).hexdigest(),
                hardware=hw_system,
                config=json.dumps({"input": job.hardware_config, "provenance": job.provenance}, indent=4),
                libraries=None)  # todo: will need to extract this info from provenance JSON
            print(env)
            env.save(kg_client)

            if job.command:
                tmp_filename = "tmp_job_{}_config.json".format(job.id)
                with open(tmp_filename, "w") as fp:
                    json.dump({"command": job.command}, fp)
                sim_config = SimulationConfiguration(
                    name="config for NMPI job #{}".format(job.id),
                    config_file=tmp_filename,
                    timestamp=job.timestamp_submission
                )
                sim_config.save(kg_client)
            else:
                sim_config = None

            if job.timestamp_completion and job.timestamp_completion <= job.timestamp_submission:
                print("WARNING: completion time before or equal to start time")
                job.timestamp_completion = job.timestamp_submission + timedelta(seconds=1234)

            simulation = Simulation(
                model_instance=model_instance,
                simulation_config=sim_config,
                computing_environment=env,
                status=job.status,  # check mapping of values
                started_by=user,
                start_time=job.timestamp_submission,
                end_time=job.timestamp_completion,
                result=simulation_results,
                resource_usage=job.resource_usage,
                tags=[tag.name for tag in job.tags.all()],
                job_id=str(job.id)
            )
            print(simulation)
            simulation.save(kg_client)
