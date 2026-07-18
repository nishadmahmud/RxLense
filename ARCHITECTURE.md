# Architecture — RxLens AI

Full product spec: [RXLENS.md](./RXLENS.md)

## Stack

```text
Expo RN (JavaScript only — not TypeScript)
        │ HTTPS
        ▼
FastAPI / Python (DigitalOcean)
        │
        ├── api/data/medicines/*.json  (KB)
        └── Google AI Studio API   (Gemma 4 only)
```

- API keys never ship inside the mobile app  
- Optional on-device OCR = hint only; Gemma vision is primary  

## Request flow

```text
POST /api/analyze   { imageBase64, ocrHint?, language }
        → Gemma extract candidates
        → KB fuzzy match
        → { medicines[], disclaimer }

User confirms + patientContext in app

POST /api/brief     { medicines[], patientContext, language }
        → Gemma holistic briefing (guardrailed JSON)
        → Pydantic validate (+ one retry)
        → { briefing, disclaimer }
```

## Safety in the architecture

- System prompts live only on the server  
- Pydantic schemas reject invalid model output  
- Confirm gate is a product requirement  
- Disclaimer attached to every intelligence response  

## Hosting

- **DigitalOcean:** run uvicorn (Droplet or App Platform)  
- **Gemma:** managed Google AI Studio (no GPU droplet required for MVP)  

## Repo

```text
mobile/        Expo JS client
api/           FastAPI (Python) + data/medicines KB
demo/          sample script + deploy notes
```
