=======================
Module: ``clb-storage``
=======================


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   module-clb-storage.clbStorage
   
Description
===========

The ``clb-storage`` module contains tools needed to access and work with the
HBP Document Service. It is targeted to integrate easily with the HBP
Collaboratory, even if the service is more generic.





.. _module-clb-storage.EntityDescriptor:


Typedef: ``EntityDescriptor``
=============================

Describe an arbitrary entity in the storage stytem. The principal types are

- `file`: the entity is a file whose content can be retrieved
- `folder`: the entity is a folder and can be the parent of other entities
- `project`: First level folder. It behave like a folder but also defines the ACL for all the children

Properties
----------
- ``UUID _uuid``: The entity UUID
- ``string _entityType``: The entity type (e.g.: ``file``, ``folder``, ``project``)


