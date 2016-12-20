.. _undefined.clbCollabApp:

===========================
Namespace: ``clbCollabApp``
===========================


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

clbCollabApp can be used to find and work with the
registered HBP Collaboratory applications.


.. _module-clb-collab.clbCollabApp.list:


Function: ``list``
==================



.. js:function:: list()

    
    :return Promise: promise of the list of all applications
    
.. _module-clb-collab.clbCollabApp.getById:


Function: ``getById``
=====================

Retrieve an App instance from its id.

.. js:function:: getById(id)

    
    :param number id: the app id
    :return Promise: promise of an app instance
    
.. _module-clb-collab.clbCollabApp.findOne:


Function: ``findOne``
=====================



.. js:function:: findOne(params)

    
    :param object params: query parameters
    :return Promise: promise of an App instance
    




