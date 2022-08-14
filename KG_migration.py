"""

This is just pseudo-code for now
"""

import os
from simqueue.models import Job
from somewhere import get_collab_name, get_user_email
from fairgraph.client import KGClient
from fairgraph.base import KGQuery
from fairgraph.core import Person
from fairgraph.commons import AbstractionLevel
from fairgraph.brainsimulation import Simulation, ModelProject, ModelInstance, SimulationOutput
from fairgraph.computing import HardwareSystem, ComputingEnvironment


token = os.environ["HBP_AUTH_TOKEN"]
client = KGClient(token, nexus_endpoint="https://nexus-int.humanbrainproject.org/v0")
#client = KGClient(token, nexus_endpoint="https://nexus.humanbrainproject.org/v0")

http_client = client._nexus_client._http_client
user_info_cache = {}
collab_info_cache = {}


def _get_user_info(user_id):
    if user_id in user_info_cache:
        user_info = user_info_cache[user_id]
    else:
        response = http_client.get("https://services.humanbrainproject.eu/idm/v1/api/user/{}".format(user_id))
        user_info = response.json()
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
        response = http_client.get("https://services.humanbrainproject.eu/collab/v0/collab/{}".format(collab_id))
        collab_info = response.json()
        collab_info_cache[collab_id] = collab_info
    return collab_info


def get_collab_name(collab_id):
    return _get_collab_info[collab_id]["title"]


def get_collab_creation_date(collab_id):
    return _get_collab_info[collab_id]["title"]["created"]  # parse this to return a datetime object?


hardware_systems = {
    obj.name: obj
    for obj in HardwareSystem.list(client)
}


for job in Job.objects.all()[:10]:
    email = get_user_email(job.user_id)
    query_filter = {
        'path': 'schema:email',
        'op': 'eq',
        'value': email
    }
    user = KGQuery(Person, query_filter, {"schema": "http://schema.org/"}).resolve(client)
    if user is None:
        last_name, first_name = get_user_name(job.user_id)
        user = Person(email=email, first_name=first_name, last_name=last_name)
#        user.save(client)

    if job.code.startswith("https://github.com"):  # todo: look through current values of job.code to check for other VCS websites like bitbucket
        #version = extract_from_url
        raise NotImplementedError("to do")
    else:
        version = "unknown-{}".format(job.timestamp_submission.isoformat())
    model_instance = ModelInstance(job.code, job.command, version=version)
#    model_instance.save(client)

    # as a first pass, assume that one Collab maps to one ModelProject
    # we can fix this on a case-by-case basis where it doesn't hold
    filter_query = {
        'path': "nsg:collabID",
        'op': 'eq',
        'value': job.collab_id
    }
    context = {"nsg": "https://bbp-nexus.epfl.ch/vocabs/bbp/neurosciencegraph/core/v0.1.0/"}
    model_project = KGQuery(ModelProject, filter_query, context).resolve(client)
    if model_project is None:
        name = get_collab_name(job.collab_id)
        collab_creation_date = get_collab_creation_date(job.collab_id)
        model_project = ModelProject(
            name=name, owners=[user], authors=[user],
            date_created=collab_creation_date, private=True,
            collab_id=job.collab_id,
            abstraction_level=AbstractionLevel("spiking neurons: point neuron"))


    model_project.instances.append(model_instance)
#    model_project.save(client)

    if job.input_data:
        print("Warning: cannot handle this yet")

    if job.output_data:
        simulation_results = []
        for data_item in job.output_data.all():
            name = "job_{}_{}".format(job.id, data_item.url.split("/")[-1])
            output = SimulationOutput(name, result_file=data_item.url, timestamp=job.timestamp_completion)
#            output.save(client)
        # create VariableReports for individual recordings, if they can be inferred?

    # todo: handle log - just make part of output data dataset?
    # or should we always store log files in CSCS, in a special container?


#    hw_config = HardwareConfiguration.query(**job.hardware_config, client)
#    if not hw_config:
#        hw_config.save(client)

    hw_system = hardware_systems[job.hardware_platform]

    env = ComputingEnvironment.query(hardware=hw_system,
                                     config=job.hardware_config,
                                     libraries=job.provenance)  # will need to extract this info from provenance JSON
#    if env is None:
#        env.save(client)

    simulation = Simulation(
        model_instance=model_instance,
        configuration={"command": job.command},  # simulation config, not hardware config
        computing_environment=env,
        status=job.status,  # check mapping of values
        was_started_by=user,
        was_associated_with=[user],
        started_at_time=job.timestamp_submission,
        ended_at_time=job.timestamp_completion,
        result=simulation_results,
        resource_usage=job.resource_usage,  # free field, kwargs
        tags=job.tags,
        job_id=job.id
    )
#    simulation.save(client)
