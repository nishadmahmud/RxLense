# RxLens AI: Gemma 4 Prescription Intelligence for Bangladesh

**Subtitle:** Multimodal Rx reading + confirm-before-brief educational briefing in Bangla and English

---

## Problem

In Bangladesh, a prescription is often the only artifact a patient leaves the clinic with, yet many people cannot reliably use it. Handwriting, Latin abbreviations, and local brand names (Pantonix, Napa, Cef-3, and thousands more) make internet search unreliable. Patients struggle to answer basic questions: What is this set of medicines for together? When is morning vs night? What food or other drugs to avoid? Which side effects are common vs emergency? What should I ask the doctor next?

Wrong self-advice is common: stopping antibiotics early because “I feel fine,” stacking painkillers, missing doses, or trusting random Facebook advice. The burden falls hardest on elderly patients, parents managing a child’s Rx, and rural users with limited English medical literacy. Bangladesh needs an educational companion that reads a real local prescription photo and explains the plan in plain Bangla or English, without pretending to be a doctor.

## Solution

**RxLens AI** is a mobile app that turns one prescription (or medicine pack) photo into a patient-friendly educational briefing:

1. Capture or upload an image in the Expo app (EN / বাংলা).
2. **Gemma 4 vision** proposes structured medicines: name, strength, dose line, confidence, plus clinical text when visible (diagnosis, notes, tests).
3. The API fuzzy-matches each item against a **Bangladesh medicine knowledge base** and attaches a `kbSnapshot` for grounding.
4. The user **confirms, edits, adds, or removes** medicines. Unmatched or low-confidence items must be fixed or explicitly acknowledged.
5. **Gemma 4 text** synthesizes a holistic briefing (JSON): summary, morning/noon/night schedule, interactions, side-effect tiers, and soft educational notes for the confirmed set together.
6. The app shows briefing tabs, saved scans, a personal regimen view, missed-dose coaching, and Chat for follow-ups (symptoms / first-aid style tips, medicine questions, indicative BD list prices).

Safety is first-class: loud disclaimers, soft clinical language (“often used for…”), a confirm-before-brief gate, and refusals for “prescribe for me” or “stop antibiotics because I feel fine.”

## Why Gemma 4 is the core (not a wrapper)

Hackathon rules require Gemma 4 as the only generative LLM. We made it indispensable, not decorative:

| Capability | Gemma 4 role | Model | API |
|------------|--------------|-------|-----|
| Multimodal Rx / pack reading | Image → medicine JSON | `gemma-4-31b-it` | `POST /api/analyze` |
| Holistic educational briefing | Confirmed meds + KB → briefing JSON | `gemma-4-26b-a4b-it` | `POST /api/brief` |
| Health chat (± image) | Follow-up reasoning in EN/BN | text model (vision if photo) | `POST /api/chat` |
| Missed-dose coaching | Structured educational options | text model | `POST /api/coach/missed-dose` |

Implementation: [`api/app/gemma.py`](https://github.com/nishadmahmud/RxLense) calling Google Generative Language API; prompts and refusals in `api/app/prompts.py`. We split **31B dense for vision** (harder handwriting / packs) and **26B MoE for text** (faster briefing/chat) while staying entirely inside Gemma 4.

**No GPT, Claude, Llama, or other generative foundation models.** The BD medicine KB, fuzzy match, MedEx prices, and FastAPI are traditional helpers that ground and serve Gemma; they do not replace generation.

Gemma strengths we lean on: **vision on messy documents**, **structured JSON reasoning**, and **Bangla + English** patient-facing wording.

## System architecture

```text
Expo RxLens app (EN/BN)
        | HTTPS
FastAPI  https://api.eurus.studio
   |-- Gemma 4 vision  → extract medicines from photo
   |-- BD Medicine KB  → enrich / ground facts
   |-- Gemma 4 text    → briefing, chat, missed-dose coach
   |-- MedEx (optional)→ indicative Bangladesh list prices
```

- **Mobile:** Expo React Native (JavaScript) — camera/gallery, confirm UI, briefing tabs, Chat, regimen, local history.
- **API:** FastAPI (Python) + Pydantic validation — `/api/analyze`, `/api/brief`, `/api/chat`, `/api/coach/missed-dose`, medicine search, prices, health.
- **KB:** Curated safety rows merged with open Bangladesh medicine data so Gemma paraphrases grounded facts instead of inventing brand pharmacology.
- **Deploy:** DigitalOcean API; Android APK and iOS Expo Go point at `EXPO_PUBLIC_API_URL=https://api.eurus.studio`.

Pipeline: **Photo → Gemma vision → KB enrich → human confirm → Gemma briefing → EN/BN UI.**

## User experience (what judges should see)

- Clinical Precision UI: graphite CTAs, clear morning/noon/night timing, EN|বাংলা toggle.
- Confirm screen before any advice; confidence / “Gemma unsure” cues.
- Briefing tabs stay complete: Summary · Schedule · Interactions · Side effects · Notes (when clinical text exists).
- Chat: friendly errors + Retry (no raw API dumps); copyable replies; image attach for packs/Rx questions.
- My Medicines: regimen grouped by time of day; missed-dose handoff into Chat.

## Technical challenges and how we addressed them

1. **Messy real-world prescriptions.** BD Rx sheets mix handwriting, local brands, and shorthand dose lines (`1+0+1`). We use Gemma 4 vision on the photo (not OCR-first), demand structured JSON (name, strength, dose, confidence), and normalize dose patterns for morning/noon/night UI.
2. **Local brand grounding.** Global medical text often misses Bangladesh trade names. We fuzzy-match extracted names to a BD medicine KB and inject `kbSnapshot` into the briefing prompt so Gemma paraphrases grounded facts.
3. **Hallucinated advice is dangerous.** The app never briefs on raw model output alone. Users must confirm/edit; low-confidence / unmatched items are blocked until fixed or acknowledged; briefing JSON is schema-validated with one repair retry.
4. **Explain the whole plan, not five leaflets.** Briefing prompts force holistic schedule, interactions, and side-effect tiers for the confirmed set, in EN or বাংলা, with soft educational language (never “you have X,” never a new prescription).
5. **Helpful chat without becoming a doctor.** Chat supports symptoms, first-aid style self-care, and common OTC education with warnings, while refusing diagnose-and-prescribe flows, Rx-only self-treatment, and dose changes that contradict a confirmed prescription.
6. **Latency vs quality.** Dense 31B is excellent but slow/quota-heavy for every text call. We keep 31B for vision extract and use Gemma 4 26B MoE (`gemma-4-26b-a4b-it`) for briefing and chat so demos stay responsive without leaving the Gemma 4 family.

## Impact and future work

RxLens targets **prescription literacy** where it matters: local brands, bilingual UI, and a confirm gate that respects clinical safety. It is a working prototype for patients and caregivers who leave the clinic confused, not a hospital EMR replacement. Future work: voice readout, richer offline packs, pharmacist handoff views, and deeper curated safety graphs—still with **Gemma 4 as the generative core**.

## How to try the demo (public, no login)

- **Demo video (full walkthrough):** https://www.youtube.com/watch?v=bjXdwUWmSBg  
- **GitHub (source + README):** https://github.com/nishadmahmud/RxLense  
- **Live API health (Gemma online):** https://api.eurus.studio/api/health  
- **Android APK:** https://expo.dev/accounts/nishad_mahmud/projects/rxlens-ai/builds/35f66017-d48d-47e2-8f92-7f1de75b5dcb  
- **iOS via Expo Go (open Preview → QR):** https://expo.dev/accounts/nishad_mahmud/projects/rxlens-ai/updates/afafafed-dcf1-4374-9c70-73f17320fd3a  

