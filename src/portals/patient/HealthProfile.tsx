import { riskAgent } from '@/lib/agents'
import { categoryById } from '@/lib/data'
import { severityColor } from '@/lib/format'
import { updateProfile, useAppState } from '@/lib/store'
import { RiskRadar } from '@/components/charts'
import { Card, ConfidenceBar, SectionTitle } from '@/components/ui'

export function HealthProfile() {
  const { profile } = useAppState()
  const risk = riskAgent.run({ profile })
  const bmi = (profile.weightKg / Math.pow(profile.heightCm / 100, 2)).toFixed(1)

  const vital = (key: keyof typeof profile.vitals, value: number) =>
    updateProfile({ vitals: { ...profile.vitals, [key]: value } })

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
