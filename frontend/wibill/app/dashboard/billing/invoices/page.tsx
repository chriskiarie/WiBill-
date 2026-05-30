'use client'
import { useAuth } from '@/lib/auth'
import { useCallback, useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/context/ToastContext'
import { api } from '@/lib/api'
import { PaymentDialog } from '@/components/PaymentDialog'

export default function InvoicesPage() {
  const { token } = useAuth()
  const { showToast } = useToast()

  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')

  // Payment dialog state
  const [payingInvoice, setPayingInvoice] = useState<{ id: string; amount: number } | null>(null)

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getInvoices(filter !== 'all' ? filter : undefined)
      setInvoices(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices')
      showToast('Failed to load invoices', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [token, filter])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const downloadPDF = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to download')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoiceNumber}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      showToast('PDF downloaded', { type: 'success' })
    } catch {
      showToast('Failed to download PDF', { type: 'error' })
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'paid':     return { bg: '#1a3a1a', color: '#22c55e', label: 'Paid' }
      case 'due':      return { bg: '#3a2a1a', color: '#f59e0b', label: 'Due' }
      case 'overdue':  return { bg: '#3a1a1a', color: '#ff6b6b', label: 'Overdue' }
      case 'sent':     return { bg: '#1a2a3a', color: '#3b82f6', label: 'Sent' }
      default:         return { bg: '#1a1a1a', color: '#9ca3af', label: status }
    }
  }

  const isPayable = (status: string) => ['due', 'overdue', 'sent'].includes(status)

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
  const formatKsh = (n: number) => n?.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Invoice History" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: '#030303' }}>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['all', 'paid', 'due', 'overdue'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: filter === f ? '#3b82f6' : '#0a0a0a',
                border: filter === f ? '0.5px solid #3b82f6' : '0.5px solid #1a1a1a',
                color: filter === f ? '#fff' : '#555', textTransform: 'capitalize'
              }}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        {loading && <LoadingSpinner size="md" label="Loading invoices…" />}

        {error && !loading && (
          <div style={{ padding: 12, background: '#3a1a1a', border: '1px solid #5a2d2d', borderRadius: 6, color: '#ff6b6b', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button onClick={fetchInvoices} style={{ background: 'none', border: 'none', color: '#ff8787', cursor: 'pointer', padding: '4px 12px' }}>Retry</button>
          </div>
        )}

        {!loading && invoices.length > 0 && (
          <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr 1.4fr', borderBottom: '0.5px solid #101010', background: '#0a0a0a' }}>
              {['Invoice', 'Period', 'Amount', 'Status', 'Actions'].map((h, i) => (
                <div key={i} style={{ padding: '11px 16px', fontSize: 9, fontWeight: 700, color: '#2a2a2a', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            {invoices.map((inv, i) => {
              const s = getStatusStyle(inv.status)
              const payable = isPayable(inv.status) && inv.amount_due > 0
              return (
                <div key={inv.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr 1.4fr', borderBottom: i < invoices.length - 1 ? '0.5px solid #0a0a0a' : 'none', alignItems: 'center' }}>

                  {/* Invoice number */}
                  <div style={{ padding: '13px 16px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>
                    {inv.invoice_number}
                  </div>

                  {/* Period */}
                  <div style={{ padding: '13px 16px', fontSize: 11, color: '#666' }}>
                    {new Date(0, inv.month - 1).toLocaleString('default', { month: 'short' })} {inv.year}
                  </div>

                  {/* Amount */}
                  <div style={{ padding: '13px 16px', fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 600, color: '#e0e0e0' }}>
                    Ksh {formatKsh(inv.amount_due)}
                  </div>

                  {/* Status badge */}
                  <div style={{ padding: '8px 12px' }}>
                    <div style={{ padding: '4px 8px', background: s.bg, borderRadius: 4, fontSize: 9, fontWeight: 700, color: s.color, textTransform: 'uppercase', textAlign: 'center' }}>
                      {s.label}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ padding: '10px 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
                    {payable && (
                      <button
                        onClick={() => setPayingInvoice({ id: inv.id, amount: inv.amount_due })}
                        style={{
                          padding: '6px 12px', background: '#3b82f6', border: 'none',
                          borderRadius: 5, color: '#030303', fontSize: 10, fontWeight: 700,
                          cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.3px'
                        }}
                      >
                        Pay
                      </button>
                    )}
                    {inv.status === 'paid' && inv.mpesa_receipt && (
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#22c55e', padding: '4px 8px', background: '#1a3a1a', borderRadius: 4 }}>
                        {inv.mpesa_receipt}
                      </div>
                    )}
                    <button
                      onClick={() => downloadPDF(inv.id, inv.invoice_number)}
                      style={{ padding: '6px 10px', background: '#0a0a0a', border: '0.5px solid #1a1a1a', borderRadius: 4, color: '#555', fontSize: 9, fontWeight: 600, cursor: 'pointer' }}
                    >
                      PDF
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && invoices.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#333' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14, marginBottom: 8, color: '#444' }}>No invoices found</div>
            <div style={{ fontSize: 12, color: '#333' }}>Invoices are generated on the 26th of each month</div>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      {payingInvoice && token && (
        <PaymentDialog
          invoiceId={payingInvoice.id}
          amount={payingInvoice.amount}
          token={token}
          onClose={() => setPayingInvoice(null)}
          onSuccess={() => {
            setPayingInvoice(null)
            fetchInvoices()
            showToast('Invoice marked as paid', { type: 'success' })
          }}
        />
      )}
    </div>
  )
}