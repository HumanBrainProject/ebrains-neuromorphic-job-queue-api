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

- clb-ui-storage-folder: the folder entity
- [clb-ui-storage-folder-icon]: a class name to display an icon
- [clb-ui-storage-folder-label]: a label name (default to folder._name)






Examples
========

.. code-block:: javascript

   <!-- minimal -->
   <div clb-ui-storage-folder="folderEntity"></div>
   <!-- all wings out -->
   <div clb-ui-storage-folder="folderEntity"
        clb-ui-storage-folder-icon="fa fa-level-up"
        clb-ui-storage-label="up"></div>

