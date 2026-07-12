import pytest

from newell_common.errors import NewellError
from newell_common.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token,
)


def test_access_token_roundtrip():
    token = create_access_token("user-123")
    claims = decode_token(token)
    assert claims["sub"] == "user-123"
    assert claims["type"] == "access"


def test_refresh_token_returns_raw_and_hash():
    raw, hashed = create_refresh_token()
    assert raw and hashed
    assert hash_token(raw) == hashed
    assert raw != hashed


def test_invalid_token_raises_401():
    with pytest.raises(NewellError) as exc:
        decode_token("not-a-jwt")
    assert exc.value.status_code == 401
