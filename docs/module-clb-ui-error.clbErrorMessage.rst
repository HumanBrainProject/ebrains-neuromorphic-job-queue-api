.. _undefined.clbErrorMessage:

==============================
Namespace: ``clbErrorMessage``
==============================


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

The ``clb-error-message`` directive displays an error.


clb-error is a HbpError instance, built by the HbpErrorService






Examples
========

.. code-block:: javascript
   :caption: Retrieve the current context object

   <div ng-controller='SomeController'>
     Validation error:
     <clb-error-message clb-error='error'></clb-error-message>
     Permission denied error:
     <clb-error-message clb-error='errorPermissions'></clb-error-message>
   </div>

