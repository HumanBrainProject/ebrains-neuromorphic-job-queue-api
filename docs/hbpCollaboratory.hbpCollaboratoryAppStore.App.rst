.. _hbpCollaboratory.clbCollabApp.App:

==============
Class: ``App``
==============

Member Of :doc:`hbpCollaboratory.clbCollabApp`

.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

client representation of an application


.. _hbpCollaboratory.clbCollabApp.App.toJson:


Function ``toJson``
===================

Transform an App instance into an object reprensentation compatible with
the backend schema. This object can then be easily converted to a JSON
string.

.. js:function:: toJson()

    
    :return object: server representation of an App instance
    
.. _hbpCollaboratory.clbCollabApp.App.App.fromJson:


Function ``App.fromJson``
=========================

Create an app instance from a server representation.

.. js:function:: App.fromJson(json)

    
    :param object json: converted from the server JSON string
    :return App: the new App instance
    

