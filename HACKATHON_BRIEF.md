# Build with Gemma 4 Hackathon — Reference Brief

> Bangladesh hybrid community hackathon · Prize pool USD $2,000  
> Goal: land in **top 3** (1st $1000 / 2nd $600 / 3rd $400)

---

## What this competition is

A **sprint-style open-innovation hackathon**, not a polished product contest.

- Build an AI app powered by **Gemma 4** that solves a **real-world problem**
- Domains are open: education, healthcare, accessibility, productivity, agriculture, finance, climate, public services, social impact, etc.
- Judges care about: **working demo + clear Gemma 4 integration + meaningful problem + clear writeup**
- Expectation: prototype quality, not production polish

### Format

| Mode | Who |
|------|-----|
| Offline (in-person) | Southeast University students |
| Online | Students from **any university in Bangladesh** via Kaggle |

---

## Hard rules (disqualification risks)

1. **Gemma 4 must be the primary AI model**
2. **Gemma 4 must be the only LLM** powering the app’s generative AI
3. **No other LLMs / generative foundation models** (GPT, Claude, Gemini-as-LLM, Llama, etc.)
4. Allowed helpers: traditional ML, CV, OCR, speech libs, DBs, vector DBs, APIs — **only if they support Gemma 4**, not replace it
5. Projects with **weak / token Gemma usage** may be disqualified
6. Writeup must be **submitted** on Kaggle (drafts don’t count)
7. Writeup ≤ **1,500 words** (over-limit may be penalized)
8. Demo must be **public, no login / paid wall**

---

## Required submission package

Every valid entry needs **all three**:

### 1. Kaggle Writeup (primary judging document)
Must explain:
- Problem + why it matters
- Proposed solution
- How Gemma 4 is integrated
- System architecture
- Technical challenges + fixes
- Future improvements + impact

Must include:
- Title + subtitle
- Detailed project explanation (≤ 1500 words)
- Attachments: public repo link + demo link/files

### 2. Public code repository (GitHub or Kaggle Notebook)
Must contain:
- Complete source code
- README (install + usage)
- Dependency list
- Config files as needed
- Clear evidence of Gemma 4 usage
- Stay public through judging

Attach under: **Attachments → Project Links**

### 3. Working demo (public)
Accepted forms:
- Hosted web / mobile / desktop app
- Interactive Kaggle Notebook
- Recorded video demo
- Recorded terminal demo

If deploy fails during hackathon → **recorded demo of all major features** is OK.

---

## Judging — two rubrics appear in the materials

Use **both** as a checklist. The writeup/demo must score well on either framing.

### Rubric A (community page)

| Criteria | Weight |
|----------|--------|
| Innovation | 30% |
| Technical Implementation | 30% |
| Real-world Impact | 20% |
| User Experience | 10% |
| Presentation & Demo | 10% |

### Rubric B (sprint judging table)

| Criteria | Weight | What judges look for |
|----------|--------|----------------------|
| Gemma Integration | 30% | Is Gemma 4 core? Used effectively? |
| Innovation & Impact | 30% | Meaningful problem + creative approach? |
| Functionality | 20% | Does the prototype work? Demo convincing? |
| Presentation & Writeup | 20% | Clear problem/solution story? |

### Practical translation for top-3

Win by maximizing:

1. **Gemma is clearly the brain** (not a thin wrapper around another system)
2. **Problem is specific + Bangladesh/real-world relevant**
3. **Demo works end-to-end** in under 2–3 minutes
4. **Writeup tells a crisp story** (problem → why → how Gemma → architecture → impact)

---

## Gemma 4 capabilities to lean on (competitive advantage)

Gemma 4 strengths worth showcasing (pick 1–2 deeply, don’t sprinkle all):

- **Advanced reasoning / multi-step planning**
- **Agentic workflows + native function/tool calling**
- **Multimodal**: text + image (+ video); smaller variants also audio (E2B/E4B/12B)
- **Long context** (up to 128K / 256K depending on size)
- **OCR / document / chart / UI understanding**
- **Multilingual** (strong angle for Bangladesh: Bangla + English)
- **Coding assistance**
- Runs from edge/laptop-friendly sizes to larger dense/MoE variants

**Winning pattern:** make one Gemma 4 capability *indispensable* to the product (e.g. vision+reasoning on Bangla docs, tool-calling agent for a local workflow, offline/privacy-first assistant).

---

## What “meaningful Gemma integration” looks like

### Strong (aim here)
- Gemma does the core reasoning / generation / multimodal understanding
- App breaks without Gemma
- Architecture diagram shows Gemma at the center
- Demo path highlights model outputs clearly

### Weak (avoid)
- Gemma only rewrites text once at the end
- Most “intelligence” is hardcoded rules / another LLM / external closed API chat
- Model called once for a slogan while real logic is elsewhere

---

## Idea selection filter (for top-3)

Score each idea 1–5 on:

1. **Real pain** — who hurts today, and how often?
2. **Gemma fit** — which Gemma 4 capability is essential?
3. **Buildable in 1 day** — can a demo path ship in hours?
4. **Demo wow** — can a stranger understand it in 90 seconds?
5. **Local relevance** — Bangladesh / SE Asia / under-served users preferred
6. **Differentiation** — not generic “ChatGPT clone for X”

**Prefer:** narrow vertical + multimodal or agentic Gemma use + clear beneficiary  
**Avoid:** vague chatbot with no workflow, no data, no outcome

---

## Suggested writeup structure (≤ 1500 words)

1. **Title / Subtitle**
2. **Problem** (what + who + why now) — ~150–200 words
3. **Solution overview** — ~150 words
4. **Why Gemma 4** (specific capabilities used) — ~150–200 words
5. **Architecture** (components + data flow; include simple diagram) — ~200–250 words
6. **Technical implementation** (stack, prompts/tools, evals if any) — ~200 words
7. **Challenges & solutions** — ~100–150 words
8. **Demo walkthrough** — ~100 words
9. **Impact & future work** — ~100–150 words

Keep total ≤ 1500. Attach repo + demo.

---

## Demo checklist

- [ ] Public link / video works without login
- [ ] Shows problem → user action → Gemma response → useful outcome
- [ ] Highlights multimodal / tool-calling / reasoning if used
- [ ] Handles one happy path reliably (edge cases optional)
- [ ] 2–3 minute narrative script ready

---

## Repo checklist

- [ ] Public GitHub or Kaggle Notebook
- [ ] README: setup, run, env vars (no secrets committed)
- [ ] `requirements.txt` / `pyproject` / lockfile
- [ ] Clear folder for Gemma client / prompts / agent tools
- [ ] Sample inputs for judges to try
- [ ] License note if needed; Gemma usage documented

---

## Sprint day priorities (if 1-day offline)

1. Lock idea + demo script (first 30–45 min)
2. Vertical slice: one end-to-end path with Gemma
3. UI only enough for the demo path
4. Record backup demo video early
5. Writeup draft in parallel (don’t leave for last hour)
6. Submit on Kaggle (not just save draft)

---

## Top-3 strategy summary

| Lever | Action |
|-------|--------|
| Gemma Integration (critical) | Make Gemma do the hard part; show it in architecture + demo |
| Innovation & Impact | Pick a concrete local problem with a clear beneficiary |
| Functionality | One rock-solid happy path > many half-broken features |
| Writeup & Presentation | Short, visual, judge-friendly story under 1500 words |

**Bottom line:** Judges reward a **working, Gemma-centric prototype** that solves a **specific real problem**, explained clearly — not the biggest idea on paper.

---

## Project lock

**Building:** [RxLens AI](./RXLENS.md) — see [DECISION.md](./DECISION.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).
