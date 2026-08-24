'use client'
import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { useToast } from '@/context/ToastContext'
import { Plus, Download, X, Search, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'

const C = {
  void: 'var(--theme-bg)', base: 'var(--theme-card-base)', border: 'var(--theme-border)', border2: 'var(--theme-border2)',
  text: 'var(--theme-text)', dim: 'var(--theme-dim)', mute: 'var(--theme-mute)',
  gold: 'var(--theme-gold)', green: 'var(--theme-green)', red: 'var(--theme-red)',
}

const inputSx: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: 'var(--theme-bg)',
  border: `0.5px solid ${C.border2}`, borderRadius: 7, color: C.text,
  fontSize: 12, boxSizing: 'border-box', outline: 'none',
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string; label: string }> = {
    unused: { bg: 'rgba(34,197,94,0.12)', fg: '#22c55e', label: 'UNUSED' },
    used: { bg: 'rgba(232,184,75,0.12)', fg: '#E8B84B', label: 'USED' },
    expired: { bg: 'rgba(239,68,68,0.12)', fg: '#ef4444', label: 'EXPIRED' },
  }
  const c = colors[status] || colors.expired
  return (
    <span style={{
      display: 'inline-block', padding: '3px 8px', borderRadius: 4,
      fontSize: 9, fontWeight: 700, color: c.fg, background: c.bg,
      textTransform: 'uppercase', letterSpacing: '0.3px', fontFamily: 'Inter, sans-serif',
    }}>{c.label}</span>
  )
}

interface Voucher {
  id: string; code: string; batch_id: string; status: string;
  is_suspended: boolean; duration_minutes: number;
  created_at: string; expires_at: string | null; used_at: string | null; mac_address: string | null;
}

interface BatchGroup {
  batch_id: string
  vouchers: Voucher[]
  duration_minutes: number
  created_at: string
  unusedCount: number
  usedCount: number
  expiredCount: number
  totalCount: number
}

export default function VouchersPage() {
  const { token } = useAuth()
  const { showToast } = useToast()

  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showGenerate, setShowGenerate] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genForm, setGenForm] = useState({ duration_minutes: 60, quantity: 50, expires_in_days: 365 })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkVoiding, setBulkVoiding] = useState(false)
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const PRESET_DURATIONS = [
    { label: '30 min', minutes: 30 },
    { label: '1 hour', minutes: 60 },
    { label: '6 hours', minutes: 360 },
    { label: '24 hours', minutes: 1440 },
    { label: '7 days', minutes: 10080 },
    { label: 'Custom', minutes: 0 },
  ]
  const [selectedPreset, setSelectedPreset] = useState<number>(60)

  const fetchVouchers = async () => {
    if (!token) return
    setLoading(true)
    try {
      const d = await api.getVouchers({ status: statusFilter || undefined, search: search || undefined, limit: 500 })
      setVouchers(d.vouchers || [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { fetchVouchers() }, [token, statusFilter])

  const batches = useMemo(() => {
    const map = new Map<string, Voucher[]>()
    vouchers.forEach(v => {
      const bid = v.batch_id || 'unknown'
      if (!map.has(bid)) map.set(bid, [])
      map.get(bid)!.push(v)
    })
    const groups: BatchGroup[] = []
    map.forEach((vs, bid) => {
      const unused = vs.filter(v => v.status === 'unused').length
      const used = vs.filter(v => v.status === 'used').length
      const expired = vs.filter(v => v.status === 'expired').length
      groups.push({
        batch_id: bid,
        vouchers: vs.sort((a, b) => a.code.localeCompare(b.code)),
        duration_minutes: vs[0]?.duration_minutes || 60,
        created_at: vs[0]?.created_at || '',
        unusedCount: unused,
        usedCount: used,
        expiredCount: expired,
        totalCount: vs.length,
      })
    })
    return groups.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [vouchers])

  const totalUnused = batches.reduce((s, b) => s + b.unusedCount, 0)
  const totalUsed = batches.reduce((s, b) => s + b.usedCount, 0)
  const totalExpired = batches.reduce((s, b) => s + b.expiredCount, 0)

  const toggleBatch = (bid: string) => {
    setExpandedBatches(prev => {
      const next = new Set(prev)
      if (next.has(bid)) next.delete(bid); else next.add(bid)
      return next
    })
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleBatchSelect = (batch: BatchGroup) => {
    const unusedIds = batch.vouchers.filter(v => v.status === 'unused').map(v => v.id)
    const allSelected = unusedIds.every(id => selected.has(id))
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) unusedIds.forEach(id => next.delete(id))
      else unusedIds.forEach(id => next.add(id))
      return next
    })
  }

  const handleGenerate = async () => {
    const minutes = selectedPreset === 0 ? parseInt(genForm.duration_minutes as any) : selectedPreset
    if (!minutes || minutes < 1) { showToast('Select a duration', { type: 'error' }); return }
    if (genForm.quantity < 1) { showToast('Quantity must be at least 1', { type: 'error' }); return }
    setGenerating(true)
    try {
      const body: any = { quantity: genForm.quantity, expires_in_days: genForm.expires_in_days, duration_minutes: minutes }
      const result = await api.generateVouchers(body)
      showToast(`Generated ${result.quantity} vouchers`, { type: 'success' })
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

  const handleBulkVoid = async (voidAll = false) => {
    const count = voidAll ? totalUnused : selected.size
    if (count === 0) return
    const label = voidAll ? `VOID ALL ${count} unused vouchers` : `void ${count} selected voucher(s)`
    if (!confirm(`${label}? This cannot be undone.`)) return
    setBulkVoiding(true)
    try {
      const payload: any = voidAll ? { void_all: true } : { voucher_ids: Array.from(selected) }
      const result = await api.batchVoidVouchers(payload)
      showToast(result?.message || `Voided ${count} voucher(s)`, { type: 'success' })
      setSelected(new Set())
      fetchVouchers()
    } catch (e: any) { showToast(e.message || 'Failed', { type: 'error' }) } finally { setBulkVoiding(false) }
  }

  const handleBatchSuspend = async (batchId: string, suspend: boolean) => {
    try {
      if (suspend) await api.suspendVoucherBatch(batchId)
      else await api.unsuspendVoucherBatch(batchId)
      showToast(suspend ? 'Batch suspended' : 'Batch unsuspended', { type: 'success' })
      fetchVouchers()
    } catch (e: any) { showToast(e.message || 'Failed', { type: 'error' }) }
  }

  const handleBatchVoid = async (batchId: string) => {
    const batch = batches.find(b => b.batch_id === batchId)
    if (!batch || batch.unusedCount === 0) return
    if (!confirm(`Void all ${batch.unusedCount} unused vouchers in this batch?`)) return
    try {
      const result = await api.batchVoidVouchers({ batch_id: batchId })
      showToast(result?.message || 'Batch voided', { type: 'success' })
      fetchVouchers()
    } catch (e: any) { showToast(e.message || 'Failed', { type: 'error' }) }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 1500)
  }

  const copyBatchCodes = (batch: BatchGroup) => {
    const codes = batch.vouchers.map(v => v.code).join('\n')
    navigator.clipboard.writeText(codes)
    showToast(`Copied ${batch.vouchers.length} codes`, { type: 'success' })
  }

  const exportCSV = () => {
    const rows = [['Code', 'Status', 'Duration', 'Batch', 'Created', 'Expires', 'Used At', 'MAC']]
    vouchers.forEach((v: any) => rows.push([
      v.code, v.status, v.duration_minutes ? `${v.duration_minutes}min` : 'Package',
      v.batch_id?.slice(0, 8) || '', v.created_at?.slice(0, 10) || '', v.expires_at?.slice(0, 10) || '',
      v.used_at?.slice(0, 10) || '', v.mac_address || ''
    ]))
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `vouchers-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  const formatDuration = (min: number) => {
    if (min >= 10080) return `${(min / 10080).toFixed(0)}d`
    if (min >= 1440) return `${(min / 1440).toFixed(0)}d`
    if (min >= 60) return `${(min / 60).toFixed(0)}h`
    return `${min}m`
  }

  const allUnusedSelected = batches.every(b => b.vouchers.filter(v => v.status === 'unused').every(v => selected.has(v.id)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Vouchers" />
      <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', background: C.void }}>

        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: C.text }}>Voucher Management</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={exportCSV} style={{ padding: '8px 14px', background: C.base, border: `0.5px solid ${C.border2}`, borderRadius: 7, color: C.gold, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={14} /> Export
            </button>
            <button onClick={() => setShowGenerate(true)} style={{ padding: '8px 14px', background: C.gold, border: 'none', borderRadius: 7, color: C.void, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> Generate Batch
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total', value: vouchers.length, color: C.gold },
            { label: 'Unused', value: totalUnused, color: C.green },
            { label: 'Used', value: totalUsed, color: C.gold },
            { label: 'Expired', value: totalExpired, color: C.red },
          ].map(s => (
            <div key={s.label} style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '14px 18px', flex: 1, minWidth: 100, borderTop: `2px solid ${s.color}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 22, fontWeight: 500, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters + Bulk */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#333' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search codes..." onKeyDown={e => { if (e.key === 'Enter') fetchVouchers() }}
              style={{ width: '100%', padding: '9px 12px 9px 34px', background: C.base, border: `0.5px solid ${C.border2}`, borderRadius: 7, color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
          </div>
          {[
            { val: '', label: 'All' },
            { val: 'unused', label: 'Unused' },
            { val: 'used', label: 'Used' },
            { val: 'expired', label: 'Expired' },
          ].map(f => (
            <button key={f.val} onClick={() => setStatusFilter(f.val)} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: statusFilter === f.val ? C.gold : C.base, border: `0.5px solid ${statusFilter === f.val ? C.gold : C.border2}`, color: statusFilter === f.val ? '#000' : C.dim, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {f.label}
            </button>
          ))}
          {selected.size > 0 && (
            <>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: C.gold, fontFamily: 'DM Mono, monospace' }}>{selected.size} selected</span>
              <button onClick={() => handleBulkVoid(false)} disabled={bulkVoiding} style={{ padding: '6px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: C.red, fontSize: 11, fontWeight: 700, cursor: bulkVoiding ? 'not-allowed' : 'pointer' }}>
                {bulkVoiding ? 'Voiding...' : 'Void Selected'}
              </button>
              <button onClick={() => handleBulkVoid(true)} disabled={bulkVoiding} style={{ padding: '6px 14px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 6, color: C.red, fontSize: 11, fontWeight: 700, cursor: bulkVoiding ? 'not-allowed' : 'pointer' }}>
                Void All Unused
              </button>
              <button onClick={() => setSelected(new Set())} style={{ padding: '6px 10px', background: 'transparent', border: 'none', color: C.dim, fontSize: 11, cursor: 'pointer' }}>Clear</button>
            </>
          )}
        </div>

        {/* Loading */}
        {loading && <div style={{ textAlign: 'center', padding: 40, color: C.dim, fontSize: 13, fontFamily: 'Inter, sans-serif' }}>Loading...</div>}

        {/* Batch Groups */}
        {!loading && batches.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {batches.map(batch => {
              const expanded = expandedBatches.has(batch.batch_id)
              const unusedVs = batch.vouchers.filter(v => v.status === 'unused')
              const batchAllSelected = unusedVs.length > 0 && unusedVs.every(v => selected.has(v.id))
              return (
                <div key={batch.batch_id} style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, overflow: 'hidden' }}>
                  {/* Batch Header Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', borderBottom: expanded ? `0.5px solid ${C.border}` : 'none' }}
                    onClick={() => toggleBatch(batch.batch_id)}>
                    <div style={{ color: C.dim, display: 'flex', alignItems: 'center', transition: 'transform 0.15s' }}>
                      {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                    {unusedVs.length > 0 && (
                      <input type="checkbox" checked={batchAllSelected} onClick={e => e.stopPropagation()}
                        onChange={() => toggleBatchSelect(batch)}
                        style={{ width: 14, height: 14, accentColor: C.gold, cursor: 'pointer' }} />
                    )}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: C.dim }}>
                        {batch.batch_id.slice(0, 8)}
                      </span>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: C.text }}>
                        {formatDuration(batch.duration_minutes)}
                      </span>
                      <span style={{ fontSize: 11, color: C.dim }}>
                        {batch.created_at?.slice(0, 10)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {batch.unusedCount > 0 && <StatusBadge status="unused" />}
                      {batch.usedCount > 0 && <StatusBadge status="used" />}
                      {batch.expiredCount > 0 && <StatusBadge status="expired" />}
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: C.dim, marginLeft: 4 }}>
                        {batch.unusedCount}/{batch.totalCount}
                      </span>
                    </div>
                    {/* Batch Actions */}
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => copyBatchCodes(batch)} title="Copy all codes"
                        style={{ padding: '4px 8px', background: 'var(--theme-surface)', border: `0.5px solid ${C.border2}`, borderRadius: 4, color: C.gold, fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>
                        <Copy size={12} />
                      </button>
                      {batch.unusedCount > 0 && (
                        <>
                          <button onClick={() => handleBatchSuspend(batch.batch_id, true)} style={{ padding: '4px 8px', background: 'var(--theme-surface)', border: `0.5px solid ${C.border2}`, borderRadius: 4, color: C.gold, fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>
                            Suspend
                          </button>
                          <button onClick={() => handleBatchVoid(batch.batch_id)} style={{ padding: '4px 8px', background: 'var(--theme-surface)', border: `0.5px solid ${C.border2}`, borderRadius: 4, color: C.red, fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>
                            Void
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded: Code Grid */}
                  {expanded && (
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {batch.vouchers.map(v => (
                          <div key={v.id} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '5px 10px', borderRadius: 6,
                            background: v.status === 'unused' ? 'rgba(34,197,94,0.06)' : v.status === 'used' ? 'rgba(232,184,75,0.06)' : 'rgba(239,68,68,0.06)',
                            border: `0.5px solid ${v.status === 'unused' ? 'rgba(34,197,94,0.15)' : v.status === 'used' ? 'rgba(232,184,75,0.15)' : 'rgba(239,68,68,0.15)'}`,
                          }}>
                            {v.status === 'unused' && (
                              <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggleSelect(v.id)}
                                style={{ width: 12, height: 12, accentColor: C.gold, cursor: 'pointer', margin: 0 }} />
                            )}
                            <span style={{
                              fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 600,
                              color: v.status === 'unused' ? C.text : v.status === 'used' ? C.gold : C.red,
                              cursor: v.status === 'unused' ? 'pointer' : 'default',
                            }} onClick={() => v.status === 'unused' && copyCode(v.code)} title={v.status === 'unused' ? 'Click to copy' : v.status === 'used' ? `Used ${v.used_at?.slice(0, 10) || ''}` : 'Expired'}>
                              {v.code}
                            </span>
                            {v.is_suspended && (
                              <span style={{ fontSize: 8, fontWeight: 700, color: C.red, textTransform: 'uppercase' }}>SUS</span>
                            )}
                            {copiedCode === v.code && (
                              <Check size={10} style={{ color: C.green }} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!loading && batches.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎫</div>
            <div style={{ fontSize: 14, marginBottom: 8, fontFamily: 'Inter, sans-serif', color: C.dim }}>No vouchers found</div>
            <div style={{ fontSize: 12, color: '#555' }}>Generate your first batch to start selling access codes</div>
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

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>Duration *</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PRESET_DURATIONS.map(p => (
                  <button key={p.minutes} onClick={() => { setSelectedPreset(p.minutes); if (p.minutes > 0) setGenForm(f => ({ ...f, duration_minutes: p.minutes })) }}
                    style={{
                      padding: '8px 14px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      background: selectedPreset === p.minutes ? C.gold : 'var(--theme-surface)',
                      border: `0.5px solid ${selectedPreset === p.minutes ? C.gold : C.border2}`,
                      color: selectedPreset === p.minutes ? '#000' : C.dim,
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedPreset === 0 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>Custom Duration (minutes)</label>
                <input type="number" min={1} max={43200} value={genForm.duration_minutes} onChange={e => setGenForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 0 }))} placeholder="Enter minutes" style={inputSx} />
              </div>
            )}

            <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>Quantity *</label>
                <input type="number" min={1} max={500} value={genForm.quantity} onChange={e => setGenForm(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} style={inputSx} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>Expires In (days)</label>
              <input type="number" min={1} value={genForm.expires_in_days} onChange={e => setGenForm(p => ({ ...p, expires_in_days: parseInt(e.target.value) || 365 }))} style={inputSx} />
            </div>

            <div style={{ padding: '12px 14px', background: 'var(--theme-bg)', border: `0.5px solid ${C.gold}30`, borderRadius: 7, marginBottom: 16, fontSize: 11, color: C.gold, lineHeight: 1.6 }}>
              {genForm.quantity} time-based codes ({selectedPreset || genForm.duration_minutes || '?'} min each). No package needed.
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
