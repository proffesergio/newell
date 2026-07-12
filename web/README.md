# Newell web

Vite + React + TypeScript frontend for the phone → OTP → profile login flow, with a
"growth as light" visual identity: a growing stem that unfurls a leaf as you complete
each step.

## Develop

```bash
npm install
npm run dev
```

The dev server proxies `/api/*` to `http://localhost:8080` (see `vite.config.ts`), stripping
the `/api` prefix, so the app talks to the gateway same-origin and avoids CORS. Make sure the
backend is up first:

```bash
cd ../infra
docker compose up -d
```

This is a mock-SMS/dev setup: the one-time code is not actually texted anywhere. Read it from
the `auth` service logs:

```bash
docker compose logs auth
```

## Build / typecheck

```bash
npm run build       # tsc --noEmit && vite build
npm run typecheck   # tsc --noEmit only
```

## Configuration

Copy `.env.example` to `.env` if you need to point at a gateway that isn't proxied through
`/api` (e.g. a deployed environment):

```bash
cp .env.example .env
# then set VITE_GATEWAY_URL to an absolute URL
```
