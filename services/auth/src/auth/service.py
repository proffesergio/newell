import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from auth.models import OtpCode, RefreshToken, User
from auth.repositories import OtpRepository, RefreshTokenRepository, UserRepository
from auth.sms import SmsProvider
from newell_common.config import get_settings
from newell_common.errors import NewellError
from newell_common.i18n import translate
from newell_common.security import create_access_token, create_refresh_token, hash_token

OTP_TTL = timedelta(minutes=5)
MAX_OTP_ATTEMPTS = 5


def _as_aware_utc(value: datetime) -> datetime:
    """Normalize a DateTime(timezone=True) value read back from the DB.

    SQLite (unlike Postgres) does not actually persist tzinfo, so aiosqlite
    round-trips these columns as naive datetimes. We always write UTC, so a
    naive value read back is assumed to be UTC.
    """
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


class AuthService:
    def __init__(self, session: AsyncSession, sms_provider: SmsProvider) -> None:
        self.session = session
        self.sms = sms_provider
        self.users = UserRepository(session)
        self.otps = OtpRepository(session)
        self.refresh_tokens = RefreshTokenRepository(session)

    async def create_guest(self) -> dict:
        user = User(phone=None, role="guest", locale="en")
        await self.users.add(user)
        await self.session.flush()

        access_token = create_access_token(str(user.id), role=user.role)
        refresh_raw = await self._issue_refresh_token(user.id)
        await self.session.commit()

        return {
            "access_token": access_token,
            "refresh_token": refresh_raw,
            "user_id": str(user.id),
            "role": user.role,
        }

    async def request_otp(self, phone: str) -> None:
        code = f"{secrets.randbelow(1_000_000):06d}"
        otp = OtpCode(
            phone=phone,
            code_hash=hash_token(code),
            expires_at=datetime.now(UTC) + OTP_TTL,
            attempts=0,
            consumed=False,
        )
        await self.otps.add(otp)
        await self.session.commit()
        self.sms.send(phone, f"Your Newell verification code is {code}")

    async def verify_otp(self, phone: str, code: str, guest_user_id: str | None = None) -> dict:
        otp = await self.otps.get_latest_active(phone)
        if otp is None:
            raise self._invalid_error()
        if otp.attempts >= MAX_OTP_ATTEMPTS:
            raise NewellError("otp.too_many", translate("otp.too_many"), status_code=429)
        if datetime.now(UTC) > _as_aware_utc(otp.expires_at) or hash_token(code) != otp.code_hash:
            otp.attempts += 1
            await self.session.commit()
            raise self._invalid_error()

        otp.consumed = True

        existing_by_phone = await self.users.get_by_phone(phone)
        guest = await self._find_upgradable_guest(guest_user_id, phone, existing_by_phone)

        if guest is not None:
            guest.phone = phone
            guest.role = "user"
            user = guest
        elif existing_by_phone is not None:
            user = existing_by_phone
        else:
            user = User(phone=phone, role="user", locale="en")
            await self.users.add(user)
            await self.session.flush()

        access_token = create_access_token(str(user.id), role=user.role)
        refresh_raw = await self._issue_refresh_token(user.id)
        await self.session.commit()

        return {
            "access_token": access_token,
            "refresh_token": refresh_raw,
            "user_id": str(user.id),
            "role": user.role,
        }

    async def _find_upgradable_guest(
        self, guest_user_id: str | None, phone: str, existing_by_phone: User | None
    ) -> User | None:
        if guest_user_id is None:
            return None
        if existing_by_phone is not None:
            # phone already belongs to another user; cannot upgrade the guest to it.
            return None
        try:
            guest_id = uuid.UUID(guest_user_id)
        except ValueError:
            return None
        candidate = await self.users.get(guest_id)
        if candidate is None or candidate.role != "guest":
            return None
        return candidate

    async def refresh(self, refresh_token: str) -> dict:
        token = await self.refresh_tokens.get_by_hash(hash_token(refresh_token))
        if token is None or token.revoked or datetime.now(UTC) > _as_aware_utc(token.expires_at):
            raise self._unauthorized_error()

        user = await self.users.get(token.user_id)
        role = user.role if user is not None else "user"

        token.revoked = True
        access_token = create_access_token(str(token.user_id), role=role)
        refresh_raw = await self._issue_refresh_token(token.user_id)
        await self.session.commit()

        return {"access_token": access_token, "refresh_token": refresh_raw}

    async def logout(self, refresh_token: str) -> None:
        token = await self.refresh_tokens.get_by_hash(hash_token(refresh_token))
        if token is not None:
            token.revoked = True
            await self.session.commit()

    async def _issue_refresh_token(self, user_id) -> str:
        refresh_raw, refresh_hash = create_refresh_token()
        refresh_token = RefreshToken(
            user_id=user_id,
            token_hash=refresh_hash,
            expires_at=datetime.now(UTC) + timedelta(seconds=get_settings().refresh_ttl_seconds),
            revoked=False,
        )
        await self.refresh_tokens.add(refresh_token)
        return refresh_raw

    @staticmethod
    def _invalid_error() -> NewellError:
        return NewellError("otp.invalid", translate("otp.invalid"), status_code=400)

    @staticmethod
    def _unauthorized_error() -> NewellError:
        return NewellError("auth.unauthorized", translate("auth.unauthorized"), status_code=401)
