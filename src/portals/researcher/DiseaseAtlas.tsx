import { DISEASE_CATEGORIES } from '@/lib/data'
import { categoryStats } from '@/lib/research'
import { Icon } from '@/components/Icon'
import { Card, SectionTitle } from '@/components/ui'

export function DiseaseAtlas() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Disease atlas</h1>
        <p className="text-ink-500">
          The seven disease categories RoboBrain reasons across, with cohort prevalence and example
          conditions.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {DISEASE_CATEGORIES.map((c) => {
          const stat = categoryStats.find((s) => s.id === c.id)!
          const up = stat.trend >= 0
          return (
            <Card key={c.id} className="flex flex-col">
              <div className="flex items-start justify-between">
                <span
                  className="grid h-12 w-12 place-items-center rounded-2xl"
                  style={{ background: `${c.color}1a`, color: c.color }}
                >
                  <Icon name={c.icon} size={24} />
                </span>
                <span
                  className={
                    'chip ' + (up ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600')
                  }
                >
                  <Icon name={up ? 'TrendingUp' : 'TrendingDown'} size={13} />
                  {up ? '+' : ''}
                  {stat.trend}% QoQ
                </span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-ink-900">{c.name}</h3>
              <p className="mt-1 text-sm text-ink-600">{c.description}</p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-ink-50 p-3">
                  <div className="text-lg font-extrabold text-ink-900">{stat.prevalence}%</div>
                  <div className="text-xs text-ink-500">Prevalence</div>
                </div>
                <div className="rounded-xl bg-ink-50 p-3">
                  <div className="text-lg font-extrabold text-ink-900">
                    {stat.patients.toLocaleString()}
                  </div>
                  <div className="text-xs text-ink-500">Patients</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-400">
                  Example conditions
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {c.exampleConditions.map((e) => (
                    <span key={e} className="chip bg-ink-100 text-ink-600">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Card>
        <SectionTitle icon="Info" title="About the agent mesh" />
        <p className="text-sm text-ink-600">
          Every RoboBrain finding is mapped to one of these categories by the Symptom Analysis and
          Disease Risk agents, enabling category-level analytics across the whole population. This is
          a demonstration dataset and does not represent real patients.
        </p>
      </Card>
    </div>
  )
}
