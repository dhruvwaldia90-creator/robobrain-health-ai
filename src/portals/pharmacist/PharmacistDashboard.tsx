import { Link } from 'react-router-dom'
import type { DrugInteraction } from '@/types'
import { useAppState } from '@/lib/store'
import { BarChartSimple } from '@/components/charts'
import { Icon } from '@/components/Icon'
import {
  Avatar,
  Card,
  EmptyState,
  SectionTitle,
  SeverityBadge,
  StatCard,
} from '@/components/ui'

export function PharmacistDashboard() {
  const { cases } = useAppState()
  const withMeds = cases.filter((c) => c.medications.length > 0)
  // Cases autonomously routed to the pharmacist by the triage agent (#5)
  const pharmacistQueue = cases.filter((c) => c.status === 'pharmacist_review')

  const flagged = cases.flatMap((c) =>
    (c.report?.drugIntelligence?.interactions ?? []).map((it) => ({ case: c, it })),
  )
  const highAdr = cases.filter(
    (c) => c.report?.adr?.overallRisk === 'high' || c.report?.adr?.overallRisk === 'critical',
  )

  const interactionSeverity = (['low', 'moderate', 'high', 'critical'] as const).map((s) => ({
    label: s[0].toUpperCase() + s.slice(1),
    value: flagged.filter((f) => f.it.severity === s).length,
    color: { low: '#10b981', moderate: '#f59e0b', high: '#f97316', critical: '#ef4444' }[s],
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Pharmacist dashboard</h1>
          <p className="text-ink-500">Medication safety intelligence across all patients.</p>
        </div>
        <Link to="/app/pharmacist/intelligence" className="btn-primary">
          <Icon name="Pill" size={16} /> Drug intelligence
        </Link>
      </div>

      {pharmacistQueue.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-purple-200 bg-purple-50 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-100 text-purple-700">
            <Icon name="Route" size={20} />
          </span>
          <div className="flex-1">
            <div className="font-bold text-purple-900">
              {pharmacistQueue.length} case(s) autonomously routed to you by the triage agent
            </div>
            <div className="text-sm text-purple-700">
              These submissions were detected as medication-safety related and auto-routed here for pharmacist review.
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="ClipboardCheck" label="Regimens reviewed" value={withMeds.length} accent="#a855f7" />
        <StatCard icon="Route" label="Auto-routed queue" value={pharmacistQueue.length} accent="#7c3aed" />
        <StatCard icon="GitMerge" label="Interactions flagged" value={flagged.length} accent="#f97316" />
        <StatCard icon="AlertTriangle" label="High ADR risk" value={highAdr.length} accent="#ef4444" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle
            icon="GitMerge"
            title="Flagged drug interactions"
            subtitle="Across all patient regimens"
            action={
              <Link to="/app/pharmacist/intelligence" className="text-sm font-semibold text-brand-600">
                Open tool
              </Link>
            }
          />
          {flagged.length === 0 ? (
            <EmptyState icon="ShieldCheck" title="No interactions flagged" />
          ) : (
            <div className="space-y-2.5">
              {flagged.map(({ case: c, it }, i) => (
                <InteractionRow key={i} patient={c.patientName} it={it} />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle icon="BarChart3" title="Interactions by severity" />
          <BarChartSimple data={interactionSeverity} height={200} />
          <div className="mt-3 rounded-xl bg-ink-50 p-3 text-sm text-ink-600">
            <Icon name="Info" size={15} className="mr-1 inline text-brand-500" />
            High-severity interactions should be escalated to the prescribing doctor.
          </div>
        </Card>
      </div>
    </div>
  )
}

function InteractionRow({ patient, it }: { patient: string; it: DrugInteraction }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-100 p-3">
      <Avatar name={patient} color="#a855f7" size={34} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-ink-900">
          {it.pair[0]} + {it.pair[1]}
        </div>
        <div className="truncate text-xs text-ink-500">
          {patient} · {it.effect}
        </div>
      </div>
      <SeverityBadge severity={it.severity} />
    </div>
  )
}
