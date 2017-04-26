'''A class to make requests'''

import requests
from os.path import join as joinp
from hbp_service_client.document_service.exceptions import (
    DocException, DocForbiddenException, DocNotFoundException)
from hbp_service_client.document_service.service_locator import ServiceLocator

# pylint: disable=E1101
# Pylint complains about the requests.codes lookups


class Requestor(object):
    '''A class to make requests'''

    def __init__(self, host, token):
        '''
        Args:
           host: host to connnect to, ie: http://localhost:8888
           token: The access token used to authenticate with the
               service
        '''
        self.__host = host
        self.__token = token

    @classmethod
    def new(cls, service, service_version, access_token, environment='prod'):
        '''Create new requestor

            Arguments:
                service: The service name
                service_version: The service version
                access_token: The access token used to authenticate with the
                    service
                environment: The service environment to be used for the requestor

            Returns:
                A requestor instance

        '''
        return cls(
            ServiceLocator.new(environment).get_service_url(service, service_version),
            access_token
        )

    def send(self, method, endpoint, headers=None, **kwargs):
        """ Wrap requests calls with basic exception handling.

        Args:
            method: The name of the function of requests to call, eg. get, post,
                etc
            **kwargs: key/value arguments to pass in with the requests func call

        Returns:
            The response object of the requests call (if any)

        Raises:
            DocForbiddenException: 403
            DocNotFoundException: 404
            DocException: other 400-600 error codes
            TypeError: wrong header format in kwargs

        """
        resp = requests.request(
            method,
            joinp(self.__host, endpoint) + '/',
            headers=self.__create_headers(headers),
            **kwargs)

        if resp.status_code == requests.codes.forbidden:
            raise DocForbiddenException('You are forbidden to do this.')

        if resp.status_code == requests.codes.not_found:
            raise DocNotFoundException('The entity is not found')

        if not resp.ok:
            # for anything 400 <> 600 throw the standard exception
            raise DocException('Server response: {0} - {1}'.format(
                resp.status_code, resp.text))

        return resp

    def send_and_return_body(self, method, endpoint, headers=None, **kwargs):
        """ Wrap requests calls with basic exception handling.

        Args:
            method: The name of the function of requests to call, eg. get, post,
                etc
            **kwargs: key/value arguments to pass in with the requests func call

        Returns:
            The response body of the requests call (if any)

        Raises:
            DocForbiddenException: 403
            DocNotFoundException: 404
            DocException: other 400-600 error codes
            TypeError: wrong header format in kwargs

        """
        resp = self.send(method, endpoint, headers, **kwargs)

        if resp.headers.get('Content-Type', None) == 'application/json':
            return resp.json()

        return resp.text

    def __create_headers(self, extra_headers):
        '''Helper function to create headers to the request

        Creates default headers with the option to override/extend
        '''
        if extra_headers and not isinstance(extra_headers, dict):
            raise TypeError('You provided extra headers, but not as a dictionary')

        headers = {"Authorization": "Bearer {0}".format(self.__token),
                   "Accept": "application/json"}
        headers.update(extra_headers or {})
        return headers
