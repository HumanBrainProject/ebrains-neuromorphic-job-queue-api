==========
Monitoring
==========

Live operational monitoring of the Neuromorphic Job Queue API runs on the
shared EBRAINS infrastructure.

Dashboards
==========

- **Grafana** — resource usage, request rates, error counts, and
  per-platform job throughput:
  https://grafana.ebrains.eu/dashboards/f/b7a2de0a-e345-4ac3-9929-f946aa1328b5/neuromorphic-remote-access
- **Status page** — public uptime indicator for all EBRAINS services,
  including this API:
  https://status.ebrains.eu

Health endpoint
===============

The API exposes ``/`` and ``/docs`` as smoke-test endpoints. Kubernetes
liveness and readiness probes hit a lightweight endpoint defined in
``api/simqueue/main.py``.

Logs
====

The container streams logs to stdout (configured in
``api/log_conf.yaml``), which the JSC Cloud cluster aggregates and makes
available through the EBRAINS observability stack. Application logs
include all Python loggers (not only uvicorn), so handlers added in the
``simqueue`` package are captured automatically.

Alerts
======

Alerts on the Grafana dashboards page maintainers via the EBRAINS
operations rota. Maintenance windows and degraded-mode states can be
signalled via the ``maintenance`` middleware (see
``api/simqueue/main.py``) so that clients receive a structured error
rather than a generic 5xx.

Contacts
========

- Maintainer: Andrew Davison (andrew.davison@cnrs.fr)
- EBRAINS operations: support@ebrains.eu
