angular-hbp-collaboratory is a collection of AngularJS module to
develop applications that use HBP Collaboratory.

At the moment the libraries depends on code that is not hosted on Github so
it requires an EPFL account. Those dependencies should be released during
summer 2016.

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
