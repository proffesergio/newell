import pytest
from httpx import ASGITransport, AsyncClient

from ai_gateway.main import create_app


@pytest.mark.asyncio
async def test_diagnose_is_deterministic_and_well_formed():
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        payload = {"image_ref": "plants/abc.jpg", "task": "plant_diagnosis"}
        r1 = await c.post("/ai/analyze", json=payload)
        r2 = await c.post("/ai/analyze", json=payload)
        assert r1.status_code == 200
        d = r1.json()
        assert set(d) == {"health", "growth_stage", "pests", "watering", "care_steps"}
        assert isinstance(d["pests"], list) and isinstance(d["care_steps"], list)
        assert r1.json() == r2.json()  # deterministic


@pytest.mark.asyncio
async def test_unknown_task_400():
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r = await c.post("/ai/analyze", json={"image_ref": "x", "task": "nope"})
        assert r.status_code == 400
        assert r.json()["error"]["code"] == "ai.unknown_task"
