.. _module-clb-automator.clbAutomator:

===========================
Namespace: ``clbAutomator``
===========================

Member Of :doc:`module-clb-automator`

.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   module-clb-automator.clbAutomator.Task
   
Description
===========

clbAutomator is an AngularJS factory that
provide task automation to accomplish a sequence of
common operation in Collaboratory.

How to add new tasks
--------------------

New tasks can be added by calling ``clbAutomator.registerHandler``.

You can see a few example of tasks in the `tasks` folder.

Evaluate the automator
----------------------

From the root of this project, you can start a server that will let
you write a descriptor and run it.

.. code-block:: bash

   gulp example


.. _module-clb-automator.clbAutomator.task:


Function: ``task``
==================

Instantiate a new Task intance that will run the code describe for
a handlers with the give ``name``.

The descriptor is passed to the task and parametrize it.
The task context is computed at the time the task is ran. A default context
can be given at load time and it will be fed with the result of each parent
(but not sibling) tasks as well.

.. js:function:: task(name[, descriptor][, descriptor.after][, context])

    
    :param string name: the name of the task to instantiate
    :param object descriptor: a configuration object that will determine
                               which task to run and in which order
    :param object descriptor.after: an array of task to run after this one
    :param object context: a default context to run the task with
    :return Task: - the new task instance
    
.. _module-clb-automator.clbAutomator.run:


Function: ``run``
=================

Directly generate tasks from given description and run them.

.. js:function:: run(descriptor[, context])

    
    :param object descriptor: description of the tasks to run
    :param object context: the initial context
    :return Promise: promise of the top level task result
    
.. _module-clb-automator.clbAutomator.createSubtasks:


Function: ``createSubtasks``
============================

Create an array of tasks given an array containing object where
the key is the task name to run and the value is the descriptor
parameter.

.. js:function:: createSubtasks(after)

    
    :param object after: the content of ``descriptor.after``
    :return Array/Task: array of subtasks
    
.. _module-clb-automator.clbAutomator.missingDataError:


Function: ``missingDataError``
==============================

Return a HbpError when a parameter is missing.

.. js:function:: missingDataError(key, config)

    
    :param string key: name of the key
    :param object config: the invalid configuration object
    :return HbpError: a HbpError instance
    
.. _module-clb-automator.clbAutomator.ensureParameters:


Function: ``ensureParameters``
==============================

Ensure that all parameters listed after config are presents.

.. js:function:: ensureParameters(config)

    
    :param object config: task descriptor
    :return object: created entities
    
.. _module-clb-automator.clbAutomator.extractAttributes:


Function: ``extractAttributes``
===============================

Return an object that only contains attributes
from the `attrs` list.

.. js:function:: extractAttributes(config, attrs)

    
    :param object config: key-value store
    :param Array attrs: a list of keys to extract from `config`
    :return object: key-value store containing only keys from attrs
                            found in `config`
    




Examples
========

.. code-block:: javascript
   :caption: Create a Collab with a few navigation items

   // Create a Collab with a few navigation items.
   angular.module('MyModule', ['clb-automator'])
   .run(function(clbAutomator, $log) {
     var config = {
       title: 'My Custom Collab',
       content: 'My Collab Content',
       private: false
     };
     clbAutomator.task(config).run().then(function(collab) {
     	 $log.info('Created Collab', collab);
     });
   })

.. code-block:: javascript
   :caption: Create a Collab with entities and navigation items

   clbAutomator.run({
     "collab": {
       "title": "Test Collab Creation",
       "content": "My Collab Description",
       "private": true,
       "after": [
         {
           "storage": {
             "entities": {
               // Use one of your file UUID here.
               "sample.ipynb": "155c1bcc-ee9c-43e2-8190-50c66befa1fa"
             },
             "after": [{
               "nav": {
                 "name": "Example Code",
                 "app": "Jupyter Notebook",
                 "entity": "sample.ipynb"
               }
             }]
           }
         },
         {
           "nav": {
             "name": "Empty Notebook",
             "app": "Jupyter Notebook"
           }
         },
         {
           "nav": {
             "name": "Introduction",
             "app": "Rich Text Editor"
           }
         }
       ]
     }
   }).then(function(collab) {
     $log.info('Created Collab', collab);
   });

.. code-block:: javascript
   :caption: Create a Collab with a pre-filled overview

   clbAutomator.run({
     "collab": {
       "title": "Test Collab With Pre Filled Overview",
       "content": "Test collab creation with  a pre filled overview",
       "private": true,
       "after": [{
         "overview": {
           // Use one of your HTML file UUID here.
           "entity": "155c1bcc-ee9c-43e2-8190-50c66befa1fa"
         }
       }]
     }
   }).then(function(collab) {
     $log.info('Created Collab', collab);
   });

