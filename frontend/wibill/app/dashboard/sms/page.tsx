'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/context/ToastContext'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { MessageSquare, CheckCircle, XCircle, Trash2, RefreshCw } from 'lucide-react'

const C = {
  void: 'var(--theme-bg)', base: 'var(--theme-card-base)', border: 'var(--theme-border)', border2: 'var(--theme-border2)',
  text: 'var(--theme-text)', dim: 'var(--theme-dim)', mute: 'var(--theme-mute)', faint: 'var(--theme-faint)',
  gold: 'var(--theme-gold)', green: 'var(--theme-green)', red: 'var(--theme-red)',
}

interface SmsConfig {
  id: string
  provider: string
  environment: string
  sender_id: string | null
  status: string
  is_active: boolean
  is_verified: boolean
  last_test_status: string | null
  last_test_at: string | null
  verified_at: string | null
}

interface FormState {
  api_key: string
  username: string
  sender_id: string
  environment: 'sandbox' | 'production'
}

const EMPTY_FORM: FormState = {
  api_key: '',
  username: '',
  sender_id: '',
  environment: 'sandbox',
}

export default function SmsConfigPage() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [config, setConfig] = useState<SmsConfig | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (!token) return
    fetchConfig()
  }, [token])

  async function fetchConfig() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/sms/config`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.configured) {
        setConfig(data)
        setForm({
          api_key: '',
          username: '',
          sender_id: data.sender_id || '',
          environment: data.environment || 'sandbox',
        })
      }
    } catch (e) {
      console.error('Failed to fetch SMS config', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!form.api_key || !form.username) {
      showToast('API key and username are required', { type: 'error' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/sms/config`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        showToast('SMS configuration saved', { type: 'success' })
        setHasChanges(false)
        fetchConfig()
      } else {
        showToast(data.detail || 'Failed to save', { type: 'error' })
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to save', { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/sms/config/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok && data.success) {
        showToast('SMS credentials verified', { type: 'success' })
        fetchConfig()
      } else {
        showToast(data.detail || 'Test failed', { type: 'error' })
      }
    } catch (e: any) {
      showToast(e.message || 'Test failed', { type: 'error' })
    } finally {
      setTesting(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Remove SMS configuration? Bulk SMS will fall back to mock mode.')) return
    setDeleting(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/sms/config`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        showToast('SMS configuration removed', { type: 'success' })
        setConfig(null)
        setForm(EMPTY_FORM)
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to delete', { type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Topbar title="SMS" />
        <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', background: C.void, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSpinner size="md" color="var(--theme-gold)" label="Loading..." />
        </div>
      </div>
    )
  }

  const statusColor = config?.is_verified ? C.green : config?.status === 'failed' ? C.red : C.dim
  const statusText = config?.is_verified ? 'Verified' : config?.status === 'configured' ? 'Not tested' : config?.status === 'failed' ? 'Failed' : 'Not configured'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="SMS" subsection="Africa's Talking" />
      <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', background: C.void, padding: 28 }}>

        {/* Status header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'color-mix(in srgb, var(--theme-gold) 8%, transparent)', border: '0.5px solid color-mix(in srgb, var(--theme-gold) 20%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={18} color={C.gold} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: '"Space Grotesk", sans-serif', color: C.text }}>SMS Configuration</div>
            <div style={{ fontSize: 12, color: C.dim, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor }} />
              {statusText}
            </div>
          </div>
        </div>

        {/* Main card */}
        <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 24, maxWidth: 520 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 20, paddingBottom: 12, borderBottom: `0.5px solid ${C.border}` }}>
            Africa's Talking Credentials
          </div>

          {/* Environment selector */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Environment</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['sandbox', 'production'] as const).map(env => (
                <button key={env} onClick={() => { setForm(f => ({ ...f, environment: env })); setHasChanges(true) }}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 7, border: `0.5px solid ${form.environment === env ? C.gold : C.border2}`, background: form.environment === env ? 'color-mix(in srgb, var(--theme-gold) 8%, transparent)' : 'transparent', color: form.environment === env ? C.gold : C.dim, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', textTransform: 'capitalize' }}>
                  {env}
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>API Key</div>
            <input type="password" value={form.api_key} onChange={e => { setForm(f => ({ ...f, api_key: e.target.value })); setHasChanges(true) }}
              placeholder={config ? '•••••••• (enter new key to update)' : 'Your Africa\'s Talking API key'}
              style={{ width: '100%', padding: '10px 12px', background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Username */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>Username</div>
            <input type="text" value={form.username} onChange={e => { setForm(f => ({ ...f, username: e.target.value })); setHasChanges(true) }}
              placeholder="your_africastalking_username"
              style={{ width: '100%', padding: '10px 12px', background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Sender ID */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>Sender ID <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></div>
            <input type="text" value={form.sender_id} onChange={e => { setForm(f => ({ ...f, sender_id: e.target.value })); setHasChanges(true) }}
              placeholder="WiBill"
              style={{ width: '100%', padding: '10px 12px', background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} disabled={saving || !hasChanges && !!config}
              style={{ flex: 1, padding: '11px 16px', borderRadius: 7, border: 'none', background: saving || (!hasChanges && !!config) ? '#555' : C.gold, color: '#000', fontSize: 12, fontWeight: 700, cursor: saving || (!hasChanges && !!config) ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: saving || (!hasChanges && !!config) ? 0.6 : 1 }}>
              {saving ? 'Saving...' : 'Save credentials'}
            </button>
            {config && (
              <button onClick={handleTest} disabled={testing}
                style={{ padding: '11px 16px', borderRadius: 7, border: `0.5px solid ${C.border2}`, background: 'transparent', color: C.dim, fontSize: 12, fontWeight: 600, cursor: testing ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 5 }}>
                {testing ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={12} />}
                Test
              </button>
            )}
          </div>

          {/* Test result */}
          {config?.last_test_status && (
            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 7, background: config.is_verified ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `0.5px solid ${config.is_verified ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, fontSize: 11, color: config.is_verified ? C.green : C.red, fontFamily: 'DM Mono, monospace' }}>
              {config.last_test_status}
            </div>
          )}
        </div>

        {/* Delete */}
        {config && (
          <button onClick={handleDelete} disabled={deleting}
            style={{ marginTop: 16, padding: '8px 14px', borderRadius: 7, border: `0.5px solid ${C.border2}`, background: 'transparent', color: C.red, fontSize: 11, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 5, opacity: deleting ? 0.5 : 1 }}>
            <Trash2 size={12} /> Remove configuration
          </button>
        )}

        {/* Help text */}
        <div style={{ marginTop: 24, padding: 16, background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 9, maxWidth: 520 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>How to get credentials</div>
          <ol style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: C.dim, lineHeight: 1.7, fontFamily: 'Inter, sans-serif' }}>
            <li>Create an account at <a href="https://africastalking.com" target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>africastalking.com</a></li>
            <li>Go to <strong>Dashboard → Africa\'s Talking API</strong></li>
            <li>Copy your <strong>API Key</strong> and <strong>Username</strong></li>
            <li>For sandbox testing, use the sandbox API key</li>
            <li>For live SMS, switch to production and use your production key</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
