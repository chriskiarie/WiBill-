'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { useToast } from '@/context/ToastContext'
import { Download, Search, RefreshCw } from 'lucide-react'

const C = {
  void: 'var(--theme-bg)', base: 'var(--theme-card-base)', border: 'var(--theme-border)', border2: 'var(--theme-border2)',
  text: 'var(--theme-text)', dim: 'var(--theme-dim)', mute: 'var(--theme-mute)',
  gold: 'var(--theme-gold)', green: 'var(--theme-green)', red: 'var(--theme-red)',
}

export default function TransactionsPage() {
  const { token } = useAuth()
  const { showToast } = useToast()

  const [txns, setTxns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [search, setSearch] = useState('')

  const fetchTxns = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await api.getTransactions(0, 100)
      setTxns(Array.isArray(data) ? data : [])
      setError(null)
    } catch (e: any) { setError(e.message); showToast('Failed to load transactions', { type: 'error' }) } finally { setLoading(false) }
  }, [token])

  useEffect(() => { fetchTxns() }, [fetchTxns])

  const filtered = txns.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false
    if (dateRange !== 'all') {
      const d = new Date(t.created_at)
      const now = new Date()
      if (dateRange === 'today' && d.toDateString() !== now.toDateString()) return false
      if (dateRange === 'week') { const weekAgo = new Date(now.getTime() - 7 * 86400000); if (d < weekAgo) return false }
      if (dateRange === 'month') { const monthAgo = new Date(now.getTime() - 30 * 86400000); if (d < monthAgo) return false }
    }
    if (search && !t.mpesa_receipt?.toLowerCase().includes(search.toLowerCase()) && !t.phone_number?.includes(search)) return false
    return true
  })

  const gross = filtered.reduce((a, t) => a + (t.amount_ksh || t.amount || 0), 0)
  const fees = filtered.reduce((a, t) => a + (t.platform_fee_ksh || t.platform_fee || 0), 0)
  const net = filtered.reduce((a, t) => a + (t.isp_earnings_ksh || t.isp_earnings || 0), 0)
  const failed = txns.filter(t => t.status === 'failed').slice(0, 10)

  const fmtKsh = (n: number) => n?.toLocaleString('en-KE') ?? '0'
  const ago = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (diff < 1) return 'just now'
    if (diff < 60) return `${diff}m ago`
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
    return `${Math.floor(diff / 1440)}d ago`
  }

  const exportCSV = () => {
    const rows = [['Receipt', 'Phone', 'Package', 'Amount', 'Fee', 'Net', 'Status', 'Time']]
    filtered.forEach((t: any) => rows.push([
      t.mpesa_receipt || '', t.phone_number || '', t.package_id || '—',
      String(t.amount_ksh || t.amount || 0), String(t.platform_fee_ksh || t.platform_fee || 0),
      String(t.isp_earnings_ksh || t.isp_earnings || 0), t.status || 'completed', t.created_at || ''
    ]))
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  const handleRetry = async (sessionId: string) => {
    if (!token || !sessionId) return
    try {
      showToast(`Retrying STK push for session ${sessionId.slice(0, 8)}...`, { type: 'info' })
      await api.retryStkPush(sessionId)
      showToast('STK push resent — check your phone', { type: 'success' })
      fetchTxns()
    } catch (e: any) {
      showToast(e.message || 'Retry failed', { type: 'error' })
    }
  }

  const SumCard = ({ label, value, color }: any) => (
    <div style={{ background: 'var(--theme-surface)', border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '16px 20px', flex: '1 1 0', minWidth: 140, borderTop: `1.5px solid ${color}` }}>
      <div style={{ fontSize: 9, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 500, color, letterSpacing: '-0.3px' }}>Ksh {fmtKsh(value)}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Transactions" />
      <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', background: C.void }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Payment Ledger</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={fetchTxns} style={{ padding: '8px 12px', background: 'var(--theme-surface)', border: `0.5px solid ${C.border2}`, borderRadius: 7, color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={exportCSV} style={{ padding: '8px 14px', background: 'var(--theme-surface)', border: `0.5px solid ${C.border2}`, borderRadius: 7, color: C.gold, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <SumCard label={`Gross Revenue (${filtered.length} txns)`} value={gross} color={C.gold} />
          <SumCard label="Platform Fee (10%)" value={fees} color={C.gold} />
          <SumCard label="Your Earnings (90%)" value={net} color={C.green} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 240 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#333' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search receipt or phone..."
              style={{ width: '100%', padding: '8px 10px 8px 30px', background: 'var(--theme-surface)', border: `0.5px solid ${C.border2}`, borderRadius: 7, color: C.text, fontSize: 11, boxSizing: 'border-box', outline: 'none' }} />
          </div>
          {['all', 'today', 'week', 'month'].map(d => (
            <button key={d} onClick={() => setDateRange(d)} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: dateRange === d ? C.gold : 'var(--theme-surface)', border: dateRange === d ? `0.5px solid ${C.gold}` : `0.5px solid ${C.border2}`, color: dateRange === d ? '#000' : C.dim, textTransform: 'capitalize' }}>
              {d === 'all' ? 'All Time' : d}
            </button>
          ))}
          <div style={{ width: 1, height: 20, background: 'var(--theme-border2)', margin: '0 4px' }} />
          {['all', 'completed', 'failed', 'pending'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: filter === s ? C.gold : 'var(--theme-surface)', border: filter === s ? `0.5px solid ${C.gold}` : `0.5px solid ${C.border2}`, color: filter === s ? '#000' : C.dim, textTransform: 'capitalize' }}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ padding: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: C.red, marginBottom: 12, fontSize: 12 }}>
            {error} <button onClick={fetchTxns} style={{ marginLeft: 8, color: C.red, cursor: 'pointer', background: 'none', border: 'none', opacity: 0.8 }}>Retry</button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--theme-faint)', fontSize: 13 }}>Loading...</div>
        ) : filtered.length > 0 ? (
          <div style={{ background: 'var(--theme-surface)', border: `0.5px solid ${C.border}`, borderRadius: 11, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 0.7fr 0.7fr 0.6fr 0.6fr 0.8fr', minWidth: 600, borderBottom: `0.5px solid ${C.border}`, background: 'var(--theme-surface)' }}>
              {['RECEIPT', 'PHONE', 'PACKAGE', 'AMOUNT', 'FEE', 'NET', 'TIME'].map((h, i) => (
                <div key={i} style={{ padding: '10px 14px', fontSize: 9, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{h}</div>
              ))}
            </div>
            {filtered.map((t, i) => (
              <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 0.7fr 0.7fr 0.6fr 0.6fr 0.8fr', borderBottom: i < filtered.length - 1 ? `0.5px solid ${C.border}` : 'none', alignItems: 'center' }}>
                <div style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 10, color: C.dim }}>{t.mpesa_receipt || '—'}</div>
                <div style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--theme-faint)' }}>{t.phone_number?.replace(/(\d{3})\d{4}(\d{3})/, '$1••••$2') || '—'}</div>
                <div style={{ padding: '10px 14px', fontSize: 10, color: C.dim }}>{t.package_id || '—'}</div>
                <div style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 500, color: C.text }}>Ksh {fmtKsh(t.amount_ksh || t.amount || 0)}</div>
                <div style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 10, color: C.gold }}>−{fmtKsh(t.platform_fee_ksh || t.platform_fee || 0)}</div>
                <div style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 10, color: C.green }}>{fmtKsh(t.isp_earnings_ksh || t.isp_earnings || 0)}</div>
                <div style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--theme-faint)' }}>{ago(t.created_at)}</div>
              </div>
            ))}
            </div>
            </div>
          ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--theme-faint)' }}>
            <div style={{ fontSize: 14, marginBottom: 8, color: C.dim }}>No transactions found</div>
            <div style={{ fontSize: 12, color: 'var(--theme-faint)' }}>Transactions appear here once customers make M-Pesa payments</div>
          </div>
        )}

        {/* Failed Payments Section */}
        {failed.length > 0 && (
          <div style={{ background: 'var(--theme-surface)', border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.red, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.red, display: 'inline-block' }} />
              Failed Payments (Last 7 Days)
            </div>
            {failed.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < failed.length - 1 ? `0.5px solid ${C.border}` : 'none' }}>
                <div style={{ display: 'flex', gap: 16, fontSize: 10, color: C.dim }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', color: C.dim }}>{t.phone_number || '—'}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', color: C.red }}>Ksh {fmtKsh(t.amount_ksh || t.amount || 0)}</span>
                  <span>{ago(t.created_at)}</span>
                </div>
                <button onClick={() => handleRetry(t.session_id)} style={{ padding: '4px 10px', background: 'var(--theme-surface)', border: `0.5px solid ${C.border2}`, borderRadius: 4, color: C.gold, fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>
                  Retry
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
