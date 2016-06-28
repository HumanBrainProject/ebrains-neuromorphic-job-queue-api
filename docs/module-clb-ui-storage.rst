==========================
Module: ``clb-ui-storage``
==========================


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   module-clb-ui-storage.clbFileBrowser
   module-clb-ui-storage.clbFileUpload
   
Description
===========

The ``clb-ui-storage`` module provides Angular directive to work
with the HBP Collaboratory storage.


Featured Component
------------------

- The directive :doc:`clb-file-browser <module-clb-ui-storage.clb-file-browser>`
  provides an easy to use browser which let the user upload new files,
  create folder and act as file selector.


.. _undefined.clbFileChooser:


Function: ``clbFileChooser``
============================

File chooser directive.

====================  ===========================================================
Name                  Description
====================  ===========================================================
[clb-root]            Cannot go beyond this ancestor in the browser
[ng-model]            The ngModel to bind to the chosen value
[clb-validate]        a string, array of string, regex or function (can be async)
====================  ===========================================================

.. js:function:: clbFileChooser($q)

    
    :param object $q: Angular DI
    :return object: Entity Descriptor
    




