.. _undefined.clbCollabNav:

===========================
Namespace: ``clbCollabNav``
===========================


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   module-clb-collab.clbCollabNav.NavItem
   
Description
===========

clbCollabNav provides tools to create and manage
      navigation items.


.. _module-clb-collab.clbCollabNav.getRoot:


Function: ``getRoot``
=====================

Retrieve the root item of the given collab.

.. js:function:: getRoot(collabId)

    
    :param number collabId: collab ID
    :return Promise: promise the root nav item
    
.. _module-clb-collab.clbCollabNav.getNode:


Function: ``getNode``
=====================



.. js:function:: getNode(collabId, nodeId)

    
    :param number collabId: collab ID
    :param number nodeId: node ID
    :return NavItem: the matching nav item
    
.. _module-clb-collab.clbCollabNav.getNodeFromContext:


Function: ``getNodeFromContext``
================================



.. js:function:: getNodeFromContext(ctx)

    
    :param str ctx: The context UUID
    :return Promise: The promise of a NavItem
    
.. _module-clb-collab.clbCollabNav.addNode:


Function: ``addNode``
=====================



.. js:function:: addNode(collabId, navItem)

    
    :param number collabId: collab ID
    :param number navItem: the NavItem instance to add to the navigation
    :return Promise: promise of the added NavItem instance
    
.. _module-clb-collab.clbCollabNav.deleteNode:


Function: ``deleteNode``
========================



.. js:function:: deleteNode(collabId, navItem)

    
    :param number collabId: collab ID
    :param NavItem navItem: the NavItem instance to remove from the navigation
    :return Promise: promise of an undefined item at the end
    
.. _module-clb-collab.clbCollabNav.update:


Function: ``update``
====================



.. js:function:: update(collabId, navItem)

    
    :param number collabId: collab ID
    :param NavItem navItem: the instance to update
    :return Promise: promise the updated instance
    
.. _module-clb-collab.clbCollabNav.insertNode:


Function: ``insertNode``
========================

Insert node in the three.

A queue is used to ensure that the insert operation does not conflict
on a single client.

.. js:function:: insertNode(collabId, navItem, parentItem, insertAt)

    
    :param int collabId: id of the collab
    :param NavItem navItem: Nav item instance
    :param NavItem parentItem: parent item
    :param int insertAt: add to the menu
    :return Promise: a promise that will
                             return the update nav item
    




