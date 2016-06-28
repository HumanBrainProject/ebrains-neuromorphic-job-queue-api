.. _undefined.clbFileUpload:

============================
Namespace: ``clbFileUpload``
============================


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

clbFileUpload directive.

Provide an upload widget where user can stack files that should be
uploaded at some point. The directive doesn't proceed to upload by itself
but rather triggers the onDrop callback.

The directive accepts the following attributes:

- on-drop: a function to call when one or more files are dropped or selected
  the callback will receive an array of File instance.
- on-error: a function to call when an error occurs. It receives an HbpError
  instance in parameter.






Examples
========

.. code-block:: javascript

   <clb-file-upload on-drop="handleFileUpload(files)"
                         on-error="handleError(error)">
   </clb-file-upload>

