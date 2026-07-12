from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI

from gateway import proxy
from gateway.middleware import RequestIdMiddleware
from newell_common.errors import install_error_handlers
from newell_common.health import health_payload
from newell_common.logging import configure_logging

SERVICE_NAME = "gateway"


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.http_client = httpx.AsyncClient()
    try:
        yield
    finally:
        await app.state.http_client.aclose()


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(title="Newell API Gateway", version="0.1.0", lifespan=_lifespan)
    app.add_middleware(RequestIdMiddleware)
    install_error_handlers(app)
    app.include_router(proxy.router)

    @app.get("/healthz")
    def healthz() -> dict:
        return health_payload(SERVICE_NAME)

    return app


app = create_app()
