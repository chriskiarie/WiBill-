'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

interface UseFetchOptions {
  autoLoad?: boolean
  retries?: number
  retryDelay?: number
  pollInterval?: number
}

interface UseFetchResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  isRetrying: boolean
}

export function useFetch<T>(
  url: string | null,
  token: string | null,
  options: UseFetchOptions = {}
): UseFetchResult<T> {
  const { autoLoad = true, retries = 3, retryDelay = 1000, pollInterval = 0 } = options
  
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  
  const retryCountRef = useRef(0)
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetch_data = useCallback(async (attempt = 0): Promise<void> => {
    if (!url || !token) return

    setLoading(true)
    if (attempt > 0) setIsRetrying(true)

    try {
      abortControllerRef.current = new AbortController()
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: abortControllerRef.current.signal,
      })

      if (!res.ok) {
        if (res.status === 401) {
          setError('Unauthorized - Please log in again')
          return
        }
        throw new Error(`HTTP ${res.status}`)
      }

      const result = await res.json()
      setData(result)
      setError(null)
      retryCountRef.current = 0
    } catch (err: any) {
      if (err.name === 'AbortError') return

      const msg = err?.message || 'Failed to fetch'
      
      if (attempt < retries) {
        setIsRetrying(true)
        setTimeout(() => fetch_data(attempt + 1), retryDelay * Math.pow(2, attempt))
      } else {
        setError(msg)
        setIsRetrying(false)
      }
    } finally {
      setLoading(false)
    }
  }, [url, token, retries, retryDelay])

  // Auto-load on mount
  useEffect(() => {
    if (!autoLoad || !url || !token) return
    fetch_data()
  }, [autoLoad, url, token, fetch_data])

  // Polling
  useEffect(() => {
    if (!pollInterval || pollInterval < 1000 || !url || !token) return

    pollTimerRef.current = setInterval(() => {
      fetch_data()
    }, pollInterval)

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [pollInterval, url, token, fetch_data])

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
      }
    }
  }, [])

  return {
    data,
    loading,
    error,
    refetch: () => fetch_data(0),
    isRetrying,
  }
}