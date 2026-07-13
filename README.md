# 🌱 Newell

**AI-powered guidance to grow gardens, plant trees, improve your home, and decorate rooms — all from one place.**

Newell is a mobile-first platform: snap a photo, get clear advice anyone can follow, and track progress over time. It's built as decoupled Python (FastAPI) microservices behind a single API gateway, with a React web app. Clients never call AI models directly — everything goes through the gateway.

- Design spec: `docs/superpowers/specs/2026-07-12-newell-platform-design.md`
- Runbooks: `docs/RUNBOOK-p1.md` (auth), `docs/RUNBOOK-p2.md` (tree planting + guest)
- **Admin / ops guide:** `docs/ADMIN-GUIDE.md` (test backend, frontend, Docker, servers; deploy)

---

## Features

### 🏡 Landing homepage
A marketing homepage is the entry point (not the login screen): animated background, animated
header/footer with highlighted calls-to-action, and scroll-revealed sections explaining what Newell
does, how it works, and how to use it well. "Try it free — as guest" starts a demo instantly.
_Web: `web/src/screens/LandingScreen.tsx`, `web/src/landing/`._

### 🔐 Authentication & guest mode
- **Phone-OTP login** with JWT access + rotating refresh tokens (mock SMS in dev — code printed to the
  `auth` logs; pluggable real SMS later).
- **Guest / demo mode:** anyone can `Try as guest` (no signup) and run one full plant analysis.
- **Signup gating:** gated actions (saving history, a 2nd analysis) return `403 signup_required`.
- **In-place migration:** when a guest signs up, their demo data carries over to the same account.
- Google/email sign-in are designed-for and deferred to a later phase.
_Service: `services/auth`._

### 👤 Profiles & internationalization
User profiles with cloud sync and a locale field. UI + backend messages in **English and বাংলা (bn)**.
_Service: `services/profile`; catalogs in `locales/`._

### 🌳 Tree Planting (AI plant care)
- Upload a plant photo → stored in object storage (MinIO/S3).
- **AI diagnosis:** health, growth stage, pests, watering, and care steps (deterministic mock now;
  Claude/GPT-4o pluggable behind an `LLMProvider` seam).
- **Growth timeline** per plant; guest-gated for saving/history.
_Services: `services/media`, `services/ai_gateway` (PlantDoctor tool), `services/plantcare`._

### 🧭 API gateway
Single entry point: verifies JWTs, injects `X-User-Id` + `X-User-Role`, rate-limits, and reverse-proxies
to services. Clients only ever talk to the gateway. _Service: `services/gateway`._

### 🧱 Coming next
Home & Room building, Interior design, and the Personal Problem Solver modules reuse this same pattern.
A real standalone PlantDoctor MCP server and real vision-LLM wiring are planned (P2.5).

---

## Quick start

Prereqs: Docker Desktop, Node 18+, Python 3.12+.

```bash
# 1) Backend (all services)
cp -n infra/.env.example infra/.env
docker compose -f infra/docker-compose.yml up -d --build
curl http://localhost:8080/healthz          # {"status":"ok","service":"gateway"}

# 2) Frontend
cd web && npm install && npm run dev         # http://localhost:5173  (proxies /api -> :8080)
```

Open the printed URL → **Try it free — as guest** → upload a plant photo → see the diagnosis.
The OTP for signup is printed in `docker compose -f infra/docker-compose.yml logs -f auth`.

> **Docker Hub blocked / build hangs?** Use the offline fallback documented in
> `docs/ADMIN-GUIDE.md` (`DOCKER_BUILDKIT=0` + `infra/docker-compose.local.yml`).

## Local development (no Docker)

```bash
python -m venv .venv
.venv/Scripts/python.exe -m pip install ruff pytest pytest-asyncio httpx
.venv/Scripts/python.exe -m pip install -e ./libs/newell_common -e ./services/auth \
  -e ./services/profile -e ./services/media -e ./services/ai_gateway \
  -e ./services/plantcare -e ./services/gateway
.venv/Scripts/python.exe -m pytest -q     # unit/integration tests (hermetic)
.venv/Scripts/python.exe -m ruff check .  # lint
```

## Project layout

```
libs/newell_common   shared: config, logging, errors, db, repository, i18n, security
services/gateway     API gateway (JWT verify + reverse proxy)
services/auth        phone-OTP + guest login, JWT, in-place migration
services/profile     user profile + locale (en/bn)
services/media       image upload -> MinIO
services/ai_gateway  LLMProvider abstraction + deterministic PlantDoctor tool
services/plantcare   plants, growth timeline, guest gating
web/                 React + Vite + Tailwind + Framer Motion (landing + app)
locales/             en/bn message catalogs
infra/               docker-compose (+ local offline override), env example
docs/                specs, plans, runbooks, ADMIN-GUIDE
```

## Tech stack

Python 3.12 · FastAPI · SQLAlchemy 2 (async) · PostgreSQL · MinIO · Redis · PyJWT ·
React 18 · TypeScript · Vite · Tailwind CSS · Framer Motion · Docker Compose · GitHub Actions.

## Status

P0 foundation · P1 auth + profile + web login · P2 Tree Planting + guest mode — **done & live-verified.**
