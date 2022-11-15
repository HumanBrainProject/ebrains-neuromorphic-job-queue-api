from fastapi import FastAPI
from fastapi.testclient import TestClient
from simqueue.main import app


client = TestClient(app)


def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "about": "This is the EBRAINS Neuromorphic Computing Job Queue API.",
        "version": "3",
        "links": {"documentation": "/docs"},
    }
