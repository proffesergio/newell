from fastapi import APIRouter, Depends, Header, Response

from auth.deps import get_auth_service
from auth.schemas import (
    LogoutIn,
    OtpRequestIn,
    OtpRequestOut,
    OtpVerifyIn,
    RefreshIn,
    RefreshOut,
    TokenPairOut,
)
from auth.service import AuthService
from newell_common.i18n import translate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/otp/request", response_model=OtpRequestOut)
async def request_otp(
    body: OtpRequestIn,
    accept_language: str = Header(default="en", alias="Accept-Language"),
    service: AuthService = Depends(get_auth_service),
) -> OtpRequestOut:
    await service.request_otp(body.phone)
    return OtpRequestOut(message=translate("otp.sent", accept_language))


@router.post("/otp/verify", response_model=TokenPairOut)
async def verify_otp(
    body: OtpVerifyIn,
    service: AuthService = Depends(get_auth_service),
) -> TokenPairOut:
    pair = await service.verify_otp(body.phone, body.code, guest_user_id=body.guest_user_id)
    return TokenPairOut(**pair)


@router.post("/guest", response_model=TokenPairOut)
async def guest_login(
    service: AuthService = Depends(get_auth_service),
) -> TokenPairOut:
    pair = await service.create_guest()
    return TokenPairOut(**pair)


@router.post("/refresh", response_model=RefreshOut)
async def refresh(
    body: RefreshIn,
    service: AuthService = Depends(get_auth_service),
) -> RefreshOut:
    pair = await service.refresh(body.refresh_token)
    return RefreshOut(**pair)


@router.post("/logout", status_code=204)
async def logout(
    body: LogoutIn,
    service: AuthService = Depends(get_auth_service),
) -> Response:
    await service.logout(body.refresh_token)
    return Response(status_code=204)
