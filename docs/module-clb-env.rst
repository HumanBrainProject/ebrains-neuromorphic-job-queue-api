===================
Module: ``clb-env``
===================


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

``clb-env`` module provides a way to information from the global environment.


.. _module-clb-env.clbEnv:


Function: ``clbEnv``
====================

Get environement information using dotted notation with the `clbEnv` provider
or service.

Before being used, clbEnv must be initialized with the context values. You
can do so by setting up a global bbpConfig variable or using
:ref:`angular.clbBootstrap <angular.clbBootstrap>`.

.. js:function:: clbEnv($injector)

    
    :param object $injector: AngularJS injection
    :return object: provider
    




