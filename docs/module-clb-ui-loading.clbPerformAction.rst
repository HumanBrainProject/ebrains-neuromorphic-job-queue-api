.. _undefined.clbPerformAction:

===============================
Namespace: ``clbPerformAction``
===============================


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

clbPerformAction directive run an action when the given control is clicked.
it can be added as an attribute. While the action is running, the control
is disabled.






Examples
========

.. code-block:: javascript
   :caption: use perform action to disable a button while code is running

   <div ng-controller="myController">
    <input class="btn btn-primary" type="submit" clb-perform-action="doSomething()">
   </div>

