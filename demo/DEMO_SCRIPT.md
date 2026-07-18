# RxLens AI demo script (~2 minutes)

## Setup
1. API: `cd api` → activate venv → `uvicorn app.main:app --reload --host 0.0.0.0 --port 4000`
   - Local demo: `MOCK_AI=true` works without a key
   - Live Gemma: `MOCK_AI=false` + `GEMINI_API_KEY` + models `gemma-4-31b-it`
2. Mobile: `cd mobile && npm install && npx expo start -c`
3. Public demo: set `EXPO_PUBLIC_API_URL` to your DigitalOcean HTTPS URL (see DEPLOY_DIGITALOCEAN.md)

## Live demo path (judges)
1. Open app → read disclaimer → Continue (toggle **বাংলা** once to show localization)
2. Tap **Try demo prescription** (or scan a real Rx photo)
3. Confirm screen: show KB **Matched** rows (Moxacil / Napa / Seclo or Paridon / Pantonix…)
4. Point at **Needs review** gate — explain we never brief until the patient confirms
5. Set patient context (adult) → Generate briefing
6. Walk **Summary → Schedule timeline → Interactions → Ask doctor**
7. Toggle language and note BN briefing / UI chrome
8. Close: “Educational only — Gemma 4 reads the Rx and reasons over the whole plan; BD KB grounds brand facts.”

## Backup video checklist (record if venue Wi‑Fi fails)
- [ ] Disclaimer + Bangla toggle
- [ ] Demo analyze (~throat preset) OR gallery photo
- [ ] Confirm + KB match callout
- [ ] Briefing tabs including schedule timeline
- [ ] One sentence on Gemma 4 vision + text (`gemma-4-31b-it`)
- Keep total under **2 minutes**; upload alongside Kaggle writeup

## Red-team talking points (if asked)
- We refuse “stop antibiotics because I feel fine” and “prescribe something else” in prompts
- Hard gate: unmatched meds must be edited or explicitly confirmed
- Disclaimers on every critical screen + API payloads

## Sample talk track
“Patients leave clinics unsure what their handwritten Rx means. RxLens uses **Gemma 4** to read the prescription, asks you to confirm medicines against a Bangladesh brand knowledge base, then explains the whole plan — schedule, cautions, and questions for your doctor — in Bangla or English. It does not diagnose or prescribe.”
