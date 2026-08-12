# RoboBrain Health AI — Project Memory

## Stack
- React 18 + TypeScript + Vite, react-router-dom, Tailwind, clsx, recharts
- Icons via `@/components/Icon` (lucide-react dynamic name lookup — string names)
- State: custom store in `src/lib/store.ts` with `useAppState()` hook + localStorage persistence
- Auth: `src/context/AuthContext.tsx` with role-based quick-login (patient/doctor/pharmacist/researcher)

## Commands
- `npm run dev` — Vite dev server (port 5173)
- `npm run build` — `tsc -b && vite build`
- `npm run typecheck` — `tsc -b --noEmit`
- `npm run lint` — eslint, `--max-warnings 0`

## Architecture
- `src/lib/agents.ts` — agent mesh: symptom, drug, ADR, risk, researcher, referral + new agents (Critic, Safety, Uncertainty, Triage, Tool-Use). `generateReportStream()` is the streaming orchestrator yielding `ReasoningStep` per agent with an `onStep` callback.
- `src/lib/llm.ts` — LLM client with graceful fallback to local reasoning. Toggled via `loadLlmConfig()`/`toggleLlm()`. Provider toggle button in Layout header.
- `api/llm.ts` — Vercel serverless endpoint (OpenAI-compatible, falls back to canned response). Separate `tsconfig.api.json`.
- `src/lib/learning.ts` — doctor-feedback learning loop, persisted corrections, applied by Critic Agent.
- `src/lib/tools.ts` — agentic tool-use framework.
- `src/lib/research.ts` — `detectAnomalies()` for outbreak/anomaly detection.
- `src/lib/store.ts` — `recordVitalsSnapshot()`, `recordCorrection()`, `vitalsHistory`, `learningLog`.
- `src/types.ts` — all extended types (CriticResult, SafetyResult, UncertaintyResult, TriageResult, ToolCall, ReasoningStep, LearningEntry, VitalsSnapshot).

## Conventions
- Tailwind utility classes via `@/components/ui` (Card, SectionTitle, StatusBadge, ConfidenceBar, Pill, StatCard, EmptyState).
- Status labels in `src/lib/format.ts` (analyzing, ai_complete, escalated, pharmacist_review, closed).
- `AGENTS` array in `src/lib/data.ts` drives the "N agents online" count and agent grid.
- New agent result panels render conditionally in `src/components/ReportView.tsx`.

## Gotchas
- `window.SpeechRecognition` is not in TS DOM lib — cast via a local `RecLike` interface (see NewSubmission.tsx).
- Apostrophes inside JSX text expressions break the parser — use plain words ("you will").
- tesseract.js `recognize` is dynamically imported so it code-splits; heavy WASM loads from CDN at runtime.
- Production bundle is ~1.4MB (recharts); acceptable for demo, could code-split routes if needed.

## Innovations Implemented
1. Multi-agent Critic/Debate + consensus
2. Doctor-feedback learning loop (localStorage persistence)
3. Safety/Guardrails agent
4. Uncertainty + abstention
5. Autonomous triage/escalation routing (doctor/pharmacist/auto/emergency)
6. Streaming live "thinking" trace (ReasoningTrace component)
7. Agentic tool-use loop
8. Multimodal voice (Web Speech API) + OCR (tesseract.js) input
9. Longitudinal vitals history + risk trend
10. Autonomous outbreak/anomaly detection (researcher portal)
11. What-if digital twin simulation (HealthProfile)
12. LLM integration with graceful fallback to local reasoner
