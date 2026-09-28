# Vibe & Volumes — Backend

A small, self-contained Node/Express service. It does **two** things; everything
else (the whole deterministic music-career sim) runs on the device:

| Area | Endpoint | Why it's server-side |
| --- | --- | --- |
| AI proxy | `POST /ai/generate` | Holds the LLM API key so it never ships in the app bundle. Calls the model, moderates output, enforces a daily token cap. |
| Community | `POST /community/publish`, `GET /community/legends`, `GET /community/hall-of-fame` | Shared legends / hall of fame for published careers. |
| Health | `GET /health` | Liveness + config probe. |

The app is **fully playable with this backend absent** — the client falls back
to free deterministic local generation and bundled community data.

## Run locally

```bash
cd backend
cp .env.example .env        # then set AI_API_KEY (leave blank to test local-fallback)
npm install                 # or `npm install` once at the repo root (workspace)
npm run dev                 # tsx watch, hot reload on :8787
```

Smoke test:

```bash
curl localhost:8787/health
curl -X POST localhost:8787/ai/generate \
  -H 'content-type: application/json' \
  -d '{"feature":"social-enhance","system":"You write fictional in-game chatter.","promptText":"Return one short line."}'
curl localhost:8787/community/legends
```

With no `AI_API_KEY`, `/ai/generate` returns `503 ai_not_configured` by design
(the client then stays on local generation).

## Connect the app

Set the backend URL in the Expo app config (`app.json` → `expo.extra.backendUrl`)
or via env `EXPO_PUBLIC_BACKEND_URL`. On a physical device use your machine's LAN
IP (e.g. `http://192.168.1.20:8787`), not `localhost`. The client only calls the
backend when AI cloud mode is enabled in-game; otherwise it never touches it.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Hot-reloading dev server (`tsx watch`). |
| `npm run build` | Type-check + compile to `dist/`. |
| `npm start` | Run the compiled server (`node dist/index.js`). |
| `npm run typecheck` | Type-check only. |

## Deploy on Render

This service is built to be lifted out and deployed independently.

- **Blueprint:** commit `render.yaml`, then Render → New → Blueprint. It sets
  `rootDir: backend`, build `npm install && npm run build`, start `npm start`,
  health check `/health`.
- **Manual web service:** Root Directory `backend`, Build `npm install && npm run build`,
  Start `npm start`. Add `AI_API_KEY` (and tighten `ALLOWED_ORIGINS`) in the
  dashboard.

To split this into its own repo later: copy the `backend/` folder out, run
`npm install` (generates its own lockfile), done — it has no imports from the app.

## Environment

See [`.env.example`](./.env.example). Key vars: `AI_API_KEY` (secret),
`LLM_BASE_URL`, `AI_MODEL`, `ALLOWED_ORIGINS`, `COMMUNITY_ENABLED`,
`MAX_TOKENS_PER_DAY`.
