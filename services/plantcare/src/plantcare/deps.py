from collections.abc import AsyncIterator
from functools import lru_cache

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from newell_common.config import get_settings
from newell_common.db import SessionFactory, make_engine, make_session_factory
from plantcare.client import AiClientProtocol, AiGatewayClient
from plantcare.service import PlantCareService


@lru_cache
def _engine() -> AsyncEngine:
    return make_engine(get_settings().postgres_dsn)


@lru_cache
def _session_factory() -> SessionFactory:
    return make_session_factory(_engine())


async def get_session() -> AsyncIterator[AsyncSession]:
    async with _session_factory()() as session:
        yield session


@lru_cache
def get_ai_client() -> AiClientProtocol:
    return AiGatewayClient()


def get_plantcare_service(
    session: AsyncSession = Depends(get_session),
    ai_client: AiClientProtocol = Depends(get_ai_client),
) -> PlantCareService:
    return PlantCareService(session, ai_client)
