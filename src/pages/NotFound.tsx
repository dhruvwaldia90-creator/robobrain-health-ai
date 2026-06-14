import { Link } from 'react-router-dom'
import { Icon } from '@/components/Icon'

export function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 px-4">
      <div className="text-center">
        <span className="grid mx-auto h-16 w-16 place-items-center rounded-2xl bg-white text-brand-600 shadow-card">
          <Icon name="BrainCircuit" size={30} />
        </span>
        <h1 className="mt-6 text-5xl font-extrabold text-ink-900">404</h1>
        <p className="mt-2 text-ink-500">This page wandered off the care pathway.</p>
        <Link to="/" className="btn-primary mt-6">
          <Icon name="ArrowLeft" size={16} /> Back home
        </Link>
      </div>
    </div>
  )
}
