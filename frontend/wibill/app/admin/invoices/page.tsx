'use client'
import { useEffect, useState, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const C = {
  black: '#000', card: '#0D0D0B', line: '#1A1A18', border: '#2A2A27',
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
  pending: { label: 'Pending', dot: C.gold, bg: `${C.gold}14`, border: `${C.gold}33` },
  overdue: { label: 'Overdue', dot: '#ef4444', bg: '#1a0505', border: '#3d0d0d' },
  paused: { label: 'Paused', dot: '#ef4444', bg: '#1a0505', border: '#3d0d0d' },
}

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

function formatKsh(n: number | null) {
  if (n == null) return '—'
  return 'KSh ' + n.toLocaleString()
}

const TOAST_DURATION = 4000

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Create invoice modal
  const [showCreate, setShowCreate] = useState(false)
  const [createTenantId, setCreateTenantId] = useState('')
  const [createFee, setCreateFee] = useState(1000)
  const [createDue, setCreateDue] = useState(30)
  const [creating, setCreating] = useState(false)

  // Send reminder state
  const [sendingReminder, setSendingReminder] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), TOAST_DURATION)
  }

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
    try {
      const r = await fetch(`${API}/api/admin/invoices/${tenantId}/mark-paid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ monthly_fee_ksh: fee }),
      })
      if (r.ok) { showToast('Invoice marked as paid', true); fetchInvoices() }
      else { const d = await r.json(); showToast(d.detail || 'Failed', false) }
    } catch { showToast('Network error', false) }
  }

  const setStatus = async (tenantId: string, invoiceStatus: string) => {
    try {
      const r = await fetch(`${API}/api/admin/invoices/${tenantId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ invoice_status: invoiceStatus }),
      })
      if (r.ok) { showToast(`Status changed to ${invoiceStatus}`, true); fetchInvoices() }
      else { const d = await r.json(); showToast(d.detail || 'Failed', false) }
    } catch { showToast('Network error', false) }
  }

  // ── Export CSV ──
  const exportCsv = () => {
    const headers = ['ISP', 'Slug', 'Status', 'Invoice Status', 'Fee (KSh)', 'Last Paid', 'Next Invoice', 'Avg Punctuality (days)']
    const rows = invoices.map(i => [
      i.tenant_name, i.tenant_slug, i.status, i.invoice_status,
      i.monthly_fee_ksh ?? '', i.last_paid_date || '', i.next_invoice_date || '', i.avg_days_punctual ?? '',
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
    showToast('CSV exported', true)
  }

  // ── Send reminders ──
  const sendReminders = async () => {
    setSendingReminder(true)
    try {
      const r = await fetch(`${API}/api/admin/invoices/send-reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      if (r.ok) {
        const d = await r.json()
        showToast(`Reminders sent: ${d.sent} delivered, ${d.failed} failed`, d.failed === 0)
      } else { const d = await r.json(); showToast(d.detail || 'Failed', false) }
    } catch { showToast('Network error', false) }
    finally { setSendingReminder(false) }
  }

  // ── Send single invoice email ──
  const sendInvoiceEmail = async (tenantId: string) => {
    try {
      const r = await fetch(`${API}/api/admin/invoices/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tenant_id: tenantId }),
      })
      if (r.ok) { const d = await r.json(); showToast(`Invoice sent to ${d.target}`, true) }
      else { const d = await r.json(); showToast(d.detail || 'Failed', false) }
    } catch { showToast('Network error', false) }
  }

  // ── Create invoice ──
  const handleCreate = async () => {
    if (!createTenantId) { showToast('Select an ISP', false); return }
    setCreating(true)
    try {
      const r = await fetch(`${API}/api/admin/invoices/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tenant_id: createTenantId, monthly_fee_ksh: createFee, due_days: createDue }),
      })
      if (r.ok) {
        showToast('Invoice created', true)
        setShowCreate(false)
        fetchInvoices()
      } else { const d = await r.json(); showToast(d.detail || 'Failed', false) }
    } catch { showToast('Network error', false) }
    finally { setCreating(false) }
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

  return (
    <div style={{ background: C.black, color: C.text, fontSize: 13, padding: 'var(--space-lg)', width: '100%', minHeight: '100%' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          background: toast.ok ? '#0a2a0a' : '#2a0a0a', border: `0.5px solid ${toast.ok ? C.green : C.red}`,
          borderRadius: 8, padding: '10px 20px', fontSize: 12, color: toast.ok ? C.green : C.red,
          fontFamily: '"DM Mono", monospace',
        }}>{toast.msg}</div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
        <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: C.text }}>Invoices</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={exportCsv} style={{
            background: '#141414', border: `0.5px solid #1e1e1e`, borderRadius: 6, padding: '7px 12px', fontSize: 11,
            color: '#777', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Inter, sans-serif',
          }}>
            <span style={{ fontSize: 13 }}>⇩</span> Export CSV
          </button>
          <button onClick={sendReminders} disabled={sendingReminder} style={{
            background: '#141414', border: `0.5px solid #1e1e1e`, borderRadius: 6, padding: '7px 12px', fontSize: 11,
            color: sendingReminder ? '#555' : '#777', cursor: sendingReminder ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Inter, sans-serif', opacity: sendingReminder ? 0.5 : 1,
          }}>
            <span style={{ fontSize: 13 }}>✉</span> {sendingReminder ? 'Sending...' : 'Send reminders'}
          </button>
          <button onClick={() => setShowCreate(true)} style={{
            background: '#1a1200', border: `0.5px solid #3a2a00`, borderRadius: 6, padding: '7px 12px', fontSize: 11,
            color: C.gold, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Inter, sans-serif',
          }}>
            <span style={{ fontSize: 13 }}>+</span> Create invoice
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div style={{ display: 'flex', borderBottom: `0.5px solid ${C.border}`, background: C.card }}>
        {[
          { label: 'Outstanding', value: formatKsh(outstanding), sub: `${invoices.filter(i => (i.invoice_status || 'active') !== 'active').length} ISP${invoices.filter(i => (i.invoice_status || 'active') !== 'active').length !== 1 ? 's' : ''} unpaid`, cls: 'warn' },
          { label: 'Overdue', value: formatKsh(overdue), sub: `${invoices.filter(i => i.invoice_status === 'overdue' || i.invoice_status === 'paused').length} ISP >30 days`, cls: 'danger' },
          { label: 'Collected (June)', value: formatKsh(collected), sub: `${invoices.filter(i => i.invoice_status === 'active' && i.last_paid_date).length} payments received`, cls: 'ok' },
          { label: 'Your 10% fee', value: formatKsh(commission), sub: 'Commission this month', cls: 'gold' },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, padding: '16px 24px',
            borderRight: i < 3 ? `0.5px solid ${C.border}` : 'none',
          }}>
            <div style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{s.label}</div>
            <div style={{
              fontSize: 22, fontWeight: 500, fontFamily: '"DM Mono", monospace',
              color: s.cls === 'warn' ? C.gold : s.cls === 'danger' ? C.red : s.cls === 'ok' ? C.green : C.gold,
            }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Filter Row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 24px', borderBottom: `0.5px solid ${C.border}`, background: C.card,
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
              {filtered.map((inv) => {
                const st = inv.invoice_status || 'active'
                const cfg = statusConfig[st] || statusConfig.active
                const isUnpaid = st === 'pending' || st === 'overdue' || st === 'paused'
                const isExpanded = expandedId === inv.tenant_id
                return (
                  <>
                    <tr key={inv.tenant_id} style={{
                      borderBottom: `0.5px solid #0e0e0e`, transition: 'background 0.1s',
                      cursor: 'pointer',
                    }}
                      onClick={() => setExpandedId(isExpanded ? null : inv.tenant_id)}
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
                      <td>
                        {inv.avg_days_punctual != null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 60, height: 4, background: '#141414', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{
                                width: `${Math.min(Math.max((30 - inv.avg_days_punctual) / 30 * 100, 5), 100)}%`,
                                height: '100%', borderRadius: 2,
                                background: inv.avg_days_punctual <= 3 ? C.green : inv.avg_days_punctual <= 10 ? C.gold : C.red,
                              }} />
                            </div>
                            <span style={{ fontSize: 11, color: inv.avg_days_punctual <= 3 ? C.green : inv.avg_days_punctual <= 10 ? C.gold : C.red }}>
                              {inv.avg_days_punctual.toFixed(0)}d
                            </span>
                          </div>
                        ) : <span style={{ fontSize: 11, color: '#444' }}>n/a</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          {isUnpaid && (
                            <button
                              onClick={e => { e.stopPropagation(); markPaid(inv.tenant_id, inv.monthly_fee_ksh || 0) }}
                              style={{
                                background: 'transparent', border: `0.5px solid #0d3d1d`,
                                borderRadius: 5, padding: '5px 10px', fontSize: 11,
                                color: '#4ade80', cursor: 'pointer',
                              }}
                            >✓ Paid</button>
                          )}
                          {st === 'active' && (
                            <>
                              <button onClick={e => { e.stopPropagation(); setStatus(inv.tenant_id, 'overdue') }} style={{ background: 'none', border: '1px solid rgba(232,184,75,0.4)', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 500, color: '#E8B84B', cursor: 'pointer' }}>
                                ◷ Mark Overdue
                              </button>
                              <span style={{ background: 'none', border: '1px solid rgba(229,112,122,0.4)', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 500, color: '#E5707A', opacity: 0.3, cursor: 'not-allowed' }}>
                                ◉ Pause
                              </span>
                            </>
                          )}
                          {st === 'overdue' && (
                            <>
                              <span style={{ background: 'rgba(232,184,75,0.1)', border: '1px solid rgba(232,184,75,0.4)', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#E8B84B' }}>
                                ◷ Overdue
                              </span>
                              <button onClick={e => { e.stopPropagation(); setStatus(inv.tenant_id, 'paused') }} style={{ background: 'none', border: '1px solid rgba(229,112,122,0.4)', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 500, color: '#E5707A', cursor: 'pointer' }}>
                                ◉ Pause
                              </button>
                              <button onClick={e => { e.stopPropagation(); setStatus(inv.tenant_id, 'active') }} style={{ background: 'none', border: '1px solid rgba(111,207,115,0.4)', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 500, color: '#6FCF73', cursor: 'pointer' }}>
                                ▶ Activate
                              </button>
                            </>
                          )}
                          {st === 'paused' && (
                            <>
                              <span style={{ background: 'rgba(229,112,122,0.12)', border: '1px solid rgba(229,112,122,0.3)', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#E5707A' }}>
                                ◉ Paused
                              </span>
                              <button onClick={e => { e.stopPropagation(); setStatus(inv.tenant_id, 'active') }} style={{ background: 'none', border: '1px solid rgba(111,207,115,0.4)', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 500, color: '#6FCF73', cursor: 'pointer' }}>
                                ▶ Activate
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Expanded detail row */}
                    {isExpanded && (
                      <tr key={`${inv.tenant_id}-detail`} style={{ background: '#060606' }}>
                        <td colSpan={7} style={{ padding: '16px 20px 20px' }}>
                          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Next Invoice</div>
                              <div style={{ fontSize: 12, fontFamily: '"DM Mono", monospace' }}>
                                {inv.next_invoice_date ? new Date(inv.next_invoice_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Last Paid</div>
                              <div style={{ fontSize: 12, fontFamily: '"DM Mono", monospace' }}>
                                {inv.last_paid_date ? new Date(inv.last_paid_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Never'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Monthly Fee</div>
                              <div style={{ fontSize: 12, fontFamily: '"DM Mono", monospace', color: C.gold }}>
                                {formatKsh(inv.monthly_fee_ksh)}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Account Status</div>
                              <div style={{ fontSize: 12, color: inv.is_active ? '#4ade80' : C.red }}>
                                {inv.is_active ? 'Active' : 'Suspended'}
                              </div>
                            </div>
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                              <button onClick={() => sendInvoiceEmail(inv.tenant_id)} style={{
                                background: 'transparent', border: `0.5px solid ${C.gold}`, borderRadius: 6,
                                padding: '7px 14px', fontSize: 11, color: C.gold, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 6,
                              }}>
                                ✉ Send Invoice
                              </button>
                              <button onClick={() => {
                                setCreateTenantId(inv.tenant_id)
                                setCreateFee(inv.monthly_fee_ksh || 1000)
                                setShowCreate(true)
                              }} style={{
                                background: '#1a1200', border: `0.5px solid #3a2a00`, borderRadius: 6,
                                padding: '7px 14px', fontSize: 11, color: C.gold, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 6,
                              }}>
                                ↻ Renew
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
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

      {/* Create Invoice Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowCreate(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 420, background: '#0a0a0a', border: `0.5px solid ${C.faint}`, borderRadius: 12,
            padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>Create Invoice</div>

            <select value={createTenantId} onChange={e => setCreateTenantId(e.target.value)} style={{
              height: 40, padding: '0 12px', borderRadius: 6, border: `0.5px solid #1e1e1e`,
              background: '#0d0d0d', color: '#ccc', fontSize: 12, outline: 'none',
              fontFamily: 'Inter, sans-serif',
            }}>
              <option value="">Select ISP...</option>
              {invoices.map(i => (
                <option key={i.tenant_id} value={i.tenant_id}>{i.tenant_name}</option>
              ))}
            </select>

            <div>
              <div style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Monthly Fee (KSh)</div>
              <input type="number" value={createFee} onChange={e => setCreateFee(Number(e.target.value))} style={{
                width: '100%', height: 40, padding: '0 12px', borderRadius: 6, border: `0.5px solid #1e1e1e`,
                background: '#0d0d0d', color: '#ccc', fontSize: 12, outline: 'none', fontFamily: '"DM Mono", monospace',
              }} />
            </div>

            <div>
              <div style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Due In (days)</div>
              <input type="number" value={createDue} onChange={e => setCreateDue(Number(e.target.value))} style={{
                width: '100%', height: 40, padding: '0 12px', borderRadius: 6, border: `0.5px solid #1e1e1e`,
                background: '#0d0d0d', color: '#ccc', fontSize: 12, outline: 'none', fontFamily: '"DM Mono", monospace',
              }} />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setShowCreate(false)} style={{
                background: 'transparent', border: `0.5px solid #333`, borderRadius: 6,
                padding: '8px 16px', fontSize: 12, color: '#777', cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handleCreate} disabled={creating} style={{
                background: C.gold, color: '#000', border: 'none', borderRadius: 6,
                padding: '8px 16px', fontSize: 12, fontWeight: 500, cursor: creating ? 'not-allowed' : 'pointer',
                opacity: creating ? 0.5 : 1,
              }}>{creating ? 'Creating...' : 'Create Invoice'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
