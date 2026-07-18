# RxLens AI

Hackathon project: prescription intelligence for Bangladesh powered by **Gemma 4** only.

- **Mobile:** Expo React Native — **JavaScript** (`mobile/`)
- **API:** **FastAPI (Python)** (`api/`)
- **Models:** `gemma-4-31b-it` for vision extract + text briefing (Google AI Studio / Generative Language API)

## Docs
- [RXLENS.md](./RXLENS.md) — product, safety, architecture
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [HACKATHON_BRIEF.md](./HACKATHON_BRIEF.md)
- [demo/DEMO_SCRIPT.md](./demo/DEMO_SCRIPT.md)
- [demo/DEPLOY_DIGITALOCEAN.md](./demo/DEPLOY_DIGITALOCEAN.md)
- [demo/KAGGLE_WRITEUP.md](./demo/KAGGLE_WRITEUP.md) — draft ≤1500 words for Kaggle

## How Gemma 4 is integrated

| Step | Model | Code |
|------|--------|------|
| Read prescription image → medicine JSON | `GEMMA_VISION_MODEL` (`gemma-4-31b-it`) | [`api/app/gemma.py`](api/app/gemma.py) `call_gemma(..., image_base64=...)` via [`/api/analyze`](api/app/main.py) |
| Confirmed meds + KB snapshots → briefing JSON | `GEMMA_TEXT_MODEL` (`gemma-4-31b-it`) | same `call_gemma` via [`/api/brief`](api/app/main.py) |
| Prompts / refusals | — | [`api/app/prompts.py`](api/app/prompts.py) |

No other LLMs are used for generation. The BD medicine KB ([`api/data/medicines/`](api/data/medicines/)) grounds facts; Gemma synthesizes patient-friendly wording.

```text
Photo → Gemma 4 vision → KB match → user confirm → Gemma 4 briefing → Expo EN/BN UI
```

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
- `MOCK_AI=true` — demo without a key  
- Real Gemma 4: set `GEMINI_API_KEY`, `MOCK_AI=false`, models `gemma-4-31b-it`

Tests:
```bash
cd api
pytest -q
```

Docker (from repo root):
```bash
docker build -t rxlens-api ./api
docker run --rm -p 4000:4000 -e GEMINI_API_KEY=... -e MOCK_AI=false rxlens-api
```

### Mobile (JavaScript)
```bash
cd mobile
npm install
npx expo start -c
```
- Local device: API URL auto-detects Metro LAN host (`src/config.js`)
- Public demo: `EXPO_PUBLIC_API_URL=https://YOUR_HOST` and optional `EXPO_PUBLIC_DEMO_TOKEN`

## Safety
Educational companion only — not a doctor or pharmacist. Confirm-before-brief gate; unmatched medicines must be edited or explicitly acknowledged. Disclaimers on API + UI.

## Rebuild medicine KB
```bash
python scripts/build_bd_kb.py
```
Merges curated [`api/data/medicines/bd_medicines.json`](api/data/medicines/bd_medicines.json) with HF CSVs under `api/data/medicines/raw/bangladesh-hf/`.
