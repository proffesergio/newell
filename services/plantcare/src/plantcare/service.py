import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from newell_common.errors import NewellError, NotFoundError
from newell_common.i18n import translate
from plantcare.client import AiClientProtocol
from plantcare.models import Plant, PlantLog
from plantcare.repositories import PlantLogRepository, PlantRepository

GUEST_ROLE = "guest"


class PlantCareService:
    def __init__(self, session: AsyncSession, ai_client: AiClientProtocol) -> None:
        self.session = session
        self.ai_client = ai_client
        self.plants = PlantRepository(session)
        self.logs = PlantLogRepository(session)

    async def create_plant(
        self, user_id: str, role: str, name: str | None, image_ref: str
    ) -> tuple[Plant, PlantLog]:
        if role == GUEST_ROLE:
            existing = await self.plants.count_for_user(user_id)
            if existing >= 1:
                raise self._signup_required_error()

        diagnosis = await self.ai_client.analyze(image_ref)
        plant = Plant(user_id=user_id, name=name)
        await self.plants.add(plant)
        log = PlantLog(plant_id=plant.id, image_ref=image_ref, diagnosis=diagnosis)
        await self.logs.add(log)
        await self.session.commit()
        return plant, log

    async def list_plants(self, user_id: str, role: str) -> list[tuple[Plant, PlantLog | None]]:
        if role == GUEST_ROLE:
            raise self._signup_required_error()

        plants = await self.plants.list_for_user(user_id)
        result: list[tuple[Plant, PlantLog | None]] = []
        for plant in plants:
            logs = await self.logs.list_for_plant(plant.id)
            latest = logs[0] if logs else None
            result.append((plant, latest))
        return result

    async def get_plant(self, user_id: str, plant_id: uuid.UUID) -> tuple[Plant, list[PlantLog]]:
        plant = await self._get_owned_plant(user_id, plant_id)
        logs = await self.logs.list_for_plant(plant_id)
        return plant, logs

    async def analyze(
        self, user_id: str, role: str, plant_id: uuid.UUID, image_ref: str
    ) -> PlantLog:
        if role == GUEST_ROLE:
            raise self._signup_required_error()

        plant = await self._get_owned_plant(user_id, plant_id)
        diagnosis = await self.ai_client.analyze(image_ref)
        log = PlantLog(plant_id=plant.id, image_ref=image_ref, diagnosis=diagnosis)
        await self.logs.add(log)
        await self.session.commit()
        return log

    async def _get_owned_plant(self, user_id: str, plant_id: uuid.UUID) -> Plant:
        plant = await self.plants.get(plant_id)
        if plant is None or plant.user_id != user_id:
            raise self._not_found_error()
        return plant

    @staticmethod
    def _signup_required_error() -> NewellError:
        return NewellError(
            "signup_required", translate("plantcare.signup_required"), status_code=403
        )

    @staticmethod
    def _not_found_error() -> NotFoundError:
        return NotFoundError(translate("plantcare.plant_not_found"))
