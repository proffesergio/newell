from collections.abc import AsyncIterator
from functools import lru_cache

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from auth.service import AuthService
from auth.sms import MockSmsProvider, SmsProvider
from newell_common.config import get_settings
from newell_common.db import SessionFactory, make_engine, make_session_factory


@lru_cache
def _engine() -> AsyncEngine:
    return make_engine(get_settings().postgres_dsn)


@lru_cache
def _session_factory() -> SessionFactory:
    return make_session_factory(_engine())


async def get_session() -> AsyncIterator[AsyncSession]:
    async with _session_factory()() as session:
        yield session


def get_sms_provider() -> SmsProvider:
    return MockSmsProvider()


def get_auth_service(
    session: AsyncSession = Depends(get_session),
    sms: SmsProvider = Depends(get_sms_provider),
) -> AuthService:
    return AuthService(session, sms)
