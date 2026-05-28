'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/context/ToastContext'
import { Plus, Edit, Trash2 } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Package {
  id: string
  name: string
  duration_minutes: number
  price_ksh: number
  is_active: boolean
}

export default function PackagesPage() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Packages" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: '#030303' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Packages</h1>
          <button
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
                      {pkg.duration_minutes} min · Ksh {pkg.price_ksh}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Edit size={16} style={{ cursor: 'pointer', color: '#3b82f6' }} />
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
  )
}