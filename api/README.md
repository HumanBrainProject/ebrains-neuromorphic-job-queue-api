Version 3 of the HBP/EBRAINS Neuromorphic Computing Job Queue API, incorporating the Quotas API.

For local development, set environment variables (see settings.py) then run:

  uvicorn simqueue.main:app --reload

To run tests:

  pytest --cov=simqueue --cov-report=term --cov-report=html

Certain tests require a valid EBRAINS IAM authorization token,
provided via an environment variable `EBRAINS_AUTH_TOKEN`.