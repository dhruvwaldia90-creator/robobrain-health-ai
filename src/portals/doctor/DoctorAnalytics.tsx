import { categoryById, DISEASE_CATEGORIES } from '@/lib/data'
import { useAppState } from '@/lib/store'
import { BarChartSimple, Donut, MultiLine, TrendArea } from '@/components/charts'
import { Card, SectionTitle, StatCard } from '@/components/ui'

const volume = [
  { label: 'W1', cases: 28, reviewed: 24 },
  { label: 'W2', cases: 34, reviewed: 30 },
  { label: 'W3', cases: 31, reviewed: 29 },
  { label: 'W4', cases: 42, reviewed: 38 },
  { label: 'W5', cases: 47, reviewed: 41 },
  { label: 'W6', cases: 53, reviewed: 49 },
]

const confidence = [
  { label: 'W1', value: 78 },
  { label: 'W2', value: 80 },
  { label: 'W3', value: 79 },
  { label: 'W4', value: 83 },
  { label: 'W5', value: 85 },
  { label: 'W6', value: 87 },
]

export function DoctorAnalytics() {
  const { cases } = useAppState()

  const byCategory = DISEASE_CATEGORIES.map((cat) => ({
    label: cat.short,
    value: cases.filter((c) => c.primaryCategory === cat.id).length,
    color: cat.color,
  }))

  const referrals = Object.values(
    cases.reduce<Record<string, { label: string; value: number; color: string }>>((acc, c) => {
      const sp = c.report?.referral?.specialty ?? 'General Medicine'
      const color = categoryById(c.primaryCategory).color
      acc[sp] = acc[sp] ?? { label: sp, value: 0, color }
      acc[sp].value += 1
      return acc
    }, {}),
  )

  const concordance = Math.round(
    (cases.filter((c) => c.doctorNote?.decision === 'agree').length /
      (cases.filter((c) => c.doctorNote).length || 1)) *
      100,
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Clinical analytics</h1>
        <p className="text-ink-500">Operational and quality metrics across the agent mesh.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="Layers" label="Total cases" value={cases.length} accent="#1b81f5" />
        <StatCard icon="TrendingUp" label="6-week growth" value="+89%" accent="#14b8a6" hint="vol." />
        <StatCard icon="Gauge" label="Avg confidence" value="87%" accent="#a855f7" />
        <StatCard icon="Handshake" label="AI concordance" value={`${concordance}%`} accent="#10b981" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle icon="Activity" title="Case volume vs reviewed" subtitle="Last 6 weeks" />
          <MultiLine
            data={volume}
            series={[
              { key: 'cases', color: '#1b81f5', name: 'New cases' },
              { key: 'reviewed', color: '#14b8a6', name: 'Reviewed' },
            ]}
          />
        </Card>
        <Card>
          <SectionTitle icon="Gauge" title="AI confidence trend" subtitle="Mean report confidence" />
          <TrendArea data={confidence} color="#a855f7" />
        </Card>
        <Card>
          <SectionTitle icon="BarChart3" title="Cases by disease category" />
          <BarChartSimple data={byCategory} />
        </Card>
        <Card>
          <SectionTitle icon="PieChart" title="Referrals by specialty" />
          <Donut data={referrals} />
        </Card>
      </div>
    </div>
  )
}
