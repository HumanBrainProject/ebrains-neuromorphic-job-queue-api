=====================
Platform architecture
=====================

The neuromorphic-computing remote-access service lets researchers submit
PyNN scripts to be executed on the SpiNNaker and BrainScaleS hardware
systems without direct access to either. This repository implements the
central **Job Queue and Quotas API**; other components live in
separate repositories.

User-facing components
======================

- `Job Queue and Quotas REST API <https://nmpi-v3.hbpneuromorphic.eu/docs>`_
  (this repository)
- `Job Manager web app <https://neuromorphic-job-manager.apps.ebrains.eu/>`_
  (`source <https://github.com/HumanBrainProject/nmpi-job-manager-app>`__)
- `Python / command-line client <https://pypi.org/project/hbp-neuromorphic-platform/>`__
  (`source <https://github.com/HumanBrainProject/hbp-neuromorphic-client>`__)
- `User Guidebook <https://electronicvisions.github.io/hbp-sp9-guidebook/>`_
- `Dashboard app <https://nmpi-v3.hbpneuromorphic.eu/dashboard/>`_
  (served by this API)

System diagram
==============

::

    +-------------------+          +---------------------+
    | Job Manager web   |          | Python / CLI client |
    +---------+---------+          +----------+----------+
              |                                |
              +---------------+----------------+
                              |
                              v (HTTPS, OAuth2/OIDC bearer or API key)
                   +----------+----------+
                   |   Job Queue API     |  <-- this repository
                   |   (FastAPI/uvicorn) |
                   +---+-----+--------+--+
                       |     |        |
        +--------------+     |        +----------------+
        v                    v                         v
  +-----+------+   +---------+---------+   +-----------+-----------+
  | PostgreSQL |   | EBRAINS IAM       |   | EBRAINS Drive/Bucket  |
  | (jobs,     |   | (auth, group      |   | (job inputs/outputs)  |
  |  quotas)   |   |  membership)      |   +-----------+-----------+
  +------------+   +-------------------+               |
                              ^                        v
                              |             +----------+-----------+
                              +-------------+ Knowledge Graph      |
                                            | (provenance, models) |
                                            +----------------------+

                                  ^
                                  | (pull jobs via API key)
                                  |
              +-------------------+--------------------+
              |                                        |
      +-------+--------+                       +-------+---------+
      |  SpiNNaker     |                       |   BrainScaleS   |
      |  (Manchester)  |                       |  (Heidelberg)   |
      +----------------+                       +-----------------+

Code layout
===========

The Python package lives in ``api/simqueue/``:

- ``main.py`` — FastAPI application entry point, route registration,
  middleware (status, CORS, sessions).
- ``oauth.py`` — EBRAINS IAM OIDC integration and access-token
  validation.
- ``db.py`` — SQLAlchemy Core schema and async query helpers.
- ``data_models.py`` — Pydantic request/response models.
- ``data_repositories.py`` — adapters for external storage
  (EBRAINS Drive, Bucket, generic HTTP).
- ``resources/`` — per-resource router modules (jobs, quotas,
  statistics, authentication, dashboards).
- ``settings.py``, ``globals.py``, ``utils.py`` — shared configuration
  and helpers.
- ``tests/`` — unit and integration tests (see :doc:`testing`).

Deployment artefacts (Dockerfiles, nginx and supervisor configuration)
live under ``api/deployment/``; the Sphinx developer guide lives under
``documentation/developer_guide/``.

The REST API itself is served by `FastAPI <https://fastapi.tiangolo.com/>`_
behind `nginx <https://nginx.org/>`_ inside a single Docker container
running in Kubernetes on the JSC Cloud. The Collaboratory front-end
applications are implemented separately, in React.
