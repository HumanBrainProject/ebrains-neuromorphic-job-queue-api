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
   module-hbpCommonCompat
   module-clb-rest
   module-clb-storage
   module-clb-stream
   module-clb-ui-error
   module-clb-ui-form
   module-clb-ui-identity
   module-clb-ui-loading
   module-clb-ui-storage
   module-clb-ui-stream
   
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

Service Refactoring
~~~~~~~~~~~~~~~~~~~

First, rely on the services from angular-hbp-collaboratory. For this, you need
to depends on the ``hbpCollaboratoryCore`` module.

.. code-block::

    // before
    angular.module('myModule', ['hbpCommon', 'bbpDocumentClient']);

    // after
    angular.module('myModule', [
      'hbpCollaboratoryCore',
      'hbpCommon',
      'bbpDocumentClient'
    ]);

If you use bower to install, it will ask you to resolve a conflict about the
angular-bootstrap version. Stick to the angular-hbp-common declaration at
this point. At this point, your code should still work, that will let you
progressively refactor to use the new library instead of the old one::

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
   hbp-file-browser -> clb-ui-storage     (from clb-ui-storage module)

In fact, ``hbpCollaboratoryCore`` is a shell module that will require many
sub-modules as an easy way to migrate and import everything.
It would be even better if your application require only the needed sub-modules
as indicated by the refactoring list above.

Once the refactoring of module is done, there is the refactoring of methods::

   clbStorage.getEntityByContext(ctx) -> clbStorage.getEntity({ctx: ctx})
   clbStorage.get( -> clbStorage.getEntity(
   clbStorage.getChildren now return a ResultSet like other services

clbUser.isHbpMember is no more because the accreditation multiply. You should
instead make a call like:

   clbUser.isHbpMember() -> clbUser.isGroupMember(['hbp-accred-sga1']);

At this point, your javascript code should rely only on
``angular-hbp-collaboratory``, with the exception of the UI. Your application
should work as previously. If you were not using any directive from the
beforementioned module, you are done and you can remove the old module import,
as well as their reference in ``bower.json``

.. code-block:: javascript

     // If there is no UI components in use

     // before
     angular.module('myModule', [
       'hbpCollaboratoryCore',
       'hbpCommon',
       'bbpDocumentClient'
     ]);

     // after
     angular.module('myModule', [ // some of the following:
       'clb-app',
       'clb-automator',
       'clb-collab',
       'clb-env',
       'clb-error',
       'clb-identity',
       'clb-rest',
       'clb-storage',
       'clb-stream'
     ]);


If your code is using some of the directive from angular-hbp-common or
angular-hbp-document-client, you need to refactor them as well before being
able to cut the old dependencies.

UI Refactoring
~~~~~~~~~~~~~~

UI Bootstrap has been upgraded to the next major version and the components are
now prefixed. This means you cannot use the UI part of angular-hbp-common with
angular-hbp-collaboratory. At this point, you should entirely remove
angular-hbp-common from your dependencies and require the UI package from
angular-hbp-collaboratory.

.. code-block:: javascript

  // before
  angular.module('myModule', [
    'hbpCollaboratoryCore',
    'hbpCommon',
    'bbpDocumentClient'
  ]);

  // after
  angular.module('myModule', [
    'hbpCollaboratoryCore',
    'hbpCollaboratoryUI',
  ]);


You now need to run ``bower update`` and resolve the conflict on ``angular-bootsrap``
by choosing the version in ``angular-hbp-collaboratory``.

If your code is using directives from this library, please refer to the angular-bootstrap
_`Migration Guide <https://github.com/angular-ui/bootstrap/wiki/Migration-guide-for-prefixes>`.

You can also use the directives provided by this package.
Please be sure to check the change in the directive attributes prefix as well.::

   hbp-file-browser -> clb-file-browser (root -> clb-root, entity -> clb-entity)
   hbp-error-message -> clb-error-message (hbp-promise -> clb-promise, hbp-message -> clb-message)
   hbp-usercard -> clb-usercard (hbp-user -> clb-user, hbp-template -> clb-template)

``hbpDialogFactory`` has been removed, with the exception of ``hbpDialogFactory.error`` which
is now ``clbErrorDialog.open (module clb-ui-error)``. Those two refactore will have you covered::

   hbpDialogFactory -> clbErrorDialog
   clbErrorDialog.error -> clbErrorDialog.open

If you were using other methods from clbDialogFactory (e.g.: ``.alert()`` or ``.confirm``),
you need to rewrite them using angular-bootstrap ``$uibModal`` (read the
_`documentation <https://angular-ui.github.io/bootstrap/#/modal>`)

Since usage of ``hbp-generated-icon`` has been deprecated for anything but users
without avatars, it has been replaced by a new directive called ``clb-user-avatar``
available in the module clb-ui-identity.
It displays either a generated icon or the user profile picture. This new
component is also easier to customize using pure css.

At the end of the process, your application should only load ``angular-hbp-collaboratory``

.. code-block:: javascript

    angular.module('myModule', [
    // some of the following:
      'clb-app',
      'clb-automator',
      'clb-collab',
      'clb-env',
      'clb-error',
      'clb-identity',
      'clb-rest',
      'clb-storage',
      'clb-stream',
      'clb-ui-error',
      'clb-ui-storage',
      'clb-ui-form',
      'clb-ui-loading',
      'clb-stream'
    ]);


LICENSE
=======

MIT

Read the project LICENSE file.

