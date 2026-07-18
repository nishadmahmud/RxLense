# DigitalOcean deploy (RxLens FastAPI)

MVP does **not** need a GPU droplet. Host FastAPI; call **Gemma 4** via Google AI Studio.

## Option A — Docker on a Droplet

```bash
# on the droplet, from repo root
docker build -t rxlens-api ./api
docker run -d --name rxlens-api -p 4000:4000 \
  -e GEMINI_API_KEY=YOUR_KEY \
  -e MOCK_AI=false \
  -e GEMMA_VISION_MODEL=gemma-4-31b-it \
  -e GEMMA_TEXT_MODEL=gemma-4-31b-it \
  -e DEMO_TOKEN=optional-shared-token \
  -e RATE_LIMIT_PER_MINUTE=30 \
  rxlens-api
```

Put Nginx/Caddy in front for HTTPS.

## Option B — App Platform

1. Connect the GitHub repo
2. **Dockerfile path:** `api/Dockerfile` (build context = `api/`)
3. HTTP port: `4000` (or `$PORT` if you map it)
4. Env vars:
   - `GEMINI_API_KEY`
   - `MOCK_AI=false`
   - `GEMMA_VISION_MODEL=gemma-4-31b-it`
   - `GEMMA_TEXT_MODEL=gemma-4-31b-it`
   - `DEMO_TOKEN` (optional shared header — not a login wall)
   - `RATE_LIMIT_PER_MINUTE=30`
   - `KB_PATH=/data/medicines/bd_medicines_enriched.json`

## Smoke test

```bash
curl https://YOUR_HOST/api/health
curl -X POST https://YOUR_HOST/api/analyze \
  -H "content-type: application/json" \
  -H "X-Demo-Token: YOUR_TOKEN" \
  -d "{\"demoPreset\":\"throat\",\"language\":\"en\"}"
```

## Expo / mobile

```bash
cd mobile
# permanent public API for demos:
set EXPO_PUBLIC_API_URL=https://YOUR_HOST
set EXPO_PUBLIC_DEMO_TOKEN=YOUR_TOKEN
npx expo start -c
```

Or export in PowerShell:

```powershell
$env:EXPO_PUBLIC_API_URL="https://YOUR_HOST"
$env:EXPO_PUBLIC_DEMO_TOKEN="YOUR_TOKEN"
npx expo start -c
```

Local LAN still works via `src/config.js` auto host detection when `EXPO_PUBLIC_API_URL` is unset.
