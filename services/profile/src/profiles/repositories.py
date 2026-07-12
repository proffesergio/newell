from sqlalchemy.ext.asyncio import AsyncSession

from newell_common.repository import BaseRepository
from profiles.models import Profile


class ProfileRepository(BaseRepository):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Profile)
