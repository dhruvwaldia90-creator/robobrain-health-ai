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
- `npm test` — vitest run (tests live next to sources: `src/lib/ml/classifier.test.ts`, `src/lib/agents.test.ts`)

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

## ML Classifier (added 2026-08)
- `ml/train.py` trains a multinomial logistic regression on the Kaggle Disease Prediction dataset (vendored in `ml/data/`), exports weights to `ml/model.json`; copy to `src/lib/ml/model.json` after retraining.
- `src/lib/ml/classifier.ts` — pure-TS inference (dot-product + softmax, parity with sklearn verified to 5e-7). `classifySymptomText()` maps free text to 132 binary features (name matching + SYNONYMS map) then top-k diseases with probabilities and category mapping. Feature extraction is negation-aware (NEGATIONS list checked in the 3 words before a match).
- Symptom Agent merges ML top-3 (prob >= 5%) into findings unless a rule finding already covers the condition; confidences capped at 95.
- Eval honesty: holdout is 100% (synthetic separable data) — quote the noisy-input metric (~93% top-1, 100% top-3) from `ml/eval_report.json` instead.

## LLM Agent Augmentation (added 2026-08)
- `generateReportStream` runs 7 concurrent LLM calls after the local pipeline: symptom-summary, critic, risk-insight, drug-advice, referral-note, uncertainty-data, report-narrative (all `llm*` helpers in `src/lib/agents.ts`).
- Pattern per helper: early-return null unless `provider() === 'llm'` → `llmComplete` → `parseJson` → validate (shape + length, `cleanText` rejects JSON-shaped junk for plain-text fields) → null falls back to local output.
- LLM drug advice is appended to `adherenceTips` with an "LLM pharmacist note:" prefix; referral note overrides `referral.reason`; uncertainty requests merge deduped (max 3); LLM narrative replaces the template narrative entirely.
- No API key in sandbox: verified via mock `fetch` + `localStorage` shim in node (all 3 modes: mock-augmented, endpoint-down fallback, disabled baseline).
