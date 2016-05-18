
from .nodes import Node, list_nodes, get_node
from .services import Service


def list_services():
    nodes = list_nodes()
    services = []
    for node in nodes:
        if "dockerapp.io" not in node.name:  # can't currently list services run on Docker Cloud
            services += node.services()
    return services


def find_service(name):
    nodes = list_nodes()
    for node in nodes:
        if "dockerapp.io" not in node.name:
            for service in node.services():
                if service.name == name:
                    return service
    return None
