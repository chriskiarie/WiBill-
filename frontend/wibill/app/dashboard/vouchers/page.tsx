'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/context/ToastContext'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ─── types ────────────────────────────────────────────────────────────────────
interface Voucher {
  id: string
  code: string
  note: string | null
  batch_id: string | null
  duration_hours: number
  price_ksh: number
  is_used: boolean
  is_active: boolean
  redeemed_by_mac: string | null
  redeemed_by_phone: string | null
  redeemed_at: string | null
  expires_at: string | null
  created_at: string
}

interface Stats { total: number; available: number; used: number }

type FilterType = 'all' | 'available' | 'used' | 'expired'

// ─── helpers ─────────────────────────────────────────────────────────────────
async function apiCall(path: string, token: string, method = 'GET', body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
  return data
}

function fmtDuration(h: number) {
  if (h < 24) return `${h}hr`
  if (h % 168 === 0) return `${h / 168}wk`
  if (h % 24 === 0) return `${h / 24}d`
  return `${h}hr`
}

function ago(iso: string | null) {
  if (!iso) return '—'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'just now'
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

function copyToClipboard(text: string, showToast: Function) {
  navigator.clipboard.writeText(text)
    .then(() => showToast('Copied!', { type: 'success' }))
    .catch(() => showToast('Copy failed', { type: 'error' }))
}

// ─── sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: '#080808', border: '0.5px solid #141414', borderRadius: 10,
      padding: '16px 18px', borderTop: `1.5px solid ${color}`, flex: 1,
    }}>
      <div style={{ fontSize: 10, color: '#2a2a2a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 26, fontWeight: 500, color: '#f0f0f0', letterSpacing: '-0.5px' }}>
        {value.toLocaleString()}
      </div>
    </div>
  )
}

function CodeBadge({ code, showToast }: { code: string; showToast: Function }) {
  return (
    <span
      onClick={() => copyToClipboard(code, showToast)}
      title="Click to copy"
      style={{
        fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 600,
        color: '#60a5fa', letterSpacing: '1.5px', cursor: 'pointer',
        padding: '2px 0',
      }}
    >
      {code}
    </span>
  )
}

// ─── generate modal ───────────────────────────────────────────────────────────
function GenerateModal({
  onClose, onGenerated, token,
}: {
  onClose: () => void
  onGenerated: (batch: any) => void
  token: string
}) {
  const { showToast } = useToast()
  const [qty, setQty] = useState(10)
  const [hours, setHours] = useState(1)
  const [price, setPrice] = useState(20)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const PRESETS = [
    { label: '1 hr', hours: 1,   price: 20  },
    { label: '3 hr', hours: 3,   price: 50  },
    { label: '6 hr', hours: 6,   price: 80  },
    { label: '12 hr', hours: 12, price: 150 },
    { label: '1 day', hours: 24, price: 200 },
    { label: '3 days', hours: 72, price: 500 },
    { label: '1 week', hours: 168, price: 1000 },
  ]

  const inp: React.CSSProperties = {
    background: '#0a0a0a', border: '0.5px solid #1e1e1e', borderRadius: 7,
    color: '#e0e0e0', fontFamily: 'DM Mono, monospace', fontSize: 13,
    padding: '9px 12px', width: '100%', boxSizing: 'border-box', outline: 'none',
  }

  const submit = async () => {
    if (qty < 1 || hours < 1 || price < 0) return
    setLoading(true)
    try {
      const result = await apiCall('/api/vouchers/generate', token, 'POST', {
        quantity: qty,
        duration_hours: hours,
        price_ksh: price,
        note: note || null,
      })
      showToast(`${result.generated} vouchers generated`, { type: 'success' })
      onGenerated(result)
      onClose()
    } catch (err) {
      showToast((err as Error).message, { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#0a0a0a', border: '0.5px solid #1e1e1e', borderRadius: 13,
        padding: 28, width: 420, maxWidth: '94vw',
      }}>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0' }}>Generate vouchers</span>
          <span onClick={onClose} style={{ color: '#333', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</span>
        </div>

        {/* presets */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: '#333', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Quick preset</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => { setHours(p.hours); setPrice(p.price) }}
                style={{
                  padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                  cursor: 'pointer', border: '0.5px solid',
                  borderColor: hours === p.hours && price === p.price ? '#3b82f6' : '#1a1a1a',
                  background: hours === p.hours && price === p.price ? '#06132a' : '#0d0d0d',
                  color: hours === p.hours && price === p.price ? '#60a5fa' : '#333',
                }}
              >
                {p.label} · Ksh {p.price}
              </button>
            ))}
          </div>
        </div>

        {/* fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 10, color: '#333', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Quantity</label>
            <input style={inp} type="number" min={1} max={500} value={qty}
              onChange={e => setQty(Number(e.target.value))} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: '#333', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Duration (hours)</label>
            <input style={inp} type="number" min={1} value={hours}
              onChange={e => setHours(Number(e.target.value))} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: '#333', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Price (Ksh)</label>
            <input style={inp} type="number" min={0} value={price}
              onChange={e => setPrice(Number(e.target.value))} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: '#333', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Label / note</label>
            <input style={inp} type="text" placeholder="e.g. School event"
              value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>

        {/* summary */}
        <div style={{
          background: '#060606', border: '0.5px solid #141414', borderRadius: 8,
          padding: '12px 14px', marginBottom: 18,
          fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#444',
        }}>
          Generating <span style={{ color: '#3b82f6' }}>{qty}</span> × {fmtDuration(hours)} codes
          &nbsp;·&nbsp;Ksh <span style={{ color: '#22c55e' }}>{price}</span> each
          &nbsp;·&nbsp;Total face value: <span style={{ color: '#f0f0f0' }}>Ksh {(qty * price).toLocaleString()}</span>
        </div>

        {/* actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', background: 'transparent',
            border: '0.5px solid #1a1a1a', borderRadius: 7,
            color: '#333', fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={submit} disabled={loading} style={{
            flex: 2, padding: '10px', background: loading ? '#0a1628' : '#3b82f6',
            border: 'none', borderRadius: 7,
            color: loading ? '#3b82f6' : '#030303', fontSize: 11,
            fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            textTransform: 'uppercase', letterSpacing: '0.3px',
          }}>
            {loading ? 'Generating…' : `Generate ${qty} vouchers`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── export modal ─────────────────────────────────────────────────────────────
function ExportModal({ vouchers, onClose }: { vouchers: Voucher[]; onClose: () => void }) {
  const { showToast } = useToast()

  const downloadCSV = () => {
    const header = ['Code', 'Duration', 'Price (Ksh)', 'Status', 'Note', 'Expires', 'Created']
    const rows = vouchers.map(v => [
      v.code,
      fmtDuration(v.duration_hours),
      v.price_ksh,
      v.is_used ? 'Used' : v.is_active ? 'Available' : 'Revoked',
      v.note || '',
      v.expires_at ? new Date(v.expires_at).toLocaleDateString() : 'No expiry',
      new Date(v.created_at).toLocaleDateString(),
    ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `wibill-vouchers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    showToast('CSV exported', { type: 'success' })
    onClose()
  }

  const copyAll = () => {
    const codes = vouchers.filter(v => !v.is_used && v.is_active).map(v => v.code).join('\n')
    navigator.clipboard.writeText(codes)
      .then(() => { showToast(`${codes.split('\n').length} codes copied`, { type: 'success' }); onClose() })
      .catch(() => showToast('Copy failed', { type: 'error' }))
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#0a0a0a', border: '0.5px solid #1e1e1e', borderRadius: 13,
        padding: 28, width: 360,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0' }}>Export vouchers</span>
          <span onClick={onClose} style={{ color: '#333', fontSize: 20, cursor: 'pointer' }}>×</span>
        </div>
        <div style={{ fontSize: 12, color: '#333', marginBottom: 20 }}>
          {vouchers.length} vouchers in current view
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={copyAll} style={{
            padding: '11px', background: '#080808', border: '0.5px solid #1e1e1e',
            borderRadius: 7, color: '#3b82f6', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', textTransform: 'uppercase',
          }}>
            Copy all available codes
          </button>
          <button onClick={downloadCSV} style={{
            padding: '11px', background: '#3b82f6', border: 'none',
            borderRadius: 7, color: '#030303', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', textTransform: 'uppercase',
          }}>
            Download CSV
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function VouchersPage() {
  const { token } = useAuth()
  const { showToast } = useToast()

  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, available: 0, used: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [showGenerate, setShowGenerate] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  const fetchVouchers = useCallback(async (f: FilterType = filter) => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiCall(`/api/vouchers?filter=${f}&limit=200`, token)
      setVouchers(data.vouchers || [])
      setStats(data.stats || { total: 0, available: 0, used: 0 })
    } catch (err) {
      showToast((err as Error).message, { type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [token, filter, showToast])

  useEffect(() => { fetchVouchers() }, [fetchVouchers])

  const changeFilter = (f: FilterType) => {
    setFilter(f)
    fetchVouchers(f)
  }

  const revoke = async (id: string, code: string) => {
    if (!confirm(`Revoke voucher ${code}?`)) return
    setRevoking(id)
    try {
      await apiCall(`/api/vouchers/${id}`, token!, 'DELETE')
      showToast(`${code} revoked`, { type: 'success' })
      setVouchers(prev => prev.map(v => v.id === id ? { ...v, is_active: false } : v))
    } catch (err) {
      showToast((err as Error).message, { type: 'error' })
    } finally {
      setRevoking(null)
    }
  }

  const mono: React.CSSProperties = { fontFamily: 'DM Mono, monospace' }
  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all',       label: 'All' },
    { key: 'available', label: 'Available' },
    { key: 'used',      label: 'Used' },
    { key: 'expired',   label: 'Expired' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Vouchers" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: '#030303' }}>

        {/* ── stat cards ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <StatCard label="Total vouchers" value={stats.total}     color="#3b82f6" />
          <StatCard label="Available"      value={stats.available} color="#22c55e" />
          <StatCard label="Used"           value={stats.used}      color="#a78bfa" />
          <div style={{
            background: '#080808', border: '0.5px solid #141414', borderRadius: 10,
            padding: '16px 18px', flex: 1, display: 'flex',
            flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 10, color: '#2a2a2a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Actions
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                onClick={() => setShowGenerate(true)}
                style={{
                  flex: 1, padding: '8px', background: '#3b82f6', border: 'none',
                  borderRadius: 7, color: '#030303', fontSize: 10, fontWeight: 700,
                  cursor: 'pointer', textTransform: 'uppercase',
                }}
              >
                + Generate
              </button>
              <button
                onClick={() => setShowExport(true)}
                disabled={vouchers.length === 0}
                style={{
                  flex: 1, padding: '8px', background: '#0a0a0a',
                  border: '0.5px solid #1e1e1e', borderRadius: 7,
                  color: vouchers.length === 0 ? '#1e1e1e' : '#3b82f6',
                  fontSize: 10, fontWeight: 700, cursor: vouchers.length === 0 ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                Export
              </button>
            </div>
          </div>
        </div>

        {/* ── filter tabs ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => changeFilter(f.key)}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                cursor: 'pointer',
                background: filter === f.key ? '#3b82f6' : '#0a0a0a',
                border: filter === f.key ? '0.5px solid #3b82f6' : '0.5px solid #1a1a1a',
                color: filter === f.key ? '#fff' : '#555',
              }}
            >
              {f.label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', ...mono, fontSize: 10, color: '#1e1e1e', alignSelf: 'center' }}>
            {vouchers.length} showing
          </div>
        </div>

        {/* ── table ── */}
        {loading ? (
          <LoadingSpinner size="md" label="Loading vouchers…" />
        ) : vouchers.length === 0 ? (
          <div style={{
            background: '#080808', border: '0.5px solid #141414', borderRadius: 11,
            padding: '60px 0', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎟️</div>
            <div style={{ fontSize: 14, color: '#333', marginBottom: 6 }}>No vouchers yet</div>
            <div style={{ fontSize: 11, color: '#1e1e1e', ...mono, marginBottom: 20 }}>
              Generate codes and hand them to customers
            </div>
            <button
              onClick={() => setShowGenerate(true)}
              style={{
                padding: '9px 20px', background: '#3b82f6', border: 'none',
                borderRadius: 7, color: '#030303', fontSize: 11,
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              Generate First Batch
            </button>
          </div>
        ) : (
          <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, overflow: 'hidden' }}>
            {/* table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '130px 70px 80px 80px 1fr 90px 80px',
              background: '#0a0a0a', borderBottom: '0.5px solid #101010',
            }}>
              {['Code', 'Duration', 'Price', 'Status', 'Note / Redeemed by', 'Created', 'Action'].map((h, i) => (
                <div key={i} style={{
                  padding: '10px 14px', fontSize: 9, fontWeight: 700,
                  color: '#1e1e1e', textTransform: 'uppercase', letterSpacing: '0.8px',
                }}>
                  {h}
                </div>
              ))}
            </div>

            {/* rows */}
            {vouchers.map((v, i) => {
              const statusLabel = v.is_used ? 'Used'
                : !v.is_active ? 'Revoked'
                : v.expires_at && new Date(v.expires_at) < new Date() ? 'Expired'
                : 'Available'
              const statusColor = {
                Available: '#22c55e', Used: '#a78bfa',
                Revoked: '#f87171', Expired: '#f59e0b',
              }[statusLabel] || '#555'

              const canRevoke = !v.is_used && v.is_active

              return (
                <div
                  key={v.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '130px 70px 80px 80px 1fr 90px 80px',
                    borderBottom: i < vouchers.length - 1 ? '0.5px solid #0a0a0a' : 'none',
                    alignItems: 'center',
                    opacity: v.is_used || !v.is_active ? 0.45 : 1,
                  }}
                >
                  {/* code */}
                  <div style={{ padding: '12px 14px' }}>
                    <CodeBadge code={v.code} showToast={showToast} />
                  </div>

                  {/* duration */}
                  <div style={{ padding: '12px 14px', ...mono, fontSize: 11, color: '#555' }}>
                    {fmtDuration(v.duration_hours)}
                  </div>

                  {/* price */}
                  <div style={{ padding: '12px 14px', ...mono, fontSize: 11, color: '#e0e0e0' }}>
                    Ksh {v.price_ksh}
                  </div>

                  {/* status */}
                  <div style={{ padding: '12px 14px' }}>
                    <span style={{
                      ...mono, fontSize: 9, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 4,
                      color: statusColor,
                      background: statusColor + '18',
                    }}>
                      {statusLabel}
                    </span>
                  </div>

                  {/* note / redemption info */}
                  <div style={{ padding: '12px 14px', fontSize: 11, color: '#2a2a2a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.is_used && v.redeemed_by_mac
                      ? <span style={{ ...mono, fontSize: 10, color: '#333' }}>
                          {v.redeemed_by_mac} · {ago(v.redeemed_at)}
                        </span>
                      : v.note || '—'}
                  </div>

                  {/* created */}
                  <div style={{ padding: '12px 14px', ...mono, fontSize: 10, color: '#1e1e1e' }}>
                    {ago(v.created_at)}
                  </div>

                  {/* action */}
                  <div style={{ padding: '10px 14px' }}>
                    {canRevoke && (
                      <button
                        onClick={() => revoke(v.id, v.code)}
                        disabled={revoking === v.id}
                        style={{
                          padding: '4px 10px', background: 'transparent',
                          border: '0.5px solid #2a0a0a', borderRadius: 5,
                          color: '#f87171', fontSize: 9, fontWeight: 700,
                          cursor: revoking === v.id ? 'not-allowed' : 'pointer',
                          ...mono,
                        }}
                      >
                        {revoking === v.id ? '…' : 'Revoke'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showGenerate && (
        <GenerateModal
          token={token!}
          onClose={() => setShowGenerate(false)}
          onGenerated={() => fetchVouchers()}
        />
      )}
      {showExport && (
        <ExportModal
          vouchers={vouchers}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}