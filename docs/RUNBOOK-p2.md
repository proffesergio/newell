# Newell — P2 Local Test Runbook (Tree Planting + Guest Mode)

Run the backend stack + web app and test the guest demo, the AI plant diagnosis,
the signup gate, and guest→account migration. Mock AI (deterministic) — no keys.

Prereqs: Docker Desktop running; Node 18+; the `.venv` at the repo root.

---

## 1. Backend

### Normal (Docker Hub reachable)
```bash
cd "C:/Users/bhnbi/Music/SaaS/newell"
cp -n infra/.env.example infra/.env
docker compose -f infra/docker-compose.yml up -d --build
curl http://localhost:8080/healthz         # {"status":"ok","service":"gateway"}
```

### Offline / Docker Hub blocked (fallback)
If `docker compose build` hangs pulling `moby/buildkit` or `python:3.12-slim`
(Docker Hub unreachable), build from local base images with BuildKit disabled,
using the `docker-compose.local.yml` override:
```bash
export DOCKER_BUILDKIT=0
docker compose -f infra/docker-compose.yml -f infra/docker-compose.local.yml \
  build auth profile media ai_gateway plantcare gateway
docker compose -f infra/docker-compose.yml -f infra/docker-compose.local.yml \
  up -d --no-build
```
This requires the `newell-auth` image to already exist locally (any prior build)
and installs Python deps from PyPI. The real `Dockerfile`s (`FROM python:3.12-slim`)
are unchanged and are what CI/production use.

> Note: whenever the auth `User` schema changes, reset the DB first with
> `docker compose ... down -v` so the services' startup `create_all` builds the
> new schema on a fresh Postgres.

## 2. Frontend
```bash
cd "C:/Users/bhnbi/Music/SaaS/newell/web"
npm install
npm run dev            # http://localhost:5173, proxies /api -> :8080
```

## 3. Test the guest → AI → signup flow

1. Open the Vite URL. On the entry screen choose **Try as guest**.
2. **Garden** → **add a plant**: pick any image, submit. After a moment the
   **Diagnosis card** shows health, growth stage, pests, watering, and care steps
   (deterministic mock — the same image always yields the same result).
3. Try to add a **second** plant → the **Sign up** gate appears
   ("Sign up to add more plants.").
4. Tap the gate's sign-up button → phone-OTP flow. Read the code from the auth
   logs: `docker compose -f infra/docker-compose.yml logs -f auth`
   (line: `"Your Newell verification code is XXXXXX"`).
5. After verifying, you're a full user — your **demo plant carried over**
   (same account), and you can add more plants and see your timeline.

### API-only smoke test
`.venv/Scripts/python.exe` with `httpx` — see the flow proven in
`scratchpad/p2_smoke.py` style: `POST /auth/guest` → `POST /media/upload`
(Bearer) → `POST /plants` (diagnosis) → 2nd `POST /plants` = 403
`signup_required` → `POST /auth/otp/verify {phone, code, guest_user_id}` returns
the SAME `user_id` with `role:"user"` → `GET /plants` lists the migrated plant.

## 4. Shut down
```bash
docker compose -f infra/docker-compose.yml down          # keep data
# or: docker compose -f infra/docker-compose.yml -f infra/docker-compose.local.yml down -v   # wipe data
```

## Troubleshooting
- **`docker compose build` hangs with no output / `moby/buildkit ... EOF`:**
  Docker Hub is unreachable. Use the offline fallback in §1.
- **`docker version` shows empty `server=`:** the Docker Desktop engine is down —
  restart Docker Desktop.
- **Guest can't add a 2nd plant:** that's the intended gate — sign up to continue.
- **"That code didn't match":** codes expire in 5 min / 5 attempts — request a new one.
