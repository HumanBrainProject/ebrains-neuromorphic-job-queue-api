.. _hbpCollaboratory.hbpCollaboratoryAutomator.Tasks:

====================
Namespace: ``Tasks``
====================

Member Of :doc:`hbpCollaboratory.hbpCollaboratoryAutomator`

.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

Available tasks.


.. _hbpCollaboratory.hbpCollaboratoryAutomator.Tasks.createCollab:


Function ``createCollab``
=========================

Create a collab defined by the given options.

.. js:function:: createCollab(descriptor, descriptor.name, descriptor.description[, descriptor.privacy][, after])

    
    :param object descriptor: Parameters to create the collab
    :param string descriptor.name: Name of the collab
    :param string descriptor.description: Description in less than 140 characters
                                          of the collab
    :param string descriptor.privacy: 'private' or 'public'. Notes that only
                                      HBP Members can create private collab
    :param Array after: descriptor of subtasks
    :return Promise: - promise of a collab
    
.. _hbpCollaboratory.hbpCollaboratoryAutomator.Tasks.createNavItem:


Function ``createNavItem``
==========================

Create a new nav item.

.. js:function:: createNavItem(descriptor, descriptor.name, descriptor.collabId, descriptor.app[, context][, context.collab])

    
    :param object descriptor: a descriptor description
    :param string descriptor.name: name of the nav item
    :param Collab descriptor.collabId: collab in which to add the item in.
    :param string descriptor.app: app name linked to the nav item
    :param object context: the current run context
    :param object context.collab: a collab instance created previously
    :return Promise: promise of a NavItem instance
    
.. _hbpCollaboratory.hbpCollaboratoryAutomator.Tasks.overview:


Function ``overview``
=====================

Set the content of the overview page.
If an 'entity' is specified, it will use the content of that storage file
If an 'app' name is specified, it will use that app for the overview page

The collab is indicated either by an id in `descriptor.collab` or a
collab object in `context.collab`.

.. js:function:: overview(descriptor[, descriptor.collab][, descriptor.entity][, descriptor.app], context[, context.collab][, context.entities])

    
    :param object descriptor: the task configuration
    :param object descriptor.collab: id of the collab
    :param string descriptor.entity: either a label that can be found in
                    ``context.entities`` or a FileEntity UUID
    :param string descriptor.app: the name of an application
    :param object context: the current task context
    :param object context.collab: the collab in which entities will be copied
    :param object context.entities: a list of entities to lookup in for
                      descriptor.entiry value
    :return object: created entities where keys are the same as provided in
                     config.storage
    
.. _hbpCollaboratory.hbpCollaboratoryAutomator.Tasks.storage:


Function ``storage``
====================

Copy files and folders to the destination collab storage.

.. js:function:: storage(descriptor, descriptor.storage[, descriptor.collab], context[, context.collab])

    
    :param object descriptor: the task configuration
    :param object descriptor.storage: a object where keys are the file path in the
                                   new collab and value are the UUID of the
                                   entity to copy at this path.
    :param object descriptor.collab: id of the collab
    :param object context: the current task context
    :param object context.collab: the collab in which entities will be copied
    :return object: created entities where keys are the same as provided in
                     config.storage
    

