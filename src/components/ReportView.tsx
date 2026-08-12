import type { AIReport } from '@/types'
import { categoryById } from '@/lib/data'
import { severityColor } from '@/lib/format'
import { RiskRadar } from './charts'
import { Icon } from './Icon'
import { Card, ConfidenceBar, Pill, SectionTitle, SeverityBadge } from './ui'

const SAFETY_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  approve: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Approved' },
  warn: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Approved with warnings' },
  block: { bg: 'bg-red-50', text: 'text-red-700', label: 'Blocked' },
}

const TRIAGE_STYLE: Record<string, { bg: string; text: string; icon: string; label: string }> = {
  doctor: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'Stethoscope', label: 'Routed to doctor' },
  pharmacist: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'Pill', label: 'Routed to pharmacist' },
  auto: { bg: 'bg-teal-50', text: 'text-teal-700', icon: 'Bot', label: 'Auto-resolved' },
  emergency: { bg: 'bg-red-50', text: 'text-red-700', icon: 'Siren', label: 'Escalated to emergency' },
}

export function ReportView({ report }: { report: AIReport }) {
  const sym = report.symptomAnalysis
  const risk = report.diseaseRisk
  const drug = report.drugIntelligence
  const adr = report.adr
  const ref = report.referral
  const critic = report.critic
  const safety = report.safety
  const uncertainty = report.uncertainty
  const triage = report.triage
  const tools = report.toolCalls

  return (
    <div className="space-y-5">
      {/* Headline */}
      <Card className="overflow-hidden !p-0">
        <div className="bg-gradient-to-br from-brand-600 to-teal-600 p-6 text-white">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/80">
            <Icon name="Sparkles" size={14} /> AI-generated report
          </div>
          <h2 className="mt-2 text-2xl font-extrabold">{report.headline}</h2>
          <p className="mt-2 max-w-3xl text-sm text-white/90">{report.narrative}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="chip bg-white/15 text-white">
              <Icon name="Gauge" size={14} /> Confidence {report.confidence}%
            </span>
            {sym && (
              <span className="chip bg-white/15 text-white">
                <Icon name="ShieldAlert" size={14} /> {sym.severity.toUpperCase()} priority
              </span>
            )}
            {ref && (
              <span className="chip bg-white/15 text-white">
                <Icon name="UserPlus" size={14} /> {ref.specialty}
              </span>
            )}
          </div>
        </div>
        {/* Agent trace */}
        <div className="flex flex-wrap gap-2 p-4">
          {report.trace.map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink-50 px-2.5 py-1.5 text-xs font-medium text-ink-600"
            >
              <Icon name="CircleCheck" size={13} className="text-emerald-500" />
              {t.agent} · {t.durationMs}ms
            </span>
          ))}
        </div>
      </Card>

      {/* Autonomous routing + safety + uncertainty summary */}
      {(triage || safety || uncertainty) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {triage && (
            <Card>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-400">
                <Icon name="Route" size={14} /> Autonomous triage
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`chip ${TRIAGE_STYLE[triage.destination]?.bg ?? 'bg-ink-100'} ${TRIAGE_STYLE[triage.destination]?.text ?? 'text-ink-700'}`}>
                  <Icon name={TRIAGE_STYLE[triage.destination]?.icon ?? 'Route'} size={13} />
                  {TRIAGE_STYLE[triage.destination]?.label ?? triage.destination}
                </span>
                {triage.autonomous && (
                  <span className="chip bg-brand-50 text-brand-700">
                    <Icon name="Bot" size={13} /> Autonomous
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-ink-600">{triage.rationale}</p>
            </Card>
          )}
          {safety && (
            <Card>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-400">
                <Icon name="ShieldCheck" size={14} /> Safety / guardrails
              </div>
              <div className="mt-2">
                <span className={`chip ${SAFETY_STYLE[safety.action]?.bg ?? 'bg-ink-100'} ${SAFETY_STYLE[safety.action]?.text ?? 'text-ink-700'}`}>
                  <Icon name={safety.action === 'block' ? 'Ban' : safety.action === 'warn' ? 'TriangleAlert' : 'CircleCheck'} size={13} />
                  {SAFETY_STYLE[safety.action]?.label ?? safety.action}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-600">{safety.reason}</p>
              {safety.checks.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {safety.checks.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-ink-500">
                      <Icon name="Dot" size={14} className="mt-0.5 text-ink-400" />
                      {c.rule}: {c.detail}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
          {uncertainty && (
            <Card>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-400">
                <Icon name="HelpCircle" size={14} /> Uncertainty
              </div>
              <div className="mt-2">
                <span className={`chip ${uncertainty.abstain ? 'bg-red-50 text-red-700' : 'bg-ink-50 text-ink-700'}`}>
                  <Icon name={uncertainty.abstain ? 'Hand' : 'Gauge'} size={13} />
                  {uncertainty.abstain ? 'Abstained — needs more data' : `${uncertainty.level} uncertainty`}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-600">{uncertainty.reason}</p>
              {uncertainty.additionalDataRequested.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-semibold text-ink-500">Requesting:</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {uncertainty.additionalDataRequested.map((d) => (
                      <span key={d} className="chip bg-brand-50 text-brand-700">
                        <Icon name="TestTube" size={12} /> {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Critic agent — counter-evidence */}
      {critic && critic.challenges.length > 0 && (
        <Card>
          <SectionTitle
            icon="Scale"
            title="Critic Agent — counter-evidence & consensus"
            subtitle={critic.summary}
          />
          <div className="space-y-2.5">
            {critic.challenges.map((c) => (
              <div key={c.condition} className="rounded-xl border border-ink-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink-800">{c.condition}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-400">adjusted</span>
                    <span className="font-bold text-ink-900">{c.adjustedConfidence}%</span>
                  </div>
                </div>
                <p className="mt-1 text-sm text-ink-600">{c.challenge}</p>
                <p className="mt-0.5 text-xs text-ink-400">{c.support}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tool-use — what the agent chose to call */}
      {tools && tools.length > 0 && (
        <Card>
          <SectionTitle
            icon="Wrench"
            title="Tool-Use Agent"
            subtitle="Clinical tools the agent autonomously chose to gather evidence"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {tools.map((t) => (
              <div key={t.tool} className="rounded-xl border border-ink-100 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink-800">
                  <Icon name="Wrench" size={14} className="text-brand-500" /> {t.tool}
                </div>
                <p className="mt-1 text-xs text-ink-600">{t.result}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Symptom analysis */}
        {sym && (
          <Card>
            <SectionTitle
              icon="Stethoscope"
              title="Symptom Analysis"
              subtitle="Ranked differential diagnosis"
            />
            <p className="mb-3 text-sm text-ink-600">{sym.summary}</p>
            <div className="space-y-3">
              {sym.findings.map((f) => {
                const cat = categoryById(f.category)
                return (
                  <div key={f.condition}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink-800">{f.condition}</span>
                        <Pill color={cat.color}>{cat.short}</Pill>
                      </div>
                    </div>
                    <ConfidenceBar value={f.confidence} />
                    <p className="mt-1 text-xs text-ink-500">{f.rationale}</p>
                  </div>
                )
              })}
            </div>
            {sym.redFlags.length > 0 && (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3">
                <div className="flex items-center gap-2 text-sm font-bold text-red-700">
                  <Icon name="TriangleAlert" size={16} /> Red flags
                </div>
                <ul className="mt-1.5 list-inside list-disc text-sm text-red-700">
                  {sym.redFlags.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        {/* Disease risk */}
        {risk && (
          <Card>
            <SectionTitle
              icon="ShieldAlert"
              title="Disease Risk Profile"
              subtitle={`Overall risk index ${risk.overall}/100`}
            />
            <RiskRadar
              data={risk.scores.map((s) => ({
                label: categoryById(s.category).short,
                score: s.score,
              }))}
            />
            <div className="mt-3 space-y-2">
              {risk.scores.slice(0, 3).map((s) => (
                <div key={s.category} className="flex items-center justify-between text-sm">
                  <span className="text-ink-600">{categoryById(s.category).name}</span>
                  <span
                    className="font-bold"
                    style={{ color: severityColor[s.band].hex }}
                  >
                    {s.score}/100
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Drug intelligence */}
        {drug && (
          <Card>
            <SectionTitle
              icon="Pill"
              title="Drug Intelligence"
              subtitle={`${drug.insights.length} medication(s) analyzed`}
            />
            {drug.interactions.length > 0 ? (
              <div className="mb-3 space-y-2">
                {drug.interactions.map((it, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-orange-100 bg-orange-50 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-orange-800">
                        {it.pair[0]} + {it.pair[1]}
                      </span>
                      <SeverityBadge severity={it.severity} />
                    </div>
                    <p className="mt-1 text-orange-800">{it.effect}</p>
                    <p className="mt-0.5 text-xs text-orange-700">Plan: {it.management}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                No significant interactions detected.
              </p>
            )}
            <div className="space-y-1.5">
              {drug.insights.map((d) => (
                <div key={d.drug} className="flex items-start gap-2 text-sm">
                  <Icon name="Dot" size={18} className="text-brand-500" />
                  <span>
                    <span className="font-semibold text-ink-800">{d.drug}</span>{' '}
                    <span className="text-ink-500">({d.class})</span> — {d.notes}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ADR + Referral */}
        <div className="space-y-5">
          {adr && (
            <Card>
              <SectionTitle
                icon="AlertTriangle"
                title="ADR Prediction"
                subtitle={`Overall ADR risk: ${adr.overallRisk}`}
              />
              {adr.predictions.length > 0 ? (
                <div className="space-y-3">
                  {adr.predictions.map((p, i) => (
                    <div key={i}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                        <span className="font-semibold text-ink-800">
                          {p.drug}: {p.reaction}
                        </span>
                        <SeverityBadge severity={p.severity} />
                      </div>
                      <ConfidenceBar value={p.probability} />
                      <p className="mt-1 text-xs text-ink-500">Monitor: {p.monitoring}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-500">No notable ADR signals.</p>
              )}
            </Card>
          )}

          {ref && (
            <Card>
              <SectionTitle icon="UserPlus" title="Referral Recommendation" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-ink-900">{ref.specialty}</div>
                  <p className="text-sm text-ink-500">{ref.reason}</p>
                </div>
                <SeverityBadge severity={ref.urgency} />
              </div>
              {ref.recommendedDoctor && (
                <p className="mt-2 text-sm text-ink-600">
                  Suggested clinician: <span className="font-semibold">{ref.recommendedDoctor}</span>
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {ref.suggestedTests.map((t) => (
                  <span key={t} className="chip bg-brand-50 text-brand-700">
                    <Icon name="TestTube" size={13} /> {t}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <p className="px-1 text-xs text-ink-400">
        RoboBrain Health AI provides decision support only and is not a substitute for professional
        medical judgment. All reports are reviewed by a licensed clinician.
      </p>
    </div>
  )
}
