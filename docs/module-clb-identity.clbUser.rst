.. _undefined.clbUser:

======================
Namespace: ``clbUser``
======================


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

``clbUser`` service let you retrieve and edit user and groups.


.. _module-clb-identity.clbUser.get:


Function: ``get``
=================

Return a promise that will resolve to a list of groups and users
based on the given array of ``ids``.

In case of error, the promise is rejected with a ``ClbError`` instance.

Return a promise with an map of id->userInfo based on the
provided list of IDs.

.. js:function:: get(ids)

    
    :param array|string ids: One or more ID
    :return Promise: Resolve to a map of ID/UserInfo
    
.. _module-clb-identity.clbUser.isGroupMember:


Function: ``isGroupMember``
===========================

Return a promise that will resolve to true if the current user is a member of one of the groups in input.

`groups` can be either a string or an array.

.. js:function:: isGroupMember(groups)

    
    :param array groups: A list of groups
    :return Promise: Resolve to a boolean
    
.. _module-clb-identity.clbUser.getCurrentUser:


Function: ``getCurrentUser``
============================

Return a promise that will resolve to the current user.

In case of error, the promise is rejected with a `HbpError` instance.

.. js:function:: getCurrentUser()

    
    :return Promise: Resolve to the Current User
    
.. _module-clb-identity.clbUser.create:


Function: ``create``
====================

Create the given `user`.

The method return a promise that will resolve to the created user instance.
In case of error, a `HbpError` instance is retrieved.

.. js:function:: create(user)

    
    :param object user: Data to build the user from
    :return Promise: Resolve to the new User
    
.. _module-clb-identity.clbUser.update:


Function: ``update``
====================

Update the described `user` with the given `data`.

If data is omitted, `user` is assumed to be the updated user object that
should be persisted. When data is present, user can be either a `User`
instance or the user id.

The method return a promise that will resolve to the updated user instance.
Note that this instance is a copy of the user. If you own a user instance
already, you cannot assume this method will update it.

.. js:function:: update(user[, data])

    
    :param object user: User to update
    :param object data: Data to update the user with if not already in ``user`` instance
    :return Promise: Resolve to the User instance
    
.. _module-clb-identity.clbUser.list:


Function: ``list``
==================

Retrieves a list of users filtered, sorted and paginated according to the options.

The returned promise will be resolved with the list of fetched user profiles
and 2 fuctions (optional) to load next page and/or previous page.
{{next}} and {{prev}} returns a promise that will be resolved with an object
like the one returned by the current function.

Return object example:
{
 results: [...],
 next: function() {},
 prev: function() {}
}

Available options:

* sort: property to sort on. prepend '-' to reverse order.
* page: page to be loaded (default: 0)
* pageSize: max number or items to be loaded (default: 10, when 0 all records are loaded)
* filter: an Object containing the field name as key and
      the query as a String or an Array of strings
* managedOnly: returns only the users managed by the current logged in user

Supported filter values:

* ``'displayName'``
* ``'email'``
* ``'id'``
* ``'username'``
* ``'accountType'``

.. js:function:: list([options][, options.sort][, options.filter][, options.factory][, options.pageSize][, options.page])

    
    :param object options: Parameters to use
    :param string options.sort: Attribute to sort the user with (default to ``'familyName'``)
    :param string options.filter: Object containing query filters
    :param function options.factory: A function that accept an array of user data and build object from them
    :param int options.pageSize: The number of result per page ; if 0, load all results
    :param int options.page: The result page to retrieve
    :return Promise: Resolve to the user ResultSet instance
    
.. _module-clb-identity.clbUser.search:


Function: ``search``
====================

Promise a list of users who matched the given query string.

.. js:function:: search(queryString[, options][, options.pageSize][, options.factory])

    
    :param string queryString: the search query
    :param object options: query options
    :param int options.pageSize: the number of result to retrieve
    :param function options.factory: the factory function to use
    :return Promise: will return a ResultSet containing the results
    

.. _module-clb-identity.clbUser.getCurrentUserOnly:

Member: ``getCurrentUserOnly``: Return a promise that will resolve to the current user, NOT including group
info.

In case of error, the promise is rejected with a `HbpError` instance.




