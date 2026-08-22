import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { categoryById } from '@/lib/data'
import { timeAgo } from '@/lib/format'
import { useAppState } from '@/lib/store'
import { Icon } from '@/components/Icon'
import { ReportView } from '@/components/ReportView'
import {
  Card,
  EmptyState,
  SeverityBadge,
  StatusBadge,
} from '@/components/ui'

export function PatientReports() {
  const { cases, profile } = useAppState()
  const myCases = useMemo(
    () => cases.filter((c) => c.patientId === profile.id && c.report),
    [cases, profile.id],
  )
  const [selectedId, setSelectedId] = useState<string | null>(myCases[0]?.id ?? null)
  const selected = myCases.find((c) => c.id === selectedId)

  if (myCases.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold text-ink-900">My AI reports</h1>
        <EmptyState
          icon="FileText"
          title="No reports yet"
          subtitle="Submit symptoms or a prescription to generate your first AI report."
          action={
            <Link to="/app/patient/upload" className="btn-primary">
              <Icon name="Upload" size={16} /> New submission
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-ink-900">My AI reports</h1>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-2.5">
          {myCases.map((c) => {
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
                <div className="flex items-center gap-2">
                  <span
                    className="grid h-8 w-8 place-items-center rounded-lg"
                    style={{ background: `${cat.color}1a`, color: cat.color }}
                  >
                    <Icon name={cat.icon} size={16} />
                  </span>
                  <span className="flex-1 truncate font-semibold text-ink-900">{c.title}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <SeverityBadge severity={c.severity} />
                  <StatusBadge status={c.status} />
                </div>
                <div className="mt-1.5 text-xs text-ink-400">{timeAgo(c.createdAt)}</div>
              </button>
            )
          })}
        </div>

        <div>
          {selected?.report ? (
            <>
              <div className="mb-4 flex justify-end">
                <Link
                  to="/app/patient/exchange"
                  state={{ caseId: selected.id }}
                  className="btn-outline"
                >
                  <Icon name="Share2" size={16} /> Share decision record
                </Link>
              </div>
              {selected.doctorNote && (
                <Card className="mb-5 border-emerald-200 bg-emerald-50/60">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                      <Icon name="UserCheck" size={18} />
                    </span>
                    <div>
                      <div className="text-sm font-bold text-emerald-800">
                        Reviewed by {selected.doctorNote.doctorName}
                      </div>
                      <p className="mt-0.5 text-sm text-emerald-800">{selected.doctorNote.note}</p>
                    </div>
                  </div>
                </Card>
              )}
              <ReportView report={selected.report} />
            </>
          ) : (
            <EmptyState icon="FileText" title="Select a report" />
          )}
        </div>
      </div>
    </div>
  )
}
