from datetime import datetime

from pydantic import BaseModel


class PlantCreateIn(BaseModel):
    name: str | None = None
    image_ref: str


class AnalyzeIn(BaseModel):
    image_ref: str


class PlantCreateOut(BaseModel):
    plant_id: str
    name: str | None
    diagnosis: dict
    created_at: datetime


class PlantLogOut(BaseModel):
    image_ref: str
    diagnosis: dict
    created_at: datetime


class PlantSummaryOut(BaseModel):
    plant_id: str
    name: str | None
    created_at: datetime
    latest_diagnosis: dict | None = None


class PlantListOut(BaseModel):
    plants: list[PlantSummaryOut]


class PlantDetailOut(BaseModel):
    plant_id: str
    name: str | None
    created_at: datetime
    logs: list[PlantLogOut]
