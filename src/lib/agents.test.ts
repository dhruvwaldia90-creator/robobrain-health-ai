import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { generateReport as GenerateReport, symptomAgent as SymptomAgent } from './agents'
import type { DEMO_PROFILE as DemoProfile } from './data'

// The agent layer touches localStorage at module load (learning seeds, llm
// config). Stub it before importing so the tests run in plain node.
let generateReport: typeof GenerateReport
let symptomAgent: typeof SymptomAgent
let DEMO_PROFILE: typeof DemoProfile

beforeAll(async () => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
  })
  ;({ generateReport, symptomAgent } = await import('./agents'))
  ;({ DEMO_PROFILE } = await import('./data'))
})

describe('symptomAgent ML fusion', () => {
  it('merges ML classifier findings into the differential', () => {
    const r = symptomAgent.run({ text: 'itching, skin rash and nodal skin eruptions' })
    const ml = r.findings.find((f) => f.rationale.includes('ML classifier'))
    expect(ml?.condition).toBe('Fungal infection')
  })

  it('does not duplicate a condition the rule engine already covers', () => {
    const r = symptomAgent.run({ text: 'chest pain, shortness of breath, sweating and fast heart rate' })
    const names = r.findings.map((f) => f.condition.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
    expect(r.findings[0].confidence).toBeGreaterThanOrEqual(80)
  })

  it('ignores negated symptoms in the ML features', () => {
    const r = symptomAgent.run({ text: 'no fever and no cough, just routine checkup' })
    expect(r.findings.some((f) => f.rationale.includes('ML classifier'))).toBe(false)
  })
})

describe('generateReport (local pipeline)', () => {
  it('produces a complete, safety-gated report', () => {
    const report = generateReport({
      symptomsText: 'high fever with chills, severe headache, vomiting and muscle pain for 3 days',
      medications: ['warfarin', 'aspirin'],
      profile: DEMO_PROFILE,
    })
    expect(report.symptomAnalysis?.findings.length).toBeGreaterThan(0)
    expect(report.drugIntelligence?.interactions.length).toBeGreaterThan(0)
    expect(['approve', 'warn', 'block']).toContain(report.safety?.action)
    expect(report.triage?.destination.length).toBeGreaterThan(0)
    expect(report.confidence).toBeGreaterThanOrEqual(30)
    expect(report.confidence).toBeLessThanOrEqual(96)
    expect(report.narrative.length).toBeGreaterThan(50)
    // every pipeline stage is represented in the execution trace
    expect(report.trace.length).toBeGreaterThanOrEqual(10)
  })

  it('abstains gracefully on out-of-domain input', () => {
    const report = generateReport({
      symptomsText: 'my elbow hurts when I play tennis',
      medications: [],
      profile: DEMO_PROFILE,
    })
    expect(report.uncertainty?.abstain).toBe(true)
    expect(report.symptomAnalysis?.findings).toHaveLength(0)
  })
})
