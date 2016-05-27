.. _hbpCollaboratory.hbpCollaboratoryAutomator.Task:

===============
Class: ``Task``
===============

Member Of :doc:`hbpCollaboratory.hbpCollaboratoryAutomator`

.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

Instantiate a task given the given `config`.
The task can then be run using the `run()` instance method.


.. _hbpCollaboratory.hbpCollaboratoryAutomator.Task.run:


Function ``run``
================

Launch the task.

.. js:function:: run(context)

    
    :param object context: current context will be merged into the default
                            one.
    :return Promise: promise to return the result of the task
    

