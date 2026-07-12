# Newell P1 — Auth + Profile + Web Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a working end-to-end phone-OTP login: a Flutter-less **web frontend** (Vite + React + Tailwind + Framer Motion) drives phone → OTP → profile against **Auth** and **Profile** FastAPI services behind the gateway, with JWT access + rotating refresh, Postgres persistence, and bn/en i18n.

**Architecture:** Two new FastAPI services (`auth`, `profile`) join the gateway. Shared DB/i18n/security helpers move into `newell_common`. OTP delivery and OAuth sit behind provider interfaces (mock SMS now; Google/email deferred). The gateway verifies JWTs and reverse-proxies `/auth/*` and `/profile/*`. A `web/` React app calls the gateway. Everything runs via `docker-compose up` (backend) + `npm run dev` (frontend).

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2 (async) + asyncpg, Alembic, PyJWT, passlib[bcrypt], pytest + httpx; React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion + Axios.

## Global Constraints

- Python **3.12+**; all packages `src/`-layout, installed editable.
- Config via `newell_common.config.Settings` (prefix **`NEWELL_`**) only; never read env directly.
- Structured JSON logs (`newell_common.logging`); error envelope **`{"error":{"code","message","details"}}`**.
- JWT: **HS256**, access token TTL **15 min**, refresh token TTL **30 days**, refresh tokens **rotate** on use (old one revoked) and are **stored hashed** in Postgres.
- OTP: **6 digits**, TTL **5 min**, max **5 verify attempts**, delivered via `SmsProvider`; the **MockSmsProvider logs** `OTP for <phone>: <code>` at INFO and never sends real SMS.
- Passwords (when used later): **bcrypt** via passlib; never store plaintext.
- Locales: exactly **`en`** and **`bn`**; default **`en`**; profile stores `locale`.
- All API errors use the envelope; all DB access goes through a repository class.
- Tests use pytest; async tests via `pytest-asyncio`; DB tests run against the compose Postgres or an ephemeral test schema — never mock the DB driver.
- Frontend: TypeScript strict; Tailwind for all styling (no inline style objects except dynamic values); Framer Motion for screen/element transitions; no secrets in frontend code (talks only to the gateway base URL from env).
- Do **not** git commit (the human commits manually).

---

## File Structure

```
libs/newell_common/src/newell_common/
├── db.py             # async engine + session factory + declarative Base + get_session dep
├── repository.py     # BaseRepository[ModelT] (get/list/add/delete helpers)
├── i18n.py           # translate(key, locale) loading locales/*.json
└── security.py       # create_access_token, create_refresh_token, decode_token, hash_token
locales/
├── en.json
└── bn.json
services/auth/
├── pyproject.toml · Dockerfile · alembic.ini
├── alembic/env.py · alembic/versions/0001_init.py
└── src/auth/
    ├── main.py       # app factory
    ├── models.py     # User, OtpCode, RefreshToken (SQLAlchemy)
    ├── schemas.py    # pydantic DTOs
    ├── sms.py        # SmsProvider protocol + MockSmsProvider
    ├── repositories.py
    ├── service.py    # request_otp / verify_otp / refresh / logout
    ├── deps.py       # settings, session, provider wiring
    └── routes.py     # /auth/* endpoints
services/profile/
├── pyproject.toml · Dockerfile
└── src/profile/
    ├── main.py · models.py · schemas.py · repositories.py · service.py · deps.py · routes.py
services/gateway/src/gateway/
├── auth_dep.py       # verify JWT -> current user id
└── proxy.py          # reverse-proxy /auth/* and /profile/* to services
web/
├── package.json · vite.config.ts · tsconfig.json · tailwind.config.js · postcss.config.js
├── index.html · .env.example
└── src/
    ├── main.tsx · App.tsx · api.ts · theme.css
    ├── auth.tsx      # token storage + context
    └── screens/ PhoneScreen.tsx · OtpScreen.tsx · ProfileScreen.tsx
tests/
├── common/ test_i18n.py · test_security.py
├── auth/ test_otp_flow.py · test_refresh.py
└── profile/ test_profile.py
infra/docker-compose.yml   # add auth, profile, migrate one-shot
```

---

### Task 1: DB layer + BaseRepository in newell_common

**Files:**
- Create: `libs/newell_common/src/newell_common/db.py`, `libs/newell_common/src/newell_common/repository.py`
- Test: `tests/common/test_repository.py`

**Interfaces:**
- Produces:
  - `newell_common.db.Base` — SQLAlchemy `DeclarativeBase`.
  - `newell_common.db.make_engine(dsn: str) -> AsyncEngine`, `make_session_factory(engine) -> async_sessionmaker[AsyncSession]`.
  - `newell_common.db.SessionFactory` type alias.
  - `newell_common.repository.BaseRepository(session: AsyncSession, model)` with async `get(id)`, `list()`, `add(obj) -> obj`, `delete(obj)`; `add` flushes so PKs populate.

- [ ] **Step 1: Write failing test** (uses an in-memory SQLite async engine to stay hermetic; a throwaway model)

```python
# tests/common/test_repository.py
import pytest
import pytest_asyncio
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from newell_common.db import Base, make_engine, make_session_factory
from newell_common.repository import BaseRepository


class Widget(Base):
    __tablename__ = "widgets"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))


@pytest_asyncio.fixture
async def session():
    engine = make_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = make_session_factory(engine)
    async with factory() as s:
        yield s
    await engine.dispose()


@pytest.mark.asyncio
async def test_add_populates_pk_and_get(session):
    repo = BaseRepository(session, Widget)
    saved = await repo.add(Widget(name="hi"))
    assert saved.id is not None
    fetched = await repo.get(saved.id)
    assert fetched.name == "hi"


@pytest.mark.asyncio
async def test_list_returns_all(session):
    repo = BaseRepository(session, Widget)
    await repo.add(Widget(name="a"))
    await repo.add(Widget(name="b"))
    assert len(await repo.list()) == 2
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/Scripts/python.exe -m pip install "sqlalchemy>=2.0" aiosqlite pytest-asyncio && .venv/Scripts/python.exe -m pytest tests/common/test_repository.py -v`
Expected: FAIL — `ModuleNotFoundError: newell_common.db`

- [ ] **Step 3: Implement db.py**

```python
# libs/newell_common/src/newell_common/db.py
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


SessionFactory = async_sessionmaker[AsyncSession]


def make_engine(dsn: str) -> AsyncEngine:
    return create_async_engine(dsn, pool_pre_ping=True, future=True)


def make_session_factory(engine: AsyncEngine) -> SessionFactory:
    return async_sessionmaker(engine, expire_on_commit=False)


async def session_dependency(factory: SessionFactory) -> AsyncIterator[AsyncSession]:
    async with factory() as session:
        yield session
```

- [ ] **Step 4: Implement repository.py**

```python
# libs/newell_common/src/newell_common/repository.py
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class BaseRepository:
    def __init__(self, session: AsyncSession, model: type) -> None:
        self.session = session
        self.model = model

    async def get(self, id_: object):
        return await self.session.get(self.model, id_)

    async def list(self) -> Sequence:
        result = await self.session.execute(select(self.model))
        return result.scalars().all()

    async def add(self, obj):
        self.session.add(obj)
        await self.session.flush()
        return obj

    async def delete(self, obj) -> None:
        await self.session.delete(obj)
        await self.session.flush()
```

- [ ] **Step 5: Run tests to pass**

Run: `.venv/Scripts/python.exe -m pytest tests/common/test_repository.py -v`
Expected: PASS (2 passed)

- [ ] **Step 6:** (No commit — human commits.)

---

### Task 2: i18n loader + bn/en catalogs

**Files:**
- Create: `libs/newell_common/src/newell_common/i18n.py`, `locales/en.json`, `locales/bn.json`
- Modify: `libs/newell_common/src/newell_common/config.py` — add `locales_dir: str = "locales"` and `default_locale: str = "en"`.
- Test: `tests/common/test_i18n.py`

**Interfaces:**
- Produces: `newell_common.i18n.translate(key: str, locale: str = "en") -> str` — returns the message for `key` in `locale`, falling back to `en`, then to the key itself. Catalogs loaded once and cached.

- [ ] **Step 1: Write failing test**

```python
# tests/common/test_i18n.py
from newell_common.i18n import translate


def test_translate_en():
    assert translate("otp.sent", "en") == "Verification code sent."


def test_translate_bn():
    assert translate("otp.sent", "bn") == "যাচাই কোড পাঠানো হয়েছে।"


def test_unknown_locale_falls_back_to_en():
    assert translate("otp.sent", "xx") == "Verification code sent."


def test_unknown_key_returns_key():
    assert translate("does.not.exist", "en") == "does.not.exist"
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/Scripts/python.exe -m pytest tests/common/test_i18n.py -v`
Expected: FAIL — `ModuleNotFoundError: newell_common.i18n`

- [ ] **Step 3: Create catalogs**

```json
// locales/en.json
{
  "otp.sent": "Verification code sent.",
  "otp.invalid": "Invalid or expired code.",
  "otp.too_many": "Too many attempts. Request a new code.",
  "auth.unauthorized": "Not authenticated.",
  "profile.updated": "Profile updated."
}
```

```json
// locales/bn.json
{
  "otp.sent": "যাচাই কোড পাঠানো হয়েছে।",
  "otp.invalid": "কোডটি ভুল বা মেয়াদোত্তীর্ণ।",
  "otp.too_many": "অনেকবার চেষ্টা হয়েছে। নতুন কোড নিন।",
  "auth.unauthorized": "প্রমাণীকরণ করা হয়নি।",
  "profile.updated": "প্রোফাইল হালনাগাদ হয়েছে।"
}
```

- [ ] **Step 4: Implement i18n.py**

```python
# libs/newell_common/src/newell_common/i18n.py
import json
from functools import lru_cache
from pathlib import Path

from newell_common.config import get_settings

_DEFAULT = "en"


@lru_cache
def _catalog(locale: str) -> dict[str, str]:
    root = Path(get_settings().locales_dir)
    path = root / f"{locale}.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def translate(key: str, locale: str = _DEFAULT) -> str:
    for loc in (locale, _DEFAULT):
        value = _catalog(loc).get(key)
        if value is not None:
            return value
    return key
```

- [ ] **Step 5: Add config fields** — add to `Settings`: `locales_dir: str = "locales"` and `default_locale: str = "en"`.

- [ ] **Step 6: Run tests to pass**

Run: `.venv/Scripts/python.exe -m pytest tests/common/test_i18n.py -v`
Expected: PASS (4 passed). Run from repo root so `locales/` resolves.

- [ ] **Step 7:** (No commit.)

---

### Task 3: JWT + token-hash security helpers

**Files:**
- Create: `libs/newell_common/src/newell_common/security.py`
- Modify: `config.py` — add `jwt_secret: str = "dev-insecure-secret-change-me"`, `jwt_algorithm: str = "HS256"`, `access_ttl_seconds: int = 900`, `refresh_ttl_seconds: int = 2592000`.
- Test: `tests/common/test_security.py`

**Interfaces:**
- Produces:
  - `create_access_token(subject: str) -> str`
  - `create_refresh_token() -> tuple[str, str]` → `(raw_token, sha256_hex)` (store the hash, hand the client the raw).
  - `decode_token(token: str) -> dict` → claims; raises `newell_common.errors.NewellError("auth.unauthorized", ..., status_code=401)` on invalid/expired.
  - `hash_token(raw: str) -> str` — sha256 hex.

- [ ] **Step 1: Write failing test**

```python
# tests/common/test_security.py
import pytest

from newell_common.errors import NewellError
from newell_common.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token,
)


def test_access_token_roundtrip():
    token = create_access_token("user-123")
    claims = decode_token(token)
    assert claims["sub"] == "user-123"
    assert claims["type"] == "access"


def test_refresh_token_returns_raw_and_hash():
    raw, hashed = create_refresh_token()
    assert raw and hashed
    assert hash_token(raw) == hashed
    assert raw != hashed


def test_invalid_token_raises_401():
    with pytest.raises(NewellError) as exc:
        decode_token("not-a-jwt")
    assert exc.value.status_code == 401
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/Scripts/python.exe -m pip install pyjwt "passlib[bcrypt]" && .venv/Scripts/python.exe -m pytest tests/common/test_security.py -v`
Expected: FAIL — `ModuleNotFoundError: newell_common.security`

- [ ] **Step 3: Implement security.py**

```python
# libs/newell_common/src/newell_common/security.py
import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import jwt

from newell_common.config import get_settings
from newell_common.errors import NewellError


def _now() -> datetime:
    return datetime.now(UTC)


def create_access_token(subject: str) -> str:
    s = get_settings()
    payload = {
        "sub": subject,
        "type": "access",
        "iat": _now(),
        "exp": _now() + timedelta(seconds=s.access_ttl_seconds),
    }
    return jwt.encode(payload, s.jwt_secret, algorithm=s.jwt_algorithm)


def create_refresh_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(48)
    return raw, hash_token(raw)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def decode_token(token: str) -> dict:
    s = get_settings()
    try:
        return jwt.decode(token, s.jwt_secret, algorithms=[s.jwt_algorithm])
    except jwt.PyJWTError as exc:
        raise NewellError(
            "auth.unauthorized", "Not authenticated.", status_code=401
        ) from exc
```

- [ ] **Step 4: Add config fields** (see Files above).

- [ ] **Step 5: Run tests to pass**

Run: `.venv/Scripts/python.exe -m pytest tests/common/test_security.py -v`
Expected: PASS (3 passed)

- [ ] **Step 6:** (No commit.)

---

### Task 4: Auth service — models, migration, OTP request/verify

**Files:**
- Create: `services/auth/pyproject.toml`, `services/auth/src/auth/{__init__,main,models,schemas,sms,repositories,deps,routes,service}.py`, `services/auth/alembic.ini`, `services/auth/alembic/env.py`, `services/auth/alembic/versions/0001_init.py`
- Test: `tests/auth/test_otp_flow.py`

**Interfaces (produced):**
- Models: `User(id: uuid, phone: str unique, locale: str, created_at)`, `OtpCode(id, phone, code_hash, expires_at, attempts, consumed)`, `RefreshToken(id, user_id fk, token_hash unique, expires_at, revoked)`.
- `sms.SmsProvider` protocol with `send(phone: str, message: str) -> None`; `sms.MockSmsProvider` logs the message at INFO.
- `service.AuthService.request_otp(phone) -> None`, `verify_otp(phone, code) -> TokenPair` where `TokenPair = {"access_token","refresh_token","user_id"}`.
- Routes: `POST /auth/otp/request {phone}` → 200 `{"message": translate("otp.sent", locale)}`; `POST /auth/otp/verify {phone, code}` → 200 `{"access_token","refresh_token","token_type":"bearer","user_id"}`; invalid → 400 `otp.invalid`; >5 attempts → 429 `otp.too_many`.

Detailed model + service + route code, the mock SMS provider, and the Alembic init migration are specified in full in the task brief (`scripts/task-brief` extracts them). Key rules the implementer MUST follow: OTP is 6 digits from `secrets.randbelow`, stored **hashed** (`hash_token`), TTL 5 min, attempts capped at 5, consumed on success; on verify success a `User` is created if the phone is new (locale defaults to `en`), and a `RefreshToken` row is persisted (hash only).

- [ ] **Step 1: Write failing integration test** (async, against compose Postgres via `NEWELL_POSTGRES_DSN`; the test requests an OTP, reads the code from the mock provider's captured message, verifies, and asserts tokens are returned).

```python
# tests/auth/test_otp_flow.py
import pytest
from httpx import ASGITransport, AsyncClient

from auth.deps import get_sms_provider
from auth.main import create_app
from auth.sms import CapturingSmsProvider  # test double capturing sent messages


@pytest.mark.asyncio
async def test_request_then_verify_returns_tokens():
    app = create_app()
    sms = CapturingSmsProvider()
    app.dependency_overrides[get_sms_provider] = lambda: sms
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r1 = await c.post("/auth/otp/request", json={"phone": "+8801700000000"})
        assert r1.status_code == 200
        code = sms.last_code()  # parses the 6-digit code from the captured message
        r2 = await c.post(
            "/auth/otp/verify", json={"phone": "+8801700000000", "code": code}
        )
        assert r2.status_code == 200
        body = r2.json()
        assert body["access_token"] and body["refresh_token"]
        assert body["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_wrong_code_is_400():
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        await c.post("/auth/otp/request", json={"phone": "+8801700000001"})
        r = await c.post(
            "/auth/otp/verify", json={"phone": "+8801700000001", "code": "000000"}
        )
        assert r.status_code == 400
        assert r.json()["error"]["code"] == "otp.invalid"
```

- [ ] **Step 2: Run to verify it fails** — `ModuleNotFoundError: auth`.
- [ ] **Step 3: Implement** models, schemas, sms (incl. `CapturingSmsProvider` test double that stores messages and exposes `last_code()`), repositories, service, deps, routes, main — per the brief's full code.
- [ ] **Step 4: Create Alembic migration** `0001_init` creating the three tables; wire `alembic/env.py` to `newell_common.db.Base.metadata` and `NEWELL_POSTGRES_DSN` (sync driver for migrations: `postgresql://`).
- [ ] **Step 5: Run migration against compose Postgres, then run tests to pass.**

Run (Postgres must be up via compose): `.venv/Scripts/python.exe -m pytest tests/auth/test_otp_flow.py -v`
Expected: PASS (2 passed)

- [ ] **Step 6:** (No commit.)

---

### Task 5: Auth service — refresh rotation + logout

**Files:**
- Modify: `services/auth/src/auth/{service,routes,schemas}.py`
- Test: `tests/auth/test_refresh.py`

**Interfaces (produced):**
- `POST /auth/refresh {refresh_token}` → new `{access_token, refresh_token}`; the presented refresh token is looked up by `hash_token`, must be un-revoked and unexpired; on success it is **revoked** and a **new** refresh row is issued (rotation). Reusing a revoked token → 401 `auth.unauthorized`.
- `POST /auth/logout {refresh_token}` → 204; marks the token revoked.

- [ ] **Step 1: Write failing test** (verify → refresh → old refresh now rejected; new one works).

```python
# tests/auth/test_refresh.py
import pytest
from httpx import ASGITransport, AsyncClient

from auth.deps import get_sms_provider
from auth.main import create_app
from auth.sms import CapturingSmsProvider


@pytest.mark.asyncio
async def test_refresh_rotates_and_old_token_revoked():
    app = create_app()
    sms = CapturingSmsProvider()
    app.dependency_overrides[get_sms_provider] = lambda: sms
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as c:
        await c.post("/auth/otp/request", json={"phone": "+8801700000002"})
        v = await c.post(
            "/auth/otp/verify",
            json={"phone": "+8801700000002", "code": sms.last_code()},
        )
        old_refresh = v.json()["refresh_token"]
        r = await c.post("/auth/refresh", json={"refresh_token": old_refresh})
        assert r.status_code == 200
        new_refresh = r.json()["refresh_token"]
        assert new_refresh != old_refresh
        reuse = await c.post("/auth/refresh", json={"refresh_token": old_refresh})
        assert reuse.status_code == 401
```

- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** refresh + logout in service/routes/schemas per brief.
- [ ] **Step 4: Run tests to pass.**
- [ ] **Step 5:** (No commit.)

---

### Task 6: Profile service (get/update, locale)

**Files:**
- Create: `services/profile/pyproject.toml`, `services/profile/Dockerfile`, `services/profile/src/profile/{__init__,main,models,schemas,repositories,service,deps,routes}.py`
- Test: `tests/profile/test_profile.py`

**Interfaces (produced):**
- Reuses the `User` row (auth owns creation). Profile stores extra fields on a `profiles` table: `Profile(user_id pk/fk, display_name: str|None, locale: str, updated_at)`. Migration for `profiles` added to auth's Alembic chain as `0002_profiles` (single migration history for the shared DB).
- `GET /profile/me` (requires `X-User-Id` header injected by the gateway) → `{user_id, display_name, locale}`; auto-creates a default profile row (locale `en`) if none.
- `PATCH /profile/me {display_name?, locale?}` → updated profile; `locale` must be `en` or `bn` else 400.

- [ ] **Step 1: Write failing test** (get creates default; patch updates display_name + locale; invalid locale rejected). Full test code in brief.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** models/schemas/repo/service/deps/routes/main + `0002_profiles` migration.
- [ ] **Step 4: Run migration + tests to pass.**
- [ ] **Step 5:** (No commit.)

---

### Task 7: Gateway — JWT verification + reverse proxy

**Files:**
- Create: `services/gateway/src/gateway/auth_dep.py`, `services/gateway/src/gateway/proxy.py`
- Modify: `services/gateway/src/gateway/main.py` (mount proxy routes), `services/gateway/pyproject.toml` (add `httpx`)
- Test: `tests/gateway/test_proxy.py`

**Interfaces (produced):**
- `auth_dep.current_user_id(authorization: str = Header(...)) -> str` — parses `Bearer <jwt>`, calls `decode_token`, returns `sub`; missing/invalid → 401 envelope.
- `proxy.py` mounts: `/auth/*` forwarded to `NEWELL_AUTH_URL` **without** auth (login is public); `/profile/*` forwarded to `NEWELL_PROFILE_URL` **with** `current_user_id`, injecting header `X-User-Id`. Uses a shared `httpx.AsyncClient`; preserves method, JSON body, status, and the `X-Request-ID` correlation header.
- Config additions: `auth_url: str = "http://auth:8000"`, `profile_url: str = "http://profile:8000"`.

- [ ] **Step 1: Write failing test** — a protected `/profile/me` without a token → 401; with a valid access token the proxy injects `X-User-Id` (assert against a stub upstream mounted in the test). Full code in brief.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** auth_dep + proxy; wire into `create_app`.
- [ ] **Step 4: Run tests to pass.**
- [ ] **Step 5:** (No commit.)

---

### Task 8: Compose — auth, profile, migration one-shot

**Files:**
- Create: `services/auth/Dockerfile` (if not from Task 4)
- Modify: `infra/docker-compose.yml` (add `auth`, `profile`, and a `migrate` one-shot that runs Alembic before the services start), `infra/.env.example` (add `NEWELL_JWT_SECRET`, `NEWELL_AUTH_URL`, `NEWELL_PROFILE_URL`)
- Modify: `services/gateway/Dockerfile` (copy `locales/` into the image for i18n)

**Interfaces (produced):** `docker compose up` boots postgres → runs `migrate` (Alembic upgrade head) → starts `auth`, `profile`, `gateway`. Health: `GET http://localhost:8080/auth/otp/request` reachable; `migrate` exits 0.

- [ ] **Step 1:** Add a `migrate` service (same auth image, command `alembic upgrade head`, `depends_on: postgres healthy`, `restart: "no"`). Auth/profile `depends_on: migrate completed_successfully`.
- [ ] **Step 2:** Add `auth` and `profile` services (build from their Dockerfiles, `env_file: .env`, expose internally on 8000, no host port needed except optionally auth).
- [ ] **Step 3:** Ensure gateway image includes `locales/`.
- [ ] **Step 4: Validate + boot + smoke test:** `docker compose -f infra/docker-compose.yml config -q`; `up -d --build`; `curl -s -X POST localhost:8080/auth/otp/request -H "Content-Type: application/json" -d '{"phone":"+8801700000000"}'` → 200; read the OTP from `docker compose logs auth`; verify; then `down`.
- [ ] **Step 5:** (No commit.)

---

### Task 9: Web frontend — Vite + React + Tailwind + Framer Motion

**Files:**
- Create: `web/package.json`, `web/vite.config.ts`, `web/tsconfig.json`, `web/tailwind.config.js`, `web/postcss.config.js`, `web/index.html`, `web/.env.example`
- Create: `web/src/main.tsx`, `web/src/App.tsx`, `web/src/theme.css`, `web/src/api.ts`, `web/src/auth.tsx`, `web/src/screens/PhoneScreen.tsx`, `web/src/screens/OtpScreen.tsx`, `web/src/screens/ProfileScreen.tsx`

**Interfaces (produced):**
- `api.ts` exports `requestOtp(phone)`, `verifyOtp(phone, code) -> {access_token, refresh_token}`, `getProfile()`, `updateProfile(patch)`; base URL from `import.meta.env.VITE_GATEWAY_URL` (default `http://localhost:8080`); attaches `Authorization: Bearer` from stored access token.
- `auth.tsx` — React context storing tokens in `localStorage`, `useAuth()`.
- Screen flow: **PhoneScreen** (enter phone → requestOtp → go to OTP) → **OtpScreen** (6-digit input → verifyOtp → store tokens → profile) → **ProfileScreen** (shows user id, editable display name, **bn/en locale toggle**, logout).

**Design bar (non-negotiable — must not look templated):** a distinctive visual identity, not stock Bootstrap. Use a cohesive Tailwind theme (custom color tokens in `tailwind.config.js` — a botanical green/emerald primary with a warm accent, generous spacing, rounded-2xl cards, soft shadows, a subtle gradient backdrop), a real type scale, and **Framer Motion** for: page transitions between screens (slide/fade with `AnimatePresence`), the OTP digit boxes animating on entry, and button press/tap feedback. Dark-mode aware via `prefers-color-scheme`. Full component code is in the task brief; the implementer must match the design bar, not just wire the API.

- [ ] **Step 1:** Scaffold Vite React-TS project files (package.json with react, react-dom, framer-motion, axios; devDeps vite, typescript, tailwindcss, postcss, autoprefixer, @vitejs/plugin-react). Configure Tailwind + the custom theme tokens.
- [ ] **Step 2:** Implement `api.ts`, `auth.tsx`, the three screens, `App.tsx` (AnimatePresence router by state), `main.tsx`, `theme.css` — per brief, meeting the design bar.
- [ ] **Step 3: Verify it builds & type-checks:** `cd web && npm install && npm run build` → succeeds with no TS errors. (A `web/README` note documents `npm run dev`.)
- [ ] **Step 4:** (No commit.)

---

### Task 10: End-to-end wiring + README + .env examples

**Files:**
- Modify: `README.md` (add "Run the app: backend + frontend" section), `web/.env.example`
- Create: `docs/RUNBOOK-p1.md` (step-by-step local test for the human)

- [ ] **Step 1:** Document the full local run: copy envs, `docker compose up` (backend + migrate), `cd web && npm install && npm run dev`, open the printed localhost URL, log in by phone, read OTP from `docker compose logs -f auth`, verify, edit profile, toggle bn/en, logout.
- [ ] **Step 2: Full smoke test** end-to-end by the implementer: boot backend, run frontend dev server, drive the flow with `curl` for the API portion and confirm the built frontend serves. Record the OTP-from-logs step explicitly.
- [ ] **Step 3:** (No commit.)

---

## Self-Review

**1. Spec coverage (P1 slice):**
- Phone-OTP auth, mock SMS, pluggable `SmsProvider` (spec §2 auth) → Tasks 4, 8. ✅
- JWT access + rotating refresh, hashed refresh storage (Global Constraints) → Tasks 3, 5. ✅
- Profile + locale, cloud-synced via DB (spec §3) → Task 6. ✅
- Postgres persistence + repository pattern + migrations (spec §7) → Tasks 1, 4, 6, 8. ✅
- i18n bn/en (spec §5, §7) → Tasks 2, 6, 9 (frontend toggle). ✅
- Gateway as sole entry, JWT verify, mobile/web never hits services directly (spec §3, §4) → Task 7. ✅
- Standout web UI with Tailwind + Framer Motion (user directive) → Task 9. ✅
- Runs via docker-compose + npm dev (spec §2) → Tasks 8, 10. ✅
- Google OAuth + email/password → **explicitly deferred to P1.5** (interfaces present via `SmsProvider`/auth structure); noted, not silently dropped.

**2. Placeholder scan:** Tasks 1–3 and 9 design-bar carry full code; Tasks 4–8 reference the per-task brief for full code (the controller extracts it with `scripts/task-brief`) — the brief is the code source, consistent with how P0 ran. No "TBD"/"add error handling"-style hand-waving; every behavior is specified with exact status codes and error keys.

**3. Type consistency:** `hash_token`/`create_refresh_token`/`decode_token` (Task 3) reused in Tasks 4–5, 7; `BaseRepository` (Task 1) used by auth/profile repos; `translate` (Task 2) used in Tasks 4, 6; `current_user_id` + `X-User-Id` header contract consistent between Task 7 (gateway injects) and Task 6 (profile reads). ✅

**Deferred correctly:** Google OAuth, email/password, Flutter app (P3), admin dashboard (P4), observability stack (P4).
