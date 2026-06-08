'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface AuthCtx {
  token: string | null
  user: any | null
  role: string | null
  hydrated: boolean
  login: (username: string, password: string) => Promise<void>
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
    setHydrated(true)
  }, [])

  const login = async (username: string, password: string) => {
    // Call /api/auth/login with username + password (form-encoded)
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)

    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(typeof data.detail === 'string' ? data.detail : 'Login failed')
    }

    const data = await res.json()

    localStorage.setItem('wb_token', data.access_token)
    localStorage.setItem('wb_role', data.role)
    localStorage.setItem('wb_user', JSON.stringify({
      username,
      role: data.role,
      tenant_id: data.tenant_id,
    }))

    setToken(data.access_token)
    setRole(data.role)
    setUser({ username, role: data.role, tenant_id: data.tenant_id })

    // Check onboarding_complete to route appropriately
    try {
      const meRes = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${data.access_token}` }
      })
      if (meRes.ok) {
        const me = await meRes.json()
        // Route based on role and onboarding status
        if (data.role === 'platform_admin') {
          router.push('/admin')
        } else if (me.onboarding_complete === false) {
          router.push('/onboarding')
        } else {
          router.push('/dashboard')
        }
      } else {
        // Default routing
        if (data.role === 'platform_admin') {
          router.push('/admin')
        } else {
          router.push('/dashboard')
        }
      }
    } catch (err) {
      // Network error, default to dashboard
      if (data.role === 'platform_admin') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    }
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