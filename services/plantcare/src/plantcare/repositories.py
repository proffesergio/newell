import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from newell_common.repository import BaseRepository
from plantcare.models import Plant, PlantLog


class PlantRepository(BaseRepository):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Plant)

    async def list_for_user(self, user_id: str) -> list[Plant]:
        result = await self.session.execute(
            select(Plant).where(Plant.user_id == user_id).order_by(Plant.created_at.desc())
        )
        return list(result.scalars().all())

    async def count_for_user(self, user_id: str) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(Plant).where(Plant.user_id == user_id)
        )
        return result.scalar_one()


class PlantLogRepository(BaseRepository):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, PlantLog)

    async def list_for_plant(self, plant_id: uuid.UUID) -> list[PlantLog]:
        result = await self.session.execute(
            select(PlantLog)
            .where(PlantLog.plant_id == plant_id)
            .order_by(PlantLog.created_at.desc())
        )
        return list(result.scalars().all())
