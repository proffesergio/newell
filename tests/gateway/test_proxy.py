# tests/gateway/test_proxy.py
import pytest
import pytest_asyncio
from fastapi import FastAPI, Header, Request
from httpx import ASGITransport, AsyncClient

from gateway.main import create_app
from newell_common.security import create_access_token


def _build_stub() -> tuple[FastAPI, dict]:
    """A single stub upstream app that plays both auth and profile services.

    Records what it received so tests can assert on forwarded headers/bodies
    and on whether it was called at all.
    """
    stub = FastAPI()
    received: dict = {}

    @stub.get("/profile/me")
    async def profile_me(
        x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    ) -> dict:
        received["profile_me_called"] = True
        received["x_user_id"] = x_user_id
        return {"user_id": x_user_id}

    @stub.post("/auth/otp/request")
    async def otp_request(request: Request) -> dict:
        received["auth_otp_called"] = True
        received["auth_body"] = await request.json()
        return {"message": "sent"}

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
async def test_profile_me_without_auth_is_401_and_not_forwarded(gateway_app):
    app, received = gateway_app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        resp = await c.get("/profile/me")
        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "auth.unauthorized"
    assert "profile_me_called" not in received


@pytest.mark.asyncio
async def test_profile_me_with_valid_token_injects_x_user_id(gateway_app):
    app, received = gateway_app
    token = create_access_token("user-xyz")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        resp = await c.get("/profile/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
    assert received["profile_me_called"] is True
    assert received["x_user_id"] == "user-xyz"


@pytest.mark.asyncio
async def test_auth_otp_request_is_public_and_forwarded(gateway_app):
    app, received = gateway_app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        resp = await c.post("/auth/otp/request", json={"phone": "+8801000000000"})
        assert resp.status_code == 200
    assert received.get("auth_otp_called") is True
    assert received["auth_body"] == {"phone": "+8801000000000"}
