'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/context/ToastContext'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface MpesaConfig {
  id: string
  shortcode: string
  environment: string
  status: string
  is_active: boolean
  is_verified: boolean
  payout_phone: string
  payout_account_name: string
  account_reference: string
  last_test_status: string | null
  last_test_at: string | null
  verified_at: string | null
}

interface FormState {
  consumer_key: string
  consumer_secret: string
  shortcode: string
  passkey: string
  environment: 'sandbox' | 'production'
  callback_url: string
  account_reference: string
  payout_phone: string
  payout_account_name: string
}

const EMPTY_FORM: FormState = {
  consumer_key: '',
  consumer_secret: '',
  shortcode: '',
  passkey: '',
  environment: 'sandbox',
  callback_url: '',
  account_reference: 'HonestBill',
  payout_phone: '',
  payout_account_name: '',
}

async function apiCall(path: string, token: string, method = 'GET', body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {})
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
  return data
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, color: '#444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#ccc', fontFamily: mono ? 'DM Mono, monospace' : undefined }}>{value || '—'}</div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', placeholder = '', hint = '' }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; hint?: string
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 12px', background: '#080808',
          border: '0.5px solid #1e1e1e', borderRadius: 7, color: '#e0e0e0',
          fontSize: 12, fontFamily: type === 'password' ? 'DM Mono, monospace' : undefined,
          boxSizing: 'border-box', outline: 'none'
        }}
      />
      {hint && <div style={{ fontSize: 10, color: '#333', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

export default function MpesaPage() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [config, setConfig] = useState<MpesaConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const f = (k: keyof FormState) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  const fetchConfig = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiCall('/api/mpesa/config', token)
      setConfig(data)
      setShowForm(false)
    } catch (err: any) {
      // 404 means not configured yet — show form
      if (err.message?.includes('404') || err.message?.includes('not found') || err.message?.includes('No M-Pesa')) {
        setConfig(null)
        setShowForm(true)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchConfig() }, [token])

  const handleSave = async () => {
    if (!form.consumer_key || !form.consumer_secret || !form.shortcode || !form.passkey) {
      showToast('Fill in all required fields', { type: 'error' })
      return
    }
    setSaving(true)
    try {
      await apiCall('/api/mpesa/config', token!, 'POST', form)
      showToast('M-Pesa config saved', { type: 'success' })
      fetchConfig()
    } catch (err: any) {
      showToast(err.message || 'Save failed', { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const result = await apiCall('/api/mpesa/config/test', token!, 'POST')
      if (result.success) {
        showToast('✅ Credentials verified — Daraja connected', { type: 'success' })
        fetchConfig()
      } else {
        showToast(result.message || 'Test failed', { type: 'error' })
      }
    } catch (err: any) {
      showToast(err.message || 'Test failed', { type: 'error' })
    } finally {
      setTesting(false)
    }
  }

  const statusBadge = (status: string, verified: boolean) => {
    if (verified) return { label: 'Verified', bg: '#1a3a1a', color: '#22c55e' }
    if (status === 'configured') return { label: 'Configured', bg: '#1a2a3a', color: '#3b82f6' }
    return { label: status || 'Not configured', bg: '#1a1a1a', color: '#666' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="M-Pesa Configuration" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#030303' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f0f0f0' }}>M-Pesa / Daraja</h1>
            <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>Safaricom STK Push integration</div>
          </div>
          {config && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{ padding: '8px 16px', background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 7, color: '#9ca3af', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              Edit Config
            </button>
          )}
        </div>

        {loading ? (
          <LoadingSpinner size="md" label="Loading configuration…" />
        ) : (
          <div style={{ maxWidth: 520 }}>

            {/* Current config display */}
            {config && !showForm && (
              <>
                <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 20, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#888' }}>DARAJA CONFIG</div>
                    {(() => { const b = statusBadge(config.status, config.is_verified); return (
                      <div style={{ padding: '4px 10px', background: b.bg, borderRadius: 5, fontSize: 10, fontWeight: 700, color: b.color, textTransform: 'uppercase' }}>
                        {b.label}
                      </div>
                    )})()}
                  </div>

                  <Field label="Environment" value={config.environment?.toUpperCase()} />
                  <Field label="Shortcode" value={config.shortcode} mono />
                  <Field label="Account Reference" value={config.account_reference} />
                  <Field label="Payout Phone" value={config.payout_phone} mono />
                  <Field label="Payout Account" value={config.payout_account_name} />
                  {config.last_test_status && (
                    <Field label="Last Test" value={config.last_test_status} />
                  )}
                </div>

                {/* Test button */}
                <button
                  onClick={handleTest}
                  disabled={testing}
                  style={{
                    width: '100%', padding: '12px', background: config.is_verified ? '#1a3a1a' : '#3b82f6',
                    border: config.is_verified ? '0.5px solid #2d5a2d' : 'none',
                    borderRadius: 7, color: config.is_verified ? '#22c55e' : '#030303',
                    fontSize: 12, fontWeight: 700, cursor: testing ? 'not-allowed' : 'pointer',
                    opacity: testing ? 0.7 : 1, marginBottom: 8
                  }}
                >
                  {testing ? 'Testing…' : config.is_verified ? '✓ Test Again' : 'Test & Verify Credentials'}
                </button>
              </>
            )}

            {/* Setup / Edit form */}
            {showForm && (
              <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 20 }}>
                  {config ? 'UPDATE DARAJA CREDENTIALS' : 'FIRST-TIME SETUP'}
                </div>

                <div style={{ padding: '12px 14px', background: '#0a1628', border: '0.5px solid #1a3a5a', borderRadius: 7, marginBottom: 20, fontSize: 11, color: '#5a9fd4', lineHeight: 1.6 }}>
                  Get these from <strong>developer.safaricom.co.ke</strong> → My Apps → your app → Test Credentials tab for shortcode & passkey.
                </div>

                {/* Environment toggle */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Environment</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['sandbox', 'production'] as const).map(env => (
                      <button key={env} onClick={() => setForm(p => ({ ...p, environment: env }))}
                        style={{
                          flex: 1, padding: '9px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          background: form.environment === env ? (env === 'production' ? '#3a1a1a' : '#1a2a3a') : '#0a0a0a',
                          border: form.environment === env ? `0.5px solid ${env === 'production' ? '#5a2d2d' : '#2a4a6a'}` : '0.5px solid #1a1a1a',
                          color: form.environment === env ? (env === 'production' ? '#ff6b6b' : '#3b82f6') : '#555',
                          textTransform: 'uppercase'
                        }}>
                        {env}
                      </button>
                    ))}
                  </div>
                </div>

                <Input label="Consumer Key *" value={form.consumer_key} onChange={f('consumer_key')} placeholder="From Daraja developer portal" />
                <Input label="Consumer Secret *" value={form.consumer_secret} onChange={f('consumer_secret')} type="password" placeholder="••••••••••••" />
                <Input label="Business Shortcode *" value={form.shortcode} onChange={f('shortcode')} placeholder="e.g. 174379" hint="Sandbox default: 174379" />
                <Input label="Passkey *" value={form.passkey} onChange={f('passkey')} type="password" placeholder="From Test Credentials tab" />
                <Input label="Callback URL" value={form.callback_url} onChange={f('callback_url')} placeholder="https://your-domain.com/api/mpesa/callback" hint="Must be public HTTPS — use ngrok for local dev" />
                <Input label="Account Reference" value={form.account_reference} onChange={f('account_reference')} placeholder="HonestBill" hint="Appears on customer M-Pesa statement (max 12 chars)" />
                <Input label="Payout Phone" value={form.payout_phone} onChange={f('payout_phone')} placeholder="254712345678" hint="Your M-Pesa number for receiving payouts" />
                <Input label="Payout Account Name" value={form.payout_account_name} onChange={f('payout_account_name')} placeholder="Your business name" />

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      flex: 1, padding: '12px', background: '#3b82f6', border: 'none',
                      borderRadius: 7, color: '#030303', fontSize: 12, fontWeight: 700,
                      cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1
                    }}
                  >
                    {saving ? 'Saving…' : 'Save Configuration'}
                  </button>
                  {config && (
                    <button
                      onClick={() => setShowForm(false)}
                      style={{
                        padding: '12px 16px', background: '#1a1a1a', border: '0.5px solid #2a2a2a',
                        borderRadius: 7, color: '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}