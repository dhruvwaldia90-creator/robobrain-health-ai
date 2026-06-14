import { Link } from 'react-router-dom'
import { categoryById } from '@/lib/data'
import {
  biomarkerSignals,
  categoryStats,
  COHORT_SIZE,
  incidenceTrend,
} from '@/lib/research'
import { BarChartSimple, MultiLine } from '@/components/charts'
import { Icon } from '@/components/Icon'
import { Card, ConfidenceBar, SectionTitle, StatCard } from '@/components/ui'

export function ResearcherDashboard() {
  const topCategory = [...categoryStats].sort((a, b) => b.prevalence - a.prevalence)[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Research Intelligence</h1>
          <p className="text-ink-500">Population-scale signals across the RoboBrain cohort.</p>
        </div>
        <Link to="/app/researcher/cohorts" className="btn-primary">
          <Icon name="Users" size={16} /> Cohort explorer
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="Users" label="Cohort size" value={COHORT_SIZE.toLocaleString()} accent="#f59e0b" />
        <StatCard icon="Dna" label="Disease categories" value={categoryStats.length} accent="#10b981" />
        <StatCard icon="TrendingUp" label="Top prevalence" value={`${topCategory.prevalence}%`} accent="#f43f5e" hint={topCategory.short} />
        <StatCard icon="FlaskConical" label="Active cohorts" value={6} accent="#a855f7" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle
            icon="Activity"
            title="Incidence trend"
            subtitle="New diagnoses per month by category"
          />
          <MultiLine
            data={incidenceTrend}
            height={300}
            series={[
              { key: 'cardiovascular', color: '#f43f5e', name: 'Cardiovascular' },
              { key: 'metabolic', color: '#f59e0b', name: 'Metabolic' },
              { key: 'respiratory', color: '#06b6d4', name: 'Respiratory' },
              { key: 'infectious', color: '#ef4444', name: 'Infectious' },
              { key: 'oncology', color: '#a855f7', name: 'Oncology' },
            ]}
          />
        </Card>

        <Card>
          <SectionTitle icon="Microscope" title="Biomarker signals" subtitle="Strongest associations" />
          <div className="space-y-3">
            {biomarkerSignals.map((b) => {
              const cat = categoryById(b.category)
              return (
                <div key={b.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-ink-800">{b.name}</span>
                    <span className="text-xs text-ink-400">n={b.n.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="chip" style={{ background: `${cat.color}1a`, color: cat.color }}>
                      {cat.short}
                    </span>
                    <div className="flex-1">
                      <ConfidenceBar value={b.strength} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle icon="BarChart3" title="Prevalence by category" subtitle="% of cohort" />
        <BarChartSimple
          data={categoryStats.map((c) => ({ label: c.short, value: c.prevalence, color: c.color }))}
        />
      </Card>
    </div>
  )
}
