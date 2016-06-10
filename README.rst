angular-hbp-collaboratory is a collection of AngularJS module to
develop applications for the HBP Collaboratory.

At the moment, the libraries depends on code that is not hosted on Github so
it requires an EPFL account. Those dependencies should be released during
summer 2016.

Presentation
============


Services
--------

hbpCollaboratory core is an empty shell that wrap all available submodules
to develop and AngularJS application based on the HBP Collaboratory.

- :doc:`module:clb-storage.clbStorage` is a service for interacting
  with a collab storage and linking nav items to storage entities.
- :doc:`hbpCollaboratory.clbCollabNav` is a service for interacting
  with a collab
- :doc:`hbpCollaboratory.clbCollabApp` is a service for interacting
  with registered application
- :doc:`clb-automator` let you automate HBP Collaboratory related tasks

Contributing
============

Dependencies:

This project use NodeJS and NPM to test, lint and generating the final library.

Bower, Gulp and ESLint should be installed globally:

.. code-block:: bash

   npm install -g bower gulp eslint


Install:

.. code-block:: bash

   git clone git@github.com:HumanBrainProject/angular-hbp-collaboratory.git
   cd angular-hbp-collaboratory
   npm install
   bower install


Install this pre-commit hook to ensure your code is green before a committing:

.. code-block:: bash

   cp .git-pre-commit .git/hooks/pre-commit


Running tests on code change:

.. code-block:: bash

   gulp watch


Migration from angular-hbp-common
---------------------------------

.. code-block::

   Add dependency 'hbpCollaboratory'
   hbpUtil.ferr -> clbError.rejectHttpError (from clb-error module)
   hbpErrorService -> clbError              (from clb-error module)
   hbpUtil.paginatedResultSet -> clbResultSet.get (from clb-rest module)
   hbpIdentityUserDirectory -> clbUser      (from clb-identity module)
   hbpCollabStore -> clbCollab              (from clb-collab module)
   hbpCollabStore.context -> clbContext     (from clb-collab module)
   hbpCollaboratoryNavStore -> clbCollabNav (from clb-collab module)
   clbCollabApp -> clbCollabApp (from clb-collab module)

   At some point, you can remove 'hbpCommon' Angular dependency
