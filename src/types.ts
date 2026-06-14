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

export type CaseStatus = 'analyzing' | 'ai_complete' | 'doctor_review' | 'reviewed'

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

export interface AgentRunMeta {
  agent: string
  durationMs: number
  model: string
  startedAt: string
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
