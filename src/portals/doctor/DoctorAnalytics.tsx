import { categoryById, DISEASE_CATEGORIES } from '@/lib/data'
import { useAppState } from '@/lib/store'
import { allCorrections, correctionStats } from '@/lib/learning'
import { BarChartSimple, Donut, MultiLine, TrendArea } from '@/components/charts'
import { Icon } from '@/components/Icon'
import { Card, ConfidenceBar, SectionTitle, StatCard } from '@/components/ui'

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

      {/* Doctor-feedback learning loop (#2) */}
      <Card>
        <SectionTitle
          icon="GraduationCap"
          title="Agent learning loop"
          subtitle="Where the doctor mesh has been corrected — confidences now self-adjust"
        />
        <LearningPanel />
      </Card>
    </div>
  )
}

/** Shows the persisted doctor corrections that the Critic Agent applies (#2). */
function LearningPanel() {
  const stats = correctionStats()
  const corrections = allCorrections()
  const { learningLog } = useAppState()

  if (corrections.length === 0 && learningLog.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-ink-50 p-4 text-sm text-ink-600">
        <Icon name="Info" size={16} className="text-brand-500" />
        No corrections recorded yet. When you modify or escalate an AI assessment, the mesh learns
        to be more cautious for that condition on future cases.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-ink-50 p-3 text-center">
          <div className="text-2xl font-extrabold text-ink-900">{stats.conditions}</div>
          <div className="text-xs text-ink-500">Conditions corrected</div>
        </div>
        <div className="rounded-xl bg-ink-50 p-3 text-center">
          <div className="text-2xl font-extrabold text-ink-900">{stats.totalSamples}</div>
          <div className="text-xs text-ink-500">Total corrections</div>
        </div>
        <div className="rounded-xl bg-ink-50 p-3 text-center">
          <div className="text-2xl font-extrabold text-ink-900">{stats.avgDelta}</div>
          <div className="text-xs text-ink-500">Avg confidence adjustment</div>
        </div>
      </div>
      {corrections.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-ink-700">Confidence adjustments (applied by Critic Agent)</div>
          {corrections.map((c) => (
            <div key={c.condition} className="rounded-xl border border-ink-100 p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold capitalize text-ink-800">{c.condition}</span>
                <span className="text-sm font-bold text-red-600">{c.delta} pts</span>
              </div>
              <div className="mt-1">
                <ConfidenceBar value={Math.min(100, Math.abs(c.delta) * 4)} />
              </div>
              <div className="mt-1 text-xs text-ink-400">
                {c.samples} correction(s) — future confidences lowered to reduce repeat disagreement
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
