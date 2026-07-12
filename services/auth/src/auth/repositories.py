from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.models import OtpCode, RefreshToken, User
from newell_common.repository import BaseRepository


class UserRepository(BaseRepository):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, User)

    async def get_by_phone(self, phone: str) -> User | None:
        result = await self.session.execute(select(User).where(User.phone == phone))
        return result.scalar_one_or_none()


class OtpRepository(BaseRepository):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, OtpCode)

    async def get_latest_active(self, phone: str) -> OtpCode | None:
        """Most recent, not-yet-consumed OTP for a phone (may be expired)."""
        result = await self.session.execute(
            select(OtpCode)
            .where(OtpCode.phone == phone, OtpCode.consumed.is_(False))
            .order_by(OtpCode.expires_at.desc())
        )
        return result.scalars().first()


class RefreshTokenRepository(BaseRepository):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, RefreshToken)

    async def get_by_hash(self, token_hash: str) -> RefreshToken | None:
        result = await self.session.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        return result.scalar_one_or_none()
