import { useMemo, useState } from 'react'
import type { DoctorNote } from '@/types'
import { categoryById } from '@/lib/data'
import { timeAgo } from '@/lib/format'
import { addDoctorNote, useAppState } from '@/lib/store'
import { useAuth } from '@/context/AuthContext'
import { Icon } from '@/components/Icon'
import { ReportView } from '@/components/ReportView'
import {
  Avatar,
  Card,
  EmptyState,
  SectionTitle,
  SeverityBadge,
  StatusBadge,
} from '@/components/ui'

type Decision = DoctorNote['decision']

const DECISIONS: { id: Decision; label: string; icon: string; color: string }[] = [
  { id: 'agree', label: 'Agree with AI', icon: 'ThumbsUp', color: '#10b981' },
  { id: 'modify', label: 'Modify plan', icon: 'PencilLine', color: '#f59e0b' },
  { id: 'escalate', label: 'Escalate', icon: 'Siren', color: '#ef4444' },
]

export function ReviewQueue() {
  const { user } = useAuth()
  const { cases } = useAppState()
  const queue = useMemo(
    () =>
      [...cases]
        .filter((c) => c.report)
        .sort(
          (a, b) =>
            rank(b.severity) - rank(a.severity) ||
            +new Date(b.createdAt) - +new Date(a.createdAt),
        ),
    [cases],
  )
  const [selectedId, setSelectedId] = useState<string | null>(
    queue.find((c) => c.status !== 'reviewed')?.id ?? queue[0]?.id ?? null,
  )
  const selected = queue.find((c) => c.id === selectedId)
  const [decision, setDecision] = useState<Decision>('agree')
  const [note, setNote] = useState('')

  const submit = () => {
    if (!selected || !user) return
    addDoctorNote(selected.id, {
      doctorId: user.id,
      doctorName: user.name,
      decision,
      note: note.trim() || DECISIONS.find((d) => d.id === decision)!.label,
      createdAt: new Date().toISOString(),
    })
    setNote('')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-ink-900">Review queue</h1>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-2.5">
          {queue.map((c) => {
            const cat = categoryById(c.primaryCategory)
            const active = c.id === selectedId
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={
                  'w-full rounded-2xl border p-4 text-left transition ' +
                  (active
                    ? 'border-brand-400 bg-brand-50/60 ring-2 ring-brand-100'
                    : 'border-ink-100 bg-white hover:bg-ink-50')
                }
              >
                <div className="flex items-center gap-2.5">
                  <Avatar name={c.patientName} color={cat.color} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-ink-900">{c.patientName}</div>
                    <div className="truncate text-xs text-ink-500">{c.title}</div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={c.severity} />
                  <StatusBadge status={c.status} />
                  <span className="text-xs text-ink-400">{timeAgo(c.createdAt)}</span>
                </div>
              </button>
            )
          })}
        </div>

        <div>
          {selected?.report ? (
            <div className="space-y-5">
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={selected.patientName}
                      color={categoryById(selected.primaryCategory).color}
                      size={44}
                    />
                    <div>
                      <div className="text-lg font-bold text-ink-900">{selected.patientName}</div>
                      <div className="text-sm text-ink-500">
                        {selected.age} yo · {selected.sex} · {selected.title}
                      </div>
                    </div>
                  </div>
                  <SeverityBadge severity={selected.severity} />
                </div>
                <div className="mt-3 rounded-xl bg-ink-50 p-3 text-sm text-ink-600">
                  <span className="font-semibold text-ink-700">Patient note: </span>
                  {selected.symptomsText}
                </div>
              </Card>

              <ReportView report={selected.report} />

              {selected.doctorNote ? (
                <Card className="border-emerald-200 bg-emerald-50/60">
                  <SectionTitle icon="UserCheck" title="Your review" />
                  <p className="text-sm text-emerald-800">
                    <span className="font-bold capitalize">{selected.doctorNote.decision}</span> —{' '}
                    {selected.doctorNote.note}
                  </p>
                </Card>
              ) : (
                <Card>
                  <SectionTitle
                    icon="Gavel"
                    title="Clinical decision"
                    subtitle="Confirm, modify or escalate the AI assessment"
                  />
                  <div className="grid gap-3 sm:grid-cols-3">
                    {DECISIONS.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setDecision(d.id)}
                        className={
                          'rounded-xl border p-3 text-left transition ' +
                          (decision === d.id
                            ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-100'
                            : 'border-ink-200 hover:bg-ink-50')
                        }
                      >
                        <Icon name={d.icon} size={18} style={{ color: d.color }} />
                        <div className="mt-1.5 text-sm font-bold text-ink-900">{d.label}</div>
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="input mt-3 min-h-[90px] resize-y"
                    placeholder="Add your clinical note for the patient…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <button className="btn-primary mt-3" onClick={submit}>
                    <Icon name="Send" size={16} /> Sign &amp; send to patient
                  </button>
                </Card>
              )}
            </div>
          ) : (
            <EmptyState icon="ClipboardList" title="Select a case to review" />
          )}
        </div>
      </div>
    </div>
  )
}

function rank(s: string) {
  return { low: 0, moderate: 1, high: 2, critical: 3 }[s] ?? 0
}
