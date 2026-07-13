import uuid

from fastapi import APIRouter, Depends, Header

from newell_common.errors import NewellError
from newell_common.i18n import translate
from plantcare.deps import get_plantcare_service
from plantcare.schemas import (
    AnalyzeIn,
    PlantCreateIn,
    PlantCreateOut,
    PlantDetailOut,
    PlantListOut,
    PlantLogOut,
    PlantSummaryOut,
)
from plantcare.service import PlantCareService

router = APIRouter(prefix="/plants", tags=["plantcare"])


def _require_user_id(x_user_id: str | None) -> str:
    if not x_user_id:
        raise _unauthorized_error()
    return x_user_id


def _unauthorized_error() -> NewellError:
    return NewellError("auth.unauthorized", translate("auth.unauthorized"), status_code=401)


@router.post("", response_model=PlantCreateOut)
async def create_plant(
    body: PlantCreateIn,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    x_user_role: str = Header(default="user", alias="X-User-Role"),
    service: PlantCareService = Depends(get_plantcare_service),
) -> PlantCreateOut:
    user_id = _require_user_id(x_user_id)
    plant, log = await service.create_plant(user_id, x_user_role, body.name, body.image_ref)
    return PlantCreateOut(
        plant_id=str(plant.id),
        name=plant.name,
        diagnosis=log.diagnosis,
        created_at=plant.created_at,
    )


@router.get("", response_model=PlantListOut)
async def list_plants(
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    x_user_role: str = Header(default="user", alias="X-User-Role"),
    service: PlantCareService = Depends(get_plantcare_service),
) -> PlantListOut:
    user_id = _require_user_id(x_user_id)
    rows = await service.list_plants(user_id, x_user_role)
    plants = [
        PlantSummaryOut(
            plant_id=str(plant.id),
            name=plant.name,
            created_at=plant.created_at,
            latest_diagnosis=latest.diagnosis if latest else None,
        )
        for plant, latest in rows
    ]
    return PlantListOut(plants=plants)


@router.get("/{plant_id}", response_model=PlantDetailOut)
async def get_plant(
    plant_id: uuid.UUID,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    service: PlantCareService = Depends(get_plantcare_service),
) -> PlantDetailOut:
    user_id = _require_user_id(x_user_id)
    plant, logs = await service.get_plant(user_id, plant_id)
    return PlantDetailOut(
        plant_id=str(plant.id),
        name=plant.name,
        created_at=plant.created_at,
        logs=[
            PlantLogOut(image_ref=log.image_ref, diagnosis=log.diagnosis, created_at=log.created_at)
            for log in logs
        ],
    )


@router.post("/{plant_id}/analyze", response_model=PlantLogOut)
async def analyze_plant(
    plant_id: uuid.UUID,
    body: AnalyzeIn,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    x_user_role: str = Header(default="user", alias="X-User-Role"),
    service: PlantCareService = Depends(get_plantcare_service),
) -> PlantLogOut:
    user_id = _require_user_id(x_user_id)
    log = await service.analyze(user_id, x_user_role, plant_id, body.image_ref)
    return PlantLogOut(image_ref=log.image_ref, diagnosis=log.diagnosis, created_at=log.created_at)
