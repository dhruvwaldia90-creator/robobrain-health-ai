import { useState } from 'react'
import type { PatientProfile } from '@/types'
import { riskAgent } from '@/lib/agents'
import { categoryById } from '@/lib/data'
import { severityColor } from '@/lib/format'
import { updateProfile, useAppState } from '@/lib/store'
import { RiskRadar } from '@/components/charts'
import { Card, ConfidenceBar, SectionTitle } from '@/components/ui'
import { Icon } from '@/components/Icon'

interface WhatIf {
  id: string
  label: string
  icon: string
  apply: (p: PatientProfile) => PatientProfile
}

export function HealthProfile() {
  const { profile } = useAppState()
  const risk = riskAgent.run({ profile })
  const bmi = (profile.weightKg / Math.pow(profile.heightCm / 100, 2)).toFixed(1)

  const vital = (key: keyof typeof profile.vitals, value: number) =>
    updateProfile({ vitals: { ...profile.vitals, [key]: value } })

  // --- Digital twin / what-if simulation (#11) ---
  const [sim, setSim] = useState<Record<string, boolean>>({})
  const whatIfs: WhatIf[] = [
    {
      id: 'quitSmoking',
      label: 'Quit smoking',
      icon: 'Cigarette',
      apply: (p) => ({ ...p, vitals: { ...p.vitals, smoker: false } }),
    },
    {
      id: 'lowerBp',
      label: 'BP controlled (120/80)',
      icon: 'HeartPulse',
      apply: (p) => ({ ...p, vitals: { ...p.vitals, systolic: 120, diastolic: 80 } }),
    },
    {
      id: 'lowerChol',
      label: 'Cholesterol lowered (160)',
      icon: 'Activity',
      apply: (p) => ({ ...p, vitals: { ...p.vitals, cholesterolMgDl: 160 } }),
    },
    {
      id: 'lowerGlucose',
      label: 'Glucose controlled (110)',
      icon: 'Droplets',
      apply: (p) => ({ ...p, vitals: { ...p.vitals, glucoseMgDl: 110 } }),
    },
    {
      id: 'loseWeight',
      label: 'Weight -8kg',
      icon: 'Scale',
      apply: (p) => ({ ...p, weightKg: Math.max(50, p.weightKg - 8) }),
    },
  ]
  const simProfile = whatIfs.reduce((p, w) => (sim[w.id] ? w.apply(p) : p), profile)
  const simRisk = riskAgent.run({ profile: simProfile })
  const delta = risk.overall - simRisk.overall

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-ink-900">Health profile</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle icon="IdCard" title="Personal details" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" value={profile.name} onChange={(v) => updateProfile({ name: v })} />
            <Field
              label="Age"
              value={String(profile.age)}
              type="number"
              onChange={(v) => updateProfile({ age: Number(v) || 0 })}
            />
            <Field
              label="Height (cm)"
              value={String(profile.heightCm)}
              type="number"
              onChange={(v) => updateProfile({ heightCm: Number(v) || 0 })}
            />
            <Field
              label="Weight (kg)"
              value={String(profile.weightKg)}
              type="number"
              onChange={(v) => updateProfile({ weightKg: Number(v) || 0 })}
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="BMI" value={bmi} />
            <Stat label="Blood group" value={profile.bloodGroup} />
            <Stat label="Conditions" value={String(profile.conditions.length)} />
            <Stat label="Allergies" value={String(profile.allergies.length)} />
          </div>

          <div className="mt-6">
            <h4 className="mb-2 text-sm font-bold text-ink-700">Vitals</h4>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Slider label="Systolic BP" value={profile.vitals.systolic} min={90} max={200} unit="mmHg" onChange={(v) => vital('systolic', v)} />
              <Slider label="Diastolic BP" value={profile.vitals.diastolic} min={50} max={130} unit="mmHg" onChange={(v) => vital('diastolic', v)} />
              <Slider label="Heart rate" value={profile.vitals.heartRate} min={40} max={160} unit="bpm" onChange={(v) => vital('heartRate', v)} />
              <Slider label="Glucose" value={profile.vitals.glucoseMgDl} min={70} max={300} unit="mg/dL" onChange={(v) => vital('glucoseMgDl', v)} />
              <Slider label="Cholesterol" value={profile.vitals.cholesterolMgDl} min={120} max={350} unit="mg/dL" onChange={(v) => vital('cholesterolMgDl', v)} />
              <Slider label="SpO₂" value={profile.vitals.spo2} min={80} max={100} unit="%" onChange={(v) => vital('spo2', v)} />
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm font-medium text-ink-700">
              <input
                type="checkbox"
                checked={profile.vitals.smoker}
                onChange={(e) =>
                  updateProfile({ vitals: { ...profile.vitals, smoker: e.target.checked } })
                }
                className="h-4 w-4 rounded border-ink-300"
              />
              Current smoker
            </label>
          </div>
        </Card>

        <Card>
          <SectionTitle icon="ShieldAlert" title="Live risk profile" subtitle={`Overall ${risk.overall}/100`} />
          <RiskRadar
            data={risk.scores.map((s) => ({ label: categoryById(s.category).short, score: s.score }))}
          />
          <div className="mt-3 space-y-2.5">
            {risk.scores.slice(0, 5).map((s) => (
              <div key={s.category}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-ink-600">{categoryById(s.category).name}</span>
                  <span className="font-bold" style={{ color: severityColor[s.band].hex }}>
                    {s.score}
                  </span>
                </div>
                <ConfidenceBar value={s.score} />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-400">
            Adjust vitals to see risk recompute in real time.
          </p>
        </Card>
      </div>

      {/* Digital twin / what-if simulation (#11) */}
      <Card>
        <SectionTitle
          icon="FlaskConical"
          title="Digital twin — what-if simulation"
          subtitle="Toggle interventions to project how your overall risk would change"
        />
        <div className="flex flex-wrap gap-2">
          {whatIfs.map((w) => (
            <button
              key={w.id}
              onClick={() => setSim((s) => ({ ...s, [w.id]: !s[w.id] }))}
              className={
                'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition ' +
                (sim[w.id]
                  ? 'border-brand-400 bg-brand-50 text-brand-700 ring-2 ring-brand-100'
                  : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50')
              }
            >
              <Icon name={sim[w.id] ? 'CircleCheck' : w.icon} size={15} />
              {w.label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-ink-50 p-4 text-center">
            <div className="text-xs font-semibold text-ink-500">Current risk</div>
            <div className="mt-1 text-3xl font-extrabold text-ink-900">{risk.overall}</div>
          </div>
          <div className="rounded-xl bg-brand-50 p-4 text-center">
            <div className="text-xs font-semibold text-brand-600">Projected risk</div>
            <div className="mt-1 text-3xl font-extrabold text-brand-700">{simRisk.overall}</div>
          </div>
          <div
            className={
              'rounded-xl p-4 text-center ' +
              (delta > 0 ? 'bg-emerald-50' : delta < 0 ? 'bg-red-50' : 'bg-ink-50')
            }
          >
            <div className="text-xs font-semibold text-ink-500">Projected change</div>
            <div
              className={
                'mt-1 text-3xl font-extrabold ' +
                (delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-red-700' : 'text-ink-900')
              }
            >
              {delta > 0 ? '−' : delta < 0 ? '+' : ''}{Math.abs(delta)}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-ink-50 p-3 text-sm text-ink-600">
          <Icon name="Info" size={15} className="mt-0.5 text-brand-500" />
          {Object.values(sim).some(Boolean)
            ? `Simulating ${whatIfs.filter((w) => sim[w.id]).map((w) => w.label.toLowerCase()).join(', ')} — projected overall risk ${simRisk.overall}/100. This is a simulation on your digital twin; it does not change your real profile.`
            : 'Toggle one or more interventions above to project their combined effect on your risk index.'}
        </div>
      </Card>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-50 p-3 text-center">
      <div className="text-lg font-extrabold text-ink-900">{value}</div>
      <div className="text-xs text-ink-500">{label}</div>
    </div>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  unit: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-ink-700">{label}</span>
        <span className="font-bold text-ink-900">
          {value} <span className="text-xs font-normal text-ink-400">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-600"
      />
    </div>
  )
}
