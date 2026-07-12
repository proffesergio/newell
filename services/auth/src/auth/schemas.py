from pydantic import BaseModel


class OtpRequestIn(BaseModel):
    phone: str


class OtpRequestOut(BaseModel):
    message: str


class OtpVerifyIn(BaseModel):
    phone: str
    code: str


class TokenPairOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str


class RefreshIn(BaseModel):
    refresh_token: str


class RefreshOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LogoutIn(BaseModel):
    refresh_token: str
