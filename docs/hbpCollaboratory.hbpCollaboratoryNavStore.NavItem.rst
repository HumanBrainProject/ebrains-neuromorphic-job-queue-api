.. _hbpCollaboratory.hbpCollaboratoryNavStore.NavItem:

==================
Class: ``NavItem``
==================

Member Of :doc:`hbpCollaboratory.hbpCollaboratoryNavStore`

.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

Client representation of a navigation item.




Function ``toJson``
===================

Return a server object representation that can be easily serialized
to JSON and send to the backend.

.. js:function:: toJson()

    
    :return object: server object representation
    


Function ``update``
===================



.. js:function:: update(attrs)

    
    :param object attrs: NavItem instance attributes
    :return NavItemt: this instance
    


Function ``ensureCached``
=========================



.. js:function:: ensureCached()

    
    :return NavItem: this instance
    


Function ``NavItem.fromJson``
=============================

Build an instance from the server object representation.

.. js:function:: NavItem.fromJson(collabId, json)

    
    :param number collabId: collab ID
    :param string json: server object representation
    :return NavItem: new instance of NavItem
    

