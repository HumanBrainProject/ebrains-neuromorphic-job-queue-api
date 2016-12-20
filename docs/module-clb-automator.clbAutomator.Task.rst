.. _module-clb-automator.clbAutomator.Task:

===============
Class: ``Task``
===============

Member Of :doc:`module-clb-automator.clbAutomator`

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


.. _module-clb-automator.clbAutomator.Task.run:


Function: ``run``
=================

Launch the task.

.. js:function:: run(context)

    
    :param object context: current context will be merged into the default
                            one.
    :return Promise: promise to return the result of the task
    
.. _module-clb-automator.clbAutomator.Task.runSubtasks:


Function: ``runSubtasks``
=========================

Run all subtasks of the this tasks.

.. js:function:: runSubtasks(context)

    
    :param object context: the current context
    :return Array: all the results in an array
    




