import unittest

from hbp_service_client.document_service.requestor import Requestor, DocForbiddenException, DocNotFoundException, DocException
import httpretty
import re
from hamcrest import *

class TestRequestor(unittest.TestCase):
    def setUp(self):
        httpretty.enable()
        httpretty.register_uri(httpretty.GET, re.compile('https://my.host/.*'))

    def tearDown(self):
        httpretty.disable()
        httpretty.reset()

    def test_should_send_a_request_with_the_given_method(self):
        # given
        requestor = Requestor('https://my.host', '_')

        # when
        requestor.send('GET', '_')

        # then
        assert_that(httpretty.last_request().method, equal_to('GET'))

    def test_should_send_a_request_to_the_given_endpoint_with_a_trailing_slash(self):
        # given
        requestor = Requestor('https://my.host', '_')

        # when
        requestor.send('GET', 'an/endpoint')

        # then
        assert_that(httpretty.last_request().path, equal_to('/an/endpoint/'))

    def test_should_send_a_request_with_an_accept_json_header(self):
        # given
        requestor = Requestor('https://my.host', '_')

        # when
        requestor.send('GET', '_')

        # then
        assert_that(httpretty.last_request().headers, has_entries({ 'Accept': 'application/json'}))

    def test_should_send_a_request_with_the_given_access_token_as_an_authorization_header(self):
        # given
        requestor = Requestor('https://my.host', 'an-access-token')

        # when
        requestor.send('GET', '_')

        # then
        assert_that(httpretty.last_request().headers, has_entries({ 'Authorization': 'Bearer an-access-token'}))

    def test_should_raise_an_error_if_headers_are_not_provided_as_a_dictionary(self):
        # given
        requestor = Requestor('_', '_')

        # then
        with self.assertRaises(TypeError):
            requestor.send('_', '_', headers='some invalid headers')

    def test_should_add_the_headers_to_the_sent_request_headers(self):
        # given
        requestor = Requestor('https://my.host', '_')

        # when
        requestor.send('GET', '_', headers={ 'a-header-name': 'a header value', 'another-header': 'another value' })

        #then
        assert_that(httpretty.last_request().headers, has_entries({ 'a-header-name': 'a header value'}))
        assert_that(httpretty.last_request().headers, has_entries({ 'another-header': 'another value'}))

    def test_should_add_the_given_parameters_to_the_query_string(self):
        # given
        requestor = Requestor('https://my.host', '_')

        # when
        requestor.send('GET', '_', params={'myparam':'myvalue'})

        # then
        assert_that(httpretty.last_request().querystring, equal_to({'myparam':['myvalue']}))

    def test_should_raise_a_forbidden_exception_for_a_403_http_status_code(self):
        # given
        httpretty.register_uri(
            httpretty.GET, re.compile('https://my.forbidden.host.*'),
            status=403
        )
        requestor = Requestor('https://my.forbidden.host', '_')

        # then
        with self.assertRaises(DocForbiddenException):
            requestor.send('GET', 'an/endpoint')

    def test_should_raise_a_not_found_exception_for_a_404_http_status_code(self):
        # given
        httpretty.register_uri(
            httpretty.GET, 'https://a.host/a/missing/endpoint/',
            status=404
        )
        requestor = Requestor('https://a.host', '_')

        # then
        with self.assertRaises(DocNotFoundException):
            requestor.send('GET', 'a/missing/endpoint')

    def test_should_raise_an_exception_for_other_problematic_http_status_code(self):
        # given
        httpretty.register_uri(
            httpretty.GET, 'https://a.host/a/server/error/endpoint/',
            status=500
        )
        requestor = Requestor('https://a.host', '_')

        # then
        with self.assertRaises(DocException):
            requestor.send('GET', 'a/server/error/endpoint')

    def test_send_and_return_body_should_extract_the_body_from_the_response(self):
        # given
        httpretty.register_uri(
            httpretty.GET, 'https://a.host/an/endpoint/',
            body='some text content'
        )
        requestor = Requestor('https://a.host', '_')

        # when
        response = requestor.send_and_return_body('GET', 'an/endpoint')

        # then
        assert_that(response, equal_to('some text content'))

    def test_send_and_return_body_should_process_a_json_body(self):
        # given
        httpretty.register_uri(
            httpretty.GET, 'https://a.host/an/endpoint/',
            body='{"some_key":3}',
            content_type="application/json"
        )
        requestor = Requestor('https://a.host', '_')

        # when
        response = requestor.send_and_return_body('GET', 'an/endpoint')

        # then
        assert_that(response, equal_to({'some_key': 3}))

    def test_creation_should_configure_host(self):
        # given
        # the services.json file contains the services url
        httpretty.register_uri(
            httpretty.GET,
            'https://collab-dev.humanbrainproject.eu/services.json',
            body='{"my_service": {"v0": "https://dev.host/my_service/api"}}'
        )
        # and the dev.host url returns 200s
        httpretty.register_uri(
            httpretty.GET,
            re.compile('https://dev.host.*')
        )
        requestor = Requestor.new('my_service', 'v0', 'my_access_token', environment='dev')

        # when
        requestor.send('GET', 'an/endpoint')

        # then
        # no exception is raised
