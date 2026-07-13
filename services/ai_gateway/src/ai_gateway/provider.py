import hashlib
from typing import Protocol

from ai_gateway.schemas import Diagnosis, RoomDesign

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


DESIGN_STYLES = [
    "Scandinavian minimalist",
    "Warm mid-century modern",
    "Japandi calm",
    "Bohemian layered",
    "Modern coastal",
    "Industrial loft",
]

PALETTES = [
    ["#F5F3EC", "#3A5A40", "#D98E5A", "#12241B"],
    ["#EDE7DD", "#6B8F71", "#C97C5D", "#2E2A26"],
    ["#F2EFE9", "#8AA891", "#E0B084", "#333B33"],
    ["#FBF7F0", "#4A6C57", "#B5651D", "#1E2A24"],
]

LAYOUT_TIP_POOL = [
    "Float the sofa off the wall to create a cozier conversation zone.",
    "Anchor the seating area with a rug large enough to hold the front legs of each piece.",
    "Keep clear walking paths of at least 90 cm between major furniture.",
    "Place the largest piece first, then arrange everything else around it.",
    "Draw the eye up with a tall plant or shelf in an empty corner.",
    "Angle a chair toward the window to make the most of natural light.",
    "Use a mirror opposite the window to bounce light deeper into the room.",
    "Layer lighting: one overhead, one mid-level, and one accent source.",
]

FURNITURE_POOL = [
    "A low-profile fabric sofa in a neutral tone",
    "A round wooden coffee table to soften sharp lines",
    "Open shelving to display and break up wall space",
    "A woven area rug for warmth and texture",
    "A slim floor lamp for a soft evening glow",
    "A pair of accent chairs in a complementary color",
    "A sideboard for hidden storage and display surface",
    "Leafy potted plants to bring the space to life",
]


class LLMProvider(Protocol):
    def diagnose_plant(self, image_ref: str) -> Diagnosis: ...

    def design_room(self, image_ref: str) -> RoomDesign: ...


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

    def design_room(self, image_ref: str) -> RoomDesign:
        digest = hashlib.sha256(image_ref.encode()).hexdigest()
        h = int(digest, 16)
        style = DESIGN_STYLES[h % len(DESIGN_STYLES)]
        palette = PALETTES[(h >> 4) % len(PALETTES)]
        layout_tips = self._pick_distinct(LAYOUT_TIP_POOL, h >> 8, 3)
        furniture = self._pick_distinct(FURNITURE_POOL, h >> 16, 3)
        return RoomDesign(
            style=style, palette=list(palette), layout_tips=layout_tips, furniture=furniture
        )

    @staticmethod
    def _pick_distinct(pool: list[str], seed: int, count: int) -> list[str]:
        size = len(pool)
        start = seed % size
        # Odd stride is coprime with the (even) pool size → distinct picks.
        stride = 1 + 2 * ((seed >> 8) % (size // 2))
        return [pool[(start + i * stride) % size] for i in range(count)]
