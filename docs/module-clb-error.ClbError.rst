.. _undefined.ClbError:

===================
Class: ``ClbError``
===================


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

``ClbError`` describes a standard error object used
to display error message or intropect the situation.

A ``ClbError`` instance provides the following properties:

* ``type`` a camel case name of the error type.
* `message` a human readable message of the error that should
be displayed to the end user.
* ``data`` any important data that might help the software to
inspect the issue and take a recovering action.
* ``code`` an error numerical code.

The ClbError extends the native Javascript Error instance so it also provides:
* ``name`` which is equal to the type
* ``stack`` the stack trace of the error (when available)

Only ``type``, ``message``, and ``code`` should be considered to be present.
They receive default values when not specified by the situation.






