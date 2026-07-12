# Newell P0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Newell monorepo with a shared Python library and a `docker-compose up` stack (Postgres + MinIO + Redis + API gateway) whose health checks pass, plus CI.

**Architecture:** A monorepo of independent FastAPI services sharing one installable library (`newell-common`) that provides config, structured logging, and a typed error envelope. P0 delivers only the shared library and the API gateway skeleton; later phases (P1–P5) add auth, plantcare, AI gateway, MCP servers, mobile, and admin. All infrastructure runs locally via Docker Compose with mock-first, zero-external-key defaults.

**Tech Stack:** Python 3.12, FastAPI, Uvicorn, pydantic v2 + pydantic-settings, ruff (lint/format), pytest + httpx, Docker Compose (Postgres 16, MinIO, Redis 7), GitHub Actions.

## Global Constraints

- Python **3.12+** for all services and libraries.
- All packages are **`src/`-layout**, installed **editable** (`pip install -e`).
- Every runtime env var is read through `newell_common.config.Settings` with prefix **`NEWELL_`**; never read `os.environ` directly in services.
- All logs are **structured JSON** via `newell_common.logging`; every request carries an `X-Request-ID` correlation id.
- All API errors use the envelope **`{"error": {"code": str, "message": str, "details": object|null}}`**.
- Lint with **`ruff check`** and format-check with **`ruff format --check`**; both must pass in CI.
- Tests use **pytest**; service HTTP tests use **`fastapi.testclient.TestClient`** (hermetic, no network).
- Commit after every task with a `feat:`/`chore:`/`test:` prefixed message.

---

## File Structure

```
newell/
├── pyproject.toml                     # root: dev tooling (ruff, pytest) + workspace deps
├── .gitignore
├── README.md
├── libs/newell_common/
│   ├── pyproject.toml
│   └── src/newell_common/
│       ├── __init__.py
│       ├── config.py                  # Settings (pydantic-settings), get_settings()
│       ├── logging.py                 # JSON logging setup, get_logger()
│       ├── errors.py                  # NewellError, error envelope, FastAPI handler
│       └── health.py                  # health_payload() helper
├── services/gateway/
│   ├── pyproject.toml
│   ├── Dockerfile
│   └── src/gateway/
│       ├── __init__.py
│       ├── main.py                    # FastAPI app factory, /healthz
│       └── middleware.py              # correlation-id middleware
├── tests/
│   ├── common/
│   │   ├── test_config.py
│   │   ├── test_logging.py
│   │   └── test_errors.py
│   └── gateway/
│       └── test_health.py
├── infra/
│   ├── docker-compose.yml
│   └── .env.example
└── .github/workflows/ci.yml
```

- `libs/newell_common` — one responsibility per module (config, logging, errors, health); shared by all services.
- `services/gateway` — the only service in P0; app factory + one middleware + health route.
- `tests/` — mirrors package layout; hermetic (TestClient, no Docker required to run).

---

### Task 1: Repo tooling + shared config module

**Files:**
- Create: `pyproject.toml` (root)
- Create: `.gitignore`
- Create: `libs/newell_common/pyproject.toml`
- Create: `libs/newell_common/src/newell_common/__init__.py`
- Create: `libs/newell_common/src/newell_common/config.py`
- Test: `tests/common/test_config.py`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `newell_common.config.Settings` — pydantic-settings model, env prefix `NEWELL_`, fields: `env: str`, `service_name: str`, `log_level: str`, `postgres_dsn: str`, `redis_url: str`, `minio_endpoint: str`, `minio_access_key: str`, `minio_secret_key: str`.
  - `newell_common.config.get_settings() -> Settings` (cached via `functools.lru_cache`).

- [ ] **Step 1: Write the failing test**

```python
# tests/common/test_config.py
from newell_common.config import Settings, get_settings


def test_settings_defaults():
    s = Settings()
    assert s.env == "local"
    assert s.service_name == "newell"
    assert s.log_level == "INFO"


def test_settings_reads_env_prefix(monkeypatch):
    monkeypatch.setenv("NEWELL_LOG_LEVEL", "DEBUG")
    monkeypatch.setenv("NEWELL_SERVICE_NAME", "gateway")
    s = Settings()
    assert s.log_level == "DEBUG"
    assert s.service_name == "gateway"


def test_get_settings_is_cached():
    assert get_settings() is get_settings()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/common/test_config.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'newell_common'`

- [ ] **Step 3: Create the root tooling files**

```toml
# pyproject.toml  (root)
[project]
name = "newell-workspace"
version = "0.1.0"
requires-python = ">=3.12"

[tool.ruff]
line-length = 100
target-version = "py312"
src = ["libs/newell_common/src", "services/gateway/src", "tests"]

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B"]

[tool.pytest.ini_options]
pythonpath = ["libs/newell_common/src", "services/gateway/src"]
testpaths = ["tests"]
```

```gitignore
# .gitignore
__pycache__/
*.py[cod]
.venv/
venv/
pyenv/
*.egg-info/
.pytest_cache/
.ruff_cache/
.env
.DS_Store
```

- [ ] **Step 4: Create the newell_common package + config**

```toml
# libs/newell_common/pyproject.toml
[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[project]
name = "newell-common"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = ["pydantic>=2.6", "pydantic-settings>=2.2"]

[tool.setuptools.packages.find]
where = ["src"]
```

```python
# libs/newell_common/src/newell_common/__init__.py
__all__ = ["config", "logging", "errors", "health"]
```

```python
# libs/newell_common/src/newell_common/config.py
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central config for every Newell service. Env vars use the NEWELL_ prefix."""

    model_config = SettingsConfigDict(
        env_prefix="NEWELL_", env_file=".env", extra="ignore"
    )

    env: str = "local"
    service_name: str = "newell"
    log_level: str = "INFO"

    postgres_dsn: str = "postgresql+asyncpg://newell:newell@localhost:5432/newell"
    redis_url: str = "redis://localhost:6379/0"
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "newell"
    minio_secret_key: str = "newell-secret"


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 5: Install packages editable and run tests to verify they pass**

Run: `pip install -e ./libs/newell_common && pytest tests/common/test_config.py -v`
Expected: PASS (3 passed)

- [ ] **Step 6: Commit**

```bash
git add pyproject.toml .gitignore libs/newell_common tests/common/test_config.py
git commit -m "chore: repo tooling + newell_common config module"
```

---

### Task 2: Structured JSON logging

**Files:**
- Create: `libs/newell_common/src/newell_common/logging.py`
- Test: `tests/common/test_logging.py`

**Interfaces:**
- Consumes: `newell_common.config.get_settings`.
- Produces:
  - `newell_common.logging.configure_logging(level: str | None = None) -> None`
  - `newell_common.logging.get_logger(name: str) -> logging.Logger`
  - Log records are emitted as single-line JSON with keys: `timestamp`, `level`, `logger`, `message`, plus any `extra` fields.

- [ ] **Step 1: Write the failing test**

```python
# tests/common/test_logging.py
import json
import logging

from newell_common.logging import configure_logging, get_logger


def test_logger_emits_json(capsys):
    configure_logging("INFO")
    log = get_logger("test.logger")
    log.info("hello", extra={"request_id": "abc123"})
    out = capsys.readouterr().out.strip().splitlines()[-1]
    record = json.loads(out)
    assert record["level"] == "INFO"
    assert record["logger"] == "test.logger"
    assert record["message"] == "hello"
    assert record["request_id"] == "abc123"
    assert "timestamp" in record


def test_configure_logging_sets_level():
    configure_logging("DEBUG")
    assert logging.getLogger().level == logging.DEBUG
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/common/test_logging.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'newell_common.logging'` (or ImportError)

- [ ] **Step 3: Write the implementation**

```python
# libs/newell_common/src/newell_common/logging.py
import json
import logging
import sys
from datetime import datetime, timezone

from newell_common.config import get_settings

_RESERVED = set(
    logging.LogRecord("", 0, "", 0, "", (), None).__dict__.keys()
) | {"message", "asctime"}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.fromtimestamp(
                record.created, tz=timezone.utc
            ).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key, value in record.__dict__.items():
            if key not in _RESERVED and not key.startswith("_"):
                payload[key] = value
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def configure_logging(level: str | None = None) -> None:
    resolved = (level or get_settings().log_level).upper()
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(resolved)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/common/test_logging.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add libs/newell_common/src/newell_common/logging.py tests/common/test_logging.py
git commit -m "feat: structured JSON logging in newell_common"
```

---

### Task 3: Typed error envelope + FastAPI handler

**Files:**
- Create: `libs/newell_common/src/newell_common/errors.py`
- Create: `libs/newell_common/src/newell_common/health.py`
- Test: `tests/common/test_errors.py`

**Interfaces:**
- Consumes: nothing (FastAPI imported lazily inside the handler registrar).
- Produces:
  - `newell_common.errors.NewellError(code: str, message: str, status_code: int = 400, details: dict | None = None)` with `.to_envelope() -> dict` returning `{"error": {"code", "message", "details"}}`.
  - `newell_common.errors.NotFoundError(message, details=None)` — subclass, status 404, code `"not_found"`.
  - `newell_common.errors.install_error_handlers(app) -> None` — registers a handler that renders `NewellError` as JSON with its `status_code`.
  - `newell_common.health.health_payload(service_name: str) -> dict` → `{"status": "ok", "service": service_name}`.

- [ ] **Step 1: Write the failing test**

```python
# tests/common/test_errors.py
from fastapi import FastAPI
from fastapi.testclient import TestClient

from newell_common.errors import NewellError, NotFoundError, install_error_handlers
from newell_common.health import health_payload


def test_envelope_shape():
    err = NewellError("bad_input", "nope", status_code=422, details={"field": "x"})
    assert err.to_envelope() == {
        "error": {"code": "bad_input", "message": "nope", "details": {"field": "x"}}
    }


def test_not_found_defaults():
    err = NotFoundError("missing")
    assert err.status_code == 404
    assert err.code == "not_found"


def test_handler_renders_envelope():
    app = FastAPI()
    install_error_handlers(app)

    @app.get("/boom")
    def boom():
        raise NotFoundError("plant missing", details={"id": 7})

    client = TestClient(app)
    resp = client.get("/boom")
    assert resp.status_code == 404
    assert resp.json() == {
        "error": {"code": "not_found", "message": "plant missing", "details": {"id": 7}}
    }


def test_health_payload():
    assert health_payload("gateway") == {"status": "ok", "service": "gateway"}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/common/test_errors.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'newell_common.errors'`

- [ ] **Step 3: Write the implementations**

```python
# libs/newell_common/src/newell_common/errors.py
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
```

```python
# libs/newell_common/src/newell_common/health.py
def health_payload(service_name: str) -> dict:
    return {"status": "ok", "service": service_name}
```

- [ ] **Step 4: Install FastAPI test deps and run tests**

Run: `pip install "fastapi>=0.110" "httpx>=0.27" && pytest tests/common/test_errors.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add libs/newell_common/src/newell_common/errors.py libs/newell_common/src/newell_common/health.py tests/common/test_errors.py
git commit -m "feat: typed error envelope + health payload helper"
```

---

### Task 4: API gateway skeleton (app factory, health, correlation id)

**Files:**
- Create: `services/gateway/pyproject.toml`
- Create: `services/gateway/src/gateway/__init__.py`
- Create: `services/gateway/src/gateway/middleware.py`
- Create: `services/gateway/src/gateway/main.py`
- Test: `tests/gateway/test_health.py`

**Interfaces:**
- Consumes: `newell_common.health.health_payload`, `newell_common.errors.install_error_handlers`, `newell_common.logging.configure_logging`.
- Produces:
  - `gateway.middleware.RequestIdMiddleware` — Starlette `BaseHTTPMiddleware`; reads incoming `X-Request-ID` or generates a uuid4 hex; sets it on `request.state.request_id` and the response `X-Request-ID` header.
  - `gateway.main.create_app() -> FastAPI` — app factory with middleware, error handlers, and `GET /healthz`.
  - `gateway.main.app` — module-level app instance for Uvicorn (`gateway.main:app`).

- [ ] **Step 1: Write the failing test**

```python
# tests/gateway/test_health.py
from fastapi.testclient import TestClient

from gateway.main import create_app


def test_healthz_ok():
    client = TestClient(create_app())
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "service": "gateway"}


def test_healthz_sets_request_id_header():
    client = TestClient(create_app())
    resp = client.get("/healthz")
    assert resp.headers.get("X-Request-ID")


def test_healthz_echoes_incoming_request_id():
    client = TestClient(create_app())
    resp = client.get("/healthz", headers={"X-Request-ID": "fixed-123"})
    assert resp.headers["X-Request-ID"] == "fixed-123"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/gateway/test_health.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'gateway'`

- [ ] **Step 3: Create the gateway package files**

```toml
# services/gateway/pyproject.toml
[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[project]
name = "newell-gateway"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "newell-common",
    "fastapi>=0.110",
    "uvicorn[standard]>=0.29",
]

[tool.setuptools.packages.find]
where = ["src"]
```

```python
# services/gateway/src/gateway/__init__.py
```

```python
# services/gateway/src/gateway/middleware.py
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

REQUEST_ID_HEADER = "X-Request-ID"


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get(REQUEST_ID_HEADER) or uuid.uuid4().hex
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers[REQUEST_ID_HEADER] = request_id
        return response
```

```python
# services/gateway/src/gateway/main.py
from fastapi import FastAPI

from newell_common.errors import install_error_handlers
from newell_common.health import health_payload
from newell_common.logging import configure_logging

from gateway.middleware import RequestIdMiddleware

SERVICE_NAME = "gateway"


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(title="Newell API Gateway", version="0.1.0")
    app.add_middleware(RequestIdMiddleware)
    install_error_handlers(app)

    @app.get("/healthz")
    def healthz() -> dict:
        return health_payload(SERVICE_NAME)

    return app


app = create_app()
```

- [ ] **Step 4: Install gateway editable and run tests to verify they pass**

Run: `pip install -e ./services/gateway && pytest tests/gateway/test_health.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add services/gateway tests/gateway/test_health.py
git commit -m "feat: API gateway skeleton with health + correlation id"
```

---

### Task 5: Gateway Dockerfile + docker-compose stack + env example

**Files:**
- Create: `services/gateway/Dockerfile`
- Create: `infra/docker-compose.yml`
- Create: `infra/.env.example`

**Interfaces:**
- Consumes: `gateway.main:app` (Uvicorn entrypoint), `newell_common` package.
- Produces: a running stack — `postgres`, `redis`, `minio`, `gateway` — where `GET http://localhost:8080/healthz` returns `{"status":"ok","service":"gateway"}`.

- [ ] **Step 1: Write the gateway Dockerfile**

```dockerfile
# services/gateway/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install shared lib first (better layer caching)
COPY libs/newell_common /app/libs/newell_common
RUN pip install --no-cache-dir -e /app/libs/newell_common

COPY services/gateway /app/services/gateway
RUN pip install --no-cache-dir -e /app/services/gateway

EXPOSE 8080
CMD ["uvicorn", "gateway.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

- [ ] **Step 2: Write the env example**

```dotenv
# infra/.env.example — copy to infra/.env for local dev
NEWELL_ENV=local
NEWELL_LOG_LEVEL=INFO

# Postgres
POSTGRES_USER=newell
POSTGRES_PASSWORD=newell
POSTGRES_DB=newell
NEWELL_POSTGRES_DSN=postgresql+asyncpg://newell:newell@postgres:5432/newell

# Redis
NEWELL_REDIS_URL=redis://redis:6379/0

# MinIO
MINIO_ROOT_USER=newell
MINIO_ROOT_PASSWORD=newell-secret
NEWELL_MINIO_ENDPOINT=minio:9000
NEWELL_MINIO_ACCESS_KEY=newell
NEWELL_MINIO_SECRET_KEY=newell-secret
```

- [ ] **Step 3: Write docker-compose**

```yaml
# infra/docker-compose.yml
name: newell

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-newell}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-newell}
      POSTGRES_DB: ${POSTGRES_DB:-newell}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-newell}"]
      interval: 5s
      timeout: 3s
      retries: 10

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-newell}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-newell-secret}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - miniodata:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 3s
      retries: 10

  gateway:
    build:
      context: ..
      dockerfile: services/gateway/Dockerfile
    env_file:
      - .env
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "python -c \"import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8080/healthz').status==200 else 1)\""]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  pgdata:
  miniodata:
```

- [ ] **Step 4: Validate compose config**

Run: `cp infra/.env.example infra/.env && docker compose -f infra/docker-compose.yml config -q && echo VALID`
Expected: prints `VALID` (no schema errors)

- [ ] **Step 5: Boot the stack and verify gateway health**

Run: `docker compose -f infra/docker-compose.yml up -d --build`
Then: `curl -s http://localhost:8080/healthz`
Expected: `{"status":"ok","service":"gateway"}`

- [ ] **Step 6: Tear down**

Run: `docker compose -f infra/docker-compose.yml down`
Expected: all four containers removed

- [ ] **Step 7: Commit**

```bash
git add services/gateway/Dockerfile infra/docker-compose.yml infra/.env.example
git commit -m "feat: docker-compose stack (postgres, redis, minio, gateway)"
```

---

### Task 6: CI pipeline + README

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `README.md`

**Interfaces:**
- Consumes: all prior tasks (installs packages, runs ruff + pytest).
- Produces: a GitHub Actions workflow that lints and tests on push/PR; a README with setup + run instructions.

- [ ] **Step 1: Write the CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install
        run: |
          python -m pip install --upgrade pip
          pip install ruff pytest "httpx>=0.27"
          pip install -e ./libs/newell_common
          pip install -e ./services/gateway
      - name: Lint
        run: |
          ruff check .
          ruff format --check .
      - name: Test
        run: pytest -v
```

- [ ] **Step 2: Write the README**

```markdown
# Newell

Mobile-first, AI-powered guidance for planting trees, building/designing homes,
interior design, and daily-life problems.

See the design spec: `docs/superpowers/specs/2026-07-12-newell-platform-design.md`.

## Prerequisites
- Python 3.12+
- Docker + Docker Compose

## Local development (no Docker)
```bash
pip install ruff pytest httpx
pip install -e ./libs/newell_common
pip install -e ./services/gateway
pytest -v          # run tests
ruff check .       # lint
```

## Run the full stack
```bash
cp infra/.env.example infra/.env
docker compose -f infra/docker-compose.yml up -d --build
curl http://localhost:8080/healthz    # {"status":"ok","service":"gateway"}
docker compose -f infra/docker-compose.yml down
```

## Layout
- `libs/newell_common` — shared config, logging, errors, health
- `services/gateway` — API gateway (entry point for the mobile app)
- `infra/` — docker-compose + env example
- `docs/` — specs and plans
```

- [ ] **Step 3: Verify lint + full test suite pass locally**

Run: `ruff check . && ruff format --check . && pytest -v`
Expected: ruff passes; all tests from Tasks 1–4 PASS

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml README.md
git commit -m "chore: CI pipeline (ruff + pytest) and README"
```

---

## Self-Review

**1. Spec coverage (P0 slice of the platform spec):**
- Monorepo layout (spec §8) → Tasks 1–6 create `libs/`, `services/`, `infra/`, `.github/`, `docs/`. ✅
- Shared libs: config, logging, errors (spec §7) → Tasks 1–3. ✅ (db/base-repo/i18n deferred to P1 where first consumed — YAGNI.)
- Postgres + MinIO + Redis + gateway via `docker-compose up` (spec §2, P0 done-criteria) → Task 5. ✅
- Gateway skeleton with correlation-id logging + typed error envelope (spec §4, §7) → Tasks 3–4. ✅
- CI: lint + test + build (spec §7, §9 P0) → Task 6 (lint+test; image build validated in Task 5). ✅
- Structured JSON logging, error envelope, `NEWELL_` prefix (Global Constraints) → Tasks 1–3. ✅

**2. Placeholder scan:** No TBD/TODO; every code step contains complete, runnable code; every test step has real assertions. ✅

**3. Type consistency:** `get_settings`/`Settings` (Task 1) used in Task 2; `install_error_handlers`, `health_payload` (Task 3) used in Task 4; `RequestIdMiddleware`/`create_app`/`app` names consistent between Task 4 code and Task 5 Dockerfile (`gateway.main:app`) and compose. ✅

**Out of scope for P0 (correctly deferred):** DB models/migrations, base repository, i18n catalogs, auth — all land in P1 where they are first used.
