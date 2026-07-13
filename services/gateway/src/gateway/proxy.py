import httpx
from fastapi import APIRouter, Depends, Request, Response

from gateway.auth_dep import current_identity, current_user_id
from gateway.middleware import REQUEST_ID_HEADER
from newell_common.config import get_settings

router = APIRouter()

# Hop-by-hop / framing headers that must not be copied verbatim from the
# upstream response: Response(content=...) recomputes them itself.
_STRIPPED_RESPONSE_HEADERS = {
    "content-length",
    "transfer-encoding",
    "content-encoding",
    "connection",
}


def get_http_client(request: Request) -> httpx.AsyncClient:
    """Return the shared upstream client.

    Reads `app.state.http_client` lazily (per-request) rather than binding it
    at import time, so tests can swap in a client backed by a stub ASGI app
    (see tests/gateway/test_proxy.py) without touching this module.
    """
    return request.app.state.http_client


async def _forward(
    client: httpx.AsyncClient,
    base_url: str,
    request: Request,
    extra_headers: dict[str, str] | None = None,
) -> Response:
    url = f"{base_url}{request.url.path}"

    headers: dict[str, str] = {}
    content_type = request.headers.get("content-type")
    if content_type:
        headers["Content-Type"] = content_type
    request_id = request.headers.get(REQUEST_ID_HEADER) or getattr(
        request.state, "request_id", None
    )
    if request_id:
        headers[REQUEST_ID_HEADER] = request_id
    if extra_headers:
        headers.update(extra_headers)

    body = await request.body()

    upstream_response = await client.request(
        request.method,
        url,
        params=request.query_params,
        content=body or None,
        headers=headers,
    )

    response_headers = {
        key: value
        for key, value in upstream_response.headers.items()
        if key.lower() not in _STRIPPED_RESPONSE_HEADERS
    }

    return Response(
        content=upstream_response.content,
        status_code=upstream_response.status_code,
        headers=response_headers,
        media_type=upstream_response.headers.get("content-type"),
    )


@router.api_route("/auth/{path:path}", methods=["GET", "POST", "PATCH", "DELETE"])
async def proxy_auth(
    request: Request,
    client: httpx.AsyncClient = Depends(get_http_client),
) -> Response:
    """Forward to the Auth service without requiring authentication (login is public)."""
    settings = get_settings()
    return await _forward(client, settings.auth_url, request)


@router.api_route("/profile/{path:path}", methods=["GET", "POST", "PATCH", "DELETE"])
async def proxy_profile(
    request: Request,
    user_id: str = Depends(current_user_id),
    client: httpx.AsyncClient = Depends(get_http_client),
) -> Response:
    """Forward to the Profile service, injecting the caller's user id."""
    settings = get_settings()
    return await _forward(
        client, settings.profile_url, request, extra_headers={"X-User-Id": user_id}
    )


@router.api_route("/media", methods=["GET", "POST", "PATCH", "DELETE"])
@router.api_route("/media/{path:path}", methods=["GET", "POST", "PATCH", "DELETE"])
async def proxy_media(
    request: Request,
    identity: tuple[str, str] = Depends(current_identity),
    client: httpx.AsyncClient = Depends(get_http_client),
) -> Response:
    """Forward to the Media service, injecting the caller's user id and role.

    Bodies (including multipart uploads, e.g. `/media/upload`) are forwarded
    as raw bytes with the original Content-Type header, so multipart
    boundaries are preserved untouched.
    """
    user_id, role = identity
    settings = get_settings()
    return await _forward(
        client,
        settings.media_url,
        request,
        extra_headers={"X-User-Id": user_id, "X-User-Role": role},
    )


@router.api_route("/plants", methods=["GET", "POST", "PATCH", "DELETE"])
@router.api_route("/plants/{path:path}", methods=["GET", "POST", "PATCH", "DELETE"])
async def proxy_plants(
    request: Request,
    identity: tuple[str, str] = Depends(current_identity),
    client: httpx.AsyncClient = Depends(get_http_client),
) -> Response:
    """Forward to the Plantcare service, injecting the caller's user id and role."""
    user_id, role = identity
    settings = get_settings()
    return await _forward(
        client,
        settings.plantcare_url,
        request,
        extra_headers={"X-User-Id": user_id, "X-User-Role": role},
    )


@router.api_route("/rooms", methods=["GET", "POST", "PATCH", "DELETE"])
@router.api_route("/rooms/{path:path}", methods=["GET", "POST", "PATCH", "DELETE"])
async def proxy_rooms(
    request: Request,
    identity: tuple[str, str] = Depends(current_identity),
    client: httpx.AsyncClient = Depends(get_http_client),
) -> Response:
    """Forward to the Interior Design service, injecting the caller's user id and role."""
    user_id, role = identity
    settings = get_settings()
    return await _forward(
        client,
        settings.interior_url,
        request,
        extra_headers={"X-User-Id": user_id, "X-User-Role": role},
    )
