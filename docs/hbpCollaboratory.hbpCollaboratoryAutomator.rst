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

New tasks can be added by calling ``hbpCollaboratoryAutomator.register``.




Function ``task``
=================

Create a new task.

.. js:function:: task(config)

    
    :param object config: a configuration object that will determine
                           which task to run and in which order.
    :return Task: - task
    

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

