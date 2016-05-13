.. _hbpCollaboratory.hbpCollaboratoryStorage:

======================================
Namespace: ``hbpCollaboratoryStorage``
======================================

Member Of :doc:`hbpCollaboratory`

.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

storageUtil provides utility functions to ease the interaction of apps with storage.


.. _hbpCollaboratory.hbpCollaboratoryStorage.metadataKey:


Function ``metadataKey``
========================

Retrieve the key to lookup for on entities given the ctx

.. js:function:: metadataKey(ctx)

    
    :param string ctx: application context UUID
    :return string: name of the entity attribute that should be used
    

.. _hbpCollaboratory.hbpCollaboratoryStorage.setContextMetadata:


Function ``setContextMetadata``
===============================

the function links the contextId with the doc browser entity in input
by setting a specific metadata on the entity.

Entity object in input must contain the following properties:
- _entityType
- _uuid

In case of error, the promise is rejected with a `HbpError` instance.

.. js:function:: setContextMetadata(entity, contextId)

    
    :param Object entity: doc browser entity
    :param String contextId: collab app context id
    :return Promise: a promise that resolves when the operation is completed
    
.. _hbpCollaboratory.hbpCollaboratoryStorage.getEntityByContext:


Function ``getEntityByContext``
===============================

the function gets the entity linked to the contextId in input.

In case of error, the promise is rejected with a `HbpError` instance.

.. js:function:: getEntityByContext(contextId)

    
    :param String contextId: collab app context id
    :return Promise: a promise that resolves when the operation is completed
    
.. _hbpCollaboratory.hbpCollaboratoryStorage.deleteContextMetadata:


Function ``deleteContextMetadata``
==================================

the function unlink the contextId from the entity in input
by deleting the context metadata.

Entity object in input must contain the following properties:
- _entityType
- _uuid

In case of error, the promise is rejected with a `HbpError` instance.

.. js:function:: deleteContextMetadata(entity, contextId)

    
    :param Object entity: doc browser entity
    :param String contextId: collab app context id
    :return Promise: a promise that resolves when the operation is completed
    
.. _hbpCollaboratory.hbpCollaboratoryStorage.updateContextMetadata:


Function ``updateContextMetadata``
==================================

the function delete the contextId from the `oldEntity` metadata and add
it as `newEntity` metadata.

Entity objects in input must contain the following properties:
- _entityType
- _uuid

In case of error, the promise is rejected with a `HbpError` instance.

.. js:function:: updateContextMetadata(newEntity, oldEntity, contextId)

    
    :param Object newEntity: doc browser entity to link to the context
    :param Object oldEntity: doc browser entity to unlink from the context
    :param String contextId: collab app context id
    :return Promise: a promise that resolves when the operation is completed
    
.. _hbpCollaboratory.hbpCollaboratoryStorage.getProjectByCollab:


Function ``getProjectByCollab``
===============================

the function returns the storage project of the collabId in input.

In case of error, the promise is rejected with a `HbpError` instance.

.. js:function:: getProjectByCollab(collabId)

    
    :param String collabId: collab id
    :return Promise: a promise that resolves to the project details
    
