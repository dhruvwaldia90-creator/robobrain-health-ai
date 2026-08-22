import { useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { DecisionExchangeRecord } from '@/types'
import { categoryById } from '@/lib/data'
import {
  createDecisionExchangeRecord,
  parseDecisionExchangeRecord,
  serializeDecisionExchangeRecord,
  validateDecisionExchangeRecord,
} from '@/lib/exchange'
import { timeAgo } from '@/lib/format'
import { sendDecisionRecord, useAppState } from '@/lib/store'
import { Icon } from '@/components/Icon'
import { ExchangeRecordCard, ReviewStatusChip } from '@/components/ExchangeRecordCard'
import { Card, EmptyState, SectionTitle, SeverityBadge } from '@/components/ui'

export function PatientDecisionExchange() {
  const { cases, profile, exchangeRecords } = useAppState()
  const location = useLocation()
  const eligible = useMemo(
    () => cases.filter((c) => c.patientId === profile.id && c.report),
    [cases, profile.id],
  )
  const requested = (location.state as { caseId?: string } | null)?.caseId
  const [selectedId, setSelectedId] = useState(
    requested && eligible.some((c) => c.id === requested) ? requested : (eligible[0]?.id ?? ''),
  )
  const [draft, setDraft] = useState<DecisionExchangeRecord | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const [importText, setImportText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const selected = eligible.find((c) => c.id === selectedId)
  const sent = exchangeRecords.filter((r) => r.patientId === profile.id)

  const generate = () => {
    setNotice('')
    if (!selected) {
      setErrors(['Select a case with an AI report first.'])
      return
    }
    const record = createDecisionExchangeRecord(selected, profile)
    if (!record) {
      setDraft(null)
      setErrors(['This case has no AI report yet, so there is nothing to exchange.'])
      return
    }
    setErrors([])
    setDraft(record)
  }

  const send = () => {
    if (!draft) return
    const errs = validateDecisionExchangeRecord(draft)
    if (errs.length) {
      setErrors(errs)
      return
    }
    sendDecisionRecord(draft)
    setDraft(null)
    setErrors([])
    setNotice('Decision record sent. It is now waiting in the doctor portal for review.')
  }

  const exportJson = () => {
    if (!draft) return
    const blob = new Blob([serializeDecisionExchangeRecord(draft)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${draft.recordId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importRecord = (json: string) => {
    setNotice('')
    const { record, errors: errs } = parseDecisionExchangeRecord(json)
    if (!record) {
      setErrors(errs)
      return
    }
    sendDecisionRecord(record)
    setErrors([])
    setImportText('')
    if (fileRef.current) fileRef.current.value = ''
    setNotice(`Record ${record.recordId} imported and validated successfully.`)
  }

  if (eligible.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold text-ink-900">Decision Support Exchange</h1>
        <EmptyState
          icon="Share2"
          title="Nothing to exchange yet"
          subtitle="Submit symptoms first so the decision-support engine can generate a standardized record."
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
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Decision Support Exchange</h1>
        <p className="mt-1 text-sm text-ink-500">
          Convert an AI assessment into a standardized, portable record your doctor can review and act on.
        </p>
      </div>

      {errors.length > 0 && (
        <Card className="border-red-200 bg-red-50/60">
          <div className="flex items-start gap-3">
            <Icon name="AlertTriangle" size={18} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <div className="text-sm font-bold text-red-800">Record validation failed</div>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-red-700">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}
      {notice && (
        <Card className="border-emerald-200 bg-emerald-50/60">
          <div className="flex items-center gap-3 text-sm font-semibold text-emerald-800">
            <Icon name="CircleCheck" size={18} /> {notice}
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5">
          <Card>
            <SectionTitle
              icon="ClipboardList"
              title="1 · Select a case"
              subtitle="Only cases with a finished AI report can be exchanged"
            />
            <div className="space-y-2.5">
              {eligible.map((c) => {
                const cat = categoryById(c.primaryCategory)
                const active = c.id === selectedId
                const sentRecord = sent.find((r) => r.caseId === c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedId(c.id)
                      setDraft(null)
                      setErrors([])
                      setNotice('')
                    }}
                    className={
                      'w-full rounded-2xl border p-3.5 text-left transition ' +
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
                      <span className="flex-1 truncate text-sm font-semibold text-ink-900">{c.title}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={c.severity} />
                      <span className="text-xs text-ink-400">{timeAgo(c.createdAt)}</span>
                      {sentRecord && <ReviewStatusChip status={sentRecord.review.status} />}
                    </div>
                  </button>
                )
              })}
            </div>
            <button className="btn-primary mt-4 w-full" onClick={generate}>
              <Icon name="Sparkles" size={16} /> Generate Record
            </button>
          </Card>

          <Card>
            <SectionTitle
              icon="FileUp"
              title="Import record"
              subtitle="Paste or upload a decision record JSON — it will be validated before being accepted"
            />
            <textarea
              className="input min-h-[110px] resize-y font-mono text-xs"
              placeholder="Paste a DecisionExchangeRecord JSON here…"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="btn-outline"
                onClick={() => importRecord(importText)}
                disabled={!importText.trim()}
              >
                <Icon name="FileUp" size={16} /> Import Record
              </button>
              <label className="btn-outline cursor-pointer">
                <Icon name="FolderOpen" size={16} /> Choose file
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (f) importRecord(await f.text())
                  }}
                />
              </label>
            </div>
          </Card>

          {sent.length > 0 && (
            <Card>
              <SectionTitle icon="Inbox" title="Exchanged records" subtitle="Shared with the doctor portal" />
              <div className="space-y-2.5">
                {sent.map((r) => (
                  <div key={r.recordId} className="rounded-xl border border-ink-100 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-ink-500">{r.recordId}</span>
                      <ReviewStatusChip status={r.review.status} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={r.assessment.riskLevel} />
                      <span className="text-xs text-ink-400">{timeAgo(r.createdAt)}</span>
                    </div>
                    {r.review.note && (
                      <p className="mt-1.5 text-xs text-ink-600">
                        {r.review.reviewer}: {r.review.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div>
          {draft ? (
            <div className="space-y-4">
              <ExchangeRecordCard record={draft} />
              <div className="flex flex-wrap gap-2">
                <button className="btn-primary" onClick={send}>
                  <Icon name="Send" size={16} /> Send to Doctor
                </button>
                <button className="btn-outline" onClick={exportJson}>
                  <Icon name="FileDown" size={16} /> Export JSON
                </button>
              </div>
            </div>
          ) : (
            <EmptyState
              icon="FileJson"
              title="No record generated"
              subtitle="Select a case on the left and generate a standardized decision record to preview it here."
            />
          )}
        </div>
      </div>
    </div>
  )
}
