===================================
HBP Neuromorphic Computing Platform
===================================

This repository contains code related to the Human Brain Project Neuromorphic Computing Platform.

There are 6 main components:

    (1) Job queue service

        This is a Django project which provides a REST API implemented in the "simqueue" app.

    (2) Job manager app

        An AngularJS application which provides a Collaboratory app for the job queue service.

    (3) Quota service

        This is a Django project which provides a REST API implemented in the quotas app.

    (4) Resource manager app

        An AngularJS application which provides a Collaboratory app for the quota service.

    (5) Resource manager coordinator app

        An AngularJS application which provides a Collaboratory app for administration of the quota service.

    (6) Documentation for developers

        Documentation for developing and deploying the platform is in the "documentation" subdirectory
        as a Sphinx project.  End-user documentation is provided by the Neuromorphic Platform Guidebook,
        see git@gitviz.kip.uni-heidelberg.de:hbp-sp9-guidebook.git


All code is copyright 2015-2016 CNRS unless otherwise indicated.
