======================
Deploying the platform
======================

The service is deployed as a Docker container running in a VM in the JSC Cloud.
Continuous deployment is handled by EBRAINS GitLab CI;
this page documents the build and deployment flow so that an operator can
deploy or recover the service.

Components
==========

The production deployment consists of:

- The **API container** — built from this repository (``api/deployment/Dockerfile.prod``).
- A **PostgreSQL database** — runs in a separate VM
  (``neuromorphic-remote-access-database``).
- A **backup VM** — takes daily database dumps
  (``neuromorphic-remote-access-backup``).

Public entry points:

- Production API: https://nmpi-v3.hbpneuromorphic.eu/
- Staging API: https://nmpi-v3-staging.hbpneuromorphic.eu/
- Status page: https://status.ebrains.eu/

Build pipeline
==============

The build is driven by ``.gitlab-ci.yml``. On every push:

- ``staging`` branch → builds and pushes
  ``docker-registry.ebrains.eu/neuromorphic/nmpi_queue_server_v3:staging``,
  then runs the full test suite against a PostgreSQL 14 service
  container.
- ``main`` branch → builds and pushes
  ``docker-registry.ebrains.eu/neuromorphic/nmpi_queue_server_v3:prod``.

Deployment to JSC Cloud
=======================

The high-level steps are:

1. A commit is merged to ``main`` (or ``staging``).
2. GitLab CI builds and pushes the new image to the EBRAINS Docker
   registry.
3. This image is pulled and redeployed manually using docker-compose.

A migration of the deployment to Kubernetes is in progress.

Database
========

The PostgreSQL database runs on a dedicated VM, so
that backups and disk volumes are managed independently of the API
container life-cycle.

Backups
-------

A cron job on the backup VM dumps the database hourly to
``/mnt/backups/nmpidb`` and pushes a heartbeat to the monitoring service
on success (see :doc:`monitoring`).

To restore from a dump::

    $ psql -U postgres -h <database-host> -f <dump-file>

Schema migrations
-----------------

The schema is defined in ``api/simqueue/db.py`` using SQLAlchemy Core.
There is no formal migration framework; schema changes are applied manually.

Secrets
=======

All secrets — IAM client secret, database password, session secret,
hardware-provider API keys — live in EBRAINS GitLab CI variables (for
build-time) or as environment variables on the VM (run-time). They
are **not** stored in this repository.

Operational contacts
====================

- Maintainer: Andrew Davison (andrew.davison@cnrs.fr)
- EBRAINS operations: support@ebrains.eu
- DNS for ``hbpneuromorphic.eu``: managed via GoDaddy (contact
  maintainer for access).
- TLS certificates: issued by Let's Encrypt, automatically renewed on the VM.
