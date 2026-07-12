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

## Run the app (backend + web login)
Full end-to-end phone → OTP → profile login, backend (Docker) + frontend (Vite):

```bash
# terminal 1 — backend
docker compose -f infra/docker-compose.yml up -d --build

# terminal 2 — frontend
cd web && npm install && npm run dev   # http://localhost:5173, proxies /api -> :8080
```

The one-time OTP is printed to the auth logs (mock SMS — no real SMS/keys):
`docker compose -f infra/docker-compose.yml logs -f auth`

Step-by-step walkthrough and troubleshooting: **`docs/RUNBOOK-p1.md`**.

## Layout
- `libs/newell_common` — shared config, logging, errors, health, db, i18n, security
- `services/gateway` — API gateway (JWT verify + reverse proxy; entry point for clients)
- `services/auth` — phone-OTP login, JWT access + rotating refresh
- `services/profile` — user profile + locale (en/bn)
- `web/` — React + Vite + Tailwind + Framer Motion login app
- `infra/` — docker-compose + env example
- `docs/` — specs, plans, and the P1 runbook
