.. _module-clb-app.clbPaginatedResultSet:

====================================
Namespace: ``clbPaginatedResultSet``
====================================

Member Of :doc:`module-clb-app`

.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========





.. _module-clb-app.clbPaginatedResultSet.get:


Function ``get``
================

Return a promise that will resolve once the result set first page is loaded.

The promise contains the `instance` of the result set as well.

.. js:function:: get(res[, options][, options.nextUrlKey][, options.previousUrlKey][, options.resultKey][, options.countKey][, options.resultsFactory])

    
    :param Object res: a HTTPResponse or a promise which resolve to a HTTPResponse
    :param Object options: configuration
    :param string options.nextUrlKey: name of (or dot notation path to) the attribute containing the URL to fetch next results
    :param string options.previousUrlKey: name of (or dot notation path to) the attribute containing the URL to fetch previous results
    :param string options.resultKey: name of (or dot notation path to) the attribute containing an array with all the results
    :param string options.countKey: name of (or dot notation path to) the attribute containing the number of results returned
    :param function options.resultsFactory: a function to which a new array of results is passed.
                       The function can return `undefined`, a `promise` or an `array` as result.
    :return ResultSet: a new instance of ResultSet
    
