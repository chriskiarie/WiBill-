'use client'
import { useEffect, useState, useCallback } from 'react'
import AdminLayout from '../layout'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Invoice {
  tenant_id: string
  tenant_name: string
  tenant_slug: string
  is_active: boolean
  status: string
  invoice_status: string
  monthly_fee_ksh: number | null
  next_invoice_date: string | null
  last_paid_date: string | null
  avg_days_punctual: number | null
}

const statusColors: Record<string, string> = {
  active: '#1A6B3C',
  overdue: '#B8860B',
  paused: '#8B3A3A',
}

const statusText: Record<string, string> = {
  active: 'Active',
  overdue: 'Overdue',
  paused: 'Paused',
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')

  const fetchInvoices = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/admin/invoices`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (r.ok) setInvoices(await r.json())
    } catch {} finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    const t = localStorage.getItem('wb_token') || ''
    setToken(t)
  }, [])

  useEffect(() => {
    if (token) fetchInvoices()
  }, [token, fetchInvoices])

  const markPaid = async (tenantId: string, fee: number) => {
    await fetch(`${API}/api/admin/invoices/${tenantId}/mark-paid`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ monthly_fee_ksh: fee }),
    })
    fetchInvoices()
  }

  const setStatus = async (tenantId: string, invoiceStatus: string) => {
    await fetch(`${API}/api/admin/invoices/${tenantId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ invoice_status: invoiceStatus }),
    })
    fetchInvoices()
  }

  return (
    <AdminLayout>
      <div style={{ padding: '32px 40px', color: '#EDEBE6', fontFamily: 'Inter, sans-serif' }}>
        <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 24, fontWeight: 700, margin: '0 0 8px', color: '#EDEBE6' }}>Invoices</h1>
        <p style={{ fontSize: 13, color: '#6B6964', margin: '0 0 32px' }}>
          Manage ISP subscription invoices and payment status
        </p>
        {loading ? (
          <div style={{ fontSize: 12, color: '#6B6964' }}>Loading...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1A1A18' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#8C8A84', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ISP</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#8C8A84', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#8C8A84', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invoice Status</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', color: '#8C8A84', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fee (KSH)</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', color: '#8C8A84', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Paid</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', color: '#8C8A84', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Punctual</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', color: '#8C8A84', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.tenant_id} style={{ borderBottom: '1px solid #1A1A18' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{inv.tenant_name}</div>
                    <div style={{ fontSize: 11, color: '#6B6964' }}>{inv.tenant_slug}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 10px', borderRadius: 6,
                      background: inv.is_active ? 'rgba(26,107,60,0.15)' : 'rgba(139,58,58,0.15)',
                      color: inv.is_active ? '#4ADE80' : '#E5707A',
                      fontSize: 12, fontWeight: 600,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: inv.is_active ? '#4ADE80' : '#E5707A' }} />
                      {inv.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 10px', borderRadius: 6,
                      background: `${statusColors[inv.invoice_status] || '#3A3A37'}22`,
                      color: statusColors[inv.invoice_status] || '#8C8A84',
                      fontSize: 12, fontWeight: 600,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColors[inv.invoice_status] || '#8C8A84' }} />
                      {statusText[inv.invoice_status] || inv.invoice_status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>
                    {inv.monthly_fee_ksh != null ? inv.monthly_fee_ksh.toLocaleString() : '-'}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 12, color: '#8C8A84' }}>
                    {inv.last_paid_date ? new Date(inv.last_paid_date).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, color: inv.avg_days_punctual != null && inv.avg_days_punctual <= 3 ? '#4ADE80' : '#E8B84B' }}>
                    {inv.avg_days_punctual != null ? `${inv.avg_days_punctual.toFixed(1)}d` : '-'}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          const fee = inv.monthly_fee_ksh || 0
                          markPaid(inv.tenant_id, fee)
                        }}
                        style={{
                          padding: '6px 12px', borderRadius: 6, border: '1px solid #1A6B3C',
                          background: 'transparent', color: '#4ADE80',
                          fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Mark Paid
                      </button>
                      {inv.invoice_status !== 'overdue' && (
                        <button
                          onClick={() => setStatus(inv.tenant_id, 'overdue')}
                          style={{
                            padding: '6px 12px', borderRadius: 6, border: '1px solid #B8860B',
                            background: 'transparent', color: '#E8B84B',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          Overdue
                        </button>
                      )}
                      {inv.invoice_status !== 'paused' ? (
                        <button
                          onClick={() => setStatus(inv.tenant_id, 'paused')}
                          style={{
                            padding: '6px 12px', borderRadius: 6, border: '1px solid #8B3A3A',
                            background: 'transparent', color: '#E5707A',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          Pause
                        </button>
                      ) : (
                        <button
                          onClick={() => setStatus(inv.tenant_id, 'active')}
                          style={{
                            padding: '6px 12px', borderRadius: 6, border: '1px solid #1A6B3C',
                            background: 'transparent', color: '#4ADE80',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          Resume
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#6B6964', fontSize: 13 }}>
                    No ISPs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  )
}
