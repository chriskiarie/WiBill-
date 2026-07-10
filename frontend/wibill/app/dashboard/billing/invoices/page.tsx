'use client'
import { useAuth } from '@/lib/auth'
import { useCallback, useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/context/ToastContext'
import { api } from '@/lib/api'
import { PaymentDialog } from '@/components/PaymentDialog'

const C = {
  void: 'var(--theme-bg)', base: 'var(--theme-card-base)', surface: 'var(--theme-surface)',
  border: 'var(--theme-border)', border2: 'var(--theme-border2)',
  text: 'var(--theme-text)', dim: 'var(--theme-dim)', mute: 'var(--theme-mute)', faint: 'var(--theme-faint)',
  gold: 'var(--theme-gold)', green: 'var(--theme-green)', red: 'var(--theme-red)',
}

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
      case 'paid':     return { bg: 'rgba(34,197,94,0.08)', color: C.green, label: 'Paid' }
      case 'due':      return { bg: 'rgba(232,184,75,0.08)', color: C.gold, label: 'Due' }
      case 'overdue':  return { bg: 'rgba(239,68,68,0.08)', color: C.red, label: 'Overdue' }
      case 'sent':     return { bg: 'var(--theme-surface)', color: C.gold, label: 'Sent' }
      default:         return { bg: C.surface, color: C.dim, label: status }
    }
  }

  const isPayable = (status: string) => ['due', 'overdue', 'sent'].includes(status)

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
  const formatKsh = (n: number) => n?.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Invoice History" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: C.void }}>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['all', 'paid', 'due', 'overdue'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: filter === f ? C.gold : C.base,
                border: filter === f ? `0.5px solid ${C.gold}` : `0.5px solid ${C.border2}`,
                color: filter === f ? '#fff' : C.dim, textTransform: 'capitalize'
              }}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        {loading && <LoadingSpinner size="md" label="Loading invoices…" />}

        {error && !loading && (
          <div style={{ padding: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: C.red, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button onClick={fetchInvoices} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', padding: '4px 12px' }}>Retry</button>
          </div>
        )}

        {!loading && invoices.length > 0 && (
          <div style={{ background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 11, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr 1.4fr', borderBottom: `0.5px solid ${C.border}`, background: C.base }}>
              {['Invoice', 'Period', 'Amount', 'Status', 'Actions'].map((h, i) => (
                <div key={i} style={{ padding: '11px 16px', fontSize: 9, fontWeight: 700, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            {invoices.map((inv, i) => {
              const s = getStatusStyle(inv.status)
              const payable = isPayable(inv.status) && inv.amount_due > 0
              return (
                <div key={inv.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr 1.4fr', borderBottom: i < invoices.length - 1 ? `0.5px solid ${C.base}` : 'none', alignItems: 'center' }}>

                  {/* Invoice number */}
                  <div style={{ padding: '13px 16px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: C.gold, fontWeight: 600 }}>
                    {inv.invoice_number}
                  </div>

                  {/* Period */}
                  <div style={{ padding: '13px 16px', fontSize: 11, color: C.dim }}>
                    {new Date(0, inv.month - 1).toLocaleString('default', { month: 'short' })} {inv.year}
                  </div>

                  {/* Amount */}
                  <div style={{ padding: '13px 16px', fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 600, color: C.text }}>
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
                          padding: '6px 12px', background: C.gold, border: 'none',
                          borderRadius: 5, color: '#000', fontSize: 10, fontWeight: 700,
                          cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.3px'
                        }}
                      >
                        Pay
                      </button>
                    )}
                    {inv.status === 'paid' && inv.mpesa_receipt && (
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: C.green, padding: '4px 8px', background: 'rgba(34,197,94,0.08)', borderRadius: 4 }}>
                        {inv.mpesa_receipt}
                      </div>
                    )}
                    <button
                      onClick={() => downloadPDF(inv.id, inv.invoice_number)}
                      style={{ padding: '6px 10px', background: C.base, border: `0.5px solid ${C.border2}`, borderRadius: 4, color: C.dim, fontSize: 9, fontWeight: 600, cursor: 'pointer' }}
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
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.dim }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14, marginBottom: 8, color: C.dim }}>No invoices found</div>
            <div style={{ fontSize: 12, color: C.dim }}>Invoices are generated on the 26th of each month</div>
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