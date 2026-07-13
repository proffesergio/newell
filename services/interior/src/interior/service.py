import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from interior.client import AiClientProtocol
from interior.models import Room, RoomLog
from interior.repositories import RoomLogRepository, RoomRepository
from newell_common.errors import NewellError, NotFoundError
from newell_common.i18n import translate

GUEST_ROLE = "guest"


class InteriorService:
    def __init__(self, session: AsyncSession, ai_client: AiClientProtocol) -> None:
        self.session = session
        self.ai_client = ai_client
        self.rooms = RoomRepository(session)
        self.logs = RoomLogRepository(session)

    async def create_room(
        self, user_id: str, role: str, name: str | None, image_ref: str
    ) -> tuple[Room, RoomLog]:
        if role == GUEST_ROLE:
            existing = await self.rooms.count_for_user(user_id)
            if existing >= 1:
                raise self._signup_required_error()

        design = await self.ai_client.design(image_ref)
        room = Room(user_id=user_id, name=name)
        await self.rooms.add(room)
        log = RoomLog(room_id=room.id, image_ref=image_ref, design=design)
        await self.logs.add(log)
        await self.session.commit()
        return room, log

    async def list_rooms(self, user_id: str, role: str) -> list[tuple[Room, RoomLog | None]]:
        if role == GUEST_ROLE:
            raise self._signup_required_error()

        rooms = await self.rooms.list_for_user(user_id)
        result: list[tuple[Room, RoomLog | None]] = []
        for room in rooms:
            logs = await self.logs.list_for_room(room.id)
            latest = logs[0] if logs else None
            result.append((room, latest))
        return result

    async def get_room(self, user_id: str, room_id: uuid.UUID) -> tuple[Room, list[RoomLog]]:
        room = await self._get_owned_room(user_id, room_id)
        logs = await self.logs.list_for_room(room_id)
        return room, logs

    async def design(self, user_id: str, role: str, room_id: uuid.UUID, image_ref: str) -> RoomLog:
        if role == GUEST_ROLE:
            raise self._signup_required_error()

        room = await self._get_owned_room(user_id, room_id)
        design = await self.ai_client.design(image_ref)
        log = RoomLog(room_id=room.id, image_ref=image_ref, design=design)
        await self.logs.add(log)
        await self.session.commit()
        return log

    async def _get_owned_room(self, user_id: str, room_id: uuid.UUID) -> Room:
        room = await self.rooms.get(room_id)
        if room is None or room.user_id != user_id:
            raise self._not_found_error()
        return room

    @staticmethod
    def _signup_required_error() -> NewellError:
        return NewellError(
            "signup_required", translate("interior.signup_required"), status_code=403
        )

    @staticmethod
    def _not_found_error() -> NotFoundError:
        return NotFoundError(translate("interior.room_not_found"))
