.. _undefined.clbFileBrowserFolder:

===================================
Namespace: ``clbFileBrowserFolder``
===================================


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

clbFileBrowserFolder directive is a child directive of
clbFileBrowser that render a folder item within the file browser view.

Available attributes:

- clb-ui-file-browser-folder: the folder entity
- [clb-ui-file-browser-folder-icon]: a class name to display an icon
- [clb-ui-file-browser-folder-label]: a label name (default to folder._name)






Examples
========

.. code-block:: javascript

   <!-- minimal -->
   <div clb-ui-file-browser-folder="folderEntity"></div>
   <!-- all wings out -->
   <div clb-ui-file-browser-folder="folderEntity"
        clb-ui-file-browser-folder-icon="fa fa-level-up"
        clb-ui-file-browser-label="up"></div>

