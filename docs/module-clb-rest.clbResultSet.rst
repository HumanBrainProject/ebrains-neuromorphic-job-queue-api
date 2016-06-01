.. _undefined.clbResultSet:

===========================
Namespace: ``clbResultSet``
===========================


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   module-clb-rest.clbResultSet.ResultSet
   
Description
===========





.. _module-clb-rest.clbResultSet.ResultSetEOL:


Function ``ResultSetEOL``
=========================

error thrown when hbpUtil.ResultSet is crawled when at an
      extremity.

.. js:function:: ResultSetEOL()

    
    
.. _module-clb-rest.clbResultSet.get:


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
    
