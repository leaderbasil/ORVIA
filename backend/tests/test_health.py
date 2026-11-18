from fastapi.testclient import TestClient

from app.main import app


def test_health_check_returns_ok() -> None:
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["app"]


def test_unknown_route_uses_error_envelope() -> None:
    with TestClient(app) as client:
        response = client.get("/does-not-exist")

    assert response.status_code == 404
    body = response.json()
    assert set(body) >= {"detail", "code"}
    assert body["code"] == "NOT_FOUND"
