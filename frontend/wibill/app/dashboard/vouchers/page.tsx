'use client'
import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { useToast } from '@/context/ToastContext'
import { Plus, Download, X, Search, ChevronDown, ChevronRight, Copy, Check, Trash2 } from 'lucide-react'

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

function formatDuration(min: number) {
  if (min >= 10080) return `${(min / 10080).toFixed(0)} day`
  if (min >= 1440) return `${(min / 1440).toFixed(0)} day`
  if (min >= 60 && min < 1440) { const h = min / 60; return h === 1 ? '1 hour' : `${h} hours` }
  return `${min} min`
}

function formatBatchLabel(b: BatchGroup) {
  const d = formatDuration(b.duration_minutes)
  const date = b.created_at ? new Date(b.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }) : ''
  return `${d} · ${date}`
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = { unused: '#22c55e', used: '#E8B84B', expired: '#ef4444' }
  return <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors[status] || '#666', flexShrink: 0 }} />
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
  const [selectMode, setSelectMode] = useState(false)
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ voucher: Voucher; x: number; y: number } | null>(null)

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

  useEffect(() => {
    const close = () => setContextMenu(null)
    if (contextMenu) { window.addEventListener('click', close); return () => window.removeEventListener('click', close) }
  }, [contextMenu])

  const batches = useMemo(() => {
    const map = new Map<string, Voucher[]>()
    vouchers.forEach(v => {
      const bid = v.batch_id || 'unknown'
      if (!map.has(bid)) map.set(bid, [])
      map.get(bid)!.push(v)
    })
    const groups: BatchGroup[] = []
    map.forEach((vs, bid) => {
      groups.push({
        batch_id: bid,
        vouchers: vs.sort((a, b) => a.code.localeCompare(b.code)),
        duration_minutes: vs[0]?.duration_minutes || 60,
        created_at: vs[0]?.created_at || '',
        unusedCount: vs.filter(v => v.status === 'unused').length,
        usedCount: vs.filter(v => v.status === 'used').length,
        expiredCount: vs.filter(v => v.status === 'expired').length,
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

  const selectAllUnused = () => {
    setSelected(new Set(vouchers.filter(v => v.status === 'unused').map(v => v.id)))
  }

  const selectAllUsed = () => {
    setSelected(new Set(vouchers.filter(v => v.status === 'used').map(v => v.id)))
  }

  const selectBatch = (batch: BatchGroup) => {
    const ids = batch.vouchers.map(v => v.id)
    const allSelected = ids.every(id => selected.has(id))
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) ids.forEach(id => next.delete(id))
      else ids.forEach(id => next.add(id))
      return next
    })
  }

  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()) }

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

  const handleVoid = async (id: string) => {
    setContextMenu(null)
    if (!confirm('Void this voucher?')) return
    try { await api.voidVoucher(id); showToast('Voucher voided', { type: 'success' }); fetchVouchers() }
    catch (e: any) { showToast(e.message || 'Failed', { type: 'error' }) }
  }

  const handleBulkVoid = async () => {
    if (selected.size === 0) return
    if (!confirm(`Void ${selected.size} voucher(s)?`)) return
    try {
      const result = await api.batchVoidVouchers({ voucher_ids: Array.from(selected) })
      showToast(result?.message || `Voided`, { type: 'success' })
      setSelected(new Set()); fetchVouchers()
    } catch (e: any) { showToast(e.message || 'Failed', { type: 'error' }) }
  }

  const handleBatchVoid = async (batchId: string) => {
    const batch = batches.find(b => b.batch_id === batchId)
    if (!batch || batch.unusedCount === 0) return
    if (!confirm(`Void all ${batch.unusedCount} unused vouchers?`)) return
    try { await api.batchVoidVouchers({ batch_id: batchId }); showToast('Batch voided', { type: 'success' }); fetchVouchers() }
    catch (e: any) { showToast(e.message || 'Failed', { type: 'error' }) }
  }

  const handleBatchSuspend = async (batchId: string, suspend: boolean) => {
    try {
      if (suspend) await api.suspendVoucherBatch(batchId)
      else await api.unsuspendVoucherBatch(batchId)
      showToast(suspend ? 'Batch suspended' : 'Batch unsuspended', { type: 'success' }); fetchVouchers()
    } catch (e: any) { showToast(e.message || 'Failed', { type: 'error' }) }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code); setTimeout(() => setCopiedCode(null), 1500)
  }

  const copyBatchCodes = (batch: BatchGroup) => {
    navigator.clipboard.writeText(batch.vouchers.map(v => v.code).join('\n'))
    showToast(`Copied ${batch.vouchers.length} codes`, { type: 'success' })
  }

  const exportCSV = () => {
    const rows = [['Code', 'Status', 'Duration', 'Batch', 'Created', 'Expires', 'Used At', 'MAC']]
    vouchers.forEach(v => rows.push([
      v.code, v.status, `${v.duration_minutes}min`, v.batch_id?.slice(0, 8) || '',
      v.created_at?.slice(0, 10) || '', v.expires_at?.slice(0, 10) || '',
      v.used_at?.slice(0, 10) || '', v.mac_address || ''
    ]))
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `vouchers-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  const btn = (label: string, color: string, onClick: () => void, opts?: { disabled?: boolean; small?: boolean }) => (
    <button onClick={onClick} disabled={opts?.disabled} style={{
      padding: opts?.small ? '4px 10px' : '6px 12px', background: 'transparent',
      border: `0.5px solid ${color}40`, borderRadius: 5, color,
      fontSize: 10, fontWeight: 700, cursor: opts?.disabled ? 'not-allowed' : 'pointer',
      opacity: opts?.disabled ? 0.5 : 1, whiteSpace: 'nowrap',
    }}>{label}</button>
  )

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
              <Plus size={14} /> Generate
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

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 260 }}>
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
          <div style={{ flex: 1 }} />
          {!selectMode ? (
            <button onClick={() => setSelectMode(true)} style={{ padding: '6px 14px', background: C.base, border: `0.5px solid ${C.border2}`, borderRadius: 6, color: C.dim, fontSize: 10, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
              Select
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.gold, fontFamily: 'DM Mono, monospace' }}>{selected.size} selected</span>
              {btn('All Unused', C.green, selectAllUnused)}
              {btn('All Used', C.gold, selectAllUsed)}
              {selected.size > 0 && btn('Void Selected', C.red, handleBulkVoid)}
              {btn('Done', C.dim, exitSelectMode)}
            </div>
          )}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 40, color: C.dim, fontSize: 13, fontFamily: 'Inter, sans-serif' }}>Loading...</div>}

        {/* Batch Groups */}
        {!loading && batches.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {batches.map(batch => {
              const expanded = expandedBatches.has(batch.batch_id)
              return (
                <div key={batch.batch_id} style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                  {/* Batch Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: expanded ? `0.5px solid ${C.border}` : 'none' }}
                    onClick={() => toggleBatch(batch.batch_id)}>
                    <span style={{ color: C.dim, display: 'flex', alignItems: 'center', transition: 'transform 0.15s', transform: expanded ? 'rotate(0deg)' : 'rotate(0deg)' }}>
                      {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>

                    {/* Label: duration + date */}
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: 'Inter, sans-serif' }}>
                      {formatDuration(batch.duration_minutes)}
                    </span>
                    <span style={{ fontSize: 10, color: C.dim }}>
                      {batch.created_at ? new Date(batch.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    </span>

                    <div style={{ flex: 1 }} />

                    {/* Status dots + counts */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 10, fontFamily: 'DM Mono, monospace' }}>
                      {batch.unusedCount > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.green }}><StatusDot status="unused" />{batch.unusedCount}</span>}
                      {batch.usedCount > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.gold }}><StatusDot status="used" />{batch.usedCount}</span>}
                      {batch.expiredCount > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.red }}><StatusDot status="expired" />{batch.expiredCount}</span>}
                    </div>

                    {/* Batch Actions */}
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      {btn('Copy', C.gold, () => copyBatchCodes(batch))}
                      {batch.unusedCount > 0 && btn('Void', C.red, () => handleBatchVoid(batch.batch_id))}
                    </div>
                  </div>

                  {/* Expanded: Code Grid */}
                  {expanded && (
                    <div style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {batch.vouchers.map(v => {
                        const isSelected = selected.has(v.id)
                        const isUnused = v.status === 'unused'
                        const isUsed = v.status === 'used'
                        const isExpired = v.status === 'expired'
                        const chipBg = isUnused ? 'rgba(34,197,94,0.08)' : isUsed ? 'rgba(232,184,75,0.08)' : 'rgba(239,68,68,0.08)'
                        const chipBorder = selectMode && isUnused
                          ? (isSelected ? `${C.gold}` : 'rgba(255,255,255,0.08)')
                          : (isUnused ? 'rgba(34,197,94,0.15)' : isUsed ? 'rgba(232,184,75,0.15)' : 'rgba(239,68,68,0.15)')
                        const codeColor = isUnused ? C.text : isUsed ? C.gold : C.red

                        return (
                          <div key={v.id}
                            onClick={(e) => {
                              if (selectMode && isUnused) { toggleSelect(v.id); return }
                              setContextMenu({ voucher: v, x: e.clientX, y: e.clientY })
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              setContextMenu({ voucher: v, x: e.clientX, y: e.clientY })
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '4px 9px', borderRadius: 5,
                              background: selectMode && isSelected ? 'rgba(232,184,75,0.12)' : chipBg,
                              border: `0.5px solid ${chipBorder}`,
                              cursor: selectMode && isUnused ? 'pointer' : 'default',
                              transition: 'border-color 0.15s',
                              outline: selectMode && isSelected ? `1px solid ${C.gold}` : 'none',
                            }}>
                            <StatusDot status={v.status} />
                            <span style={{
                              fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 600,
                              color: codeColor,
                            }} title={isUsed ? `Used ${v.used_at?.slice(0, 10) || ''}` : isExpired ? 'Expired' : 'Unused'}>
                              {v.code}
                            </span>
                            {v.is_suspended && <span style={{ fontSize: 7, fontWeight: 700, color: C.red, lineHeight: 1 }}>SUS</span>}
                            {copiedCode === v.code && <Check size={9} style={{ color: C.green }} />}
                          </div>
                        )
                      })}
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

      {/* Context Menu */}
      {contextMenu && (
        <div style={{
          position: 'fixed', left: contextMenu.x, top: contextMenu.y,
          background: '#1a1a1a', border: `0.5px solid ${C.border2}`, borderRadius: 8,
          padding: 4, zIndex: 9999, minWidth: 140,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <div style={{ padding: '6px 10px', fontSize: 10, color: C.dim, fontFamily: 'DM Mono, monospace', borderBottom: `0.5px solid ${C.border2}`, marginBottom: 2 }}>
            {contextMenu.voucher.code}
          </div>
          <button onClick={() => { copyCode(contextMenu.voucher.code); setContextMenu(null) }}
            style={{ width: '100%', padding: '7px 10px', background: 'none', border: 'none', color: C.text, fontSize: 11, textAlign: 'left', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            <Copy size={12} /> Copy code
          </button>
          {contextMenu.voucher.status === 'unused' && (
            <button onClick={() => handleVoid(contextMenu.voucher.id)}
              style={{ width: '100%', padding: '7px 10px', background: 'none', border: 'none', color: C.red, fontSize: 11, textAlign: 'left', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <Trash2 size={12} /> Void
            </button>
          )}
        </div>
      )}

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
              {genForm.quantity} time-based codes ({selectedPreset || genForm.duration_minutes || '?'} min each)
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
