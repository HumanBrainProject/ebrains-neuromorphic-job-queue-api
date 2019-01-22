======================
Deploying the platform
======================

The job queue server and its web interface are deployed in the cloud using Docker containers.
Building Docker images and deploying the containers is handled by the "cloud-deploy" package,
available at https://github.com/CNRS-UNIC/cloud-deploy. This provides a command-line tool, :file:`cld` script.


.. note:: All actions of :file:`cld` are logged to :file:`deploy.log` so you can always
          review the actions that have been performed.

Managing nodes and services
===========================

We use the name "node" to refer to an individual virtual server running in the Digital Ocean
cloud. We use the name "service" to refer to an individual Docker container.

List available server nodes::

    $ cld node list

Example output::

    Name               Ip_Address       Created_At              Size  Region
    -----------------  ---------------  --------------------  ------  ---------------
    bob                146.185.173.96   2016-05-19T14:02:42Z     512  Amsterdam 2
    gallaxhar          146.185.169.134  2016-08-10T13:26:47Z    1024  Amsterdam 2
    ginormica          95.85.18.21      2016-08-10T14:00:40Z    1024  Amsterdam 2
    gigantosaurus      82.196.8.80      2016-09-19T21:22:34Z     512  Amsterdam 2
    elastigirl         188.226.128.38   2016-11-23T12:22:08Z    2048  Amsterdam 2
    drcockroach        37.139.6.192     2017-05-17T10:34:54Z     512  Amsterdam 2


This requires a DigitalOcean API token, which should be stored in your password manager.
(Only the OS X Keychain currently supported).

To start a new node::

    $ cld node create --size 512mb <node-name>

To shut-down and remove a node::

    $ cld node destroy <node-name>

List running services (each service corresponds to a Docker container)::

    $ cld services

Example output::

    Name                Image                                            Status    Url                      ID            Node           Ports
    ------------------  -----------------------------------------------  --------  -----------------------  ------------  -------------  --------------
    docs                cnrsunic/neuromorphic_docs                       running   https://146.185.173.96   3308c939b689  bob            443:443
    db                  tutum/postgresql:latest                          running   https://146.185.169.134  7a22924ecebc  gallaxhar      5432:32768
    nmpi-blue           cnrsunic/nmpi_queue_server:blue                  running   https://95.85.18.21      ca51f676041d  ginormica      443:443
    benchmarkdb         tutum/postgresql:latest                          running   https://95.85.18.21      a5a1e3115ff3  ginormica      5432:32768
    benchmarks-service  cnrsunic/neuromorphic_benchmarks_service:latest  running   https://82.196.8.80      19eda6adccbe  gigantosaurus  443:443
    quotas-green        cnrsunic/nmpi_resource_manager:green             running   https://188.226.128.38   0bea557df8d0  elastigirl     443:443
    issuetracker-green  cnrsunic/hbp_issuetracker:green                  running   https://37.139.6.192     2618f3e50951  drcockroach    443:443
    issuetracker-db     tutum/postgresql:latest                          running   https://37.139.6.192     53f310185d2e  drcockroach    5432:32768


To launch a new service::

    $ cld launch --colour=<colour> <service-name> <node-name>

Possible values of ``<service-name>`` are "nmpi", "splash", "quotas", "db", etc.
Each service has a configuration file, e.g. :file:`nmpi.yml`, in the :file:`deployment` subdirectory.

.. note:: *Colours* For most services we run a "blue" service and a "green" service, each on
          a different server node.
          These are used to support having "production" and "staging" services, and
          easily moving the staging version into production.
          For example, if the "blue" service is in production and we wish to deploy a new version,
          we deploy the new version as "green" then test it. When we are happy with the new
          version, we just update the DNS records so that the production URL points to the green
          service. The colour is used both in the name of the service and as a tag for the
          Docker image. (See http://martinfowler.com/bliki/BlueGreenDeployment.html for more
          information on this approach.)

To redeploy a service with the latest version::

    $ cld build --colour=<colour> <service-name>
    $ cld redeploy --colour=<colour> <service-name>

To terminate a service::

    $ cld terminate --colour=<colour> <service-name>

To download the logs of a service::

    $ cld log --colour=<colour> --filename=<logfile> <service-name>


Deploying the database
======================

The platform uses a PostgreSQL database in a Docker container.

Launching the database service
------------------------------

::

    $ cld launch db <node-name>

This creates a PostgreSQL service with an empty database and a randomly generated password for
the "postgres" user. To retrieve the password run ``cld log db``.

.. note:: It is possible to run multiple instances of the database service,
          but they must each run on different server nodes.
          When choosing which node to run on, first ensure there is
          not already an instance of the database service running on it.


Restoring the database
----------------------

After (re-)deployment, the database is empty. To restore the database from an SQL dump::

    $ cld database restore db <filename>

and then enter the password for the "postgres" user when prompted.

The backup files are stored on the UNIC cluster in the directory `/home/share/hbp/backups`.


Deploying the job queue service
===============================

The recipe for building the Docker image for the job queue server is in the
file :file:`job_manager/Dockerfile`.

To build the image, run::

    $ cld build --colour=<colour> nmpi

This builds the image ``cnrsunic/nmpi_queue_server``, tags it with both the colour and the
latest Git commit id, and pushes the image to `Docker Hub`_.

.. note:: Pushing to Docker Hub requires that you have already logged in using ``docker login``
          using the username "cnrsunic".

To launch the service::

    $ cld launch --color=<colour> nmpi <node-name>

The service requires the following environment variables to be defined in your shell.
The deployment script reads these variables and sets them as environment variables for
the Docker container::

      NMPI_DATABASE_HOST
      NMPI_DATABASE_PORT

The service also requires a number of passwords and other secrets, contained in the file
 :file:`nmpi-secrets.yml`. For security, this file is not version controlled; it may be
 obtained from Andrew Davison.

To deploy a new version of the service::

    $ cld build --colour=<colour> nmpi
    $ cld redeploy --colour=<colour> nmpi


Deploying the quotas service
============================

The recipe for building the Docker image for the quotas service is in the
file :file:`resource_manager/Dockerfile`.

To build the image, run::

    $ cld build --colour=<colour> quotas

This builds the image ``cnrsunic/nmpi_resource_manager``, tags it with both the colour and the
latest Git commit id, and pushes the image to `Docker Hub`_.

To launch the service::

    $ cld launch --color=<colour> nmpi <node-name>

The service requires the following environment variables to be defined::

      NMPI_DATABASE_HOST
      NMPI_DATABASE_PORT

The service also requires a number of passwords and other secrets, contained in the file
 :file:`quotas-secrets.yml`. For security, this file is not version controlled; it may be
 obtained from Andrew Davison.


Taking database backups
=======================

To take a backup of the database, run::

    $ cld database dump db


Domain name registration
========================

The domain name "hbpneuromorphic.eu" was registered with GoDaddy.
The DNS is configured using the GoDaddy dashboard
(contact Andrew Davison for credentials).

The e-mail address "webmaster@hbpneuromorphic.eu" forwards to Andrew Davison. Up to 100
forwarded addresses can be created.


Certificates
============

The SSL certificates for hbpneuromorphic.eu are obtained from Let's Encrypt.
The private keys and the certificates are stored in the :file:`/etc/letsencrypt`
directory of the host servers, and made available to the Docker images via 
Docker shared volumes.
Certificates are valid for three months. At the moment, they must be manually renewed.
Automatic renewal (e.g. through a cron job) is planned.


Administration of the job queue server
======================================

It should not in general be necessary to access the `Django admin interface`_.
However, it is available if needed (for example to delete test jobs or to add/remove API keys).
Contact Andrew Davison for the administrator credentials.


.. _`Django admin interface`: https://nmpi.hbpneuromorphic.eu/admin/
.. _`Docker Hub`: https://hub.docker.com
