import pytest
from httpx import ASGITransport, AsyncClient

from ai_gateway.main import create_app


@pytest.mark.asyncio
async def test_interior_design_is_deterministic_and_well_formed():
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        payload = {"image_ref": "rooms/abc.jpg", "task": "interior_design"}
        r1 = await c.post("/ai/analyze", json=payload)
        r2 = await c.post("/ai/analyze", json=payload)
        assert r1.status_code == 200
        d = r1.json()
        assert set(d) == {"style", "palette", "layout_tips", "furniture"}
        assert isinstance(d["palette"], list) and isinstance(d["furniture"], list)
        assert d["style"]
        assert r1.json() == r2.json()  # deterministic


@pytest.mark.asyncio
async def test_plant_and_interior_differ():
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        plant = (
            await c.post("/ai/analyze", json={"image_ref": "x", "task": "plant_diagnosis"})
        ).json()
        room = (
            await c.post("/ai/analyze", json={"image_ref": "x", "task": "interior_design"})
        ).json()
        assert "health" in plant and "style" in room
