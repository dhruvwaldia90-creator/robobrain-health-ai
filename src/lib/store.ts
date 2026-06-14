import { useSyncExternalStore } from 'react'
import type { Case, DoctorNote, PatientProfile } from '@/types'
import { DEMO_PROFILE, SEED_CASES } from './data'

const CASES_KEY = 'robobrain.cases.v1'
const PROFILE_KEY = 'robobrain.profile.v1'

interface AppState {
  cases: Case[]
  profile: PatientProfile
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

let state: AppState = {
  cases: load<Case[]>(CASES_KEY, SEED_CASES),
  profile: load<PatientProfile>(PROFILE_KEY, DEMO_PROFILE),
}

const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(CASES_KEY, JSON.stringify(state.cases))
    localStorage.setItem(PROFILE_KEY, JSON.stringify(state.profile))
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

export function addDoctorNote(id: string, note: DoctorNote) {
  updateCase(id, { doctorNote: note, status: 'reviewed' })
}

export function updateProfile(patch: Partial<PatientProfile>) {
  state = { ...state, profile: { ...state.profile, ...patch } }
  emit()
}

export function resetDemoData() {
  state = { cases: SEED_CASES, profile: DEMO_PROFILE }
  emit()
}
