import { formatDistanceToNow } from 'date-fns'
import type { Severity } from '@/types'

export const timeAgo = (iso: string) => {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true })
  } catch {
    return iso
  }
}

export const severityColor: Record<Severity, { text: string; bg: string; dot: string; hex: string }> = {
  low: { text: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500', hex: '#10b981' },
  moderate: { text: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500', hex: '#f59e0b' },
  high: { text: 'text-orange-700', bg: 'bg-orange-50', dot: 'bg-orange-500', hex: '#f97316' },
  critical: { text: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500', hex: '#ef4444' },
}

export const statusLabel: Record<string, string> = {
  analyzing: 'Analyzing',
  ai_complete: 'AI Complete',
  doctor_review: 'Awaiting Doctor',
  pharmacist_review: 'Pharmacist Review',
  auto_resolved: 'Auto-resolved',
  reviewed: 'Reviewed',
}

export const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
