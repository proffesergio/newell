# Newell — Platform Design Spec

- **Date:** 2026-07-12
- **Status:** Approved (design), pending spec review
- **Product:** Newell — mobile-first, AI-powered guidance for planting trees, building/designing homes, interior design, and daily life problems.

---

## 1. Product summary

Newell gives every person AI-powered, actionable guidance across four modules, delivered through a Flutter mobile app backed by a decoupled Python microservices system with dedicated MCP tool servers. The mobile app never calls AI models directly — all AI traffic flows through an internal API gateway and AI Gateway service.

Modules:
1. **Tree Planting** — upload plant/tree photos; AI returns health, growth stage, pest/disease, watering needs, and care instructions; growth tracked on a timeline. *(FULL vertical slice in build #1.)*
2. **Home & Room Building** — photos/sketches → step-by-step building guidance, material suggestions, design principles. *(Stub in build #1; AR deferred.)*
3. **Interior Design** — photo → furniture layout, color palettes, style improvements. *(Stub in build #1.)*
4. **Personal Problem Solver** — chat for daily-life problems with safety guardrails + crisis detection. *(Stub in build #1; safety interface defined now.)*

---

## 2. Decisions (locked)

| Area | Decision |
|---|---|
| Mobile framework | **Flutter (Dart)**, iOS + Android, mobile-first |
| Backend language | **Python 3.12 + FastAPI** microservices |
| AI providers | **Provider-abstracted** `LLMProvider`: default **MockProvider** (offline/free); pluggable **Claude** (chat/tool-use) + **GPT-4o** (vision) |
| Vision timing | **Async** (job + push/poll), so the app stays responsive and cost/latency is controlled |
| Database | **PostgreSQL** (structured data) + **MinIO** (S3-compatible object storage) + **Redis** (cache, rate-limit, OTP) |
| Orchestration | **Docker Compose now**; Kubernetes manifests deferred to a later phase |
| CI/CD | **GitHub Actions** (lint, test, build) |
| Auth | **Phone OTP first** (mock SMS in dev, pluggable `SmsProvider`), plus **Google OAuth + email**; **password optional** |
| Chat safety | Define **`SafetyGuardrail` + crisis-referral interface now**; full implementation when LifeAssistant module is built |
| External integrations | **Mock-first** behind interfaces; `WeatherProvider` (→ Open-Meteo later) and `PlantSpeciesProvider` (→ Perenual later) pluggable; **zero API keys to run** |
| Admin dashboard | **Modern React + Vite** dashboard (Tailwind CSS + Framer Motion) |
| i18n | **Bangla (`bn`) + English (`en`)** from day one; catalogs on backend + Flutter; locale on profile |
| Offline | **Static plant-care guides** cached on-device; live AI analysis stays online |
| MVP scope | **Tree Planting full**, other three modules stubbed |

---

## 3. Architecture

```
                          ┌─────────────────────────────┐
                          │   MOBILE APP (iOS/Android)   │
                          │  Flutter (Dart)              │
                          │  - Auth, camera/upload       │
                          │  - Plant timeline, chat UI   │
                          │  - Offline care guides       │
                          └──────────────┬──────────────┘
                                         │ HTTPS / REST (v1) + JWT
                                         ▼
                          ┌─────────────────────────────┐
                          │        API GATEWAY          │
                          │  authZ, rate-limit,          │
                          │  routing, request logging    │
                          └───┬─────┬─────┬─────┬────────┘
          ┌───────────────────┘     │     │     └───────────────────┐
          ▼                         ▼     ▼                         ▼
   ┌────────────┐          ┌──────────────┐ ┌──────────────┐  ┌────────────┐
   │  Auth svc  │          │  PlantCare   │ │  HomeDesign  │  │ Interior + │
   │ Profile svc│          │  (FULL)      │ │   (stub)     │  │ LifeAssist │
   │ Media svc  │          └──────┬───────┘ └──────────────┘  │  (stubs)   │
   │ Notif svc  │                 │                           └────────────┘
   └─────┬──────┘          ┌──────────────────────────────────────────────┐
         │                 │              AI GATEWAY service               │
         │                 │  LLMProvider abstraction, tool-use loop,      │
         │                 │  prompt mgmt, safety interface, cost caps     │
         │                 └───────┬───────────────────────┬──────────────┘
         │                         │ Model Context Protocol │
         │                 ┌───────▼──────┐        ┌────────▼───────┐
         │                 │ MCP:         │        │ MCP: Weather   │
         │                 │ PlantDoctor  │───────▶│ MCP: PlantDB   │
         │                 └──────────────┘        └────────────────┘
         ▼
  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
  │ PostgreSQL   │   │ MinIO (S3)   │   │    Redis     │
  │ users, logs, │   │ images       │   │ cache,       │
  │ projects,chat│   │              │   │ rate-limit,  │
  └──────────────┘   └──────────────┘   │ OTP store    │
                                        └──────────────┘

  Cross-cutting: structured JSON logging + OpenTelemetry → Prometheus/Grafana + Loki
  Admin: React + Vite (Tailwind + Framer Motion) → talks to gateway (admin-scoped)
```

### Primary data flow — plant analysis (async)
1. App uploads photo → **Media svc** stores to MinIO, returns object URL.
2. App calls **PlantCare svc** → creates a `plant_log` record (status `pending`), enqueues analysis job, returns job id.
3. Worker calls **AI Gateway** with the image URL + task = `plant_diagnosis`.
4. AI Gateway runs the **tool-use loop**: LLM (or MockProvider) invokes **PlantDoctor MCP**, which may call **PlantDatabase** and **Weather** MCP tools.
5. Structured diagnosis returned → persisted to the plant's **growth timeline**.
6. **Notifications svc** pushes result to app (push/poll); timeline updates.

---

## 4. Services (contracts & responsibilities)

Each service is an independent FastAPI app following **clean architecture + repository pattern**:
`api/` (routes, DTOs) → `services/` (domain logic) → `repositories/` (data access) → `models/` (entities/schemas), with dependency-injected providers, typed errors, structured logging, and unit + integration tests.

| Service | Responsibility | Key endpoints (v1) |
|---|---|---|
| **gateway** | Single entry point; verifies JWT, rate-limits (Redis), routes to services, correlation-id logging | `/*` proxied; `/healthz` |
| **auth** | Phone-OTP (mock SMS), Google OAuth, email; JWT access + rotating refresh | `POST /auth/otp/request`, `/auth/otp/verify`, `/auth/google`, `/auth/refresh` |
| **profile** | User profile, `locale` (bn/en), cloud sync | `GET/PATCH /profile/me` |
| **media** | Image upload → MinIO; returns signed URLs | `POST /media/upload`, `GET /media/{id}` |
| **plantcare** | Plant logs, growth timeline, orchestrates analysis via AI Gateway | `POST /plants`, `POST /plants/{id}/analyze`, `GET /plants/{id}/timeline` |
| **ai_gateway** | `LLMProvider` abstraction, tool-use loop, prompts, cost caps, `SafetyGuardrail` interface | internal: `POST /ai/analyze`, `POST /ai/chat` |
| **notifications** | Async result delivery (push/poll) | `GET /notifications`, device registration |
| **stubs** (homedesign, interior, lifeassistant) | Health check + typed contract stubs returning `501 Not Implemented` with schema | `/healthz`, contract endpoints |

### MCP servers (separate processes, Python MCP SDK)
- **PlantDoctor** — `analyze_plant(image_url) -> Diagnosis {health, growth_stage, pests, watering, care_steps}`; may call PlantDatabase + Weather.
- **PlantDatabase** — `lookup_species(query) -> SpeciesCare`; backed by `PlantSpeciesProvider` (mock → Perenual later).
- **Weather** — `forecast(lat, lon) -> WeatherSummary`; backed by `WeatherProvider` (mock → Open-Meteo later).

---

## 5. AI provider abstraction

```
LLMProvider (interface)
  ├─ MockProvider      # default; deterministic fake diagnoses/chat — offline, free
  ├─ ClaudeProvider    # chat + tool-use loop (native MCP)
  └─ OpenAIProvider    # GPT-4o vision
```
- Selected via env (`AI_PROVIDER=mock|claude|openai|auto`). `auto` routes chat/tools→Claude, vision→GPT-4o.
- Cost caps + timeouts enforced in AI Gateway. All prompts live in versioned templates.
- **SafetyGuardrail** interface (implemented later): `check_input`, `check_output`, `detect_crisis -> CrisisReferral`.

---

## 6. Frontend design direction (standout, not templated)

**Shared principle:** both frontends must feel like one distinctive product — intentional typography, motion, and color; avoid default/templated looks.

- **Admin dashboard (React + Vite):** **Tailwind CSS** design tokens + **Framer Motion** for page/element transitions and micro-interactions; Radix UI primitives; lucide icons; dark/light theme. Screens: users, plant logs & timelines, flagged chats (future), system health.
- **Flutter mobile app:** custom design system (theme, tokens, typography scale), **`flutter_animate`** for motion, hero transitions, and polished camera/upload + timeline experiences. Tailwind/Framer Motion are web-only and do **not** apply here; the app achieves the equivalent standout feel with Flutter-native tooling.

---

## 7. Cross-cutting concerns

- **Shared libs (`libs/`):** db session/engine, JWT + auth deps, structured logging, i18n message loader, error types, base repository, config/settings.
- **Errors:** typed domain errors → consistent JSON error envelope `{error: {code, message, details}}`.
- **Logging/observability:** JSON logs w/ correlation ids; OpenTelemetry hooks; Prometheus + Grafana + Loki via a compose profile.
- **i18n:** backend message catalogs (`bn`, `en`) for errors/notifications; Flutter ARB catalogs; locale from profile, `Accept-Language` fallback.
- **Testing:** unit (domain/services) + integration (API + DB via test containers/fixtures); mock providers keep tests hermetic.
- **Security:** JWT with rotating refresh, rate-limiting, input validation (pydantic), signed media URLs, secrets via env/`.env.example`.

---

## 8. Repository layout (monorepo)

```
newell/
├── services/
│   ├── gateway/      auth/      profile/    media/
│   ├── plantcare/    ai_gateway/ notifications/
│   └── stubs/        # homedesign, interior, lifeassistant
├── mcp_servers/      # plantdoctor, plantdatabase, weather
├── mobile/           # Flutter app
├── admin/            # React + Vite (Tailwind + Framer Motion)
├── libs/             # shared python: db, auth, logging, i18n, errors, base repo, config
├── infra/            # docker-compose.yml, .env.example, grafana/, (k8s/ later)
├── .github/workflows/ # CI: lint, test, build
└── docs/             # architecture, ADRs, OpenAPI, READMEs, specs
```

---

## 9. Roadmap (phases)

| Phase | Deliverable | Done when |
|---|---|---|
| **P0 Foundation** | Monorepo, shared libs, docker-compose (Postgres+MinIO+Redis), gateway skeleton, CI | `docker-compose up` runs; gateway `/healthz` green |
| **P1 Auth + Profile** | Phone-OTP (mock SMS), Google/email, JWT; profiles + locale; i18n plumbing (bn/en) | Can register via phone OTP, get JWT, read/update profile |
| **P2 Tree Planting slice** | Media + PlantCare + AI Gateway (MockProvider) + PlantDoctor/PlantDB/Weather MCP (mocked); timeline | Upload photo → mock diagnosis on timeline, end-to-end |
| **P3 Flutter app** | Auth screens, camera/upload, plant timeline, offline guides, bn/en | Full plant flow works from device against local stack |
| **P4 Admin + observability** | Modern React admin (Tailwind + Framer Motion); Grafana/Loki profile | Admin lists users + plant logs; dashboards live |
| **P5 Stubs + safety iface** | Home/Interior/Life stubs; `SafetyGuardrail` contract | Stubs return typed `501`; safety interface defined + tested |

---

## 10. Explicitly out of scope (build #1 / YAGNI)

- Kubernetes/Helm (deferred to post-MVP phase)
- AR measurement (ARKit/ARCore)
- Full LifeAssistant chat + concrete safety checks (interface only now)
- Real SMS, real Weather/PlantDB providers (interfaces + mocks only)
- Payments/billing, teams/orgs, languages beyond bn/en
```
