# Newell — P3 Local Test Runbook (Interior Design)

Run the backend stack + web app and test the interior-design flow: the guest demo room,
the AI room design (style, palette, layout tips, furniture), the signup gate, and
guest→account migration. Mock AI (deterministic) — no keys.

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
The stack now includes the `interior` service (`NEWELL_INTERIOR_URL=http://interior:8000`);
the gateway proxies `/rooms` to it and waits for it to be healthy.

### Offline / Docker Hub blocked (fallback)
If `docker compose build` hangs pulling `moby/buildkit` or `python:3.12-slim`
(Docker Hub unreachable), build from local base images with BuildKit disabled,
using the `docker-compose.local.yml` override:
```bash
export DOCKER_BUILDKIT=0
docker compose -f infra/docker-compose.yml -f infra/docker-compose.local.yml \
  build auth profile media ai_gateway plantcare interior gateway
docker compose -f infra/docker-compose.yml -f infra/docker-compose.local.yml \
  up -d --no-build
```
This requires the `newell-auth` image to already exist locally (any prior build)
and installs Python deps from PyPI. The real `Dockerfile`s (`FROM python:3.12-slim`)
are unchanged and are what CI/production use.

> Note: the `interior` service adds new `rooms`/`room_logs` tables. Startup `create_all`
> creates them on a fresh or existing Postgres; no reset is needed just for this service.
> Only reset (`down -v`) when an existing model's columns change.

## 2. Frontend
```bash
cd "C:/Users/bhnbi/Music/SaaS/newell/web"
npm install
npm run dev            # http://localhost:5173, proxies /api -> :8080
```

## 3. Test the guest → AI design → signup flow

1. Open the Vite URL. On the entry screen choose **Try it free — as guest**.
2. From the **Garden**, tap **Rooms** (header link) to switch to the interior domain.
3. **Rooms** → **Add a room**: pick any image, submit. After a moment the
   **Design card** shows a style, a colour palette (hex swatches), layout tips, and
   furniture suggestions (deterministic mock — the same image always yields the same design).
4. Try to add a **second** room → the **Sign up** gate appears
   ("Design your whole home." / "Sign up to save your rooms and design more spaces…").
5. Tap the gate's sign-up button → phone-OTP flow. Read the code from the auth
   logs: `docker compose -f infra/docker-compose.yml logs -f auth`
   (line: `"Your Newell verification code is XXXXXX"`).
6. After verifying, you're a full user — your **demo room carried over**
   (same account), and you can add more rooms, redesign them, and see the list.

### API-only smoke test
`POST /auth/guest` → `POST /media/upload` (Bearer) → `POST /rooms` (returns
`design:{style,palette,layout_tips,furniture}`) → 2nd `POST /rooms` = 403
`signup_required` → `POST /auth/otp/verify {phone, code, guest_user_id}` returns
the SAME `user_id` with `role:"user"` → `GET /rooms` lists the migrated room →
`POST /rooms/{room_id}/design` adds a second design log to that room's timeline.

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
- **`502`/`connection refused` at `/rooms`:** the `interior` service is still starting
  or unhealthy — check `docker compose ps` / `docker compose logs interior`.
- **Guest can't add a 2nd room:** that's the intended gate — sign up to continue.
- **"That code didn't match":** codes expire in 5 min / 5 attempts — request a new one.
