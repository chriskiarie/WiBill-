'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/context/ToastContext'
import { Plus, Edit, Trash2, X, Package } from 'lucide-react'

const C = {
  void: '#030303',
  base: '#0a0a0a',
  border: '#141414',
  border2: '#1a1a1a',
  text: '#f0f0f0',
  dim: '#666666',
  mute: '#2a2a2a',
  gold: '#E8B84B',
  green: '#22c55e',
  red: '#ef4444',
}

interface Package {
  id: string
  name: string
  duration_hours: number
  price_ksh: number
  is_active: boolean
  duration_label?: string
  max_devices?: number
  display_order?: number
}

interface PackageForm {
  name: string
  duration_hours: number
  duration_label: string
  price_ksh: number
  max_devices: number
  is_active: boolean
}

export default function PackagesPage() {
  const { token, user } = useAuth()
  const { showToast } = useToast()
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [formData, setFormData] = useState<PackageForm>({
    name: '',
    duration_hours: 1,
    duration_label: '1 hr',
    price_ksh: 0,
    max_devices: 1,
    is_active: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [bulkUpdating, setBulkUpdating] = useState(false)

  const fetchPackages = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await api.getPackages()
      setPackages(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      const msg = (err as Error).message
      setError(msg)
      showToast('Failed to load packages', { type: 'error', message: msg })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPackages()
  }, [token])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this package?')) return
    try {
      await api.deletePackage(id)
      setPackages(p => p.filter(x => x.id !== id))
      showToast('Package deleted', { type: 'success' })
    } catch (err) {
      showToast('Failed to delete', { type: 'error', message: (err as Error).message })
    }
  }

  const openCreateModal = () => {
    setEditingPackage(null)
    setFormData({ name: '', duration_hours: 1, duration_label: '1 hr', price_ksh: 0, max_devices: 1, is_active: true })
    setShowModal(true)
  }

  const openEditModal = (pkg: Package) => {
    setEditingPackage(pkg)
    setFormData({
      name: pkg.name,
      duration_hours: pkg.duration_hours,
      duration_label: pkg.duration_label || `${pkg.duration_hours} hr${pkg.duration_hours > 1 ? 's' : ''}`,
      price_ksh: pkg.price_ksh,
      max_devices: pkg.max_devices || 1,
      is_active: pkg.is_active,
    })
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditingPackage(null) }

  const toggleActive = async (pkg: Package) => {
    setToggling(pkg.id)
    try {
      await api.updatePackage(pkg.id, { is_active: !pkg.is_active })
      setPackages(packages.map(p => p.id === pkg.id ? { ...p, is_active: !p.is_active } : p))
      showToast(`${pkg.name} ${pkg.is_active ? 'deactivated' : 'activated'}`, { type: 'success' })
    } catch (err) {
      showToast('Failed to toggle', { type: 'error', message: (err as Error).message })
    } finally { setToggling(null) }
  }

  const bulkToggle = async (activate: boolean) => {
    const ids = packages.map(p => p.id)
    if (!confirm(`${activate ? 'Activate' : 'Deactivate'} all ${ids.length} packages?`)) return
    setBulkUpdating(true)
    try {
      await api.bulkUpdatePackages(ids, activate)
      setPackages(packages.map(p => ({ ...p, is_active: activate })))
      showToast(`All packages ${activate ? 'activated' : 'deactivated'}`, { type: 'success' })
    } catch (err) {
      showToast('Bulk update failed', { type: 'error', message: (err as Error).message })
    } finally { setBulkUpdating(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || formData.price_ksh <= 0) {
      showToast('Name and price are required', { type: 'error' })
      return
    }
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
      closeModal()
    } catch (err) {
      showToast('Failed to save', { type: 'error', message: (err as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Packages" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: C.void }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: C.text }}>Packages</h1>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {packages.length > 0 && (
              <>
                <button onClick={() => bulkToggle(true)} disabled={bulkUpdating} style={{ padding: '6px 10px', background: C.base, border: `0.5px solid ${C.border2}`, borderRadius: 5, color: C.green, fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Mono', monospace" }}>
                  Activate All
                </button>
                <button onClick={() => bulkToggle(false)} disabled={bulkUpdating} style={{ padding: '6px 10px', background: C.base, border: `0.5px solid ${C.border2}`, borderRadius: 5, color: C.dim, fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Mono', monospace" }}>
                  Deactivate All
                </button>
              </>
            )}
            <button onClick={openCreateModal} style={{ padding: '8px 14px', background: C.gold, color: C.void, border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700 }}>
              <Plus size={16} /> New Package
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: 12, background: '#1a0f0f', border: `1px solid ${C.red}33`, borderRadius: 6, color: C.red, marginBottom: 16, fontSize: 11 }}>
            {error}
            <button onClick={fetchPackages} style={{ marginLeft: 8, color: C.gold, cursor: 'pointer', background: 'none', border: 'none' }}>Retry</button>
          </div>
        )}

        {loading ? (
          <LoadingSpinner size="md" label="Loading packages..." />
        ) : packages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
            <Package size={32} color={C.mute} />
            <div style={{ fontSize: 11, fontWeight: 600, color: C.dim }}>No packages yet</div>
            <div style={{ fontSize: 11, color: C.mute, textAlign: 'center', maxWidth: 280 }}>Create your first internet package so users can buy access on the portal.</div>
            <button onClick={openCreateModal} style={{ marginTop: 8, padding: '8px 14px', background: C.gold, color: C.void, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> Create Package
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {packages.map(pkg => (
              <div key={pkg.id} style={{ background: C.base, border: `1px solid ${C.border}`, borderRadius: 11, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}>{pkg.name}</div>
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 4, fontFamily: "'DM Mono', monospace" }}>{pkg.duration_hours}h · Ksh {pkg.price_ksh.toLocaleString('en-KE')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Edit size={14} style={{ cursor: 'pointer', color: C.gold }} onClick={() => openEditModal(pkg)} />
                    <Trash2 size={14} style={{ cursor: 'pointer', color: C.red }} onClick={() => handleDelete(pkg.id)} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 10, fontFamily: "'DM Mono', monospace", alignItems: 'center' }}>
                  <button onClick={() => toggleActive(pkg)} disabled={toggling === pkg.id}
                    style={{ padding: '2px 8px', borderRadius: 4, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', border: 'none', background: pkg.is_active ? `${C.green}20` : `${C.red}20`, color: pkg.is_active ? C.green : C.red, fontFamily: "'DM Mono', monospace" }}>
                    {toggling === pkg.id ? '...' : pkg.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </button>
                  {pkg.duration_label && <span style={{ color: C.dim }}>·</span>}
                  {pkg.duration_label && <span style={{ color: C.dim }}>{pkg.duration_label}</span>}
                  {pkg.max_devices && <span style={{ color: C.dim }}>·</span>}
                  {pkg.max_devices && <span style={{ color: C.dim }}>{pkg.max_devices} device{pkg.max_devices > 1 ? 's' : ''}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.base, border: `1px solid ${C.border}`, borderRadius: 11, padding: 24, maxWidth: 480, width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}>
                {editingPackage ? 'Edit Package' : 'New Package'}
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5, fontFamily: 'Inter, sans-serif' }}>
                  Package Name *
                </label>
                <input type="text" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Daily Unlimited"
                  style={{ width: '100%', padding: '10px 12px', background: '#050505', border: `1px solid ${C.border2}`, borderRadius: 7, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                  required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5, fontFamily: 'Inter, sans-serif' }}>
                    Duration (hours) *
                  </label>
                  <input type="number" min="1" value={formData.duration_hours}
                    onChange={(e) => setFormData(p => ({ ...p, duration_hours: parseInt(e.target.value) || 1 }))}
                    style={{ width: '100%', padding: '10px 12px', background: '#050505', border: `1px solid ${C.border2}`, borderRadius: 7, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                    required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5, fontFamily: 'Inter, sans-serif' }}>
                    Duration Label *
                  </label>
                  <input type="text" value={formData.duration_label}
                    onChange={(e) => setFormData(p => ({ ...p, duration_label: e.target.value }))}
                    placeholder="e.g. 24 hrs"
                    style={{ width: '100%', padding: '10px 12px', background: '#050505', border: `1px solid ${C.border2}`, borderRadius: 7, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                    required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5, fontFamily: 'Inter, sans-serif' }}>
                    Price (KSH) *
                  </label>
                  <input type="number" min="1" step="1" value={formData.price_ksh}
                    onChange={(e) => setFormData(p => ({ ...p, price_ksh: parseInt(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '10px 12px', background: '#050505', border: `1px solid ${C.border2}`, borderRadius: 7, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                    required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5, fontFamily: 'Inter, sans-serif' }}>
                    Max Devices
                  </label>
                  <input type="number" min="1" value={formData.max_devices}
                    onChange={(e) => setFormData(p => ({ ...p, max_devices: parseInt(e.target.value) || 1 }))}
                    style={{ width: '100%', padding: '10px 12px', background: '#050505', border: `1px solid ${C.border2}`, borderRadius: 7, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <input type="checkbox" checked={formData.is_active}
                  onChange={(e) => setFormData(p => ({ ...p, is_active: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: C.gold }} />
                <label style={{ fontSize: 11, color: C.text }}>Active</label>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={closeModal} disabled={submitting}
                  style={{ padding: '10px 16px', background: C.mute, border: 'none', borderRadius: 6, color: C.dim, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  style={{ padding: '10px 16px', background: submitting ? C.mute : C.gold, border: 'none', borderRadius: 6, color: C.void, fontSize: 11, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
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