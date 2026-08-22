import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Role, User } from '@/types'
import { DEMO_USERS } from '@/lib/data'

interface AuthState {
  user: User | null
  login: (email: string, password: string) => { ok: boolean; error?: string }
  loginAs: (role: Role) => void
  logout: () => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

const SESSION_KEY = 'robobrain.session.v1'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (!raw) return null
      const id = JSON.parse(raw) as string
      return DEMO_USERS.find((u) => u.id === id) ?? null
    } catch {
      return null
    }
  })

  useEffect(() => {
    try {
      if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user.id))
      else localStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
  }, [user])

  const value = useMemo<AuthState>(
    () => ({
      user,
      login(email, password) {
        const found = DEMO_USERS.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
        )
        if (!found) return { ok: false, error: 'No account found for that email.' }
        if (found.password !== password) return { ok: false, error: 'Incorrect password.' }
        setUser(found)
        return { ok: true }
      },
      loginAs(role) {
        const found = DEMO_USERS.find((u) => u.role === role)
        if (found) setUser(found)
      },
      logout() {
        setUser(null)
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
