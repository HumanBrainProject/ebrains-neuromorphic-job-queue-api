======================
Module: ``clb-collab``
======================


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   module-clb-collab.App
   module-clb-collab.clbCollabApp
   module-clb-collab.clbCollabNav
   module-clb-collab.clbCollabTeamRole
   module-clb-collab.clbCollab
   module-clb-collab.clbContext
   
Description
===========

Contain services to interact with collabs (e.g.: retriving collab informations or
team members).


.. _undefined.clbCollabTeam:


Function: ``clbCollabTeam``
===========================

Angular client to access Collab Team REST endpoint.

.. js:function:: clbCollabTeam($http, $log, $q, lodash, clbEnv, clbError, clbCollabTeamRole, clbUser)

    
    :param object $http: Angular DI
    :param object $log: Angular DI
    :param object $q: Angular DI
    :param object lodash: Angular DI
    :param object clbEnv: Angular DI
    :param object clbError: Angular DI
    :param object clbCollabTeamRole: Angular DI
    :param object clbUser: Angular DI
    :return object: Angular Service
    
.. _undefined.ClbCollabModel:


Function: ``ClbCollabModel``
============================

Representation of a Collab.

.. js:function:: ClbCollabModel([attributes])

    
    :param object attributes: initial values
    
.. _module-clb-collab.ClbContextModel:


Function: ``ClbContextModel``
=============================

Representation of a Collab Context.

.. js:function:: ClbContextModel()

    
    




