import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from interior.models import Room, RoomLog
from newell_common.repository import BaseRepository


class RoomRepository(BaseRepository):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Room)

    async def list_for_user(self, user_id: str) -> list[Room]:
        result = await self.session.execute(
            select(Room).where(Room.user_id == user_id).order_by(Room.created_at.desc())
        )
        return list(result.scalars().all())

    async def count_for_user(self, user_id: str) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(Room).where(Room.user_id == user_id)
        )
        return result.scalar_one()


class RoomLogRepository(BaseRepository):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, RoomLog)

    async def list_for_room(self, room_id: uuid.UUID) -> list[RoomLog]:
        result = await self.session.execute(
            select(RoomLog).where(RoomLog.room_id == room_id).order_by(RoomLog.created_at.desc())
        )
        return list(result.scalars().all())
