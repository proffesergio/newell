import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from newell_common.db import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Profile(Base):
    __tablename__ = "profiles"

    # Plain indexed Uuid column, intentionally *not* a DB ForeignKey to the
    # auth service's users table: profile and auth are separate bounded
    # contexts, and keeping this column FK-free lets this service's tests
    # run hermetically against an in-memory SQLite DB with no users table.
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(255), default=None)
    locale: Mapped[str] = mapped_column(String(8), default="en")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )
