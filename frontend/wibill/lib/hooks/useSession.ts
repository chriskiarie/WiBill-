'use client'
import { useState, useEffect, useCallback } from 'react'

export interface SessionData {
  id: string
  mac: string
  package?: string
  expires_at: string
  status: 'active' | 'expired' | 'terminated'
  amount_ksh?: number
  phone?: string
  created_at?: string
}

interface UseSessionResult {
  sessions: SessionData[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  kickSession: (id: string) => Promise<boolean>
  activeCount: number
  expiringCount: number
}

export function useSession(
  token: string | null,
  options: { status?: string; pollInterval?: number } = {}
): UseSessionResult {
  const { status = 'active', pollInterval = 30000 } = options

  const [sessions, setSessions] = useState<SessionData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const fetchSessions = useCallback(async () => {
    if (!token) return

    setLoading(true)
    try {
      const res = await fetch(`${API}/api/sessions?status=${status}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Failed to fetch sessions')

      const data = await res.json()
      setSessions(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      setError((err as Error)?.message || 'Error loading sessions')
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [token, status, API])

  const kickSession = useCallback(
    async (sessionId: string) => {
      try {
        const res = await fetch(`${API}/api/sessions/${sessionId}/terminate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) throw new Error('Failed to terminate session')

        setSessions(s => s.filter(x => x.id !== sessionId))
        return true
      } catch (err) {
        setError((err as Error)?.message || 'Failed to kick session')
        return false
      }
    },
    [token, API]
  )

  // Initial fetch
  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Polling
  useEffect(() => {
    if (!pollInterval || pollInterval < 5000) return

    const timer = setInterval(fetchSessions, pollInterval)
    return () => clearInterval(timer)
  }, [pollInterval, fetchSessions])

  // Calculate active/expiring
  const activeCount = sessions.filter(s => s.status === 'active').length
  const expiringCount = sessions.filter(s => {
    const diff = new Date(s.expires_at).getTime() - Date.now()
    return diff < 300000 && diff > 0 // 5 minutes
  }).length

  return {
    sessions,
    loading,
    error,
    refetch: fetchSessions,
    kickSession,
    activeCount,
    expiringCount,
  }
}
