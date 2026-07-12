# tests/gateway/test_health.py
from fastapi.testclient import TestClient

from gateway.main import create_app


def test_healthz_ok():
    client = TestClient(create_app())
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "service": "gateway"}


def test_healthz_sets_request_id_header():
    client = TestClient(create_app())
    resp = client.get("/healthz")
    assert resp.headers.get("X-Request-ID")


def test_healthz_echoes_incoming_request_id():
    client = TestClient(create_app())
    resp = client.get("/healthz", headers={"X-Request-ID": "fixed-123"})
    assert resp.headers["X-Request-ID"] == "fixed-123"
