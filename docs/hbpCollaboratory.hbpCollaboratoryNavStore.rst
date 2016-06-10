.. _hbpCollaboratory.clbCollabNav:

=======================================
Namespace: ``clbCollabNav``
=======================================

Member Of :doc:`hbpCollaboratory`

.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   hbpCollaboratory.clbCollabNav.NavItem
   
Description
===========

clbCollabNav provides tools to create and manage
      navigation items.


.. _hbpCollaboratory.clbCollabNav.getRoot:


Function ``getRoot``
====================

Retrieve the root item of the given collab.

.. js:function:: getRoot(collabId)

    
    :param number collabId: collab ID
    :return Promise: promise the root nav item
    
.. _hbpCollaboratory.clbCollabNav.getNode:


Function ``getNode``
====================



.. js:function:: getNode(collabId, nodeId)

    
    :param number collabId: collab ID
    :param number nodeId: node ID
    :return NavItem: the matching nav item
    
.. _hbpCollaboratory.clbCollabNav.getNodeFromContext:


Function ``getNodeFromContext``
===============================



.. js:function:: getNodeFromContext(ctx)

    
    :param str ctx: The context UUID
    :return Promise: The promise of a NavItem
    
.. _hbpCollaboratory.clbCollabNav.addNode:


Function ``addNode``
====================



.. js:function:: addNode(collabId, navItem)

    
    :param number collabId: collab ID
    :param number navItem: the NavItem instance to add to the navigation
    :return Promise: promise of the added NavItem instance
    
.. _hbpCollaboratory.clbCollabNav.deleteNode:


Function ``deleteNode``
=======================



.. js:function:: deleteNode(collabId, navItem)

    
    :param number collabId: collab ID
    :param NavItem navItem: the NavItem instance to remove from the navigation
    :return Promise: promise of an undefined item at the end
    
.. _hbpCollaboratory.clbCollabNav.update:


Function ``update``
===================



.. js:function:: update(collabId, navItem)

    
    :param number collabId: collab ID
    :param NavItem navItem: the instance to update
    :return Promise: promise the updated instance
    

