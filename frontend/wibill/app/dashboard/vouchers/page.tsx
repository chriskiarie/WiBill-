'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { useToast } from '@/context/ToastContext'
import { Plus, Download, X, Search, Package } from 'lucide-react'

export default function VouchersPage() {
  const { token } = useAuth()
  const { showToast } = useToast()

  const [data, setData] = useState<any>({ vouchers: [], total: 0, counts: { unused: 0, used: 0, expired: 0 } })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showGenerate, setShowGenerate] = useState(false)
  const [packages, setPackages] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)
  const [genForm, setGenForm] = useState({ package_id: '', quantity: 50, prefix: '', expires_in_days: 365 })

  const fmt = (n: number) => n?.toLocaleString() ?? '0'

  const fetchVouchers = async () => {
    if (!token) return
    setLoading(true)
    try {
      const d = await api.getVouchers({ status: statusFilter || undefined, search: search || undefined, limit: 200 })
      setData(d)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const fetchPackages = async () => {
    try { setPackages(await api.getPackages()) } catch { /* ignore */ }
  }

  useEffect(() => { fetchVouchers() }, [token, statusFilter])
  useEffect(() => { fetchPackages() }, [token])

  const handleGenerate = async () => {
    if (!genForm.package_id || genForm.quantity < 1) { showToast('Select package and quantity', { type: 'error' }); return }
    setGenerating(true)
    try {
      const result = await api.generateVouchers(genForm)
      showToast(`Generated ${result.quantity} vouchers (batch: ${result.batch_id.slice(0, 8)}...)`, { type: 'success' })
      setShowGenerate(false)
      fetchVouchers()
    } catch (e: any) { showToast(e.message || 'Failed', { type: 'error' }) } finally { setGenerating(false) }
  }

  const handleVoid = async (id: string) => {
    if (!confirm('Void this voucher?')) return
    try {
      await api.voidVoucher(id)
      showToast('Voucher voided', { type: 'success' })
      fetchVouchers()
    } catch (e: any) { showToast(e.message || 'Failed', { type: 'error' }) }
  }

  const exportCSV = () => {
    const rows = [['Code', 'Status', 'Package', 'Created', 'Expires', 'Used At', 'MAC']]
    data.vouchers.forEach((v: any) => rows.push([v.code, v.status, v.package_id || '', v.created_at?.slice(0, 10) || '', v.expires_at?.slice(0, 10) || '', v.used_at?.slice(0, 10) || '', v.mac_address || '']))
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `vouchers-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: '16px 20px', flex: 1, borderTop: `2px solid ${color}` }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#2a2a2a', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 22, fontWeight: 500, color: color }}>{fmt(value)}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Vouchers" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: '#030303' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Voucher Management</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={exportCSV} style={{ padding: '8px 14px', background: '#0a0a0a', border: '0.5px solid #1a1a1a', borderRadius: 7, color: '#3b82f6', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={14} /> Export
            </button>
            <button onClick={() => setShowGenerate(true)} style={{ padding: '8px 14px', background: '#3b82f6', border: 'none', borderRadius: 7, color: '#030303', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> Generate Batch
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <StatCard label="Total" value={data.total} color="#3b82f6" />
          <StatCard label="Unused" value={data.counts?.unused ?? 0} color="#22c55e" />
          <StatCard label="Used" value={data.counts?.used ?? 0} color="#f59e0b" />
          <StatCard label="Expired" value={data.counts?.expired ?? 0} color="#f87171" />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#333' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by code..." onKeyDown={e => { if (e.key === 'Enter') fetchVouchers() }}
              style={{ width: '100%', padding: '9px 12px 9px 34px', background: '#080808', border: '0.5px solid #1a1a1a', borderRadius: 7, color: '#e0e0e0', fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
          </div>
          {['', 'unused', 'used', 'expired'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: statusFilter === s ? '#3b82f6' : '#0a0a0a', border: statusFilter === s ? '0.5px solid #3b82f6' : '0.5px solid #1a1a1a', color: statusFilter === s ? '#fff' : '#555', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {s || 'All'}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#444', fontSize: 13 }}>Loading...</div>}

        {/* Voucher Table */}
        {!loading && data.vouchers?.length > 0 && (
          <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.7fr 0.7fr 0.8fr 0.8fr 1fr', borderBottom: '0.5px solid #101010', background: '#0a0a0a' }}>
              {['Code', 'Status', 'Batch', 'Created', 'Expires', 'Actions'].map((h, i) => (
                <div key={i} style={{ padding: '11px 16px', fontSize: 9, fontWeight: 700, color: '#2a2a2a', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</div>
              ))}
            </div>
            {data.vouchers.map((v: any, i: number) => {
              const statusColor = v.status === 'unused' ? '#22c55e' : v.status === 'used' ? '#f59e0b' : '#f87171'
              return (
                <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.7fr 0.7fr 0.8fr 0.8fr 1fr', borderBottom: i < data.vouchers.length - 1 ? '0.5px solid #0a0a0a' : 'none', alignItems: 'center' }}>
                  <div style={{ padding: '12px 16px', fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 600, color: '#e0e0e0' }}>{v.code}</div>
                  <div style={{ padding: '8px 12px' }}>
                    <div style={{ padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, color: statusColor, background: `${statusColor}15`, textTransform: 'uppercase', display: 'inline-block' }}>{v.status}</div>
                  </div>
                  <div style={{ padding: '12px 16px', fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#555' }}>{v.batch_id?.slice(0, 8) || '—'}</div>
                  <div style={{ padding: '12px 16px', fontSize: 11, color: '#666' }}>{v.created_at?.slice(0, 10) || '—'}</div>
                  <div style={{ padding: '12px 16px', fontSize: 11, color: '#666' }}>{v.expires_at?.slice(0, 10) || '—'}</div>
                  <div style={{ padding: '8px 14px' }}>
                    {v.status === 'unused' && (
                      <button onClick={() => handleVoid(v.id)} style={{ padding: '4px 10px', background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 4, color: '#f87171', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>
                        Void
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && data.vouchers?.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎫</div>
            <div style={{ fontSize: 14, marginBottom: 8 }}>No vouchers found</div>
            <div style={{ fontSize: 12, color: '#666' }}>Generate your first batch to start selling scratch card codes</div>
          </div>
        )}
      </div>

      {/* Generate Modal */}
      {showGenerate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0a0a0a', border: '0.5px solid #141414', borderRadius: 11, padding: 24, maxWidth: 480, width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Generate Voucher Batch</div>
              <button onClick={() => setShowGenerate(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#666', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>Package *</label>
              <select value={genForm.package_id} onChange={e => setGenForm(p => ({ ...p, package_id: e.target.value }))} style={{ width: '100%', padding: '10px 12px', background: '#080808', border: '0.5px solid #1e1e1e', borderRadius: 7, color: '#e0e0e0', fontSize: 12, boxSizing: 'border-box', outline: 'none' }}>
                <option value="">Select a package...</option>
                {packages.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} — Ksh {p.price_ksh} ({p.duration_hours}h)</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>Quantity *</label>
                <input type="number" min={1} max={500} value={genForm.quantity} onChange={e => setGenForm(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} style={{ width: '100%', padding: '10px 12px', background: '#080808', border: '0.5px solid #1e1e1e', borderRadius: 7, color: '#e0e0e0', fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>Prefix (optional)</label>
                <input type="text" value={genForm.prefix} onChange={e => setGenForm(p => ({ ...p, prefix: e.target.value }))} placeholder="e.g. WIFI-" style={{ width: '100%', padding: '10px 12px', background: '#080808', border: '0.5px solid #1e1e1e', borderRadius: 7, color: '#e0e0e0', fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>Expires In (days)</label>
              <input type="number" min={1} value={genForm.expires_in_days} onChange={e => setGenForm(p => ({ ...p, expires_in_days: parseInt(e.target.value) || 365 }))} style={{ width: '100%', padding: '10px 12px', background: '#080808', border: '0.5px solid #1e1e1e', borderRadius: 7, color: '#e0e0e0', fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
            </div>

            <div style={{ padding: '12px 14px', background: '#0a1628', border: '0.5px solid #1a3a5a', borderRadius: 7, marginBottom: 16, fontSize: 11, color: '#5a9fd4', lineHeight: 1.6 }}>
              {genForm.quantity} codes will be generated for the selected package. Each code is 8 characters (uppercase + digits). {genForm.prefix && `Prefix "${genForm.prefix}" will be prepended.`}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleGenerate} disabled={generating} style={{ flex: 1, padding: '12px', background: generating ? '#444' : '#3b82f6', border: 'none', borderRadius: 7, color: '#030303', fontSize: 12, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.7 : 1 }}>
                {generating ? `Generating ${genForm.quantity} codes...` : 'Generate Batch'}
              </button>
              <button onClick={() => setShowGenerate(false)} style={{ padding: '12px 16px', background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 7, color: '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
