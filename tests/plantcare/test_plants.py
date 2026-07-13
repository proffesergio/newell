# tests/plantcare/test_plants.py
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from newell_common.db import Base, make_engine, make_session_factory
from plantcare.deps import get_ai_client, get_session
from plantcare.main import create_app

FIXED = {
    "health": "Healthy",
    "growth_stage": "Seedling",
    "pests": [],
    "watering": "Water twice a week.",
    "care_steps": ["a", "b", "c"],
}


class StubAiClient:
    """Test double for AiGatewayClient: no real HTTP, fixed diagnosis."""

    async def analyze(self, image_ref: str) -> dict:
        return FIXED


async def _build_app():
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
    application.dependency_overrides[get_ai_client] = lambda: StubAiClient()
    return application, engine


@pytest_asyncio.fixture
async def app_user():
    application, engine = await _build_app()
    try:
        yield application
    finally:
        await engine.dispose()


@pytest_asyncio.fixture
async def app_guest():
    application, engine = await _build_app()
    try:
        yield application
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_user_can_create_plant_and_get_timeline(app_user):
    async with AsyncClient(transport=ASGITransport(app=app_user), base_url="http://t") as c:
        h = {"X-User-Id": "user-1", "X-User-Role": "user"}
        r = await c.post("/plants", json={"name": "Basil", "image_ref": "plants/x.jpg"}, headers=h)
        assert r.status_code == 200 and r.json()["diagnosis"]["health"] == "Healthy"
        pid = r.json()["plant_id"]
        t = await c.get(f"/plants/{pid}", headers=h)
        assert len(t.json()["logs"]) == 1


@pytest.mark.asyncio
async def test_guest_second_plant_blocked(app_guest):
    async with AsyncClient(transport=ASGITransport(app=app_guest), base_url="http://t") as c:
        h = {"X-User-Id": "guest-1", "X-User-Role": "guest"}
        await c.post("/plants", json={"image_ref": "plants/1.jpg"}, headers=h)
        r2 = await c.post("/plants", json={"image_ref": "plants/2.jpg"}, headers=h)
        assert r2.status_code == 403 and r2.json()["error"]["code"] == "signup_required"


@pytest.mark.asyncio
async def test_guest_list_blocked(app_guest):
    async with AsyncClient(transport=ASGITransport(app=app_guest), base_url="http://t") as c:
        r = await c.get("/plants", headers={"X-User-Id": "guest-1", "X-User-Role": "guest"})
        assert r.status_code == 403 and r.json()["error"]["code"] == "signup_required"


@pytest.mark.asyncio
async def test_missing_user_id_header_is_401(app_user):
    async with AsyncClient(transport=ASGITransport(app=app_user), base_url="http://t") as c:
        r = await c.post("/plants", json={"image_ref": "plants/x.jpg"})
        assert r.status_code == 401
        assert r.json()["error"]["code"] == "auth.unauthorized"


@pytest.mark.asyncio
async def test_get_unowned_plant_is_404(app_user):
    async with AsyncClient(transport=ASGITransport(app=app_user), base_url="http://t") as c:
        h1 = {"X-User-Id": "user-1", "X-User-Role": "user"}
        h2 = {"X-User-Id": "user-2", "X-User-Role": "user"}
        r = await c.post("/plants", json={"image_ref": "plants/1.jpg"}, headers=h1)
        pid = r.json()["plant_id"]
        r2 = await c.get(f"/plants/{pid}", headers=h2)
        assert r2.status_code == 404
        assert r2.json()["error"]["code"] == "not_found"


@pytest.mark.asyncio
async def test_user_can_analyze_existing_plant_and_list_plants(app_user):
    async with AsyncClient(transport=ASGITransport(app=app_user), base_url="http://t") as c:
        h = {"X-User-Id": "user-1", "X-User-Role": "user"}
        r = await c.post("/plants", json={"name": "Basil", "image_ref": "plants/x.jpg"}, headers=h)
        pid = r.json()["plant_id"]

        r2 = await c.post(f"/plants/{pid}/analyze", json={"image_ref": "plants/y.jpg"}, headers=h)
        assert r2.status_code == 200
        assert r2.json()["diagnosis"]["health"] == "Healthy"

        t = await c.get(f"/plants/{pid}", headers=h)
        assert len(t.json()["logs"]) == 2

        lst = await c.get("/plants", headers=h)
        assert lst.status_code == 200
        assert len(lst.json()["plants"]) == 1
        assert lst.json()["plants"][0]["plant_id"] == pid


@pytest.mark.asyncio
async def test_guest_analyze_blocked(app_guest):
    async with AsyncClient(transport=ASGITransport(app=app_guest), base_url="http://t") as c:
        h = {"X-User-Id": "guest-1", "X-User-Role": "guest"}
        r = await c.post("/plants", json={"image_ref": "plants/1.jpg"}, headers=h)
        pid = r.json()["plant_id"]
        r2 = await c.post(f"/plants/{pid}/analyze", json={"image_ref": "plants/2.jpg"}, headers=h)
        assert r2.status_code == 403
        assert r2.json()["error"]["code"] == "signup_required"
