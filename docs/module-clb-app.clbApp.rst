.. _module-clb-app.clbApp:

=====================
Namespace: ``clbApp``
=====================

Member Of :doc:`module-clb-app`

.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

An AngularJS service to interface a web application with the HBP Collaboratory.
This library provides a few helper to work within the Collaboratory environment.

Usage
-----

- :ref:`module-clb-app.clbApp.context` is used to set and retrieve
  the current context.
- :ref:`module-clb-app.clbApp.emit` is used to send a command
  to the HBP Collaboratory and wait for its answer.


.. _module-clb-app.clbApp.emit:


Function: ``emit``
==================

Send a message to the HBP Collaboratory.

.. js:function:: emit(name, data)

    
    :param string name: name of the event to be propagated
    :param object data: corresponding data to be sent alongside the event
    :return Promise: resolve with the message response
    
.. _module-clb-app.clbApp.context:


Function: ``context``
=====================

Asynchronously retrieve the current HBP Collaboratory Context, including
the mode, the ctx UUID and the application state if any.

.. js:function:: context(data)

    
    :param object data: new values to send to HBP Collaboratory frontend
    :return Promise: resolve to the context
    
.. _module-clb-app.clbApp.open:


Function: ``open``
==================

Open a resource described by the given ObjectReference.

The promise will fulfill only if the navigation is possible. Otherwise,
an error will be returned.

.. js:function:: open(ref)

    
    :param ObjectReference ref: The object reference to navigate to
    :return Promise: The promise retrieved by the call to emit
    



.. _module-clb-app.clbApp.HbpCollaboratoryContext:


Typedef: ``HbpCollaboratoryContext``
====================================



Properties
----------
- ``string mode``: the current mode, either 'run' or 'edit'
- ``string ctx``: the UUID of the current context
- ``string state``: an application defined state string


Examples
========

.. code-block:: javascript
   :caption: Retrieve the current context object

   clbApp.context()
   .then(function(context) {
     console.log(context.ctx, context.state, context.collab);
   })
   .catch(function(err) {
     // Cannot set the state
   });

.. code-block:: javascript
   :caption: Set the current state in order for a user to be able to copy-paste its current URL and reopen the same collab with your app loaded at the same place.

   clbApp.context({state: 'lorem ipsum'})
   .then(function(context) {
     console.log(context.ctx, context.state, context.collab);
   })
   .catch(function(err) {
     // Cannot set the state
   });

