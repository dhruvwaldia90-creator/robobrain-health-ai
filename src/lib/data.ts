import type {
  Case,
  DiseaseCategoryId,
  DiseaseCategory,
  PatientProfile,
  User,
} from '@/types'
import { generateReport } from './agents'

export const DISEASE_CATEGORIES: DiseaseCategory[] = [
  {
    id: 'infectious',
    name: 'Infectious Diseases',
    short: 'Infectious',
    icon: 'Bug',
    color: '#ef4444',
    description:
      'Bacterial, viral, fungal and parasitic infections — from influenza and tuberculosis to sepsis.',
    exampleConditions: ['Influenza', 'Tuberculosis', 'Sepsis', 'Dengue', 'COVID-19'],
  },
  {
    id: 'oncology',
    name: 'Cancer & Oncology',
    short: 'Oncology',
    icon: 'Ribbon',
    color: '#a855f7',
    description:
      'Malignancies and tumor biology across solid and hematological cancers with risk stratification.',
    exampleConditions: ['Lung Cancer', 'Breast Cancer', 'Leukemia', 'Colorectal Cancer'],
  },
  {
    id: 'cardiovascular',
    name: 'Cardiovascular Disorders',
    short: 'Cardiovascular',
    icon: 'HeartPulse',
    color: '#f43f5e',
    description:
      'Heart and vascular conditions including coronary artery disease, arrhythmia and heart failure.',
    exampleConditions: ['Hypertension', 'Coronary Artery Disease', 'Arrhythmia', 'Heart Failure'],
  },
  {
    id: 'neurological',
    name: 'Neurological Disorders',
    short: 'Neurological',
    icon: 'Brain',
    color: '#6366f1',
    description:
      'Disorders of the brain, spinal cord and nerves such as stroke, epilepsy and migraine.',
    exampleConditions: ['Stroke', 'Epilepsy', 'Migraine', 'Parkinson’s Disease'],
  },
  {
    id: 'respiratory',
    name: 'Respiratory Disorders',
    short: 'Respiratory',
    icon: 'Wind',
    color: '#06b6d4',
    description:
      'Airway and lung conditions including asthma, COPD and pulmonary infections.',
    exampleConditions: ['Asthma', 'COPD', 'Pneumonia', 'Pulmonary Fibrosis'],
  },
  {
    id: 'metabolic',
    name: 'Metabolic & Endocrine',
    short: 'Metabolic',
    icon: 'Activity',
    color: '#f59e0b',
    description:
      'Hormonal and metabolic disease such as diabetes, thyroid disorders and obesity.',
    exampleConditions: ['Type 2 Diabetes', 'Hypothyroidism', 'Obesity', 'Metabolic Syndrome'],
  },
  {
    id: 'genetic',
    name: 'Genetic & Rare Disorders',
    short: 'Genetic',
    icon: 'Dna',
    color: '#10b981',
    description:
      'Inherited and rare conditions requiring specialized genomic and multidisciplinary care.',
    exampleConditions: ['Cystic Fibrosis', 'Sickle Cell Disease', 'Huntington’s Disease'],
  },
]

export const categoryById = (id: DiseaseCategoryId): DiseaseCategory =>
  DISEASE_CATEGORIES.find((c) => c.id === id) ?? DISEASE_CATEGORIES[0]

export const AGENTS = [
  {
    id: 'symptom',
    name: 'Symptom Analysis Agent',
    icon: 'Stethoscope',
    blurb: 'Parses free-text symptoms into ranked differentials, fused with a logistic-regression classifier trained on 4,920 Kaggle cases.',
  },
  {
    id: 'tools',
    name: 'Tool-Use Agent',
    icon: 'Wrench',
    blurb: 'Selects clinical tools (BMI, qSOFA, polypharmacy…) to gather supporting evidence autonomously.',
  },
  {
    id: 'risk',
    name: 'Disease Risk Agent',
    icon: 'ShieldAlert',
    blurb: 'Computes multi-category disease risk from vitals, history and lifestyle signals.',
  },
  {
    id: 'critic',
    name: 'Critic Agent',
    icon: 'Scale',
    blurb: 'Challenges the leading differential with counter-evidence; runs a consensus debate loop.',
  },
  {
    id: 'drug',
    name: 'Drug Intelligence Agent',
    icon: 'Pill',
    blurb: 'Reviews prescriptions for interactions, dosing and therapeutic alternatives.',
  },
  {
    id: 'adr',
    name: 'ADR Prediction Agent',
    icon: 'AlertTriangle',
    blurb: 'Predicts adverse drug reactions and recommends monitoring plans.',
  },
  {
    id: 'referral',
    name: 'Doctor Referral Agent',
    icon: 'UserPlus',
    blurb: 'Routes cases to the right specialty with an urgency level and suggested tests.',
  },
  {
    id: 'safety',
    name: 'Safety / Guardrails Agent',
    icon: 'ShieldCheck',
    blurb: 'Audits every output for unsafe recommendations; vetoes or downgrades where required.',
  },
  {
    id: 'uncertainty',
    name: 'Uncertainty Agent',
    icon: 'HelpCircle',
    blurb: 'Estimates confidence and abstains when evidence is too weak, requesting more data.',
  },
  {
    id: 'triage',
    name: 'Autonomous Triage Agent',
    icon: 'Route',
    blurb: 'Decides the case destination autonomously — doctor, pharmacist, auto-resolve or escalate.',
  },
  {
    id: 'report',
    name: 'Report Generation Agent',
    icon: 'FileText',
    blurb: 'Synthesizes every agent output into a clinician-ready, reviewable report.',
  },
  {
    id: 'research',
    name: 'Research Intelligence Agent',
    icon: 'FlaskConical',
    blurb: 'Surfaces cohort trends, biomarkers and autonomous outbreak signals across the population.',
  },
] as const

const AVATAR = {
  patient: '#33a1ff',
  doctor: '#14b8a6',
  pharmacist: '#a855f7',
  researcher: '#f59e0b',
}

export const DEMO_USERS: User[] = [
  {
    id: 'u_patient',
    name: 'Aarav Sharma',
    email: 'patient@robobrain.ai',
    password: 'demo1234',
    role: 'patient',
    avatarColor: AVATAR.patient,
  },
  {
    id: 'u_doctor',
    name: 'Dr. Meera Iyer',
    email: 'doctor@robobrain.ai',
    password: 'demo1234',
    role: 'doctor',
    title: 'MD, Internal Medicine',
    specialty: 'Cardiology',
    avatarColor: AVATAR.doctor,
  },
  {
    id: 'u_pharma',
    name: 'Rohan Verma',
    email: 'pharmacist@robobrain.ai',
    password: 'demo1234',
    role: 'pharmacist',
    title: 'PharmD',
    avatarColor: AVATAR.pharmacist,
  },
  {
    id: 'u_research',
    name: 'Dr. Lena Costa',
    email: 'researcher@robobrain.ai',
    password: 'demo1234',
    role: 'researcher',
    title: 'PhD, Computational Biology',
    avatarColor: AVATAR.researcher,
  },
]

export const DEMO_PROFILE: PatientProfile = {
  id: 'p_main',
  userId: 'u_patient',
  name: 'Aarav Sharma',
  age: 54,
  sex: 'male',
  bloodGroup: 'O+',
  heightCm: 174,
  weightKg: 92,
  conditions: ['Type 2 Diabetes', 'Hypertension'],
  allergies: ['Penicillin'],
  medications: ['Metformin 1000mg', 'Amlodipine 5mg', 'Atorvastatin 20mg'],
  vitals: {
    systolic: 148,
    diastolic: 94,
    heartRate: 88,
    temperatureC: 37.1,
    spo2: 96,
    glucoseMgDl: 168,
    cholesterolMgDl: 232,
    smoker: true,
  },
}

const now = Date.now()
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString()

const RAW_SEED_CASES: Case[] = [
  {
    id: 'c_1001',
    patientId: 'p_main',
    patientName: 'Aarav Sharma',
    age: 54,
    sex: 'male',
    title: 'Chest tightness & breathlessness',
    type: 'symptoms',
    status: 'doctor_review',
    severity: 'high',
    primaryCategory: 'cardiovascular',
    symptomsText:
      'Chest tightness on exertion for 3 days, radiating to left arm, shortness of breath, sweating, occasional dizziness.',
    medications: ['Metformin 1000mg', 'Amlodipine 5mg', 'Atorvastatin 20mg'],
    attachments: [
      { id: 'a1', name: 'ecg_strip.pdf', type: 'lab', sizeKb: 412, addedAt: hoursAgo(5) },
    ],
    createdAt: hoursAgo(5),
    updatedAt: hoursAgo(4),
  },
  {
    id: 'c_1002',
    patientId: 'p_jordan',
    patientName: 'Jordan Blake',
    age: 38,
    sex: 'female',
    title: 'Persistent cough & low-grade fever',
    type: 'symptoms',
    status: 'ai_complete',
    severity: 'moderate',
    primaryCategory: 'respiratory',
    symptomsText:
      'Productive cough for 2 weeks, low-grade fever in the evenings, night sweats, mild weight loss, fatigue.',
    medications: ['Salbutamol inhaler'],
    attachments: [
      { id: 'a2', name: 'chest_xray.png', type: 'lab', sizeKb: 980, addedAt: hoursAgo(20) },
    ],
    createdAt: hoursAgo(20),
    updatedAt: hoursAgo(19),
  },
  {
    id: 'c_1003',
    patientId: 'p_sam',
    patientName: 'Sam Rivera',
    age: 61,
    sex: 'male',
    title: 'Polypharmacy review request',
    type: 'prescription',
    status: 'doctor_review',
    severity: 'moderate',
    primaryCategory: 'metabolic',
    symptomsText:
      'Routine medication review. Reports occasional muscle aches and dizziness when standing.',
    medications: [
      'Metformin 1000mg',
      'Atorvastatin 40mg',
      'Lisinopril 20mg',
      'Clopidogrel 75mg',
      'Warfarin 5mg',
    ],
    attachments: [
      { id: 'a3', name: 'prescription_2025.pdf', type: 'prescription', sizeKb: 220, addedAt: hoursAgo(30) },
    ],
    createdAt: hoursAgo(30),
    updatedAt: hoursAgo(28),
  },
  {
    id: 'c_1004',
    patientId: 'p_lee',
    patientName: 'Lee Morgan',
    age: 47,
    sex: 'female',
    title: 'Recurrent severe headaches',
    type: 'symptoms',
    status: 'reviewed',
    severity: 'moderate',
    primaryCategory: 'neurological',
    symptomsText:
      'Throbbing unilateral headaches 3x/week, photophobia, nausea, visual aura before onset.',
    medications: ['Ibuprofen as needed'],
    attachments: [],
    createdAt: hoursAgo(54),
    updatedAt: hoursAgo(40),
    doctorNote: {
      doctorId: 'u_doctor',
      doctorName: 'Dr. Meera Iyer',
      decision: 'agree',
      note: 'Consistent with migraine with aura. Start prophylaxis, headache diary, refer to neurology if refractory.',
      createdAt: hoursAgo(40),
    },
  },
]

function synthProfile(c: Case): PatientProfile {
  const v = { ...DEMO_PROFILE.vitals }
  switch (c.primaryCategory) {
    case 'respiratory':
      v.spo2 = 93
      v.temperatureC = 37.6
      v.smoker = true
      break
    case 'infectious':
      v.temperatureC = 38.4
      v.heartRate = 104
      break
    case 'cardiovascular':
      v.systolic = 152
      v.diastolic = 96
      v.cholesterolMgDl = 244
      break
    case 'neurological':
      v.systolic = 138
      break
    case 'metabolic':
      v.glucoseMgDl = 186
      break
    default:
      break
  }
  return {
    ...DEMO_PROFILE,
    id: c.patientId,
    userId: '',
    name: c.patientName,
    age: c.age,
    sex: c.sex,
    medications: c.medications,
    conditions: [],
    allergies: [],
    vitals: v,
  }
}

export const SEED_CASES: Case[] = RAW_SEED_CASES.map((c) => ({
  ...c,
  report: generateReport({
    symptomsText: c.symptomsText,
    medications: c.medications,
    profile: synthProfile(c),
  }),
}))
