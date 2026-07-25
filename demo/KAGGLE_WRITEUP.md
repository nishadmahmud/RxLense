# RxLens AI: Gemma 4 Prescription Intelligence for Bangladesh

**Subtitle:** Multimodal Rx reading + confirm-before-brief educational briefing in Bangla and English

---

## Problem

Many patients in Bangladesh leave clinics without understanding their prescriptions: what the medicines are for as a set, when to take them, what to avoid, which side effects are urgent, and what to ask next. Handwriting and local brand names make internet search unreliable. Wrong self-advice (stopping antibiotics early, stacking painkillers, missing doses) is common, especially for elderly patients, parents managing a child’s Rx, and rural users with limited English medical literacy. Patients need an educational companion that explains the plan in plain language, not a doctor replacement and not another generic chatbot.

## Solution

**RxLens AI** turns one prescription photo into a patient-friendly educational briefing:

1. Capture or upload an Rx (or medicine pack) image in the Expo mobile app.
2. **Gemma 4 vision** proposes medicines as JSON: name, strength, dose line, confidence, plus clinical text when visible (diagnosis/notes/tests).
3. The API fuzzy-matches each item against a **Bangladesh medicine knowledge base** (generics + local brands) and attaches a `kbSnapshot` for grounding.
4. The user **confirms, edits, adds, or removes** medicines; unmatched or low-confidence items must be fixed or explicitly acknowledged.
5. **Gemma 4 text** synthesizes a holistic briefing (JSON): summary, schedule with morning/noon/night timing, interactions, side-effect tiers, and soft educational notes.
6. The app shows results in **English or বাংলা**, with saved scans, a personal regimen view, and Chat for follow-up questions (symptom first-aid education, medicine questions, indicative BD prices).

Safety is first-class: loud disclaimers on every critical path, soft clinical language (“often used for…”), a confirm-before-brief gate, and refusal behavior for “prescribe for me” or “stop antibiotics because I feel fine.”

## Why Gemma 4 (only generative LLM)

Hackathon rules require Gemma 4 as the only generative model. We use it as the **core** of the product for both multimodal extraction and educational synthesis:

| Capability | Model id | API |
|------------|----------|-----|
| Image → medicine JSON | `gemma-4-31b-it` (`GEMMA_VISION_MODEL`) | `POST /api/analyze` |
| Confirmed meds + KB → briefing JSON | `gemma-4-31b-it` (`GEMMA_TEXT_MODEL`) | `POST /api/brief` |
| Health chat (± image) | same | `POST /api/chat` |
| Missed-dose coaching | same | `POST /api/coach/missed-dose` |

Implementation lives in `api/app/gemma.py` (Google Generative Language API) with prompts and safety rules in `api/app/prompts.py`. **No GPT, Claude, Llama, or other generative foundation models** are used. Traditional helpers (local KB, fuzzy match, MedEx indicative prices, FastAPI) support Gemma; they do not replace it.

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

- **Mobile:** Expo React Native (JavaScript) — camera/gallery, confirm UI, briefing tabs, Chat, regimen, local history (`mobile/`).
- **API:** FastAPI (Python) — analyze, brief, chat, prices, health (`api/`).
- **KB:** Curated safety rows merged with open Bangladesh medicine data so Gemma paraphrases grounded facts instead of inventing brand pharmacology.
- **Deploy:** Public API on DigitalOcean; preview Android APK and iOS Expo Go builds point at the hosted API (`EXPO_PUBLIC_API_URL`).

Pipeline: **Photo → Gemma vision → KB enrich → human confirm → Gemma briefing → EN/BN UI.**

## Technical challenges and how we addressed them

1. **Messy real-world prescriptions.** BD Rx sheets mix handwriting, local brands, and shorthand dose lines (`1+0+1`). We use Gemma 4 vision on the photo (not OCR-first), ask for structured JSON (name, strength, dose, confidence), and normalize common dose patterns for morning/noon/night UI.
2. **Local brand grounding.** Global medical text often misses Bangladesh trade names. We fuzzy-match extractions names to a BD medicine KB and inject `kbSnapshot` into the briefing prompt so Gemma paraphrases grounded facts instead of inventing pharmacology.
3. **Hallucinated advice is dangerous.** The app never briefs on raw model output alone. Users must confirm/edit medicines; low-confidence or unmatched items are blocked until fixed or explicitly acknowledged; briefing JSON is schema-validated with one repair retry.
4. **Explain the whole plan, not five leaflets.** Briefing prompts force holistic schedule, interactions, and side-effect tiers for the confirmed set together, in EN or বাংলা, with soft educational language (never “you have X” / never a new prescription).
5. **Helpful chat without becoming a doctor.** Chat supports symptoms, first-aid style self-care, and common OTC education with warnings, while still refusing diagnose-and-prescribe flows, Rx-only self-treatment, and dose changes that contradict a confirmed prescription.

## Impact and future work

RxLens targets **prescription literacy** for Bangla- and English-speaking patients using familiar local brands. It shows multimodal Gemma 4 on a socially meaningful healthcare-adjacent problem while staying educational-only. Future work: voice readout, richer offline packs, pharmacist handoff views, and deeper curated safety graphs—still with **Gemma 4 as the generative core**.

## How to try the demo (public, no login)

- **GitHub (source + README):** https://github.com/nishadmahmud/RxLense  
- **Live API health (Gemma online):** https://api.eurus.studio/api/health  
- **Android APK install:** https://expo.dev/accounts/nishad_mahmud/projects/rxlens-ai/builds/e71d9462-4333-4ef4-b71c-281b2c20fea5  
- **iOS via Expo Go (open Preview → QR):** https://expo.dev/accounts/nishad_mahmud/projects/rxlens-ai/updates/3551ded6-d5c3-463f-bb72-8245ae6ac8ab  
- **Expo Go QR helper:** https://qr.expo.dev/eas-update?projectId=d6247684-a42e-44ba-a246-2b816da61dc9&runtimeVersion=1.0.0&channel=preview&slug=exp  

Suggested walkthrough: onboarding → scan/upload Rx → confirm medicines → Generate briefing (Summary + Schedule) → ask Chat a follow-up → open My Medicines.

**Screenshots to embed in this Writeup:** Welcome, scan landing, confirm medicines, briefing tabs, Chat, My Medicines schedule.

**Backup:** Attach a 60–120s screen recording of the full flow if venue Wi‑Fi is unreliable (allowed demo format).

---

*Word count ≈ 870 (limit 1,500). Paste Title through How to try into Kaggle. Attach repo + Android + iOS (+ video) under Attachments, then click Submit. See [DEMO_LINKS.md](./DEMO_LINKS.md).*
