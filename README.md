# RxLens AI

**Photograph a Bangladesh prescription → confirm medicines → Gemma 4 explains the plan in Bangla or English.**

Educational companion only — not a doctor or pharmacist. Powered by **Gemma 4 only** (no other LLMs).

| Layer | Tech |
|-------|------|
| Mobile | Expo 54 · React Native · JavaScript (`mobile/`) |
| API | FastAPI · Python · Pydantic · Uvicorn (`api/`) |
| AI | `gemma-4-31b-it` via Google AI Studio / Generative Language API |
| Data | Bangladesh medicine KB (JSON) · MedEx indicative prices |
| Hosting | DigitalOcean API · EAS (Android APK + iOS Expo Go) |

---

## Live demo (public)

| What | Link |
|------|------|
| API health | https://api.eurus.studio/api/health |
| Android APK | https://expo.dev/accounts/nishad_mahmud/projects/rxlens-ai/builds/e71d9462-4333-4ef4-b71c-281b2c20fea5 |
| iOS (Expo Go → open **Preview** for QR) | https://expo.dev/accounts/nishad_mahmud/projects/rxlens-ai/updates/3551ded6-d5c3-463f-bb72-8245ae6ac8ab |
| Demo link sheet | [demo/DEMO_LINKS.md](./demo/DEMO_LINKS.md) |
| Kaggle writeup | [demo/KAGGLE_WRITEUP.md](./demo/KAGGLE_WRITEUP.md) |

Mobile points at: `EXPO_PUBLIC_API_URL=https://api.eurus.studio`

---

## Architecture

```text
Expo RxLens app (EN / বাংলা)
        │ HTTPS
        ▼
FastAPI  https://api.eurus.studio
   ├── POST /api/analyze     → Gemma 4 vision → medicine JSON
   ├── POST /api/brief       → Gemma 4 text   → educational briefing
   ├── POST /api/chat        → Gemma 4 text (± image)
   ├── POST /api/coach/missed-dose
   ├── GET  /api/medicines/* → BD KB search
   ├── GET  /api/prices      → MedEx indicative prices
   └── GET  /api/health
        │
        ├── api/data/medicines/*.json   (KB grounding)
        └── Google AI Studio (Gemma 4 only)
```

Pipeline: **Photo → Gemma vision → KB match → user confirm → Gemma briefing → EN/BN UI**

API keys stay on the server. The app never embeds `GEMINI_API_KEY`.

More detail: [ARCHITECTURE.md](./ARCHITECTURE.md) · [RXLENS.md](./RXLENS.md)

---

## How Gemma 4 is integrated

| Step | Model env | Endpoint / code |
|------|-----------|-----------------|
| Rx / pack image → medicines JSON | `GEMMA_VISION_MODEL` = `gemma-4-31b-it` | `POST /api/analyze` · [`api/app/gemma.py`](api/app/gemma.py) |
| Confirmed meds + KB → briefing JSON | `GEMMA_TEXT_MODEL` = `gemma-4-31b-it` | `POST /api/brief` |
| Health chat (± photo) | same | `POST /api/chat` |
| Missed-dose coaching | same | `POST /api/coach/missed-dose` |
| Prompts & safety | — | [`api/app/prompts.py`](api/app/prompts.py) |

**No GPT / Claude / Llama / other generative models.** KB + MedEx support Gemma; they do not replace it.

---

## API surface

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/health` | Liveness + model / mock flags |
| `POST` | `/api/analyze` | Vision extract medicines from image |
| `POST` | `/api/brief` | Educational briefing after confirm |
| `POST` | `/api/chat` | Follow-up chat (text ± image) |
| `POST` | `/api/coach/missed-dose` | Missed-dose education JSON |
| `GET` | `/api/medicines/search?q=` | KB brand/generic search |
| `GET` | `/api/medicines/{id}` | KB detail |
| `GET` | `/api/prices?q=` | Indicative BD list prices (MedEx) |

Optional header for public demos: `X-Demo-Token` (see `DEMO_TOKEN`).

---

## Repo layout

```text
mobile/          Expo React Native (JS) client
api/             FastAPI app + medicine KB data
  app/           gemma.py, prompts.py, main.py, kb.py, medex.py, …
  data/medicines Bangladesh KB JSON (+ raw HF merge inputs)
demo/            writeup, demo links, deploy notes
scripts/         build_bd_kb.py
```

---

## Quick start

### API (FastAPI)

```bash
cd api
python -m venv .venv
# Windows:
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 4000
```

| Env | Purpose |
|-----|---------|
| `GEMINI_API_KEY` | Google AI Studio key (required when not mocking) |
| `MOCK_AI` | `true` = offline demo; `false` = real Gemma 4 |
| `GEMMA_VISION_MODEL` | default `gemma-4-31b-it` |
| `GEMMA_TEXT_MODEL` | default `gemma-4-31b-it` |
| `DEMO_TOKEN` | optional shared demo token |
| `RATE_LIMIT_PER_MINUTE` | abuse shield |
| `KB_PATH` | optional path to enriched KB JSON |

```bash
cd api && pytest -q
```

Docker (repo root):

```bash
docker build -t rxlens-api ./api
docker run --rm -p 4000:4000 -e GEMINI_API_KEY=... -e MOCK_AI=false rxlens-api
```

### Mobile (Expo)

```bash
cd mobile
npm install
npx expo start -c
```

| Env | Purpose |
|-----|---------|
| `EXPO_PUBLIC_API_URL` | e.g. `https://api.eurus.studio` (or LAN `http://HOST:4000`) |
| `EXPO_PUBLIC_DEMO_TOKEN` | optional; sent as `X-Demo-Token` |

Local devices: if `EXPO_PUBLIC_API_URL` is unset, [`mobile/src/config.js`](mobile/src/config.js) derives the Metro LAN host + `:4000`.

---

## App features (MVP)

- Onboarding (EN/বাংলা) · scan / upload Rx or pack
- Confirm medicines (edit, timing icons, unmatched gate)
- Briefing tabs: Summary · Schedule · Interactions · Side effects · Notes
- My Medicines regimen · Scans archive · Chat · missed-dose coach
- Confirm-before-brief · soft educational language · disclaimers

---

## Safety

Educational only. Does not diagnose, prescribe, or replace a clinician. Unmatched / low-confidence medicines must be edited or explicitly acknowledged before briefing. Disclaimers on API responses and UI.

---

## Rebuild medicine KB

```bash
python scripts/build_bd_kb.py
```

Merges curated [`api/data/medicines/bd_medicines.json`](api/data/medicines/bd_medicines.json) with HF CSVs under `api/data/medicines/raw/bangladesh-hf/`.

---

## Docs

- [RXLENS.md](./RXLENS.md) — product & safety
- [ARCHITECTURE.md](./ARCHITECTURE.md) — request flow
- [HACKATHON_BRIEF.md](./HACKATHON_BRIEF.md) — competition rules
- [demo/DEMO_SCRIPT.md](./demo/DEMO_SCRIPT.md)
- [demo/DEPLOY_DIGITALOCEAN.md](./demo/DEPLOY_DIGITALOCEAN.md)
