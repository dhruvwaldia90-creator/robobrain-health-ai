import type { DiseaseCategoryId } from '@/types'
import { DISEASE_CATEGORIES } from './data'

/**
 * Deterministic synthetic population dataset used by the Researcher portal and
 * the Research Intelligence Agent. Numbers are illustrative, not clinical.
 */

export const COHORT_SIZE = 48213

const BASE_PREVALENCE: Record<DiseaseCategoryId, number> = {
  cardiovascular: 18.4,
  metabolic: 16.1,
  respiratory: 11.7,
  infectious: 9.8,
  neurological: 7.3,
  oncology: 5.6,
  genetic: 2.1,
}

export interface CategoryStat {
  id: DiseaseCategoryId
  name: string
  short: string
  color: string
  prevalence: number
  patients: number
  trend: number // % change vs last quarter
}

export const categoryStats: CategoryStat[] = DISEASE_CATEGORIES.map((c, i) => {
  const prevalence = BASE_PREVALENCE[c.id]
  return {
    id: c.id,
    name: c.name,
    short: c.short,
    color: c.color,
    prevalence,
    patients: Math.round((prevalence / 100) * COHORT_SIZE),
    trend: [4.2, -1.3, 2.7, 6.1, -0.8, 3.4, 1.1][i] ?? 0,
  }
})

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

export const incidenceTrend = MONTHS.map((label, i) => ({
  label,
  cardiovascular: Math.round(820 + i * 34 + (i % 2 ? 18 : -12)),
  metabolic: Math.round(710 + i * 41),
  respiratory: Math.round(540 + (i === 2 ? 160 : i * 12)),
  infectious: Math.round(480 + (i < 2 ? 220 : -i * 20)),
  oncology: Math.round(240 + i * 9),
}))

export interface Cohort {
  id: string
  name: string
  size: number
  category: DiseaseCategoryId
  meanAge: number
  femalePct: number
  topBiomarker: string
  responseRate: number
}

export const cohorts: Cohort[] = [
  { id: 'co1', name: 'Statin response — high LDL', size: 3120, category: 'cardiovascular', meanAge: 58, femalePct: 44, topBiomarker: 'LDL-C', responseRate: 72 },
  { id: 'co2', name: 'T2DM — GLP-1 candidates', size: 4870, category: 'metabolic', meanAge: 53, femalePct: 51, topBiomarker: 'HbA1c', responseRate: 68 },
  { id: 'co3', name: 'COPD exacerbation risk', size: 1980, category: 'respiratory', meanAge: 64, femalePct: 39, topBiomarker: 'FEV1', responseRate: 57 },
  { id: 'co4', name: 'Post-sepsis recovery', size: 1240, category: 'infectious', meanAge: 61, femalePct: 48, topBiomarker: 'CRP', responseRate: 63 },
  { id: 'co5', name: 'Early-stage NSCLC', size: 760, category: 'oncology', meanAge: 67, femalePct: 46, topBiomarker: 'EGFR', responseRate: 41 },
  { id: 'co6', name: 'Migraine prophylaxis', size: 2210, category: 'neurological', meanAge: 41, femalePct: 73, topBiomarker: 'CGRP', responseRate: 66 },
]

export const ageDistribution = [
  { label: '0-17', value: 8 },
  { label: '18-34', value: 19 },
  { label: '35-49', value: 24 },
  { label: '50-64', value: 28 },
  { label: '65+', value: 21 },
]

export const biomarkerSignals = [
  { name: 'HbA1c ≥ 7.0%', category: 'metabolic' as DiseaseCategoryId, strength: 88, n: 4870 },
  { name: 'LDL-C ≥ 160 mg/dL', category: 'cardiovascular' as DiseaseCategoryId, strength: 81, n: 3120 },
  { name: 'EGFR mutation', category: 'oncology' as DiseaseCategoryId, strength: 76, n: 760 },
  { name: 'CRP ≥ 10 mg/L', category: 'infectious' as DiseaseCategoryId, strength: 64, n: 1240 },
  { name: 'FEV1 < 50% pred.', category: 'respiratory' as DiseaseCategoryId, strength: 59, n: 1980 },
]

/**
 * Autonomous outbreak / anomaly detection (#10).
 *
 * Compares recent case incidence per disease category against the synthetic
 * baseline. A category whose recent incidence exceeds the baseline by a
 * threshold is surfaced as an outbreak/spike signal; a sharp drop is flagged
 * as a decline. Fully deterministic — no network needed.
 */
export interface AnomalyInput {
  cases: { primaryCategory: DiseaseCategoryId; createdAt: string }[]
  now?: number
  windowDays?: number
}

const ANOMALY_BASELINE: Record<DiseaseCategoryId, number> = {
  cardiovascular: 9,
  metabolic: 8,
  respiratory: 7,
  infectious: 6,
  neurological: 5,
  oncology: 3,
  genetic: 1,
}

export function detectAnomalies(input: AnomalyInput): {
  id: string
  category: DiseaseCategoryId
  type: 'outbreak' | 'spike' | 'decline'
  severity: 'low' | 'moderate' | 'high' | 'critical'
  message: string
  detectedAt: string
  expected: number
  observed: number
  windowCases: number
}[] {
  const now = input.now ?? Date.now()
  const windowDays = input.windowDays ?? 7
  const since = now - windowDays * 86_400_000
  const counts: Record<string, number> = {}
  for (const c of input.cases) {
    if (+new Date(c.createdAt) >= since) {
      counts[c.primaryCategory] = (counts[c.primaryCategory] ?? 0) + 1
    }
  }
  const totalWindow = Object.values(counts).reduce((a, b) => a + b, 0)

  const signals = [] as ReturnType<typeof detectAnomalies>
  for (const [cat, expected] of Object.entries(ANOMALY_BASELINE)) {
    const observed = counts[cat] ?? 0
    const ratio = expected > 0 ? observed / expected : 0
    if (ratio >= 3 && observed >= 3) {
      signals.push({
        id: `anom_${cat}_${now}`,
        category: cat as DiseaseCategoryId,
        type: 'outbreak',
        severity: observed >= expected * 4 ? 'critical' : 'high',
        message: `${categoryShort(cat as DiseaseCategoryId)} incidence ${observed} in ${windowDays}d vs baseline ${expected}/wk — possible outbreak signal.`,
        detectedAt: new Date(now).toISOString(),
        expected,
        observed,
        windowCases: totalWindow,
      })
    } else if (ratio >= 2 && observed >= 2) {
      signals.push({
        id: `anom_${cat}_${now}`,
        category: cat as DiseaseCategoryId,
        type: 'spike',
        severity: 'moderate',
        message: `${categoryShort(cat as DiseaseCategoryId)} incidence rising (${observed} vs baseline ${expected}).`,
        detectedAt: new Date(now).toISOString(),
        expected,
        observed,
        windowCases: totalWindow,
      })
    } else if (expected >= 4 && observed === 0) {
      signals.push({
        id: `anom_${cat}_${now}`,
        category: cat as DiseaseCategoryId,
        type: 'decline',
        severity: 'low',
        message: `${categoryShort(cat as DiseaseCategoryId)} incidence unusually low (0 vs baseline ${expected}).`,
        detectedAt: new Date(now).toISOString(),
        expected,
        observed,
        windowCases: totalWindow,
      })
    }
  }
  return signals.sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
}

function categoryShort(id: DiseaseCategoryId): string {
  return DISEASE_CATEGORIES.find((c) => c.id === id)?.short ?? id
}

function severityRank(s: string): number {
  return { low: 0, moderate: 1, high: 2, critical: 3 }[s] ?? 0
}
