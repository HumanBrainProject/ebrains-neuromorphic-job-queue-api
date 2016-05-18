====================================
Setting up a development environment
====================================

The following assumes you are working with Python 2.7 in a virtual environment (using virtualenv,
conda, or similar).

Requirements
------------

We suggest using `pip-tools`_ to install packages::

    $ pip install pip-tools

The base development requirements are in :file:`deployment/requirements-deploy.txt`.
Install them using::

    $ pip-sync deployment/requirements-deploy.txt

Some of the project requirements are private HBP/BlueBrain Project packages.
To install these requires either a VPN connection to EPFL or a local copy of the packages.
If you have VPN access, run::

    $ pip download -i https://bbpteam.epfl.ch/repository/devpi/simple --pre -r deployment/requirements-bbp.txt -d packages

and then un-tar the archives in the :file:`packages` directory.
If you do not have VPN access, contact Andrew Davison to obtain a local copy.

Finally, to install the remaining dependencies, run::

    $ pip-sync -f packages deployment/requirements-deploy.txt job_manager/requirements.txt resource_manager/requirements.txt

.. note:: If using conda, you may wish to install some or all of the dependencies with
          ``conda install`` instead of ``pip``. On Linux, it may be easier to install
          ``psycopg2`` via the package manager rather than using ``pip``.


.. todo:: install nodejs, bower, Bower components

Setting up a database
---------------------

Most of the time while developing it is easiest to use SQLite. However, since we use PostgreSQL
in production, it is important to at least test with a PostgreSQL database. This can be
installed directly on your machine, but it may be easier to use Docker, both to minimize the
differences with respect to production, and to make it simple to wipe out and recreate the
test database.

First, we pull the Docker image from the Docker registry::

    $ docker pull tutum/postgresql

To run the image::

    $ docker run -d -p 5432:5432 tutum/postgresql

Run ``docker ps`` to get the container ID, then

    $ docker logs <CONTAINER_ID>

to show the randomly-generated password. Now we create the admin user that will be used by
Django to connect::

    $ psql --user postgres --command "CREATE USER nmpi_dbadmin WITH PASSWORD '<password>';"
    $ psql --user postgres --command "CREATE DATABASE nmpi OWNER nmpi_dbadmin;"
    $ psql --user postgres --command "GRANT ALL PRIVILEGES ON DATABASE nmpi TO nmpi_dbadmin;"


Configuring Django
------------------

When developing locally, set the following environment variable::

    $ export NMPI_ENV=dev

By default, when developing locally you will use a local SQLite database. To use a PostgreSQL
database (either a local one or the production database), in :file:`settings.py` for the
project you are working on set ``LOCAL_DB = False``.

To tell Django which PostgreSQL database you are working on, set the environment
variables ``NMPI_DATABASE_HOST``, ``NMPI_DATABASE_PORT``, ``NMPI_DATABASE_PASSWORD``.

You also need to set the environment variables ``DJANGO_SECRET_KEY``,
``HBP_OIDC_CLIENT_ID`` and ``HBP_OIDC_CLIENT_SECRET``. The former can be set to whatever you
wish for development purposes. To obtain the latter two, you should
`register an OpenID Connect client`_ using ``https://localhost:8001/complete/hbp`` as the URL.

To check everything is working::

    $ python manage.py check

and to initialize the database::

    $ python manage.py migrate

Next you should `create a local SSL certificate`_; now you can run the development server using::

    $ python manage.py runsslserver --certificate ~/.ssl/server.crt --key ~/.ssl/server.key 127.0.0.1:8001


Running the tests
-----------------

Unit tests are run as follows. In the :file:`job_manager` directory::

    $ python manage.py test simqueue

In the :file:`resource_manager` directory::

    $ python manage.py test quotas


.. _`pip-tools`: https://github.com/nvie/pip-tools
.. _`register an OpenID Connect client`: https://collab.humanbrainproject.eu/#/collab/54/nav/1051
.. _`create a local SSL certificate`: https://developer.humanbrainproject.eu/docs/projects/HBP%20Collaboratory%20Documentation/1.7/app-developer-manual/quickstart/setup/ssl-certificate.html