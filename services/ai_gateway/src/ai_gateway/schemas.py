from pydantic import BaseModel


class Diagnosis(BaseModel):
    health: str
    growth_stage: str
    pests: list[str]
    watering: str
    care_steps: list[str]


class RoomDesign(BaseModel):
    style: str
    palette: list[str]
    layout_tips: list[str]
    furniture: list[str]


class AnalyzeRequest(BaseModel):
    image_ref: str
    task: str
