from fastapi import Header

from newell_common.errors import NewellError
from newell_common.security import decode_token

_BEARER_PREFIX = "Bearer "


def _unauthorized() -> NewellError:
    return NewellError("auth.unauthorized", "Not authenticated.", status_code=401)


def current_user_id(authorization: str = Header(default="")) -> str:
    """Resolve the caller's user id from a `Bearer <jwt>` Authorization header.

    Raises a 401 NewellError (code `auth.unauthorized`) when the header is
    missing, malformed, or carries an invalid/expired token.
    """
    if not authorization.startswith(_BEARER_PREFIX):
        raise _unauthorized()

    token = authorization[len(_BEARER_PREFIX) :].strip()
    if not token:
        raise _unauthorized()

    claims = decode_token(token)
    user_id = claims.get("sub")
    if not user_id:
        raise _unauthorized()

    return user_id
