import { useState } from 'react'
import { drugAgent } from '@/lib/agents'
import { Icon } from '@/components/Icon'
import { Card, EmptyState, SectionTitle, SeverityBadge } from '@/components/ui'

const PRESETS = [
  ['Warfarin 5mg', 'Clopidogrel 75mg', 'Ibuprofen 400mg'],
  ['Metformin 1000mg', 'Atorvastatin 40mg', 'Lisinopril 20mg'],
  ['Amlodipine 5mg', 'Aspirin 75mg', 'Salbutamol inhaler'],
]

export function DrugIntelligence() {
  const [meds, setMeds] = useState<string[]>(PRESETS[0])
  const [input, setInput] = useState('')
  const result = drugAgent.run({ medications: meds })

  const add = () => {
    const v = input.trim()
    if (v && !meds.includes(v)) setMeds([...meds, v])
    setInput('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Drug Intelligence Agent</h1>
        <p className="text-ink-500">
          Build a regimen to check interactions, dosing notes and adherence guidance in real time.
        </p>
      </div>

      <Card>
        <SectionTitle icon="Pill" title="Regimen builder" />
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Add a medication, e.g. Warfarin 5mg"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          />
          <button className="btn-ghost" onClick={add}>
            <Icon name="Plus" size={16} /> Add
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {meds.map((m) => (
            <span key={m} className="chip bg-brand-50 text-brand-700">
              <Icon name="Pill" size={13} /> {m}
              <button onClick={() => setMeds(meds.filter((x) => x !== m))}>
                <Icon name="X" size={13} />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink-400">Try a preset:</span>
          {PRESETS.map((p, i) => (
            <button key={i} className="btn-outline px-3 py-1.5 text-xs" onClick={() => setMeds(p)}>
              Preset {i + 1}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle
            icon="GitMerge"
            title="Interactions"
            subtitle={`${result.interactions.length} detected`}
          />
          {result.interactions.length === 0 ? (
            <EmptyState icon="ShieldCheck" title="No interactions detected" />
          ) : (
            <div className="space-y-2.5">
              {result.interactions.map((it, i) => (
                <div key={i} className="rounded-xl border border-orange-100 bg-orange-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-orange-800">
                      {it.pair[0]} + {it.pair[1]}
                    </span>
                    <SeverityBadge severity={it.severity} />
                  </div>
                  <p className="mt-1 text-sm text-orange-800">{it.effect}</p>
                  <p className="mt-0.5 text-xs text-orange-700">Management: {it.management}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle icon="BookText" title="Medication insights" />
          {result.insights.length === 0 ? (
            <EmptyState icon="Pill" title="Add medications to analyze" />
          ) : (
            <div className="space-y-2.5">
              {result.insights.map((d) => (
                <div key={d.drug} className="rounded-xl border border-ink-100 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink-900">{d.drug}</span>
                    <span className="chip bg-ink-100 text-ink-600">{d.class}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-600">{d.notes}</p>
                  <p className="mt-0.5 text-xs text-ink-400">Indication: {d.indication}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <SectionTitle icon="ListChecks" title="Adherence guidance" />
        <ul className="space-y-2">
          {result.adherenceTips.map((t) => (
            <li key={t} className="flex items-start gap-2 text-sm text-ink-700">
              <Icon name="CircleCheck" size={16} className="mt-0.5 text-emerald-500" />
              {t}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
