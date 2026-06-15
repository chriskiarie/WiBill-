'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { useToast } from '@/context/ToastContext'
import { Plus, Download, X, Search, Clock, Star, Ticket } from 'lucide-react'

const C = {
  void: '#000000', base: '#0a0a0a', border: '#141414', border2: '#1a1a1a',
  text: '#f0f0f0', dim: '#666666', mute: '#2a2a2a',
  gold: '#E8B84B', green: '#22c55e', red: '#ef4444',
}

const inputSx: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: '#080808',
  border: `0.5px solid ${C.border2}`, borderRadius: 7, color: C.text,
  fontSize: 12, boxSizing: 'border-box', outline: 'none',
}

export default function VouchersPage() {
  const { token, user } = useAuth()
  const { showToast } = useToast()

  const [data, setData] = useState<any>({ vouchers: [], total: 0, counts: { unused: 0, used: 0, expired: 0 } })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showGenerate, setShowGenerate] = useState(false)
  const [packages, setPackages] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)
  const [genMode, setGenMode] = useState<'package' | 'time'>('package')
  const [genForm, setGenForm] = useState({ package_id: '', duration_minutes: '', quantity: 50, prefix: '', expires_in_days: 365 })
  const [showPremium, setShowPremium] = useState(false)

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
    try {
      if (user?.tenant_id) setPackages(await api.getPackages(user.tenant_id))
    } catch { /* ignore */ }
  }

  useEffect(() => { fetchVouchers() }, [token, statusFilter])
  useEffect(() => { fetchPackages() }, [token, user])

  const handleGenerate = async () => {
    if (genMode === 'package' && !genForm.package_id) { showToast('Select a package', { type: 'error' }); return }
    if (genMode === 'time' && (!genForm.duration_minutes || parseInt(genForm.duration_minutes) < 1)) { showToast('Enter duration in minutes', { type: 'error' }); return }
    if (genForm.quantity < 1) { showToast('Quantity must be at least 1', { type: 'error' }); return }
    setGenerating(true)
    try {
      const body: any = { quantity: genForm.quantity, prefix: genForm.prefix, expires_in_days: genForm.expires_in_days }
      if (genMode === 'package') body.package_id = genForm.package_id
      else body.duration_minutes = parseInt(genForm.duration_minutes)
      const result = await api.generateVouchers(body)
      showToast(`Generated ${result.quantity} vouchers (batch: ${result.batch_id.slice(0, 8)}...)`, { type: 'success' })
      setShowGenerate(false)
      fetchVouchers()
    } catch (e: any) { showToast(e.message || 'Failed', { type: 'error' }) } finally { setGenerating(false) }
  }

  const handleSuspend = async (id: string, isSuspended: boolean) => {
    try {
      if (isSuspended) await api.unsuspendVoucher(id)
      else await api.suspendVoucher(id)
      showToast(isSuspended ? 'Voucher unsuspended' : 'Voucher suspended', { type: 'success' })
      fetchVouchers()
    } catch (e: any) { showToast(e.message || 'Failed', { type: 'error' }) }
  }

  const handleVoid = async (id: string) => {
    if (!confirm('Void this voucher? This cannot be undone.')) return
    try {
      await api.voidVoucher(id)
      showToast('Voucher voided', { type: 'success' })
      fetchVouchers()
    } catch (e: any) { showToast(e.message || 'Failed', { type: 'error' }) }
  }

  const exportCSV = () => {
    const rows = [['Code', 'Status', 'Suspended', 'Type', 'Batch', 'Created', 'Expires', 'Used At', 'MAC']]
    data.vouchers.forEach((v: any) => rows.push([
      v.code, v.status, v.is_suspended ? 'YES' : '', v.duration_minutes ? `${v.duration_minutes}min` : 'Package',
      v.batch_id?.slice(0, 8) || '', v.created_at?.slice(0, 10) || '', v.expires_at?.slice(0, 10) || '',
      v.used_at?.slice(0, 10) || '', v.mac_address || ''
    ]))
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `vouchers-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '16px 20px', flex: 1, borderTop: `2px solid ${color}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 22, fontWeight: 500, color }}>{fmt(value)}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Vouchers" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: C.void }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: C.text }}>
            Voucher Management
          </h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={exportCSV} style={{ padding: '8px 14px', background: C.base, border: `0.5px solid ${C.border2}`, borderRadius: 7, color: C.gold, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={14} /> Export
            </button>
            <button onClick={() => setShowGenerate(true)} style={{ padding: '8px 14px', background: C.gold, border: 'none', borderRadius: 7, color: C.void, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> Generate Batch
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <StatCard label="Total" value={data.total} color={C.gold} />
          <StatCard label="Unused" value={data.counts?.unused ?? 0} color={C.green} />
          <StatCard label="Used" value={data.counts?.used ?? 0} color={C.dim} />
          <StatCard label="Expired" value={data.counts?.expired ?? 0} color={C.red} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#333' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by code..." onKeyDown={e => { if (e.key === 'Enter') fetchVouchers() }}
              style={{ width: '100%', padding: '9px 12px 9px 34px', background: C.base, border: `0.5px solid ${C.border2}`, borderRadius: 7, color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
          </div>
          {['', 'unused', 'used', 'expired'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: statusFilter === s ? C.gold : C.base, border: `0.5px solid ${statusFilter === s ? C.gold : C.border2}`, color: statusFilter === s ? '#000' : C.dim, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {s || 'All'}
            </button>
          ))}
        </div>

        {/* Premium Features Banner */}
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setShowPremium(v => !v)} style={{ width: '100%', padding: '12px 16px', background: '#0d0d00', border: `0.5px solid ${C.gold}40`, borderRadius: 9, color: C.gold, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Star size={14} /> Premium Features — Compensation Tokens & Campaigns</span>
            <span>{showPremium ? '▲' : '▼'}</span>
          </button>
          {showPremium && (
            <div style={{ marginTop: 8, padding: 16, background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 9, display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, padding: 14, background: '#080808', borderRadius: 7, border: `0.5px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Clock size={14} color={C.gold} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Compensation Tokens</span>
                </div>
                <div style={{ fontSize: 10, color: C.dim, marginBottom: 8 }}>Issue time-based tokens to compensate for outages. Redeemable in the captive portal.</div>
                <a href="/dashboard/sessions" style={{ color: C.gold, fontSize: 10, fontWeight: 700, textDecoration: 'none' }}>Go to Sessions →</a>
              </div>
              <div style={{ flex: 1, padding: 14, background: '#080808', borderRadius: 7, border: `0.5px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ticket size={14} color={C.gold} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Campaigns</span>
                </div>
                <div style={{ fontSize: 10, color: C.dim, marginBottom: 8 }}>Win-back & loyalty campaigns. Generate bulk reward tokens for engagement.</div>
                <a href="/dashboard/campaigns" style={{ color: C.gold, fontSize: 10, fontWeight: 700, textDecoration: 'none' }}>Go to Campaigns →</a>
              </div>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && <div style={{ textAlign: 'center', padding: 40, color: C.dim, fontSize: 13, fontFamily: 'Inter, sans-serif' }}>Loading...</div>}

        {/* Voucher Table */}
        {!loading && data.vouchers?.length > 0 && (
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.6fr 0.6fr 0.6fr 0.6fr 0.5fr 1fr', borderBottom: `0.5px solid #101010`, background: '#080808' }}>
              {['Code', 'Status', 'Type', 'Batch', 'Created', 'Suspended', 'Actions'].map(h => (
                <div key={h} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif' }}>{h}</div>
              ))}
            </div>
            {data.vouchers.map((v: any, i: number) => {
              const statusColor = v.status === 'unused' ? C.green : v.status === 'used' ? C.dim : C.red
              const typeLabel = v.duration_minutes ? `${v.duration_minutes}m` : 'Package'
              return (
                <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '1fr 0.6fr 0.6fr 0.6fr 0.6fr 0.5fr 1fr', borderBottom: i < data.vouchers.length - 1 ? `0.5px solid ${C.border}` : 'none', alignItems: 'center' }}>
                  <div style={{ padding: '12px 16px', fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 600, color: C.text }}>{v.code}</div>
                  <div style={{ padding: '8px 12px' }}>
                    <div style={{ padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, color: statusColor, background: `${statusColor}20`, textTransform: 'uppercase', display: 'inline-block' }}>{v.status}</div>
                  </div>
                  <div style={{ padding: '12px 16px', fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.dim }}>{typeLabel}</div>
                  <div style={{ padding: '12px 16px', fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.dim }}>{v.batch_id?.slice(0, 8) || '—'}</div>
                  <div style={{ padding: '12px 16px', fontSize: 11, color: C.dim }}>{v.created_at?.slice(0, 10) || '—'}</div>
                  <div style={{ padding: '12px 16px' }}>
                    {v.is_suspended ? (
                      <div style={{ fontSize: 9, fontWeight: 700, color: C.red, textTransform: 'uppercase' }}>Yes</div>
                    ) : (
                      <div style={{ fontSize: 9, fontWeight: 700, color: C.dim, textTransform: 'uppercase' }}>No</div>
                    )}
                  </div>
                  <div style={{ padding: '8px 14px', display: 'flex', gap: 4 }}>
                    {v.status === 'unused' && (
                      <>
                        <button onClick={() => handleSuspend(v.id, v.is_suspended)} style={{ padding: '4px 10px', background: '#1a1a1a', border: `0.5px solid ${C.border2}`, borderRadius: 4, color: v.is_suspended ? C.green : C.gold, fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>
                          {v.is_suspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                        {!v.is_suspended && (
                          <button onClick={() => handleVoid(v.id)} style={{ padding: '4px 10px', background: '#1a1a1a', border: `0.5px solid ${C.border2}`, borderRadius: 4, color: C.red, fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>
                            Void
                          </button>
                        )}
                      </>
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
            <div style={{ fontSize: 14, marginBottom: 8, fontFamily: 'Inter, sans-serif', color: C.dim }}>No vouchers found</div>
            <div style={{ fontSize: 12, color: '#555' }}>Generate your first batch to start selling scratch card codes</div>
          </div>
        )}
      </div>

      {/* Generate Modal */}
      {showGenerate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowGenerate(false)}>
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 24, maxWidth: 500, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: C.text }}>Generate Voucher Batch</div>
              <button onClick={() => setShowGenerate(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: C.dim, cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Mode Toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button onClick={() => setGenMode('package')} style={{ flex: 1, padding: '10px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: genMode === 'package' ? C.gold : '#080808', border: `0.5px solid ${genMode === 'package' ? C.gold : C.border2}`, color: genMode === 'package' ? '#000' : C.dim }}>
                Package-linked
              </button>
              <button onClick={() => setGenMode('time')} style={{ flex: 1, padding: '10px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: genMode === 'time' ? C.gold : '#080808', border: `0.5px solid ${genMode === 'time' ? C.gold : C.border2}`, color: genMode === 'time' ? '#000' : C.dim }}>
                Time-based
              </button>
            </div>

            {genMode === 'package' ? (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>Package *</label>
                <select value={genForm.package_id} onChange={e => setGenForm(p => ({ ...p, package_id: e.target.value }))} style={inputSx}>
                  <option value="">Select a package...</option>
                  {packages.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} — Ksh {p.price_ksh} ({p.duration_hours}h)</option>)}
                </select>
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>Duration (minutes) *</label>
                <input type="number" min={1} max={43200} value={genForm.duration_minutes} onChange={e => setGenForm(p => ({ ...p, duration_minutes: e.target.value }))} placeholder="e.g. 60 for 1 hour" style={inputSx} />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>Quantity *</label>
                <input type="number" min={1} max={500} value={genForm.quantity} onChange={e => setGenForm(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} style={inputSx} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>Prefix</label>
                <input type="text" value={genForm.prefix} onChange={e => setGenForm(p => ({ ...p, prefix: e.target.value }))} placeholder="e.g. WIFI-" style={inputSx} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>Expires In (days)</label>
              <input type="number" min={1} value={genForm.expires_in_days} onChange={e => setGenForm(p => ({ ...p, expires_in_days: parseInt(e.target.value) || 365 }))} style={inputSx} />
            </div>

            <div style={{ padding: '12px 14px', background: '#0d0d00', border: `0.5px solid ${C.gold}30`, borderRadius: 7, marginBottom: 16, fontSize: 11, color: C.gold, lineHeight: 1.6 }}>
              {genMode === 'time'
                ? `${genForm.quantity} time-based codes (${genForm.duration_minutes || '?'} min each). No package needed — works as standalone access codes.`
                : `${genForm.quantity} codes for the selected package. Each code is 8 characters (uppercase + digits).`}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleGenerate} disabled={generating} style={{ flex: 1, padding: '12px', background: generating ? '#444' : C.gold, border: 'none', borderRadius: 7, color: C.void, fontSize: 12, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.7 : 1 }}>
                {generating ? `Generating ${genForm.quantity} codes...` : 'Generate Batch'}
              </button>
              <button onClick={() => setShowGenerate(false)} style={{ padding: '12px 16px', background: C.base, border: `0.5px solid ${C.border2}`, borderRadius: 7, color: C.dim, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
