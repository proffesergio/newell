from fastapi import FastAPI

from ai_gateway.routes import router
from newell_common.errors import install_error_handlers
from newell_common.health import health_payload
from newell_common.logging import configure_logging

SERVICE_NAME = "ai_gateway"


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(title="Newell AI Gateway", version="0.1.0")
    install_error_handlers(app)
    app.include_router(router)

    @app.get("/healthz")
    def healthz() -> dict:
        return health_payload(SERVICE_NAME)

    return app


app = create_app()
