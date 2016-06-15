=========================
angular-hbp-collaboratory
=========================

An AngularJS tool to develop web application based on the HBP Collaboratory

Contents
========

.. toctree::
   :maxdepth: 1

   
   module-clb-app
   module-clb-automator
   module-clb-collab
   module-clb-env
   module-clb-rest
   module-clb-storage
   module-clb-stream
   module-clb-ui-error
   module-clb-ui-file-browser
   module-clb-ui-form
   module-clb-ui-stream
   hbpCollaboratory
   
README
======

------------------------

.. image:: https://travis-ci.org/HumanBrainProject/angular-hbp-collaboratory.svg?branch=master
   :target: https://travis-ci.org/HumanBrainProject/angular-hbp-collaboratory

angular-hbp-collaboratory is a collection of AngularJS module to
develop applications for the HBP Collaboratory.

Install Using Bower
===================

.. code-block:: bash

   bower install angular-hbp-collaboratory


- `angular-hbp-collaboratory.js` provides all the needed AngularJS module
- `angular-hbp-collaboratory.css` provides styles for the visual components

Alternatively you can rely on `src/angular-hbp-collaboratory/main.scss` if you
plan to use Sass in your project.


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

Here is a quick (and incomplete) checklist of refactoring to operate to your
project if you want to migrate from angular-hbp-common to this cleaner library::

   Add dependency 'hbpCollaboratory'
   hbpUtil.ferr -> clbError.rejectHttpError (from clb-error module)
   hbpErrorService -> clbError              (from clb-error module)
   hbpUtil.paginatedResultSet -> clbResultSet.get (from clb-rest module)
   hbpIdentityUserDirectory -> clbUser      (from clb-identity module)
   hbpCollabStore -> clbCollab              (from clb-collab module)
   hbpCollabStore.context -> clbContext     (from clb-collab module)
   hbpCollaboratoryNavStore -> clbCollabNav (from clb-collab module)
   hbpCollaboratoryAppStore -> clbCollabApp (from clb-collab module)
   clbCollabApp -> clbCollabApp             (from clb-collab module)
   hbpEntityStore -> clbStorage             (from clb-storage module)
   hbpFileStore -> clbStorage               (from clb-storage module)
   hbpProjectStore -> clbStorage            (from clb-storage module)
   hbp-file-browser -> clb-ui-file-browser     (from clb-ui-file-browser module)

Once the refactoring of module is done, there is the refactoring of methods::

   clbStorage.getEntityByContext(ctx) -> clbStorage.getEntity({ctx: ctx})
   clbStorage.get( -> clbStorage.getEntity(
   clbStorage.getChildren now return a ResultSet like other services

You can also use the directives provided by this package.
Please be sure to check the change in the directive attributes prefix as well.::

   hbp-file-browser -> clb-file-browser
   hbp-error-message -> clb-error-message


At some point, you can remove 'hbpCommon' Angular dependency

LICENSE
=======

MIT

Read the project LICENSE file.

