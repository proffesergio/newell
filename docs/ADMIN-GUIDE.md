# Newell — Admin & Ops Guide

How to run, test, and deploy Newell: backend services, frontend, Docker, and local servers,
plus production notes. Keep this file updated as features land.

Repo root: `C:/Users/bhnbi/Music/SaaS/newell`. On Windows the venv Python is
`.venv/Scripts/python.exe` (paths below assume Git Bash).

---

## 0. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Docker Desktop | latest | Linux engine must be running (`docker version` shows a `Server`) |
| Node.js / npm | 18+ / 9+ | frontend |
| Python | 3.12+ | backend (3.13 works) |

One-time backend Python env:
```bash
python -m venv .venv
.venv/Scripts/python.exe -m pip install -U pip ruff pytest pytest-asyncio httpx
.venv/Scripts/python.exe -m pip install -e ./libs/newell_common -e ./services/auth \
  -e ./services/profile -e ./services/media -e ./services/ai_gateway \
  -e ./services/plantcare -e ./services/interior -e ./services/gateway
```

---

## 1. Test the backend

### Unit / integration tests (hermetic — no Docker needed)
```bash
.venv/Scripts/python.exe -m pytest -q            # all services
.venv/Scripts/python.exe -m pytest tests/auth -q # one service
```
Tests use in-memory SQLite (session override) and stubbed providers, so they need no Postgres/MinIO.
`pyproject.toml` sets `filterwarnings = ["error", ...]`, so any stray warning fails the suite.

### Lint & format
```bash
.venv/Scripts/python.exe -m ruff check .
.venv/Scripts/python.exe -m ruff format --check .   # add without --check to fix
```

### Run a single service directly (no Docker)
```bash
# needs a local Postgres/MinIO or the compose ones running
NEWELL_POSTGRES_DSN=postgresql+asyncpg://newell:newell@localhost:5432/newell \
  .venv/Scripts/python.exe -m uvicorn auth.main:app --port 8001
```

---

## 2. Test the servers via Docker (recommended)

### Normal path (Docker Hub reachable)
```bash
cp -n infra/.env.example infra/.env
docker compose -f infra/docker-compose.yml up -d --build
docker compose -f infra/docker-compose.yml ps        # all should be healthy
curl http://localhost:8080/healthz                   # gateway
```
Services (internal port 8000, gateway on 8080): `auth profile media ai_gateway plantcare interior gateway`
plus `postgres redis minio`. Each self-migrates its tables on startup (`create_all`).

### End-to-end smoke test (guest → AI → migration)
```bash
# guest login
curl -s -X POST localhost:8080/auth/guest
# upload (Bearer <guest access_token>) -> returns {url}
curl -s -X POST localhost:8080/media/upload -H "Authorization: Bearer <t>" -F file=@some.jpg
# create plant -> returns diagnosis; a 2nd plant as guest -> 403 signup_required
curl -s -X POST localhost:8080/plants -H "Authorization: Bearer <t>" \
  -H "Content-Type: application/json" -d '{"name":"Basil","image_ref":"<url>"}'
# signup + migrate: request OTP, read code from logs, verify with guest_user_id
docker compose -f infra/docker-compose.yml logs auth | grep "verification code is"
```
See `docs/RUNBOOK-p2.md` for the full walkthrough.

Interior Design uses the same shape at `/rooms` (guest gets one demo room, then `403 signup_required`):
```bash
# create room -> returns {design:{style,palette,layout_tips,furniture}}
curl -s -X POST localhost:8080/rooms -H "Authorization: Bearer <t>" \
  -H "Content-Type: application/json" -d '{"name":"Living room","image_ref":"<url>"}'
# redesign an existing room (user only)
curl -s -X POST localhost:8080/rooms/<room_id>/design -H "Authorization: Bearer <t>" \
  -H "Content-Type: application/json" -d '{"image_ref":"<url>"}'
```
See `docs/RUNBOOK-p3.md` for the full interior-design walkthrough.

### Reset data (after any DB schema change)
```bash
docker compose -f infra/docker-compose.yml down -v   # drops Postgres/MinIO volumes
docker compose -f infra/docker-compose.yml up -d --build
```

### Offline fallback — Docker Hub blocked / build hangs
Symptoms: `docker compose build` hangs with no output, or errors like
`booting buildkit → pulling moby/buildkit ... EOF`, or `pull python:3.12-slim` never finishes.
Cause: this machine can't reach Docker Hub. Build from **local** base images with BuildKit disabled:

```bash
export DOCKER_BUILDKIT=0
docker compose -f infra/docker-compose.yml -f infra/docker-compose.local.yml \
  build auth profile media ai_gateway plantcare interior gateway
docker compose -f infra/docker-compose.yml -f infra/docker-compose.local.yml \
  up -d --no-build
```
- Requires a `newell-auth` image to already exist locally (from any earlier successful build);
  `services/*/Dockerfile.local` build `FROM newell-auth:latest` and install deps from PyPI.
- The real `services/*/Dockerfile` (`FROM python:3.12-slim`) are unchanged and used by CI/production.
- `.dockerignore` keeps the build context small.

### Common issues
| Symptom | Fix |
|---|---|
| `docker version` shows empty `Server=` | Docker Desktop engine is down — restart Docker Desktop |
| build hangs pulling `moby/buildkit` or `python:*` | Docker Hub unreachable → use the offline fallback above |
| `502`/`connection refused` at `:8080` | services still starting; check `docker compose ps` / `logs <svc>` |
| auth queries error after model change | you skipped `down -v`; reset volumes so `create_all` rebuilds schema |
| port already in use (8080/5432/6379/9000/5173) | stop the conflicting process or change the mapping |

---

## 3. Test the frontend

```bash
cd web
npm install
npm run dev        # http://localhost:5173, proxies /api -> http://localhost:8080 (no CORS setup)
npm run build      # production build + strict TypeScript typecheck (must be 0 errors)
npx tsc --noEmit   # typecheck only
```
Manual check: open the dev URL → landing page (animated) → **Try it free — as guest** → upload a photo
→ diagnosis card → 2nd plant blocked → **Sign in** works. Theme follows OS light/dark; reduced-motion
is respected. From the garden, tap **Rooms** → add a room → design card (style, palette swatches,
layout tips, furniture) → 2nd room blocked as guest.

---

## 4. Continuous integration

`.github/workflows/ci.yml` runs on push/PR: installs packages, `ruff check` + `ruff format --check`,
and `pytest`. Keep it green before merging.

---

## 5. Production deployment (future)

Not yet automated — planned shape:

1. **Images:** build each service from its real `Dockerfile` (`FROM python:3.12-slim`) in CI with
   BuildKit; push to a registry (GHCR/ECR/GCR). Build the web app (`npm run build`) and serve `dist/`
   via a static host/CDN or an nginx container.
2. **Config & secrets:** every service reads `NEWELL_*` env vars via `newell_common.config.Settings`.
   Set a strong `NEWELL_JWT_SECRET` (32+ bytes), managed Postgres DSN, S3 credentials, Redis URL, and
   real service URLs. Never commit `infra/.env`.
3. **Managed infra:** replace compose Postgres/MinIO/Redis with managed Postgres, S3 (or S3-compatible),
   and managed Redis. Point `NEWELL_POSTGRES_DSN`, `NEWELL_MINIO_*`, `NEWELL_REDIS_URL` accordingly.
4. **Migrations:** the MVP self-creates tables on startup; before production, introduce Alembic
   migrations and run them as a release step instead of `create_all`.
5. **Orchestration:** Kubernetes manifests/Helm are deferred (P-later). For a first deploy, a single
   VM running `docker compose` behind a TLS reverse proxy (Caddy/nginx) is sufficient.
6. **Real integrations:** set `NEWELL_AI_PROVIDER` to a real provider and supply keys; wire a real SMS
   provider for OTP; enable Google/email auth.
7. **Observability:** enable the logging/metrics stack (OpenTelemetry → Prometheus/Grafana + Loki).

---

## Quick command reference

```bash
# backend tests + lint
.venv/Scripts/python.exe -m pytest -q && .venv/Scripts/python.exe -m ruff check .
# full stack up / down
docker compose -f infra/docker-compose.yml up -d --build
docker compose -f infra/docker-compose.yml down          # (add -v to wipe data)
# offline build (Docker Hub blocked)
DOCKER_BUILDKIT=0 docker compose -f infra/docker-compose.yml -f infra/docker-compose.local.yml build
# frontend
cd web && npm run dev
```
