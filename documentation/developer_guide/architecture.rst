=====================
Platform architecture
=====================

The platform provides the following user-facing components:

- [Job queue and Quotas REST service](https://nmpi-v3.hbpneuromorphic.eu/docs)
- [Job manager app](https://neuromorphic-job-manager.apps.ebrains.eu/)
- [Dashboard app](https://nmpi-v3.hbpneuromorphic.eu/dashboard/)
- [Administrator app](https://adminapp.apps.tc.humanbrainproject.eu/)
- [Python client](https://pypi.org/project/hbp-neuromorphic-platform/)
- [User Guidebook](https://electronicvisions.github.io/hbp-sp9-guidebook/index.html)

Behind the scenes there is a database server, a database backup service,

The REST services are implemented with FastAPI. The Collaboratory apps are implemented with React.
Both services and apps are served using nginx,
running in Kubernetes containers in the [JSC Cloud](https://www.fz-juelich.de/en/ias/jsc/systems/scientific-clouds/jsc-cloud).
