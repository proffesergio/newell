# tests/auth/test_guest.py
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
async def test_guest_login_issues_guest_role(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r = await c.post("/auth/guest")
        assert r.status_code == 200
        body = r.json()
        assert body["role"] == "guest" and body["access_token"]


@pytest.mark.asyncio
async def test_guest_upgrades_in_place_on_signup(app):
    sms = CapturingSmsProvider()
    app.dependency_overrides[get_sms_provider] = lambda: sms
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        g = (await c.post("/auth/guest")).json()
        guest_id = g["user_id"]
        await c.post("/auth/otp/request", json={"phone": "+8801710000000"})
        v = await c.post(
            "/auth/otp/verify",
            json={
                "phone": "+8801710000000",
                "code": sms.last_code(),
                "guest_user_id": guest_id,
            },
        )
        assert v.status_code == 200
        assert v.json()["user_id"] == guest_id  # same row upgraded
        assert v.json()["role"] == "user"
