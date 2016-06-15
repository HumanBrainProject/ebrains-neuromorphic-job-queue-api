.. _undefined.clbFileBrowser:

=============================
Namespace: ``clbFileBrowser``
=============================


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   module-clb-ui-file-browser.clbFileBrowser.clbFileBrowserFolder
   module-clb-ui-file-browser.clbFileBrowser.clbFileBrowserPath
   module-clb-ui-file-browser.clbFileBrowser.FileBrowserViewModel
   
Description
===========

clbFileBrowser Directive

This directive renders a file browser. It accepts the following
attributes:

- root: the root entity for the current browser. If root is null,
it will load all the visible projects.
- [entity]: the current entity that should be displayed.






Examples
========

.. code-block:: javascript

   <clb-ui-file-browser clb-root="someProjectEntity"
                     clb-entity="someSubFolderEntity">
   </clb-ui-file-browser>

