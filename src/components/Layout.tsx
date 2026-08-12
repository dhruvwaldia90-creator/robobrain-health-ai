import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import type { Role } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { AGENTS } from '@/lib/data'
import { loadLlmConfig, toggleLlm } from '@/lib/llm'
import { Icon } from './Icon'
import { Avatar } from './ui'

interface NavItem {
  to: string
  label: string
  icon: string
  end?: boolean
}

const NAV: Record<Role, NavItem[]> = {
  patient: [
    { to: '/app/patient', label: 'Dashboard', icon: 'LayoutDashboard', end: true },
    { to: '/app/patient/upload', label: 'New Submission', icon: 'Upload' },
    { to: '/app/patient/reports', label: 'My AI Reports', icon: 'FileText' },
    { to: '/app/patient/profile', label: 'Health Profile', icon: 'HeartPulse' },
  ],
  doctor: [
    { to: '/app/doctor', label: 'Dashboard', icon: 'LayoutDashboard', end: true },
    { to: '/app/doctor/queue', label: 'Review Queue', icon: 'ClipboardList' },
    { to: '/app/doctor/analytics', label: 'Analytics', icon: 'BarChart3' },
  ],
  pharmacist: [
    { to: '/app/pharmacist', label: 'Dashboard', icon: 'LayoutDashboard', end: true },
    { to: '/app/pharmacist/intelligence', label: 'Drug Intelligence', icon: 'Pill' },
    { to: '/app/pharmacist/adr', label: 'ADR Monitor', icon: 'AlertTriangle' },
  ],
  researcher: [
    { to: '/app/researcher', label: 'Dashboard', icon: 'LayoutDashboard', end: true },
    { to: '/app/researcher/cohorts', label: 'Cohort Explorer', icon: 'Users' },
    { to: '/app/researcher/categories', label: 'Disease Atlas', icon: 'Microscope' },
  ],
}

const ROLE_LABEL: Record<Role, string> = {
  patient: 'Patient Portal',
  doctor: 'Doctor Portal',
  pharmacist: 'Pharmacist Portal',
  researcher: 'Researcher Portal',
}

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [llmOn, setLlmOn] = useState(() => loadLlmConfig().enabled)
  if (!user) return null
  const items = NAV[user.role]

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link to="/" className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-teal-500 text-white shadow-glow">
          <Icon name="BrainCircuit" size={20} />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-extrabold text-ink-900">RoboBrain</div>
          <div className="text-[11px] font-semibold text-brand-600">Health AI</div>
        </div>
      </Link>

      <div className="px-3">
        <div className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-ink-400">
          {ROLE_LABEL[user.role]}
        </div>
        <nav className="space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                )
              }
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-3">
        <div className="rounded-2xl bg-ink-50 p-3">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} color={user.avatarColor} />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-ink-900">{user.name}</div>
              <div className="truncate text-xs text-ink-500">{user.title ?? user.email}</div>
            </div>
          </div>
          <button
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="btn-outline mt-3 w-full"
          >
            <Icon name="LogOut" size={16} /> Sign out
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-ink-100 bg-white lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-ink-100 bg-white/80 px-4 py-3 backdrop-blur lg:px-8">
          <button
            className="btn-ghost p-2 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Icon name="Menu" size={20} />
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-500">
            <Icon name="Sparkles" size={16} className="text-brand-500" />
            Agentic clinical intelligence
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                const next = toggleLlm(!llmOn)
                setLlmOn(next.enabled)
              }}
              className={
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ' +
                (llmOn
                  ? 'bg-brand-600 text-white'
                  : 'bg-ink-100 text-ink-600 hover:bg-ink-200')
              }
              title="Toggle between the local deterministic reasoner and the LLM backend"
            >
              <Icon name={llmOn ? 'Sparkles' : 'Cpu'} size={13} />
              {llmOn ? 'LLM Reasoner' : 'Local Reasoner'}
            </button>
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              {AGENTS.length} agents online
            </span>
            <Avatar name={user.name} color={user.avatarColor} size={34} />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
