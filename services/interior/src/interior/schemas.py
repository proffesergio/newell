from datetime import datetime

from pydantic import BaseModel


class RoomCreateIn(BaseModel):
    name: str | None = None
    image_ref: str


class DesignIn(BaseModel):
    image_ref: str


class RoomCreateOut(BaseModel):
    room_id: str
    name: str | None
    design: dict
    created_at: datetime


class RoomLogOut(BaseModel):
    image_ref: str
    design: dict
    created_at: datetime


class RoomSummaryOut(BaseModel):
    room_id: str
    name: str | None
    created_at: datetime
    latest_design: dict | None = None


class RoomListOut(BaseModel):
    rooms: list[RoomSummaryOut]


class RoomDetailOut(BaseModel):
    room_id: str
    name: str | None
    created_at: datetime
    logs: list[RoomLogOut]
