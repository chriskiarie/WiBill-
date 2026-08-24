'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/context/ToastContext'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const C = {
  void: 'var(--theme-bg)', base: 'var(--theme-card-base)', border: 'var(--theme-border)', border2: 'var(--theme-border2)',
  text: 'var(--theme-text)', dim: 'var(--theme-dim)', mute: 'var(--theme-mute)', faint: 'var(--theme-faint)',
  gold: 'var(--theme-gold)', green: 'var(--theme-green)', red: 'var(--theme-red)',
}

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 13, color: C.text, fontFamily: mono ? 'DM Mono, monospace' : undefined }}>{value || '—'}</div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', placeholder = '', hint = '' }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; hint?: string
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 12px', background: 'var(--theme-surface)',
          border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text,
          fontSize: 12, fontFamily: type === 'password' ? 'DM Mono, monospace' : undefined,
          boxSizing: 'border-box', outline: 'none'
        }}
      />
      {hint && <div style={{ fontSize: 10, color: 'var(--theme-faint)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

export default function SmsConfigPage() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [config, setConfig] = useState<SmsConfig | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)

  const f = (k: keyof FormState) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!token) return
    fetchConfig()
  }, [token])

  async function fetchConfig() {
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/api/sms/config`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.configured) {
        setConfig(data)
        setShowForm(false)
      } else {
        setConfig(null)
        setShowForm(true)
      }
    } catch (e) {
      console.error('Failed to fetch SMS config', e)
      setConfig(null)
      setShowForm(true)
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
      const res = await fetch(`${BASE}/api/sms/config`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        showToast('SMS configuration saved', { type: 'success' })
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
      const res = await fetch(`${BASE}/api/sms/config/test`, {
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
    try {
      const res = await fetch(`${BASE}/api/sms/config`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        showToast('SMS configuration removed', { type: 'success' })
        setConfig(null)
        setForm(EMPTY_FORM)
        setShowForm(true)
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to delete', { type: 'error' })
    }
  }

  const statusBadge = (status: string, verified: boolean) => {
    if (verified) return { label: 'Verified', bg: 'rgba(34,197,94,0.1)', color: C.green }
    if (status === 'configured') return { label: 'Configured', bg: 'color-mix(in srgb, var(--theme-gold) 10%, transparent)', color: C.gold }
    return { label: status || 'Not configured', bg: 'var(--theme-surface)', color: C.dim }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="SMS Configuration" />
      <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', background: C.void }}>

        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {/* Logo + Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
            <div style={{ width: 72, height: 72, borderRadius: 12, background: '#1a1a1a', border: `0.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <img src="/integrations/africastalking.png" alt="Africa's Talking" style={{ width: 48, height: 48, objectFit: 'contain' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Africa's Talking</h1>
              <div style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>SMS gateway for bulk messaging and notifications</div>
            </div>
            {config && !showForm && (
              <button
                onClick={() => setShowForm(true)}
                style={{ padding: '9px 18px', background: 'var(--theme-surface)', border: `0.5px solid ${C.border2}`, borderRadius: 7, color: C.dim, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Edit Config
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ background: 'var(--theme-surface)', border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 40 }}>
              <LoadingSpinner size="md" label="Loading configuration…" />
            </div>
          ) : (
            <div style={{ background: 'var(--theme-surface)', border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 24 }}>
              {/* Current config display */}
              {config && !showForm && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SMS Config</div>
                    {(() => { const b = statusBadge(config.status, config.is_verified); return (
                      <div style={{ padding: '4px 10px', background: b.bg, borderRadius: 5, fontSize: 11, fontWeight: 700, color: b.color, textTransform: 'uppercase' }}>
                        {b.label}
                      </div>
                    )})()}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <Field label="Environment" value={config.environment?.toUpperCase()} />
                    <Field label="Sender ID" value={config.sender_id || 'Default'} />
                    {config.last_test_status && (
                      <Field label="Last Test" value={config.last_test_status} />
                    )}
                  </div>

                  <button
                    onClick={handleTest}
                    disabled={testing}
                    style={{
                      width: '100%', padding: '12px', background: config.is_verified ? 'rgba(34,197,94,0.08)' : C.gold,
                      border: config.is_verified ? '0.5px solid rgba(34,197,94,0.2)' : 'none',
                      borderRadius: 7, color: config.is_verified ? C.green : '#000',
                      fontSize: 13, fontWeight: 700, cursor: testing ? 'not-allowed' : 'pointer',
                      opacity: testing ? 0.7 : 1,
                    }}
                  >
                    {testing ? 'Testing…' : config.is_verified ? '✓ Test Again' : 'Test & Verify Credentials'}
                  </button>
                </>
              )}

              {/* Setup / Edit form */}
              {showForm && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.dim, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {config ? 'Update Africa\'s Talking Credentials' : 'First-Time Setup'}
                  </div>

                  <div style={{ padding: '10px 14px', background: 'var(--theme-card-base)', border: `0.5px solid ${C.border}`, borderRadius: 7, marginBottom: 18, fontSize: 12, color: C.dim, lineHeight: 1.6 }}>
                    Get these from <strong>africastalking.com</strong> → Dashboard → Africa's Talking API → Credentials.
                  </div>

                  {/* Environment toggle */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Environment</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['sandbox', 'production'] as const).map(env => (
                        <button key={env} type="button" onClick={() => f('environment')(env)}
                          style={{
                            flex: 1, padding: '9px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            background: form.environment === env ? 'color-mix(in srgb, var(--theme-gold) 8%, transparent)' : 'var(--theme-card-base)',
                            border: form.environment === env ? '0.5px solid color-mix(in srgb, var(--theme-gold) 20%, transparent)' : `0.5px solid ${C.border2}`,
                            color: form.environment === env ? C.gold : C.dim,
                            textTransform: 'uppercase'
                          }}>
                          {env}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2-column grid for credentials */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: C.text, display: 'block', marginBottom: 4 }}>API Key *</label>
                      <input type="password" value={form.api_key} onChange={e => f('api_key')(e.target.value)} placeholder="Your Africa's Talking API key"
                        style={{ width: '100%', padding: '9px 10px', background: 'var(--theme-card-base)', border: `0.5px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 12, fontFamily: 'DM Mono, monospace', boxSizing: 'border-box', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: C.text, display: 'block', marginBottom: 4 }}>Username *</label>
                      <input value={form.username} onChange={e => f('username')(e.target.value)} placeholder="your_africastalking_username"
                        style={{ width: '100%', padding: '9px 10px', background: 'var(--theme-card-base)', border: `0.5px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 12, fontFamily: 'DM Mono, monospace', boxSizing: 'border-box', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: C.text, display: 'block', marginBottom: 4 }}>Sender ID</label>
                      <input value={form.sender_id} onChange={e => f('sender_id')(e.target.value)} placeholder="WiBill"
                        style={{ width: '100%', padding: '9px 10px', background: 'var(--theme-card-base)', border: `0.5px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
                      <div style={{ fontSize: 10, color: C.faint, marginTop: 3 }}>Optional — leave blank for default</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        flex: 1, padding: '11px', background: C.gold, border: 'none',
                        borderRadius: 7, color: '#000', fontSize: 13, fontWeight: 700,
                        cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1
                      }}
                    >
                      {saving ? 'Saving…' : 'Save Configuration'}
                    </button>
                    {config && (
                      <button
                        onClick={() => setShowForm(false)}
                        style={{
                          padding: '11px 18px', background: 'var(--theme-card-base)', border: `0.5px solid ${C.border2}`,
                          borderRadius: 7, color: '#666', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Delete */}
          {config && !showForm && (
            <button onClick={handleDelete}
              style={{ marginTop: 16, padding: '9px 16px', borderRadius: 7, border: `0.5px solid ${C.border2}`, background: 'transparent', color: C.red, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              Remove configuration
            </button>
          )}

          {/* Help text */}
          <div style={{ marginTop: 24, padding: 16, background: 'var(--theme-surface)', border: `0.5px solid ${C.border}`, borderRadius: 9 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>How to get credentials</div>
            <ol style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: C.dim, lineHeight: 1.7, fontFamily: 'Inter, sans-serif' }}>
              <li>Create an account at <a href="https://africastalking.com" target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>africastalking.com</a></li>
              <li>Go to <strong>Dashboard → Africa's Talking API</strong></li>
              <li>Copy your <strong>API Key</strong> and <strong>Username</strong></li>
              <li>For sandbox testing, use the sandbox API key</li>
              <li>For live SMS, switch to production and use your production key</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
