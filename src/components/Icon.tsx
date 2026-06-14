import * as Lucide from 'lucide-react'
import type { LucideProps } from 'lucide-react'

type IconName = keyof typeof Lucide

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = (Lucide as Record<string, unknown>)[name] as
    | React.ComponentType<LucideProps>
    | undefined
  const Fallback = Lucide.Circle
  const Component = Cmp ?? Fallback
  return <Component {...props} />
}

export type { IconName }
