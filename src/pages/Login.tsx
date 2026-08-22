import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Role } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { roleHome } from '@/lib/roles'
import { DEMO_USERS } from '@/lib/data'
import { Icon } from '@/components/Icon'

const ROLE_CARDS: { role: Role; label: string; icon: string; color: string }[] = [
  { role: 'patient', label: 'Patient', icon: 'User', color: '#33a1ff' },
  { role: 'doctor', label: 'Doctor', icon: 'Stethoscope', color: '#14b8a6' },
  { role: 'pharmacist', label: 'Pharmacist', icon: 'Pill', color: '#a855f7' },
  { role: 'researcher', label: 'Researcher', icon: 'FlaskConical', color: '#f59e0b' },
]

export function Login() {
  const { login, loginAs } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const res = login(email, password)
    if (!res.ok) {
      setError(res.error ?? 'Login failed')
      return
    }
    const user = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase())!
    navigate(roleHome[user.role])
  }

  const quick = (role: Role) => {
    loginAs(role)
    navigate(roleHome[role])
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-teal-600 p-12 text-white lg:flex lg:flex-col">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
            <Icon name="BrainCircuit" size={22} />
          </span>
          <div className="leading-tight">
            <div className="font-extrabold">RoboBrain</div>
            <div className="text-xs font-semibold text-white/80">Health AI</div>
          </div>
        </Link>

        <div className="my-auto max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight">
            Your autonomous AI care team, one login away.
          </h1>
          <p className="mt-4 text-white/85">
            Seven specialized agents working across patient, doctor, pharmacist and researcher
            portals — with a doctor always in the loop.
          </p>
          <div className="mt-8 space-y-3">
            {[
              'Symptom analysis & disease-risk scoring',
              'Drug interaction & ADR prediction',
              'Clinician-ready AI reports, reviewed remotely',
            ].map((t) => (
              <div key={t} className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15">
                  <Icon name="Check" size={15} />
                </span>
                <span className="text-sm text-white/90">{t}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-white/60">
          Decision support only — not a substitute for professional medical advice.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-ink-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-teal-500 text-white">
                <Icon name="BrainCircuit" size={22} />
              </span>
              <span className="font-extrabold text-ink-900">RoboBrain Health AI</span>
            </Link>
          </div>

          <div className="card p-7">
            <h2 className="text-2xl font-extrabold text-ink-900">Welcome back</h2>
            <p className="mt-1 text-sm text-ink-500">Sign in to your role-based dashboard.</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="you@robobrain.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
                  <Icon name="CircleAlert" size={16} /> {error}
                </div>
              )}
              <button type="submit" className="btn-primary w-full py-3">
                Sign in <Icon name="ArrowRight" size={16} />
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-ink-400">
              <span className="h-px flex-1 bg-ink-200" /> or one-click demo <span className="h-px flex-1 bg-ink-200" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {ROLE_CARDS.map((r) => (
                <button
                  key={r.role}
                  onClick={() => quick(r.role)}
                  className="flex items-center gap-2.5 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-ink-700 transition hover:border-brand-300 hover:bg-brand-50"
                >
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                    style={{ background: `${r.color}1a`, color: r.color }}
                  >
                    <Icon name={r.icon} size={16} />
                  </span>
                  {r.label}
                </button>
              ))}
            </div>

            <p className="mt-5 text-center text-xs text-ink-400">
              Demo accounts use password <span className="font-semibold text-ink-600">demo1234</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
