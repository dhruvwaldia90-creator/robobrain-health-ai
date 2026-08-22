import { Link } from 'react-router-dom'
import { categoryById } from '@/lib/data'
import { severityColor, timeAgo } from '@/lib/format'
import { useAppState } from '@/lib/store'
import { BarChartSimple, Donut } from '@/components/charts'
import { Icon } from '@/components/Icon'
import {
  Avatar,
  Card,
  SectionTitle,
  SeverityBadge,
  StatCard,
  StatusBadge,
} from '@/components/ui'

export function DoctorDashboard() {
  const { cases } = useAppState()
  const queue = cases.filter((c) => c.status === 'doctor_review' || c.status === 'ai_complete')
  const reviewed = cases.filter((c) => c.status === 'reviewed')
  const critical = cases.filter((c) => c.severity === 'high' || c.severity === 'critical')
  const avgConfidence = Math.round(
    cases.reduce((acc, c) => acc + (c.report?.confidence ?? 0), 0) / (cases.length || 1),
  )

  const byCategory = Object.values(
    cases.reduce<Record<string, { label: string; value: number; color: string }>>((acc, c) => {
      const cat = categoryById(c.primaryCategory)
      acc[cat.id] = acc[cat.id] ?? { label: cat.short, value: 0, color: cat.color }
      acc[cat.id].value += 1
      return acc
    }, {}),
  )

  const sevDist = (['low', 'moderate', 'high', 'critical'] as const).map((s) => ({
    label: s[0].toUpperCase() + s.slice(1),
    value: cases.filter((c) => c.severity === s).length,
    color: severityColor[s].hex,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Doctor dashboard</h1>
          <p className="text-ink-500">AI-prepared cases awaiting your clinical review.</p>
        </div>
        <Link to="/app/doctor/queue" className="btn-primary">
          <Icon name="ClipboardList" size={16} /> Open review queue
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="Inbox" label="Awaiting review" value={queue.length} accent="#f59e0b" />
        <StatCard icon="CircleCheck" label="Reviewed" value={reviewed.length} accent="#14b8a6" />
        <StatCard icon="Siren" label="High / critical" value={critical.length} accent="#ef4444" />
        <StatCard icon="Gauge" label="Avg AI confidence" value={`${avgConfidence}%`} accent="#1b81f5" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle
            icon="ClipboardList"
            title="Review queue"
            subtitle="Sorted by AI-assessed priority"
            action={
              <Link to="/app/doctor/queue" className="text-sm font-semibold text-brand-600">
                View all
              </Link>
            }
          />
          <div className="space-y-2.5">
            {[...queue]
              .sort(
                (a, b) =>
                  rank(b.severity) - rank(a.severity) ||
                  +new Date(b.createdAt) - +new Date(a.createdAt),
              )
              .map((c) => {
                const cat = categoryById(c.primaryCategory)
                return (
                  <Link
                    key={c.id}
                    to="/app/doctor/queue"
                    className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 transition hover:bg-ink-50"
                  >
                    <Avatar name={c.patientName} color={cat.color} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-ink-900">{c.patientName}</div>
                      <div className="truncate text-xs text-ink-500">
                        {c.title} · {timeAgo(c.createdAt)}
                      </div>
                    </div>
                    <span className="hidden text-xs font-semibold text-ink-400 sm:block">
                      {c.report?.confidence}%
                    </span>
                    <SeverityBadge severity={c.severity} />
                    <StatusBadge status={c.status} />
                  </Link>
                )
              })}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <SectionTitle icon="PieChart" title="Cases by category" />
            <Donut data={byCategory} />
          </Card>
          <Card>
            <SectionTitle icon="BarChart3" title="Severity distribution" />
            <BarChartSimple data={sevDist} height={180} />
          </Card>
        </div>
      </div>
    </div>
  )
}

function rank(s: string) {
  return { low: 0, moderate: 1, high: 2, critical: 3 }[s] ?? 0
}
