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
   
   module-clb-ui-storage.clbFileBrowser.clbFileBrowserFolder
   module-clb-ui-storage.clbFileBrowser.clbFileBrowserPath
   module-clb-ui-storage.clbFileBrowser.FileBrowserViewModel
   
Description
===========

clbFileBrowser Directive

This directive renders a file browser. It handles creation of folder,
mutliple file uploads and selection of entity. Focus selection change can be
detected by listening to the event ``clbFileBrowser:focusChanged``.


Attributes
----------

===================================  ==========================================================
Parameter                            Description
===================================  ==========================================================
``{EntityDescriptor} [clb-root]``    A project or a folder that will be the root of the tree.
``{EntityDescriptor} [clb-entity]``  The selected entity.
===================================  ==========================================================


Events
------

================================  ==========================================================
clbFileBrowser:focusChanged       Emitted when the user focus a new file or folder
clbFileBrowser:startCreateFolder  Emitted when the user start to create a new folder
================================  ==========================================================






Examples
========

.. code-block:: javascript
   :caption: Simple directive usage

   <clb-file-browser clb-root="someProjectEntity"
                     clb-entity="someSubFolderEntity">
   </clb-file-browser>

