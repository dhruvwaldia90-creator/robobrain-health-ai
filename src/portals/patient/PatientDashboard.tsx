import { Link } from 'react-router-dom'
import { riskAgent } from '@/lib/agents'
import { categoryById } from '@/lib/data'
import { severityColor, timeAgo } from '@/lib/format'
import { recordVitalsSnapshot, useAppState } from '@/lib/store'
import { BarChartSimple, TrendArea } from '@/components/charts'
import { Icon } from '@/components/Icon'
import {
  Card,
  EmptyState,
  SectionTitle,
  SeverityBadge,
  StatCard,
  StatusBadge,
} from '@/components/ui'

export function PatientDashboard() {
  const { cases, profile, vitalsHistory } = useAppState()
  const myCases = cases.filter((c) => c.patientId === profile.id)
  const reviewed = myCases.filter((c) => c.status === 'reviewed').length
  const pending = myCases.filter((c) => c.status !== 'reviewed').length
  const risk = riskAgent.run({ profile })

  // Longitudinal monitoring (#9): build a trend from the stored vitals history,
  // with a real-time risk trend derived from each snapshot.
  const bpTrend = vitalsHistory.map((s) => ({
    label: new Date(s.takenAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    value: s.vitals.systolic,
  }))
  const riskTrend = vitalsHistory.map((s) => ({
    label: new Date(s.takenAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    value: riskAgent.run({ profile: { ...profile, vitals: s.vitals } }).overall,
  }))
  const latestRisk = riskTrend[riskTrend.length - 1]?.value ?? risk.overall
  const prevRisk = riskTrend[riskTrend.length - 2]?.value
  const trendDelta = prevRisk != null ? latestRisk - prevRisk : 0
  const trendingUp = trendDelta > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">
            Hello, {profile.name.split(' ')[0]} 👋
          </h1>
          <p className="text-ink-500">Here's your latest health intelligence.</p>
        </div>
        <Link to="/app/patient/upload" className="btn-primary">
          <Icon name="Upload" size={16} /> New submission
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="FolderHeart" label="Active cases" value={pending} accent="#1b81f5" />
        <StatCard icon="FileCheck2" label="Reviewed reports" value={reviewed} accent="#14b8a6" />
        <StatCard
          icon="Gauge"
          label="Overall risk index"
          value={`${risk.overall}/100`}
          accent={severityColor[risk.scores[0].band].hex}
          hint={risk.scores[0].band}
        />
        <StatCard
          icon="HeartPulse"
          label="Blood pressure"
          value={`${profile.vitals.systolic}/${profile.vitals.diastolic}`}
          accent="#f43f5e"
          hint="mmHg"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle
            icon="FolderHeart"
            title="My cases"
            subtitle="AI reports and review status"
            action={
              <Link to="/app/patient/reports" className="text-sm font-semibold text-brand-600">
                View all
              </Link>
            }
          />
          {myCases.length === 0 ? (
            <EmptyState
              icon="Inbox"
              title="No cases yet"
              subtitle="Upload symptoms, a prescription, or a lab report to get your first AI report."
              action={
                <Link to="/app/patient/upload" className="btn-primary">
                  <Icon name="Upload" size={16} /> New submission
                </Link>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {myCases.map((c) => {
                const cat = categoryById(c.primaryCategory)
                return (
                  <Link
                    key={c.id}
                    to="/app/patient/reports"
                    className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 transition hover:bg-ink-50"
                  >
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                      style={{ background: `${cat.color}1a`, color: cat.color }}
                    >
                      <Icon name={cat.icon} size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-ink-900">{c.title}</div>
                      <div className="text-xs text-ink-500">
                        {cat.short} · {timeAgo(c.createdAt)}
                      </div>
                    </div>
                    <SeverityBadge severity={c.severity} />
                    <StatusBadge status={c.status} />
                  </Link>
                )
              })}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <SectionTitle icon="Activity" title="Systolic BP trend" subtitle="Longitudinal history" />
            <button
              onClick={() => recordVitalsSnapshot()}
              className="btn-ghost px-3 py-1.5 text-xs"
              title="Snapshot today's vitals into your longitudinal record"
            >
              <Icon name="Plus" size={14} /> Record vitals
            </button>
          </div>
          <TrendArea data={bpTrend} color="#f43f5e" height={150} />
          <div
            className={
              'mt-3 rounded-xl p-3 text-sm ' +
              (trendingUp ? 'bg-red-50 text-red-700' : trendDelta < 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-ink-50 text-ink-600')
            }
          >
            <Icon name={trendingUp ? 'TrendingUp' : trendDelta < 0 ? 'TrendingDown' : 'Minus'} size={15} className="mr-1 inline" />
            Risk index {trendDelta === 0 ? 'stable' : trendingUp ? `trending up (+${trendDelta})` : `improving (${trendDelta})`} —
            proactive monitoring across {vitalsHistory.length} snapshots.
          </div>
          <div className="mt-4">
            <h4 className="mb-2 text-sm font-bold text-ink-700">Risk index over time</h4>
            <TrendArea data={riskTrend} color="#a855f7" height={120} />
          </div>
          <div className="mt-4">
            <h4 className="mb-2 text-sm font-bold text-ink-700">Top risk categories</h4>
            <BarChartSimple
              height={150}
              data={risk.scores.slice(0, 4).map((s) => ({
                label: categoryById(s.category).short,
                value: s.score,
                color: severityColor[s.band].hex,
              }))}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}
