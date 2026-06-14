import { useState } from 'react'
import type { DiseaseCategoryId } from '@/types'
import { categoryById, DISEASE_CATEGORIES } from '@/lib/data'
import { ageDistribution, cohorts } from '@/lib/research'
import { BarChartSimple, Donut } from '@/components/charts'
import { Icon } from '@/components/Icon'
import { Card, ConfidenceBar, SectionTitle, StatCard } from '@/components/ui'

export function CohortExplorer() {
  const [filter, setFilter] = useState<DiseaseCategoryId | 'all'>('all')
  const list = cohorts.filter((c) => filter === 'all' || c.category === filter)
  const totalPatients = list.reduce((acc, c) => acc + c.size, 0)
  const avgResponse = Math.round(
    list.reduce((acc, c) => acc + c.responseRate, 0) / (list.length || 1),
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Cohort explorer</h1>
        <p className="text-ink-500">Define and compare patient cohorts across disease categories.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="All categories" />
        {DISEASE_CATEGORIES.map((c) => (
          <FilterChip
            key={c.id}
            active={filter === c.id}
            onClick={() => setFilter(c.id)}
            label={c.short}
            color={c.color}
          />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon="Users" label="Cohorts" value={list.length} accent="#f59e0b" />
        <StatCard icon="UserCheck" label="Patients" value={totalPatients.toLocaleString()} accent="#10b981" />
        <StatCard icon="TrendingUp" label="Avg response" value={`${avgResponse}%`} accent="#a855f7" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle icon="Users" title="Cohorts" />
          <div className="space-y-2.5">
            {list.map((c) => {
              const cat = categoryById(c.category)
              return (
                <div key={c.id} className="rounded-xl border border-ink-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="grid h-9 w-9 place-items-center rounded-xl"
                        style={{ background: `${cat.color}1a`, color: cat.color }}
                      >
                        <Icon name={cat.icon} size={18} />
                      </span>
                      <div>
                        <div className="font-semibold text-ink-900">{c.name}</div>
                        <div className="text-xs text-ink-500">
                          {c.size.toLocaleString()} patients · mean age {c.meanAge} · {c.femalePct}% female
                        </div>
                      </div>
                    </div>
                    <span className="chip bg-ink-100 text-ink-600">Biomarker: {c.topBiomarker}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="w-28 text-xs font-medium text-ink-500">Response rate</span>
                    <div className="flex-1">
                      <ConfidenceBar value={c.responseRate} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <SectionTitle icon="PieChart" title="Age distribution" />
            <Donut
              data={ageDistribution.map((a, i) => ({
                label: a.label,
                value: a.value,
                color: ['#33a1ff', '#14b8a6', '#a855f7', '#f59e0b', '#ef4444'][i],
              }))}
            />
          </Card>
          <Card>
            <SectionTitle icon="BarChart3" title="Cohort sizes" />
            <BarChartSimple
              height={180}
              data={list.map((c) => ({
                label: c.topBiomarker,
                value: c.size,
                color: categoryById(c.category).color,
              }))}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  color = '#1b81f5',
}: {
  active: boolean
  onClick: () => void
  label: string
  color?: string
}) {
  return (
    <button
      onClick={onClick}
      className={
        'rounded-full px-3.5 py-1.5 text-sm font-semibold transition ' +
        (active ? 'text-white shadow-sm' : 'bg-white text-ink-600 hover:bg-ink-100 border border-ink-200')
      }
      style={active ? { background: color } : undefined}
    >
      {label}
    </button>
  )
}
