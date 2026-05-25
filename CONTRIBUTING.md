# Contributing

Thank you for your interest in contributing to the EBRAINS Neuromorphic
Computing Job Queue API.

## Code of Conduct

This project adopts the [Contributor Covenant 2.1](CODE_OF_CONDUCT.md).
By participating you agree to abide by its terms.

## Licensing of contributions

The project is licensed under the [Apache License 2.0](LICENSE).
By submitting a merge request you certify that you have the right to
contribute the work and you agree that your contribution will be released
under the same licence. No separate Contributor Licence Agreement is
required.

## Where to start

- Bug reports and feature requests:
  [gitlab.ebrains.eu/neuromorphic/job-queue-api/-/issues](https://gitlab.ebrains.eu/neuromorphic/job-queue-api/-/issues)
- Questions about using the service: the EBRAINS support channel
  ([support@ebrains.eu](mailto:support@ebrains.eu)) or
  [andrew.davison@cnrs.fr](mailto:andrew.davison@cnrs.fr).

## Branching and release model

| Branch | Purpose |
|---|---|
| `staging` | Active development. All merge requests target this branch. Pushes here trigger a build of the `:staging` Docker image deployed to the staging API at <https://nmpi-v3-staging.hbpneuromorphic.eu/>. |
| `main` | Production. Pushes here trigger a build of the `:prod` Docker image deployed to <https://nmpi-v3.hbpneuromorphic.eu/>. |

Workflow:

1. Fork the repository and create a feature branch from `staging`.
2. Make your changes (see *Development workflow* below).
3. Open a merge request against `staging`. CI must pass.
4. A maintainer reviews and merges.
5. When a release is cut, `staging` is fast-forwarded into `main` and tagged
   with a calendar-letter version (see [README](README.md) → *Versioning*).

## Development workflow

See [`documentation/developer_guide/development_environment.rst`](documentation/developer_guide/development_environment.rst)
for full setup instructions. Quick start:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r api/requirements.txt.lock
pip install -r api/requirements_testing.txt
```

Run the tests from the `api/` directory:

```bash
cd api
python setup_test_db.py    # initialise the local Postgres test database
pytest --cov=simqueue
```

## Coding conventions

- Python 3.11+. Style is PEP 8 with a 119-character line limit.
- Lint and formatting are enforced via [Ruff](https://docs.astral.sh/ruff/);
  see `api/pyproject.toml`. Before pushing:
  ```bash
  ruff check api/simqueue
  ruff format --check api/simqueue
  ```
- Docstrings use the Google style.
- Commit messages: imperative mood, sentence case, ≤72 characters in the
  subject line. Example: `Add per-user statistics endpoint`.

The legacy code base is not yet fully reformatted. New code must pass
`ruff check`; older files will be reformatted opportunistically when
touched.

## Merge request checklist

- [ ] Tests added or updated for the change
- [ ] `pytest` and `ruff check` pass locally
- [ ] User-facing changes have a corresponding entry in `CHANGELOG.md` under
      `## [Unreleased]`
- [ ] Documentation (`documentation/developer_guide/`) updated if behaviour
      or workflow changes
- [ ] Commit messages follow the convention above

## Reporting security issues

Please do **not** report security vulnerabilities through public GitLab
issues. See [SECURITY.md](SECURITY.md) for the disclosure procedure.
