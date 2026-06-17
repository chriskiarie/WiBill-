'use client'
import { useEffect, useState, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const C = {
  text: '#EDEBE6', dim: '#8C8A84', mute: '#6B6964', faint: '#3A3A37',
  gold: '#E8B84B', green: '#6FCF73', red: '#E5707A',
}

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

type Filter = 'all' | 'paid' | 'pending' | 'overdue' | 'trial'

const statusConfig: Record<string, { label: string; dot: string; bg: string; border: string }> = {
  active: { label: 'Paid', dot: '#4ade80', bg: '#071a0f', border: '#0d3d1d' },
  pending: { label: 'Pending', dot: '#f59e0b', bg: '#1a1200', border: '#3a2800' },
  overdue: { label: 'Overdue', dot: '#ef4444', bg: '#1a0505', border: '#3d0d0d' },
  paused: { label: 'Paused', dot: '#ef4444', bg: '#1a0505', border: '#3d0d0d' },
}

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

function formatKsh(n: number | null) {
  if (n == null) return '—'
  return 'KSh ' + n.toLocaleString()
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')

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

  const toggleSuspension = async (tenantId: string, currentlyActive: boolean) => {
    await fetch(`${API}/api/tenants/${tenantId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active: !currentlyActive }),
    })
    fetchInvoices()
  }

  const filtered = invoices.filter(inv => {
    const st = inv.invoice_status || 'active'
    if (filter === 'paid' && st !== 'active') return false
    if (filter === 'pending' && st !== 'pending') return false
    if (filter === 'overdue' && st !== 'overdue' && st !== 'paused') return false
    if (filter === 'trial' && st !== 'trial') return false
    if (search && !inv.tenant_name.toLowerCase().includes(search.toLowerCase()) && !inv.tenant_slug.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const outstanding = invoices.filter(i => (i.invoice_status || 'active') !== 'active').reduce((s, i) => s + (i.monthly_fee_ksh || 0), 0)
  const overdue = invoices.filter(i => i.invoice_status === 'overdue' || i.invoice_status === 'paused').reduce((s, i) => s + (i.monthly_fee_ksh || 0), 0)
  const collected = invoices.filter(i => i.invoice_status === 'active' && i.last_paid_date).reduce((s, i) => s + (i.monthly_fee_ksh || 0), 0)
  const commission = collected * 0.1

  function PunctualityBar({ avg }: { avg: number | null }) {
    if (avg == null) return <span style={{ fontSize: 11, color: '#444' }}>n/a</span>
    const pct = Math.min(Math.max((30 - avg) / 30 * 100, 5), 100)
    const color = avg <= 3 ? '#4ade80' : avg <= 10 ? '#f59e0b' : '#ef4444'
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 60, height: 4, background: '#141414', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: color }} />
        </div>
        <span style={{ fontSize: 11, color }}>{avg.toFixed(0)}d</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: C.text, fontSize: 13 }}>
      {/* Top Bar */}
      <div style={{
        background: '#080808', borderBottom: `0.5px solid #141414`, padding: '0 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52, minHeight: 52,
      }}>
        <h1 style={{ fontSize: 16, fontWeight: 500, color: '#e8e8e8', margin: 0, fontFamily: '"Space Grotesk", sans-serif' }}>Invoices</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {[
            { label: 'Export CSV', icon: '⇩' },
            { label: 'Send reminders', icon: '✉' },
            { label: 'Create invoice', icon: '+', primary: true },
          ].map((btn, i) => (
            <button
              key={i}
              style={{
                background: btn.primary ? '#1a1200' : '#141414',
                border: `0.5px solid ${btn.primary ? '#3a2a00' : '#1e1e1e'}`,
                borderRadius: 6, padding: '7px 12px', fontSize: 11,
                color: btn.primary ? C.gold : '#777', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Inter, sans-serif',
              }}
            >
              <span style={{ fontSize: 13 }}>{btn.icon}</span>
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Strip */}
      <div style={{ display: 'flex', borderBottom: `0.5px solid #141414`, background: '#050505' }}>
        {[
          { label: 'Outstanding', value: formatKsh(outstanding), sub: `${invoices.filter(i => (i.invoice_status || 'active') !== 'active').length} ISP${invoices.filter(i => (i.invoice_status || 'active') !== 'active').length !== 1 ? 's' : ''} unpaid`, cls: 'warn' },
          { label: 'Overdue', value: formatKsh(overdue), sub: `${invoices.filter(i => i.invoice_status === 'overdue' || i.invoice_status === 'paused').length} ISP >30 days`, cls: 'danger' },
          { label: 'Collected (June)', value: formatKsh(collected), sub: `${invoices.filter(i => i.invoice_status === 'active' && i.last_paid_date).length} payments received`, cls: 'ok' },
          { label: 'Your 10% fee', value: formatKsh(commission), sub: 'Commission this month', cls: 'gold' },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, padding: '16px 24px',
            borderRight: i < 3 ? `0.5px solid #141414` : 'none',
          }}>
            <div style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{s.label}</div>
            <div style={{
              fontSize: 22, fontWeight: 500, fontFamily: '"DM Mono", monospace',
              color: s.cls === 'warn' ? '#f59e0b' : s.cls === 'danger' ? C.red : s.cls === 'ok' ? '#4ade80' : C.gold,
            }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Filter Row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 24px', borderBottom: `0.5px solid #141414`, background: '#050505',
      }}>
        <input
          type="text" placeholder="🔍  Search ISP or account…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: '#0d0d0d', border: `0.5px solid #1e1e1e`, borderRadius: 6,
            padding: '7px 12px', fontSize: 12, color: '#ccc', outline: 'none', width: 220,
            fontFamily: 'Inter, sans-serif',
          }}
        />
        {(['all', 'paid', 'pending', 'overdue', 'trial'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 11,
              border: `0.5px solid ${filter === f ? '#3a2a00' : '#1e1e1e'}`,
              background: filter === f ? '#1a1200' : 'transparent',
              color: filter === f ? C.gold : '#555', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#444' }}>{filtered.length} ISP{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#444', fontSize: 12 }}>Loading...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['ISP', 'Account / Plan', 'Status', 'Fee (KSh)', 'Last paid', 'Punctuality', ''].map(h => (
                  <th key={h} style={{
                    padding: '11px 20px', fontSize: 10, color: '#444', textTransform: 'uppercase',
                    letterSpacing: '0.08em', textAlign: 'left', borderBottom: `0.5px solid #141414`,
                    background: '#050505', position: 'sticky', top: 0, fontWeight: 400,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => {
                const st = inv.invoice_status || 'active'
                const cfg = statusConfig[st] || statusConfig.active
                const isUnpaid = st === 'pending' || st === 'overdue' || st === 'paused'
                return (
                  <tr key={inv.tenant_id} style={{ borderBottom: `0.5px solid #0e0e0e`, transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#080808'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 6, background: '#1a1a0a',
                          border: '0.5px solid #2a2a14', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 10, fontWeight: 500, color: C.gold, flexShrink: 0,
                        }}>{initials(inv.tenant_name)}</div>
                        <div>
                          <div style={{ fontSize: 12, color: '#ddd', fontWeight: 500 }}>{inv.tenant_name}</div>
                          <div style={{ fontSize: 10, color: '#444', marginTop: 1 }}>{inv.tenant_slug}.wi-bill.co.ke</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 11, color: '#888' }}>Standard · 1,000 users</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 9px', borderRadius: 4, fontSize: 11, fontWeight: 500,
                        background: cfg.bg, color: cfg.dot, border: `0.5px solid ${cfg.border}`,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, fontSize: 11 }} />
                        {st === 'active' ? 'Paid' : st === 'overdue' ? 'Overdue' : st === 'paused' ? 'Paused' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ fontFamily: '"DM Mono", monospace', fontSize: 12 }}>
                      {inv.monthly_fee_ksh != null ? inv.monthly_fee_ksh.toLocaleString() : '—'}
                    </td>
                    <td>
                      <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 12, color: st === 'overdue' || st === 'paused' ? C.red : '#555' }}>
                        {inv.last_paid_date ? new Date(inv.last_paid_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '—'}
                      </span>
                    </td>
                    <td><PunctualityBar avg={inv.avg_days_punctual} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        {isUnpaid && (
                          <button
                            onClick={() => markPaid(inv.tenant_id, inv.monthly_fee_ksh || 0)}
                            style={{
                              background: 'transparent', border: `0.5px solid #0d3d1d`,
                              borderRadius: 5, padding: '5px 10px', fontSize: 11,
                              color: '#4ade80', cursor: 'pointer',
                            }}
                          >✓ Mark Paid</button>
                        )}
                        {st === 'active' && (
                          <button
                            onClick={() => setStatus(inv.tenant_id, 'overdue')}
                            style={{
                              background: '#0e0a00', border: `0.5px solid #3a2800`,
                              borderRadius: 5, padding: '5px 10px', fontSize: 11,
                              color: '#f59e0b', cursor: 'pointer',
                            }}
                          >◷ Overdue</button>
                        )}
                        {(st === 'active' || st === 'overdue') && (
                          <button
                            onClick={() => setStatus(inv.tenant_id, st === 'active' ? 'paused' : 'active')}
                            style={{
                              background: 'transparent',
                              border: `0.5px solid ${st === 'active' ? '#3d0d0d' : '#0d3d1d'}`,
                              borderRadius: 5, padding: '5px 10px', fontSize: 11,
                              color: st === 'active' ? C.red : '#4ade80', cursor: 'pointer',
                            }}
                          >{st === 'active' ? '◉ Pause' : '▶ Resume'}</button>
                        )}
                        <button
                          onClick={() => toggleSuspension(inv.tenant_id, inv.is_active)}
                          style={{
                            background: 'transparent',
                            border: `0.5px solid ${inv.is_active ? '#3d0d0d' : '#0d3d1d'}`,
                            borderRadius: 5, padding: '5px 10px', fontSize: 11,
                            color: inv.is_active ? C.red : '#4ade80', cursor: 'pointer',
                          }}
                        >{inv.is_active ? '◉ Suspend' : '▶ Activate'}</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 80, color: '#333' }}>
                    <div style={{ fontSize: 12 }}>No ISPs match this filter.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Table Footer */}
      <div style={{
        borderTop: `0.5px solid #141414`, padding: '11px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 11, color: '#444', background: '#050505',
      }}>
        <span>Showing {filtered.length} of {invoices.length} ISPs · June 2026</span>
        <span>Platform commission: <strong style={{ color: C.gold, fontFamily: '"DM Mono", monospace' }}>{formatKsh(commission)}</strong></span>
      </div>
    </div>
  )
}
