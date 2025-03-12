# EBRAINS Neuromorphic Computing Job Queue and Quota API

The EBRAINS neuromorphic computing remote access service allows users to run simulations/emulations
on the [SpiNNaker](https://www.ebrains.eu/tools/spinnaker)
and [BrainScaleS](https://www.ebrains.eu/tools/brainscales) systems
by submitting a [PyNN](http://neuralensemble.org/docs/PyNN/) script
and associated job configuration information to a central queue.

The service consists of:
- a [web API](https://nmpi-v3.hbpneuromorphic.eu/docs) (this repository)
- a GUI client (the [Job Manager app](https://job-manager.hbpneuromorphic.eu/); https://github.com/HumanBrainProject/nmpi-job-manager-app)
- a [Python/command-line client](https://github.com/HumanBrainProject/hbp-neuromorphic-client).

Users can submit scripts stored locally on their own machine, in a public Git repository,
in the [EBRAINS Knowledge Graph](https://search.kg.ebrains.eu/?category=Model),
or in [EBRAINS Collaboratory](https://wiki.ebrains.eu/) storage (Drive/Bucket).
Users can track the progress of their job, and view and/or download the results,
log files, and provenance information.

For more information, visit the [EBRAINS website](https://www.ebrains.eu/modelling-simulation-and-computing/simulation/neuromorphic-computing-3).


All code is copyright 2015-2023 CNRS unless otherwise indicated.

This repository previously contained code for all components of the service.
Each of these is now developed in a separate repository.

<div><img src="https://www.braincouncil.eu/wp-content/uploads/2018/11/wsi-imageoptim-EU-Logo.jpg" alt="EU Logo" height="23%" width="15%" align="right" style="margin-left: 10px"></div>

This open source software code was developed in part or in whole in the Human Brain Project,
funded from the European Union's Horizon 2020 Framework Programme for Research and Innovation
under Specific Grant Agreements No. 720270, No. 785907 and No. 945539 (Human Brain Project SGA1, SGA2 and SGA3).