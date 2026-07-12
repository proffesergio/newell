# tests/auth/test_otp_flow.py
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from auth.deps import get_session, get_sms_provider
from auth.main import create_app
from auth.sms import CapturingSmsProvider  # test double capturing sent messages
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
async def test_request_then_verify_returns_tokens(app):
    sms = CapturingSmsProvider()
    app.dependency_overrides[get_sms_provider] = lambda: sms
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r1 = await c.post("/auth/otp/request", json={"phone": "+8801700000000"})
        assert r1.status_code == 200
        code = sms.last_code()  # parses the 6-digit code from the captured message
        r2 = await c.post("/auth/otp/verify", json={"phone": "+8801700000000", "code": code})
        assert r2.status_code == 200
        body = r2.json()
        assert body["access_token"] and body["refresh_token"]
        assert body["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_wrong_code_is_400(app):
    app.dependency_overrides[get_sms_provider] = lambda: CapturingSmsProvider()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        await c.post("/auth/otp/request", json={"phone": "+8801700000001"})
        r = await c.post("/auth/otp/verify", json={"phone": "+8801700000001", "code": "000000"})
        assert r.status_code == 400
        assert r.json()["error"]["code"] == "otp.invalid"
