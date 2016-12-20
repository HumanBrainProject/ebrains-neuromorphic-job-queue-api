======================
Module: ``clb-stream``
======================


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   module-clb-stream.clbStream
   
Description
===========

The `clb-stream` module contains a service and a few directives to retrieve
and display the HBP Collaboratory stream provided
by the various applications.


.. _undefined.registerUrlHandler:


Function: ``registerUrlHandler``
================================

Add a function that can generate URL for some types of object reference.

The function should return a string representing the URL.
Any other response means that the handler is not able to generate a proper
URL for this type of object.

The function signature is ``function(objectReference) { return 'url' // or nothing}``

.. js:function:: registerUrlHandler(handler)

    
    :param function handler: a function that can generate URL string for some objects
    :return provider: The provider, for chaining.
    

.. _undefined.clbResourceLocator:

Member: ``clbResourceLocator``: resourceLocator service




