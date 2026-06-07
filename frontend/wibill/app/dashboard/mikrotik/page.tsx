'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/context/ToastContext'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface MikrotikConfig {
  id: string
  router_ip: string
  api_port: number
  api_username: string
  hotspot_server: string
  nas_ip_address: string | null
  created_at: string
  updated_at: string
}

interface FormState {
  router_ip: string
  api_port: string
  api_username: string
  api_password: string
  hotspot_server: string
  nas_ip_address: string
}

const EMPTY: FormState = {
  router_ip: '', api_port: '8728', api_username: 'admin',
  api_password: '', hotspot_server: 'hotspot1', nas_ip_address: '',
}

async function apiCall(path: string, token: string, method = 'GET', body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
  return data
}

export default function MikrotikPage() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [config, setConfig] = useState<MikrotikConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const fetchConfig = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiCall('/api/tenants/mikrotik', token)
      setConfig(data)
      setForm({
        router_ip: data.router_ip || '',
        api_port: String(data.api_port || 8728),
        api_username: data.api_username || 'admin',
        api_password: '',      // never pre-filled for security
        hotspot_server: data.hotspot_server || 'hotspot1',
        nas_ip_address: data.nas_ip_address || '',
      })
    } catch (err: any) {
      // 404 = not configured yet — that's fine
      if (!err.message?.includes('404') && !err.message?.includes('not found')) {
        showToast(err.message, { type: 'error' })
      }
    } finally {
      setLoading(false)
    }
  }, [token, showToast])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const set = (k: keyof FormState) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.router_ip || !form.api_username) {
      showToast('Router IP and username are required', { type: 'error' }); return
    }
    if (!config && !form.api_password) {
      showToast('Password is required for initial setup', { type: 'error' }); return
    }
    setSaving(true)
    setTestResult(null)
    try {
      const payload: any = {
        router_ip: form.router_ip,
        api_port: parseInt(form.api_port) || 8728,
        api_username: form.api_username,
        hotspot_server: form.hotspot_server || 'hotspot1',
        nas_ip_address: form.nas_ip_address || null,
      }
      if (form.api_password) payload.api_password = form.api_password

      const method = config ? 'PATCH' : 'POST'
      await apiCall('/api/tenants/mikrotik', token!, method, payload)
      showToast('MikroTik config saved', { type: 'success' })
      setForm(f => ({ ...f, api_password: '' }))
      fetchConfig()
    } catch (err) {
      showToast((err as Error).message, { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const test = async () => {
    if (!config) { showToast('Save config first', { type: 'error' }); return }
    setTesting(true)
    setTestResult(null)
    try {
      const data = await apiCall('/api/tenants/mikrotik/test', token!, 'POST')
      setTestResult({ ok: true, message: data.message || 'Connection successful' })
    } catch (err) {
      setTestResult({ ok: false, message: (err as Error).message })
    } finally {
      setTesting(false)
    }
  }

  const inp: React.CSSProperties = {
    background: '#0a0a0a', border: '0.5px solid #1e1e1e', borderRadius: 7,
    color: '#e0e0e0', fontFamily: 'DM Mono, monospace', fontSize: 13,
    padding: '9px 12px', width: '100%', boxSizing: 'border-box', outline: 'none',
  }
  const lbl: React.CSSProperties = {
    fontSize: 10, color: '#444', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.6px', display: 'block', marginBottom: 5,
  }
  const mono: React.CSSProperties = { fontFamily: 'DM Mono, monospace' }
  const card: React.CSSProperties = {
    background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 22,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="MikroTik" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: '#030303' }}>

        {loading ? <LoadingSpinner size="md" label="Loading MikroTik config…" /> : (
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, maxWidth: 860 }}>

            {/* config form */}
            <div style={card}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f0', marginBottom: 4 }}>
                  Router Configuration
                </div>
                <div style={{ ...mono, fontSize: 10, color: '#2a2a2a' }}>
                  {config ? 'Update your MikroTik RouterOS API credentials' : 'Connect your MikroTik router to enable hotspot management'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={lbl}>Router IP address *</label>
                  <input style={inp} placeholder="192.168.88.1"
                    value={form.router_ip} onChange={e => set('router_ip')(e.target.value)} />
                  <div style={{ ...mono, fontSize: 9, color: '#1e1e1e', marginTop: 4 }}>
                    Local network IP of your MikroTik router
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>API Port</label>
                    <input style={inp} type="number" placeholder="8728"
                      value={form.api_port} onChange={e => set('api_port')(e.target.value)} />
                  </div>
                  <div>
                    <label style={lbl}>API Username *</label>
                    <input style={inp} placeholder="admin"
                      value={form.api_username} onChange={e => set('api_username')(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label style={lbl}>API Password {config ? '(leave blank to keep current)' : '*'}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      style={{ ...inp, paddingRight: 40 }}
                      type={showPassword ? 'text' : 'password'}
                      placeholder={config ? '••••••••' : 'RouterOS API password'}
                      value={form.api_password}
                      onChange={e => set('api_password')(e.target.value)}
                    />
                    <span
                      onClick={() => setShowPassword(v => !v)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', ...mono, fontSize: 10, color: '#333', cursor: 'pointer' }}
                    >
                      {showPassword ? 'hide' : 'show'}
                    </span>
                  </div>
                  <div style={{ ...mono, fontSize: 9, color: '#1e1e1e', marginTop: 4 }}>
                    Stored encrypted — never shown in plaintext
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Hotspot server name</label>
                    <input style={inp} placeholder="hotspot1"
                      value={form.hotspot_server} onChange={e => set('hotspot_server')(e.target.value)} />
                  </div>
                  <div>
                    <label style={lbl}>NAS IP (optional)</label>
                    <input style={inp} placeholder="192.168.88.1"
                      value={form.nas_ip_address} onChange={e => set('nas_ip_address')(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* test result */}
              {testResult && (
                <div style={{
                  marginTop: 16, padding: '10px 14px', borderRadius: 8,
                  background: testResult.ok ? '#0d2010' : '#200808',
                  border: `0.5px solid ${testResult.ok ? '#1a4020' : '#4a1010'}`,
                  ...mono, fontSize: 11,
                  color: testResult.ok ? '#22c55e' : '#f87171',
                }}>
                  {testResult.ok ? '✓ ' : '✗ '}{testResult.message}
                </div>
              )}

              {/* action buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={test} disabled={testing || !config} style={{
                  flex: 1, padding: '10px', background: '#0a0a0a',
                  border: '0.5px solid #1e1e1e', borderRadius: 7,
                  color: !config ? '#1e1e1e' : '#3b82f6',
                  fontSize: 11, fontWeight: 700, cursor: !config ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase',
                }}>
                  {testing ? 'Testing…' : 'Test connection'}
                </button>
                <button onClick={save} disabled={saving} style={{
                  flex: 2, padding: '10px',
                  background: saving ? '#0a1628' : '#3b82f6',
                  border: 'none', borderRadius: 7,
                  color: saving ? '#3b82f6' : '#030303',
                  fontSize: 11, fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase',
                }}>
                  {saving ? 'Saving…' : config ? 'Update config' : 'Save config'}
                </button>
              </div>
            </div>

            {/* right column — status + help */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* connection status */}
              <div style={card}>
                <div style={{ fontSize: 10, color: '#2a2a2a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
                  Status
                </div>
                {config ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                      <span style={{ ...mono, fontSize: 11, color: '#f59e0b' }}>Configured</span>
                    </div>
                    {[
                      { label: 'Router IP',  value: config.router_ip },
                      { label: 'API Port',   value: String(config.api_port) },
                      { label: 'Username',   value: config.api_username },
                      { label: 'Hotspot',    value: config.hotspot_server },
                      { label: 'NAS IP',     value: config.nas_ip_address || 'Not set' },
                    ].map(r => (
                      <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid #0a0a0a' }}>
                        <span style={{ fontSize: 10, color: '#2a2a2a' }}>{r.label}</span>
                        <span style={{ ...mono, fontSize: 11, color: '#555' }}>{r.value}</span>
                      </div>
                    ))}
                    <div style={{ ...mono, fontSize: 9, color: '#1e1e1e', marginTop: 12 }}>
                      Last updated: {new Date(config.updated_at).toLocaleDateString()}
                    </div>
                  </>
                ) : (
                  <div style={{ ...mono, fontSize: 11, color: '#1e1e1e', textAlign: 'center', padding: '20px 0' }}>
                    Not configured
                  </div>
                )}
              </div>

              {/* setup guide */}
              <div style={card}>
                <div style={{ fontSize: 10, color: '#2a2a2a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
                  Setup guide
                </div>
                {[
                  { step: '1', text: 'Enable API in RouterOS: IP → Services → API → Enable' },
                  { step: '2', text: 'Create a dedicated API user with hotspot permissions' },
                  { step: '3', text: 'Set the router IP to its LAN address (e.g. 192.168.88.1)' },
                  { step: '4', text: 'Enter your hotspot server name (check IP → Hotspot)' },
                  { step: '5', text: 'Save then click "Test connection" to verify' },
                ].map(s => (
                  <div key={s.step} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                    <span style={{
                      ...mono, fontSize: 10, fontWeight: 700, color: '#3b82f6',
                      background: '#06132a', padding: '1px 7px', borderRadius: 4, flexShrink: 0,
                    }}>
                      {s.step}
                    </span>
                    <span style={{ fontSize: 11, color: '#2a2a2a', lineHeight: 1.5 }}>{s.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}