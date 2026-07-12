from pydantic import BaseModel


class ProfileOut(BaseModel):
    user_id: str
    display_name: str | None
    locale: str


class ProfileUpdateIn(BaseModel):
    display_name: str | None = None
    locale: str | None = None
