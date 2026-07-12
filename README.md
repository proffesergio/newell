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
