"""In-process "tool" wrapper around plant diagnosis.

Kept as a thin, standalone function (rather than inlined in the route) so a
real MCP server can later replace this seam without touching the HTTP layer.
"""

from ai_gateway.provider import LLMProvider
from ai_gateway.schemas import Diagnosis


def analyze(image_ref: str, provider: LLMProvider) -> Diagnosis:
    return provider.diagnose_plant(image_ref)
