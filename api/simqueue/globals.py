STANDARD_QUEUES = ("BrainScaleS", "BrainScaleS-ESS", "Spikey", "SpiNNaker", "BrainScaleS-2")

RESOURCE_USAGE_UNITS = {
    "BrainScaleS": "wafer-hours",
    "BrainScaleS-2": "chip-hours",
    "SpiNNaker": "core-hours",
    "BrainScaleS-ESS": "hours",
    "Spikey": "hours",
    "TestPlatform": "bushels",  # for API testing
    "Test": "litres",  # for client testing,
    "Demo": "hours",
}

PROVIDER_QUEUE_NAMES = {
    "uhei": ["BrainScaleS", "BrainScaleS-2", "BrainScaleS-ESS", "Spikey"],
    "uman": ["SpiNNaker"],
    "nmpi": ["TestPlatform", "Test", "Demo"],
    "benchmark_runner": [],
    "uhei-jenkins-test-user": ["BrainScaleS", "BrainScaleS-ESS", "BrainScaleS-2", "Spikey"],
}
