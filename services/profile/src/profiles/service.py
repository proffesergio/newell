import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from newell_common.errors import NewellError
from newell_common.i18n import translate
from profiles.models import Profile
from profiles.repositories import ProfileRepository

VALID_LOCALES = {"en", "bn"}


class ProfileService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.profiles = ProfileRepository(session)

    async def get_or_create(self, user_id: uuid.UUID) -> Profile:
        profile = await self.profiles.get(user_id)
        if profile is None:
            profile = Profile(user_id=user_id, locale="en")
            await self.profiles.add(profile)
            await self.session.commit()
        return profile

    async def update(
        self, user_id: uuid.UUID, display_name: str | None, locale: str | None
    ) -> Profile:
        if locale is not None and locale not in VALID_LOCALES:
            raise self._invalid_locale_error()

        profile = await self.get_or_create(user_id)
        if display_name is not None:
            profile.display_name = display_name
        if locale is not None:
            profile.locale = locale
        await self.session.commit()
        return profile

    @staticmethod
    def _invalid_locale_error() -> NewellError:
        return NewellError(
            "profile.invalid_locale", translate("profile.invalid_locale"), status_code=400
        )
