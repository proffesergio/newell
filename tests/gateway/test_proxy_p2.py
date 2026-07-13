# tests/gateway/test_proxy_p2.py
"""P2 Task 6: role injection + media/plants proxying."""

import pytest
import pytest_asyncio
from fastapi import FastAPI, Header, Request
from httpx import ASGITransport, AsyncClient

from gateway.main import create_app
from newell_common.security import create_access_token


def _build_stub() -> tuple[FastAPI, dict]:
    """A stub upstream app that plays both the media and plantcare services.

    Records what it received so tests can assert on forwarded headers/bodies
    and on whether it was called at all.
    """
    stub = FastAPI()
    received: dict = {}

    @stub.get("/plants/mine")
    async def plants_mine(
        x_user_id: str | None = Header(default=None, alias="X-User-Id"),
        x_user_role: str | None = Header(default=None, alias="X-User-Role"),
    ) -> dict:
        received["plants_mine_called"] = True
        received["x_user_id"] = x_user_id
        received["x_user_role"] = x_user_role
        return {"plants": []}

    @stub.post("/plants")
    async def plants_create(
        request: Request,
        x_user_id: str | None = Header(default=None, alias="X-User-Id"),
        x_user_role: str | None = Header(default=None, alias="X-User-Role"),
    ) -> dict:
        received["plants_create_called"] = True
        received["x_user_id"] = x_user_id
        received["x_user_role"] = x_user_role
        return {"plant_id": "p1"}

    @stub.post("/media/upload")
    async def media_upload(
        request: Request,
        x_user_id: str | None = Header(default=None, alias="X-User-Id"),
        x_user_role: str | None = Header(default=None, alias="X-User-Role"),
    ) -> dict:
        body = await request.body()
        received["media_upload_called"] = True
        received["x_user_id"] = x_user_id
        received["x_user_role"] = x_user_role
        received["media_content_type"] = request.headers.get("content-type")
        received["media_body_len"] = len(body)
        return {"ok": True}

    return stub, received


@pytest_asyncio.fixture
async def gateway_app():
    stub, received = _build_stub()
    app = create_app()
    # Inject a client backed by the ASGI stub instead of a real socket.
    app.state.http_client = AsyncClient(transport=ASGITransport(app=stub), base_url="http://stub")
    try:
        yield app, received
    finally:
        await app.state.http_client.aclose()


@pytest.mark.asyncio
async def test_plants_mine_with_guest_token_injects_user_id_and_role(gateway_app):
    app, received = gateway_app
    token = create_access_token("g1", role="guest")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        resp = await c.get("/plants/mine", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
    assert received["plants_mine_called"] is True
    assert received["x_user_id"] == "g1"
    assert received["x_user_role"] == "guest"


@pytest.mark.asyncio
async def test_plants_mine_without_auth_is_401_and_not_forwarded(gateway_app):
    app, received = gateway_app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        resp = await c.get("/plants/mine")
        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "auth.unauthorized"
    assert "plants_mine_called" not in received


@pytest.mark.asyncio
async def test_bare_plants_create_is_routed(gateway_app):
    """Regression: POST /plants (no sub-path) must match the proxy route, not 404."""
    app, received = gateway_app
    token = create_access_token("user-xyz", role="user")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        resp = await c.post(
            "/plants",
            headers={"Authorization": f"Bearer {token}"},
            json={"image_ref": "plants/x.jpg"},
        )
        assert resp.status_code == 200
    assert received["plants_create_called"] is True
    assert received["x_user_id"] == "user-xyz"
    assert received["x_user_role"] == "user"


@pytest.mark.asyncio
async def test_media_upload_with_valid_token_forwards_multipart_and_identity(gateway_app):
    app, received = gateway_app
    token = create_access_token("user-abc", role="user")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        resp = await c.post(
            "/media/upload",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("leaf.txt", b"leaf-bytes", "text/plain")},
        )
        assert resp.status_code == 200
    assert received["media_upload_called"] is True
    assert received["x_user_id"] == "user-abc"
    assert received["x_user_role"] == "user"
    assert received["media_content_type"].startswith("multipart/form-data")
    assert received["media_body_len"] > 0
