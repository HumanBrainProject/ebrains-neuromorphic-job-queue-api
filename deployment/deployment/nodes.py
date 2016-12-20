"""

"""

from collections import OrderedDict
from time import sleep
import shlex
import logging
import digitalocean
import spur
from .services import Service

do_manager = None
logger = logging.getLogger("deploy")


def get_token():
    token = spur.LocalShell().run(['security', 'find-generic-password',
                                   '-s', 'DigitalOcean API token', '-w'])
    return token.output.strip()


def get_docker_password():
    cmd = "security find-internet-password -s hub.docker.com -a cnrsunic -w"
    pswd = spur.LocalShell().run(cmd.split())
    return pswd.output.strip()


class Node(object):
    """
    A compute node.
    """

    def __init__(self):
        pass

    def __repr__(self):
        return "{}@{} [{}, {} MB, {}]".format(self.droplet.name,
                                              self.droplet.ip_address,
                                              self.droplet.status,
                                              self.droplet.size['memory'],
                                              self.droplet.region['name'])

    @property
    def name(self):
        return self.droplet.name

    @property
    def ip_address(self):
        return self.droplet.ip_address

    def as_dict(self):
        d = OrderedDict((key.title(), str(getattr(self.droplet, key)))
                        for key in ["name", "ip_address", "created_at"])
        d["Size"] = self.droplet.size['memory']
        d["Region"] = self.droplet.region['name']
        return d

    def show(self):
        print("Name:       " + self.droplet.name)
        print("IP address: " + str(self.droplet.ip_address))
        print("Status:     " + str(self.droplet.status))
        print("Size:       " + str(self.droplet.size['memory']) + " MB")
        print("Region:     " + self.droplet.region['name'])
        print("Type:       " + self.droplet.image['slug'])
        print("Created:    " + self.droplet.created_at)

    @classmethod
    def from_droplet(cls, droplet):
        obj = cls()
        obj.droplet = droplet
        return obj

    @classmethod
    def create(cls, name, type="docker", size="512mb"):
        # we use the name "type" for Digital Ocean images to avoid confusion with Docker images.
        global do_manager
        if do_manager is None:
            token = get_token()
            do_manager = digitalocean.Manager(token=token)
        new_droplet = digitalocean.Droplet(
                token=do_manager.token,
                name=name,
                region='ams2',
                image=type,
                size_slug=size,
                ssh_keys=['66:0b:b5:20:a0:68:f9:fc:82:5a:de:c1:ce:03:4f:84'])
        new_droplet.create()
        status = None
        while status != "completed":
            actions = new_droplet.get_actions()
            actions[0].load()
            status = actions[0].status
            sleep(10)
        running_droplet = do_manager.get_droplet(new_droplet.id)
        return cls.from_droplet(running_droplet)

    def _remote_execute(self, cmd, cwd=None):
        shell = spur.SshShell(
                    hostname=self.droplet.ip_address, username="root",
                    private_key_file="/Users/andrew/.ssh/id_dsa",
                    missing_host_key=spur.ssh.MissingHostKey.warn)
        with shell:
            result = shell.run(shlex.split(cmd), cwd=cwd)
            return result.output

    def images(self):
        print(self._remote_execute("docker images"))

    def pull(self, image):
        logger.info("Pulling {} on {}".format(image, self.name))
        docker_password = get_docker_password()
        cmd = "docker login --username=cnrsunic --password='{}'".format(docker_password)
        result1 = self._remote_execute("docker login --username=cnrsunic --password='{}' hub.docker.com".format(docker_password))
        logger.info("Logged into hub.docker.com")
        logger.debug("Pulling image {}".format(image))
        result2 = self._remote_execute("docker pull {}".format(image))
        if "Downloaded newer image" in result2 or "Image is up to date" in result2:
            return True
        else:
            raise Exception(result2)
            return False

    def get_service(self, id):
        response = self._remote_execute("docker inspect {}".format(id))
        return Service.from_json(response, node=self)

    def services(self, show_all=False):
        cmd = "docker ps -q"
        if show_all:
            cmd += " -a"
        try:
            response = self._remote_execute(cmd)
        except spur.ssh.ConnectionError as err:
            logger.warning(err.message)
            response = None
        if response:
            ids = response.strip().split("\n")
        else:
            ids = []
        return [self.get_service(id) for id in ids]

    def terminate_service(self, id):
        response = self._remote_execute("docker rm -f {}".format(id))

    def rename_service(self, old_name, new_name):
        response = self._remote_execute("docker rename {} {}".format(old_name, new_name))

    def shutdown(self):
        self.droplet.shutdown()

    def destroy(self):
        self.droplet.destroy()


def list_nodes():
    global do_manager
    if do_manager is None:
        token = get_token()
        do_manager = digitalocean.Manager(token=token)
    return [Node.from_droplet(droplet)
            for droplet in do_manager.get_all_droplets()]

def get_node(name):
    """Get a node by name."""
    all_nodes = list_nodes()
    for node in all_nodes:
        if node.name == name:
            return node
    raise Exception("No such node: {}".format(name))
