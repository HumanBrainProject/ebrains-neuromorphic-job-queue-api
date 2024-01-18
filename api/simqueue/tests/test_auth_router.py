from fastapi.testclient import TestClient
from simqueue.main import app


client = TestClient(app)


def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    result = response.json()
    assert result["about"] == "This is the EBRAINS Neuromorphic Computing Job Queue API."
    assert result["authentication"]["collaboratory"].startswith("https://wiki")
    assert result["authentication"]["server"].startswith("https://iam")
    assert result["version"] == "3"
    assert result["links"] == {"documentation": "/docs"}
