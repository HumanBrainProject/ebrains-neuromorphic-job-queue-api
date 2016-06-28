.. _module-clb-ui-storage.clbFileBrowser.FileBrowserViewModel:

===================================
Namespace: ``FileBrowserViewModel``
===================================

Member Of :doc:`module-clb-ui-storage.clbFileBrowser`

.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

ViewModel of the clbFileBrowser directive. This instance is
accessible by all direct children of the file browser.

It is responsible to handle all the interactions between the user
and the services. It does not update the views directly but sends
the relevant events when necessary.


.. _module-clb-ui-storage.clbFileBrowser.FileBrowserViewModel.handleFocus:


Function: ``handleFocus``
=========================

When the user focus on a browser item,
emit a 'clbFileBrowser:focusChanged' event.

The event signature is (event, newEntity, previousEntity).

.. js:function:: handleFocus(entity)

    
    :param Object entity: selected entity
    
.. _module-clb-ui-storage.clbFileBrowser.FileBrowserViewModel.handleNavigation:


Function: ``handleNavigation``
==============================

When the current context change, trigger a navigation update.

This will render the view for the new current entity. All navigations
are chained to ensure that the future view will end in a consistant
state. As multiple requests are needed to render a view, request result
would sometimes finish after a new navigation event already occured.

.. js:function:: handleNavigation(entity)

    
    :param Object entity: the new current entity
    :return promise: resolve when the navigation is done.
    
.. _module-clb-ui-storage.clbFileBrowser.FileBrowserViewModel.loadMoreFiles:


Function: ``loadMoreFiles``
===========================

Load the next page of file entities for the current entity.

.. js:function:: loadMoreFiles()

    
    :return Promise: resolve when the files are loaded
    
.. _module-clb-ui-storage.clbFileBrowser.FileBrowserViewModel.loadMoreFolders:


Function: ``loadMoreFolders``
=============================

Load the next page of folder entities for the current entity.

.. js:function:: loadMoreFolders()

    
    :return Promise: resolve when the folders are loaded
    




