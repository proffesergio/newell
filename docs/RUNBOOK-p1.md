# Newell — P1 Local Test Runbook (Auth + Profile + Web login)

This walks you through running **both servers locally** — the backend stack
(Docker Compose) and the web frontend (Vite dev server) — and testing the full
phone → OTP → profile login flow. No real SMS and no API keys are needed; the
one-time verification code is printed to the `auth` service logs.

Prerequisites: Docker Desktop running, Node 18+ / npm, Python venv at `.venv`
(already set up).

---

## 1. Backend — Docker Compose

```bash
cd "C:/Users/bhnbi/Music/SaaS/newell"

# one-time: create your local env file (safe to re-run; .env is gitignored)
cp -n infra/.env.example infra/.env

# build + start postgres, redis, minio, auth, profile, gateway
docker compose -f infra/docker-compose.yml up -d --build

# wait a few seconds, then confirm the gateway is healthy
curl http://localhost:8080/healthz
# => {"status":"ok","service":"gateway"}
```

Services (all behind the gateway on **http://localhost:8080**):
`auth` and `profile` are internal only; the app talks to the gateway, never to
them directly.

Optional API-only smoke test (no browser):

```bash
# 1) request a code
curl -s -X POST http://localhost:8080/auth/otp/request \
  -H "Content-Type: application/json" -d '{"phone":"+8801700000000"}'
# => {"message":"Verification code sent."}

# 2) read the code from the auth logs (mock SMS)
docker compose -f infra/docker-compose.yml logs auth | grep "verification code is" | tail -1
# => ...{"logger":"auth.sms","message":"Your Newell verification code is 143514"}

# 3) verify (use the 6 digits after "code is")
curl -s -X POST http://localhost:8080/auth/otp/verify \
  -H "Content-Type: application/json" -d '{"phone":"+8801700000000","code":"143514"}'
# => {"access_token":"...","refresh_token":"...","token_type":"bearer","user_id":"..."}

# 4) fetch the profile with the access token
curl -s http://localhost:8080/profile/me -H "Authorization: Bearer <access_token>"
# => {"user_id":"...","display_name":null,"locale":"en"}
```

---

## 2. Frontend — Vite dev server

Open a **second terminal** (leave the backend running):

```bash
cd "C:/Users/bhnbi/Music/SaaS/newell/web"
npm install          # first time only
npm run dev          # starts Vite; note the printed URL (usually http://localhost:5173)
```

The dev server proxies `/api/*` → `http://localhost:8080`, so there is **no
CORS setup** to worry about. You don't need to set any env vars.

---

## 3. Test the login flow in the browser

1. Open the URL Vite printed (e.g. **http://localhost:5173**).
2. **Phone screen** — enter a phone number (any format, e.g. `+8801700000000`) and press **Send code**.
3. **Get the code** — in your backend terminal, tail the auth logs:
   ```bash
   docker compose -f infra/docker-compose.yml logs -f auth
   ```
   Look for the newest line: `"message": "Your Newell verification code is XXXXXX"`.
4. **Code screen** — type the 6 digits into the boxes. On success you're taken to the profile.
5. **Profile screen** — you should see your `user_id`. Try:
   - editing the **display name** and saving,
   - toggling the language between **English (en)** and **বাংলা (bn)**,
   - **logout** (returns you to the phone screen).

What you're verifying visually: the **growing-seedling stem** advances a step
(and unfurls a leaf) as you move phone → code → profile; screen transitions and
the OTP digit boxes animate; the theme follows your OS light/dark setting.

---

## 4. Shut down

```bash
# stop the frontend: Ctrl+C in the Vite terminal

# stop the backend (keeps data volumes):
docker compose -f infra/docker-compose.yml down

# to also wipe the Postgres/MinIO data:
# docker compose -f infra/docker-compose.yml down -v
```

---

## Troubleshooting

- **Gateway health fails / connection refused:** give the containers ~10s after
  `up`; check `docker compose -f infra/docker-compose.yml ps` — all should be
  `healthy`. Inspect a service with `docker compose logs <auth|profile|gateway>`.
- **"That code didn't match":** codes expire after 5 minutes and allow 5
  attempts — request a fresh one and use the newest log line.
- **Frontend can't reach the API:** make sure the backend is up on :8080 and you
  started Vite from the `web/` folder (the proxy is defined in `web/vite.config.ts`).
- **Port already in use (8080/5173/5432):** stop the conflicting process or
  adjust the port mapping in `infra/docker-compose.yml` / Vite.
