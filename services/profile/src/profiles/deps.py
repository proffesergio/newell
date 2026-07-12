from collections.abc import AsyncIterator
from functools import lru_cache

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from newell_common.config import get_settings
from newell_common.db import SessionFactory, make_engine, make_session_factory
from profiles.service import ProfileService


@lru_cache
def _engine() -> AsyncEngine:
    return make_engine(get_settings().postgres_dsn)


@lru_cache
def _session_factory() -> SessionFactory:
    return make_session_factory(_engine())


async def get_session() -> AsyncIterator[AsyncSession]:
    async with _session_factory()() as session:
        yield session


def get_profile_service(session: AsyncSession = Depends(get_session)) -> ProfileService:
    return ProfileService(session)
