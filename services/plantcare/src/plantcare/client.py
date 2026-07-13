from typing import Protocol

import httpx

from newell_common.config import get_settings


class AiClientProtocol(Protocol):
    """Structural type for anything that can diagnose a plant image.

    Lets `plantcare.deps.get_ai_client` be overridden in tests with a stub
    that returns a fixed diagnosis, with no real HTTP involved.
    """

    async def analyze(self, image_ref: str) -> dict: ...


class AiGatewayClient:
    """HTTP client for the AI Gateway's `POST /ai/analyze` endpoint."""

    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = base_url or get_settings().ai_gateway_url

    async def analyze(self, image_ref: str) -> dict:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=30.0) as client:
            response = await client.post(
                "/ai/analyze",
                json={"image_ref": image_ref, "task": "plant_diagnosis"},
            )
            response.raise_for_status()
            return response.json()
