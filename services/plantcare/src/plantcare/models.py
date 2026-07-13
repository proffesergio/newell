import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from newell_common.db import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Plant(Base):
    __tablename__ = "plants"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # X-User-Id is an opaque caller-provided identifier (forwarded verbatim by
    # the gateway from the JWT `sub` claim; see gateway/auth_dep.py), not
    # guaranteed to be UUID-formatted, so this is a plain indexed string
    # rather than a SQLAlchemy Uuid column.
    user_id: Mapped[str] = mapped_column(String(255), index=True)
    name: Mapped[str | None] = mapped_column(String(255), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class PlantLog(Base):
    __tablename__ = "plant_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plant_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("plants.id"), index=True
    )
    image_ref: Mapped[str] = mapped_column(String(512))
    diagnosis: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
