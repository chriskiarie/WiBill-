'use client'
import { useState, useEffect, useCallback } from 'react'

export interface NetworkStatus {
  status: 'up' | 'down' | 'degraded'
  latency_ms: number
  timestamp: string
  mikrotik_online: boolean
  active_users: number
  upload_speed: number
  download_speed: number
}

interface UseNetworkStatusResult {
  status: NetworkStatus | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  isHealthy: boolean
}

export function useNetworkStatus(
  token: string | null,
  options: { pollInterval?: number } = {}
): UseNetworkStatusResult {
  const { pollInterval = 30000 } = options

  const [status, setStatus] = useState<NetworkStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const API = ""

  const fetchStatus = useCallback(async () => {
    if (!token) return

    setLoading(true)
    try {
      const res = await fetch(`${API}/health`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Failed to fetch network status')

      const data = await res.json()
      setStatus({
        status: data.status || 'down',
        latency_ms: data.latency_ms || 0,
        timestamp: new Date().toISOString(),
        mikrotik_online: data.mikrotik_online || false,
        active_users: data.active_users || 0,
        upload_speed: data.upload_speed || 0,
        download_speed: data.download_speed || 0,
      })
      setError(null)
    } catch (err) {
      setError((err as Error)?.message || 'Error loading network status')
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [token, API])

  // Initial fetch
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Polling
  useEffect(() => {
    if (!pollInterval || pollInterval < 5000) return

    const timer = setInterval(fetchStatus, pollInterval)
    return () => clearInterval(timer)
  }, [pollInterval, fetchStatus])

  const isHealthy = status?.status === 'up' && status?.latency_ms < 100

  return {
    status,
    loading,
    error,
    refetch: fetchStatus,
    isHealthy,
  }
}

