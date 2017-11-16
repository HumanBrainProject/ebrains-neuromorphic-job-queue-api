=========================
Web platform architecture
=========================

The web platform provides the following components:

* Running on nmpi.hbpneuromorphic.eu:
    * Job queue REST service
    * Job manager Collaboratory app
    * Dashboard Collaboratory app
* Running on quotas.hbpneuromorphic.eu:
    * Quotas REST service
    * Resource manager Collaboratory app
    * Resource manager coordination Collaboratory app
* Running on www.hbpneuromorphic.eu:
    * Collaboratory home ("splash") page
    * Development and Operations Guidebook (this document)
* Python client
* User Guidebook

In addition to the three web servers listed above, there is a staging server *nmpi-staging.hbpneuromorphic.eu*
(a staging server for quotas is planned) and a database server.

The REST services are implemented with Django. The Collaboratory apps are implemented with AngularJS.
Both services and apps are served using nginx, running in Docker containers on cloud servers
from Digital Ocean.



.. Coming later

.. benchmark server:  benchmarks.hbpneuromorphic.eu
.. benchmark database
.. benchmark runner (webhook)
.. nest server (for benchmarks): nest.hbpneuromorphic.eu
.. nest data store: tmp-data.hbpneuromorphic.eu
.. sandbox: sandbox.hbpneuromorphic.eu
.. monitoring service
