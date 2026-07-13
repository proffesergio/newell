# tests/interior/test_rooms.py
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from interior.deps import get_ai_client, get_session
from interior.main import create_app
from newell_common.db import Base, make_engine, make_session_factory

FIXED = {
    "style": "Scandinavian minimalist",
    "palette": ["#F5F3EC", "#3A5A40", "#D98E5A", "#12241B"],
    "layout_tips": ["a", "b", "c"],
    "furniture": ["x", "y", "z"],
}


class StubAiClient:
    """Test double for AiGatewayClient: no real HTTP, fixed design."""

    async def design(self, image_ref: str) -> dict:
        return FIXED


async def _build_app():
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
async def test_user_can_create_room_and_get_timeline(app_user):
    async with AsyncClient(transport=ASGITransport(app=app_user), base_url="http://t") as c:
        h = {"X-User-Id": "user-1", "X-User-Role": "user"}
        r = await c.post(
            "/rooms", json={"name": "Living room", "image_ref": "rooms/x.jpg"}, headers=h
        )
        assert r.status_code == 200 and r.json()["design"]["style"] == "Scandinavian minimalist"
        rid = r.json()["room_id"]
        t = await c.get(f"/rooms/{rid}", headers=h)
        assert len(t.json()["logs"]) == 1


@pytest.mark.asyncio
async def test_guest_second_room_blocked(app_guest):
    async with AsyncClient(transport=ASGITransport(app=app_guest), base_url="http://t") as c:
        h = {"X-User-Id": "guest-1", "X-User-Role": "guest"}
        await c.post("/rooms", json={"image_ref": "rooms/1.jpg"}, headers=h)
        r2 = await c.post("/rooms", json={"image_ref": "rooms/2.jpg"}, headers=h)
        assert r2.status_code == 403 and r2.json()["error"]["code"] == "signup_required"


@pytest.mark.asyncio
async def test_guest_list_blocked(app_guest):
    async with AsyncClient(transport=ASGITransport(app=app_guest), base_url="http://t") as c:
        r = await c.get("/rooms", headers={"X-User-Id": "guest-1", "X-User-Role": "guest"})
        assert r.status_code == 403 and r.json()["error"]["code"] == "signup_required"


@pytest.mark.asyncio
async def test_missing_user_id_header_is_401(app_user):
    async with AsyncClient(transport=ASGITransport(app=app_user), base_url="http://t") as c:
        r = await c.post("/rooms", json={"image_ref": "rooms/x.jpg"})
        assert r.status_code == 401 and r.json()["error"]["code"] == "auth.unauthorized"


@pytest.mark.asyncio
async def test_user_can_redesign_and_list(app_user):
    async with AsyncClient(transport=ASGITransport(app=app_user), base_url="http://t") as c:
        h = {"X-User-Id": "user-1", "X-User-Role": "user"}
        rid = (await c.post("/rooms", json={"image_ref": "rooms/x.jpg"}, headers=h)).json()[
            "room_id"
        ]
        r2 = await c.post(f"/rooms/{rid}/design", json={"image_ref": "rooms/y.jpg"}, headers=h)
        assert r2.status_code == 200 and r2.json()["design"]["style"]
        t = await c.get(f"/rooms/{rid}", headers=h)
        assert len(t.json()["logs"]) == 2
        lst = await c.get("/rooms", headers=h)
        assert len(lst.json()["rooms"]) == 1
