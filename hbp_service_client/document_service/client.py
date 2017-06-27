'''Client for interacting with the documentation service'''
import logging
from os.path import join as joinp
import json
from validators import uuid as is_valid_uuid
from hbp_service_client.document_service.requestor import Requestor
from hbp_service_client.document_service.exceptions import (
    DocException, DocArgumentException)

L = logging.getLogger(__name__)

# pylint: disable=W0212

# pylint: disable=W0613
# This is needed for the unused params, which are not used because they are
# gathered via locals()


class Client(object):
    '''Interface to the document service via python

        Example:
            >>> #you'll have to have an access token ready
            >>> from hbp_service_client.document_service.client import Client
            >>> doc_client = Client.new(my_access_token)
            >>> my_project_contents = doc_client.list_project_content(my_project_id)
    '''

    DEFAULT_PAGE_SIZE = None
    SERVICE_NAME = 'document'
    SERVICE_VERSION = 'v1'

    def __init__(self, requestor):
        '''
        Args:
           requestor: the requestor to send the requests with
        '''
        self._requestor = requestor

    @classmethod
    def new(cls, access_token, environment='prod'):
        '''Create new documentservice client

            Arguments:
                environment: The service environment to be used for the client
                access_token: The access token used to authenticate with the
                    service

            Returns:
                A document_service.Client instance

        '''
        requestor = Requestor.new(cls.SERVICE_NAME, cls.SERVICE_VERSION, access_token, environment)
        return cls(requestor)

    @staticmethod
    def _prep_params(params):
        '''Remove empty (None) valued keywords and self from function parameters'''

        return {k: v for (k, v) in params.items() if v is not None and k != 'self'}

    def get_entity_details(self, entity_id):
        '''Get generic entity by UUID.

        Args:
            entity_id (str): The UUID of the requested entity.

        Returns:
            A dictionary describing the entity::

                {
                     u'collab_id': 2271,
                     u'created_by': u'303447',
                     u'created_on': u'2017-03-10T12:50:06.077891Z',
                     u'description': u'',
                     u'entity_type': u'project',
                     u'modified_by': u'303447',
                     u'modified_on': u'2017-03-10T12:50:06.077946Z',
                     u'name': u'2271',
                     u'uuid': u'3abd8742-d069-44cf-a66b-2370df74a682'
                 }

        Raises:
            DocArgumentException: Invalid arguments
            DocForbiddenException: Server response code 403
            DocNotFoundException: Server response code 404
            DocException: other 400-600 error codes
        '''
        if not is_valid_uuid(entity_id):
            raise DocArgumentException(
                'Invalid UUID for entity_id: {0}'.format(entity_id))

        return self._requestor.send_and_return_body(
            'GET', joinp('entity', entity_id))

    def get_entity_path(self, entity_id):
        '''Retrieve entity path.

        Args:
            entity_id (str): The UUID of the requested entity.

        Returns:
            The path of the entity as a string::

                u'/12345/folder_1'

        Raises:
            DocArgumentException: Invalid arguments
            DocForbiddenException: Server response code 403
            DocNotFoundException: Server response code 404
            DocException: other 400-600 error codes
        '''
        if not is_valid_uuid(entity_id):
            raise DocArgumentException(
                'Invalid UUID for entity_id: {0}'.format(entity_id))

        return self._requestor.send_and_return_body(
            'GET', joinp('entity', entity_id, 'path'))["path"]

    def get_entity_collab_id(self, entity_id):
        '''Retrieve entity Collab ID.

        Args:
            entity_id (str): The UUID of the requested entity.

        Returns:
            The id as interger of the Collebaration to which the entity belongs

        Raises:
            DocArgumentException: Invalid arguments
            DocForbiddenException: Server response code 403
            DocNotFoundException: Server response code 404
            DocException: other 400-600 error codes
        '''
        if not is_valid_uuid(entity_id):
            raise DocArgumentException(
                'Invalid UUID for entity_id: {0}'.format(entity_id))

        return self._requestor.send_and_return_body(
            'GET', joinp('entity', entity_id, 'collab'))["collab_id"]

    def get_entity_by_query(self, uuid=None, path=None, metadata=None):
        '''Retrieve entity by query param which can be either uuid/path/metadata.

        Args:
            uuid (str): The UUID of the requested entity.
            path (str): The path of the requested entity.
            metadata (dict): A dictionary of one metadata {key: value} of the
                requested entitity.

        Returns:
            The details of the entity, if found::

                {
                    u'content_type': u'plain/text',
                    u'created_by': u'303447',
                    u'created_on': u'2017-03-13T10:52:23.275087Z',
                    u'description': u'',
                    u'entity_type': u'file',
                    u'modified_by': u'303447',
                    u'modified_on': u'2017-03-13T10:52:23.275126Z',
                    u'name': u'myfile',
                    u'parent': u'3abd8742-d069-44cf-a66b-2370df74a682',
                    u'uuid': u'e2c25c1b-f6a9-4cf6-b8d2-271e628a9a56'
                }

        Raises:
            DocArgumentException: Invalid arguments
            DocForbiddenException: Server response code 403
            DocNotFoundException: Server response code 404
            DocException: other 400-600 error codes
        '''
        if not (uuid or path or metadata):
            raise DocArgumentException('No parameter given for the query.')
        if uuid and not is_valid_uuid(uuid):
            raise DocArgumentException(
                'Invalid UUID for uuid: {0}'.format(uuid))
        params = locals().copy()
        if metadata:
            if not isinstance(metadata, dict):
                raise DocArgumentException('The metadata needs to be provided'
                                           ' as a dictionary.')
            params[metadata.keys()[0]] = metadata.values()[0]
            del params['metadata']
        params = self._prep_params(params)

        return self._requestor.send_and_return_body(
            'GET', 'entity', params=params)

    #
    # Generic metadata
    #

    def set_metadata(self, entity_type, entity_id, metadata):
        '''Set metadata for an entity.

        Args:
            entity_type (str): Type of the entity. Admitted values: ['project',
                'folder', 'file'].
            entity_id (str): The UUID of the entity to be modified.
            metadata (dict): A dictionary of key/value pairs to be written as
                metadata.

        Warning:
            It will replace all existing metadata with the provided dictionary.

        Returns:
            A dictionary of the updated metadata::

                {
                    u'bar': u'200',
                    u'foo': u'100'
                }

        Raises:
            DocArgumentException: Invalid arguments
            DocForbiddenException: Server response code 403
            DocNotFoundException: Server response code 404
            DocException: other 400-600 error codes
        '''
        if not is_valid_uuid(entity_id):
            raise DocArgumentException(
                'Invalid UUID for entity_id: {0}'.format(entity_id))
        if not isinstance(metadata, dict):
            raise DocArgumentException('The metadata was not provided as a '
                                       'dictionary')

        return self._requestor.send_and_return_body(
            'POST', joinp(entity_type, entity_id, 'metadata'),
            data=json.dumps(metadata),
            headers={'Content-Type': 'application/json'})

    def get_metadata(self, entity_type, entity_id):
        '''Get metadata of an entity.

        Args:
            entity_type (str): Type of the entity. Admitted values: ['project',
                'folder', 'file'].
            entity_id (str): The UUID of the entity to be modified.

        Returns:
            A dictionary of the metadata::

                {
                    u'bar': u'200',
                    u'foo': u'100'
                }

        Raises:
            DocArgumentException: Invalid arguments
            DocForbiddenException: Server response code 403
            DocNotFoundException: Server response code 404
            DocException: other 400-600 error codes
        '''
        if not is_valid_uuid(entity_id):
            raise DocArgumentException(
                'Invalid UUID for entity_id: {0}'.format(entity_id))

        return self._requestor.send_and_return_body(
            'GET', joinp(entity_type, entity_id, 'metadata'))

    def update_metadata(self, entity_type, entity_id, metadata):
        '''Update the metadata of an entity.

        Existing non-modified metadata will not be affected.

        Args:
            entity_type (str): Type of the entity. Admitted values: 'project',
                'folder', 'file'.
            entity_id (str): The UUID of the entity to be modified.
            metadata (dict): A dictionary of key/value pairs to be written as
                metadata.

        Returns:
            A dictionary of the updated object metadata::

                {
                    u'bar': u'200',
                    u'foo': u'100'
                }

        Raises:
            DocArgumentException: Invalid arguments
            DocForbiddenException: Server response code 403
            DocNotFoundException: Server response code 404
            DocException: other 400-600 error codes
        '''
        if not is_valid_uuid(entity_id):
            raise DocArgumentException(
                'Invalid UUID for entity_id: {0}'.format(entity_id))
        if not isinstance(metadata, dict):
            raise DocArgumentException('The metadata was not provided as a '
                                       'dictionary')

        return self._requestor.send_and_return_body(
            'PUT', joinp(entity_type, entity_id, 'metadata'),
            data=json.dumps(metadata),
            headers={'Content-Type': 'application/json'})

    def delete_metadata(self, entity_type, entity_id, metadata_keys):
        '''Delete the selected metadata entries of an entity.

        Only deletes selected metadata keys, for a complete wipe, use set_metadata.

        Args:
            entity_type (str): Type of the entity. Admitted values: ['project',
                'folder', 'file'].
            entity_id (srt): The UUID of the entity to be modified.
            metadata_keys (lst): A list of metada keys to be deleted.

        Returns:
            A dictionary of the updated object metadata::

                {
                    u'bar': u'200',
                    u'foo': u'100'
                }

        Raises:
            DocArgumentException: Invalid arguments
            DocForbiddenException: Server response code 403
            DocNotFoundException: Server response code 404
            DocException: other 400-600 error codes
        '''
        if not is_valid_uuid(entity_id):
            raise DocArgumentException(
                'Invalid UUID for entity_id: {0}'.format(entity_id))
        if not isinstance(metadata_keys, list):
            raise DocArgumentException('The metadata was not provided as a '
                                       'dictionary')

        payload = {'keys': metadata_keys}
        return self._requestor.send_and_return_body(
            'DELETE', joinp(entity_type, entity_id, 'metadata'),
            data=json.dumps(payload),
            headers={'Content-Type': 'application/json'})

    #
    # Project endpoint
    #

    def list_projects(self, hpc=None, access=None, name=None, collab_id=None,
                      page_size=DEFAULT_PAGE_SIZE, page=None, ordering=None):
        '''List all the projects the user have access to.

            This function does not retrieve all results, pages have
            to be manually retrieved by the caller.

        Args:
            hpc (bool): If 'true', the result will contain only the HPC projects
                (Unicore projects).
            access (str): If provided, the result will contain only projects
                where the user has the provided acccess.
                Admitted values: ['read', 'write'].
            name (str): Filter on the project name.
            collab_id (int): Filter on the collab id.
            page_size (int): Number of elements per page.
            page (int): Number of the page
            ordering (str): Indicate on which fields to sort the result.
                Prepend '-' to invert order. Multiple values can be provided.
                Ordering is supported on: ['name', 'created_on', 'modified_on'].
                Example: ordering='name,created_on'

        Returns:
            A dictionary of the results::

            {
                u'count': 256,
                u'next': u'http://link.to.next/page',
                u'previous': None,
                u'results': [{u'collab_id': 2079,
                    u'created_by': u'258666',
                    u'created_on': u'2017-02-23T15:09:27.626973Z',
                    u'description': u'',
                    u'entity_type': u'project',
                    u'modified_by': u'258666',
                    u'modified_on': u'2017-02-23T15:09:27.627025Z',
                    u'name': u'2079',
                    u'uuid': u'64a6ad2e-acd1-44a3-a4cd-6bd96e3da2b0'}]
            }


        Raises:
            DocForbiddenException: Server response code 403
            DocNotFoundException: Server response code 404
            DocException: other 400-600 error codes
        '''

        params = self._prep_params(locals())

        return self._requestor.send_and_return_body('GET', 'project', params=params)

    def get_project_details(self, project_id):
        '''Get information on a given project

        Args:
            project_id (str): The UUID of the requested project.

        Returns:
            A dictionary describing the project::

            {
                u'collab_id': 2271,
                u'created_by': u'303447',
                u'created_on': u'2017-03-10T12:50:06.077891Z',
                u'description': u'',
                u'entity_type': u'project',
                u'modified_by': u'303447',
                u'modified_on': u'2017-03-10T12:50:06.077946Z',
                u'name': u'2271',
                u'uuid': u'3abd8742-d069-44cf-a66b-2370df74a682'
            }

        Raises:
            DocForbiddenException: Server response code 403
            DocNotFoundException: Server response code 404
            DocException: other 400-600 error codes
        '''
        if not is_valid_uuid(project_id):
            raise DocArgumentException(
                'Invalid UUID for project_id: {0}'.format(project_id))

        return self._requestor.send_and_return_body('GET', joinp('project', project_id))

    def list_project_content(self, project_id, name=None, entity_type=None,
                             content_type=None, page_size=DEFAULT_PAGE_SIZE,
                             page=None, ordering=None):
        '''List all files and folders (not recursively) contained in the project.

        This function does not retrieve all results, pages have
        to be manually retrieved by the caller.

        Args:
            project_id (str): The UUID of the requested project.
            name (str): Optional filter on entity name.
            entity_type (str): Optional filter on entity type.
                Admitted values: ['file', 'folder'].
            content_type (str): Optional filter on entity content type (only
                files are returned).
            page_size (int): Number of elements per page.
            page (int): Number of the page
            ordering (str): Indicate on which fields to sort the result.
                Prepend '-' to invert order. Multiple values can be provided.
                Ordering is supported on: ['name', 'created_on', 'modified_on'].
                Example: 'ordering=name,created_on'

        Returns:
            A dictionary of the results::

                {
                    u'count': 3,
                    u'next': u'http://link.to.next/page',
                    u'previous': None,
                    u'results': [{u'created_by': u'303447',
                        u'created_on': u'2017-03-10T17:41:31.618496Z',
                        u'description': u'',
                        u'entity_type': u'folder',
                        u'modified_by': u'303447',
                        u'modified_on': u'2017-03-10T17:41:31.618553Z',
                        u'name': u'folder_1',
                        u'parent': u'3abd8742-d069-44cf-a66b-2370df74a682',
                        u'uuid': u'eac11058-4ae0-4ea9-ada8-d3ea23887509'}]
                }


        Raises:
            DocArgumentException: Ivalid parameters
            DocForbiddenException: Server response code 403
            DocNotFoundException: Server response code 404
            DocException: other 400-600 error codes
        '''
        if not is_valid_uuid(project_id):
            raise DocArgumentException(
                'Invalid UUID for project_id: {0}'.format(project_id))
        params = self._prep_params(locals())
        del params['project_id'] # not a query parameter
        return self._requestor.send_and_return_body(
            'GET', joinp('project', project_id, 'children'), params=params)

    #
    # Folder endpoint
    #

    def create_folder(self, name, parent):
        '''Create a new folder.

        Args:
            name (srt): The name of the folder.
            parent (str): The UUID of the parent entity. The parent must be a
                project or a folder.

        Returns:
            A dictionary of details of the created folder::

                {
                    u'created_by': u'303447',
                    u'created_on': u'2017-03-21T14:06:32.293902Z',
                    u'description': u'',
                    u'entity_type': u'folder',
                    u'modified_by': u'303447',
                    u'modified_on': u'2017-03-21T14:06:32.293967Z',
                    u'name': u'myfolder',
                    u'parent': u'3abd8742-d069-44cf-a66b-2370df74a682',
                    u'uuid': u'2516442e-1e26-4de1-8ed8-94523224cc40'
                }

        Raises:
            DocArgumentException: Invalid arguments
            DocForbiddenException: Server response code 403
            DocNotFoundException: Server response code 404
            DocException: other 400-600 error codes
        '''
        if not is_valid_uuid(parent):
            raise DocArgumentException(
                'Invalid UUID for parent: {0}'.format(parent))
        payload = self._prep_params(locals())
        return self._requestor.send_and_return_body(
            'POST', 'folder', data=json.dumps(payload),
            headers={'Content-Type': 'application/json'})

    def get_folder_details(self, folder):
        '''Get information on a given folder.

        Args:
            folder (str): The UUID of the requested folder.

        Returns:
            A dictionary of the folder details if found::

                {
                    u'created_by': u'303447',
                    u'created_on': u'2017-03-21T14:06:32.293902Z',
                    u'description': u'',
                    u'entity_type': u'folder',
                    u'modified_by': u'303447',
                    u'modified_on': u'2017-03-21T14:06:32.293967Z',
                    u'name': u'myfolder',
                    u'parent': u'3abd8742-d069-44cf-a66b-2370df74a682',
                    u'uuid': u'2516442e-1e26-4de1-8ed8-94523224cc40'
                }

        Raises:
            DocArgumentException: Invalid arguments
            DocForbiddenException: Server response code 403
            DocNotFoundException: Server response code 404
            DocException: other 400-600 error codes
        '''
        if not is_valid_uuid(folder):
            raise DocArgumentException(
                'Invalid UUID for folder: {0}'.format(folder))
        return self._requestor.send_and_return_body('GET', joinp('folder', folder))

    def list_folder_content(self, folder, name=None, entity_type=None,
                            content_type=None, page_size=DEFAULT_PAGE_SIZE,
                            page=None, ordering=None):
        '''List files and folders (not recursively) contained in the folder.

        This function does not retrieve all results, pages have
        to be manually retrieved by the caller.

        Args:
            folder (str): The UUID of the requested folder.
            name (str): Optional filter on entity name.
            entity_type (str): Optional filter on entity type.
                Admitted values: ['file', 'folder'].
            content_type (str): Optional filter on entity content type (only
                files are returned).
            page_size (int): Number of elements per page.
            page (int): Number of the page.
            ordering (str): Indicate on which fields to sort the result. Prepend
                '-' to invert order. Multiple values can be provided.
                Ordering is supported on: ['name', 'created_on', 'modified_on'].
                Example: 'ordering=name,created_on'

        Returns:
            A dictionary of the results::

                {
                u'count': 1,
                u'next': None,
                u'previous': None,
                u'results': [{u'content_type': u'plain/text',
                    u'created_by': u'303447',
                    u'created_on': u'2017-03-13T10:17:01.688472Z',
                    u'description': u'',
                    u'entity_type': u'file',
                    u'modified_by': u'303447',
                    u'modified_on': u'2017-03-13T10:17:01.688632Z',
                    u'name': u'file_1',
                    u'parent': u'eac11058-4ae0-4ea9-ada8-d3ea23887509',
                    u'uuid': u'0e17eaac-cb00-4336-b9d7-657026844281'}]
                }

        Raises:
            DocArgumentException: Invalid arguments
            DocForbiddenException: Server response code 403
            DocNotFoundException: Server response code 404
            DocException: other 400-600 error codes
        '''
        if not is_valid_uuid(folder):
            raise DocArgumentException(
                'Invalid UUID for folder: {0}'.format(folder))
        params = self._prep_params(locals())
        del params['folder'] # not a query parameter
        return self._requestor.send_and_return_body(
            'GET', joinp('folder', folder, 'children'), params=params)

    def delete_folder(self, folder):
        '''Delete a folder. It will recursively delete all the content.

        Args:
            folder_id (str): The UUID of the folder to be deleted.

        Returns:
            None

        Raises:
            DocArgumentException: Invalid arguments
            DocForbiddenException: 403
            DocNotFoundException: 404
            HTTPError: other non-20x error codes
        '''
        if not is_valid_uuid(folder):
            raise DocArgumentException(
                'Invalid UUID for folder: {0}'.format(folder))
        self._requestor.send_and_return_body('DELETE', joinp('folder', folder))

    #
    # File endpoint
    #

    def create_file(self, name, content_type, parent):
        '''Create a new file.

        Args:
            name (str): The name of the file.
            content_type (str): the content type of the file. E.g. "plain/text"
            parent (str): The UUID of the parent entity. The parent must be a
                project or a folder.

        Returns:
            A dictionary describing the created file::

                {
                    u'content_type': u'plain/text',
                    u'created_by': u'303447',
                    u'created_on': u'2017-03-13T10:52:23.275087Z',
                    u'description': u'',
                    u'entity_type': u'file',
                    u'modified_by': u'303447',
                    u'modified_on': u'2017-03-13T10:52:23.275126Z',
                    u'name': u'myfile',
                    u'parent': u'3abd8742-d069-44cf-a66b-2370df74a682',
                    u'uuid': u'e2c25c1b-f6a9-4cf6-b8d2-271e628a9a56'
                }

        Raises:
            DocArgumentException: Invalid arguments
            DocForbiddenException: 403
            DocNotFoundException: 404
            HTTPError: other non-20x error codes
        '''
        if not is_valid_uuid(parent):
            raise DocArgumentException(
                'Invalid UUID for parent: {0}'.format(parent))
        payload = self._prep_params(locals())
        return self._requestor.send_and_return_body(
            'POST', 'file', data=json.dumps(payload),
            headers={'Content-Type': 'application/json'}
            )

    def get_file_details(self, file_id):
        '''Get information on a given file.

        Args:
            file_id (str): The UUID of the requested file.

        Returns:
            A dictionary of the file details if found::

                {
                    u'content_type': u'plain/text',
                    u'created_by': u'303447',
                    u'created_on': u'2017-03-13T10:52:23.275087Z',
                    u'description': u'',
                    u'entity_type': u'file',
                    u'modified_by': u'303447',
                    u'modified_on': u'2017-03-13T10:52:23.275126Z',
                    u'name': u'myfile',
                    u'parent': u'3abd8742-d069-44cf-a66b-2370df74a682',
                    u'uuid': u'e2c25c1b-f6a9-4cf6-b8d2-271e628a9a56'
                }

        Raises:
            DocArgumentException: Invalid arguments
            DocForbiddenException: Server response code 403
            DocNotFoundException: Server response code 404
            DocException: other 400-600 error codes
        '''
        if not is_valid_uuid(file_id):
            raise DocArgumentException(
                'Invalid UUID for file_id: {0}'.format(file_id))
        return self._requestor.send_and_return_body('GET', joinp('file', file_id))

    def upload_file_content(self, file_id, etag=None, source=None, content=None):
        '''Upload a file content. The file entity must already exist.

        If an ETag is provided the file stored on the server is verified
        against it. If it does not match, DocException is raised.
        This means the client needs to update its knowledge of the resource
        before attempting to update again. This can be used for optimistic
        concurrency control.

        Args:
            file_id (str): The UUID of the file whose content is written.
            etag (str): The etag to match the contents against.
            source (str): The path of the local file whose content to be uploaded.
            content (str): A string of the content to be uploaded.

        Note:
            ETags should be enclosed in double quotes::

                my_etag = '"71e1ed9ee52e565a56aec66bc648a32c"'

        Returns:
            The ETag of the file upload::

                '"71e1ed9ee52e565a56aec66bc648a32c"'

        Raises:
            IOError: The source cannot be opened.
            DocArgumentException: Invalid arguments
            DocForbiddenException: Server response code 403
            DocNotFoundException: Server response code 404
            DocException: other 400-600 error codes
        '''
        if not is_valid_uuid(file_id):
            raise DocArgumentException(
                'Invalid UUID for file_id: {0}'.format(file_id))
        if not (source or content) or (source and content):
            raise DocArgumentException('Either one of source file or content has to be provided.')
        endpoint = joinp('file', file_id, 'content', 'upload')
        data = content or open(source, 'rb')
        headers = {}
        if etag:
            headers = {'If-Match': etag}
        resp = self._requestor.send("POST", endpoint, data=data, headers=headers)
        if 'ETag' in resp.headers:
            return resp.headers['ETag']
        else:
            raise DocException('No ETag received from the service after the upload')

    def copy_file_content(self, file_id, source_file):
        '''Copy file content from source file to target file.

        Args:
            file_id (str): The UUID of the file whose content is written.
            source_file (str): The UUID of the file whose content is copied.

        Returns:
            None

        Raises:
        DocArgumentException: Invalid arguments
        DocForbiddenException: Server response code 403
        DocNotFoundException: Server response code 404
        DocException: other 400-600 error codes
        '''
        if not is_valid_uuid(file_id):
            raise DocArgumentException(
                'Invalid UUID for file_id: {0}'.format(file_id))
        if not is_valid_uuid(source_file):
            raise DocArgumentException(
                'Invalid UUID for source_file: {0}'.format(source_file))
        self._requestor.send_and_return_body(
            "PUT", joinp('file', file_id, 'content'),
            headers={'X-Copy-From': source_file})

    def download_file_content(self, file_id, etag=None):
        '''Download file content.

        Args:
            file_id (str): The UUID of the file whose content is requested
            etag (str): If the content is not changed since the provided ETag,
                the content won't be downloaded. If the content is changed, it
                will be downloaded and returned with its new ETag.

        Note:
            ETags should be enclosed in double quotes::

                my_etag = '"71e1ed9ee52e565a56aec66bc648a32c"'


        Returns:
            A tuple of ETag and content (etag, content) if the content was
            retrieved. If an etag was provided, and content didn't change
            returns (None, None)::

                ('"71e1ed9ee52e565a56aec66bc648a32c"', 'Hello world!')

        Raises:
            DocArgumentException: Invalid arguments
            DocForbiddenException: Server response code 403
            DocNotFoundException: Server response code 404
            DocException: other 400-600 error codes
        '''
        if not is_valid_uuid(file_id):
            raise DocArgumentException(
                'Invalid UUID for file_id: {0}'.format(file_id))
        headers = {'Accept': '*/*'}
        if etag:
            headers['If-None-Match'] = etag

        resp = self._requestor.send(
            "GET", joinp('file', file_id, 'content'), headers=headers)
        if resp.status_code == 304:
            return (None, None)
        if 'ETag' in resp.headers:
            etag = resp.headers['ETag']
        else:
            raise DocException('No ETag received from the service with the download')
        return (etag, resp.text)

    def get_signed_url(self, file_id):
        '''Get a signed unauthenticated URL.

        It can be used to download the file content without the need for a
        token. The signed URL expires after 5 seconds.

        Args:
            file_id (str): The UUID of the file to get the link for.

        Returns:
            The signed url as a string

        Raises:
            DocArgumentException: Invalid arguments
            DocForbiddenException: Server response code 403
            DocNotFoundException: Server response code 404
            DocException: other 400-600 error codes
        '''
        if not is_valid_uuid(file_id):
            raise DocArgumentException(
                'Invalid UUID for file_id: {0}'.format(file_id))
        return self._requestor.send_and_return_body(
            "GET",
            joinp('file', file_id, 'content', 'secure_link'))['signed_url']

    def delete_file(self, file_id):
        '''Delete a file.

        Args:
            file_id (str): The UUID of the file to delete.

        Returns:
            None

        Raises:
            DocArgumentException: Invalid arguments
            DocForbiddenException: Server response code 403
            DocNotFoundException: Server response code 404
            DocException: other 400-600 error codes
        '''
        if not is_valid_uuid(file_id):
            raise DocArgumentException(
                'Invalid UUID for file_id: {0}'.format(file_id))
        self._requestor.send_and_return_body('DELETE', joinp('file', file_id))
