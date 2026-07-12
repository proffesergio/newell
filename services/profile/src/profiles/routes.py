import uuid

from fastapi import APIRouter, Depends, Header

from newell_common.errors import NewellError
from newell_common.i18n import translate
from profiles.deps import get_profile_service
from profiles.schemas import ProfileOut, ProfileUpdateIn
from profiles.service import ProfileService

router = APIRouter(prefix="/profile", tags=["profile"])


def _require_user_id(x_user_id: str | None) -> uuid.UUID:
    if not x_user_id:
        raise _unauthorized_error()
    try:
        return uuid.UUID(x_user_id)
    except ValueError as exc:
        raise _unauthorized_error() from exc


def _unauthorized_error() -> NewellError:
    return NewellError("auth.unauthorized", translate("auth.unauthorized"), status_code=401)


def _to_out(profile) -> ProfileOut:
    return ProfileOut(
        user_id=str(profile.user_id),
        display_name=profile.display_name,
        locale=profile.locale,
    )


@router.get("/me", response_model=ProfileOut)
async def get_me(
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    service: ProfileService = Depends(get_profile_service),
) -> ProfileOut:
    user_id = _require_user_id(x_user_id)
    profile = await service.get_or_create(user_id)
    return _to_out(profile)


@router.patch("/me", response_model=ProfileOut)
async def update_me(
    body: ProfileUpdateIn,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    service: ProfileService = Depends(get_profile_service),
) -> ProfileOut:
    user_id = _require_user_id(x_user_id)
    profile = await service.update(user_id, body.display_name, body.locale)
    return _to_out(profile)
