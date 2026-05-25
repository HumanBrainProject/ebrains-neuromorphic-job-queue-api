# Authors and Contributors

This document lists the people who have contributed to the
EBRAINS Neuromorphic Computing Job Queue and Quota API &mdash; both the current
FastAPI implementation under `api/simqueue/` and the earlier Django
implementation under `simqueue/`, `quotas/`, and `job_manager/`.

## Andrew Davison

- Project lead and current maintainer.
- Overall architecture and the rewrite from Django to FastAPI.
- Job queue, quotas, projects, and statistics endpoints.
- Authentication and authorization (EBRAINS IAM / Keycloak).
- Deployment, continuous integration, and test infrastructure.
- Notification e-mails and the status-check middleware.
- Documentation.

## Fatma Gara El Haddad

- Quotas subsystem (FastAPI) and its tests.

## Onur Ates

- Queue and job statistics endpoints (FastAPI).
- Tagging and commenting features for jobs (FastAPI).

## Hassen Aguili

- Tagging and commenting features for jobs (Django).
- Job-list filtering by status, hardware platform, and tags (Django).

## Matthieu Senoville

- Copying of job output to the Collab Drive (Django).
- Handling of subdirectories when packaging and downloading job results.

## Frontend contributors

The repository historically also contained the AngularJS-based Collaboratory
frontends (the job manager, the resource manager, and the shared `clb-*`
component library). That code has since moved out of this repository, but
we acknowledge here the following contributors:
Jonathan Duperrier, Hassen Aguili and Domenico Guarino:

## Funding

This work has been supported by the European Union under the following
grants:

- Horizon 2020, Human Brain Project SGA1 &mdash; Grant Agreement No. 720270
- Horizon 2020, Human Brain Project SGA2 &mdash; Grant Agreement No. 785907
- Horizon 2020, Human Brain Project SGA3 &mdash; Grant Agreement No. 945539
- Horizon Europe, EBRAINS-2.0 &mdash; Grant Agreement No. 101147319

---

If you have contributed to the project and your name is missing, mis-spelled,
or your affiliation has changed, please open a merge request or contact the
maintainer.
