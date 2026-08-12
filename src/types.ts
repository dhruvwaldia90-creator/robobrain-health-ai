export type Role = 'patient' | 'doctor' | 'pharmacist' | 'researcher'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  /** demo-only password; never do this in production */
  password: string
  title?: string
  specialty?: string
  avatarColor: string
}

export type Sex = 'male' | 'female' | 'other'

export interface PatientProfile {
  id: string
  userId: string
  name: string
  age: number
  sex: Sex
  bloodGroup: string
  heightCm: number
  weightKg: number
  conditions: string[]
  allergies: string[]
  medications: string[]
  vitals: Vitals
}

export interface Vitals {
  systolic: number
  diastolic: number
  heartRate: number
  temperatureC: number
  spo2: number
  glucoseMgDl: number
  cholesterolMgDl: number
  smoker: boolean
}

export type DiseaseCategoryId =
  | 'infectious'
  | 'oncology'
  | 'cardiovascular'
  | 'neurological'
  | 'respiratory'
  | 'metabolic'
  | 'genetic'

export interface DiseaseCategory {
  id: DiseaseCategoryId
  name: string
  short: string
  icon: string
  description: string
  color: string
  exampleConditions: string[]
}

export type SubmissionType = 'symptoms' | 'prescription' | 'lab'

/** Autonomous triage destinations expand where a case can be routed. */
export type CaseStatus =
  | 'analyzing'
  | 'ai_complete'
  | 'doctor_review'
  | 'pharmacist_review'
  | 'auto_resolved'
  | 'reviewed'

export type Severity = 'low' | 'moderate' | 'high' | 'critical'

export interface Attachment {
  id: string
  name: string
  type: SubmissionType
  sizeKb: number
  addedAt: string
}

export interface SymptomFinding {
  condition: string
  category: DiseaseCategoryId
  confidence: number
  rationale: string
}

export interface SymptomAnalysis {
  summary: string
  severity: Severity
  findings: SymptomFinding[]
  recommendedSpecialty: string
  redFlags: string[]
}

export interface RiskScore {
  category: DiseaseCategoryId
  score: number
  band: Severity
  drivers: string[]
}

export interface DiseaseRiskResult {
  overall: number
  scores: RiskScore[]
}

export interface DrugInsight {
  drug: string
  class: string
  indication: string
  notes: string
}

export interface DrugInteraction {
  pair: [string, string]
  severity: Severity
  effect: string
  management: string
}

export interface DrugIntelligenceResult {
  insights: DrugInsight[]
  interactions: DrugInteraction[]
  adherenceTips: string[]
}

export interface AdrPrediction {
  drug: string
  reaction: string
  probability: number
  severity: Severity
  monitoring: string
}

export interface AdrResult {
  predictions: AdrPrediction[]
  overallRisk: Severity
}

export interface ReferralResult {
  specialty: string
  urgency: Severity
  reason: string
  suggestedTests: string[]
  recommendedDoctor?: string
}

/** Critic Agent (#1) — challenges a symptom analysis with counter-evidence. */
export interface CriticFinding {
  condition: string
  challenge: string
  support: string
  adjustedConfidence: number
}

export interface CriticResult {
  round: number
  challenges: CriticFinding[]
  finalConfidences: Record<string, number>
  summary: string
}

/** Safety/Guardrails Agent (#3) — vetoes or downgrades unsafe recommendations. */
export type SafetyAction = 'approve' | 'warn' | 'block'

export interface SafetyCheck {
  rule: string
  action: SafetyAction
  detail: string
}

export interface SafetyResult {
  action: SafetyAction
  reason: string
  checks: SafetyCheck[]
  recommendedDowngrade?: Severity
}

/** Uncertainty + abstention (#4). */
export interface UncertaintyResult {
  level: 'low' | 'moderate' | 'high' | 'abstain'
  abstain: boolean
  reason: string
  additionalDataRequested: string[]
}

/** Autonomous triage (#5). */
export type TriageDestination = 'doctor' | 'pharmacist' | 'auto' | 'emergency'

export interface TriageResult {
  destination: TriageDestination
  rationale: string
  autonomous: boolean
}

/** A single reasoning step in the live thinking trace (#6). */
export interface ReasoningStep {
  agentId: string
  agentName: string
  status: 'pending' | 'running' | 'done'
  model: string
  startedAt: string
  durationMs?: number
  thought: string
  outputPreview?: string
}

export interface AgentRunMeta {
  agent: string
  durationMs: number
  model: string
  startedAt: string
}

/** Tool-use (#7). */
export interface ToolCall {
  tool: string
  args: Record<string, unknown>
  result: string
}

export interface AIReport {
  id: string
  generatedAt: string
  headline: string
  narrative: string
  symptomAnalysis?: SymptomAnalysis
  diseaseRisk?: DiseaseRiskResult
  drugIntelligence?: DrugIntelligenceResult
  adr?: AdrResult
  referral?: ReferralResult
  critic?: CriticResult
  safety?: SafetyResult
  uncertainty?: UncertaintyResult
  triage?: TriageResult
  toolCalls?: ToolCall[]
  confidence: number
  trace: AgentRunMeta[]
}

export interface DoctorNote {
  doctorId: string
  doctorName: string
  decision: 'agree' | 'modify' | 'escalate'
  note: string
  createdAt: string
}

/** Doctor-feedback learning (#2) — records an AI/doctor disagreement so weights adapt. */
export interface LearningEntry {
  id: string
  caseId: string
  condition: string
  category: DiseaseCategoryId
  aiConfidence: number
  decision: DoctorNote['decision']
  createdAt: string
}

/** Longitudinal monitoring (#9) — a timestamped vitals snapshot. */
export interface VitalsSnapshot {
  takenAt: string
  vitals: Vitals
}

/** Autonomous outbreak detection (#10). */
export interface AnomalySignal {
  id: string
  category: DiseaseCategoryId
  type: 'outbreak' | 'spike' | 'decline'
  severity: Severity
  message: string
  detectedAt: string
  expected: number
  observed: number
  windowCases: number
}

export interface Case {
  id: string
  patientId: string
  patientName: string
  age: number
  sex: Sex
  title: string
  type: SubmissionType
  status: CaseStatus
  severity: Severity
  primaryCategory: DiseaseCategoryId
  symptomsText: string
  medications: string[]
  attachments: Attachment[]
  createdAt: string
  updatedAt: string
  report?: AIReport
  doctorNote?: DoctorNote
}

/** Inference provider identifier — local deterministic engine or an LLM backend. */
export type ProviderId = 'local' | 'llm'
