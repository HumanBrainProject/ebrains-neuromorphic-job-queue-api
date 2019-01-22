==========
Monitoring
==========

Monitoring of the Platform front-end services, and of the BrainScaleS and SpiNNaker services that
interact with the Job Queue service, makes use of a commercial service, StatusCake_.

We are currently using the "Superior" plan, which unfortunately does not allow sub-accounts.
The account is held by the CNRS partner.

The configuration dashboard is available at https://app.statuscake.com/. 

Services monitored
------------------

The following URLs are monitored for uptime, response time and SSL certificate validity,
on a 15-minute schedule:

- https://nmpi.hbpneuromorphic.eu/api/v2/ (Job Queue service)
- https://quotas.hbpneuromorphic.eu/projects/ (Quota service)
- http://neuralensemble.org/docs/PyNN/ (PyNN documentation)
- https://www.hbpneuromorphic.eu/home.html (Collab homepage)
- https://benchmarks.hbpneuromorphic.eu (Benchmarks service)

In addition, the following services are monitored using "push" monitoring. 
Each of these services sends an HTTP GET request to a StatusCake webhook every time it successfully runs.
The monitoring service generates an alert if the "ping" is not received.

- Database backups (script which performs a database backup hourly)
- SpiNNaker job queue check (1 minute check interval)
- BrainScaleS job queue check (2 minute check interval)

Three contact groups are defined: front-end, BrainScaleS and SpiNNaker. 
Members of these groups receive e-mails when a monitor to which they are subscribed issues an alert.


Public monitoring page
----------------------

A public monitoring webpage is available:

- publicly at http://status.hbpneuromorphic.eu
- within the Collaboratory at https://collab.humanbrainproject.eu/#/collab/51/nav/245013

The monitoring service uses a commercial provider, StatusCake (http://statuscake.com). This service tests all of the Platform web services, from multiple locations, every 15 minutes. In addition, the BrainScaleS and SpiNNaker job retrieval systems notify the monitoring service every time they successfully check for new jobs (every 1-2 minutes). In case any of the services does not respond, the Platform administrators receive an e-mail notification.


.. _StatusCake: http://statuscake.com