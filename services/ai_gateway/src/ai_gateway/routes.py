from fastapi import APIRouter, Depends

from ai_gateway import plantdoctor, roomdesigner
from ai_gateway.deps import get_provider
from ai_gateway.provider import LLMProvider
from ai_gateway.schemas import AnalyzeRequest
from newell_common.errors import NewellError

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/analyze")
async def analyze(
    body: AnalyzeRequest,
    provider: LLMProvider = Depends(get_provider),
) -> dict:
    """Dispatch by task. Each tool returns its own structured result shape.

    Returns a plain dict (each task has a different schema) so a single
    endpoint can serve both plant diagnosis and interior design.
    """
    if body.task == "plant_diagnosis":
        return plantdoctor.analyze(body.image_ref, provider).model_dump()
    if body.task == "interior_design":
        return roomdesigner.design(body.image_ref, provider).model_dump()
    raise NewellError(
        "ai.unknown_task",
        f"Unknown task: {body.task}",
        status_code=400,
    )
