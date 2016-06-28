======================
Namespace: ``angular``
======================


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========




.. _angular.clbBootstrap:


Function: ``clbBootstrap``
==========================

Bootstrap AngularJS application with the HBP environment loaded.

It is very important to load the HBP environement *before* starting
the application. This method let you do that synchronously or asynchronously.
Whichever method you choose, the values in your environment should look
very similar to the one in _`https://collab.humanbrainproject.eu/config.json`,
customized with your own values.

At least ``auth.clientId`` should be edited in the config.json file.

.. js:function:: clbBootstrap(module, options, options.env)

    
    :param string module: the name of the Angular application module to load.
    :param object options: pass those options to deferredBootstrap
    :param object options.env: HBP environment JSON (https://collab.humanbrainproject.eu/config.json)
    :return Promise: return once the environment has been bootstrapped
    

.. _angular.clbBootstrap:

Member: ``clbBootstrap``: 




