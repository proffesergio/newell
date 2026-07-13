import uuid

from fastapi import APIRouter, Depends, Header

from interior.deps import get_interior_service
from interior.schemas import (
    DesignIn,
    RoomCreateIn,
    RoomCreateOut,
    RoomDetailOut,
    RoomListOut,
    RoomLogOut,
    RoomSummaryOut,
)
from interior.service import InteriorService
from newell_common.errors import NewellError
from newell_common.i18n import translate

router = APIRouter(prefix="/rooms", tags=["interior"])


def _require_user_id(x_user_id: str | None) -> str:
    if not x_user_id:
        raise NewellError("auth.unauthorized", translate("auth.unauthorized"), status_code=401)
    return x_user_id


@router.post("", response_model=RoomCreateOut)
async def create_room(
    body: RoomCreateIn,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    x_user_role: str = Header(default="user", alias="X-User-Role"),
    service: InteriorService = Depends(get_interior_service),
) -> RoomCreateOut:
    user_id = _require_user_id(x_user_id)
    room, log = await service.create_room(user_id, x_user_role, body.name, body.image_ref)
    return RoomCreateOut(
        room_id=str(room.id),
        name=room.name,
        design=log.design,
        created_at=room.created_at,
    )


@router.get("", response_model=RoomListOut)
async def list_rooms(
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    x_user_role: str = Header(default="user", alias="X-User-Role"),
    service: InteriorService = Depends(get_interior_service),
) -> RoomListOut:
    user_id = _require_user_id(x_user_id)
    rows = await service.list_rooms(user_id, x_user_role)
    rooms = [
        RoomSummaryOut(
            room_id=str(room.id),
            name=room.name,
            created_at=room.created_at,
            latest_design=latest.design if latest else None,
        )
        for room, latest in rows
    ]
    return RoomListOut(rooms=rooms)


@router.get("/{room_id}", response_model=RoomDetailOut)
async def get_room(
    room_id: uuid.UUID,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    service: InteriorService = Depends(get_interior_service),
) -> RoomDetailOut:
    user_id = _require_user_id(x_user_id)
    room, logs = await service.get_room(user_id, room_id)
    return RoomDetailOut(
        room_id=str(room.id),
        name=room.name,
        created_at=room.created_at,
        logs=[
            RoomLogOut(image_ref=log.image_ref, design=log.design, created_at=log.created_at)
            for log in logs
        ],
    )


@router.post("/{room_id}/design", response_model=RoomLogOut)
async def design_room(
    room_id: uuid.UUID,
    body: DesignIn,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    x_user_role: str = Header(default="user", alias="X-User-Role"),
    service: InteriorService = Depends(get_interior_service),
) -> RoomLogOut:
    user_id = _require_user_id(x_user_id)
    log = await service.design(user_id, x_user_role, room_id, body.image_ref)
    return RoomLogOut(image_ref=log.image_ref, design=log.design, created_at=log.created_at)
