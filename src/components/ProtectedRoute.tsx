import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { Role } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { roleHome } from '@/lib/roles'

export function ProtectedRoute({
  role,
  children,
}: {
  role: Role
  children: ReactNode
}) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  if (user.role !== role) {
    return <Navigate to={roleHome[user.role]} replace />
  }
  return <>{children}</>
}
