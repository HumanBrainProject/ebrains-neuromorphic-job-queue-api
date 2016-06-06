#!/usr/bin/env python
"""
Script for controlling the deployment of certain components of the
HBP Neuromorphic Computing Platform.

Author: Andrew Davison, CNRS, 2016


Usage: deploy.py [OPTIONS] COMMAND [ARGS]...

Options:
  --debug
  --help   Show this message and exit.

Commands:
  bootstrap  Set-up the development and build environment.
  build      Build a Docker image locally and push to...
  database   Sub-command for managing database services.
  launch     Launch a new service.
  log        Display the log for a given service.
  node       Sub-command for managing server nodes.
  redeploy   Redeploy a running service.
  services   Display a list of services.
  terminate  Terminate a given service.
"""

import os
import logging
from os.path import join, dirname, abspath
try:
    from itertools import imap as map
except ImportError:  # Py 3
    pass
from datetime import datetime
from getpass import getpass
import shlex
import yaml
import git
import spur
import click
from tabulate import tabulate
from deployment import Service, Node, list_nodes, get_node, list_services, find_service

logging.basicConfig(filename='deploy.log', level=logging.WARNING,
                    format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger("deploy")
logger.setLevel(logging.INFO)


do_manager = None
PROJECT_DIR = dirname(dirname(abspath(__file__)))


def load_config(name):
    with open("{}.yml".format(name)) as fp:
        config = yaml.load(fp)
    with open("{}-secrets.yml".format(name)) as fp:
        config.update(yaml.load(fp))
    return config


@click.option("--debug", is_flag=True)
@click.group()
def cli(debug):
    if debug:
        logger.setLevel(logging.DEBUG)

@cli.command()
@click.argument("service")
@click.option("--colour")
def build(service, colour):
    """Build a Docker image locally and push to Docker Hub."""
    repo = git.Repo('.', search_parent_directories=True)
    git_tag = repo.head.commit.hexsha[:7]
    if repo.is_dirty():
        git_tag += "z"

    shell = spur.LocalShell()
    image = load_config(service)["image"]
    logger.info("Building image '{}' for service '{}', environment '{}', version {}".format(image, service, colour, git_tag))

    # build image
    if image == "cnrsunic/nmpi_resource_manager":
        cmd = "docker build -t {} -f resource_manager/Dockerfile .".format(image)
        build_directory = PROJECT_DIR
    elif image == "cnrsunic/neuromorphic_docs":
        cmd = "docker build -t {} .".format(image)
        build_directory = join(PROJECT_DIR, "documentation")
    elif image == "cnrsunic/nmpi_queue_server":
        cmd = "docker build -t {} -f job_manager/Dockerfile .".format(image)
        build_directory = PROJECT_DIR
    else:
        raise NotImplementedError("Building the {} image not yet supported.".format(image))
    click.echo("Building image")
    result = shell.run(cmd.split(), cwd=build_directory, allow_error=True)
    logger.debug(result.output)
    if result.return_code != 0:
        click.echo(result.output)
        raise click.Abort()

    # tag image
    colour_tag = colour or "latest"
    for tag in (colour_tag, git_tag):
        cmd = "docker tag -f {} {}:{}".format(image, image, tag)
        shell.run(cmd.split())

    # push image
    cmd = "docker push {}:{}".format(image, colour_tag)
    click.echo("Pushing image")
    result = shell.run(cmd.split())
    logger.debug(result.output)
    logger.info("Pushed image {}:{}".format(image, colour_tag))


@cli.command()
@click.argument("service")
@click.option("--colour")
def redeploy(service, colour):
    """Redeploy a running service."""
    name = service
    if colour:
        name += "-" + colour
    service = find_service(name)
    logger.info("Redeploying '{}'".format(name))
    service.redeploy()


@cli.command()
@click.argument("service")
@click.option("--colour")
@click.option("--filename")
def log(service, colour, filename):
    """Display the log for a given service."""
    name = service
    if colour:
        name += "-" + colour
    service = find_service(name)
    if filename:
        service.logs(filename=filename)
        click.echo("Saved log to {}".format(filename))
    else:
        click.echo(service.logs())


@cli.command()
@click.argument("service")
@click.option("--colour")
def terminate(service, colour):
    """Terminate a given service."""
    name = service
    if colour:
        name += "-" + colour
    service = find_service(name)
    click.echo(service.terminate())


@cli.command()
def services():
    """Display a list of services."""
    def format_service(s):
        s = s.as_dict()
        s['Ports'] = ", ".join("{}:{}".format(k, v) for k, v in s['Ports'].items())
        return s
    click.echo(tabulate(map(format_service, list_services()),
                        headers="keys"))


@click.argument("node")
@click.argument("service")
@click.option("--colour")
@cli.command()
def launch(service, node, colour=None):
    """Launch a new service."""
    config = load_config(service)
    env_vars = config.get('env', None)
    if env_vars is None:
        env = None
    else:
        env = {}
        for var_name in env_vars:
            env[var_name] = os.getenv(var_name)
            if env[var_name] is None:
                raise Exception("Environment variable '{}' is not defined".format(var_name))
    volumes = config.get('volumes', None)
    secrets = config.get('secrets', None)
    for var_name, value in secrets.items():
        env[var_name] = value
    node_obj = get_node(node)
    name = service
    if colour:
        name += "-" + colour
        tagged_image = config['image'] + ":" + colour
    else:
        tagged_image = config['image'] + ":" + 'latest'
    service = Service(name, tagged_image, node_obj,
                      ports=config.get('ports', None),
                      env=env, volumes=volumes)
    service.launch()
    return service


@cli.group()
def node():
    """
    Sub-command for managing server nodes.
    """
    pass


@node.command('list')
def node_list():
    """Display a list of server nodes."""
    click.echo(tabulate(map(lambda s: s.as_dict(), list_nodes()),
                        headers="keys"))


@click.argument("name")
@click.option("--type", default="docker")
@click.option("--size", type=click.Choice(['512mb', '1gb', '2gb']), default="512mb")
@node.command('create')
def node_create(name, type, size):
    """Create a new server node."""
    return Node.create(name, type, size)


@click.argument("name")
@node.command('destroy')
def node_destroy(name):
    """Destroy a server node."""
    node = get_node(name)
    # todo: add an "are you sure?"
    # todo: check there are no services running on the node before shutting down
    node.destroy()



@cli.command()
def bootstrap():
    """Set-up the development and build environment."""

    # Download private Python packages
    #mkdir packages
    #(pip-compile -i https://bbpteam.epfl.ch/repository/devpi/simple --pre deployment/requirements-bbp.in)
    #pip download -i https://bbpteam.epfl.ch/repository/devpi/simple --pre -r deployment/requirements-bbp.txt -d packages
    #?tar xzf ...
    #(pip-compile job_manager/requirements.in)
    #(pip-compile resource_manager/requirements.in)
    #pip-sync --force -f packages job_manager/requirements.txt resource_manager/requirements.txt

    # Download Javascript dependencies using Bower

    # ?Create conda environment?
    pass


@cli.group()
def database():
    """Sub-command for managing database services."""
    pass


@click.argument("service")
@database.command("dump")
def db_dump(service):
    service_obj = find_service(service)
    config = load_config(service)
    params = {
        'host': service_obj.node.ip_address,
        'port': service_obj.ports['5432'],
        'timestamp': datetime.now().strftime("%Y%m%d%H%M")
    }
    db_password = config.get('secrets')['NMPI_DATABASE_PASSWORD']
    cmd = "pg_dump --clean --create --insert --host={host} --port={port} --username=nmpi_dbadmin --dbname=nmpi --file=nmpi_v2_dump_{timestamp}.sql".format(**params)
    shell = spur.LocalShell()
    shell.run(shlex.split(cmd), update_env={"PGPASSWORD": db_password})


@click.argument("filename")
@click.argument("service")
@database.command("restore")
def db_restore(service, filename):
    service_obj = find_service(service)
    config = load_config(service)
    params = {
        'host': service_obj.node.ip_address,
        'port': service_obj.ports['5432'],
        'filename': filename
    }
    db_password = config.get('secrets')['NMPI_DATABASE_PASSWORD']
    shell = spur.LocalShell()
    psql = "psql -h {host} -p {port} --username=postgres".format(**params)
    cmd = """echo "CREATE USER nmpi_dbadmin WITH PASSWORD '{}';" | """.format(db_password) + psql
    print(cmd)
    #print shlex.split(cmd)
    pg_password = getpass("Enter the password for the 'postgres' user: ")
    shell.run(["sh", "-c", cmd], update_env={"PGPASSWORD": pg_password})
    cmd = psql + " < {filename}".format(**params)
    print(cmd)
    #print shlex.split(cmd)
    shell.run(["sh", "-c", cmd], update_env={"PGPASSWORD": pg_password})


#certbot certonly --standalone --agree-tos --email andrew.davison@unic.cnrs-gif.fr --domains nmpi.hbpneuromorphic.eu nmpi-staging.hbpneuromorphic.eu nmpi-dev.hbpneuromorphic.eu --non-interactive
# --standalone-supported-challenges http-01  # use port 80 only

# deploy.py build quotas blue
# deploy.py redeploy quotas blue
# deploy.py terminate quotas blue
# deploy.py log nmpi green
# deploy.py url nmpi blue
# deploy.py nodes
# deploy.py services
# deploy.py launch db ginormica

if __name__ == "__main__":
    cli()
