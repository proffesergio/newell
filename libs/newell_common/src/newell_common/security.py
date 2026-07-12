import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import jwt

from newell_common.config import get_settings
from newell_common.errors import NewellError


def _now() -> datetime:
    return datetime.now(UTC)


def create_access_token(subject: str) -> str:
    s = get_settings()
    payload = {
        "sub": subject,
        "type": "access",
        "iat": _now(),
        "exp": _now() + timedelta(seconds=s.access_ttl_seconds),
    }
    return jwt.encode(payload, s.jwt_secret, algorithm=s.jwt_algorithm)


def create_refresh_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(48)
    return raw, hash_token(raw)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def decode_token(token: str) -> dict:
    s = get_settings()
    try:
        return jwt.decode(token, s.jwt_secret, algorithms=[s.jwt_algorithm])
    except jwt.PyJWTError as exc:
        raise NewellError("auth.unauthorized", "Not authenticated.", status_code=401) from exc
