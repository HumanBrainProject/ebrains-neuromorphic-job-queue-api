========================================
Namespace: ``hbpCollaboratoryAutomator``
========================================

Member Of :doc:`hbpCollaboratory`

.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   hbpCollaboratory.hbpCollaboratoryAutomator.Task
   hbpCollaboratory.hbpCollaboratoryAutomator.Tasks
   
Description
===========

hbpCollaboratoryAutomator is an AngularJS factory that
provide task automation to accomplish a sequence of
common operation in Collaboratory.

How to add new tasks
--------------------

New tasks can be added by calling ``hbpCollaboratoryAutomator.registerHandler``.

You can see a few example of tasks in the `tasks` folder.

Evaluate the automator
----------------------

From the root of this project, you can start a server that will let
you write a descriptor and run it.

.. code-block:: bash

   gulp example




Function ``registerHandler``
============================

Register a handler function for the given task name.

.. js:function:: registerHandler(name, fn)

    
    :param string name: handle actions with the specified name
    :param function fn: a function that accept the current context in
                          parameter.
    


Function ``task``
=================

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
    


Function ``missingDataError``
=============================

Return a HbpError when a parameter is missing.

.. js:function:: missingDataError(key, config)

    
    :param string key: name of the key
    :param object config: the invalid configuration object
    :return HbpError: a HbpError instance
    


Function ``ensureParameters``
=============================

Ensure that all parameters listed after config are presents.

.. js:function:: ensureParameters(config)

    
    :param object config: task descriptor
    :return object: created entities
    


Function ``extractAttributes``
==============================

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
   angular.module('MyModule', ['hbpCollaboratory'])
   .run(function(hbpCollaboratoryAutomator, $log) {
     var config = {
       title: 'My Custom Collab',
       content: 'My Collab Content',
       private: false
     }
     hbpCollaboratoryAutomator.task(config).run().then(function(collab) {
     	 $log.info('Created Collab', collab);
     })
   })

