==========================
Module: ``clb-ui-loading``
==========================


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   module-clb-ui-loading.clbPerformAction
   
Description
===========

Provides a simple loading directive.


.. _undefined.clbLoading:


Function: ``clbLoading``
========================

The directive clbLoading displays a simple loading message. If a promise
is given, the loading indicator will disappear once it is resolved.

Attributes
----------

=======================  ===================================================
Name                     Description
=======================  ===================================================
{Promise} [clb-promise]  Hide the loading message upon fulfilment.
{string} [clb-message]   Displayed loading string (default=``'loading...'``)
=======================  ===================================================

.. js:function:: clbLoading()

    
    :return object: Angular directive descriptor
    




