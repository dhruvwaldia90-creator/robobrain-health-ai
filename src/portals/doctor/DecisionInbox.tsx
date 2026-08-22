import { useMemo, useState } from 'react'
import type { ExchangeReviewStatus } from '@/types'
import { timeAgo } from '@/lib/format'
import { reviewDecisionRecord, useAppState } from '@/lib/store'
import { useAuth } from '@/context/AuthContext'
import { Icon } from '@/components/Icon'
import { ExchangeRecordCard, ReviewStatusChip } from '@/components/ExchangeRecordCard'
import { Card, EmptyState, SectionTitle, SeverityBadge } from '@/components/ui'

type DoctorVerdict = Exclude<ExchangeReviewStatus, 'pending'>

const VERDICTS: { id: DoctorVerdict; label: string; icon: string; color: string }[] = [
  { id: 'accepted', label: 'Accept recommendation', icon: 'ThumbsUp', color: '#10b981' },
  { id: 'overridden', label: 'Override recommendation', icon: 'PencilLine', color: '#ef4444' },
]

export function DecisionInbox() {
  const { user } = useAuth()
  const { cases, exchangeRecords } = useAppState()
  const inbox = useMemo(
    () =>
      [...exchangeRecords].sort(
        (a, b) =>
          rank(b.assessment.riskLevel) - rank(a.assessment.riskLevel) ||
          +new Date(b.createdAt) - +new Date(a.createdAt),
      ),
    [exchangeRecords],
  )
  const [selectedId, setSelectedId] = useState<string | null>(
    inbox.find((r) => r.review.status === 'pending')?.recordId ?? inbox[0]?.recordId ?? null,
  )
  const selected = inbox.find((r) => r.recordId === selectedId)
  const [verdict, setVerdict] = useState<DoctorVerdict>('accepted')
  const [note, setNote] = useState('')

  const submit = () => {
    if (!selected || !user) return
    reviewDecisionRecord(selected.recordId, {
      status: verdict,
      reviewer: user.name,
      note: note.trim() || VERDICTS.find((v) => v.id === verdict)!.label,
    })
    setNote('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Decision Inbox</h1>
        <p className="mt-1 text-sm text-ink-500">
          Standardized decision-support records shared by patients and other workflows.
        </p>
      </div>

      {inbox.length === 0 ? (
        <EmptyState
          icon="Inbox"
          title="No decision records yet"
          subtitle="When a patient sends a standardized decision record, it appears here for your review."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-2.5">
            {inbox.map((r) => {
              const active = r.recordId === selectedId
              const patientName =
                cases.find((c) => c.id === r.caseId)?.patientName ?? `Patient ${r.patientId}`
              return (
                <button
                  key={r.recordId}
                  onClick={() => setSelectedId(r.recordId)}
                  className={
                    'w-full rounded-2xl border p-4 text-left transition ' +
                    (active
                      ? 'border-brand-400 bg-brand-50/60 ring-2 ring-brand-100'
                      : 'border-ink-100 bg-white hover:bg-ink-50')
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-ink-900">{patientName}</span>
                    <span className="text-xs text-ink-400">{timeAgo(r.createdAt)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={r.assessment.riskLevel} />
                    <ReviewStatusChip status={r.review.status} />
                  </div>
                </button>
              )
            })}
          </div>

          <div>
            {selected ? (
              <div className="space-y-5">
                <Card className="border-amber-200 bg-amber-50/60">
                  <div className="flex items-start gap-3">
                    <Icon name="ShieldAlert" size={18} className="mt-0.5 shrink-0 text-amber-600" />
                    <p className="text-sm text-amber-800">
                      <span className="font-bold">AI recommendation — not a diagnosis.</span> The
                      decision-support engine generated this record. You remain the final
                      decision-maker: accept it, or override it with your own clinical judgment.
                    </p>
                  </div>
                </Card>

                <ExchangeRecordCard record={selected} />

                {selected.review.status === 'pending' ? (
                  <Card>
                    <SectionTitle
                      icon="Gavel"
                      title="Clinical review"
                      subtitle="Accept or override the AI recommendation, then sign"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      {VERDICTS.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setVerdict(v.id)}
                          className={
                            'rounded-xl border p-3 text-left transition ' +
                            (verdict === v.id
                              ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-100'
                              : 'border-ink-200 hover:bg-ink-50')
                          }
                        >
                          <Icon name={v.icon} size={18} style={{ color: v.color }} />
                          <div className="mt-1.5 text-sm font-bold text-ink-900">{v.label}</div>
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="input mt-3 min-h-[90px] resize-y"
                      placeholder="Add a short clinical note…"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <button className="btn-primary mt-3" onClick={submit}>
                      <Icon name="Send" size={16} /> Sign &amp; mark reviewed
                    </button>
                  </Card>
                ) : (
                  <Card
                    className={
                      selected.review.status === 'accepted'
                        ? 'border-emerald-200 bg-emerald-50/60'
                        : 'border-red-200 bg-red-50/60'
                    }
                  >
                    <SectionTitle icon="UserCheck" title="Your review" />
                    <p className="text-sm text-ink-800">
                      <span className="font-bold capitalize">{selected.review.status}</span>
                      {selected.review.reviewedAt
                        ? ` · ${timeAgo(selected.review.reviewedAt)}`
                        : ''}{' '}
                      — {selected.review.note}
                    </p>
                  </Card>
                )}
              </div>
            ) : (
              <EmptyState icon="Inbox" title="Select a record to review" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function rank(s: string) {
  return { low: 0, moderate: 1, high: 2, critical: 3 }[s] ?? 0
}
