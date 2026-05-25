=======
Testing
=======

The test suite lives in ``api/simqueue/tests/`` and is written with
``pytest`` plus ``pytest-asyncio``. It is run automatically by GitLab CI.


Test layout
===========

- ``test_db_access.py`` — exercises ``simqueue/db.py`` against a real
  PostgreSQL database.
- ``test_integration.py`` — drives the full ASGI application via an
  ``httpx`` client; some tests require live EBRAINS credentials and are
  skipped otherwise.
- ``test_queue_router.py``, ``test_quotas_router.py``,
  ``test_statistics_router.py``, ``test_auth_router.py`` — per-router
  unit tests with mocked dependencies.
- ``test_oauth.py`` — covers the OAuth/OIDC integration with EBRAINS
  IAM.
- ``test_repositories.py`` — exercises the storage adapters
  (``EBRAINSDrive``, ``EBRAINSBucket`` etc.).
- ``test_utility_functions.py`` — pure-function helpers.

Running locally
===============

From the ``api/`` directory, after the database is initialised
(see :doc:`development_environment`)::

    $ pytest --cov=simqueue --cov-report=term

Useful invocations::

    $ pytest -k oauth                  # subset by name
    $ pytest --cov=simqueue --cov-report=html   # browsable coverage report

Environment variables that enable additional tests:

- ``EBRAINS_AUTH_TOKEN`` — a valid IAM access token; tests in
  ``test_integration.py`` that hit live services are skipped if this is
  not set.
- ``NMPI_TESTING_APIKEY`` — the API key for the synthetic test hardware
  provider, written into the test database by ``setup_test_db.py`` and
  read by hardware-provider-facing endpoint tests.

Linting
=======

``ruff check api/simqueue`` runs on every CI build. See
:doc:`coding_conventions`.
