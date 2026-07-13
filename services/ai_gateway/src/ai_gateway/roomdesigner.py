"""In-process "tool" wrapper around interior room design.

Kept as a thin, standalone function (like plantdoctor.analyze) so a real MCP
server can later replace this seam without touching the HTTP layer.
"""

from ai_gateway.provider import LLMProvider
from ai_gateway.schemas import RoomDesign


def design(image_ref: str, provider: LLMProvider) -> RoomDesign:
    return provider.design_room(image_ref)
