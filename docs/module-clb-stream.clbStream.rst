.. _module-clb-stream.clbStream:

========================
Namespace: ``clbStream``
========================

Member Of :doc:`module-clb-stream`

.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

``clbStream`` service is used to retrieve feed of activities
given a user, a collab or a specific context.


.. _module-clb-stream.clbStream.getStream:


Function: ``getStream``
=======================

Get a feed of activities regarding an item type and id.

.. js:function:: getStream(type, id, options)

    
    :param string type: The type of object to get the feed for
    :param string|int id: The id of the object to get the feed for
    :param object options: Parameters to pass to the query
    :return Promise: resolve to the feed of activities
    




