import type {
  Case,
  DecisionExchangeRecord,
  ExchangeReviewStatus,
  ExchangeUrgency,
  PatientProfile,
  Severity,
} from '@/types'

export const EXCHANGE_SCHEMA_VERSION = 1
export const EXCHANGE_SOURCE = 'RoboBrain Health AI decision-support engine'

const RISK_LEVELS: Severity[] = ['low', 'moderate', 'high', 'critical']
const URGENCIES: ExchangeUrgency[] = ['routine', 'soon', 'urgent', 'emergency']
const REVIEW_STATUSES: ExchangeReviewStatus[] = ['pending', 'accepted', 'overridden']

export function urgencyForSeverity(s: Severity): ExchangeUrgency {
  switch (s) {
    case 'low':
      return 'routine'
    case 'moderate':
      return 'soon'
    case 'high':
      return 'urgent'
    case 'critical':
      return 'emergency'
  }
}

/**
 * Normalizer: converts an analyzed case (with its AI report) plus the patient
 * profile into the standardized, portable exchange format. Returns null when
 * the case has no decision-support output yet (nothing meaningful to share).
 */
export function createDecisionExchangeRecord(
  c: Case,
  profile?: PatientProfile,
): DecisionExchangeRecord | null {
  const report = c.report
  if (!report) return null

  const symptoms = c.symptomsText
    .split(/[,;]/)
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter(Boolean)

  const findings =
    report.symptomAnalysis?.findings.map(
      (f) => `${f.condition} (confidence ${f.confidence}%)`,
    ) ?? []

  const observations: string[] = []
  if (report.symptomAnalysis) observations.push(...report.symptomAnalysis.redFlags)
  if (report.safety && report.safety.action !== 'approve') {
    observations.push(`Safety agent: ${report.safety.reason}`)
  }

  const riskLevel = report.symptomAnalysis?.severity ?? c.severity
  const referral = report.referral
  const action = referral
    ? `Refer to ${referral.specialty}`
    : report.triage?.destination === 'emergency'
      ? 'Escalate to emergency care'
      : report.triage?.destination === 'pharmacist'
        ? 'Pharmacist review of medications'
        : riskLevel === 'low'
          ? 'Routine self-care and monitoring'
          : 'Clinical review by a doctor'

  return {
    schemaVersion: EXCHANGE_SCHEMA_VERSION,
    recordId: `dxr_${c.id}_${Date.now().toString(36)}`,
    patientId: c.patientId,
    caseId: c.id,
    createdAt: new Date().toISOString(),
    input: {
      vitals: profile ? { ...profile.vitals } : undefined,
      symptoms: symptoms.length ? symptoms : undefined,
      observations: observations.length ? observations : undefined,
    },
    assessment: {
      riskLevel,
      findings,
      confidence: report.confidence,
    },
    recommendation: {
      action,
      rationale: referral?.reason ?? report.headline,
      urgency: urgencyForSeverity(referral?.urgency ?? riskLevel),
    },
    provenance: {
      source: EXCHANGE_SOURCE,
      generatedAt: report.generatedAt,
    },
    review: { status: 'pending' },
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isValidDateString(v: unknown): v is string {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v))
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

/** Validates an unknown value against the exchange schema. Returns human-readable errors; [] means valid. */
export function validateDecisionExchangeRecord(value: unknown): string[] {
  const errors: string[] = []
  if (!isPlainObject(value)) return ['Record must be a JSON object']
  const r = value

  if (r.schemaVersion !== EXCHANGE_SCHEMA_VERSION) {
    errors.push(`Unsupported schemaVersion ${String(r.schemaVersion)} (expected ${EXCHANGE_SCHEMA_VERSION})`)
  }
  if (typeof r.recordId !== 'string' || !r.recordId) errors.push('recordId is required')
  if (typeof r.patientId !== 'string' || !r.patientId) errors.push('patientId is required')
  if (r.caseId !== undefined && typeof r.caseId !== 'string') errors.push('caseId must be a string')
  if (!isValidDateString(r.createdAt)) errors.push('createdAt must be a valid ISO timestamp')

  if (r.input !== undefined) {
    if (!isPlainObject(r.input)) {
      errors.push('input must be an object')
    } else {
      const input = r.input
      if (input.vitals !== undefined) {
        if (!isPlainObject(input.vitals)) {
          errors.push('input.vitals must be an object')
        } else if (Object.values(input.vitals).some((v) => typeof v !== 'number' && typeof v !== 'boolean')) {
          errors.push('input.vitals values must be numbers (or the smoker boolean)')
        }
      }
      if (input.symptoms !== undefined && !isStringArray(input.symptoms)) {
        errors.push('input.symptoms must be an array of strings')
      }
      if (input.observations !== undefined && !isStringArray(input.observations)) {
        errors.push('input.observations must be an array of strings')
      }
    }
  }

  if (!isPlainObject(r.assessment)) {
    errors.push('assessment is required and must be an object')
  } else {
    const a = r.assessment
    if (!RISK_LEVELS.includes(a.riskLevel as Severity)) {
      errors.push(`assessment.riskLevel must be one of: ${RISK_LEVELS.join(', ')}`)
    }
    if (!isStringArray(a.findings)) errors.push('assessment.findings must be an array of strings')
    if (typeof a.confidence !== 'number' || a.confidence < 0 || a.confidence > 100) {
      errors.push('assessment.confidence must be a number between 0 and 100')
    }
  }

  if (!isPlainObject(r.recommendation)) {
    errors.push('recommendation is required and must be an object')
  } else {
    const rec = r.recommendation
    if (typeof rec.action !== 'string' || !rec.action) errors.push('recommendation.action is required')
    if (typeof rec.rationale !== 'string' || !rec.rationale) errors.push('recommendation.rationale is required')
    if (!URGENCIES.includes(rec.urgency as ExchangeUrgency)) {
      errors.push(`recommendation.urgency must be one of: ${URGENCIES.join(', ')}`)
    }
  }

  if (!isPlainObject(r.provenance)) {
    errors.push('provenance is required and must be an object')
  } else {
    const p = r.provenance
    if (typeof p.source !== 'string' || !p.source) errors.push('provenance.source is required')
    if (!isValidDateString(p.generatedAt)) errors.push('provenance.generatedAt must be a valid ISO timestamp')
  }

  if (!isPlainObject(r.review)) {
    errors.push('review is required and must be an object')
  } else {
    const rev = r.review
    if (!REVIEW_STATUSES.includes(rev.status as ExchangeReviewStatus)) {
      errors.push(`review.status must be one of: ${REVIEW_STATUSES.join(', ')}`)
    }
    if (rev.reviewer !== undefined && typeof rev.reviewer !== 'string') errors.push('review.reviewer must be a string')
    if (rev.reviewedAt !== undefined && !isValidDateString(rev.reviewedAt)) {
      errors.push('review.reviewedAt must be a valid ISO timestamp')
    }
    if (rev.note !== undefined && typeof rev.note !== 'string') errors.push('review.note must be a string')
  }

  return errors
}

export function serializeDecisionExchangeRecord(record: DecisionExchangeRecord): string {
  return JSON.stringify(record, null, 2)
}

/** Parses exported JSON back into a record. Invalid JSON or schema violations return errors instead of throwing. */
export function parseDecisionExchangeRecord(json: string): {
  record?: DecisionExchangeRecord
  errors: string[]
} {
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch (e) {
    return { errors: [`Invalid JSON: ${(e as Error).message}`] }
  }
  const errors = validateDecisionExchangeRecord(value)
  if (errors.length) return { errors }
  return { record: value as unknown as DecisionExchangeRecord, errors: [] }
}
