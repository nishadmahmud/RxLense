# DECISION — Locked

## Chosen project: **RxLens AI**

Prescription intelligence assistant for Bangladesh.  
Stack: **Expo (JavaScript, not TypeScript) + FastAPI (Python) + Gemma 4 + medicine KB**.  
Spec: [RXLENS.md](./RXLENS.md)

**Not building:** LearnMate clones, MasteryPilot, ReceiptOS, SkySense, PaperPilot, DiffMind, NothiOS (kept as alts only).

---

## Why RxLens

- Real-world product for normal users (healthcare literacy)
- Gemma is core (vision + whole-Rx reasoning), not a chatbot skin
- Clear demo + strong social impact for Bangladesh
- Differentiated from organizer sample (education flashcards)

---

## Stack lock

| Piece | Choice |
|-------|--------|
| Mobile language | JavaScript only (no TypeScript) |
| Mobile | Expo React Native |
| API | FastAPI (Python) on DigitalOcean |
| Model | Gemma 4 via Google AI Studio (server key) |
| KB | Local JSON + fuzzy match |

---

## Earlier shortlist (not selected)

1. ReceiptOS — bookkeeping agent (superseded; see RECEIPTOS.md)  
2. SkySense — astronomy companion  
3. PaperPilot — research claim graph  
4. DiffMind — screenshot-to-fix coding agent  
5. NothiOS — bureaucracy packet agent  
