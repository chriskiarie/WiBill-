'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { useToast } from '@/context/ToastContext'
import { Plus, Edit2, Trash2, X, Package, AlertTriangle } from 'lucide-react'

const C = {
  void: 'var(--theme-bg)', base: 'var(--theme-card-base)', border: 'var(--theme-border)',
  border2: 'var(--theme-border2, #1a1a1a)',
  text: 'var(--theme-text)', dim: 'var(--theme-dim)', mute: 'var(--theme-mute)',
  gold: 'var(--theme-gold)', green: 'var(--theme-green)', red: 'var(--theme-red)',
}

interface PackageT {
  id: string; name: string; duration_hours: number; price_ksh: number
  is_active: boolean; duration_label?: string; max_devices?: number; display_order?: number
}

interface PackageForm {
  name: string; duration_hours: number; duration_label: string
  price_ksh: number; max_devices: number; is_active: boolean
}

const inputSx: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: 'var(--theme-bg)',
  border: `0.5px solid ${C.mute}`, borderRadius: 7, color: C.text,
  fontSize: 13, boxSizing: 'border-box', outline: 'none',
}

export default function PackagesPage() {
  const { token, user } = useAuth()
  const { showToast } = useToast()
  const [packages, setPackages] = useState<PackageT[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState<PackageT | null>(null)
  const [formData, setFormData] = useState<PackageForm>({
    name: '', duration_hours: 1, duration_label: '1 hr', price_ksh: 0, max_devices: 1, is_active: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  const fetchPackages = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await api.getPackages()
      setPackages(Array.isArray(data) ? data : [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchPackages() }, [token])

  const nameCounts: Record<string, number> = {}
  packages.forEach(p => { nameCounts[p.name] = (nameCounts[p.name] || 0) + 1 })

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this package?')) return
    try {
      await api.deletePackage(id)
      setPackages(p => p.filter(x => x.id !== id))
      showToast('Package deleted', { type: 'success' })
    } catch (err) { showToast('Failed to delete', { type: 'error', message: (err as Error).message }) }
  }

  const toggleActive = async (pkg: PackageT) => {
    setToggling(pkg.id)
    try {
      await api.updatePackage(pkg.id, { is_active: !pkg.is_active })
      setPackages(packages.map(p => p.id === pkg.id ? { ...p, is_active: !p.is_active } : p))
    } catch (err) { showToast('Failed to toggle', { type: 'error', message: (err as Error).message }) }
    finally { setToggling(null) }
  }

  const bulkToggle = async (activate: boolean) => {
    const ids = packages.map(p => p.id)
    if (!confirm(`${activate ? 'Activate' : 'Deactivate'} all ${ids.length} packages?`)) return
    setBulkUpdating(true)
    try {
      await api.bulkUpdatePackages(ids, activate)
      setPackages(packages.map(p => ({ ...p, is_active: activate })))
      showToast(`All packages ${activate ? 'activated' : 'deactivated'}`, { type: 'success' })
    } catch (err) { showToast('Bulk update failed', { type: 'error', message: (err as Error).message }) }
    finally { setBulkUpdating(false) }
  }

  const openCreate = () => {
    setEditingPackage(null)
    setFormData({ name: '', duration_hours: 1, duration_label: '1 hr', price_ksh: 0, max_devices: 1, is_active: true })
    setShowModal(true)
  }

  const openEdit = (pkg: PackageT) => {
    setEditingPackage(pkg)
    setFormData({
      name: pkg.name, duration_hours: pkg.duration_hours,
      duration_label: pkg.duration_label || `${pkg.duration_hours} hr${pkg.duration_hours > 1 ? 's' : ''}`,
      price_ksh: pkg.price_ksh, max_devices: pkg.max_devices || 1, is_active: pkg.is_active,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || formData.price_ksh <= 0) { showToast('Name and price are required', { type: 'error' }); return }
    setSubmitting(true)
    try {
      if (editingPackage) {
        await api.updatePackage(editingPackage.id, formData)
        setPackages(packages.map(p => p.id === editingPackage.id ? { ...p, ...formData } : p))
        showToast('Package updated', { type: 'success' })
      } else {
        const newPkg = await api.createPackage(formData)
        setPackages([...packages, { ...newPkg, is_active: true }])
        showToast('Package created', { type: 'success' })
      }
      setShowModal(false); setEditingPackage(null)
    } catch (err) { showToast('Failed to save', { type: 'error', message: (err as Error).message }) }
    finally { setSubmitting(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Packages" />
      <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', background: C.void }}>
        {/* Header */}
        <div className="packages-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: C.text }}>Packages</h1>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {packages.length >= 2 && (
              <>
                <button onClick={() => bulkToggle(true)} disabled={bulkUpdating}
                  style={{ padding: '6px 10px', background: 'transparent', border: `0.5px solid ${C.mute}`, borderRadius: 5, color: C.green, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  Activate All
                </button>
                <button onClick={() => bulkToggle(false)} disabled={bulkUpdating}
                  style={{ padding: '6px 10px', background: 'transparent', border: `0.5px solid ${C.mute}`, borderRadius: 5, color: C.dim, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  Deactivate All
                </button>
              </>
            )}
            <button onClick={openCreate}
              style={{ padding: '7px 14px', background: C.gold, color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
              <Plus size={15} /> New Package
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && <div style={{ textAlign: 'center', padding: 40, color: C.dim, fontSize: 13, fontFamily: "'DM Mono', monospace" }}>Loading...</div>}

        {/* Empty */}
        {!loading && packages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
            <Package size={32} color={C.mute} />
            <div style={{ fontSize: 11, fontWeight: 600, color: C.dim }}>No packages yet</div>
            <div style={{ fontSize: 11, color: C.mute, textAlign: 'center', maxWidth: 280 }}>Create your first internet package so users can buy access on the portal.</div>
            <button onClick={openCreate} style={{ marginTop: 8, padding: '8px 14px', background: C.gold, color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> Create Package
            </button>
          </div>
        )}

        {/* Package Grid */}
        {!loading && packages.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          }}>
            {packages.map(pkg => {
              const isDuplicate = nameCounts[pkg.name] > 1
              const isHovered = hoveredCard === pkg.id
              return (
                <div key={pkg.id} data-nav="package-card"
                  onMouseEnter={() => setHoveredCard(pkg.id)} onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    background: C.base,
                    border: `0.5px solid ${isHovered ? C.border2 : C.border}`,
                    borderRadius: 10,
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    transition: 'border-color 0.15s',
                    position: 'relative',
                  }}>
                  {/* Top: Status pill + actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => toggleActive(pkg)} disabled={toggling === pkg.id}
                      style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: 9, fontWeight: 600,
                        fontFamily: "'DM Mono', monospace", cursor: 'pointer', border: 'none',
                        background: pkg.is_active ? 'rgba(111,207,115,0.12)' : 'rgba(229,112,122,0.10)',
                        color: pkg.is_active ? C.green : C.red, letterSpacing: '0.3px',
                      }}>
                      {toggling === pkg.id ? '···' : pkg.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                    <div style={{ display: 'flex', gap: 2, opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s' }}>
                      <button onClick={() => openEdit(pkg)}
                        style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.dim }}>
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleDelete(pkg.id)}
                        style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.red }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 600, color: C.text }}>
                      {pkg.name}
                    </span>
                    {isDuplicate && (
                      <span title="Duplicate package name" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 2,
                        padding: '1px 5px', borderRadius: 3,
                        background: 'rgba(232,184,75,0.12)', color: C.gold,
                        fontSize: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace",
                      }}>
                        <AlertTriangle size={9} /> Dup
                      </span>
                    )}
                  </div>

                  {/* Duration */}
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: C.gold, fontWeight: 500 }}>
                    {pkg.duration_label || `${pkg.duration_hours}h`}
                  </div>

                  {/* Divider */}
                  <div style={{ height: 1, background: C.border, margin: '0 -4px' }} />

                  {/* Price */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 24, fontWeight: 500, color: C.text }}>
                      {pkg.price_ksh.toLocaleString('en-KE')}
                    </span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.dim, fontWeight: 500 }}>
                      Ksh
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 24, maxWidth: 480, width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}>
                {editingPackage ? 'Edit Package' : 'New Package'}
              </div>
              <button onClick={() => { setShowModal(false); setEditingPackage(null) }} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5, fontFamily: 'Inter, sans-serif' }}>Package Name *</label>
                <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Daily Unlimited" style={inputSx} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5, fontFamily: 'Inter, sans-serif' }}>Duration (hours) *</label>
                  <input type="number" min="1" value={formData.duration_hours} onChange={e => setFormData(p => ({ ...p, duration_hours: parseInt(e.target.value) || 1 }))} style={inputSx} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5, fontFamily: 'Inter, sans-serif' }}>Duration Label *</label>
                  <input type="text" value={formData.duration_label} onChange={e => setFormData(p => ({ ...p, duration_label: e.target.value }))} placeholder="e.g. 24 hrs" style={inputSx} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5, fontFamily: 'Inter, sans-serif' }}>Price (KSH) *</label>
                  <input type="number" min="1" step="1" value={formData.price_ksh} onChange={e => setFormData(p => ({ ...p, price_ksh: parseInt(e.target.value) || 0 }))} style={inputSx} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5, fontFamily: 'Inter, sans-serif' }}>Max Devices</label>
                  <input type="number" min="1" value={formData.max_devices} onChange={e => setFormData(p => ({ ...p, max_devices: parseInt(e.target.value) || 1 }))} style={inputSx} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))} style={{ width: 16, height: 16, accentColor: C.gold }} />
                <label style={{ fontSize: 11, color: C.text }}>Active</label>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowModal(false); setEditingPackage(null) }} disabled={submitting}
                  style={{ padding: '10px 16px', background: 'transparent', border: `0.5px solid ${C.mute}`, borderRadius: 6, color: C.dim, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submitting}
                  style={{ padding: '10px 16px', background: submitting ? C.mute : C.gold, border: 'none', borderRadius: 6, color: '#000', fontSize: 11, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                  {submitting ? 'Saving\u2026' : (editingPackage ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
