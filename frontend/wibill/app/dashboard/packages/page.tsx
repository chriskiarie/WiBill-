'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/context/ToastContext'
import { Plus, Edit, Trash2, X } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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

  const fetchPackages = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await api.getPackages(user?.tenant_id)
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
    setFormData({
      name: '',
      duration_hours: 1,
      duration_label: '1 hr',
      price_ksh: 0,
      max_devices: 1,
      is_active: true,
    })
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

  const closeModal = () => {
    setShowModal(false)
    setEditingPackage(null)
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
        setPackages([...packages, newPkg])
        showToast('Package created', { type: 'success' })
      }
      closeModal()
    } catch (err) {
      showToast('Failed to save', { type: 'error', message: (err as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (field: keyof PackageForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Packages" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: '#030303' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Packages</h1>
          <button
            onClick={openCreateModal}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Plus size={16} /> New Package
          </button>
        </div>

        {error && (
          <div style={{ padding: 12, background: '#3a1a1a', border: '1px solid #5a2d2d', borderRadius: 6, color: '#ff6b6b', marginBottom: 16 }}>
            {error}
            <button onClick={fetchPackages} style={{ marginLeft: 8, color: '#ff8787', cursor: 'pointer' }}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <LoadingSpinner size="md" label="Loading packages..." />
        ) : packages.length === 0 ? (
          <div style={{ color: '#444', fontSize: 14, padding: '40px', textAlign: 'center' }}>
            No packages yet
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
            {packages.map(pkg => (
              <div key={pkg.id} style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{pkg.name}</div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                      {pkg.duration_hours}h · Ksh {pkg.price_ksh}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Edit size={16} style={{ cursor: 'pointer', color: '#3b82f6' }} onClick={() => openEditModal(pkg)} />
                    <Trash2 size={16} style={{ cursor: 'pointer', color: '#f87171' }} onClick={() => handleDelete(pkg.id)} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#444' }}>
                  Status: {pkg.is_active ? '✓ Active' : '✗ Inactive'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Create/Edit Package Modal */}
    {showModal && (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: '#0a0a0a',
          border: '0.5px solid #141414',
          borderRadius: 11,
          padding: '24px',
          maxWidth: 480,
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20
          }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {editingPackage ? 'Edit Package' : 'New Package'}
            </div>
            <button
              onClick={closeModal}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 20,
                color: '#666',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>
                Package Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Daily Unlimited"
                style={{
                  width: '100%', padding: '10px 12px', background: '#080808',
                  border: '0.5px solid #1e1e1e', borderRadius: 7, color: '#e0e0e0',
                  fontSize: 13, boxSizing: 'border-box', outline: 'none'
                }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>
                  Duration (hours) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.duration_hours}
                  onChange={(e) => handleChange('duration_hours', parseInt(e.target.value) || 1)}
                  style={{
                    width: '100%', padding: '10px 12px', background: '#080808',
                    border: '0.5px solid #1e1e1e', borderRadius: 7, color: '#e0e0e0',
                    fontSize: 13, boxSizing: 'border-box', outline: 'none'
                  }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>
                  Duration Label *
                </label>
                <input
                  type="text"
                  value={formData.duration_label}
                  onChange={(e) => handleChange('duration_label', e.target.value)}
                  placeholder="e.g. 24 hrs"
                  style={{
                    width: '100%', padding: '10px 12px', background: '#080808',
                    border: '0.5px solid #1e1e1e', borderRadius: 7, color: '#e0e0e0',
                    fontSize: 13, boxSizing: 'border-box', outline: 'none'
                  }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>
                  Price (KSH) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.price_ksh}
                  onChange={(e) => handleChange('price_ksh', parseInt(e.target.value) || 0)}
                  style={{
                    width: '100%', padding: '10px 12px', background: '#080808',
                    border: '0.5px solid #1e1e1e', borderRadius: 7, color: '#e0e0e0',
                    fontSize: 13, boxSizing: 'border-box', outline: 'none'
                  }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>
                  Max Devices
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_devices}
                  onChange={(e) => handleChange('max_devices', parseInt(e.target.value) || 1)}
                  style={{
                    width: '100%', padding: '10px 12px', background: '#080808',
                    border: '0.5px solid #1e1e1e', borderRadius: 7, color: '#e0e0e0',
                    fontSize: 13, boxSizing: 'border-box', outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#ccc' }}>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#3b82f6' }}
                />
                Active
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                style={{
                  padding: '10px 16px', background: '#1a1a1a', border: '0.5px solid #2a2a2a',
                  borderRadius: 6, color: '#9ca3af', fontSize: 11, fontWeight: 700, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '10px 16px', background: submitting ? '#444' : '#3b82f6', border: 'none',
                  borderRadius: 6, color: '#030303', fontSize: 11, fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1
                }}
              >
                {submitting ? 'Saving…' : (editingPackage ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  )
}