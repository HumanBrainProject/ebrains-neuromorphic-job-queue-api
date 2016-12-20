.. _module-clb-storage.clbStorage:

=========================
Namespace: ``clbStorage``
=========================

Member Of :doc:`module-clb-storage`

.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

The ``clbStorage`` service provides utility functions to ease the interaction
of apps with storage.


.. _module-clb-storage.clbStorage.getEntity:


Function: ``getEntity``
=======================

Get an entity (e.g.: a project, a file or a folder) using a locator. The
only accepted locator at this time is the entity UUID.

- the entity UUID
- an entity representation with ``{_uuid: ENTITY_UUID}``
- the entity related context ``{ctx: CONTEXT_UUID}``
- the entity collab ID ``{collab: COLLAB_ID}``
- the entity absolute path

.. js:function:: getEntity(locator)

    
    :param any locator: Describe the entity to retrieve (see description).
    :return Promise: Return a :doc:`module-clb-storage.EntityDescriptor` when fulfilled
                                    or reject a :doc:`module-clb-error.ClbError`
    
.. _module-clb-storage.clbStorage.getAbsolutePath:


Function: ``getAbsolutePath``
=============================

Return the absolute path of the entity

.. js:function:: getAbsolutePath(entity)

    
    :param object|UUID entity: UUID or descriptor
    :return Promise: return a path string when fulfilled.
    
.. _module-clb-storage.clbStorage.runOnce:


Function: ``runOnce``
=====================

Ensure there is only one async `fn` run named `k` at once.
subsequent call to runOnce with the same `k` value will
return the promise of the running async function.

.. js:function:: runOnce(k, fn)

    
    :param string k: The key
    :param function fn: The function that retrieve a Promise
    :return Promise: Resolve to the function result
    
.. _module-clb-storage.clbStorage.getEntityByUUID:


Function: ``getEntityByUUID``
=============================



.. js:function:: getEntityByUUID(uuid)

    
    :param string uuid: Entity UUID
    :return Promise: Resolve to the entity Descriptor
    
.. _module-clb-storage.clbStorage.query:


Function: ``query``
===================

Query entities by attributes or metadata.

.. js:function:: query(params)

    
    :param object params: Query Parameters
    :return Promise: Return the results
    
.. _module-clb-storage.clbStorage.metadataKey:


Function: ``metadataKey``
=========================

Retrieve the key to lookup for on entities given the ctx

.. js:function:: metadataKey(ctx)

    
    :param string ctx: application context UUID
    :return string: name of the entity attribute that should be used
    
.. _module-clb-storage.clbStorage.addMetadata:


Function: ``addMetadata``
=========================

Add metadata to the provided entity and returns a promise that resolves to an object
containing all the new metadata. The promise fails if one of the metadata already exists.

.. js:function:: addMetadata(entity, metadata)

    
    :param object entity: Entity Descriptor
    :param object metadata: key/value store where keys are the metadata name to set
    :return Promise: Resolves after the operation is completed
    
.. _module-clb-storage.clbStorage.deleteMetadata:


Function: ``deleteMetadata``
============================

Delete metadata keys in input from the provided entity and returns a promise that resolves to an object
containing all the remaining metadata. The promise fails if one of the metadata doesn't exist.

.. js:function:: deleteMetadata(entity, metadataKeys)

    
    :param object entity: Entity Descriptor
    :param array metadataKeys: Array of metatdata keys to delete
    :return Promise: Resolve to the metadata
    
.. _module-clb-storage.clbStorage.create:


Function: ``create``
====================

Create a new entity.

.. js:function:: create(type, parent, name, options)

    
    :param string type: Entity Type (e.g.: file, folder, project)
    :param string|object parent: Parent UUID or entity descriptor
    :param string name: File name
    :param object options: Extend the entity descriptor with those data
    :return Promise: Resolve once done
    
.. _module-clb-storage.clbStorage.copy:


Function: ``copy``
==================

Copy a file to a destination folder

.. js:function:: copy(srcId, destFolderId)

    
    :param string srcId: UUID of the entity to copy
    :param string destFolderId: UUID of the target directory
    :return Promise: Resolves when done
    
.. _module-clb-storage.clbStorage.getContent:


Function: ``getContent``
========================

Retrieves the content of a file given its id.

.. js:function:: getContent(id[, customConfig])

    
    :param string id: FileEntity UUID
    :param object customConfig: contains extra configuration
    :return Promise: The raw content
    
.. _module-clb-storage.clbStorage.getUserAccess:


Function: ``getUserAccess``
===========================

Get current user access right to the provided entity.

The returned promise will be resolved
with an object literal containing three boolean
flags corresponding the user access:

- canRead
- canWrite
- canManage

.. js:function:: getUserAccess(entity)

    
    :param module:clb-storage.EntityDescriptor entity: The entity to retrieve user access for
    :return object: Contains ``{boolean} canRead``, ``{boolean} canWrite``, ``{boolean} canManage``
    
.. _module-clb-storage.clbStorage.getChildren:


Function: ``getChildren``
=========================

Retrieve children entities of a 'parent' entity according to the options and
add them to the children list.
The returned promise will be resolved with the
list of fetched children and a flag indicating if more results are available
in the queried direction.

.. js:function:: getChildren(parent[, options][, options.accept][, options.acceptLink][, options.sort][, options.filter][, options.until][, options.from][, options.pageSize])

    
    :param module:clb-storage.EntityDescriptor parent: The parent entity
    :param object options: Options to make the query
    :param array/string options.accept: Array of accepted _entityType
    :param boolean|array/string options.acceptLink: ``true`` or an array of accepted linked _entityType
    :param string options.sort: Property to sort on
    :param string options.filter: The result based on Acls. Values: ``read`` (default), ``write``
    :param UUID options.until: Fetch results until the given id (exclusive with from)
    :param UUID options.from: Fetch results from the given id (exclusive with until)
    :param int options.pageSize: The number of results per page. Default is provided by the service. Set to 0 to fetch all the records.
    :return Promise: When fulfilled, return a paginated result set. You can also access it immediately using ``promise.instance``
    
.. _module-clb-storage.clbStorage.upload:


Function: ``upload``
====================

Create file entity and upload the content of the given file.

`options` should contain a `parent` key containing the parent entity.

Possible error causes:

- FileTooBig
- UploadError - generic error for content upload requests
- EntityCreationError - generic error for entity creation requests
- FileAlreadyExistError

.. js:function:: upload(file, options)

    
    :param File file: The file descriptor to upload
    :param Object options: The list of options
    :return Promise: a Promise that notify about progress and resolve
      with the new entity object.
    
.. _module-clb-storage.clbStorage.downloadUrl:


Function: ``downloadUrl``
=========================

Asynchronously ask for a short-lived (a few seconds),
presigned URL that can be used to access and
download a file without authentication headers.

.. js:function:: downloadUrl(entity)

    
    :param module:clb-storage.EntityDescriptor entity: The file to download
    :return Promise: Return a string containing the URL once the Promise
                             is fulfilled.
    

.. _module-clb-storage.clbStorage.setContextMetadata:

Member: ``setContextMetadata``: the function links the contextId with the doc browser entity in input
by setting a specific metadata on the entity.

Entity object in input must contain the following properties:
- _entityType
- _uuid

In case of error, the promise is rejected with a `HbpError` instance.

.. _module-clb-storage.clbStorage.deleteContextMetadata:

Member: ``deleteContextMetadata``: the function unlink the contextId from the entity in input
by deleting the context metadata.

Entity object in input must contain the following properties:
- _entityType
- _uuid

In case of error, the promise is rejected with a `HbpError` instance.

.. _module-clb-storage.clbStorage.updateContextMetadata:

Member: ``updateContextMetadata``: the function delete the contextId from the `oldEntity` metadata and add
it as `newEntity` metadata.

Entity objects in input must contain the following properties:
- _entityType
- _uuid

In case of error, the promise is rejected with a `HbpError` instance.




