# Top Project Ideas — Gemma 4 Hackathon

Ranked for **top-3 potential**: Gemma centrality × real impact × 1-day buildability × demo wow.

Scoring key (1–5): **Gemma fit / Impact / Buildable / Demo wow**

---

## LOCKED: RxLens AI

**Building this.** Full spec: [RXLENS.md](./RXLENS.md) · Decision: [DECISION.md](./DECISION.md)

Prescription photo → confirm meds + patient context → Gemma 4 holistic Bangla/English briefing.  
Stack: Expo JS + Express JS + medicine KB. Educational guardrails required.

| Gemma fit | Impact | Buildable | Demo |
|-----------|--------|-----------|------|
| 5 | 5 | 4 | 5 |

Everything below is brainstorm / rejected alternatives.

---

## 🥇 TOP PICKS (archived brainstorm)

### 1. FormFelo BD — Bangla govt/form & document copilot
**One-liner:** Upload a Bangla/English form, NID slip, university admission PDF, or bank form photo → Gemma 4 reads it (vision + OCR reasoning) → explains each field in plain Bangla → fills a guided checklist / draft answers.

| Gemma fit | Impact | Buildable | Demo |
|-----------|--------|-----------|------|
| 5 | 5 | 4 | 5 |

**Why it wins**
- Multimodal is *core* (not a chat wrapper)
- Massive Bangladesh pain: forms, bureaucracy, low literacy / English barriers
- Demo is visual and instant to understand

**Gemma 4 role:** image/PDF understanding + field extraction + Bangla explanation + answer drafting  
**Stack sketch:** Next.js/Streamlit + Gemma 4 (vision) + simple PDF/image upload  
**Demo script:** photo of admission form → “এই ঘরে কী লিখব?” → guided answers

**Avoid:** trying to submit real govt forms; keep it advisory + draft-only.

---

### 2. KrishiDrishti — crop/leaf diagnosis + farmer action plan
**One-liner:** Farmer snaps a sick leaf/crop → Gemma 4 diagnoses likely issue → gives Bangla treatment steps, severity, and “when to see agriculture officer.”

| Gemma fit | Impact | Buildable | Demo |
|-----------|--------|-----------|------|
| 5 | 5 | 4 | 5 |

**Why it wins**
- Vision + reasoning + local impact = rubric jackpot
- Agriculture is explicitly listed in challenge domains
- Judges love social-impact + clear beneficiary

**Gemma 4 role:** image understanding + structured diagnosis JSON + Bangla advice  
**Stack sketch:** mobile-friendly web (camera capture) + Gemma vision + optional weather stub  
**Demo script:** upload leaf photo → disease guess + 3 action steps in Bangla

**Avoid:** claiming medical/ag certainty; show confidence + “consult local officer.”

---

### 3. Pathshala Tutor — photo homework → step-by-step Bangla tutor
**One-liner:** Student photos a math/science problem (Bangla board textbook or handwritten) → Gemma solves with steps, not just the answer → quizzes understanding.

| Gemma fit | Impact | Buildable | Demo |
|-----------|--------|-----------|------|
| 5 | 5 | 5 | 5 |

**Why it wins**
- Education + multimodal + reasoning = strong Gemma showcase
- Easiest “wow” demo for judges
- Very shippable in a day

**Gemma 4 role:** OCR/handwriting + multi-step reasoning + Socratic tutoring in Bangla/English  
**Stack sketch:** Streamlit/Next.js upload + Gemma + session history  
**Demo script:** handwritten math photo → steps → “try this similar problem”

**Risk:** many education tutors exist — win by **Bangla textbook/handwriting + Socratic mode**, not answer dumps.

---

### 4. Asha Health Navigator — symptom + Rx label / report explainer (not a doctor)
**One-liner:** Upload prescription / lab report / medicine packet photo → Gemma explains in simple Bangla what it says, warnings, questions to ask a doctor.

| Gemma fit | Impact | Buildable | Demo |
|-----------|--------|-----------|------|
| 5 | 5 | 4 | 4 |

**Why it wins**
- Healthcare impact + multimodal OCR
- Huge literacy/access gap in BD

**Gemma 4 role:** document/image understanding + safe, disclaimer-heavy explanation  
**Must have:** big “not medical advice” banner; no diagnosis claims beyond “what the paper says”

---

### 5. AgentDesk BD — tool-calling life admin agent
**One-liner:** Bangla voice/text agent that uses **Gemma native function calling** to plan: bill reminders, study schedule, job CV critique from uploaded PDF, expense categorization from receipt photos.

| Gemma fit | Impact | Buildable | Demo |
|-----------|--------|-----------|------|
| 5 | 4 | 3 | 5 |

**Why it wins**
- Shows **agentic / tool-calling** — distinctive Gemma 4 strength
- Feels “next-gen,” not just chatbot

**Gemma 4 role:** planning + tool calls (calendar, PDF parse, receipt vision, local DB)  
**Build tip:** 3 tools max for demo reliability

---

## 🥈 STRONG ALTERNATES

### 6. ShopGuard — SME receipt/invoice fraud & bookkeeping helper
Upload messy shop invoices → extract line items → Bangla P&L summary + anomaly flags.  
**Gemma:** vision + structured extraction. **Impact:** small business BD.

### 7. Flood/Disaster Info Buddy
User shares location + photo of waterlogging / news clipping → Gemma summarizes risk actions + nearby shelter checklist (static data OK for prototype).  
**Gemma:** multimodal + reasoning. **Impact:** climate/resilience.

### 8. AccessBangla — screen/UI reader for low-vision users
Screenshot of any app/website → Gemma describes layout + reads key text in Bangla + suggests next action.  
**Gemma:** UI/screen understanding. **Impact:** accessibility.

### 9. LegalLite (consumer rights)
Photo of contract/T&C snippet → Gemma explains risks in Bangla + checklist of red flags (not legal advice).  
**Gemma:** long-context doc reasoning. **Caution:** heavy disclaimers.

### 10. CampusNav Agent
SEU/university circular PDF + student query → Gemma answers with citations from the uploaded circular (RAG-lite with Gemma, no other LLM).  
**Gemma:** long context / doc QA. **Impact:** campus productivity; easy offline pitch at SEU.

---

## 🚀 AMBITIOUS TIER (bigger than classify → explain)

These are **systems**, not single prompts. Demo a thin vertical slice; sell the full vision in the writeup.

### A. **NothiOS** — Bureaucracy operating system (agent loop)
Not “what is this field?”  
Gemma runs a **case**: plan → gather missing docs → draft packet → validate → export submission-ready ZIP (filled forms + cover letter + checklist). User chats to amend; agent re-plans.

**Big because:** stateful workflow + tools + artifacts, not classification.  
**Demo slice:** 1 admission/KYC case, photo in → packet out.

### B. **DrishtiLive** — Live camera accessibility / scene agent
Continuous frames from RN camera → Gemma narrates scene, reads signs/menus in Bangla, warns hazards, answers “where is the exit?” with memory of last N frames.

**Big because:** realtime multimodal agent, not upload-once OCR.  
**Demo slice:** 30–60s recorded screen capture of live narration (throttle frames every 2s).

### C. **Shomoy** — Climate / flood response command brain
Ingest mixed inputs (user flood photos, Bangla news text, open weather, static shelter CSV) → Gemma builds a **situation report**, ranks actions, assigns “household / ward / NGO” checklists, updates as new photos arrive.

**Big because:** multi-source fusion + planning under uncertainty.  
**Demo slice:** 3 inputs → live sitrep + action board.

### D. **Pathshala OS** — Full teaching loop (not homework answers)
Photo of lesson/problem → diagnose misconception → generate mini-lesson → adaptive quiz → spaced-repetition schedule → parent Bangla report. Gemma is the pedagogy engine with tools (quiz store, progress DB).

**Big because:** closed learning loop + memory over time.  
**Demo slice:** one student session that ends with quiz + report PDF.

### E. **KaraAgent** — Computer-use style form filler (highest wow, highest risk)
Gemma plans steps and “operates” a sandbox web form (via Playwright tools: click, type, read DOM) to fill a practice portal while explaining each action in Bangla.

**Big because:** agentic tool use that *does* work, not just talks.  
**Demo slice:** one fake university form page you control + agent fills it live.

### F. **GraphNothi** — Build a knowledge graph from Bangla docs
Upload 5–10 circulars/policies → Gemma extracts entities/relations → graph UI → multi-hop questions (“If X rule and Y deadline, what should a student do?”).

**Big because:** structure + reasoning over a corpus, not one image.  
**Demo slice:** 5 PDFs → graph → 3 multi-hop answers with citations.

---

## Reality check: what “big” means in a 1-day sprint

| Illusion of big | Actually big (and winnable) |
|-----------------|-----------------------------|
| 20 features half-broken | 1 agent loop that produces a real artifact |
| “We’ll fine-tune everything” | Strong tools + memory + multimodal on base Gemma |
| Another chatbot skin | System with state, tools, and outcomes |
| Boil the ocean | Full vision in writeup + **narrow killer demo** |

You *can* go bigger than classify. You cannot ship a national platform in one day — you ship the **brain of one** and prove it.

---

## ❌ SKIP / LOW TOP-3 ODDS

| Idea | Why weak |
|------|----------|
| Generic “ChatGPT clone in Bangla” | Weak Gemma differentiation |
| Another resume rewriter only | Saturated, low multimodal need |
| Fine-tune-only project with no app | Demo + UX suffer |
| Multi-agent empire with 10 features | Won’t work in 1 day |
| Anything needing another LLM “just for…” | **Disqualification risk** |

---

## Recommended decision matrix

If you want **highest chance of top 3**, pick in this order:

1. **FormFelo BD** — if you can do image upload + clean UI  
2. **Pathshala Tutor** — if you want fastest reliable demo  
3. **KrishiDrishti** — if you want maximum social-impact story  
4. **AgentDesk BD** — if you’re strong at tool-calling / backend and want “wow tech”

### Team skill → best match

| Your strength | Pick |
|---------------|------|
| Frontend / UX | FormFelo or Pathshala |
| CV / multimodal interest | KrishiDrishti or FormFelo |
| Backend / agents | AgentDesk BD |
| Healthcare passion | Asha Navigator (with safety framing) |

---

## Winning formula (any idea)

1. **One hero user** (farmer / SSC student / parent filling forms)  
2. **One Gemma-powered superpower** (vision OR agents OR long-doc — go deep)  
3. **One 90-second demo path** that always works  
4. **Bangla in / Bangla out** where it matters  
5. **Architecture diagram** with Gemma in the center  

---

## Next step

Pick **one top pick** → lock a 90-second demo script → then scaffold the repo.
