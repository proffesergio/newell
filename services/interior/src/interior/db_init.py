"""Schema creation for the interior service (no Alembic — self-migrate on startup).

Run directly to create tables against the configured Postgres DSN:

    python -m interior.db_init
"""

import asyncio

from sqlalchemy.ext.asyncio import AsyncEngine

from interior import models  # noqa: F401  registers tables on Base.metadata
from newell_common.config import get_settings
from newell_common.db import Base, make_engine


async def create_all(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def _main() -> None:
    engine = make_engine(get_settings().postgres_dsn)
    try:
        await create_all(engine)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(_main())
