import io

import pytest
from httpx import ASGITransport, AsyncClient

from media.deps import get_storage
from media.main import create_app
from media.storage import InMemoryStorage


@pytest.mark.asyncio
async def test_upload_returns_media_id_and_url():
    app = create_app()
    store = InMemoryStorage()
    app.dependency_overrides[get_storage] = lambda: store
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        files = {"file": ("leaf.jpg", io.BytesIO(b"\xff\xd8\xff and bytes"), "image/jpeg")}
        r = await c.post("/media/upload", files=files)
        assert r.status_code == 200
        body = r.json()
        assert body["media_id"] and body["url"]
        assert len(store.items) == 1


@pytest.mark.asyncio
async def test_upload_rejects_non_image():
    app = create_app()
    app.dependency_overrides[get_storage] = lambda: InMemoryStorage()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        files = {"file": ("x.txt", io.BytesIO(b"hi"), "text/plain")}
        r = await c.post("/media/upload", files=files)
        assert r.status_code == 400
        assert r.json()["error"]["code"] == "media.invalid_type"
