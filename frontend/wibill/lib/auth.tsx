'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { login as apiLogin } from './api'

interface AuthCtx {
  token: string | null
  user: any | null
  role: string | null
  hydrated: boolean
  login: (email: string, pass: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthCtx>({} as AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const t = localStorage.getItem('wb_token')
    const u = localStorage.getItem('wb_user')
    const r = localStorage.getItem('wb_role')
    if (t) {
      setToken(t)
      setUser(u ? JSON.parse(u) : null)
      setRole(r)
    }
    setHydrated(true) // always set true after reading localStorage
  }, [])

  const login = async (email: string, pass: string) => {
    const data = await apiLogin(email, pass)
    localStorage.setItem('wb_token', data.access_token)
    localStorage.setItem('wb_role', data.role)
    localStorage.setItem('wb_user', JSON.stringify({
      email,
      role: data.role,
      tenant_id: data.tenant_id,
      tenant: data.tenant,
      isp_name: data.tenant?.name || email.split('@')[0],
    }))
    // Also set in sessionStorage for dashboard to read (using expected keys)
    sessionStorage.setItem('token', data.access_token)
    sessionStorage.setItem('role', data.role)
    setToken(data.access_token)
    setRole(data.role)
    setUser({ email, role: data.role, tenant_id: data.tenant_id, isp_name: data.tenant?.name })
    router.push('/dashboard')
  }

  const logout = () => {
    localStorage.clear()
    setToken(null)
    setUser(null)
    setRole(null)
    router.push('/login')
  }

  return (
    <Ctx.Provider value={{ token, user, role, hydrated, login, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)