.. _undefined.App:

==============
Class: ``App``
==============


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

client representation of an application


.. _module-clb-collab.App.toJson:


Function: ``toJson``
====================

Transform an App instance into an object reprensentation compatible with
the backend schema. This object can then be easily converted to a JSON
string.

.. js:function:: toJson()

    
    :return object: server representation of an App instance
    
.. _module-clb-collab.App.App.fromJson:


Function: ``App.fromJson``
==========================

Create an app instance from a server representation.

.. js:function:: App.fromJson(json)

    
    :param object json: converted from the server JSON string
    :return App: the new App instance
    




