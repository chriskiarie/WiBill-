'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/context/ToastContext'

interface MpesaConfig {
  id: string
  consumer_key: string
  consumer_secret: string
  business_shortcode: string
  passkey: string
  environment: 'sandbox' | 'production'
  is_active: boolean
}

export default function MpesaPage() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [config, setConfig] = useState<MpesaConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await api.getMpesaConfig()
      setConfig(data)
      setError(null)
    } catch (err) {
      const msg = (err as Error).message
      setError(msg)
      showToast('Failed to load config', { type: 'error', message: msg })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [token])

  const handleTest = async () => {
    try {
      const result = await api.testMpesaConnection()
      if (result.status) {
        showToast('M-Pesa connection OK', { type: 'success' })
      } else {
        showToast('M-Pesa connection failed', { type: 'error', message: result.message })
      }
    } catch (err) {
      showToast('Test failed', { type: 'error', message: (err as Error).message })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="M-Pesa Configuration" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: '#030303' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, marginBottom: 24 }}>M-Pesa Configuration</h1>

        {error && (
          <div style={{ padding: 12, background: '#3a1a1a', border: '1px solid #5a2d2d', borderRadius: 6, color: '#ff6b6b', marginBottom: 16 }}>
            {error}
            <button onClick={fetchConfig} style={{ marginLeft: 8, color: '#ff8787', cursor: 'pointer' }}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <LoadingSpinner size="md" label="Loading configuration..." />
        ) : config ? (
          <div style={{ maxWidth: 500 }}>
            <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 20, marginBottom: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Status</label>
                <div style={{ fontSize: 14, color: config.is_active ? '#22c55e' : '#f87171' }}>
                  {config.is_active ? '✓ Active' : '✗ Inactive'}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Environment</label>
                <div style={{ fontSize: 14, color: '#ccc' }}>{config.environment}</div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Business Shortcode</label>
                <div style={{ fontSize: 14, color: '#ccc', fontFamily: 'DM Mono, monospace' }}>
                  {config.business_shortcode}
                </div>
              </div>

              <button
                onClick={handleTest}
                style={{
                  padding: '10px 20px',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 12,
                  width: '100%',
                }}
              >
                Test Connection
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}