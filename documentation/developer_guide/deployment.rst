======================
Deploying the platform
======================

The job queue server and its web interface are deployed in the cloud using Docker containers.
Building Docker images and deploying the containers is handled by the :file:`deploy.py` script.


.. note:: All actions of :file:`deploy.py` are logged to :file:`deploy.log` so you can always
          review the actions that have been performed.

Managing nodes and services
===========================

We use the name "node" to refer to an individual virtual server running in the Digital Ocean
cloud. We use the name "service" to refer to an individual Docker container.

List available server nodes::

    $ ./deploy.py node list

Example output::

    Name                                                    Ip_Address       Created_At              Size  Region
    ------------------------------------------------------  ---------------  --------------------  ------  -----------
    eb644c9c-8a7d-4d3e-8c55-9ab34998a90c.node.dockerapp.io  37.139.23.137    2016-02-28T09:42:36Z    1024  Amsterdam 2
    docker-512mb-ams2-02                                    146.185.156.125  2016-04-22T15:00:47Z     512  Amsterdam 2
    ginormica                                               146.185.160.61   2016-05-12T16:17:37Z    1024  Amsterdam 2
    drcockroach                                             146.185.172.147  2016-05-18T20:18:57Z    1024  Amsterdam 2
    bob                                                     146.185.173.96   2016-05-19T14:02:42Z     512  Amsterdam 2

This requires a DigitalOcean API token, which should be stored in your password manager.
(Only the OS X Keychain currently supported).

To start a new node::

    $ ./deploy.py node create --size 512mb <node-name>

To shut-down and remove a node::

    $ ./deploy.py node destroy <node-name>

List running services (each service corresponds to a Docker container)::

    $ ./deploy.py services

Example output::

    Name         Image                                Status    Url                      ID            Node                  Ports
    -----------  -----------------------------------  --------  -----------------------  ------------  --------------------  ----------
    quotas-blue  cnrsunic/nmpi_resource_manager:blue  running   https://146.185.156.125  7eea7086323d  docker-512mb-ams2-02  443:443
    nmpi-blue    cnrsunic/nmpi_queue_server:blue      running   https://146.185.160.61   4a0218e7859d  ginormica             443:443
    db           tutum/postgresql:latest              running   https://146.185.160.61   484fafdb2335  ginormica             5432:32770
    nmpi-green   cnrsunic/nmpi_queue_server:green     running   https://146.185.172.147  32f594fd3380  drcockroach           443:443
    docs         cnrsunic/neuromorphic_docs:latest    running   https://146.185.173.96   0f112888b8a5  bob                   443:443

To launch a new service::

    $ ./deploy.py launch --colour=<colour> <service-name> <node-name>

Possible values of ``<service-name>`` are "nmpi", "splash", "quotas", "db". Each service has a configuration file, e.g. :file:`nmpi.yml`, in the same directory as :file:`deploy.py`.

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

    $ ./deploy.py build --colour=<colour> <service-name>
    $ ./deploy.py redeploy --colour=<colour> <service-name>

To terminate a service::

    $ ./deploy.py terminate --colour=<colour> <service-name>

To download the logs of a service::

    $ ./deploy.py log --colour=<colour> --filename=<logfile> <service-name>


Deploying the database
======================

The platform uses a PostgreSQL database in a Docker container.

Launching the database service
------------------------------

::

    $ ./deploy.py launch db <node-name>

This creates a PostgreSQL service with an empty database and a randomly generated password for
the "postgres" user. To retrieve the password run ``./deploy.py log db``.

.. note:: It is possible to run multiple instances of the database service,
          but they must each run on different server nodes.
          When choosing which node to run on, first ensure there is
          not already an instance of the database service running on it.


Restoring the database
----------------------

After (re-)deployment, the database is empty. To restore the database from an SQL dump::

    $ ./deploy.py database restore db <filename>

and then enter the password for the "postgres" user when prompted.

The backup files are stored on the UNIC cluster in the directory `/home/share/hbp/backups`.


Deploying the job queue service
===============================

The recipe for building the Docker image for the job queue server is in the
file :file:`job_manager/Dockerfile`.

To build the image, run::

    $ ./deploy.py build --colour=<colour> nmpi

This builds the image ``cnrsunic/nmpi_queue_server``, tags it with both the colour and the
latest Git commit id, and pushes the image to `Docker Hub`_.

.. note:: Pushing to Docker Hub requires that you have already logged in using ``docker login``
          using the username "cnrsunic".

To launch the service::

    $ ./deploy.py launch --color=<colour> nmpi <node-name>

The service requires the following environment variables to be defined in your shell.
The deployment script reads these variables and sets them as environment variables for
the Docker container::

      NMPI_DATABASE_HOST
      NMPI_DATABASE_PORT

The service also requires a number of passwords and other secrets, contained in the file
 :file:`nmpi-secrets.yml`. For security, this file is not version controlled; it may be
 obtained from Andrew Davison.

To deploy a new version of the service::

    $ ./deploy.py build --colour=<colour> nmpi
    $ ./deploy.py redeploy --colour=<colour> nmpi


Deploying the quotas service
============================

The recipe for building the Docker image for the quotas service is in the
file :file:`resource_manager/Dockerfile`.

To build the image, run::

    $ ./deploy.py build --colour=<colour> quotas

This builds the image ``cnrsunic/nmpi_resource_manager``, tags it with both the colour and the
latest Git commit id, and pushes the image to `Docker Hub`_.

To launch the service::

    $ ./deploy.py launch --color=<colour> nmpi <node-name>

The service requires the following environment variables to be defined::

      NMPI_DATABASE_HOST
      NMPI_DATABASE_PORT

The service also requires a number of passwords and other secrets, contained in the file
 :file:`quotas-secrets.yml`. For security, this file is not version controlled; it may be
 obtained from Andrew Davison.


Taking database backups
=======================

To take a backup of the database, run::

    $ ./deploy.py database dump db


Domain name registration
========================

The domain name "hbpneuromorphic.eu" was registered with GoDaddy (expiration 09/06/2016).
The DNS is configured using the GoDaddy dashboard
(contact Andrew Davison for credentials).

The e-mail address "webmaster@hbpneuromorphic.eu" forwards to Andrew Davison. Up to 100
forwarded addresses can be created.


Certificates
============

The SSL certificates for hbpneuromorphic.eu are obtained from Let's Encrypt.
The private keys and the unified certificates are stored in the :file:`job_manager/deployment/ssl`
and :file:`resource_manager/deployment/ssl` directories and installed into the Docker images.
Certificates are valid for three months. At the moment, they must be manually renewed.
Automatic renewal (e.g. through a cron job) is planned.


Administration of the job queue server
======================================

It should not in general be necessary to access the `Django admin interface`_.
However, it is available if needed (for example to delete test jobs or to add/remove API keys).
Contact Andrew Davison for the administrator credentials.


.. _`Django admin interface`: https://nmpi.hbpneuromorphic.eu/admin/
.. _`Docker Hub`: https://hub.docker.com
