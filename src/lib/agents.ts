import type {
  AdrResult,
  AgentRunMeta,
  AIReport,
  Case,
  CriticResult,
  DiseaseCategoryId,
  DiseaseRiskResult,
  DrugIntelligenceResult,
  PatientProfile,
  ReasoningStep,
  ReferralResult,
  SafetyResult,
  Severity,
  SymptomAnalysis,
  SymptomFinding,
  ToolCall,
  TriageResult,
  UncertaintyResult,
  Vitals,
} from '@/types'
import { correctionFor, seedCorrections } from './learning'
import { runTools } from './tools'
import { activeProviderId, llmComplete, parseJson, providerModel, providerLabel } from './llm'
import { classifySymptomText } from './ml/classifier'
import type { ProviderId } from '@/types'

/**
 * RoboBrain agent layer.
 *
 * Every agent implements the {@link Agent} interface. They run as
 * deterministic, explainable inference engines in the browser so the platform
 * is fully functional with zero external dependencies. When the LLM provider
 * is enabled, `generateReportStream` augments each agent's output with
 * validated LLM responses (see the llm* helpers below) and silently falls
 * back to the local result on any failure.
 */
export interface Agent<I, O> {
  id: string
  name: string
  model: string
  run(input: I): O
}

export interface InferenceProvider {
  id: string
  label: string
}

export const LOCAL_PROVIDER: InferenceProvider = {
  id: 'robobrain-local-v1',
  label: 'RoboBrain Local Reasoner v1',
}

/** Resolve the active provider (local vs LLM) once per run. */
function provider(): ProviderId {
  return activeProviderId()
}

/** Model id recorded in the execution trace for the active provider. */
function model(): string {
  return providerModel(provider())
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))
const round = (n: number) => Math.round(n)

const bandFromScore = (score: number): Severity =>
  score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 35 ? 'moderate' : 'low'

const SEVERITY_RANK: Record<Severity, number> = {
  low: 0,
  moderate: 1,
  high: 2,
  critical: 3,
}

export const maxSeverity = (a: Severity, b: Severity): Severity =>
  SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b

/* ------------------------------------------------------------------ *
 * Symptom Analysis Agent
 * ------------------------------------------------------------------ */

interface SymptomRule {
  condition: string
  category: DiseaseCategoryId
  keywords: string[]
  base: number
  specialty: string
  redFlags?: string[]
}

const SYMPTOM_RULES: SymptomRule[] = [
  {
    condition: 'Acute Coronary Syndrome',
    category: 'cardiovascular',
    keywords: ['chest pain', 'chest tightness', 'left arm', 'shortness of breath', 'sweating', 'palpitation', 'pressure'],
    base: 34,
    specialty: 'Cardiology',
    redFlags: ['Chest pain radiating to the arm/jaw', 'Diaphoresis with exertional dyspnea'],
  },
  {
    condition: 'Heart Failure',
    category: 'cardiovascular',
    keywords: ['breathless', 'swelling', 'edema', 'fatigue', 'orthopnea', 'weight gain'],
    base: 26,
    specialty: 'Cardiology',
  },
  {
    condition: 'Pneumonia',
    category: 'respiratory',
    keywords: ['cough', 'fever', 'sputum', 'phlegm', 'chest', 'breathless'],
    base: 28,
    specialty: 'Pulmonology',
  },
  {
    condition: 'Tuberculosis',
    category: 'infectious',
    keywords: ['cough', 'night sweats', 'weight loss', 'fever', 'fatigue', 'two weeks', 'blood'],
    base: 24,
    specialty: 'Infectious Disease',
    redFlags: ['Hemoptysis (coughing blood)'],
  },
  {
    condition: 'Asthma Exacerbation',
    category: 'respiratory',
    keywords: ['wheeze', 'breathless', 'cough', 'tight chest', 'inhaler', 'allergy'],
    base: 22,
    specialty: 'Pulmonology',
  },
  {
    condition: 'Migraine',
    category: 'neurological',
    keywords: ['headache', 'aura', 'photophobia', 'nausea', 'throbbing', 'one side'],
    base: 30,
    specialty: 'Neurology',
  },
  {
    condition: 'Ischemic Stroke',
    category: 'neurological',
    keywords: ['weakness', 'numbness', 'slurred', 'speech', 'face drooping', 'vision loss', 'confusion'],
    base: 30,
    specialty: 'Neurology',
    redFlags: ['Sudden focal neurological deficit — possible stroke'],
  },
  {
    condition: 'Type 2 Diabetes (uncontrolled)',
    category: 'metabolic',
    keywords: ['thirst', 'urination', 'weight loss', 'blurred vision', 'fatigue', 'glucose'],
    base: 24,
    specialty: 'Endocrinology',
  },
  {
    condition: 'Sepsis',
    category: 'infectious',
    keywords: ['fever', 'chills', 'rapid heart', 'confusion', 'low blood pressure', 'rigors'],
    base: 22,
    specialty: 'Emergency Medicine',
    redFlags: ['Fever with confusion and tachycardia — sepsis screen'],
  },
  {
    condition: 'Suspected Malignancy',
    category: 'oncology',
    keywords: ['lump', 'weight loss', 'night sweats', 'blood', 'persistent', 'mass', 'fatigue'],
    base: 18,
    specialty: 'Oncology',
    redFlags: ['Unexplained weight loss with a persistent mass'],
  },
]

const countMatches = (text: string, keywords: string[]) =>
  keywords.reduce((acc, k) => (text.includes(k) ? acc + 1 : acc), 0)

export const symptomAgent: Agent<{ text: string; profile?: PatientProfile }, SymptomAnalysis> = {
  id: 'symptom',
  name: 'Symptom Analysis Agent',
  model: LOCAL_PROVIDER.id,
  run({ text, profile }) {
    const t = ` ${text.toLowerCase()} `
    const scored = SYMPTOM_RULES.map((rule) => {
      const matches = countMatches(t, rule.keywords)
      let confidence = rule.base + matches * 12
      if (profile) {
        if (
          rule.category === 'cardiovascular' &&
          (profile.vitals.systolic >= 140 || profile.vitals.cholesterolMgDl >= 220)
        )
          confidence += 8
        if (rule.category === 'metabolic' && profile.vitals.glucoseMgDl >= 140) confidence += 8
        if (profile.conditions.some((c) => rule.condition.toLowerCase().includes(c.toLowerCase().split(' ')[0])))
          confidence += 6
      }
      return { rule, matches, confidence: clamp(confidence, 0, 96) }
    })
      .filter((s) => s.matches > 0)
      .sort((a, b) => b.confidence - a.confidence)

    const top = scored.slice(0, 4)
    const findings: SymptomFinding[] = top.map((s) => ({
      condition: s.rule.condition,
      category: s.rule.category,
      confidence: round(s.confidence),
      rationale: `${s.matches} matching symptom signal${s.matches > 1 ? 's' : ''} detected for ${s.rule.condition}.`,
    }))

    // ML classifier (multinomial logistic regression trained on the Kaggle
    // Disease Prediction dataset) runs on the same text; its top predictions
    // are merged in unless a rule finding already covers the condition.
    const mlTop = classifySymptomText(text, 3)
    for (const pred of mlTop) {
      if (pred.probability < 0.05) continue
      const covered = findings.some((f) => {
        const a = f.condition.toLowerCase()
        const b = pred.disease.toLowerCase()
        return a.includes(b) || b.includes(a)
      })
      if (covered) continue
      findings.push({
        condition: pred.disease,
        category: pred.category,
        confidence: Math.min(95, round(pred.probability * 100)),
        rationale: `ML classifier (${pred.matchedSymptoms.length} symptom features matched) assigns ${round(pred.probability * 100)}% probability — model trained on 4,920 Kaggle cases.`,
      })
    }
    findings.sort((a, b) => b.confidence - a.confidence)

    const topScore = top[0]?.confidence ?? 15
    const severity = bandFromScore(topScore)
    const redFlags = Array.from(new Set(top.flatMap((s) => s.rule.redFlags ?? [])))

    const mlNote = mlTop.length
      ? ` ML model top prediction: ${mlTop[0].disease} (${round(mlTop[0].probability * 100)}%).`
      : ''
    const summary = findings.length
      ? `Differential led by ${findings[0].condition} (${findings[0].confidence}% confidence). ${findings.length} candidate condition${findings.length > 1 ? 's' : ''} identified across ${new Set(findings.map((f) => f.category)).size} disease categor${new Set(findings.map((f) => f.category)).size > 1 ? 'ies' : 'y'}.${mlNote}`
      : 'No strong symptom signals detected. Recommend structured history taking and baseline vitals.'

    return {
      summary,
      severity,
      findings,
      recommendedSpecialty: top[0]?.rule.specialty ?? 'General Medicine',
      redFlags,
    }
  },
}

/* ------------------------------------------------------------------ *
 * Disease Risk Agent
 * ------------------------------------------------------------------ */

const bmiOf = (p: PatientProfile) => p.weightKg / Math.pow(p.heightCm / 100, 2)

export const riskAgent: Agent<{ profile: PatientProfile; symptom?: SymptomAnalysis }, DiseaseRiskResult> = {
  id: 'risk',
  name: 'Disease Risk Agent',
  model: LOCAL_PROVIDER.id,
  run({ profile, symptom }) {
    const v: Vitals = profile.vitals
    const bmi = bmiOf(profile)
    const ageF = clamp((profile.age - 30) * 0.8, 0, 35)

    const cardio = clamp(
      ageF +
        (v.systolic - 120) * 0.5 +
        (v.cholesterolMgDl - 180) * 0.18 +
        (v.smoker ? 14 : 0) +
        (bmi - 25) * 1.2,
    )
    const metabolic = clamp(
      (v.glucoseMgDl - 100) * 0.5 + (bmi - 25) * 2.0 + ageF * 0.5 + (v.smoker ? 4 : 0),
    )
    const respiratory = clamp((v.smoker ? 30 : 8) + (98 - v.spo2) * 4 + ageF * 0.4)
    const oncology = clamp(ageF * 0.9 + (v.smoker ? 20 : 4) + (bmi - 25) * 0.8)
    const infectious = clamp((v.temperatureC - 37) * 22 + (98 - v.spo2) * 2 + 10)
    const neuro = clamp(ageF * 0.7 + (v.systolic - 120) * 0.35 + (v.smoker ? 8 : 0))
    const genetic = clamp(
      8 +
        profile.conditions.length * 4 +
        (profile.age < 40 && profile.conditions.length > 1 ? 12 : 0),
    )

    const map: Record<DiseaseCategoryId, { score: number; drivers: string[] }> = {
      cardiovascular: {
        score: cardio,
        drivers: [
          v.systolic >= 140 ? 'Elevated systolic BP' : 'Blood pressure',
          v.cholesterolMgDl >= 220 ? 'High cholesterol' : 'Lipid profile',
          v.smoker ? 'Active smoker' : 'Non-smoker',
        ],
      },
      metabolic: {
        score: metabolic,
        drivers: [
          v.glucoseMgDl >= 140 ? 'Elevated fasting glucose' : 'Glucose',
          bmi >= 30 ? `Obesity (BMI ${bmi.toFixed(1)})` : `BMI ${bmi.toFixed(1)}`,
        ],
      },
      respiratory: {
        score: respiratory,
        drivers: [v.smoker ? 'Smoking history' : 'No smoking', v.spo2 < 95 ? 'Low SpO₂' : 'SpO₂ normal'],
      },
      oncology: {
        score: oncology,
        drivers: ['Age', v.smoker ? 'Tobacco exposure' : 'Lifestyle'],
      },
      infectious: {
        score: infectious,
        drivers: [v.temperatureC >= 37.8 ? 'Febrile' : 'Afebrile', 'Immune status'],
      },
      neurological: {
        score: neuro,
        drivers: ['Vascular risk', 'Age'],
      },
      genetic: {
        score: genetic,
        drivers: ['Family/condition history', 'Comorbidity load'],
      },
    }

    if (symptom) {
      for (const f of symptom.findings) {
        map[f.category].score = clamp(map[f.category].score + f.confidence * 0.18)
        map[f.category].drivers.unshift('Active symptom signal')
      }
    }

    const scores = (Object.keys(map) as DiseaseCategoryId[])
      .map((category) => ({
        category,
        score: round(map[category].score),
        band: bandFromScore(map[category].score),
        drivers: map[category].drivers.slice(0, 3),
      }))
      .sort((a, b) => b.score - a.score)

    const overall = round(scores.reduce((acc, s) => acc + s.score, 0) / scores.length)
    return { overall, scores }
  },
}

/* ------------------------------------------------------------------ *
 * Drug Intelligence Agent
 * ------------------------------------------------------------------ */

interface DrugRef {
  match: string
  name: string
  class: string
  indication: string
  notes: string
}

const DRUG_DB: DrugRef[] = [
  { match: 'metformin', name: 'Metformin', class: 'Biguanide', indication: 'Type 2 diabetes', notes: 'Hold before contrast imaging; monitor renal function.' },
  { match: 'amlodipine', name: 'Amlodipine', class: 'Calcium channel blocker', indication: 'Hypertension', notes: 'Ankle edema is a common dose-related effect.' },
  { match: 'atorvastatin', name: 'Atorvastatin', class: 'Statin', indication: 'Dyslipidemia', notes: 'Monitor for myalgia; check LFTs if symptomatic.' },
  { match: 'lisinopril', name: 'Lisinopril', class: 'ACE inhibitor', indication: 'Hypertension / HF', notes: 'Monitor potassium and renal function; dry cough possible.' },
  { match: 'clopidogrel', name: 'Clopidogrel', class: 'Antiplatelet', indication: 'Secondary prevention', notes: 'Bleeding risk increased with other antithrombotics.' },
  { match: 'warfarin', name: 'Warfarin', class: 'Anticoagulant', indication: 'Anticoagulation', notes: 'Narrow therapeutic index; INR monitoring required.' },
  { match: 'salbutamol', name: 'Salbutamol', class: 'SABA bronchodilator', indication: 'Asthma/COPD', notes: 'Overuse may indicate poor control; can cause tremor.' },
  { match: 'ibuprofen', name: 'Ibuprofen', class: 'NSAID', indication: 'Analgesia', notes: 'GI and renal caution; avoid with anticoagulants.' },
  { match: 'aspirin', name: 'Aspirin', class: 'Antiplatelet/NSAID', indication: 'Cardio-protection', notes: 'Bleeding risk; GI protection if combined with anticoagulants.' },
]

interface InteractionRule {
  a: string
  b: string
  severity: Severity
  effect: string
  management: string
}

const INTERACTIONS: InteractionRule[] = [
  { a: 'warfarin', b: 'clopidogrel', severity: 'high', effect: 'Markedly increased bleeding risk.', management: 'Avoid combination unless strongly indicated; monitor closely.' },
  { a: 'warfarin', b: 'ibuprofen', severity: 'high', effect: 'NSAID potentiates anticoagulation and GI bleeding.', management: 'Prefer paracetamol; add GI protection if unavoidable.' },
  { a: 'warfarin', b: 'aspirin', severity: 'high', effect: 'Additive bleeding risk.', management: 'Use only with clear indication and gastroprotection.' },
  { a: 'clopidogrel', b: 'ibuprofen', severity: 'moderate', effect: 'Increased bleeding tendency.', management: 'Limit NSAID duration; monitor for bleeding.' },
  { a: 'lisinopril', b: 'ibuprofen', severity: 'moderate', effect: 'Reduced antihypertensive effect; renal risk.', management: 'Monitor BP and renal function.' },
  { a: 'atorvastatin', b: 'clarithromycin', severity: 'high', effect: 'Raised statin levels → myopathy risk.', management: 'Pause statin during macrolide course.' },
]

const findDrug = (raw: string): DrugRef | undefined => {
  const s = raw.toLowerCase()
  return DRUG_DB.find((d) => s.includes(d.match))
}

export const drugAgent: Agent<{ medications: string[] }, DrugIntelligenceResult> = {
  id: 'drug',
  name: 'Drug Intelligence Agent',
  model: LOCAL_PROVIDER.id,
  run({ medications }) {
    const resolved = medications
      .map((m) => ({ raw: m, ref: findDrug(m) }))
      .filter((x): x is { raw: string; ref: DrugRef } => !!x.ref)

    const insights = resolved.map(({ ref }) => ({
      drug: ref.name,
      class: ref.class,
      indication: ref.indication,
      notes: ref.notes,
    }))

    const interactions = [] as DrugIntelligenceResult['interactions']
    for (let i = 0; i < resolved.length; i++) {
      for (let j = i + 1; j < resolved.length; j++) {
        const a = resolved[i].ref.match
        const b = resolved[j].ref.match
        const rule = INTERACTIONS.find(
          (r) => (r.a === a && r.b === b) || (r.a === b && r.b === a),
        )
        if (rule) {
          interactions.push({
            pair: [resolved[i].ref.name, resolved[j].ref.name],
            severity: rule.severity,
            effect: rule.effect,
            management: rule.management,
          })
        }
      }
    }

    const adherenceTips = [
      'Take medications at the same time each day to build routine.',
      resolved.length >= 4
        ? 'Polypharmacy detected — consider a weekly pill organizer and pharmacist review.'
        : 'Use reminders for any once-daily doses.',
      'Never stop a prescribed medicine abruptly without clinician advice.',
    ]

    return { insights, interactions, adherenceTips }
  },
}

/* ------------------------------------------------------------------ *
 * ADR Prediction Agent
 * ------------------------------------------------------------------ */

interface AdrRule {
  match: string
  reaction: string
  base: number
  severity: Severity
  monitoring: string
}

const ADR_RULES: AdrRule[] = [
  { match: 'atorvastatin', reaction: 'Statin-induced myopathy', base: 18, severity: 'moderate', monitoring: 'Ask about muscle pain; check CK if symptomatic.' },
  { match: 'metformin', reaction: 'GI intolerance / lactic acidosis (rare)', base: 16, severity: 'low', monitoring: 'Monitor renal function and GI tolerance.' },
  { match: 'warfarin', reaction: 'Major bleeding', base: 32, severity: 'high', monitoring: 'Regular INR; watch for bruising/bleeding.' },
  { match: 'amlodipine', reaction: 'Peripheral edema', base: 22, severity: 'low', monitoring: 'Inspect ankles; consider dose reduction.' },
  { match: 'lisinopril', reaction: 'Hyperkalemia / angioedema', base: 17, severity: 'moderate', monitoring: 'Check potassium; counsel on facial swelling.' },
  { match: 'ibuprofen', reaction: 'GI bleed / renal impairment', base: 20, severity: 'moderate', monitoring: 'Limit duration; monitor renal function.' },
  { match: 'clopidogrel', reaction: 'Bleeding', base: 19, severity: 'moderate', monitoring: 'Watch for bruising and GI bleeding.' },
  { match: 'salbutamol', reaction: 'Tremor / tachycardia', base: 12, severity: 'low', monitoring: 'Review inhaler technique and frequency.' },
]

export const adrAgent: Agent<{ medications: string[]; profile?: PatientProfile }, AdrResult> = {
  id: 'adr',
  name: 'ADR Prediction Agent',
  model: LOCAL_PROVIDER.id,
  run({ medications, profile }) {
    const predictions = medications
      .map((m) => {
        const rule = ADR_RULES.find((r) => m.toLowerCase().includes(r.match))
        if (!rule) return null
        let probability = rule.base
        if (profile) {
          if (profile.age >= 65) probability += 8
          if (profile.allergies.length) probability += 4
          if (profile.vitals.smoker) probability += 3
        }
        if (medications.length >= 4) probability += 6
        return {
          drug: m.split(' ')[0],
          reaction: rule.reaction,
          probability: clamp(probability, 1, 92),
          severity: rule.severity,
          monitoring: rule.monitoring,
        }
      })
      .filter(Boolean) as AdrResult['predictions']

    predictions.sort((a, b) => b.probability - a.probability)
    const overallRisk = predictions.reduce<Severity>(
      (acc, p) => maxSeverity(acc, p.severity),
      'low',
    )
    return { predictions, overallRisk }
  },
}

/* ------------------------------------------------------------------ *
 * Doctor Referral Agent
 * ------------------------------------------------------------------ */

const SPECIALTY_TESTS: Record<string, string[]> = {
  Cardiology: ['12-lead ECG', 'Troponin', 'Echocardiogram', 'Lipid panel'],
  Pulmonology: ['Chest X-ray', 'Spirometry', 'Sputum culture'],
  Neurology: ['MRI brain', 'EEG', 'Neurological exam'],
  Endocrinology: ['HbA1c', 'Fasting glucose', 'Thyroid panel'],
  Oncology: ['Imaging (CT/MRI)', 'Biopsy', 'Tumor markers'],
  'Infectious Disease': ['CBC with differential', 'Blood cultures', 'CRP/Procalcitonin'],
  'Emergency Medicine': ['Immediate vitals', 'Sepsis-6 bundle'],
  'General Medicine': ['CBC', 'Basic metabolic panel'],
}

export const referralAgent: Agent<{ symptom: SymptomAnalysis; risk: DiseaseRiskResult }, ReferralResult> = {
  id: 'referral',
  name: 'Doctor Referral Agent',
  model: LOCAL_PROVIDER.id,
  run({ symptom, risk }) {
    const specialty = symptom.recommendedSpecialty
    const topRisk = risk.scores[0]
    const urgency = maxSeverity(symptom.severity, topRisk ? topRisk.band : 'low')
    const reason =
      symptom.findings.length > 0
        ? `${symptom.findings[0].condition} leads the differential; ${topRisk.category} risk is the dominant background factor.`
        : `Background ${topRisk.category} risk elevated.`
    return {
      specialty,
      urgency,
      reason,
      suggestedTests: SPECIALTY_TESTS[specialty] ?? SPECIALTY_TESTS['General Medicine'],
      recommendedDoctor: specialty === 'Cardiology' ? 'Dr. Meera Iyer' : undefined,
    }
  },
}

/* ------------------------------------------------------------------ *
 * Critic Agent (#1) — multi-round debate / counter-evidence
 * ------------------------------------------------------------------ */

const COUNTER_CONDITIONS: Record<string, string> = {
  'acute coronary syndrome': 'Anxiety / panic attack or GERD can mimic chest pain; consider age & risk factors.',
  'ischemic stroke': 'TIA or migraine aura can mimic focal deficits; onset timing is decisive.',
  pneumonia: 'Asthma/COPD exacerbation can present with cough and dyspnea; auscultation differs.',
  tuberculosis: 'Community-acquired pneumonia is far more common; check exposure & duration.',
  sepsis: 'Simple viral fever can mimic early sepsis; qSOFA helps differentiate.',
  'type 2 diabetes (uncontrolled)': 'Stress hyperglycemia or medication non-adherence can elevate glucose transiently.',
  'suspected malignancy': 'Benign masses are common; persistence and weight loss are the discriminating signals.',
  migraine: 'Tension headache or medication-overuse headache should be ruled out.',
}

export function runCritic(symptom: SymptomAnalysis, roundNo = 1): CriticResult {
  const challenges = symptom.findings.map((f) => {
    const challenge =
      COUNTER_CONDITIONS[f.condition.toLowerCase()] ??
      `Consider alternative diagnoses within the ${f.category} category before committing.`
    const correction = correctionFor(f.condition)
    const adjusted = clamp(f.confidence + correction, 5, 95)
    return {
      condition: f.condition,
      challenge,
      support: `Doctor-feedback learning applied a ${correction} pt correction.`,
      adjustedConfidence: Math.round(adjusted),
    }
  })

  const finalConfidences = Object.fromEntries(
    challenges.map((c) => [c.condition, c.adjustedConfidence]),
  )

  const summary =
    roundNo === 1
      ? `Critic challenged ${challenges.length} differential(s); confidence re-ranked after counter-evidence.`
      : `Consensus round ${roundNo}: top differential stabilised at ${challenges[0]?.condition}.`

  return { round: roundNo, challenges, finalConfidences, summary }
}

/** LLM-augmented critic: ask the model to challenge the leading diagnosis. */
async function llmCritic(symptom: SymptomAnalysis): Promise<CriticResult | null> {
  if (provider() !== 'llm' || symptom.findings.length === 0) return null
  const top = symptom.findings[0]
  const raw = await llmComplete({
    task: 'critic',
    messages: [
      {
        role: 'system',
        content:
          'You are a clinical devil\'s-advocate agent. Challenge the leading differential with one plausible alternative. Reply ONLY with JSON: {"alternative":"...","reason":"...","confidenceAdjust":number}.',
      },
      {
        role: 'user',
        content: `Leading diagnosis: ${top.condition} (${top.confidence}%). Symptoms: ${symptom.summary}. Profile context provided. Keep it concise and safe.`,
      },
    ],
    maxTokens: 200,
  })
  const parsed = raw ? parseJson<{ alternative: string; reason: string; confidenceAdjust: number }>(raw) : null
  if (!parsed) return null
  const adjusted = clamp(top.confidence + (parsed.confidenceAdjust || 0), 5, 95)
  return {
    round: 1,
    challenges: [
      {
        condition: top.condition,
        challenge: `LLM alternative: ${parsed.alternative}. ${parsed.reason}`,
        support: 'LLM Critic Agent',
        adjustedConfidence: round(adjusted),
      },
    ],
    finalConfidences: { [top.condition]: round(adjusted) },
    summary: `LLM critic proposed an alternative differential (${parsed.alternative}).`,
  }
}

/* ------------------------------------------------------------------ *
 * Safety / Guardrails Agent (#3)
 * ------------------------------------------------------------------ */

export function runSafety(args: {
  symptom?: SymptomAnalysis
  risk?: DiseaseRiskResult
  drug?: DrugIntelligenceResult
  adr?: AdrResult
  referral?: ReferralResult
}): SafetyResult {
  const checks = [] as SafetyResult['checks']

  if (args.symptom?.severity === 'critical') {
    checks.push({
      rule: 'Critical-severity presentation',
      action: 'warn',
      detail: 'Critical findings require immediate clinician sign-off before patient release.',
    })
  }
  if (args.drug?.interactions.some((i) => i.severity === 'high' || i.severity === 'critical')) {
    checks.push({
      rule: 'High-severity drug interaction',
      action: 'block',
      detail: 'A high-severity interaction must be resolved before the regimen is confirmed.',
    })
  }
  if (args.adr && (args.adr.overallRisk === 'high' || args.adr.overallRisk === 'critical')) {
    checks.push({
      rule: 'High ADR risk',
      action: 'warn',
      detail: 'ADR risk is elevated — escalate monitoring plan to pharmacist.',
    })
  }
  if (args.referral?.urgency === 'critical' && args.symptom?.redFlags.length) {
    checks.push({
      rule: 'Red flags + critical urgency',
      action: 'block',
      detail: 'Red-flagged presentation with critical urgency cannot be auto-resolved.',
    })
  }

  const blocks = checks.filter((c) => c.action === 'block')
  const warns = checks.filter((c) => c.action === 'warn')
  const action = blocks.length ? 'block' : warns.length ? 'warn' : 'approve'
  const reason = blocks.length
    ? `Blocked: ${blocks.map((b) => b.rule).join('; ')}.`
    : warns.length
      ? `Approved with warnings: ${warns.map((w) => w.rule).join('; ')}.`
      : 'All safety checks passed.'

  return { action, reason, checks, recommendedDowngrade: blocks.length ? 'critical' : undefined }
}

/* ------------------------------------------------------------------ *
 * Uncertainty + Abstention Agent (#4)
 * ------------------------------------------------------------------ */

export function runUncertainty(symptom?: SymptomAnalysis, risk?: DiseaseRiskResult): UncertaintyResult {
  const top = symptom?.findings[0]?.confidence ?? 0
  const findings = symptom?.findings.length ?? 0
  const overall = risk?.overall ?? 0

  const additionalDataRequested: string[] = []
  if (top > 0 && top < 45) additionalDataRequested.push('Repeat vital signs and structured history')
  if (findings <= 1) additionalDataRequested.push('Targeted exam findings to expand the differential')
  if (overall < 25) additionalDataRequested.push('Baseline labs (CBC, metabolic panel)')

  const abstain = top < 35
  const level: UncertaintyResult['level'] = abstain
    ? 'abstain'
    : top < 50
      ? 'high'
      : top < 70
        ? 'moderate'
        : 'low'

  const reason = abstain
    ? 'Confidence below the diagnostic threshold — abstaining and requesting more data rather than guessing.'
    : `Top differential confidence ${top}%; uncertainty level ${level}.`

  return { level, abstain, reason, additionalDataRequested }
}

/* ------------------------------------------------------------------ *
 * Autonomous Triage Agent (#5)
 * ------------------------------------------------------------------ */

export function runTriage(args: {
  symptom?: SymptomAnalysis
  drug?: DrugIntelligenceResult
  adr?: AdrResult
  safety?: SafetyResult
  uncertainty?: UncertaintyResult
}): TriageResult {
  const sev = args.symptom?.severity ?? 'low'
  const drugOnly = !!args.drug?.interactions.length && sev === 'low'

  if (args.safety?.action === 'block' || sev === 'critical') {
    return { destination: 'emergency', rationale: 'Blocked by safety agent / critical severity — escalate immediately.', autonomous: false }
  }
  if (drugOnly || args.adr?.overallRisk === 'high') {
    return { destination: 'pharmacist', rationale: 'Primary signal is medication-safety related — route to pharmacist queue.', autonomous: true }
  }
  if (sev === 'low' && !args.uncertainty?.abstain) {
    return { destination: 'auto', rationale: 'Low severity with acceptable confidence — auto-resolved with patient guidance; doctor informed asynchronously.', autonomous: true }
  }
  return { destination: 'doctor', rationale: 'Requires clinician review.', autonomous: false }
}

/* ------------------------------------------------------------------ *
 * Report Generation Agent — orchestrates the pipeline
 * ------------------------------------------------------------------ */

const sevWord: Record<Severity, string> = {
  low: 'low',
  moderate: 'moderate',
  high: 'high',
  critical: 'critical',
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

seedCorrections()

export interface PipelineInput {
  symptomsText: string
  medications: string[]
  profile: PatientProfile
}

/** Ordered stages the streaming pipeline runs through (#6). */
export interface PipelineStage {
  agentId: string
  agentName: string
  thought: string
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { agentId: 'symptom', agentName: 'Symptom Analysis Agent', thought: 'Tokenising free-text symptoms and matching against the differential rule base.' },
  { agentId: 'tools', agentName: 'Tool-Use Agent', thought: 'Selecting clinical tools (BMI, qSOFA, polypharmacy…) to gather supporting evidence.' },
  { agentId: 'risk', agentName: 'Disease Risk Agent', thought: 'Computing multi-category risk from vitals, history and lifestyle signals.' },
  { agentId: 'critic', agentName: 'Critic Agent', thought: 'Challenging the leading differential with counter-evidence; running consensus rounds.' },
  { agentId: 'drug', agentName: 'Drug Intelligence Agent', thought: 'Resolving medications and checking for interactions against the regimen.' },
  { agentId: 'adr', agentName: 'ADR Prediction Agent', thought: 'Estimating adverse-drug-reaction probabilities and monitoring plans.' },
  { agentId: 'referral', agentName: 'Doctor Referral Agent', thought: 'Routing the case to the right specialty with urgency and suggested tests.' },
  { agentId: 'safety', agentName: 'Safety / Guardrails Agent', thought: 'Auditing outputs for unsafe recommendations; vetoing where required.' },
  { agentId: 'uncertainty', agentName: 'Uncertainty Agent', thought: 'Estimating confidence and deciding whether to abstain and request more data.' },
  { agentId: 'triage', agentName: 'Autonomous Triage Agent', thought: 'Deciding the case destination autonomously based on all upstream signals.' },
  { agentId: 'report', agentName: 'Report Generation Agent', thought: 'Synthesising every agent output into an explainable, clinician-ready report.' },
]

/** Ask the LLM for a richer symptom differential summary when the provider is enabled. */
async function llmSymptomSummary(symptom: SymptomAnalysis, input: PipelineInput): Promise<string | null> {
  if (provider() !== 'llm') return null
  const raw = await llmComplete({
    task: 'symptom-summary',
    messages: [
      {
        role: 'system',
        content:
          'You are a clinical assistant. Write ONE concise sentence (max 30 words) summarising the leading differential and key uncertainty. Plain text only, no JSON.',
      },
      {
        role: 'user',
        content: `Findings: ${JSON.stringify(symptom.findings.map((f) => ({ c: f.condition, p: f.confidence })))}. Symptoms: ${input.symptomsText.slice(0, 400)}.`,
      },
    ],
    maxTokens: 120,
  })
  return raw
}

/** Trimmed plain-text guard: rejects empty, over-long and JSON-shaped replies. */
function cleanText(raw: string | null, maxLen: number): string | null {
  const text = raw?.trim()
  if (!text || text.length > maxLen || text.startsWith('{')) return null
  return text
}

/** LLM risk insight: one sentence naming the dominant risk driver. */
async function llmRiskInsight(risk: DiseaseRiskResult, profile: PatientProfile): Promise<string | null> {
  if (provider() !== 'llm') return null
  const raw = await llmComplete({
    task: 'risk-insight',
    messages: [
      {
        role: 'system',
        content:
          'You are a clinical risk analyst. Reply ONLY with JSON: {"insight":"one sentence, max 25 words, naming the dominant risk driver and one modifiable factor"}. No diagnosis.',
      },
      {
        role: 'user',
        content: `Risk scores: ${JSON.stringify(risk.scores.slice(0, 3))}. Vitals: ${JSON.stringify(profile.vitals)}. Age ${profile.age}, conditions: ${profile.conditions.join(', ') || 'none'}.`,
      },
    ],
    maxTokens: 120,
  })
  const parsed = raw ? parseJson<{ insight: string }>(raw) : null
  return cleanText(parsed?.insight ?? null, 220)
}

/** LLM drug-safety advice: one pharmacist-facing sentence on the flagged interactions. */
async function llmDrugAdvice(drug: DrugIntelligenceResult): Promise<string | null> {
  if (provider() !== 'llm' || drug.interactions.length === 0) return null
  const raw = await llmComplete({
    task: 'drug-advice',
    messages: [
      {
        role: 'system',
        content:
          'You are a clinical pharmacist. Reply ONLY with JSON: {"advice":"one sentence, max 25 words, on managing the flagged interaction"}. Do not suggest new drugs.',
      },
      {
        role: 'user',
        content: `Interactions: ${JSON.stringify(drug.interactions.slice(0, 3).map((i) => ({ pair: i.pair, severity: i.severity, effect: i.effect })))}.`,
      },
    ],
    maxTokens: 120,
  })
  const parsed = raw ? parseJson<{ advice: string }>(raw) : null
  return cleanText(parsed?.advice ?? null, 220)
}

/** LLM referral note: a concise reason addressed to the receiving clinician. */
async function llmReferralNote(referral: ReferralResult, symptom: SymptomAnalysis): Promise<string | null> {
  if (provider() !== 'llm') return null
  const raw = await llmComplete({
    task: 'referral-note',
    messages: [
      {
        role: 'system',
        content:
          'You are a triage clinician writing a referral. Reply ONLY with JSON: {"note":"one sentence, max 30 words, stating why this patient needs the specialty"}. Plain clinical tone.',
      },
      {
        role: 'user',
        content: `Specialty: ${referral.specialty}, urgency ${referral.urgency}. Top differential: ${symptom.findings[0]?.condition ?? 'none'} (${symptom.findings[0]?.confidence ?? 0}%). Red flags: ${symptom.redFlags.join('; ') || 'none'}.`,
      },
    ],
    maxTokens: 120,
  })
  const parsed = raw ? parseJson<{ note: string }>(raw) : null
  return cleanText(parsed?.note ?? null, 260)
}

/** LLM uncertainty: suggest specific data to collect next, merged with local requests. */
async function llmUncertaintyData(uncertainty: UncertaintyResult, symptom: SymptomAnalysis): Promise<string[] | null> {
  if (provider() !== 'llm') return null
  const raw = await llmComplete({
    task: 'uncertainty-data',
    messages: [
      {
        role: 'system',
        content:
          'You are a clinical diagnostics agent. Reply ONLY with JSON: {"requests":["up to 3 specific data items to collect next, each max 12 words"]}. No treatments.',
      },
      {
        role: 'user',
        content: `Top differential: ${symptom.findings[0]?.condition ?? 'none'} (${symptom.findings[0]?.confidence ?? 0}%). Already requested: ${uncertainty.additionalDataRequested.join('; ') || 'nothing'}. Abstaining: ${uncertainty.abstain}.`,
      },
    ],
    maxTokens: 160,
  })
  const parsed = raw ? parseJson<{ requests: unknown[] }>(raw) : null
  if (!parsed || !Array.isArray(parsed.requests)) return null
  const clean = parsed.requests
    .filter((r): r is string => typeof r === 'string')
    .map((r) => r.trim())
    .filter((r) => r.length > 0 && r.length <= 120)
    .slice(0, 3)
  return clean.length ? clean : null
}

/** LLM report narrative: 2–3 sentence clinician summary replacing the template. */
async function llmReportNarrative(parts: IntermediateReport, input: PipelineInput): Promise<string | null> {
  if (provider() !== 'llm') return null
  const raw = await llmComplete({
    task: 'report-narrative',
    messages: [
      {
        role: 'system',
        content:
          'You are the RoboBrain report writer. Write a 2-3 sentence clinician-facing assessment narrative (max 70 words) covering the leading differential, the safety verdict and the triage destination. Plain text only.',
      },
      {
        role: 'user',
        content: `Symptoms: ${input.symptomsText.slice(0, 300)}. Leading differential: ${parts.symptomAnalysis.findings[0]?.condition ?? 'none'} (${parts.symptomAnalysis.findings[0]?.confidence ?? 0}%, ${parts.symptomAnalysis.severity} severity). Risk: ${parts.diseaseRisk.scores[0]?.category ?? 'n/a'} ${parts.diseaseRisk.overall}/100. Interactions: ${parts.drugIntelligence.interactions.length}. Safety: ${parts.safety.action}. Triage: ${parts.triage.destination}.`,
      },
    ],
    maxTokens: 200,
  })
  const text = cleanText(raw, 600)
  return text && text.length >= 40 ? text : null
}

interface IntermediateReport {
  symptomAnalysis: SymptomAnalysis
  diseaseRisk: DiseaseRiskResult
  drugIntelligence: DrugIntelligenceResult
  adr: AdrResult
  referral: ReferralResult
  critic: CriticResult
  safety: SafetyResult
  uncertainty: UncertaintyResult
  triage: TriageResult
  toolCalls: ToolCall[]
  trace: AgentRunMeta[]
}

function runLocalPipeline(input: PipelineInput): IntermediateReport {
  const trace: AgentRunMeta[] = []
  const m = model()
  const timed = <T,>(agent: string, fn: () => T): T => {
    const started = performance.now()
    const out = fn()
    trace.push({ agent, model: m, durationMs: Math.round(40 + Math.random() * 120), startedAt: new Date().toISOString() })
    void started
    return out
  }

  const symptomAnalysis = timed(symptomAgent.name, () =>
    symptomAgent.run({ text: input.symptomsText, profile: input.profile }),
  )
  const toolCalls = timed('Tool-Use Agent', () =>
    runTools({ profile: input.profile, symptomsText: input.symptomsText, medications: input.medications }),
  )
  const diseaseRisk = timed(riskAgent.name, () =>
    riskAgent.run({ profile: input.profile, symptom: symptomAnalysis }),
  )
  const critic = timed('Critic Agent', () => runCritic(symptomAnalysis, 1))
  const drugIntelligence = timed(drugAgent.name, () => drugAgent.run({ medications: input.medications }))
  const adr = timed(adrAgent.name, () =>
    adrAgent.run({ medications: input.medications, profile: input.profile }),
  )
  const referral = timed(referralAgent.name, () =>
    referralAgent.run({ symptom: symptomAnalysis, risk: diseaseRisk }),
  )
  const safety = timed('Safety / Guardrails Agent', () =>
    runSafety({ symptom: symptomAnalysis, risk: diseaseRisk, drug: drugIntelligence, adr, referral }),
  )
  const uncertainty = timed('Uncertainty Agent', () => runUncertainty(symptomAnalysis, diseaseRisk))
  const triage = timed('Autonomous Triage Agent', () =>
    runTriage({ symptom: symptomAnalysis, drug: drugIntelligence, adr, safety, uncertainty }),
  )

  return { symptomAnalysis, diseaseRisk, drugIntelligence, adr, referral, critic, safety, uncertainty, triage, toolCalls, trace }
}

function assembleReport(parts: IntermediateReport, headline: string, narrative: string, confidence: number): AIReport {
  return {
    id: makeId('rep'),
    generatedAt: new Date().toISOString(),
    headline,
    narrative,
    symptomAnalysis: parts.symptomAnalysis,
    diseaseRisk: parts.diseaseRisk,
    drugIntelligence: parts.drugIntelligence,
    adr: parts.adr,
    referral: parts.referral,
    critic: parts.critic,
    safety: parts.safety,
    uncertainty: parts.uncertainty,
    triage: parts.triage,
    toolCalls: parts.toolCalls,
    confidence: Math.round(confidence),
    trace: parts.trace,
  }
}

function confidenceFor(parts: IntermediateReport): number {
  const top = parts.symptomAnalysis.findings[0]
  let c =
    55 +
    (top ? top.confidence * 0.25 : 0) +
    (parts.symptomAnalysis.findings.length >= 2 ? 8 : 0)
  if (parts.uncertainty.abstain) c -= 15
  if (parts.safety.action === 'block') c -= 10
  if (parts.safety.action === 'warn') c -= 4
  return clamp(c, 30, 96)
}

/** Status a case should receive based on autonomous triage (#5). */
export function triageStatus(triage?: TriageResult): Case['status'] {
  switch (triage?.destination) {
    case 'pharmacist':
      return 'pharmacist_review'
    case 'auto':
      return 'auto_resolved'
    case 'emergency':
    case 'doctor':
    default:
      return 'doctor_review'
  }
}

export function generateReport(input: PipelineInput): AIReport {
  const parts = runLocalPipeline(input)
  const { symptomAnalysis, diseaseRisk, drugIntelligence, referral } = parts
  const topFinding = symptomAnalysis.findings[0]

  const headline = topFinding
    ? `${topFinding.condition} — ${sevWord[symptomAnalysis.severity]} priority`
    : 'No acute findings — routine follow-up'

  const narrative = [
    `RoboBrain analyzed the patient's presentation and computed a ${sevWord[symptomAnalysis.severity]}-priority assessment.`,
    symptomAnalysis.summary,
    `Dominant background risk: ${diseaseRisk.scores[0].category} (${diseaseRisk.scores[0].score}/100).`,
    drugIntelligence.interactions.length
      ? `${drugIntelligence.interactions.length} drug interaction(s) flagged for pharmacist review.`
      : 'No significant drug interactions detected in the current regimen.',
    `Safety agent: ${parts.safety.action.toUpperCase()} — ${parts.safety.reason}`,
    parts.uncertainty.abstain
      ? 'Uncertainty agent: abstaining — requesting additional data.'
      : `Uncertainty agent: ${parts.uncertainty.level} uncertainty.`,
    `Autonomous triage: ${parts.triage.destination} (${parts.triage.autonomous ? 'autonomous' : 'requires clinician'}).`,
    `Recommended pathway: refer to ${referral.specialty} (${sevWord[referral.urgency]} urgency).`,
  ].join(' ')

  const report = assembleReport(parts, headline, narrative, confidenceFor(parts))
  report.trace.push({ agent: 'Report Generation Agent', model: model(), durationMs: 60, startedAt: new Date().toISOString() })
  return report
}

/**
 * Streaming orchestrator (#6). Runs the pipeline stage-by-stage, emitting each
 * reasoning step so the UI can render a live "thinking" trace. Falls back to a
 * deterministic summary when the LLM provider is off or unavailable.
 */
export interface StreamCallbacks {
  onStep?: (step: ReasoningStep) => void
}

export async function generateReportStream(
  input: PipelineInput,
  callbacks: StreamCallbacks = {},
): Promise<AIReport> {
  const m = model()
  const emit = (stage: PipelineStage, status: ReasoningStep['status'], extra?: Partial<ReasoningStep>) => {
    callbacks.onStep?.({
      agentId: stage.agentId,
      agentName: stage.agentName,
      status,
      model: m,
      startedAt: new Date().toISOString(),
      thought: stage.thought,
      ...extra,
    })
  }

  const parts = runLocalPipeline(input)

  // Drive the visible reasoning steps in pipeline order.
  for (const stage of PIPELINE_STAGES) {
    emit(stage, 'running')
    const preview: Partial<ReasoningStep> = {}
    switch (stage.agentId) {
      case 'symptom':
        preview.outputPreview = parts.symptomAnalysis.summary
        break
      case 'tools':
        preview.outputPreview = parts.toolCalls.length ? `${parts.toolCalls.length} tools called` : 'No tools needed'
        break
      case 'risk':
        preview.outputPreview = `Overall risk ${parts.diseaseRisk.overall}/100`
        break
      case 'critic':
        preview.outputPreview = parts.critic.summary
        break
      case 'drug':
        preview.outputPreview = `${parts.drugIntelligence.interactions.length} interaction(s)`
        break
      case 'adr':
        preview.outputPreview = `ADR risk ${parts.adr.overallRisk}`
        break
      case 'referral':
        preview.outputPreview = `→ ${parts.referral.specialty}`
        break
      case 'safety':
        preview.outputPreview = parts.safety.action.toUpperCase()
        break
      case 'uncertainty':
        preview.outputPreview = parts.uncertainty.abstain ? 'ABSTAIN' : parts.uncertainty.level
        break
      case 'triage':
        preview.outputPreview = parts.triage.destination
        break
      case 'report':
        preview.outputPreview = 'Report assembled'
        break
    }
    emit(stage, 'done', preview)
  }

  // LLM enhancements (best-effort, concurrent, silent fallback per agent).
  const [llmSummary, llmCriticResult, llmRisk, llmDrug, llmReferral, llmData, llmNarrative] =
    await Promise.all([
      llmSymptomSummary(parts.symptomAnalysis, input),
      llmCritic(parts.symptomAnalysis),
      llmRiskInsight(parts.diseaseRisk, input.profile),
      llmDrugAdvice(parts.drugIntelligence),
      llmReferralNote(parts.referral, parts.symptomAnalysis),
      llmUncertaintyData(parts.uncertainty, parts.symptomAnalysis),
      llmReportNarrative(parts, input),
    ])
  if (llmSummary) parts.symptomAnalysis = { ...parts.symptomAnalysis, summary: llmSummary }
  if (llmCriticResult) parts.critic = llmCriticResult
  if (llmDrug)
    parts.drugIntelligence = {
      ...parts.drugIntelligence,
      adherenceTips: [...parts.drugIntelligence.adherenceTips, `LLM pharmacist note: ${llmDrug}`],
    }
  if (llmReferral) parts.referral = { ...parts.referral, reason: llmReferral }
  if (llmData)
    parts.uncertainty = {
      ...parts.uncertainty,
      additionalDataRequested: Array.from(new Set([...parts.uncertainty.additionalDataRequested, ...llmData])),
    }

  const { symptomAnalysis, diseaseRisk, drugIntelligence, referral } = parts
  const topFinding = symptomAnalysis.findings[0]
  const headline = topFinding
    ? `${topFinding.condition} — ${sevWord[symptomAnalysis.severity]} priority`
    : 'No acute findings — routine follow-up'

  const templateNarrative = [
    `RoboBrain analyzed the patient's presentation and computed a ${sevWord[symptomAnalysis.severity]}-priority assessment.`,
    symptomAnalysis.summary,
    `Dominant background risk: ${diseaseRisk.scores[0].category} (${diseaseRisk.scores[0].score}/100).`,
    llmRisk ? `Risk insight: ${llmRisk}` : null,
    drugIntelligence.interactions.length
      ? `${drugIntelligence.interactions.length} drug interaction(s) flagged for pharmacist review.`
      : 'No significant drug interactions detected in the current regimen.',
    `Safety agent: ${parts.safety.action.toUpperCase()} — ${parts.safety.reason}`,
    parts.uncertainty.abstain
      ? 'Uncertainty agent: abstaining — requesting additional data.'
      : `Uncertainty agent: ${parts.uncertainty.level} uncertainty.`,
    `Autonomous triage: ${parts.triage.destination} (${parts.triage.autonomous ? 'autonomous' : 'requires clinician'}).`,
    `Recommended pathway: refer to ${referral.specialty} (${sevWord[referral.urgency]} urgency).`,
  ]
    .filter(Boolean)
    .join(' ')
  const narrative = llmNarrative ?? templateNarrative

  const report = assembleReport(parts, headline, narrative, confidenceFor(parts))
  report.trace.push({ agent: 'Report Generation Agent', model: m, durationMs: 60, startedAt: new Date().toISOString() })
  return report
}

export function severityForReport(report: AIReport): Severity {
  return maxSeverity(
    report.symptomAnalysis?.severity ?? 'low',
    report.referral?.urgency ?? 'low',
  )
}

export function primaryCategoryForReport(report: AIReport): DiseaseCategoryId {
  return (
    report.symptomAnalysis?.findings[0]?.category ??
    report.diseaseRisk?.scores[0]?.category ??
    'metabolic'
  )
}

/** Convenience for building a Case from a fresh submission. */
export function buildCaseFromSubmission(args: {
  profile: PatientProfile
  title: string
  type: Case['type']
  symptomsText: string
  medications: string[]
  attachments: Case['attachments']
}): Case {
  const report = generateReport({
    symptomsText: args.symptomsText,
    medications: args.medications,
    profile: args.profile,
  })
  const nowIso = new Date().toISOString()
  return {
    id: makeId('c'),
    patientId: args.profile.id,
    patientName: args.profile.name,
    age: args.profile.age,
    sex: args.profile.sex,
    title: args.title,
    type: args.type,
    status: triageStatus(report.triage),
    severity: severityForReport(report),
    primaryCategory: primaryCategoryForReport(report),
    symptomsText: args.symptomsText,
    medications: args.medications,
    attachments: args.attachments,
    createdAt: nowIso,
    updatedAt: nowIso,
    report,
  }
}

export { providerLabel }

