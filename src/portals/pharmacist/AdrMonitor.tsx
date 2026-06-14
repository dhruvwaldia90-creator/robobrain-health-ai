import { useAppState } from '@/lib/store'
import { BarChartSimple } from '@/components/charts'
import { Icon } from '@/components/Icon'
import {
  Avatar,
  Card,
  ConfidenceBar,
  EmptyState,
  SectionTitle,
  SeverityBadge,
  StatCard,
} from '@/components/ui'

export function AdrMonitor() {
  const { cases } = useAppState()

  const rows = cases
    .flatMap((c) =>
      (c.report?.adr?.predictions ?? []).map((p) => ({ patient: c.patientName, p })),
    )
    .sort((a, b) => b.p.probability - a.p.probability)

  const high = rows.filter((r) => r.p.severity === 'high' || r.p.severity === 'critical').length
  const avgProb = Math.round(
    rows.reduce((acc, r) => acc + r.p.probability, 0) / (rows.length || 1),
  )

  const byReaction = Object.values(
    rows.reduce<Record<string, { label: string; value: number }>>((acc, r) => {
      const key = r.p.reaction.split(' ').slice(0, 2).join(' ')
      acc[key] = acc[key] ?? { label: key, value: 0 }
      acc[key].value += 1
      return acc
    }, {}),
  ).slice(0, 6)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">ADR Monitor</h1>
        <p className="text-ink-500">Predicted adverse drug reactions across the patient population.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon="AlertTriangle" label="Predicted ADRs" value={rows.length} accent="#f97316" />
        <StatCard icon="Siren" label="High / critical" value={high} accent="#ef4444" />
        <StatCard icon="Gauge" label="Avg probability" value={`${avgProb}%`} accent="#a855f7" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle icon="ListChecks" title="ADR watchlist" subtitle="Sorted by probability" />
          {rows.length === 0 ? (
            <EmptyState icon="ShieldCheck" title="No ADR signals detected" />
          ) : (
            <div className="space-y-3">
              {rows.map((r, i) => (
                <div key={i} className="rounded-xl border border-ink-100 p-3">
                  <div className="mb-1.5 flex items-center gap-2.5">
                    <Avatar name={r.patient} color="#a855f7" size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink-900">
                        {r.p.drug}: {r.p.reaction}
                      </div>
                      <div className="truncate text-xs text-ink-500">{r.patient}</div>
                    </div>
                    <SeverityBadge severity={r.p.severity} />
                  </div>
                  <ConfidenceBar value={r.p.probability} />
                  <p className="mt-1 text-xs text-ink-500">
                    <Icon name="Eye" size={12} className="mr-1 inline" />
                    {r.p.monitoring}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle icon="BarChart3" title="Top reaction types" />
          {byReaction.length === 0 ? (
            <EmptyState icon="BarChart3" title="No data" />
          ) : (
            <BarChartSimple data={byReaction} color="#f97316" height={260} />
          )}
        </Card>
      </div>
    </div>
  )
}
