from functools import lru_cache

from ai_gateway.provider import LLMProvider, MockProvider
from newell_common.config import get_settings
from newell_common.errors import NewellError


@lru_cache
def get_provider() -> LLMProvider:
    settings = get_settings()
    if settings.ai_provider == "mock":
        return MockProvider()
    raise NewellError(
        "ai.unknown_provider",
        f"Unknown AI provider: {settings.ai_provider}",
        status_code=500,
    )
