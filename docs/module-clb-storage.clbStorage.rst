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
- an entity representation with ``{_uuid: ENTITY_ID}``
- the entity collab ID and a relative path
- the entity absolute path

.. js:function:: getEntity(locator)

    
    :param UUID locator: Describe the entity to retrieve
    :return Promise: Return a :doc:`module-clb-storage.EntityDescriptor` when fulfilled
                                    or reject a :doc:`module-clb-error.ClbError`
    
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
    :return Promise: Resolve to a ResultSet instance
    
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

.. js:function:: getContent(id)

    
    :param string id: FileEntity UUID
    :return Promise: The raw content
    

.. _module-clb-storage.clbStorage.setContextMetadata:

Member: ``setContextMetadata``: the function links the contextId with the doc browser entity in input
by setting a specific metadata on the entity.

Entity object in input must contain the following properties:
- _entityType
- _uuid

In case of error, the promise is rejected with a `HbpError` instance.

.. _module-clb-storage.clbStorage.getEntityByContext:

Member: ``getEntityByContext``: the function gets the entity linked to the contextId in input.

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

.. _module-clb-storage.clbStorage.getCollabHome:

Member: ``getCollabHome``: When the promise is fulfilled, the function returns the :doc:`module-clb-storage.EntityDescriptor` of the ``collabId`` in input.

In case of error, the promise is rejected with a :doc:`module-clb-error.ClbError` instance.




