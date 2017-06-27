import unittest
import httpretty
import re
import json
import uuid

from mock import patch, Mock
from hamcrest import *

#from hbp_service_client.document_service.requestor import Requestor
from hbp_service_client.document_service.client import Client as DC
from hbp_service_client.document_service.exceptions import (
    DocException, DocArgumentException
)

class TestClient(unittest.TestCase):

    def setUp(self):
        httpretty.enable()
        # Fakes the service locator call to the services.json file
        httpretty.register_uri(
            httpretty.GET, 'https://collab.humanbrainproject.eu/services.json',
            body=json.dumps({ 'document': {'v1': 'https://dummy.host/fake/document/service'} })
        )
        self.client = DC.new('access-token')
        self.random_uuid = str(uuid.uuid4())

    def tearDown(self):
        httpretty.disable()
        httpretty.reset()

    def test_prep_params_ok(self):
        assert_that(
            self.client._prep_params(
                {'self': 'blah', 'foo': 'bar', 'baz': None}),
            equal_to({'foo':'bar'})
        )

    def test_prep_params_does_not_remove_empty_strings(self):
        assert_that(
            self.client._prep_params(
                {'self': 'blah', 'foo': 'bar', 'baz': ''}),
            equal_to({'foo':'bar', 'baz': ''})
        )

    #
    # Enntity endpoints
    #

    def test_get_entity_details_returns_response_body(self):
        some_json = {"a": 1, "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )

        assert_that(
            self.client.get_entity_details(self.random_uuid),
            equal_to(some_json)
        )

    def test_get_entity_verifies_uuids(self):
        assert_that(
            calling(self.client.get_entity_details).with_args('1'),
            raises(DocArgumentException)
        )

    def test_get_entity_path_extracts_path_from_response(self):
        some_json = {"path": "foobar", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )

        assert_that(
            self.client.get_entity_path(self.random_uuid),
            equal_to("foobar")
        )

    def test_get_entity_path_verifies_uuids(self):
        assert_that(
            calling(self.client.get_entity_path).with_args('1'),
            raises(DocArgumentException)
        )

    def test_get_entity_collabid_extracts_id_from_response(self):
        some_json = {"collab_id": "123456", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )

        assert_that(
            self.client.get_entity_collab_id(self.random_uuid),
            equal_to("123456")
        )

    def test_get_entity_collab_id_verifies_uuids(self):
        assert_that(
            calling(self.client.get_entity_collab_id).with_args('1'),
            raises(DocArgumentException)
        )

    def test_get_entity_by_query_returns_response_body(self):
        some_json = {"collab_id": "123456", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )

        assert_that(
            self.client.get_entity_by_query(self.random_uuid),
            equal_to(some_json)
        )

    def test_get_entity_by_query_verifies_uuids(self):
        assert_that(
            calling(self.client.get_entity_by_query).with_args('1'),
            raises(DocArgumentException)
        )

    def test_get_entity_by_query_requires_params(self):
        some_json = {"collab_id": "123456", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )

        # method raises DocArgumentException with no args
        assert_that(
            calling(self.client.get_entity_by_query),
            raises(DocArgumentException)
        )

    def test_get_entity_by_query_extracts_metadata(self):
        some_json = {"collab_id": "123456", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )

        self.client.get_entity_by_query(metadata={'foo': 'bar'})

        # method parses metadata arg
        assert_that(
            httpretty.last_request().querystring,
            equal_to({'foo': ['bar']})  # because querystring always returns a list after the key..
        )

    #
    # Metadata endpoints
    #
    # set_metadata
    #

    def test_set_metadata_verifies_uuids(self):
        assert_that(
            calling(self.client.set_metadata).with_args(
                'entity_type', '1', {}),
            raises(DocArgumentException)
        )

    def test_set_metadata_uses_the_right_method(self):
        metadata = {'foo': 'bar'}
        httpretty.register_uri(
            httpretty.POST, re.compile('https://.*'),
            body=json.dumps(metadata),
            content_type="application/json"
        )

        self.client.set_metadata('entity_type', self.random_uuid, metadata)

        assert_that(
            httpretty.last_request().method,
            equal_to('POST')
        )

    def test_set_metadata_returns_the_response_body(self):
        metadata = {'foo': 'bar'}
        httpretty.register_uri(
            httpretty.POST, re.compile('https://.*'),
            body=json.dumps(metadata),
            content_type="application/json"
        )

        assert_that(
            self.client.set_metadata('entity_type', self.random_uuid, metadata),
            equal_to(metadata)
        )

    def test_set_metadata_sets_the_right_headers(self):
        metadata = {'foo': 'bar'}
        httpretty.register_uri(
            httpretty.POST, re.compile('https://.*'),
            body=json.dumps(metadata),
            content_type="application/json"
        )

        self.client.set_metadata('entity_type', self.random_uuid, metadata)

        assert_that(
            httpretty.last_request().headers,
            has_entries({'Content-Type': 'application/json'})
        )

    def test_set_metadata_checks_metadata_type(self):
        assert_that(
            calling(self.client.set_metadata).with_args(
                'entity_type',
                'entity_id',
                '{"foo": "bar"}'
            ),
            raises(DocArgumentException),
        )

    #
    # get_metadata
    #

    def test_get_metadata_returns_the_response_body(self):
        metadata = {'foo': 'bar'}
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            body=json.dumps(metadata),
            content_type="application/json"
        )
        assert_that(
            self.client.get_metadata('entity_type', self.random_uuid),
            equal_to(metadata)
        )

    def test_get_metadata_verifies_uuids(self):
        assert_that(
            calling(self.client.get_metadata).with_args(
                'entity_type', '1'),
            raises(DocArgumentException)
        )

    #
    # update_metadata
    #

    def test_update_metadata_uses_the_right_method(self):
        metadata = {'foo': 'bar'}
        httpretty.register_uri(
            httpretty.PUT, re.compile('https://.*'),
            body=json.dumps(metadata),
            content_type="application/json"
        )

        self.client.update_metadata('entity_type', self.random_uuid, metadata)

        assert_that(
            httpretty.last_request().method,
            equal_to('PUT')
        )

    def test_update_metadata_verifies_uuids(self):
        assert_that(
            calling(self.client.update_metadata).with_args(
                'entity_type', '1', {}),
            raises(DocArgumentException)
        )

    def test_update_metadata_returns_the_response_body(self):
        metadata = {'foo': 'bar'}
        httpretty.register_uri(
            httpretty.PUT, re.compile('https://.*'),
            body=json.dumps(metadata),
            content_type="application/json"
        )

        assert_that(
            self.client.update_metadata(
                'entity_type', self.random_uuid, metadata),
            equal_to(metadata)
        )

    def test_update_metadata_sets_the_right_headers(self):
        metadata = {'foo': 'bar'}
        httpretty.register_uri(
            httpretty.PUT, re.compile('https://.*'),
            body=json.dumps(metadata),
            content_type="application/json"
        )

        self.client.update_metadata('entity_type', self.random_uuid, metadata)

        assert_that(
            httpretty.last_request().headers,
            has_entries({'Content-Type': 'application/json'})
        )

    def test_update_metadata_checks_metadata_type(self):
        assert_that(
            calling(self.client.update_metadata).with_args(
                'entity_type',
                self.random_uuid,
                '{"foo": "bar"}'
            ),
            raises(DocArgumentException),
        )

    #
    # delete_metadata
    #

    def test_delete_metadata_uses_the_right_method(self):
        httpretty.register_uri(
            httpretty.DELETE, re.compile('https://.*'),
        )

        self.client.delete_metadata(
            "ent_type", self.random_uuid, ['foo', 'bar'])

        assert_that(
            httpretty.last_request().method,
            equal_to('DELETE')
        )

    def test_delete_metadata_verifies_uuids(self):
        assert_that(
            calling(self.client.delete_metadata).with_args(
                'entity_type', '1', []),
            raises(DocArgumentException)
        )

    def test_delete_metadata_sends_the_right_body(self):
        httpretty.register_uri(
            httpretty.DELETE, re.compile('https://.*'),
        )

        self.client.delete_metadata(
            "ent_type", self.random_uuid, ['foo', 'bar'])

        assert_that(
            httpretty.last_request().parsed_body,
            equal_to({'keys': ['foo', 'bar']})
        )

    def test_delete_metadata_checks_metadata_type(self):
        assert_that(
            calling(self.client.delete_metadata).with_args(
                'entity_type',
                self.random_uuid,
                'i am not a list!'
            ),
            raises(DocArgumentException)
        )

    #
    # Project endpoint
    #
    # list_projects
    #

    def test_list_projects_returns_the_response_body(self):
        some_json = {"a": "123456", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )

        assert_that(
            self.client.list_projects(name='foobar', ordering='name'),
            equal_to(some_json)
        )

    def test_list_projects_sends_the_right_params(self):
        some_json = {"a": "123456", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )

        self.client.list_projects(name='foobar', ordering='name')

        assert_that(
            httpretty.last_request().querystring,
            equal_to({'name': ['foobar'], 'ordering': ['name']})
        )

    #
    # get_project_details
    #

    def test_get_project_details_returns_the_response_body(self):
        some_json = {"a": "123456", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )

        assert_that(
            self.client.get_project_details(self.random_uuid),
            equal_to(some_json)
        )

    def test_get_project_details_verifies_uuids(self):
        assert_that(
            calling(self.client.get_project_details).with_args('1'),
            raises(DocArgumentException)
        )

    #
    # list_project_content
    #

    def test_list_project_content_returns_the_response_body(self):
        some_json = {"a": "123456", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )

        assert_that(
            self.client.list_project_content(self.random_uuid, ordering='name'),
            equal_to(some_json)
        )

    def test_list_project_content_verifies_uuids(self):
        assert_that(
            calling(self.client.list_project_content).with_args('1'),
            raises(DocArgumentException)
        )

    def test_list_project_content_send_the_right_params(self):
        some_json = {"a": "123456", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )

        self.client.list_project_content(self.random_uuid, ordering='name')

        assert_that(
            httpretty.last_request().querystring,
            equal_to({'ordering': ['name']})  # project_id excluded!
        )

    #
    # Folder endpoint
    #
    # create_folder
    #

    def test_create_folder_uses_the_right_method(self):
        some_json = {"a": "123456", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.POST, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )

        self.client.create_folder('name', self.random_uuid)

        assert_that(
            httpretty.last_request().method,
            equal_to('POST')
        )

    def test_create_folder_verifies_uuids(self):
        assert_that(
            calling(self.client.create_folder).with_args('name', 'parent_id'),
            raises(DocArgumentException)
        )

    def test_create_folder_returns_the_response_body(self):
        some_json = {"a": "123456", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.POST, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )
        assert_that(
            self.client.create_folder('name', self.random_uuid),
            equal_to(some_json)
        )

    def test_create_folder_sends_the_right_body(self):
        some_json = {"a": "123456", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.POST, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )

        self.client.create_folder('name', self.random_uuid)

        assert_that(
            httpretty.last_request().parsed_body,
            equal_to({'name': 'name', 'parent': self.random_uuid})
        )

    #
    # get_folder
    #

    def test_get_folder_details_returns_the_response_body(self):
        some_json = {"a": "123456", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )

        assert_that(
            self.client.get_folder_details(self.random_uuid),
            equal_to(some_json)
        )

    def test_get_folder_details_verifies_uuids(self):
        assert_that(
            calling(self.client.get_folder_details).with_args('1'),
            raises(DocArgumentException)
        )

    #
    # list folder_content
    #

    def test_list_folder_content_returns_the_response_body(self):
        some_json = {"a": "123456", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )

        assert_that(
            self.client.list_folder_content(self.random_uuid, ordering='name'),
            equal_to(some_json)
        )

    def test_list_folder_content_verifies_uuids(self):
        assert_that(
            calling(self.client.list_folder_content).with_args('1'),
            raises(DocArgumentException)
        )

    def test_list_folder_content_sends_the_right_params(self):
        some_json = {"a": "123456", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )

        self.client.list_folder_content(self.random_uuid, ordering='name')

        assert_that(
            httpretty.last_request().querystring,
            equal_to({'ordering': ['name']})  # folder_id excluded!
        )

    #
    # delete folder
    #

    def test_delete_folder_uses_the_right_method(self):
        httpretty.register_uri(
            httpretty.DELETE, re.compile('https://.*'),
        )

        self.client.delete_folder(self.random_uuid)

        assert_that(
            httpretty.last_request().method,
            'DELETE'
        )

    def test_delete_folder_verifies_uuids(self):
        assert_that(
            calling(self.client.delete_folder).with_args('1'),
            raises(DocArgumentException)
        )

    def test_delete_folder_returns_none(self):
        httpretty.register_uri(
            httpretty.DELETE, re.compile('https://.*'),
        )

        assert_that(
            self.client.delete_folder(self.random_uuid),
            none()
        )

    #
    # File endpoint
    #
    # create_file
    #

    def test_create_file_uses_the_right_method(self):
        some_json = {"a": "123456", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.POST, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )
        self.client.create_file(
            'some_name', 'some_content_type', self.random_uuid
        )

        assert_that(
            httpretty.last_request().method,
            equal_to('POST')
        )

    def test_create_file_verifies_uuids(self):
        assert_that(
            calling(self.client.create_file).with_args(
                'some_name', 'some_content_type', 'parent_id'),
            raises(DocArgumentException)
        )

    def test_create_file_return_the_response_body(self):
        some_json = {"a": "123456", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.POST, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )

        assert_that(
            self.client.create_file(
                'some_name', 'some_content_type', self.random_uuid
            ),
            equal_to(some_json)
        )

    def test_create_file_sends_the_right_body(self):
        some_json = {"a": "123456", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.POST, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )
        self.client.create_file(
            'some_name', 'some_content_type', self.random_uuid
        )

        assert_that(
            httpretty.last_request().parsed_body,
            equal_to({'name': 'some_name', 'parent': self.random_uuid,
                'content_type': 'some_content_type'})
        )

    #
    # get_file_details
    #

    def test_get_file_details_returns_the_response_body(self):
        some_json = {"a": "123456", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )

        #method returns response body
        assert_that(
            self.client.get_file_details(self.random_uuid),
            equal_to(some_json)
        )

    def test_get_file_details_verifies_uuids(self):
        assert_that(
            calling(self.client.get_file_details).with_args('1'),
            raises(DocArgumentException)
        )

    #
    # upload_file_content
    #

    def test_upload_file_content_uses_the_right_method(self):
        httpretty.register_uri(
            httpretty.POST, re.compile('https://.*'),
            adding_headers={'ETag':'some_other_etag'}
        )
        self.client.upload_file_content(
            self.random_uuid, content='some_content')

        assert_that(
            httpretty.last_request().method,
            equal_to('POST')
        )

    def test_upload_file_content_verifies_uuids(self):
        assert_that(
            calling(self.client.upload_file_content).with_args(
                '1', content='content'),
            raises(DocArgumentException)
        )

    def test_upload_file_content_sets_the_right_headers(self):
        httpretty.register_uri(
            httpretty.POST, re.compile('https://.*'),
            adding_headers={'ETag':'some_other_etag'}
        )
        self.client.upload_file_content(
            self.random_uuid,
            etag = 'some_etag',
            content = 'some_content'
        )

        assert_that(
            httpretty.last_request().headers,
            has_entries({'If-Match': 'some_etag'})
        )

    def test_upload_file_content_requires_ETag_in_response(self):
        httpretty.register_uri(
            httpretty.POST, re.compile('https://.*'),
        )

        assert_that(
            calling(self.client.upload_file_content).with_args(
                self.random_uuid,
                etag = 'some_etag',
                content = 'some_content'
            ),
            raises(DocException)
        )

    def test_upload_file_content_returns_the_upload_etag(self):
        httpretty.register_uri(
            httpretty.POST, re.compile('https://.*'),
            adding_headers={'ETag':'some_other_etag'}
        )
        self.client.upload_file_content(
            self.random_uuid,
            content = 'some_content'
        )

        assert_that(
            self.client.upload_file_content(
                self.random_uuid,
                content = 'some_content'
            ),
            equal_to('some_other_etag')
        )

    #
    # copy_file_content
    #

    def test_copy_file_content_uses_the_right_method(self):
        httpretty.register_uri(httpretty.PUT, re.compile('https://.*'))
        self.client.copy_file_content(self.random_uuid, str(uuid.uuid4()))

        assert_that(
            httpretty.last_request().method,
            equal_to('PUT')
        )

    def test_copy_file_content_verifies_uuids(self):
        assert_that(
            calling(self.client.copy_file_content).with_args(
                self.random_uuid, 'source'),
            raises(DocArgumentException)
        )

        assert_that(
            calling(self.client.copy_file_content).with_args(
                'destination', self.random_uuid),
            raises(DocArgumentException)
        )

    def test_copy_file_content_sets_the_right_headers(self):
        httpretty.register_uri(httpretty.PUT, re.compile('https://.*'))
        self.client.copy_file_content(str(uuid.uuid4()), self.random_uuid)

        assert_that(
            httpretty.last_request().headers,
            has_entries({'X-Copy-From': self.random_uuid})
        )

    def test_copy_file_content_returns_None(self):
        some_json = {"a": "123456", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.PUT, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )

        assert_that(
            self.client.copy_file_content(self.random_uuid, str(uuid.uuid4())),
            none()
        )

    #
    # download_file_content
    #

    def test_download_file_conent_sets_the_right_headers(self):
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            adding_headers={'ETag':'some_other_etag'}
        )
        self.client.download_file_content(self.random_uuid, 'some_etag')

        assert_that(
            httpretty.last_request().headers,
            has_entries({'Accept': '*/*', 'If-None-Match': 'some_etag'})
        )

    def test_download_file_content_verifies_uuids(self):
        assert_that(
            calling(self.client.download_file_content).with_args('1'),
            raises(DocArgumentException)
        )

    def test_download_file_content_returns_tuple(self):
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            adding_headers={'ETag':'some_etag'},
            body='somecontent'
        )

        assert_that(
            self.client.download_file_content(self.random_uuid),
            instance_of(tuple)
        )

        # Also check with status 304 for consistency
        httpretty.reset()
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            status=304,
        )

        assert_that(
            self.client.download_file_content(self.random_uuid),
            instance_of(tuple)
        )

    def test_download_file_content_requires_ETag_in_response(self):
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            body='somecontent'
        )

        assert_that(
            calling(self.client.download_file_content).with_args(
                self.random_uuid),
            raises(DocException)
        )

    def test_download_file_content_returns_the_right_content(self):
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            adding_headers={'ETag':'some_etag'},
            body='somecontent'
        )

        assert_that(
            self.client.download_file_content(self.random_uuid)[1],
            equal_to('somecontent')
        )

        # Also check with status 304 for consistency
        httpretty.reset()
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            status=304,
        )

        assert_that(
            self.client.download_file_content(self.random_uuid)[1],
            none()
        )

    #
    # get_signed_url
    #

    def test_get_signed_url_extracts_url_from_response_body(self):
        some_json = {"signed_url": "foo://bar", "b": [2,3,4], "c": {"x":"y"}}
        httpretty.register_uri(
            httpretty.GET, re.compile('https://.*'),
            body=json.dumps(some_json),
            content_type="application/json"
        )

        assert_that(
            self.client.get_signed_url(self.random_uuid),
            equal_to("foo://bar")
        )

    def test_get_signed_url_verifies_uuids(self):
        assert_that(
            calling(self.client.get_signed_url).with_args('1'),
            raises(DocArgumentException)
        )

    #
    # delete_file
    #

    def test_delete_file_uses_the_right_method(self):
        httpretty.register_uri(httpretty.DELETE, re.compile('https://.*'))
        self.client.delete_file(self.random_uuid)

        assert_that(
            httpretty.last_request().method,
            equal_to('DELETE')
        )

    def test_delete_file_verifies_uuids(self):
        assert_that(
            calling(self.client.delete_file).with_args('1'),
            raises(DocArgumentException)
        )
