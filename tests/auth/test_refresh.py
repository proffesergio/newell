# tests/auth/test_refresh.py
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from auth.deps import get_session, get_sms_provider
from auth.main import create_app
from auth.sms import CapturingSmsProvider
from newell_common.db import Base, make_engine, make_session_factory


@pytest_asyncio.fixture
async def app():
    # Hermetic: in-memory SQLite instead of the compose Postgres, so this
    # test needs no external services. Schema is created once at setup.
    engine = make_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = make_session_factory(engine)

    async def _get_session():
        async with factory() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_session] = _get_session
    try:
        yield application
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_refresh_rotates_and_old_token_revoked(app):
    sms = CapturingSmsProvider()
    app.dependency_overrides[get_sms_provider] = lambda: sms
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        await c.post("/auth/otp/request", json={"phone": "+8801700000002"})
        v = await c.post(
            "/auth/otp/verify",
            json={"phone": "+8801700000002", "code": sms.last_code()},
        )
        old_refresh = v.json()["refresh_token"]

        r = await c.post("/auth/refresh", json={"refresh_token": old_refresh})
        assert r.status_code == 200
        body = r.json()
        new_refresh = body["refresh_token"]
        assert body["token_type"] == "bearer"
        assert body["access_token"]
        assert new_refresh != old_refresh

        # Reusing the now-revoked old token is rejected.
        reuse = await c.post("/auth/refresh", json={"refresh_token": old_refresh})
        assert reuse.status_code == 401
        assert reuse.json()["error"]["code"] == "auth.unauthorized"

        # The newly rotated token still works.
        again = await c.post("/auth/refresh", json={"refresh_token": new_refresh})
        assert again.status_code == 200


@pytest.mark.asyncio
async def test_refresh_unknown_token_is_401(app):
    app.dependency_overrides[get_sms_provider] = lambda: CapturingSmsProvider()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r = await c.post("/auth/refresh", json={"refresh_token": "not-a-real-token"})
        assert r.status_code == 401
        assert r.json()["error"]["code"] == "auth.unauthorized"


@pytest.mark.asyncio
async def test_logout_revokes_token_then_refresh_fails(app):
    sms = CapturingSmsProvider()
    app.dependency_overrides[get_sms_provider] = lambda: sms
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        await c.post("/auth/otp/request", json={"phone": "+8801700000003"})
        v = await c.post(
            "/auth/otp/verify",
            json={"phone": "+8801700000003", "code": sms.last_code()},
        )
        refresh_token = v.json()["refresh_token"]

        r = await c.post("/auth/logout", json={"refresh_token": refresh_token})
        assert r.status_code == 204

        # Logged-out token can no longer be used to refresh.
        reuse = await c.post("/auth/refresh", json={"refresh_token": refresh_token})
        assert reuse.status_code == 401

        # Logout is idempotent: logging out an unknown/already-revoked token
        # still returns 204.
        again = await c.post("/auth/logout", json={"refresh_token": refresh_token})
        assert again.status_code == 204
        unknown = await c.post("/auth/logout", json={"refresh_token": "bogus"})
        assert unknown.status_code == 204
