from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class BaseRepository:
    def __init__(self, session: AsyncSession, model: type) -> None:
        self.session = session
        self.model = model

    async def get(self, id_: object):
        return await self.session.get(self.model, id_)

    async def list(self) -> Sequence:
        result = await self.session.execute(select(self.model))
        return result.scalars().all()

    async def add(self, obj):
        self.session.add(obj)
        await self.session.flush()
        return obj

    async def delete(self, obj) -> None:
        await self.session.delete(obj)
        await self.session.flush()
