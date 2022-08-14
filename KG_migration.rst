=========================================================
Plans for migrating simqueue Django app to KnowledgeGraph
=========================================================

Base schemas in Neuroshapes
---------------------------

- neurosciencegraph/simulation/simulation/v0.2.0/shapes/SimulationShape
    - inherits from neurosciencegraph/commons/activity/v0.1.4/shapes/ActivityShape
        -  inherits from nexus/provsh/activity/v1.0.0/shapes/ActivityShape
            - wasAssociatedWith: Agent
            - generated: Entity
            - used: Entity
            - wasStartedBy: Agent or Entity
            - startedAtTime: xsd:dateTime
            - endedAtTime: xsd:dateTime
            - qualifiedAssociation: AssociationShape
            - qualifiedUsage: UsageShape
        - used: HadProtocolValueShape [1]
    - used: ModelInstance [1] (neurosciencegraph/simulation/modelinstance/v0.1.2/shapes/ModelInstanceShape)
    - used: Configuration [1] (neurosciencegraph/commons/entity/v1.0.0/shapes/EntityShape)
    - status: SimulationStatus [n] (neurosciencegraph/commons/typedlabeledontologyterm/v0.1.4/shapes/ModelSimulationStatusOntologyTermShape)
    - generated: VariableReport [n] (neurosciencegraph/simulation/variablereport/v0.1.1/shapes/VariableReportShape)


- neurosciencegraph/simulation/modelinstance/v0.1.2/shapes/ModelInstanceShape
    - inherits from neurosciencegraph/commons/modelinstance/v0.1.3/shapes/ModelInstanceShape
        - inherits from neurosciencegraph/commons/entity/v1.0.0/shapes/EntityShape
            - name
            - description
            - license
            - dateCreated
            - wasRevisionOf
            - wasDerivedFrom
            - wasAttributedTo
            - image (preview)
            - distribution
        - modelOf
        - brainRegion
        - species


- neurosciencegraph/simulation/variablereport/v0.1.1/shapes/VariableReportShape
    - inherits from neurosciencegraph/commons/entity/v1.0.0/shapes/EntityShape
        - (see above)
    - variable ("voltage", etc)
    - target (e.g. "soma")


Plan
----

- generalize Simulation, since VariableReport is too specific (or generalize VariableReport to allow multiple variables, multiple targets in a single file)
- create ComputingSystemShape, inheriting from EntityShape
- create NeuromorphicComputingSystemShape, inheriting from ComputingSystemShape
    - todo: figure out how to fit in provenance information from BrainScaleS and SpiNNaker
    - maybe have BrainScaleSComputingSystemShape and SpiNNakerComputingSystemShape
    - wafer/HICANN identities, etc.
    - software stack, version numbers... (split into HardwareShape and ComputingEnvironmentShape?)
- create NeuromorphicSimulationShape, inheriting from SimulationShape
    - add "used: NeuromorphicComputingSystem"

- map ModelProject to Collabs

- Job.code --> ModelInstance (PyNNModelInstance?)
- Job.command --> ? Simulation.wasStartedBy CommandLineInvocation(Entity)?
- Job.collab_id --> ? via ModelProject, or just a free field?
- Job.user_id --> Simulation.wasStartedBy or Simulation.wasAssociatedWith
- Job.status --> Simulation.status
- Job.input_data --> ? add another "used" field, or make use of HadProtocol?
- Job.output_data --> [Simulation.log (to add), minds.FileBundle?, VariableReport?]
- Job.hardware_platform --> via NeuromorphicComputingSystemShape
- Job.hardware_config --> Simulation.configuration? Maybe not, as that field is intended for the simulation configuration (t_stop, etc.)
- Job.timestamp_submission --> Simulation.startedAtTime
- Job.timestamp_completion --> Simulation.endedAtTime
- Job.provenance --> via NeuromorphicComputingSystemShape
- Job.resource_usage --> free field
- Job.tags --> free field for now, maybe we can do something more universal later

- Comments --> ?

UPDATE: robotics team/Genric have now added simulation/pointneuronmodel/v0.1.0.json - see https://github.com/INCF/neuroshapes/pull/286