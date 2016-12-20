.. _undefined.clbFileChooser:

=============================
Namespace: ``clbFileChooser``
=============================


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

The ``clbFileChooser`` directive let you browse the storage to pick a file.

====================  ===========================================================
Name                  Description
====================  ===========================================================
[clb-root]            Cannot go beyond this ancestor in the browser
[ng-model]            The ngModel to bind to the chosen value
[clb-validate]        a string, array of string, regex or function (can be async)
====================  ===========================================================

The directive emit the following events:

=============================  ====================================================
Name                           Description
=============================  ====================================================
clbFileChooser:fileSelected    The second parameter is the EntityDescriptor
clbFileChooser:cancel          The second parameter is the initial EntityDescriptor
=============================  ====================================================






