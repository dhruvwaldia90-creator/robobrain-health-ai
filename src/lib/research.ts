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
