import type { LearningEntry } from '@/types'

/**
 * Doctor-feedback learning loop (#2).
 *
 * Every time a clinician signs off on an AI report we record whether they
 * agreed, modified or escalated. Conditions that doctors repeatedly modify or
 * escalate get a persistent negative weight ("correction") that the Critic
 * Agent applies to future confidences — so the mesh learns to be more cautious
 * where it has historically been wrong.
 *
 * Stored in localStorage; fully optional and degrades to no correction.
 */

const KEY = 'robobrain.learning.v1'

type CorrectionMap = Record<string, { delta: number; samples: number }>

let corrections: CorrectionMap = load()

function load(): CorrectionMap {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as CorrectionMap) : {}
  } catch {
    return {}
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(corrections))
  } catch {
    /* ignore */
  }
}

const DECISION_WEIGHT: Record<LearningEntry['decision'], number> = {
  agree: 0,
  modify: -4,
  escalate: -8,
}

export function recordCorrection(entry: LearningEntry) {
  const key = entry.condition.toLowerCase()
  const prev = corrections[key] ?? { delta: 0, samples: 0 }
  const next = {
    delta: clamp(prev.delta + DECISION_WEIGHT[entry.decision], -24, 0),
    samples: prev.samples + 1,
  }
  corrections = { ...corrections, [key]: next }
  persist()
}

/** Confidence delta to apply for a condition (negative = less confident). */
export function correctionFor(condition: string): number {
  return corrections[condition.toLowerCase()]?.delta ?? 0
}

export function correctionStats(): { conditions: number; avgDelta: number; totalSamples: number } {
  const values = Object.values(corrections)
  return {
    conditions: values.length,
    avgDelta: values.length
      ? Math.round((values.reduce((a, c) => a + c.delta, 0) / values.length) * 10) / 10
      : 0,
    totalSamples: values.reduce((a, c) => a + c.samples, 0),
  }
}

export function allCorrections(): { condition: string; delta: number; samples: number }[] {
  return Object.entries(corrections)
    .map(([condition, c]) => ({ condition, delta: c.delta, samples: c.samples }))
    .sort((a, b) => a.delta - b.delta)
}

/** Clear learned corrections (used by resetDemoData). */
export function resetCorrections() {
  corrections = {}
  persist()
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

/** Seed a couple of plausible corrections so the feature is visible out of the box. */
export function seedCorrections() {
  if (Object.keys(corrections).length === 0) {
    corrections = {
      'migraine': { delta: -4, samples: 2 },
      'suspected malignancy': { delta: -6, samples: 1 },
    }
    persist()
  }
}
