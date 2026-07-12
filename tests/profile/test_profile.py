# tests/profile/test_profile.py
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from newell_common.db import Base, make_engine, make_session_factory
from profiles.deps import get_session
from profiles.main import create_app


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
async def test_get_auto_creates_default_profile(app):
    user_id = str(uuid.uuid4())
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.get("/profile/me", headers={"X-User-Id": user_id})
        assert r.status_code == 200
        body = r.json()
        assert body["user_id"] == user_id
        assert body["display_name"] is None
        assert body["locale"] == "en"


@pytest.mark.asyncio
async def test_patch_updates_display_name_and_locale(app):
    user_id = str(uuid.uuid4())
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        await c.get("/profile/me", headers={"X-User-Id": user_id})
        r = await c.patch(
            "/profile/me",
            headers={"X-User-Id": user_id},
            json={"display_name": "Billal", "locale": "bn"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["display_name"] == "Billal"
        assert body["locale"] == "bn"

        # Persisted: a fresh GET reflects the update.
        r2 = await c.get("/profile/me", headers={"X-User-Id": user_id})
        assert r2.status_code == 200
        body2 = r2.json()
        assert body2["display_name"] == "Billal"
        assert body2["locale"] == "bn"


@pytest.mark.asyncio
async def test_patch_invalid_locale_is_400(app):
    user_id = str(uuid.uuid4())
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.patch(
            "/profile/me",
            headers={"X-User-Id": user_id},
            json={"locale": "xx"},
        )
        assert r.status_code == 400
        assert r.json()["error"]["code"] == "profile.invalid_locale"


@pytest.mark.asyncio
async def test_get_without_user_id_header_is_401(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.get("/profile/me")
        assert r.status_code == 401
        assert r.json()["error"]["code"] == "auth.unauthorized"
