====================
Namespace: ``Tasks``
====================

Member Of :doc:`hbpCollaboratory.hbpCollaboratoryAutomator`

.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

Available tasks.




Function ``createCollab``
=========================

Create a collab defined by the given options.

.. js:function:: createCollab(options, options.name, options.description, options.privacy, nav)

    
    :param object options: Parameters to create the collab
    :param string options.name: Name of the collab
    :param string options.description: Description in less than 140 characters
                                          of the collab
    :param string options.privacy: 'private' or 'public'. Notes that only
                                      HBP Members can create private collab
    :param Array|object nav: one or more nav item descriptor that will be
                              passed to the nav task.
    :return Promise: - Will retrieve a collab or a HbpError
    


Function ``createNavItem``
==========================

Create a new nav item.

.. js:function:: createNavItem(config, config.name, config.collab, config.app)

    
    :param object config: a config description
    :param string config.name: name of the nav item
    :param Collab config.collab: collab in which to add the item in.
    :param string config.app: app name linked to the nav item
    :return Promise: promise of a NavItem instance
    


Function ``copy``
=================

Copy a file or recursively a folder

.. js:function:: copy(config)

    
    :param array/object config: a config description
    :return array/entity: created entities
    

