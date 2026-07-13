"""Schema creation for the plantcare service (no Alembic — see task brief).

Run directly to create tables against the configured Postgres DSN:

    python -m plantcare.db_init
"""

import asyncio

from sqlalchemy.ext.asyncio import AsyncEngine

from newell_common.config import get_settings
from newell_common.db import Base, make_engine
from plantcare import models  # noqa: F401  registers tables on Base.metadata


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
