.. _module-clb-collab.clbCollabNav.NavItem:

==================
Class: ``NavItem``
==================

Member Of :doc:`module-clb-collab.clbCollabNav`

.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

Client representation of a navigation item.


.. _module-clb-collab.clbCollabNav.NavItem.toJson:


Function: ``toJson``
====================

Return a server object representation that can be easily serialized
to JSON and send to the backend.

.. js:function:: toJson()

    
    :return object: server object representation
    
.. _module-clb-collab.clbCollabNav.NavItem.update:


Function: ``update``
====================



.. js:function:: update(attrs)

    
    :param object attrs: NavItem instance attributes
    :return NavItemt: this instance
    
.. _module-clb-collab.clbCollabNav.NavItem.ensureCached:


Function: ``ensureCached``
==========================



.. js:function:: ensureCached()

    
    :return NavItem: this instance
    
.. _module-clb-collab.clbCollabNav.NavItem.NavItem.fromJson:


Function: ``NavItem.fromJson``
==============================

Build an instance from the server object representation.

.. js:function:: NavItem.fromJson(collabId, json)

    
    :param number collabId: collab ID
    :param string json: server object representation
    :return NavItem: new instance of NavItem
    




