# Newell P2 — Tree Planting (PlantCare) + Guest Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A working Tree-Planting vertical slice — upload a plant photo, get a (mock) AI diagnosis, see it on a growth timeline — plus a guest/demo mode anyone can try, with signup gating on saving/history/repeat analysis and in-place guest→user migration.

**Architecture:** Three new FastAPI services join the stack: `media` (image upload → MinIO), `ai_gateway` (an `LLMProvider` abstraction with a deterministic `MockProvider` and an in-process PlantDoctor tool), and `plantcare` (plants + timeline, orchestrates analysis, enforces guest gating). Auth gains a guest identity and in-place upgrade. The gateway forwards the new routes and injects `X-User-Id` + `X-User-Role`. The web app gains upload/diagnosis/timeline screens and a guest flow. Analysis is synchronous for this phase.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2 async, MinIO (via `minio` or `boto3`), pytest + httpx; React + TS + Tailwind + Framer Motion (extending `web/`).

## Global Constraints

- Python **3.12+**; `src/`-layout packages installed editable; config via `newell_common.config.Settings` (prefix `NEWELL_`).
- Structured JSON logs; error envelope `{"error":{"code","message","details"}}`.
- JWT carries a **`role`** claim: `"guest"` or `"user"`. `newell_common.security.create_access_token(subject, role)` and the refresh/verify flow must include and preserve it.
- Gateway injects **`X-User-Id`** and **`X-User-Role`** on proxied `/plants/*`, `/media/*` (authenticated) requests; `/auth/*` stays public.
- **Guest limits:** a `role:"guest"` user may own at most **1 plant** and **1 analysis**; exceeding, or calling list/history endpoints, returns **403** envelope code **`signup_required`**.
- **Diagnosis schema** (exact keys): `{"health": str, "growth_stage": str, "pests": list[str], "watering": str, "care_steps": list[str]}`.
- Mock diagnosis is **deterministic** from the image reference (same input → same output).
- Analysis is **synchronous** in this phase (no job queue).
- Tests use pytest; service tests are hermetic (in-memory SQLite session override, mocked object storage / mocked ai_gateway HTTP). Ruff clean; output pristine (`filterwarnings=["error",...]`).
- Frontend: TS strict; Tailwind + Framer Motion; talks only to the gateway via the Vite `/api` proxy.
- Do **not** git commit (the human commits manually).

---

## File Structure

```
libs/newell_common/src/newell_common/security.py   # add role to tokens
services/auth/src/auth/                             # guest endpoint + in-place upgrade
  models.py (User.role, User.phone nullable) · service.py · routes.py · schemas.py
services/media/                                     # NEW
  src/media/{main,models,schemas,storage,deps,routes,service}.py · Dockerfile · pyproject.toml
services/ai_gateway/                                # NEW
  src/ai_gateway/{main,provider,plantdoctor,schemas,deps,routes}.py · Dockerfile · pyproject.toml
services/plantcare/                                 # NEW
  src/plantcare/{main,models,schemas,repositories,service,deps,routes,client}.py · Dockerfile · pyproject.toml
services/gateway/src/gateway/{auth_dep,proxy}.py    # add role + new proxied routes
web/src/                                            # guest button, upload/diagnosis/timeline screens
  api.ts · auth.tsx · screens/GardenScreen.tsx · screens/UploadScreen.tsx · components/DiagnosisCard.tsx · components/SignupGate.tsx
infra/docker-compose.yml                            # add media, ai_gateway, plantcare
tests/{auth,media,ai_gateway,plantcare,gateway,common}/...
```

---

### Task 1: Add `role` to JWTs

**Files:** Modify `libs/newell_common/src/newell_common/security.py`; Test `tests/common/test_security.py` (extend).

**Interfaces (produced):** `create_access_token(subject: str, role: str = "user") -> str` embeds claim `role`; `decode_token` returns it. Backward compatible (default `"user"`).

- [ ] **Step 1: Write failing test** — extend `test_security.py`:

```python
def test_access_token_carries_role():
    from newell_common.security import create_access_token, decode_token
    claims = decode_token(create_access_token("u1", role="guest"))
    assert claims["sub"] == "u1"
    assert claims["role"] == "guest"


def test_access_token_role_defaults_to_user():
    from newell_common.security import create_access_token, decode_token
    assert decode_token(create_access_token("u1"))["role"] == "user"
```

- [ ] **Step 2:** Run `.venv/Scripts/python.exe -m pytest tests/common/test_security.py -v` → new tests FAIL (KeyError 'role').
- [ ] **Step 3:** Add `role: str = "user"` param to `create_access_token`; include `"role": role` in the payload.
- [ ] **Step 4:** Run tests → PASS; run full suite → no regressions.
- [ ] **Step 5:** (No commit.)

---

### Task 2: Auth — guest identity + in-place upgrade on signup

**Files:** Modify `services/auth/src/auth/{models,schemas,service,routes}.py`; Test `tests/auth/test_guest.py`.

**Interfaces (produced):**
- `User.role: str` (default `"user"`), `User.phone: str | None` (nullable, still unique when set).
- `POST /auth/guest` → 200 `{access_token, refresh_token, token_type:"bearer", user_id, role:"guest"}`; creates a guest `User(role="guest", phone=None)`.
- `POST /auth/otp/verify {phone, code, guest_user_id?}` — when `guest_user_id` is supplied and names a `role:"guest"` user AND `phone` is not already taken: **upgrade that row** (set `phone`, `role="user"`) and return tokens for the SAME `user_id`. Otherwise behaves as before (find/create by phone). Response now includes `role`.
- Tokens minted in auth now pass the user's `role` into `create_access_token`.

- [ ] **Step 1: Write failing test** `tests/auth/test_guest.py` (mirror existing auth test fixtures / SQLite override):

```python
import pytest
from httpx import ASGITransport, AsyncClient

from auth.deps import get_sms_provider
from auth.main import create_app
from auth.sms import CapturingSmsProvider


@pytest.mark.asyncio
async def test_guest_login_issues_guest_role():
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r = await c.post("/auth/guest")
        assert r.status_code == 200
        body = r.json()
        assert body["role"] == "guest" and body["access_token"]


@pytest.mark.asyncio
async def test_guest_upgrades_in_place_on_signup():
    app = create_app()
    sms = CapturingSmsProvider()
    app.dependency_overrides[get_sms_provider] = lambda: sms
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        g = (await c.post("/auth/guest")).json()
        guest_id = g["user_id"]
        await c.post("/auth/otp/request", json={"phone": "+8801710000000"})
        v = await c.post(
            "/auth/otp/verify",
            json={"phone": "+8801710000000", "code": sms.last_code(),
                  "guest_user_id": guest_id},
        )
        assert v.status_code == 200
        assert v.json()["user_id"] == guest_id   # same row upgraded
        assert v.json()["role"] == "user"
```

- [ ] **Step 2:** Run `tests/auth/test_guest.py` → FAIL (no `/auth/guest`).
- [ ] **Step 3:** Implement: add `role` (default "user") and make `phone` nullable in `User`; add guest creation + upgrade logic in `service.py`; add `POST /auth/guest` route and `guest_user_id` optional field to the verify schema/route; mint tokens with the user's role. Keep hermetic SQLite create_all working.
- [ ] **Step 4:** Run new tests + full auth suite + full suite → all PASS, pristine, ruff clean.
- [ ] **Step 5:** (No commit.)

---

### Task 3: Media service (upload → MinIO)

**Files:** Create `services/media/**` (`pyproject.toml`, `Dockerfile`, `src/media/{__init__,main,schemas,storage,deps,routes,service}.py`); Test `tests/media/test_upload.py`.

**Interfaces (produced):**
- `storage.ObjectStorage` protocol `put(key: str, data: bytes, content_type: str) -> str` (returns a URL) and `MinioStorage` impl; `InMemoryStorage` test double.
- `POST /media/upload` (multipart `file`) → 200 `{media_id, url, content_type}`; stores under `plants/{uuid}`; rejects non-image content-type with 400 `media.invalid_type`.
- `GET /healthz`.

- [ ] **Step 1: Write failing test** using `InMemoryStorage` override and an `UploadFile`:

```python
import io
import pytest
from httpx import ASGITransport, AsyncClient

from media.deps import get_storage
from media.main import create_app
from media.storage import InMemoryStorage


@pytest.mark.asyncio
async def test_upload_returns_media_id_and_url():
    app = create_app()
    store = InMemoryStorage()
    app.dependency_overrides[get_storage] = lambda: store
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        files = {"file": ("leaf.jpg", io.BytesIO(b"\xff\xd8\xff and bytes"), "image/jpeg")}
        r = await c.post("/media/upload", files=files)
        assert r.status_code == 200
        body = r.json()
        assert body["media_id"] and body["url"]
        assert len(store.items) == 1


@pytest.mark.asyncio
async def test_upload_rejects_non_image():
    app = create_app()
    app.dependency_overrides[get_storage] = lambda: InMemoryStorage()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        files = {"file": ("x.txt", io.BytesIO(b"hi"), "text/plain")}
        r = await c.post("/media/upload", files=files)
        assert r.status_code == 400
        assert r.json()["error"]["code"] == "media.invalid_type"
```

- [ ] **Step 2:** Run → FAIL (no `media`). Install: add `python-multipart`, `minio` to deps.
- [ ] **Step 3:** Implement storage (protocol + `MinioStorage` using the `minio` client, bucket auto-create; `InMemoryStorage` double), routes, deps, main. `MinioStorage` config from settings (`minio_endpoint/access/secret`, bucket `newell-media`). URL returned as `http://<public-endpoint>/<bucket>/<key>` (real reads not needed by the mock AI).
- [ ] **Step 4:** Run tests + full suite → PASS pristine, ruff clean. Add `services/media/src` to root `pyproject.toml` ruff `src` + pytest `pythonpath`.
- [ ] **Step 5:** (No commit.)

---

### Task 4: AI Gateway — LLMProvider abstraction + deterministic PlantDoctor

**Files:** Create `services/ai_gateway/**` (`pyproject.toml`, `Dockerfile`, `src/ai_gateway/{__init__,main,provider,plantdoctor,schemas,deps,routes}.py`); Test `tests/ai_gateway/test_diagnose.py`.

**Interfaces (produced):**
- `schemas.Diagnosis` pydantic model with the exact keys from Global Constraints.
- `provider.LLMProvider` protocol `diagnose_plant(image_ref: str) -> Diagnosis`; `provider.MockProvider` returns a **deterministic** Diagnosis derived from `sha256(image_ref)` (pick health/stage/watering from fixed lists by hash; pests/care_steps assembled deterministically).
- `plantdoctor.analyze(image_ref, provider) -> Diagnosis` — the in-process "tool" wrapper (kept separate so a real MCP server can replace it later).
- `POST /ai/analyze {image_ref, task:"plant_diagnosis"}` → 200 the Diagnosis JSON; unknown task → 400 `ai.unknown_task`.

- [ ] **Step 1: Write failing test**:

```python
import pytest
from httpx import ASGITransport, AsyncClient

from ai_gateway.main import create_app


@pytest.mark.asyncio
async def test_diagnose_is_deterministic_and_well_formed():
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        payload = {"image_ref": "plants/abc.jpg", "task": "plant_diagnosis"}
        r1 = await c.post("/ai/analyze", json=payload)
        r2 = await c.post("/ai/analyze", json=payload)
        assert r1.status_code == 200
        d = r1.json()
        assert set(d) == {"health", "growth_stage", "pests", "watering", "care_steps"}
        assert isinstance(d["pests"], list) and isinstance(d["care_steps"], list)
        assert r1.json() == r2.json()  # deterministic


@pytest.mark.asyncio
async def test_unknown_task_400():
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r = await c.post("/ai/analyze", json={"image_ref": "x", "task": "nope"})
        assert r.status_code == 400
        assert r.json()["error"]["code"] == "ai.unknown_task"
```

- [ ] **Step 2:** Run → FAIL (no `ai_gateway`).
- [ ] **Step 3:** Implement provider/plantdoctor/schemas/routes/main. Deterministic mock: `h = int(sha256(image_ref).hexdigest(),16)`; index into curated lists (e.g. health ∈ ["Healthy","Slightly stressed","Needs attention"], growth_stage ∈ ["Seedling","Vegetative","Flowering","Mature"], watering advice list, care_steps a 3-item selection). Provider chosen by settings `ai_provider` (default `"mock"`).
- [ ] **Step 4:** Run tests + full suite → PASS pristine, ruff clean. Register paths in root pyproject.
- [ ] **Step 5:** (No commit.)

---

### Task 5: PlantCare — plants, timeline, analysis orchestration, guest gating

**Files:** Create `services/plantcare/**` (`pyproject.toml`, `Dockerfile`, `src/plantcare/{__init__,main,models,schemas,repositories,service,deps,routes,client}.py`); Test `tests/plantcare/test_plants.py`.

**Interfaces (produced):**
- Models `Plant(id uuid, user_id uuid, name str|None, created_at)`, `PlantLog(id uuid, plant_id fk, image_ref str, diagnosis JSON, created_at)` (portable types; `diagnosis` stored as JSON string/`JSON` type).
- `client.AiGatewayClient.analyze(image_ref) -> dict` — HTTP call to `NEWELL_AI_GATEWAY_URL` `/ai/analyze`; injectable/mferridable in tests.
- Routes (all read `X-User-Id` + `X-User-Role` headers; missing id → 401 `auth.unauthorized`):
  - `POST /plants {name?, image_ref}` → creates a plant + first PlantLog by calling the AI gateway; returns `{plant_id, name, diagnosis, created_at}`. **Guest gating:** if role=="guest" and the user already owns ≥1 plant → 403 `signup_required`.
  - `GET /plants` → list the user's plants (most recent first). **Guest gating:** role=="guest" → 403 `signup_required`.
  - `GET /plants/{id}` → the plant + its timeline (`logs` newest first); 404 `not_found` if not owned by the user.
  - `POST /plants/{id}/analyze {image_ref}` → append a PlantLog (new analysis) to an existing plant. **Guest gating:** role=="guest" → 403 `signup_required` (guests get exactly one analysis, created with the plant).

- [ ] **Step 1: Write failing test** `tests/plantcare/test_plants.py` (SQLite session override + a stub `AiGatewayClient` returning a fixed diagnosis; set headers `X-User-Id`, `X-User-Role`):

```python
import pytest
from httpx import ASGITransport, AsyncClient

from plantcare.deps import get_ai_client, get_session
from plantcare.main import create_app
# helper build_test_app() in the test wires an in-memory sqlite session + stub client

FIXED = {"health": "Healthy", "growth_stage": "Seedling", "pests": [],
         "watering": "Water twice a week.", "care_steps": ["a", "b", "c"]}


@pytest.mark.asyncio
async def test_user_can_create_plant_and_get_timeline(app_user):
    async with AsyncClient(transport=ASGITransport(app=app_user), base_url="http://t") as c:
        h = {"X-User-Id": "user-1", "X-User-Role": "user"}
        r = await c.post("/plants", json={"name": "Basil", "image_ref": "plants/x.jpg"}, headers=h)
        assert r.status_code == 200 and r.json()["diagnosis"]["health"] == "Healthy"
        pid = r.json()["plant_id"]
        t = await c.get(f"/plants/{pid}", headers=h)
        assert len(t.json()["logs"]) == 1


@pytest.mark.asyncio
async def test_guest_second_plant_blocked(app_guest):
    async with AsyncClient(transport=ASGITransport(app=app_guest), base_url="http://t") as c:
        h = {"X-User-Id": "guest-1", "X-User-Role": "guest"}
        await c.post("/plants", json={"image_ref": "plants/1.jpg"}, headers=h)
        r2 = await c.post("/plants", json={"image_ref": "plants/2.jpg"}, headers=h)
        assert r2.status_code == 403 and r2.json()["error"]["code"] == "signup_required"


@pytest.mark.asyncio
async def test_guest_list_blocked(app_guest):
    async with AsyncClient(transport=ASGITransport(app=app_guest), base_url="http://t") as c:
        r = await c.get("/plants", headers={"X-User-Id": "guest-1", "X-User-Role": "guest"})
        assert r.status_code == 403 and r.json()["error"]["code"] == "signup_required"
```

(The implementer writes `app_user`/`app_guest` fixtures that build the app with a SQLite session override and a stub `get_ai_client` returning `FIXED`.)

- [ ] **Step 2:** Run → FAIL (no `plantcare`).
- [ ] **Step 3:** Implement models/schemas/repositories/service (gating logic)/client/deps/routes/main + a lifespan `create_all` (like auth/profile). Register paths in root pyproject.
- [ ] **Step 4:** Run tests + full suite → PASS pristine, ruff clean.
- [ ] **Step 5:** (No commit.)

---

### Task 6: Gateway — role injection + proxy media/plants

**Files:** Modify `services/gateway/src/gateway/{auth_dep,proxy}.py`; Test `tests/gateway/test_proxy_p2.py`.

**Interfaces (produced):**
- `auth_dep.current_identity(authorization) -> tuple[str, str]` returns `(user_id, role)` from the JWT (`sub`, `role`; role default "user"). Keep `current_user_id` working (or refactor callers).
- Proxy adds authenticated forwards: `/media/*` → `NEWELL_MEDIA_URL`, `/plants/*` → `NEWELL_PLANTCARE_URL`, both injecting `X-User-Id` AND `X-User-Role`. `/auth/*` and `/profile/*` unchanged (profile keeps just `X-User-Id`).
- Config: `media_url`, `plantcare_url`, `ai_gateway_url` added to Settings.

- [ ] **Step 1: Write failing test** (stub upstreams; assert `/plants/x` with a guest token injects `X-User-Role: guest`, and no-token → 401). Mirror the existing `test_proxy.py` client-injection pattern.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement role extraction + the two new proxied prefixes.
- [ ] **Step 4:** Run tests + full suite → PASS pristine, ruff clean.
- [ ] **Step 5:** (No commit.)

---

### Task 7: Compose — media, ai_gateway, plantcare

**Files:** Modify `infra/docker-compose.yml`, `infra/.env.example`; create the three Dockerfiles if not already; ensure MinIO bucket usage.

**Interfaces (produced):** `docker compose up` boots the three new services (each `/healthz` healthy, self-migrating where they own tables); gateway depends on them; env adds `NEWELL_MEDIA_URL`, `NEWELL_PLANTCARE_URL`, `NEWELL_AI_GATEWAY_URL`, and MinIO public endpoint for media URLs.

- [ ] **Step 1:** Add `media`, `ai_gateway`, `plantcare` services (build, env_file, depends_on postgres healthy; plantcare also depends_on ai_gateway healthy; media depends_on minio healthy). Add `/healthz` to each.
- [ ] **Step 2:** Gateway depends_on the three. Add env vars (service URLs `http://<svc>:8000`).
- [ ] **Step 3: Boot + smoke test the real slice:** guest login → upload a small image via `/media/upload` → `POST /plants` with the returned `image_ref` → assert a diagnosis comes back → second `/plants` returns 403 `signup_required`. Then `down`.
- [ ] **Step 4:** (No commit.)

---

### Task 8: Web — guest button, upload, diagnosis card, timeline, signup gate

**Files:** Modify `web/src/api.ts`, `web/src/auth.tsx`, `web/src/App.tsx`; create `web/src/screens/UploadScreen.tsx`, `web/src/screens/GardenScreen.tsx`, `web/src/components/DiagnosisCard.tsx`, `web/src/components/SignupGate.tsx`; extend `PhoneScreen` with a "Try as guest" action.

**Interfaces (produced):**
- `api.ts`: add `guestLogin()`, `uploadPhoto(file) -> {media_id, url}`, `createPlant({name?, image_ref})`, `listPlants()`, `getPlant(id)`. On any `403 signup_required`, throw a typed error the UI catches to show `SignupGate`.
- `auth.tsx`: store `role`; expose `isGuest`.
- Flow: entry screen has **"Try as guest"** (calls guestLogin, role guest) beside phone login. After auth → **GardenScreen**: guest sees an upload CTA; user sees their plant timeline + upload. **UploadScreen**: choose photo → upload → createPlant → animated **DiagnosisCard** (health, growth stage, pests, watering, care steps; Framer Motion reveal, consistent with the P1 design system — ink/paper/chlorophyll palette, Fraunces headings). Guest after 1 analysis, or on any gated action, sees **SignupGate** ("Sign up to save your garden & analyze more") that routes into the existing phone-OTP flow, passing `guest_user_id` so their demo plant migrates.

**Design bar:** reuse the P1 "growth as light" system. The DiagnosisCard is the new signature moment — treat health as a small status pill (chlorophyll/clay by severity), growth stage on the seedling motif, care steps as a tidy checklist. Motion on reveal; reduced-motion respected. No templated dashboard look.

- [ ] **Step 1:** Implement the API + auth changes.
- [ ] **Step 2:** Build the screens/components to the design bar.
- [ ] **Step 3: Verify** `cd web && npm run build` + `npx tsc --noEmit` clean (zero TS errors).
- [ ] **Step 4:** (No commit.)

---

### Task 9: End-to-end runbook update

**Files:** Create `docs/RUNBOOK-p2.md`; update `README.md` layout list.

- [ ] **Step 1:** Document the guest demo flow and the full signup+migration flow, plus the API smoke test (guest → upload → plant → diagnosis → 403 on second). Include reading the OTP from `auth` logs for the signup path.
- [ ] **Step 2: Full smoke test** by the implementer (backend up): guest token → upload → plant → diagnosis; second plant → 403; signup with `guest_user_id` → same user_id, role user; `GET /plants` now 200 with the migrated plant.
- [ ] **Step 3:** (No commit.)

---

## Self-Review

**1. Spec/requirement coverage:**
- Guest/demo anyone-can-try (user directive) → Tasks 1,2,8. ✅
- Force signup for real features via gating (user directive) → guest limits in Tasks 5,6,8 (`signup_required`). ✅
- Guest→user migration in place (decided) → Task 2. ✅
- Upload photo → AI diagnosis → timeline (spec Tree Planting) → Tasks 3,4,5,8. ✅
- LLMProvider abstraction + MockProvider + PlantDoctor tool (spec AI/MCP; in-process now, real MCP = P2.5) → Task 4. ✅
- Media/object storage (spec) → Task 3. ✅
- Gateway sole entry, injects identity+role (spec) → Task 6. ✅
- Runs via docker-compose (spec) → Task 7. ✅

**2. Placeholder scan:** Tasks with new logic carry test code + explicit contracts; service bodies follow the established auth/profile patterns (the per-task brief is the code source, as in P0/P1). No vague "handle errors" steps — every gate has an exact status + code.

**3. Type consistency:** `create_access_token(subject, role)` (Task 1) used by auth (Task 2) and asserted by gateway (Task 6); `Diagnosis` keys identical across Tasks 4,5,8 and Global Constraints; `X-User-Id`/`X-User-Role` contract consistent across Tasks 5,6; `signup_required` code identical across Tasks 5,6,8; `image_ref` naming consistent across media(Task 3 returns `media_id`+`url`)→plantcare(`image_ref`)→ai_gateway. NOTE for implementers: plantcare's `image_ref` = the media `url` (or `media_id`); the web `createPlant` passes the upload's `url` as `image_ref`.

**Deferred (correctly):** real separate PlantDoctor MCP server (P2.5), async analysis/job queue, real LLM providers, Home/Interior/Life modules, Flutter app, admin dashboard.
