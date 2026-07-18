# RxLens AI — Kaggle writeup draft (≤1500 words)

**Title:** RxLens AI: Gemma 4 Prescription Intelligence for Bangladesh  
**Subtitle:** Multimodal Rx reading + confirmed, KB-grounded educational briefings in Bangla and English

---

## Problem

Many patients in Bangladesh leave clinics without understanding their prescriptions: what the medicines are for as a set, when to take them, what to avoid, which side effects are urgent, and what to ask next. Handwriting and local brand names make internet search unreliable. Wrong self-advice (stopping antibiotics early, stacking painkillers) is common. Patients need an educational companion—not a doctor replacement.

## Solution

**RxLens AI** turns one prescription photo into a patient-friendly briefing:

1. Capture / upload an Rx image  
2. **Gemma 4 vision** proposes medicines (name, strength, dose line, confidence)  
3. Fuzzy-match against a Bangladesh medicine knowledge base (~1.5k generics, ~14k brands)  
4. **User confirms / edits** medicines and light patient context  
5. **Gemma 4 text** produces a holistic educational briefing (JSON): summary, schedule, interactions, food/lifestyle, side-effect tiers, doctor questions  
6. The Expo app shows tabs in English or বাংলা  

Safety is first-class: loud disclaimers, soft clinical language, confirm-before-brief gate, and refusal behavior for “prescribe for me” / “stop antibiotics because I feel fine.”

## Why Gemma 4 (not another LLM)

Hackathon rules require Gemma 4 as the only generative model. We use it for **both** multimodal extraction and briefing synthesis:

- Vision model id: `gemma-4-31b-it` (image + prompt → JSON medicines)  
- Text model id: `gemma-4-31b-it` (confirmed meds + KB snapshots → JSON briefing)  

No GPT/Claude/Llama for generation. Traditional helpers (local KB, fuzzy match, FastAPI) support Gemma—they do not replace it.

## System architecture

- **Mobile:** Expo React Native (JavaScript) — camera/gallery, confirm UI, Bangla chrome, local history  
- **API:** FastAPI (Python) — `/api/analyze`, `/api/brief`, `/api/health`, medicine search  
- **KB:** Curated safety rows merged with an open Bangladesh medicine CSV dataset; API injects `kbSnapshot` into the briefing prompt so Gemma paraphrases facts instead of inventing brand pharmacology  
- **Deploy:** Containerized API on DigitalOcean; Expo points at the public URL for demos  

Pipeline: Photo → Gemma vision → KB enrich → human confirm → Gemma briefing → EN/BN UI.

## Technical challenges and fixes

1. **Localhost on phones:** Expo Go cannot reach `127.0.0.1` on the laptop; we resolve the Metro LAN host and bind uvicorn to `0.0.0.0`.  
2. **Wrong model ids:** Early `gemma-3-4b-it` returned 404; switched to current Gemma 4 ids.  
3. **Mock mode masking vision:** `MOCK_AI=true` ignored images; disabled for real demos.  
4. **Brand coverage:** Small curated JSON missed BD brands (Paridon, Pantonix); merged Hugging Face Bangladesh medicine CSVs and curated ~80 high-value rows with food/interaction/serious fields.  
5. **Hallucination risk:** Confirm gate + KB-first prompts + `needsReview` hard-block (with explicit user acknowledge escape).  
6. **Public abuse:** Optional shared `X-Demo-Token` and IP rate limit—not a user login wall (allowed for public demos).

## Impact

RxLens targets prescription literacy for Bangla- and English-speaking patients using familiar local brands. It demonstrates multimodal Gemma 4 on a socially meaningful healthcare-adjacent problem while staying educational-only. Future work: richer offline packs, voice readout, pharmacist handoff, and deeper curated safety graphs—still with Gemma as the generative core.

## Attachments

- Public GitHub repository (install + README with Gemma model ids)  
- Public API health URL / Expo demo instructions  
- Backup 2-minute demo video (venue Wi‑Fi insurance)

---

*Word count target: keep final Kaggle paste under 1500 words; trim “Future work” if needed.*
