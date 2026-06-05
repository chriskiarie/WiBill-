'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function fmt(n: number) { return n.toLocaleString('en-KE') }
function ago(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'just now'
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

type Filter = 'all' | 'today' | 'week' | 'month'

export default function TransactionsPage() {
  const { token } = useAuth()
  const [txns, setTxns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  const load = useCallback(async (f: Filter = filter, p = 0) => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/transactions?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const rows: any[] = Array.isArray(data) ? data : (data.transactions || data.items || [])

      // client-side filter by date
      const now = Date.now()
      const filtered = rows.filter(t => {
        const ts = new Date(t.created_at).getTime()
        if (f === 'today') return now - ts < 86400000
        if (f === 'week')  return now - ts < 7 * 86400000
        if (f === 'month') return now - ts < 30 * 86400000
        return true
      })
      setTxns(filtered)
      setPage(p)
    } catch {
      setTxns([])
    } finally {
      setLoading(false)
    }
  }, [token, filter])

  useEffect(() => { load() }, [load])

  const changeFilter = (f: Filter) => { setFilter(f); load(f, 0) }

  const visible = txns.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(txns.length / PAGE_SIZE))

  const gross = txns.reduce((a, t) => a + (t.amount_ksh || t.amount || 0), 0)
  const fees  = txns.reduce((a, t) => a + (t.platform_fee_ksh || t.platform_fee || 0), 0)
  const net   = txns.reduce((a, t) => a + (t.isp_earnings_ksh || t.isp_earnings || 0), 0)

  const exportCSV = () => {
    const rows = [
      ['Receipt', 'Phone', 'Package', 'Amount', 'Fee', 'Net', 'Time'],
      ...txns.map(t => [
        t.mpesa_receipt || '',
        t.phone_number || '',
        t.package_id || '',
        t.amount_ksh || t.amount || 0,
        t.platform_fee_ksh || t.platform_fee || 0,
        t.isp_earnings_ksh || t.isp_earnings || 0,
        t.created_at,
      ]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `wibill-transactions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const mono: React.CSSProperties = { fontFamily: 'DM Mono, monospace' }
  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All time' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This week' },
    { key: 'month', label: 'This month' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Transactions" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: '#030303' }}>

        {/* stat cards */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Gross revenue',      value: gross, color: '#3b82f6' },
            { label: 'Platform fees (10%)', value: fees,  color: '#f59e0b' },
            { label: 'Your earnings (90%)', value: net,   color: '#22c55e' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#080808', border: '0.5px solid #141414',
              borderRadius: 11, padding: 18, flex: 1,
              borderTop: `1.5px solid ${s.color}`,
            }}>
              <div style={{ fontSize: 10, color: '#2a2a2a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                {s.label}
              </div>
              <div style={{ ...mono, fontSize: 22, fontWeight: 500, color: loading ? '#333' : '#f0f0f0', letterSpacing: '-0.5px' }}>
                {loading ? '—' : `Ksh ${fmt(Math.round(s.value))}`}
              </div>
            </div>
          ))}
          <div style={{
            background: '#080808', border: '0.5px solid #141414',
            borderRadius: 11, padding: 18, flex: 1,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 10, color: '#2a2a2a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {loading ? '…' : txns.length} transactions
            </div>
            <button onClick={exportCSV} disabled={txns.length === 0} style={{
              background: '#0a0a0a', border: '0.5px solid #1a1a1a',
              borderRadius: 7, padding: '8px 14px',
              color: txns.length === 0 ? '#1e1e1e' : '#3b82f6',
              ...mono, fontSize: 10,
              cursor: txns.length === 0 ? 'not-allowed' : 'pointer',
            }}>
              Export CSV
            </button>
          </div>
        </div>

        {/* filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => changeFilter(f.key)} style={{
              padding: '5px 14px', borderRadius: 6, fontSize: 10, fontWeight: 700,
              cursor: 'pointer', border: '0.5px solid',
              borderColor: filter === f.key ? '#3b82f6' : '#1a1a1a',
              background: filter === f.key ? '#06132a' : '#0a0a0a',
              color: filter === f.key ? '#60a5fa' : '#333',
            }}>
              {f.label}
            </button>
          ))}
          <span onClick={() => load(filter, page)} style={{
            ...mono, fontSize: 10, color: '#3b82f6', cursor: 'pointer', marginLeft: 'auto',
          }}>
            refresh ↺
          </span>
        </div>

        {/* table */}
        {loading ? (
          <LoadingSpinner size="md" label="Loading transactions…" />
        ) : txns.length === 0 ? (
          <div style={{
            background: '#080808', border: '0.5px solid #141414', borderRadius: 11,
            padding: '60px 0', textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>💳</div>
            <div style={{ fontSize: 14, color: '#333', marginBottom: 6 }}>No transactions yet</div>
            <div style={{ ...mono, fontSize: 11, color: '#1e1e1e' }}>
              Transactions appear here after customers pay on your portal
            </div>
          </div>
        ) : (
          <>
            <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, overflow: 'hidden' }}>
              {/* header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr 0.8fr 0.9fr 0.7fr 0.7fr 0.8fr',
                background: '#0a0a0a', borderBottom: '0.5px solid #101010',
              }}>
                {['M-PESA RECEIPT', 'PHONE', 'PACKAGE', 'AMOUNT', 'FEE', 'NET', 'TIME'].map((h, i) => (
                  <div key={i} style={{
                    padding: '11px 16px', fontSize: 9, fontWeight: 700,
                    color: '#1e1e1e', textTransform: 'uppercase', letterSpacing: '0.8px',
                  }}>
                    {h}
                  </div>
                ))}
              </div>

              {/* rows */}
              {visible.map((t, i) => (
                <div key={t.id || i} style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1fr 0.8fr 0.9fr 0.7fr 0.7fr 0.8fr',
                  borderBottom: i < visible.length - 1 ? '0.5px solid #0a0a0a' : 'none',
                  alignItems: 'center',
                }}>
                  <div style={{ padding: '12px 16px', ...mono, fontSize: 11, color: '#2a2a2a' }}>
                    {t.mpesa_receipt || '—'}
                  </div>
                  <div style={{ padding: '12px 16px', ...mono, fontSize: 11, color: '#333' }}>
                    {(t.phone_number || '').replace(/(\d{3})\d{4}(\d{3})/, '$1••••$2') || '—'}
                  </div>
                  <div style={{ padding: '12px 16px', fontSize: 11, color: '#1e1e1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.package_id || '—'}
                  </div>
                  <div style={{ padding: '12px 16px', ...mono, fontSize: 13, fontWeight: 500, color: '#e0e0e0' }}>
                    Ksh {fmt(t.amount_ksh || t.amount || 0)}
                  </div>
                  <div style={{ padding: '12px 16px', ...mono, fontSize: 11, color: '#f59e0b' }}>
                    −{fmt(t.platform_fee_ksh || t.platform_fee || 0)}
                  </div>
                  <div style={{ padding: '12px 16px', ...mono, fontSize: 11, color: '#22c55e' }}>
                    {fmt(t.isp_earnings_ksh || t.isp_earnings || 0)}
                  </div>
                  <div style={{ padding: '12px 16px', ...mono, fontSize: 10, color: '#1a1a1a' }}>
                    {ago(t.created_at)}
                  </div>
                </div>
              ))}
            </div>

            {/* pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14, alignItems: 'center' }}>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={{
                    padding: '6px 14px', ...mono, fontSize: 10, cursor: page === 0 ? 'not-allowed' : 'pointer',
                    background: '#0a0a0a', border: '0.5px solid #1a1a1a', borderRadius: 6,
                    color: page === 0 ? '#1e1e1e' : '#3b82f6',
                  }}
                >
                  ← prev
                </button>
                <span style={{ ...mono, fontSize: 10, color: '#333' }}>
                  page {page + 1} of {totalPages} · {txns.length} total
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  style={{
                    padding: '6px 14px', ...mono, fontSize: 10, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                    background: '#0a0a0a', border: '0.5px solid #1a1a1a', borderRadius: 6,
                    color: page >= totalPages - 1 ? '#1e1e1e' : '#3b82f6',
                  }}
                >
                  next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}