from __future__ import annotations


class NewellError(Exception):
    """Base domain error rendered as the standard JSON envelope."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: dict | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details

    def to_envelope(self) -> dict:
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
            }
        }


class NotFoundError(NewellError):
    def __init__(self, message: str, details: dict | None = None) -> None:
        super().__init__("not_found", message, status_code=404, details=details)


def install_error_handlers(app) -> None:
    """Register a FastAPI exception handler for NewellError."""
    from fastapi import Request
    from fastapi.responses import JSONResponse

    @app.exception_handler(NewellError)
    async def _handle(_: Request, exc: NewellError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=exc.to_envelope())
