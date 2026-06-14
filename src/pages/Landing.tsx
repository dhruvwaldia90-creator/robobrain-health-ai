import { Link } from 'react-router-dom'
import { AGENTS, DISEASE_CATEGORIES } from '@/lib/data'
import { Icon } from '@/components/Icon'

const PORTALS = [
  {
    role: 'patient',
    name: 'Patient Portal',
    icon: 'User',
    color: '#33a1ff',
    desc: 'Upload symptoms, prescriptions and lab reports; get instant AI reports reviewed by doctors.',
  },
  {
    role: 'doctor',
    name: 'Doctor Portal',
    icon: 'Stethoscope',
    color: '#14b8a6',
    desc: 'Triage AI-prepared cases, confirm or modify findings, and route referrals remotely.',
  },
  {
    role: 'pharmacist',
    name: 'Pharmacist Portal',
    icon: 'Pill',
    color: '#a855f7',
    desc: 'Run drug-interaction and ADR intelligence across every patient regimen.',
  },
  {
    role: 'researcher',
    name: 'Researcher Portal',
    icon: 'FlaskConical',
    color: '#f59e0b',
    desc: 'Explore cohort trends and disease signals across the population dataset.',
  },
]

export function Landing() {
  return (
    <div className="min-h-screen bg-white text-ink-900">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-teal-500 text-white shadow-glow">
              <Icon name="BrainCircuit" size={20} />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-extrabold">RoboBrain</div>
              <div className="text-[11px] font-semibold text-brand-600">Health AI</div>
            </div>
          </div>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-ink-600 md:flex">
            <a href="#agents" className="hover:text-ink-900">Agents</a>
            <a href="#portals" className="hover:text-ink-900">Portals</a>
            <a href="#categories" className="hover:text-ink-900">Disease Atlas</a>
          </nav>
          <Link to="/login" className="btn-primary">
            Launch Platform <Icon name="ArrowRight" size={16} />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-grid">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-teal-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-bold text-brand-700">
              <Icon name="Sparkles" size={14} /> Agentic &amp; Autonomous Systems
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
              The autonomous{' '}
              <span className="bg-gradient-to-r from-brand-600 to-teal-500 bg-clip-text text-transparent">
                AI care team
              </span>{' '}
              for modern healthcare
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-600">
              RoboBrain Health AI orchestrates seven specialized agents to analyze symptoms, predict
              disease risk, audit medications and generate clinician-ready reports — reviewed
              remotely by doctors, across four role-based portals.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/login" className="btn-primary px-6 py-3 text-base">
                Explore the dashboards <Icon name="ArrowRight" size={18} />
              </Link>
              <a href="#agents" className="btn-outline px-6 py-3 text-base">
                <Icon name="Bot" size={18} /> Meet the agents
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-semibold text-ink-500">
              <span className="flex items-center gap-2"><Icon name="ShieldCheck" size={16} className="text-emerald-500" /> Doctor-in-the-loop</span>
              <span className="flex items-center gap-2"><Icon name="Activity" size={16} className="text-brand-500" /> Real-time analytics</span>
              <span className="flex items-center gap-2"><Icon name="Lock" size={16} className="text-ink-500" /> Role-based access</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-ink-100 bg-ink-50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4 lg:px-8">
          {[
            { v: '7', l: 'Autonomous agents' },
            { v: '4', l: 'Role-based portals' },
            { v: '7', l: 'Disease categories' },
            { v: '<1s', l: 'Report generation' },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <div className="text-3xl font-extrabold text-ink-900 md:text-4xl">{s.v}</div>
              <div className="mt-1 text-sm font-medium text-ink-500">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Agents */}
      <section id="agents" className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="max-w-2xl">
          <span className="text-sm font-bold uppercase tracking-wider text-brand-600">The agent mesh</span>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Seven specialized AI agents</h2>
          <p className="mt-3 text-ink-600">
            Each agent owns one clinical task. The Report Generation Agent orchestrates the rest into
            a single, explainable assessment with a full execution trace.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {AGENTS.map((a, i) => (
            <div
              key={a.id}
              className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-glow"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-teal-500 text-white">
                <Icon name={a.icon} size={22} />
              </span>
              <h3 className="mt-4 font-bold text-ink-900">{a.name}</h3>
              <p className="mt-1.5 text-sm text-ink-600">{a.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Portals */}
      <section id="portals" className="bg-ink-50 py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-sm font-bold uppercase tracking-wider text-teal-600">Four portals</span>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">One platform, every role</h2>
            <p className="mt-3 text-ink-600">
              Tailored dashboards for patients, doctors, pharmacists and researchers — all powered by
              the same agent mesh.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {PORTALS.map((p) => (
              <div key={p.role} className="card flex items-start gap-4 p-6">
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
                  style={{ background: `${p.color}1a`, color: p.color }}
                >
                  <Icon name={p.icon} size={24} />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-ink-900">{p.name}</h3>
                  <p className="mt-1 text-sm text-ink-600">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disease categories */}
      <section id="categories" className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="max-w-2xl">
          <span className="text-sm font-bold uppercase tracking-wider text-brand-600">Disease atlas</span>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Seven categories of disease</h2>
          <p className="mt-3 text-ink-600">
            RoboBrain reasons across the full spectrum of human disease, mapping every finding to a
            clinical category.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {DISEASE_CATEGORIES.map((c) => (
            <div key={c.id} className="card p-5">
              <span
                className="grid h-10 w-10 place-items-center rounded-xl"
                style={{ background: `${c.color}1a`, color: c.color }}
              >
                <Icon name={c.icon} size={20} />
              </span>
              <h3 className="mt-3 font-bold text-ink-900">{c.name}</h3>
              <p className="mt-1 text-sm text-ink-600">{c.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-teal-600 px-6 py-14 text-center text-white shadow-glow">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Ready to see RoboBrain in action?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/90">
            Jump into any portal with one click — demo accounts are pre-loaded with realistic cases.
          </p>
          <Link
            to="/login"
            className="btn mt-6 bg-white px-6 py-3 text-base text-brand-700 hover:bg-white/90"
          >
            Launch the platform <Icon name="ArrowRight" size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink-100 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-ink-500 sm:flex-row lg:px-8">
          <div className="flex items-center gap-2">
            <Icon name="BrainCircuit" size={16} className="text-brand-600" />
            <span className="font-semibold text-ink-700">RoboBrain Health AI</span>
          </div>
          <p>Decision support only — not a substitute for professional medical advice.</p>
        </div>
      </footer>
    </div>
  )
}
