import { useSyncExternalStore } from 'react'
import type {
  Case,
  DoctorNote,
  LearningEntry,
  PatientProfile,
  VitalsSnapshot,
} from '@/types'
import { recordCorrection, resetCorrections } from './learning'
import { DEMO_PROFILE, SEED_CASES } from './data'

const CASES_KEY = 'robobrain.cases.v1'
const PROFILE_KEY = 'robobrain.profile.v1'
const VITALS_HISTORY_KEY = 'robobrain.vitals-history.v1'
const LEARNING_KEY = 'robobrain.learning-log.v1'

interface AppState {
  cases: Case[]
  profile: PatientProfile
  vitalsHistory: VitalsSnapshot[]
  learningLog: LearningEntry[]
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function seedVitalsHistory(): VitalsSnapshot[] {
  const now = Date.now()
  const day = 86_400_000
  const base = DEMO_PROFILE.vitals
  const wobble = (v: number, d: number) => Math.max(60, Math.round(v + (Math.random() - 0.5) * d))
  return [6, 4, 2, 0].map((d) => ({
    takenAt: new Date(now - d * day).toISOString(),
    vitals: {
      ...base,
      systolic: wobble(base.systolic, 12),
      diastolic: wobble(base.diastolic, 8),
      heartRate: wobble(base.heartRate, 10),
      glucoseMgDl: wobble(base.glucoseMgDl, 18),
      cholesterolMgDl: wobble(base.cholesterolMgDl, 14),
      spo2: Math.min(99, wobble(base.spo2, 2)),
    },
  }))
}

let state: AppState = {
  cases: load<Case[]>(CASES_KEY, SEED_CASES),
  profile: load<PatientProfile>(PROFILE_KEY, DEMO_PROFILE),
  vitalsHistory: load<VitalsSnapshot[]>(VITALS_HISTORY_KEY, seedVitalsHistory()),
  learningLog: load<LearningEntry[]>(LEARNING_KEY, []),
}

const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(CASES_KEY, JSON.stringify(state.cases))
    localStorage.setItem(PROFILE_KEY, JSON.stringify(state.profile))
    localStorage.setItem(VITALS_HISTORY_KEY, JSON.stringify(state.vitalsHistory))
    localStorage.setItem(LEARNING_KEY, JSON.stringify(state.learningLog))
  } catch {
    /* storage may be unavailable; in-memory state still works */
  }
}

function emit() {
  persist()
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function addCase(c: Case) {
  state = { ...state, cases: [c, ...state.cases] }
  emit()
}

export function updateCase(id: string, patch: Partial<Case>) {
  state = {
    ...state,
    cases: state.cases.map((c) =>
      c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
    ),
  }
  emit()
}

/**
 * Doctor sign-off. Records a learning entry (#2) so the Critic Agent adapts:
 * when a clinician modifies or escalates, the matched condition's confidence
 * gets a persistent negative correction.
 */
export function addDoctorNote(id: string, note: DoctorNote) {
  const c = state.cases.find((x) => x.id === id)
  if (c?.report?.symptomAnalysis) {
    const top = c.report.symptomAnalysis.findings[0]
    if (top) {
      const entry: LearningEntry = {
        id: `${id}_${Date.now().toString(36)}`,
        caseId: id,
        condition: top.condition,
        category: top.category,
        aiConfidence: top.confidence,
        decision: note.decision,
        createdAt: new Date().toISOString(),
      }
      recordCorrection(entry)
      state = { ...state, learningLog: [entry, ...state.learningLog] }
    }
  }
  updateCase(id, { doctorNote: note, status: 'reviewed' })
}

export function updateProfile(patch: Partial<PatientProfile>) {
  state = { ...state, profile: { ...state.profile, ...patch } }
  emit()
}

/** Snapshot the current vitals into longitudinal history (#9). */
export function recordVitalsSnapshot() {
  const snap: VitalsSnapshot = { takenAt: new Date().toISOString(), vitals: { ...state.profile.vitals } }
  state = { ...state, vitalsHistory: [...state.vitalsHistory, snap].slice(-30) }
  emit()
}

export function learningLog(): LearningEntry[] {
  return state.learningLog
}

export function resetDemoData() {
  state = {
    cases: SEED_CASES,
    profile: DEMO_PROFILE,
    vitalsHistory: seedVitalsHistory(),
    learningLog: [],
  }
  resetCorrections()
  emit()
}
