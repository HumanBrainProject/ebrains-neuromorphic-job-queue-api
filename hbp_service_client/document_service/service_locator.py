'''A class to retrieve service api endpints'''

import requests

SERVICES_URL_PER_ENV = {
    'dev': 'https://collab-dev.humanbrainproject.eu/services.json',
    'prod': 'https://collab.humanbrainproject.eu/services.json'
}


class ServiceLocator(object):
    '''A class to retrieve service api endpints'''
    def __init__(self, services_url):
        ''' Create new service locator
            Arguments:
                services_url: The url of the json file where the services url are defined
            Returns:
                A service locator instance
        '''
        self.__services_url = services_url

    @classmethod
    def new(cls, environment='prod'):
        ''' Create new service locator
            Arguments:
                environment: The environment to use to get the services.json url
            Returns:
                A service locator instance
        '''
        return cls(SERVICES_URL_PER_ENV[environment])

    def get_service_url(self, service, version):
        ''' Get the service URL
            Arguments:
                service: The service name
                version: The service version
            Returns:
                The URL where the service is located
        '''
        return self.__get_services()[service][version]

    def __get_services(self):
        '''Wrapper function around requests'''
        return requests.get(self.__services_url).json()
