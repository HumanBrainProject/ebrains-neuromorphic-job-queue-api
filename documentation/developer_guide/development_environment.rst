====================================
Setting up a development environment
====================================

The service targets Python 3.11+. It is a FastAPI application backed by a
PostgreSQL database and the EBRAINS authentication / storage services.

Requirements
============

Create a virtual environment and install the locked dependencies::

    $ python3.11 -m venv .venv
    $ source .venv/bin/activate
    $ pip install --upgrade pip
    $ pip install -r api/requirements.txt.lock
    $ pip install -r api/requirements_testing.txt

``api/requirements.txt`` contains the loose top-level requirements (with
minimum version bounds); ``api/requirements.txt.lock`` contains the
fully pinned, reproducible set used in production Docker images.

Setting up a database
=====================

The application uses PostgreSQL in production. For development, run a
local PostgreSQL instance via Docker::

    $ docker run --name nmpidb -e POSTGRES_PASSWORD=<chosen-password> \
        -p 32768:5432 -d postgres:14

Then, from the ``api/`` directory, initialise the test database::

    $ export PGPASSWORD=<chosen-password>
    $ python setup_test_db.py

This drops and recreates the ``nmpi`` database and the ``test_user`` role,
creates all tables, and populates them with synthetic test data.

Configuration
=============

The application reads its configuration from environment variables. For
local development, copy ``api/env_local.sh`` (excluded from version
control), fill in your own values, and ``source`` it before starting the
server. The variables you need are documented in
``api/simqueue/settings.py``; the most important are:

- ``EBRAINS_IAM_SERVICE_URL``, ``EBRAINS_IAM_CLIENT_ID``,
  ``EBRAINS_IAM_SECRET`` — credentials for an OIDC client registered with
  EBRAINS IAM (use the ``iam-int`` realm for development).
- ``EBRAINS_COLLAB_SERVICE_URL``, ``EBRAINS_DRIVE_SERVICE_URL``,
  ``EBRAINS_BUCKET_SERVICE_URL`` — endpoints for the Collaboratory
  services.
- ``NMPI_DATABASE_HOST``, ``NMPI_DATABASE_PORT``,
  ``NMPI_DATABASE_PASSWORD``, ``NMPI_DATABASE_USER`` — connection to
  the PostgreSQL database.
- ``SESSIONS_SECRET_KEY`` — any random string for local development.
- ``NMPI_BASE_URL`` — the base URL the running server should advertise
  (``http://localhost:8000`` for local development).

Running the server
==================

From the ``api/`` directory::

    $ uvicorn simqueue.main:app --reload --port 8000

The interactive OpenAPI documentation is then available at
``http://localhost:8000/docs``.

Running the tests
=================

From the ``api/`` directory, after setting up the test database::

    $ pytest --cov=simqueue --cov-report=term

Integration tests that exercise live EBRAINS services require additional
environment variables:

- ``EBRAINS_AUTH_TOKEN`` — a valid IAM access token (the tests skip if
  this is not set).
- ``NMPI_TESTING_APIKEY`` — the API key used by the synthetic hardware
  provider in the test database (the tests skip if this is not set).

CI runs the test suite on Python 3.11 and 3.13 — see
:doc:`testing` for details.

Code style
==========

The project uses `Ruff <https://docs.astral.sh/ruff/>`_ for linting and
formatting; configuration lives in ``api/pyproject.toml``. See
:doc:`coding_conventions` for the full conventions.
