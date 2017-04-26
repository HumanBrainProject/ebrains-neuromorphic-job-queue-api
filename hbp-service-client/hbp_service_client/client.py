'''A convenience single client that combines functionality from the different services'''

from hbp_service_client.document_service.client import Client as DC


class Client(object):
    '''A single client that combines functionality from the different services'''

    def __init__(self, doc_client):
        super(Client, self).__init__()
        self.storage = doc_client

    @classmethod
    def new(cls, access_token, environment='prod'):
        '''create a new cross-service client'''

        return cls(
            doc_client=DC.new(access_token, environment=environment))
