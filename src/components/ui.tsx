import clsx from 'clsx'
import type { ReactNode } from 'react'
import type { Severity } from '@/types'
import { severityColor, statusLabel, titleCase } from '@/lib/format'
import { Icon } from './Icon'

export function Card({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <div className={clsx('card p-5', className)}>{children}</div>
}

export function SectionTitle({
  icon,
  title,
  subtitle,
  action,
}: {
  icon?: string
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <Icon name={icon} size={18} />
          </span>
        )}
        <div>
          <h3 className="text-base font-bold text-ink-900">{title}</h3>
          {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

export function StatCard({
  icon,
  label,
  value,
  hint,
  accent = '#1b81f5',
}: {
  icon: string
  label: string
  value: ReactNode
  hint?: string
  accent?: string
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span
          className="grid h-10 w-10 place-items-center rounded-xl"
          style={{ background: `${accent}1a`, color: accent }}
        >
          <Icon name={icon} size={20} />
        </span>
        {hint && <span className="text-xs font-medium text-ink-400">{hint}</span>}
      </div>
      <div className="mt-3 text-2xl font-extrabold text-ink-900">{value}</div>
      <div className="text-sm text-ink-500">{label}</div>
    </div>
  )
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const c = severityColor[severity]
  return (
    <span className={clsx('chip', c.bg, c.text)}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', c.dot)} />
      {titleCase(severity)}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    analyzing: 'bg-ink-100 text-ink-600',
    ai_complete: 'bg-brand-50 text-brand-700',
    doctor_review: 'bg-amber-50 text-amber-700',
    pharmacist_review: 'bg-purple-50 text-purple-700',
    auto_resolved: 'bg-teal-50 text-teal-700',
    reviewed: 'bg-emerald-50 text-emerald-700',
  }
  return (
    <span className={clsx('chip', map[status] ?? 'bg-ink-100 text-ink-600')}>
      {statusLabel[status] ?? status}
    </span>
  )
}

export function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-teal-500"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-xs font-bold text-ink-700">{value}%</span>
    </div>
  )
}

export function Avatar({
  name,
  color,
  size = 36,
}: {
  name: string
  color: string
  size?: number
}) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ background: color, width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  )
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: string
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-ink-400 shadow-sm">
        <Icon name={icon} size={22} />
      </span>
      <p className="mt-3 font-semibold text-ink-700">{title}</p>
      {subtitle && <p className="mt-1 max-w-sm text-sm text-ink-500">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Pill({
  children,
  color = '#1b81f5',
}: {
  children: ReactNode
  color?: string
}) {
  return (
    <span
      className="chip"
      style={{ background: `${color}14`, color }}
    >
      {children}
    </span>
  )
}
