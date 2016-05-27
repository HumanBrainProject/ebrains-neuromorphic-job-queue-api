.. _hbpCollaboratory.hbpCollaboratoryNavStore:

=======================================
Namespace: ``hbpCollaboratoryNavStore``
=======================================

Member Of :doc:`hbpCollaboratory`

.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   hbpCollaboratory.hbpCollaboratoryNavStore.NavItem
   
Description
===========

hbpCollaboratoryNavStore provides tools to create and manage
      navigation items.


.. _hbpCollaboratory.hbpCollaboratoryNavStore.getRoot:


Function ``getRoot``
====================

Retrieve the root item of the given collab.

.. js:function:: getRoot(collabId)

    
    :param number collabId: collab ID
    :return Promise: promise the root nav item
    
.. _hbpCollaboratory.hbpCollaboratoryNavStore.getNode:


Function ``getNode``
====================



.. js:function:: getNode(collabId, nodeId)

    
    :param number collabId: collab ID
    :param number nodeId: node ID
    :return NavItem: the matching nav item
    
.. _hbpCollaboratory.hbpCollaboratoryNavStore.getNodeFromContext:


Function ``getNodeFromContext``
===============================



.. js:function:: getNodeFromContext(ctx)

    
    :param str ctx: The context UUID
    :return Promise: The promise of a NavItem
    
.. _hbpCollaboratory.hbpCollaboratoryNavStore.addNode:


Function ``addNode``
====================



.. js:function:: addNode(collabId, navItem)

    
    :param number collabId: collab ID
    :param number navItem: the NavItem instance to add to the navigation
    :return Promise: promise of the added NavItem instance
    
.. _hbpCollaboratory.hbpCollaboratoryNavStore.deleteNode:


Function ``deleteNode``
=======================



.. js:function:: deleteNode(collabId, navItem)

    
    :param number collabId: collab ID
    :param NavItem navItem: the NavItem instance to remove from the navigation
    :return Promise: promise of an undefined item at the end
    
.. _hbpCollaboratory.hbpCollaboratoryNavStore.update:


Function ``update``
===================



.. js:function:: update(collabId, navItem)

    
    :param number collabId: collab ID
    :param NavItem navItem: the instance to update
    :return Promise: promise the updated instance
    

