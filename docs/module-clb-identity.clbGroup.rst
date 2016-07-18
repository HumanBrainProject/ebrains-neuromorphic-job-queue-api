.. _undefined.clbGroup:

=======================
Namespace: ``clbGroup``
=======================


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

``clbGroup`` service let you retrieve and edit groups.



.. _module-clb-identity.clbGroup.get:

Member: ``get``: Return a promise that will resolve to a group
based on the given `id`.

In case of error, the promise is rejected with a `HbpError` instance.

.. _module-clb-identity.clbGroup.getMembers:

Member: ``getMembers``: Return a promise that will resolve to a paginatedResultSet of user
representing all the members of `groupId`.

In case of error, the promise is rejected with a `HbpError` instance.

.. _module-clb-identity.clbGroup.getEpflSyncMembers:

Member: ``getEpflSyncMembers``: Return a promise that will resolve to a paginatedResultSet of user
representing all the epfl syncronized members of a group.

In case of error, the promise is rejected with a `HbpError` instance.

.. _module-clb-identity.clbGroup.getMemberGroups:

Member: ``getMemberGroups``: Return a promise that will resolve to a paginatedResultSet of groups
representing all the group members of `groupName`.

In case of error, the promise is rejected with a `HbpError` instance.

.. _module-clb-identity.clbGroup.getAdmins:

Member: ``getAdmins``: Return a promise that will resolve to a paginatedResultSet of groups
representing all the group that can administrate `groupName`.

In case of error, the promise is rejected with a `HbpError` instance.

.. _module-clb-identity.clbGroup.getAdminGroups:

Member: ``getAdminGroups``: Return a promise that will resolve to a paginatedResultSet of groups
representing all the group that can administrate `groupName`.

In case of error, the promise is rejected with a `HbpError` instance.

.. _module-clb-identity.clbGroup.getParentGroups:

Member: ``getParentGroups``: Return a promise that will resolve to a paginatedResultSet of groups
representing all the group that are parent to the current `groupName`.

In case of error, the promise is rejected with a `HbpError` instance.

.. _module-clb-identity.clbGroup.getManagedGroups:

Member: ``getManagedGroups``: Return a promise that will resolve to a paginatedResultSet of groups
representing all the group that can be administred by `groupName`.

In case of error, the promise is rejected with a `HbpError` instance.

.. _module-clb-identity.clbGroup.create:

Member: ``create``: Return a promise that will resolve when the group has been created.

In case of error, the promise is rejected with an HbpError instance.

.. _module-clb-identity.clbGroup.create:

Member: ``create``: Return a promise that will resolve when the group has been created.

In case of error, the promise is rejected with an HbpError instance.

.. _module-clb-identity.clbGroup.getByName:

Member: ``getByName``: return the group with the given name.

.. _module-clb-identity.clbGroup.list:

Member: ``list``: Retrieves a list of users filtered, sorted and paginated according to the options.

The returned promise will be resolved with the list of fetched user profiles.

Available options:

- sort: properties to sort on. prepend '-'' to reverse order.
- page: page to be loaded (default: 0)
- pageSize: max number or items to be loaded (default: 10)
- filter: fiter object, wildcard admitted in the values
- factory: a function to be used to create object instance from the
           one result




