import { useState, useCallback, useEffect } from 'react'

export interface Invoice {
  id: string
  month: number
  year: number
  invoice_number: string
  gross_revenue: number
  platform_fee: number
  isp_earnings: number
  amount_due: number
  issued_date: string
  due_date: string
  paid_date: string | null
  status: 'draft' | 'sent' | 'due' | 'overdue' | 'paid' | 'cancelled'
  payment_method?: string
  mpesa_receipt?: string
}

export interface InvoiceStatus {
  status: 'none' | 'draft' | 'sent' | 'due' | 'overdue' | 'paid'
  invoice_id: string | null
  amount_due: number
  due_date: string | null
  days_left: number | null
  days_overdue?: number | null
  is_locked: boolean
  locked_reason: string | null
  paid_date?: string | null
}

interface UseInvoicesOptions {
  pollInterval?: number
  autoRefresh?: boolean
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function apiRequest<T>(
  path: string,
  token: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<T> {
  const url = `${API_BASE}${path}`
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(url, options)

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export function useInvoices(
  token: string,
  options: UseInvoicesOptions = {}
) {
  const { pollInterval = 60000, autoRefresh = true } = options

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [currentStatus, setCurrentStatus] = useState<InvoiceStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all invoices
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiRequest<Invoice[]>('/api/invoices', token)
      setInvoices(Array.isArray(data) ? data : [])
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch invoices'
      setError(errorMsg)
      console.error('fetchInvoices error:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  // Fetch current status
  const fetchCurrentStatus = useCallback(async () => {
    try {
      const data = await apiRequest<InvoiceStatus>('/api/invoices/current-status', token)
      setCurrentStatus(data)
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch status'
      setError(errorMsg)
      console.error('fetchCurrentStatus error:', err)
    }
  }, [token])

  // Get single invoice
  const getInvoice = useCallback(
    async (invoiceId: string) => {
      try {
        return await apiRequest<Invoice>(`/api/invoices/${invoiceId}`, token)
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to fetch invoice'
        setError(errorMsg)
        console.error('getInvoice error:', err)
        return null
      }
    },
    [token]
  )

  // Download PDF
  const downloadPdf = useCallback(
    async (invoiceId: string) => {
      try {
        const response = await fetch(`${API_BASE}/api/invoices/${invoiceId}/pdf`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!response.ok) throw new Error('Failed to download PDF')
        return await response.blob()
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to download PDF'
        setError(errorMsg)
        console.error('downloadPdf error:', err)
        return null
      }
    },
    [token]
  )

  // Mark as paid
  const markAsPaid = useCallback(
    async (invoiceId: string, mpesaReceipt: string, paymentMethod: string = 'mpesa') => {
      try {
        const result = await apiRequest<any>(
          `/api/invoices/${invoiceId}/pay`,
          token,
          'POST',
          { mpesa_receipt: mpesaReceipt, payment_method: paymentMethod }
        )
        // Refresh both invoices and status
        await fetchInvoices()
        await fetchCurrentStatus()
        return result
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to process payment'
        setError(errorMsg)
        console.error('markAsPaid error:', err)
        throw err
      }
    },
    [token, fetchInvoices, fetchCurrentStatus]
  )

  // Initial fetch
  useEffect(() => {
    if (!token) return
    fetchInvoices()
    fetchCurrentStatus()
  }, [token, fetchInvoices, fetchCurrentStatus])

  // Auto-refresh polling
  useEffect(() => {
    if (!autoRefresh || !token) return

    const interval = setInterval(() => {
      fetchCurrentStatus()
    }, pollInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, pollInterval, fetchCurrentStatus, token])

  return {
    invoices,
    currentStatus,
    loading,
    error,
    refetch: fetchInvoices,
    refetchStatus: fetchCurrentStatus,
    getInvoice,
    downloadPdf,
    markAsPaid,
  }
}