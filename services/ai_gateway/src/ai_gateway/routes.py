from fastapi import APIRouter, Depends

from ai_gateway import plantdoctor
from ai_gateway.deps import get_provider
from ai_gateway.provider import LLMProvider
from ai_gateway.schemas import AnalyzeRequest, Diagnosis
from newell_common.errors import NewellError

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/analyze", response_model=Diagnosis)
async def analyze(
    body: AnalyzeRequest,
    provider: LLMProvider = Depends(get_provider),
) -> Diagnosis:
    if body.task != "plant_diagnosis":
        raise NewellError(
            "ai.unknown_task",
            f"Unknown task: {body.task}",
            status_code=400,
        )
    return plantdoctor.analyze(body.image_ref, provider)
