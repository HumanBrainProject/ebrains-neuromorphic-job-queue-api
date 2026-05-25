# Security policy

## Supported versions

| Version | Status |
|---|---|
| Current calendar release (`YYYY<letter>`) | Supported with security fixes |
| Older releases | Unsupported |

## Reporting a vulnerability

Please **do not** open public GitLab issues for security vulnerabilities.

Report suspected vulnerabilities by e-mail to:

- Andrew Davison — <andrew.davison@cnrs.fr>

Please include, where possible:

- A description of the vulnerability and its impact.
- Steps to reproduce, or a proof-of-concept.
- The version (Git tag or commit hash) you tested against.
- Your name and affiliation, if you would like to be credited.

You can expect:

- Acknowledgement within five working days.
- A public coordinated disclosure once a fix has been deployed to
  production, with credit to the reporter unless anonymity is requested.

## Scope

In scope: the source code in this repository, the production deployment
at <https://nmpi-v3.hbpneuromorphic.eu/>, and the staging deployment at
<https://nmpi-v3-staging.hbpneuromorphic.eu/>.

Out of scope: third-party EBRAINS services this API integrates with
(IAM, Collab, Drive, Bucket, Knowledge Graph) — please report those
directly to EBRAINS.
