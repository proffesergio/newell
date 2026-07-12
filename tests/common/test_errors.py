# tests/common/test_errors.py
from fastapi import FastAPI
from fastapi.testclient import TestClient

from newell_common.errors import NewellError, NotFoundError, install_error_handlers
from newell_common.health import health_payload


def test_envelope_shape():
    err = NewellError("bad_input", "nope", status_code=422, details={"field": "x"})
    assert err.to_envelope() == {
        "error": {"code": "bad_input", "message": "nope", "details": {"field": "x"}}
    }


def test_not_found_defaults():
    err = NotFoundError("missing")
    assert err.status_code == 404
    assert err.code == "not_found"


def test_handler_renders_envelope():
    app = FastAPI()
    install_error_handlers(app)

    @app.get("/boom")
    def boom():
        raise NotFoundError("plant missing", details={"id": 7})

    client = TestClient(app)
    resp = client.get("/boom")
    assert resp.status_code == 404
    assert resp.json() == {
        "error": {"code": "not_found", "message": "plant missing", "details": {"id": 7}}
    }


def test_health_payload():
    assert health_payload("gateway") == {"status": "ok", "service": "gateway"}
