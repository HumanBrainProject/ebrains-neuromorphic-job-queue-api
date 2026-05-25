# Changelog

All notable changes to the EBRAINS Neuromorphic Computing Job Queue API
are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses a calendar-letter versioning scheme `YYYY<letter>`
(see [README](README.md) → *Versioning*).

## [Unreleased]

### Added
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`,
  `PRIVACY.md`, `SECURITY.md` for project governance.
- `codemeta.json` describing the software metadata in JSON-LD form.
- Ruff configuration and SPDX licence identifier in `api/pyproject.toml`.
- Lower bounds in `api/requirements.txt`.
- CI job to build the Sphinx developer guide.
- `documentation/developer_guide/coding_conventions.rst`.

### Changed
- Developer guide pages (`development_environment.rst`, `deployment.rst`,
  `testing.rst`, `monitoring.rst`, `architecture.rst`) refreshed to match
  the current FastAPI / Kubernetes / Grafana / GitHub-Actions stack.
- `.github/workflows/test_simqueue.yml`: replaced bare `flake8` with `ruff`
  and added a documentation build step.
- README extended with versioning, communication and contributing sections.

## [2025D] — 2026-01-25

### Added
- Middleware to check service status (`read-only`, `down for maintenance`)
  and return appropriate error responses.
- More detailed logging — capture logs from all Python code, not just
  uvicorn.

### Changed
- Deployment updates: refreshed Docker image build and nginx config for the
  production stack.
- API documentation now references EBRAINS-2.0.

## [2025C] — 2025-12-01

### Added
- Support for per-user quotas via a synthetic collab name
  `private-{username}`.

### Changed
- Relaxed the version constraint on `urllib3`.

### Fixed
- Test failures uncovered by the per-user quota change.

## [2025B] — 2025-08-25

### Added
- Per-user statistics endpoint, with counts broken down by hardware
  platform and session counts included.

### Changed
- Attributes that can be `None` are now explicitly typed as `Optional`.
- Updated redirect for the provenance API (`prov-api`).
- Notification e-mails carry more information and are now sent when a
  project is *submitted for review* rather than when it is *created*.

### Fixed
- Statistics calculation handles unexpected data shapes without crashing.
- Dashboard static-file paths and image-copy steps for the production
  Docker image.
- Path to `uvicorn` after the switch to a virtualenv-based image.

## [2025A] — 2025-05-20

### Added
- Notification e-mail to administrators when a user submits a new resource
  request.
- Local test database setup script (`api/setup_test_db.py`).
- CI runs on the `staging` branch and on pull requests.

### Changed
- Production Dockerfile and README updated for the new deployment stack.
- Restored the embedded dashboard (carried across from the `api-v2`
  branch).
- Test database initialisation moved into Python (no longer requires
  `psql` on the CI runner).
- Updated Python versions used for testing (3.11 and 3.13).
- Refreshed `requirements.txt.lock` and adjusted code for the newer
  dependency versions (notably `httpx` 0.28).

### Fixed
- Several flaky tests stabilised; bugs in auto-creation of test projects
  and quota deletion fixed.
- GitLab CI build restored after the move to Debian Bookworm.

## [2023A] — 2023-11-16

First tagged release of the FastAPI-based v3 service after the migration
away from the Django-based v2 stack. See git history for details.

## [2022B] — 2023-02-28

Maintenance release of the v2 (Django) service.

## [2022A] — 2022-03-14

Maintenance release of the v2 (Django) service.

## [2021A] — 2021-08-31

Last consolidated v2 (Django) release before the v3 rewrite began.

[Unreleased]: https://gitlab.ebrains.eu/neuromorphic/job-queue-api/-/compare/2025D...HEAD
[2025D]: https://gitlab.ebrains.eu/neuromorphic/job-queue-api/-/compare/2025C...2025D
[2025C]: https://gitlab.ebrains.eu/neuromorphic/job-queue-api/-/compare/2025B...2025C
[2025B]: https://gitlab.ebrains.eu/neuromorphic/job-queue-api/-/compare/2025A...2025B
[2025A]: https://gitlab.ebrains.eu/neuromorphic/job-queue-api/-/compare/2023A...2025A
[2023A]: https://gitlab.ebrains.eu/neuromorphic/job-queue-api/-/compare/2022B...2023A
[2022B]: https://gitlab.ebrains.eu/neuromorphic/job-queue-api/-/compare/2022A...2022B
[2022A]: https://gitlab.ebrains.eu/neuromorphic/job-queue-api/-/compare/2021A...2022A
[2021A]: https://gitlab.ebrains.eu/neuromorphic/job-queue-api/-/tags/2021A
