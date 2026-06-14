'use client'
import { useState, useEffect, useCallback } from 'react'

export interface TransactionData {
  id: string
  phone_number: string  // ← FIXED: was 'phone', should be 'phone_number'
  package: string
  amount_ksh: number
  isp_earnings_ksh: number
  platform_fee_ksh: number
  status: 'pending' | 'success' | 'failed'
  created_at: string
  mpesa_receipt?: string  // ← FIXED: was 'mpesa_ref', should be 'mpesa_receipt'
}

interface UseTransactionsResult {
  transactions: TransactionData[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  page: number
  setPage: (page: number) => void
  totalCount: number
  pageSize: number
}

export function useTransactions(
  token: string | null,
  options: { pageSize?: number; pollInterval?: number } = {}
): UseTransactionsResult {
  const { pageSize = 10, pollInterval = 0 } = options

  const [transactions, setTransactions] = useState<TransactionData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const fetchTransactions = useCallback(async () => {
    if (!token) return

    setLoading(true)
    try {
      const skip = (page - 1) * pageSize
      const res = await fetch(
        `${API}/api/transactions?skip=${skip}&limit=${pageSize}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!res.ok) throw new Error('Failed to fetch transactions')

      const data = await res.json()
      
      // Handle both array and object with items + total
      if (Array.isArray(data)) {
        setTransactions(data)
        setTotalCount(data.length)
      } else if (data.items && Array.isArray(data.items)) {
        setTransactions(data.items)
        setTotalCount(data.total || data.items.length)
      } else {
        setTransactions([])
        setTotalCount(0)
      }
      
      setError(null)
    } catch (err) {
      setError((err as Error)?.message || 'Error loading transactions')
      setTransactions([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [token, page, pageSize, API])

  // Initial fetch
  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Polling
  useEffect(() => {
    if (!pollInterval || pollInterval < 5000) return

    const timer = setInterval(fetchTransactions, pollInterval)
    return () => clearInterval(timer)
  }, [pollInterval, fetchTransactions])

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
    page,
    setPage,
    totalCount,
    pageSize,
  }
}