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
   hbpErrorService -> clbError                    (from clb-error module)
   hbpUtil.ferr -> clbError.rejectHttpError       (from clb-error module)
   hbpUtil.paginatedResultSet -> clbResultSet.get (from clb-rest module)
   hbpIdentityUserDirectory -> clbUser            (from clb-identity module)
   hbpCollabStore -> clbCollab                    (from clb-collab module)
   hbpCollabStore.context -> clbContext           (from clb-collab module)
   hbpCollaboratoryNavStore -> clbCollabNav       (from clb-collab module)
   hbpCollaboratoryAppStore -> clbCollabApp       (from clb-collab module)
   hbpEntityStore -> clbStorage                   (from clb-storage module)
   hbpFileStore -> clbStorage                     (from clb-storage module)
   hbpProjectStore -> clbStorage                  (from clb-storage module)
   hbpConfigStore -> Manually refactor to clbCtxData (from clb-ctx-data)
     The service now use JSON as data format and the method signature
     changed from method(config) to method(ctx, data)

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
To find if and where your code is using such directives, you can run the following command
in your source code folder:

.. code-block:: bash

  grep -ro '<accordion\|<accordion-group\|<accordion-heading\|<accordionConfig\|<alert\|<btn-checkbox\|<btn-radio\|<buttonConfig\|<carousel\|<slide\|<collapse\|<dateParser\|<datepicker\|<datepicker-popup\|<daypicker\|<monthpicker\|<yearpicker\|<datepickerConfig\|<datepickerPopupConfig\|dropdown=\|dropdown-toggle=\|dropdown-menu=\|<keyboard-nav\|<dropdownService\|<$modal\|<$modalInstance\|<$modalStack\|<modal-transclude\|<pagination\|<pager\|<pagerConfig\|<paginationConfig\|popover=\|popover-template=\|popover-html=\|$position\|<progressbar\|<bar\|<progress\|<progressConfig\|<rating\|<ratingConfig\|<tabset\|<tab\|<tab-heading\|timepicker\|timepickerConfig\|tooltip=\|tooltip-template=\|tooltip-html=\|$tooltip\|typeahead\|typeahead-match\|typeaheadHighlightFilter\|typeaheadParser' .

You can also use the directives provided by this package.
Please be sure to check the change in the directive attributes prefix as well.::

   hbp-file-browser -> clb-ui-storage (root -> clb-root, entity -> clb-entity)
   hbp-error-message -> clb-error-message (hbp-promise -> clb-promise, hbp-message -> clb-message)
   hbp-usercard -> clb-usercard (hbp-user -> clb-user, hbp-template -> clb-template)
   hbp-loading -> clb-loading (hbp-promise -> clb-promise, hbp-message -> clb-message)
   hbp-perform-action -> clb-perform-action

If you wrote a usercard custom template (using ``hbp-template`` attribute), you should update the following css classes
and probably update the template to conform to the new html structure::

   hbp-usercard -> clb-usercard
   hbp-usercard-pix -> clb-usercard-pix
   hbp-user-avatar -> clb-user-avatar
   hbp-usercard-header -> clb-usercard-header
   hbp-usercard-institution -> clb-usercard-institution
   hbp-usercard-contact -> clb-usercard-contact
   hbp-usercard-contact-item -> clb-usercard-contact-item

``hbpDialogFactory`` has been removed, with the exception of ``hbpDialogFactory.error`` and ``hbpDialogFactory.confirm`` which
are now respectively ``clbErrorDialog.open`` (module ``clb-ui-error``) and ``clbConfirm.open`` (module ``clb-ui-dialog``).
These two refactoring will have you covered::

   hbpDialogFactory -> clbErrorDialog and/or clbConfirm
   hbpDialogFactory.error -> clbErrorDialog.open
   hbpDialogFactory.confirm -> clbConfirm.open

If you were using other methods from hbpDialogFactory (e.g.: ``.alert()``),
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


Auth Refactoring
~~~~~~~~~~~~~~~~

This module contains clbAuth and clbAuthHttp service to manage authentication.
clbAuth provide a login() and a logout() method. To use them, just drop
any reference to bbpOidcClient and bbpOidcSession from your code and use instead
``clbAuth.login()`` and ``clbAuth.logout()`` method.

The injection of the Authorization header is no more automatic to avoid leakage
of the token. It is part of every service library from ``angular-hbp-collaboratory``.
Check in every place you are using ``$http`` Angular module. If the call require
the token to be injected, add it by using ``clbAuthHttp`` service instead of
``$http``.



LICENSE
=======

MIT

Read the project LICENSE file.
