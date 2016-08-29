"""

"""

from __future__ import print_function, unicode_literals
from collections import OrderedDict
import logging
import json
import spur

logger = logging.getLogger("deploy")


class Service(object):
    """
    A service provided by a Docker container.
    """

    def __init__(self, name, image, node, status=None, id=None, ports=None, env=None, volumes=None):
        self.name = name
        self.image = image
        self.node = node
        self.status = status
        self.id = id
        self.ports = ports
        self.env = env
        self.volumes = volumes

    def __repr__(self):
        return "{} ({}); {}".format(self.name, self.image, self.status)

    def as_dict(self):
        d = OrderedDict((key.title(), str(getattr(self, key)))
                        for key in ["name", "image", "status", "url"])
        d["ID"] = self.id[:12]
        d["Node"] = self.node.name
        d["Ports"] = self.ports
        return d

    @property
    def url(self):
        return "https://" + self.node.ip_address

    @classmethod
    def from_json(cls, s, node):
        data = json.loads(s)[0]
        logger.debug(s)
        raw_ports = data["NetworkSettings"]["Ports"]
        ports = {}
        for k, v in raw_ports.items():
            if v is not None:
                ports[k.split("/")[0]] = v[0]['HostPort']
        raw_env = data["Config"]["Env"]
        env = {}
        for item in raw_env:
            parts = item.split("=")
            k = parts[0]
            v = "".join(parts[1:])
            env[k] = v
        volumes = []
        volume_data = data["HostConfig"]["Binds"]
        if volume_data:
            for bind in volume_data:  # info also available under "Mounts"
                a, b = bind.split(":")
                assert a == b
                volumes.append(a)
        obj = cls(name=data["Name"][1:],  # remove initial "/"
                  image=data["Config"]["Image"],
                  node=node,
                  status=data["State"]["Status"],
                  id=data["Id"],
                  ports=ports,
                  env=env,
                  volumes=volumes)
        return obj

    def start(self):
        response = self.node._remote_execute("docker start {}".format(self.id))
        self.update_status()

    def stop(self):
        response = self.node._remote_execute("docker stop {}".format(self.id))
        self.update_status()

    def terminate(self):
        response = self.node.terminate_service(self.id)
        return response

    def logs(self, filename=None, append=False):
        response = self.node._remote_execute("docker logs {}".format(self.id))
        if filename:
            with open(filename, mode=append and "a" or "w") as fp:
                fp.write(response)
            return filename
        else:
            return response

    def update_status(self):
        response = self.node._remote_execute("docker inspect {}".format(self.id))
        data = json.loads(response)[0]
        self.status = data["State"]["Status"]

    def launch(self):
        self.node.pull(self.image)
        ports_str = ""
        if self.ports:
            for p1, p2 in self.ports.items():
                #ports_str += "-p {}:{} ".format(p1.split("/")[0], p2.split("/")[0])
                if p2 is None:
                    ports_str += "-p {}".format(p1)
                else:
                    ports_str += "-p {}:{} ".format(p1, p2)
        env_str = ""
        if self.env:
            for name, val in self.env.items():
                env_str += '-e "{}={}" '.format(name, val)
        vol_str = ""
        if self.volumes:
            for dir_name in self.volumes:
                vol_str += '-v {}:{}'.format(dir_name, dir_name)
        cmd = "docker run -d --name={} {} {} {} {}".format(self.name, ports_str, env_str, vol_str, self.image)
        print(cmd)
        response = self.node._remote_execute(cmd)
        self.id = response.strip()
        self.update_status()

    def redeploy(self):
        """Redeploy the service with the latest image."""
        self.node.pull(self.image)
        self.stop()
        self.node.rename_service(self.name, self.name + "-old")
        old_id = self.id
        try:
            self.launch()
        except spur.RunProcessError:
            self.node.rename_service(self.name + "-old", self.name)
            self.start()  # restart original container
            raise
        finally:
            self.node.terminate_service(old_id)
