from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from newell_common.config import get_settings
from newell_common.db import make_engine
from newell_common.errors import install_error_handlers
from newell_common.health import health_payload
from newell_common.logging import configure_logging
from plantcare.db_init import create_all
from plantcare.routes import router

SERVICE_NAME = "plantcare"


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Self-migrate on startup: create this service's tables if missing.
    # Not triggered by tests (ASGITransport never runs FastAPI lifespan),
    # which use an in-memory SQLite schema created directly in fixtures.
    engine = make_engine(get_settings().postgres_dsn)
    try:
        await create_all(engine)
        yield
    finally:
        await engine.dispose()


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(title="Newell PlantCare Service", version="0.1.0", lifespan=_lifespan)
    install_error_handlers(app)
    app.include_router(router)

    @app.get("/healthz")
    def healthz() -> dict:
        return health_payload(SERVICE_NAME)

    return app


app = create_app()
