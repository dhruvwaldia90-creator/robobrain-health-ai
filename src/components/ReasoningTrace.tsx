import type { ReasoningStep } from '@/types'
import { Icon } from './Icon'

/**
 * Live "thinking" trace (#6). Renders agent reasoning steps as they stream in,
 * showing each agent's thought and output preview with a running/done state.
 */
export function ReasoningTrace({ steps }: { steps: ReasoningStep[] }) {
  if (steps.length === 0) return null
  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const running = s.status === 'running'
        return (
          <div
            key={`${s.agentId}-${i}`}
            className="flex items-start gap-3 rounded-xl border border-ink-100 px-3 py-2.5"
          >
            <span
              className={
                s.status === 'done'
                  ? 'text-emerald-500'
                  : running
                    ? 'text-brand-500'
                    : 'text-ink-300'
              }
            >
              <Icon
                name={s.status === 'done' ? 'CircleCheck' : running ? 'LoaderCircle' : 'Circle'}
                size={18}
                className={running ? 'animate-spin' : ''}
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={
                    s.status === 'pending'
                      ? 'text-sm text-ink-400'
                      : 'text-sm font-semibold text-ink-800'
                  }
                >
                  {s.agentName}
                </span>
                <span className="text-[11px] font-medium text-ink-400">{s.model}</span>
              </div>
              <p className="mt-0.5 text-xs text-ink-500">{s.thought}</p>
              {s.outputPreview && (
                <p className="mt-1 text-xs font-medium text-brand-700">{s.outputPreview}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
