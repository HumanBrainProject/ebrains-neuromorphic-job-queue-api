.. _undefined.clbError:

=======================
Namespace: ``clbError``
=======================


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

``clbError`` provides helper functions that all return an
``ClbError`` instance given a context object.


.. _module-clb-error.clbError_.error:


Function: ``error``
===================

Build a ``ClbError`` instance from the provided options.

- param  {Object} options argument passed to ``ClbError`` constructor
- return {ClbError} the resulting error

.. js:function:: error(options)

    
    :param object options: [description]
    :return object: [description]
    
.. _module-clb-error.clbError_.httpError:


Function: ``httpError``
=======================

return a `ClbError` instance built from a HTTP response.

In an ideal case, the response contains json data with an error object.
It also fallback to a reason field and fill default error message for
standard HTTP status error.

.. js:function:: httpError(response)

    
    :param HttpResponse response: Angular $http Response object
    :return ClbError: a valid ClbError
    




