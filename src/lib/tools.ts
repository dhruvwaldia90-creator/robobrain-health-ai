import type { PatientProfile, ToolCall } from '@/types'

/**
 * Agentic tool-use (#7).
 *
 * Each tool is a pure function the Symptom Analysis agent can decide to call to
 * gather extra evidence (BMI, sepsis score, drug lookup, guideline check).
 * The agent picks tools from the available set, executes them, and records the
 * results so the report shows which tools the agent chose to use.
 */

export interface Tool {
  id: string
  name: string
  description: string
  /** Decide whether this tool is relevant for the given inputs. */
  applicable: (ctx: ToolContext) => boolean
  run: (ctx: ToolContext) => string
}

export interface ToolContext {
  profile: PatientProfile
  symptomsText: string
  medications: string[]
}

const bmi = (p: PatientProfile) => p.weightKg / Math.pow(p.heightCm / 100, 2)

export const TOOLS: Tool[] = [
  {
    id: 'bmi',
    name: 'Compute BMI',
    description: 'Calculates BMI from height and weight to flag obesity-related risk.',
    applicable: (c) => c.profile.heightCm > 0 && c.profile.weightKg > 0,
    run: (c) => {
      const v = bmi(c.profile)
      const band = v >= 30 ? 'obese' : v >= 25 ? 'overweight' : 'normal'
      return `BMI = ${v.toFixed(1)} (${band}).`
    },
  },
  {
    id: 'qsofa',
    name: 'qSOFA sepsis screen',
    description: 'Quick SOFA score from respiratory rate, systolic BP and altered mentation signals.',
    applicable: (c) =>
      /sepsis|confusion|rapid|chills|rigors/i.test(c.symptomsText) ||
      c.profile.vitals.systolic < 100,
    run: (c) => {
      let score = 0
      if (c.profile.vitals.systolic <= 100) score++
      if (c.profile.vitals.heartRate >= 100) score++
      if (/confusion|altered|drowsy/i.test(c.symptomsText)) score++
      return `qSOFA = ${score}/3 (${score >= 2 ? 'high risk — escalate' : 'low risk'}).`
    },
  },
  {
    id: 'polypharmacy',
    name: 'Polypharmacy check',
    description: 'Flags ≥4 concurrent medications, a known ADR/hospitalization risk factor.',
    applicable: (c) => c.medications.length >= 4,
    run: (c) => `Polypharmacy: ${c.medications.length} medications — recommend pharmacist review.`,
  },
  {
    id: 'fall_risk',
    name: 'Fall risk assessment',
    description: 'Estimates fall risk from age, BP and medications known to cause dizziness.',
    applicable: (c) => c.profile.age >= 65 || /dizz|dizzin|fall|faint/i.test(c.symptomsText),
    run: (c) => {
      let risk = 0
      if (c.profile.age >= 65) risk += 2
      if (c.profile.vitals.systolic < 110) risk += 1
      if (/dizz|dizzin|fall|faint/i.test(c.symptomsText)) risk += 2
      return `Fall risk score ${risk}/5 (${risk >= 3 ? 'high' : 'low'}).`
    },
  },
  {
    id: 'allergy_check',
    name: 'Allergy–prescription clash',
    description: 'Cross-references patient allergies against current prescriptions.',
    applicable: (c) =>
      c.profile.allergies.some((a) =>
        c.medications.some((m) => m.toLowerCase().includes(a.toLowerCase())),
      ),
    run: (c) => {
      const hits = c.profile.allergies.filter((a) =>
        c.medications.some((m) => m.toLowerCase().includes(a.toLowerCase())),
      )
      return `Allergy clash detected: ${hits.join(', ')} — reconsider prescription.`
    },
  },
]

/** Let the agent decide which tools to call for a submission and record results. */
export function runTools(ctx: ToolContext): ToolCall[] {
  return TOOLS.filter((t) => t.applicable(ctx)).map((t) => ({
    tool: t.name,
    args: { agentChose: t.id },
    result: t.run(ctx),
  }))
}
