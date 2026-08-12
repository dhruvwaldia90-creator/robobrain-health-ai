# 🏆 RoboBrain Health AI — Final Round Playbook (Punjab)

> Rehearse-ready: 2-min pitch script · slide deck content · 90-sec demo flow · judge Q&A.

---

## PART 1 — THE 2-MINUTE PITCH SCRIPT

*(Speak at a calm, confident pace. ~280 words = 2 minutes.)*

"Judges, India has one doctor for every two thousand people. In rural Punjab, a patient with chest pain may wait three days to see a specialist — and by then, it may be too late. Doctors are overloaded, pharmacists dispense blindly, and disease outbreaks are detected only after they've spread.

We built RoboBrain Health AI to put an entire hospital team in your pocket.

But we didn't build another chatbot. We built a **multi-agent mesh** — a team of specialized AI agents that collaborate like a real clinical staff. One agent analyzes symptoms. Another checks drug interactions. Another scores your disease risk. A Researcher agent watches for outbreaks. And a Referral agent routes you to the right specialist.

What makes RoboBrain different is three things.

**First, it's self-critiquing.** A Critic Agent challenges every diagnosis with counter-evidence before it reaches you. The agents debate and reach consensus — so confidence is earned, not assumed.

**Second, it's safe by design.** A Guardrails Agent blocks red-flags. An Uncertainty Agent can say 'I don't have enough data — please get this lab test' instead of guessing. And every report routes to a licensed human for sign-off. The AI never prescribes alone.

**Third, it works at the last mile.** Voice input for low-literacy patients. Prescription-photo OCR for meds. A fully offline local reasoner for 2G village connectivity. And a learning loop where doctor feedback makes the mesh smarter over time.

The result: a patient gets a triaged, safety-checked, doctor-routed report in seconds — not days.

RoboBrain isn't replacing doctors. It's giving every ASHA worker and PHC the intelligence of a full clinical team — so the next chest pain in a Punjab village doesn't become a statistic.

Thank you. Let me show you how it works."

---

## PART 2 — SLIDE DECK CONTENT (10 slides)

### Slide 1 — Title
**RoboBrain Health AI**
*A self-critiquing multi-agent clinical intelligence platform for the last mile of healthcare.*
[Team name · Members · Round 2 · Punjab]

---

### Slide 2 — The Problem
- 1 doctor per ~2,000 people in rural India (WHO benchmark is 1:1,000)
- Patients wait **days** for diagnosis; doctors review **80+ cases/day**
- Pharmacists dispense without interaction checks
- Outbreaks detected **after** they spread
- **Visual:** Map of Punjab with PHC pins + "3-day wait" clock

---

### Slide 3 — The Solution
**A multi-agent mesh — not a chatbot.**
- 11 specialized agents, each owning one clinical job
- Agents **debate, critic, and reach consensus**
- Auto-routes to the right human: doctor / pharmacist / emergency
- **Visual:** Agent mesh diagram (central orchestrator → 11 agent nodes → consensus → routed report)

---

### Slide 4 — How It's Different (The 3 Pillars)
| Pillar | What it means | Why it matters |
|--------|--------------|----------------|
| 🔄 Self-critiquing | Critic Agent challenges every diagnosis | Catches errors a single model can't |
| 🛡️ Safe by design | Guardrails + Uncertainty + human sign-off | Never hallucinates a prescription |
| 📡 Last-mile ready | Voice, OCR, offline local reasoner | Works in a 2G village on a ₹6,000 phone |

---

### Slide 5 — Architecture
**Visual: Flow diagram**
```
Patient (voice/OCR/text)
    ↓
Streaming Orchestrator
    ↓
[Symptom → Drug → ADR → Risk → Researcher → Referral]
    ↓
[Critic Agent — counter-evidence & consensus]
    ↓
[Safety Agent → Uncertainty Agent → Triage Agent]
    ↓
Routed Report (doctor / pharmacist / auto / emergency)
```
- React + TypeScript + Vite frontend
- Serverless LLM endpoint (OpenAI-compatible) with local fallback
- 100% client-side capable — no cloud required

---

### Slide 6 — The Innovation Stack (11 features)
1. Multi-agent Critic + consensus debate
2. Doctor-feedback learning loop
3. Safety/Guardrails agent
4. Uncertainty + abstention
5. Autonomous triage/escalation routing
6. Streaming live "thinking" trace
7. Agentic tool-use
8. Multimodal voice + OCR input
9. Longitudinal vitals history
10. Outbreak/anomaly detection
11. Digital-twin what-if simulation

---

### Slide 7 — Demo Screenshot
**Visual:** Screenshot of the streaming report with Critic/Safety/Uncertainty panels
- Caption: *"Watch the agents reason live, then reach a safety-checked consensus."*

---

### Slide 8 — Safety & Ethics
- **Human-in-the-loop:** AI never prescribes alone — always routes to a licensed clinician
- **Abstention:** Says "I need more data" instead of hallucinating
- **Guardrails:** Blocks red-flags + contraindications before output
- **Privacy:** On-device localStorage; no PII sent to LLM; DPDP-compliant design
- **Auditable:** Every agent step is traceable in the reasoning trace

---

### Slide 9 — Impact & Scalability
- **For patients:** Triage in seconds, not days
- **For doctors:** Cuts review time via pre-analyzed, pre-safety-checked reports
- **For pharmacists:** Auto-routed med-safety cases
- **For public health:** Real-time outbreak detection
- **Scalable:** Stateless frontend, swappable knowledge base, horizontal LLM scaling

---

### Slide 10 — Roadmap & Ask
- **Phase 1 (now):** Proof-of-concept — 11-agent mesh, working demo
- **Phase 2 (3 months):** Pilot at 1 Punjab PHC — retrospective audit vs. doctor outcomes
- **Phase 3 (12 months):** Deploy to ASHA workers' phones statewide
- **The ask:** Pilot partnership + validation dataset access
- **Visual:** Timeline arrow (Now → 3mo → 12mo)

---

## PART 3 — THE 90-SECOND LIVE DEMO FLOW

> **Rule:** Don't explain everything. Show the "wow" moments. Talk while you click.

### Beat 1 (0-15s) — The Setup
"Let me submit a real symptom — chest tightness radiating to the left arm."
- Click **New Submission** → Click **"Use sample"**
- *"Notice I can also use voice or scan a prescription photo — for low-literacy patients."* (point at Voice + Scan Rx buttons, don't click)

### Beat 2 (15-45s) — The Streaming "Thinking" Trace ⭐ WOW MOMENT
- Click **"Run AI analysis"**
- *"Watch — the agents are thinking live."* (the ReasoningTrace streams in)
- *"Each agent reasons in sequence: symptom analysis, drug intelligence, ADR, risk..."*
- Pause 2 seconds to let it fill.

### Beat 3 (45-75s) — The Report Reveal ⭐ WOW MOMENT
- The report appears.
- *"Here's the consensus report. Notice three things judges care about:"*
  1. **Point at Critic Agent panel:** *"The Critic challenged the top diagnosis and lowered its confidence from 90 to 40% — counter-evidence in action."*
  2. **Point at Safety panel:** *"The Guardrails agent flagged a contraindication."*
  3. **Point at Triage panel:** *"The case was auto-routed to a doctor — not prescribed autonomously."*

### Beat 4 (75-90s) — The Closer
- *"And if there's no internet..."* → Click the **"Local Reasoner"** toggle in the header.
- *"...the full mesh runs offline, on-device. That's healthcare for the last mile."*
- **Stop. Don't over-explain. Smile. "Questions?"**

---

## PART 4 — JUDGE Q&A QUICK-REFERENCE CARD

| Question | One-line answer |
|----------|----------------|
| How is this different from ChatGPT? | Coordinated agent mesh with tools + critic + abstention + routing — not a single model guessing. |
| Hallucinations / patient safety? | Guardrails + Uncertainty-abstention + human sign-off. AI never prescribes alone. |
| Medically validated? | POC on clinical heuristics; next step is hospital retrospective audit. Architecture is the innovation. |
| Offline / low connectivity? | Local Reasoner mode = 100% client-side, zero API. Voice = on-device speech API. |
| Why multi-agent not one model? | Specialization + auditability + the Critic's internal adversarial check. |
| How does the learning loop work? | Doctor corrections persist → Critic lowers confidence on that condition. Transparent, auditable. |
| Business model? | B2B2C: sell to PHCs, insurers, hospitals. Patient gets it free via provider. |
| Privacy / DPDP Act? | On-device storage, no PII to LLM, consent logging, encryption-ready. |
| What if the LLM is down? | Graceful fallback to deterministic local reasoner. Demo never breaks. |
| One thing you'd build next? | Punjab PHC pilot — 3-month retrospective audit, then ASHA-worker deployment. |

---

## PART 5 — DEMO DAY CHECKLIST ✅

**Before you go on stage:**
- [ ] Dev server running on your laptop (`npm run dev`)
- [ ] Browser open at `http://localhost:5173/`
- [ ] Pre-logged-out (start from landing page for context)
- [ ] Close all other tabs/apps (preserve RAM)
- [ ] Have a backup **screen recording** in case live demo fails
- [ ] Toggle is on **"Local Reasoner"** (no API key needed, guaranteed to work)
- [ ] Test the full submission flow once before going on stage
- [ ] Charge laptop + bring charger
- [ ] Know your 2-min pitch cold — don't read slides, tell the story

**During Q&A:**
- [ ] Answer in **one sentence first**, then elaborate
- [ ] If you don't know — say "that's exactly what our Phase 2 pilot validates" (honesty wins)
- [ ] Never say "100% accurate" — say "it knows when it doesn't know"
- [ ] Point back to the **3 pillars** whenever possible
- [ ] End every answer with confidence, not apology

**Power phrases to use:**
- "self-critiquing mesh, not a guessing bot"
- "it knows when it doesn't know"
- "augments doctors, doesn't replace them"
- "healthcare for the last mile"
- "works on a ₹6,000 phone on 2G"

---

*Go win Punjab. 🚀*
