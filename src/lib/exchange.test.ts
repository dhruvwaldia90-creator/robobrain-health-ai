import { beforeAll, describe, expect, it, vi } from 'vitest'
import type {
  createDecisionExchangeRecord as CreateRecord,
  parseDecisionExchangeRecord as ParseRecord,
  serializeDecisionExchangeRecord as SerializeRecord,
  validateDecisionExchangeRecord as ValidateRecord,
} from './exchange'
import type { DEMO_PROFILE as DemoProfile, SEED_CASES as SeedCases } from './data'
import type {
  exchangeRecords as ExchangeRecords,
  reviewDecisionRecord as ReviewRecord,
  sendDecisionRecord as SendRecord,
} from './store'
import type { Case, DecisionExchangeRecord } from '@/types'

// The store touches localStorage at module load. Stub it before importing so
// the tests run in plain node (same pattern as agents.test.ts).
let createDecisionExchangeRecord: typeof CreateRecord
let parseDecisionExchangeRecord: typeof ParseRecord
let serializeDecisionExchangeRecord: typeof SerializeRecord
let validateDecisionExchangeRecord: typeof ValidateRecord
let DEMO_PROFILE: typeof DemoProfile
let SEED_CASES: typeof SeedCases
let exchangeRecords: typeof ExchangeRecords
let reviewDecisionRecord: typeof ReviewRecord
let sendDecisionRecord: typeof SendRecord

beforeAll(async () => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
  })
  ;({
    createDecisionExchangeRecord,
    parseDecisionExchangeRecord,
    serializeDecisionExchangeRecord,
    validateDecisionExchangeRecord,
  } = await import('./exchange'))
  ;({ DEMO_PROFILE, SEED_CASES } = await import('./data'))
  ;({ exchangeRecords, reviewDecisionRecord, sendDecisionRecord } = await import('./store'))
})

function validRecord(): DecisionExchangeRecord {
  const r = createDecisionExchangeRecord(SEED_CASES[0], DEMO_PROFILE)
  if (!r) throw new Error('seed case should produce a record')
  return r
}

describe('record generation (Test 1)', () => {
  it('normalizes an analyzed case into a valid standardized record', () => {
    const c = SEED_CASES[0]
    const r = createDecisionExchangeRecord(c, DEMO_PROFILE)
    expect(r).not.toBeNull()
    expect(r!.patientId).toBe(c.patientId)
    expect(r!.caseId).toBe(c.id)
    expect(r!.recordId).toContain(c.id)
    expect(['low', 'moderate', 'high', 'critical']).toContain(r!.assessment.riskLevel)
    expect(r!.assessment.confidence).toBeGreaterThanOrEqual(0)
    expect(r!.assessment.confidence).toBeLessThanOrEqual(100)
    expect(r!.input.vitals?.systolic).toBe(DEMO_PROFILE.vitals.systolic)
    expect(r!.input.symptoms!.length).toBeGreaterThan(0)
    expect(r!.recommendation.action.length).toBeGreaterThan(0)
    expect(['routine', 'soon', 'urgent', 'emergency']).toContain(r!.recommendation.urgency)
    expect(r!.provenance.source.length).toBeGreaterThan(0)
    expect(r!.review.status).toBe('pending')
    expect(validateDecisionExchangeRecord(r)).toEqual([])
  })
})

describe('validation (Test 2)', () => {
  it('rejects non-objects and missing identifiers', () => {
    expect(validateDecisionExchangeRecord(null)[0]).toMatch(/JSON object/)
    expect(validateDecisionExchangeRecord([1, 2])[0]).toMatch(/JSON object/)
    const r = validRecord() as unknown as Record<string, unknown>
    const noPatient = { ...r, patientId: '' }
    expect(validateDecisionExchangeRecord(noPatient).join(' ')).toMatch(/patientId/)
    const noId = { ...r, recordId: undefined }
    expect(validateDecisionExchangeRecord(noId).join(' ')).toMatch(/recordId/)
  })

  it('rejects bad risk level, confidence, urgency and timestamps', () => {
    const r = validRecord()
    expect(
      validateDecisionExchangeRecord({
        ...r,
        assessment: { ...r.assessment, riskLevel: 'extreme' },
      }).join(' '),
    ).toMatch(/riskLevel/)
    expect(
      validateDecisionExchangeRecord({
        ...r,
        assessment: { ...r.assessment, confidence: 150 },
      }).join(' '),
    ).toMatch(/confidence/)
    expect(
      validateDecisionExchangeRecord({
        ...r,
        recommendation: { ...r.recommendation, urgency: 'whenever' },
      }).join(' '),
    ).toMatch(/urgency/)
    expect(
      validateDecisionExchangeRecord({ ...r, createdAt: 'not-a-date' }).join(' '),
    ).toMatch(/createdAt/)
    expect(
      validateDecisionExchangeRecord({ ...r, schemaVersion: 99 }).join(' '),
    ).toMatch(/schemaVersion/)
  })
})

describe('serialization (Test 3)', () => {
  it('converts a valid record to JSON', () => {
    const r = validRecord()
    const json = serializeDecisionExchangeRecord(r)
    const parsed = JSON.parse(json)
    expect(parsed.recordId).toBe(r.recordId)
    expect(parsed.schemaVersion).toBe(1)
    expect(json).toContain('"assessment"')
  })
})

describe('deserialization (Test 4)', () => {
  it('round-trips exported JSON back into the app', () => {
    const r = validRecord()
    const { record, errors } = parseDecisionExchangeRecord(serializeDecisionExchangeRecord(r))
    expect(errors).toEqual([])
    expect(record).toEqual(r)
  })

  it('rejects malformed JSON with a useful error', () => {
    const { record, errors } = parseDecisionExchangeRecord('{not json')
    expect(record).toBeUndefined()
    expect(errors[0]).toMatch(/Invalid JSON/)
  })

  it('rejects schema-violating JSON', () => {
    const { record, errors } = parseDecisionExchangeRecord('{"foo": 1}')
    expect(record).toBeUndefined()
    expect(errors.length).toBeGreaterThan(0)
  })
})

describe('exchange workflow (Test 5)', () => {
  it('a sent record appears in the doctor workflow', () => {
    const r = validRecord()
    sendDecisionRecord(r)
    const found = exchangeRecords().find((x) => x.recordId === r.recordId)
    expect(found).toBeDefined()
    expect(found!.review.status).toBe('pending')
  })

  it('re-sending the same record upserts instead of duplicating', () => {
    const r = validRecord()
    sendDecisionRecord(r)
    sendDecisionRecord(r)
    expect(exchangeRecords().filter((x) => x.recordId === r.recordId)).toHaveLength(1)
  })
})

describe('doctor review (Test 6)', () => {
  it('accepting a recommendation updates the review status', () => {
    const r = validRecord()
    sendDecisionRecord(r)
    reviewDecisionRecord(r.recordId, {
      status: 'accepted',
      reviewer: 'Dr. Meera Iyer',
      note: 'Agree with the referral.',
    })
    const updated = exchangeRecords().find((x) => x.recordId === r.recordId)!
    expect(updated.review.status).toBe('accepted')
    expect(updated.review.reviewer).toBe('Dr. Meera Iyer')
    expect(updated.review.note).toBe('Agree with the referral.')
    expect(updated.review.reviewedAt).toBeDefined()
    expect(validateDecisionExchangeRecord(updated)).toEqual([])
  })

  it('overriding a recommendation is stored distinctly', () => {
    const r = validRecord()
    sendDecisionRecord(r)
    reviewDecisionRecord(r.recordId, {
      status: 'overridden',
      reviewer: 'Dr. Meera Iyer',
      note: 'Presentation is atypical; ordering labs first.',
    })
    const updated = exchangeRecords().find((x) => x.recordId === r.recordId)!
    expect(updated.review.status).toBe('overridden')
  })
})

describe('missing data (Test 7)', () => {
  it('returns null when the case has no decision-support output', () => {
    const bare: Case = { ...SEED_CASES[0], report: undefined }
    expect(createDecisionExchangeRecord(bare, DEMO_PROFILE)).toBeNull()
  })

  it('still produces a valid record when the profile is unavailable', () => {
    const r = createDecisionExchangeRecord(SEED_CASES[0])
    expect(r).not.toBeNull()
    expect(r!.input.vitals).toBeUndefined()
    expect(validateDecisionExchangeRecord(r)).toEqual([])
  })
})
