import type { DecisionExchangeRecord, Vitals } from '@/types'
import { timeAgo, titleCase } from '@/lib/format'
import { Icon } from './Icon'
import { Card, ConfidenceBar, Pill, SeverityBadge } from './ui'

const URGENCY_COLOR: Record<string, string> = {
  routine: '#10b981',
  soon: '#f59e0b',
  urgent: '#f97316',
  emergency: '#ef4444',
}

const REVIEW_STYLE: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  pending: { label: 'Pending doctor review', bg: 'bg-amber-50', text: 'text-amber-700', icon: 'Clock' },
  accepted: { label: 'Accepted by doctor', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'CircleCheck' },
  overridden: { label: 'Overridden by doctor', bg: 'bg-red-50', text: 'text-red-700', icon: 'PencilLine' },
}

export function ReviewStatusChip({ status }: { status: string }) {
  const s = REVIEW_STYLE[status] ?? REVIEW_STYLE.pending
  return (
    <span className={`chip ${s.bg} ${s.text}`}>
      <Icon name={s.icon} size={13} /> {s.label}
    </span>
  )
}

const VITAL_LABELS: [keyof Vitals, string][] = [
  ['systolic', 'Systolic'],
  ['diastolic', 'Diastolic'],
  ['heartRate', 'Heart rate'],
  ['temperatureC', 'Temp °C'],
  ['spo2', 'SpO₂ %'],
  ['glucoseMgDl', 'Glucose'],
  ['cholesterolMgDl', 'Cholesterol'],
]

/** Renders a standardized decision exchange record. Shared by patient and doctor portals. */
export function ExchangeRecordCard({ record }: { record: DecisionExchangeRecord }) {
  const { input, assessment, recommendation, provenance, review } = record
  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-400">
            <Icon name="Share2" size={14} /> Decision Exchange Record
          </div>
          <div className="mt-1 font-mono text-xs text-ink-500">{record.recordId}</div>
          <div className="mt-1 text-xs text-ink-400">
            {provenance.source} · generated {timeAgo(provenance.generatedAt)} · exchanged{' '}
            {timeAgo(record.createdAt)}
          </div>
        </div>
        <ReviewStatusChip status={review.status} />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-400">Assessment</span>
          <SeverityBadge severity={assessment.riskLevel} />
        </div>
        <ConfidenceBar value={assessment.confidence} />
        {assessment.findings.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {assessment.findings.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink-700">
                <Icon name="Activity" size={14} className="mt-0.5 shrink-0 text-brand-500" />
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl bg-ink-50 p-4">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-400">
            <Icon name="Stethoscope" size={14} /> AI recommendation
          </span>
          <Pill color={URGENCY_COLOR[recommendation.urgency] ?? '#1b81f5'}>
            <Icon name="Gauge" size={13} /> {titleCase(recommendation.urgency)}
          </Pill>
        </div>
        <div className="text-sm font-bold text-ink-900">{recommendation.action}</div>
        <p className="mt-1 text-sm text-ink-600">{recommendation.rationale}</p>
      </div>

      {(input.symptoms?.length || input.observations?.length || input.vitals) && (
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-400">
            Standardized input
          </div>
          {input.vitals && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {VITAL_LABELS.filter(([k]) => typeof input.vitals?.[k] === 'number').map(([k, label]) => (
                <div key={k} className="rounded-xl bg-ink-50 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase text-ink-400">{label}</div>
                  <div className="text-sm font-bold text-ink-900">{input.vitals?.[k]}</div>
                </div>
              ))}
              {input.vitals.smoker && (
                <div className="rounded-xl bg-ink-50 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase text-ink-400">Smoker</div>
                  <div className="text-sm font-bold text-ink-900">Yes</div>
                </div>
              )}
            </div>
          )}
          {input.symptoms && input.symptoms.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {input.symptoms.map((s, i) => (
                <Pill key={i} color="#64748b">
                  {s}
                </Pill>
              ))}
            </div>
          )}
          {input.observations && input.observations.length > 0 && (
            <ul className="mt-2.5 space-y-1.5">
              {input.observations.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink-700">
                  <Icon name="AlertTriangle" size={14} className="mt-0.5 shrink-0 text-amber-500" />
                  {o}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {review.status !== 'pending' && (
        <div
          className={`rounded-xl p-4 ${
            review.status === 'accepted' ? 'bg-emerald-50' : 'bg-red-50'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-bold text-ink-900">
            <Icon name="UserCheck" size={16} />
            {review.status === 'accepted' ? 'Doctor accepted the recommendation' : 'Doctor overrode the recommendation'}
          </div>
          <div className="mt-1 text-sm text-ink-700">
            {review.reviewer}
            {review.reviewedAt ? ` · ${timeAgo(review.reviewedAt)}` : ''}
          </div>
          {review.note && <p className="mt-1 text-sm text-ink-700">{review.note}</p>}
        </div>
      )}
    </Card>
  )
}
