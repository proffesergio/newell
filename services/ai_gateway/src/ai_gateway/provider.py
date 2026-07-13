import hashlib
from typing import Protocol

from ai_gateway.schemas import Diagnosis

HEALTH_OPTIONS = ["Healthy", "Slightly stressed", "Needs attention"]

GROWTH_STAGES = ["Seedling", "Vegetative", "Flowering", "Mature"]

WATERING_ADVICE = [
    "Water when the top inch of soil feels dry; avoid letting the pot sit in standing water.",
    "Increase watering frequency slightly; the soil is drying out faster than ideal.",
    "Reduce watering; the roots may be at risk of rot from excess moisture.",
    "Maintain the current watering schedule; moisture levels look well balanced.",
]

PEST_OPTIONS = ["Aphids", "Spider mites", "Whitefly", "Fungus gnats"]

CARE_STEP_POOL = [
    "Rotate the plant a quarter turn each week for even light exposure.",
    "Wipe leaves gently with a damp cloth to remove dust buildup.",
    "Check soil moisture with a finger before each watering.",
    "Move the plant to a spot with brighter, indirect sunlight.",
    "Apply a balanced liquid fertilizer once every two weeks.",
    "Inspect the underside of leaves for early signs of pests.",
    "Trim any yellowing or dead leaves to encourage new growth.",
    "Increase humidity around the plant with a pebble tray or humidifier.",
]


class LLMProvider(Protocol):
    def diagnose_plant(self, image_ref: str) -> Diagnosis: ...


class MockProvider:
    """Deterministic stand-in for a real LLM-backed provider.

    Every field is derived from ``sha256(image_ref)`` so the same ``image_ref``
    always yields the exact same :class:`Diagnosis`, while different refs vary.
    """

    def diagnose_plant(self, image_ref: str) -> Diagnosis:
        digest = hashlib.sha256(image_ref.encode()).hexdigest()
        h = int(digest, 16)

        health = HEALTH_OPTIONS[h % len(HEALTH_OPTIONS)]
        growth_stage = GROWTH_STAGES[(h >> 4) % len(GROWTH_STAGES)]
        watering = WATERING_ADVICE[(h >> 8) % len(WATERING_ADVICE)]
        pests = self._pick_pests(h)
        care_steps = self._pick_care_steps(h)

        return Diagnosis(
            health=health,
            growth_stage=growth_stage,
            pests=pests,
            watering=watering,
            care_steps=care_steps,
        )

    @staticmethod
    def _pick_pests(h: int) -> list[str]:
        roll = (h >> 12) % 4
        if roll == 0:
            return []
        count = 1 if roll in (1, 2) else 2
        idx1 = (h >> 16) % len(PEST_OPTIONS)
        if count == 1:
            return [PEST_OPTIONS[idx1]]
        idx2 = (h >> 20) % len(PEST_OPTIONS)
        if idx2 == idx1:
            idx2 = (idx2 + 1) % len(PEST_OPTIONS)
        return [PEST_OPTIONS[idx1], PEST_OPTIONS[idx2]]

    @staticmethod
    def _pick_care_steps(h: int) -> list[str]:
        pool_size = len(CARE_STEP_POOL)
        start = (h >> 24) % pool_size
        # Odd step is coprime with the (even) pool size, guaranteeing the three
        # picked indices are distinct.
        step = 1 + 2 * ((h >> 32) % (pool_size // 2))
        return [CARE_STEP_POOL[(start + i * step) % pool_size] for i in range(3)]
