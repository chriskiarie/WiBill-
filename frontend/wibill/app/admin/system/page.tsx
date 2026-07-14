'use client'
import { useState, useEffect, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const C = {
  black: '#000', card: '#0D0D0B', border: '#2A2A27', line: '#1A1A18',
  text: '#EDEBE6', dim: '#8C8A84', mute: '#6B6964', faint: '#3A3A37',
  gold: '#E8B84B', green: '#6FCF73', red: '#E5707A',
}

const tabs = [
  { id: 'overview', label: 'Overview', icon: '⊞' },
  { id: 'mpesa', label: 'M-Pesa', icon: '◈' },
  { id: 'mikrotik', label: 'MikroTik', icon: '⌗' },
  { id: 'security', label: 'Security', icon: '◉' },
  { id: 'notifications', label: 'Notifications', icon: '⚙', badge: '4' },
  { id: 'email', label: 'Email / SMTP', icon: '✉' },
  { id: 'apikeys', label: 'API Keys', icon: '⚷' },
]

type TabId = (typeof tabs)[number]['id']

function getToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('wb_token') || sessionStorage.getItem('token') || ''
}

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [health, setHealth] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // ── M-Pesa state ──
  const [mpesaConfig, setMpesaConfig] = useState<any>(null)
  const [mpesaForm, setMpesaForm] = useState({ consumer_key: '', consumer_secret: '', passkey: '', shortcode: '', environment: 'sandbox', account_reference: 'HonestBill Platform' })
  const [mpesaSaving, setMpesaSaving] = useState(false)
  const [mpesaTesting, setMpesaTesting] = useState(false)
  const [mpesaTestResult, setMpesaTestResult] = useState<string | null>(null)

  // ── MikroTik state ──
  const [routers, setRouters] = useState<any[]>([])
  const [routersLoading, setRoutersLoading] = useState(false)

  // ── SMTP state ──
  const [smtpConfig, setSmtpConfig] = useState<any>(null)
  const [smtpForm, setSmtpForm] = useState({ host: '', port: 587, username: '', password: '', from_email: '', from_name: '', use_tls: true })
  const [smtpSaving, setSmtpSaving] = useState(false)
  const [smtpTesting, setSmtpTesting] = useState(false)
  const [smtpTestResult, setSmtpTestResult] = useState<string | null>(null)

  // ── API Key state ──
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [apiKeysLoading, setApiKeysLoading] = useState(false)
  const [showNewKeyForm, setShowNewKeyForm] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null)
  const [newKeyCreating, setNewKeyCreating] = useState(false)

  // ── Quick Action state ──
  const [logs, setLogs] = useState<string[]>([])
  const [showLogs, setShowLogs] = useState(false)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    (async () => {
      try {
        const d = await api('GET', '/health')
        setHealth({
          status: d.status || 'error',
          database: d.database || 'disconnected',
          environment: d.environment || 'production',
          version: d.version || '0.1.0',
        })
      } catch {
        setHealth({ status: 'error', database: 'disconnected', environment: 'production', version: '0.1.0' })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // ── Load M-Pesa config ──
  const loadMpesaConfig = useCallback(async () => {
    try {
      const cfg = await api('GET', '/api/admin/mpesa-config')
      setMpesaConfig(cfg)
      if (cfg.is_configured) {
        setMpesaForm({
          consumer_key: cfg.consumer_key || '',
          consumer_secret: '',
          passkey: '',
          shortcode: cfg.shortcode || '',
          environment: cfg.environment || 'sandbox',
          account_reference: cfg.account_reference || 'HonestBill Platform',
        })
      }
    } catch { /* no config yet */ }
  }, [])

  useEffect(() => { if (activeTab === 'mpesa') loadMpesaConfig() }, [activeTab, loadMpesaConfig])

  // ── Load MikroTik routers ──
  const loadRouters = useCallback(async () => {
    setRoutersLoading(true)
    try {
      const data = await api('GET', '/api/admin/mikrotik-routers')
      setRouters(data)
    } catch {
      setRouters([])
    } finally {
      setRoutersLoading(false)
    }
  }, [])

  useEffect(() => { if (activeTab === 'mikrotik') loadRouters() }, [activeTab, loadRouters])

  // ── Load SMTP config ──
  const loadSmtpConfig = useCallback(async () => {
    try {
      const cfg = await api('GET', '/api/admin/smtp-config')
      setSmtpConfig(cfg)
      if (cfg.host) {
        setSmtpForm(f => ({ ...f, host: cfg.host || '', port: cfg.port || 587, username: cfg.username || '', from_email: cfg.from_email || '', from_name: cfg.from_name || '', use_tls: cfg.use_tls ?? true }))
      }
    } catch { /* no config */ }
  }, [])

  useEffect(() => { if (activeTab === 'email') loadSmtpConfig() }, [activeTab, loadSmtpConfig])

  const handleSmtpSave = async () => {
    setSmtpSaving(true)
    try {
      await api('POST', '/api/admin/smtp-config', smtpForm)
      showToast('SMTP config saved', true)
      await loadSmtpConfig()
    } catch (e: any) { showToast(e.message, false) }
    finally { setSmtpSaving(false) }
  }

  const handleSmtpTest = async () => {
    setSmtpTesting(true)
    setSmtpTestResult(null)
    try {
      const res = await api('POST', '/api/admin/smtp-config/test', {})
      setSmtpTestResult(res.message)
      showToast(res.message, res.success)
    } catch (e: any) { setSmtpTestResult(e.message); showToast(e.message, false) }
    finally { setSmtpTesting(false) }
  }

  // ── Load API keys ──
  const loadApiKeys = useCallback(async () => {
    setApiKeysLoading(true)
    try {
      const data = await api('GET', '/api/admin/api-keys')
      setApiKeys(data)
    } catch { setApiKeys([]) }
    finally { setApiKeysLoading(false) }
  }, [])

  useEffect(() => { if (activeTab === 'apikeys') loadApiKeys() }, [activeTab, loadApiKeys])

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) { showToast('Key name is required', false); return }
    setNewKeyCreating(true)
    setNewKeyResult(null)
    try {
      const res = await api('POST', '/api/admin/api-keys', { name: newKeyName })
      setNewKeyResult(res.key)
      showToast(`API key "${res.name}" created — copy it now, it won't be shown again`, true)
      setNewKeyName('')
      await loadApiKeys()
    } catch (e: any) { showToast(e.message, false) }
    finally { setNewKeyCreating(false) }
  }

  const handleRevokeKey = async (id: string) => {
    try {
      const res = await api('PATCH', `/api/admin/api-keys/${id}/revoke`)
      showToast(res.message, true)
      await loadApiKeys()
    } catch (e: any) { showToast(e.message, false) }
  }

  const handleDeleteKey = async (id: string) => {
    try {
      const res = await api('DELETE', `/api/admin/api-keys/${id}`)
      showToast(res.message, true)
      await loadApiKeys()
    } catch (e: any) { showToast(e.message, false) }
  }

  const handleMpesaSave = async () => {
    setMpesaSaving(true)
    try {
      await api('POST', '/api/admin/mpesa-config', mpesaForm)
      showToast('M-Pesa config saved', true)
      await loadMpesaConfig()
    } catch (e: any) {
      showToast(e.message, false)
    } finally {
      setMpesaSaving(false)
    }
  }

  const handleMpesaTest = async () => {
    setMpesaTesting(true)
    setMpesaTestResult(null)
    try {
      const res = await api('POST', '/api/admin/mpesa-config/test', {})
      setMpesaTestResult(res.message)
      showToast(res.message, res.success)
    } catch (e: any) {
      setMpesaTestResult(e.message)
      showToast(e.message, false)
    } finally {
      setMpesaTesting(false)
    }
  }

  const statCards = [
    { label: 'Uptime', value: '99.8%', sub: '30-day rolling', highlight: true },
    { label: 'API Response', value: `45<span style="font-size:13px;color:#555">ms</span>`, sub: 'P95 latency' },
    { label: 'Active ISPs', value: `${routers.filter(r => r.status === 'ONLINE').length || '—'}`, sub: 'Routers online' },
    { label: 'Txn Volume', value: '2,847', sub: 'Today' },
  ]

  return (
    <div style={{ display: 'flex', height: '100%', color: C.text, fontSize: 13 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          background: toast.ok ? '#0a2a0a' : '#2a0a0a', border: `0.5px solid ${toast.ok ? C.green : C.red}`,
          borderRadius: 'var(--radius-sm)', padding: '10px 20px', fontSize: 12, color: toast.ok ? C.green : C.red,
          fontFamily: '"DM Mono", monospace',
        }}>{toast.msg}</div>
      )}

      {/* Secondary Settings Nav */}
      <div style={{ width: 200, minWidth: 200, background: '#050505', borderRight: `0.5px solid ${C.line}`, padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px',
              fontSize: 12, color: activeTab === tab.id ? C.text : '#555',
              cursor: 'pointer', border: 'none', borderLeft: `2px solid ${activeTab === tab.id ? C.gold : 'transparent'}`,
              background: activeTab === tab.id ? '#111' : 'transparent',
              fontFamily: 'Inter, sans-serif', textAlign: 'left', width: '100%',
            }}
            onMouseEnter={e => { if (activeTab !== tab.id) { e.currentTarget.style.background = '#0a0a0a'; e.currentTarget.style.color = '#999' } }}
            onMouseLeave={e => { if (activeTab !== tab.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#555' } }}
          >
            <span style={{ fontSize: 15, width: 18, color: activeTab === tab.id ? C.gold : '#333' }}>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge && (
              <span style={{ marginLeft: 'auto', fontSize: 9, padding: '2px 6px', borderRadius: 3, background: '#1a0c00', color: C.gold, border: '0.5px solid #3a2000' }}>{tab.badge}</span>
            )}
          </button>
        ))}
        <div style={{ marginTop: 'auto', borderTop: `0.5px solid ${C.line}`, paddingTop: 14 }}>
          <button
            onClick={() => setActiveTab('danger')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px',
              fontSize: 12, color: activeTab === 'danger' ? C.red : '#7f1d1d',
              cursor: 'pointer', border: 'none', borderLeft: `2px solid ${activeTab === 'danger' ? C.red : 'transparent'}`,
              background: activeTab === 'danger' ? '#0f0505' : 'transparent',
              fontFamily: 'Inter, sans-serif', textAlign: 'left', width: '100%',
            }}
          >
            <span style={{ fontSize: 15, width: 18, color: '#7f1d1d' }}>⚠</span>
            <span>Danger Zone</span>
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-lg)', background: C.black }}>
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
              {statCards.map(s => (
                <div key={s.label} style={{
                  flex: 1, background: C.card, border: `0.5px solid ${C.line}`, borderRadius: 'var(--radius-sm)', padding: '14px 16px',
                }}>
                  <div style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 500, color: s.highlight ? C.gold : C.text, fontFamily: '"DM Mono", monospace' }}
                    dangerouslySetInnerHTML={typeof s.value === 'string' && s.value.includes('<') ? { __html: s.value } : undefined}
                  >{typeof s.value === 'string' && !s.value.includes('<') ? s.value : undefined}</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>{s.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1, background: C.card, border: `0.5px solid ${C.line}`, borderRadius: 'var(--radius-sm)', padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#ccc', marginBottom: 16 }}>System Status</div>
                <div style={{ borderTop: `0.5px solid ${C.line}` }}>
                  {[
                    { label: 'API Status', value: (health.status || 'checking').toUpperCase() },
                    { label: 'Database', value: (health.database || 'checking').toUpperCase() },
                    { label: 'Environment', value: (health.environment || 'unknown').toUpperCase() },
                    { label: 'Version', value: health.version || '—' },
                  ].map((row) => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 44, borderBottom: `0.5px solid ${C.line}` }}>
                      <span style={{ fontSize: 12, color: '#777' }}>{row.label}</span>
                      <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 12, color: C.text }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* M-PESA */}
        {activeTab === 'mpesa' && (
          <div style={{ background: C.card, border: `0.5px solid ${C.line}`, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px 14px', borderBottom: `0.5px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#ccc' }}>M-Pesa Credentials</div>
                <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>Platform Daraja API authentication</div>
              </div>
              <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: `0.5px solid ${C.line}` }}>
                {(['sandbox', 'production'] as const).map(env => (
                  <button
                    key={env}
                    onClick={() => setMpesaForm(f => ({ ...f, environment: env }))}
                    style={{
                      padding: '7px 16px', border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 500,
                      background: mpesaForm.environment === env ? '#1a1200' : 'transparent',
                      color: mpesaForm.environment === env ? C.gold : '#555',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    {env === 'sandbox' ? 'Sandbox' : 'Live'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'consumer_key', label: 'Consumer Key', sub: 'Daraja API', type: 'text', placeholder: mpesaConfig?.consumer_key && mpesaConfig.consumer_key !== '********' ? mpesaConfig.consumer_key : 'Enter consumer key' },
                { key: 'consumer_secret', label: 'Consumer Secret', sub: 'Daraja API', type: 'password', placeholder: 'Enter new secret (leave blank to keep)' },
                { key: 'passkey', label: 'Passkey', sub: 'STK Push', type: 'password', placeholder: 'Enter new passkey (leave blank to keep)' },
                { key: 'shortcode', label: 'Shortcode', sub: 'Business number', type: 'text', placeholder: '174379' },
              ].map(f => (
                <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 160, minWidth: 160, fontSize: 12, color: '#777' }}>
                    {f.label}
                    <span style={{ display: 'block', fontSize: 10, color: '#444', marginTop: 2 }}>{f.sub}</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type={f.type}
                      value={(mpesaForm as any)[f.key]}
                      placeholder={f.placeholder}
                      onChange={e => setMpesaForm(fm => ({ ...fm, [f.key]: e.target.value }))}
                      style={{
                        flex: 1, background: C.line, border: `0.5px solid ${C.line}`, borderRadius: 6,
                        padding: '8px 12px', fontSize: 12, color: '#ccc', outline: 'none',
                        fontFamily: '"DM Mono", monospace',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 20px', borderTop: `0.5px solid ${C.line}`, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 11, color: '#444' }}>
                  {mpesaConfig?.is_configured ? `Last saved: recently` : 'Not configured'}
                </div>
                {mpesaTestResult && (
                  <span style={{ fontSize: 11, color: mpesaTestResult.includes('successful') ? C.green : C.red }}>
                    {mpesaTestResult}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleMpesaTest}
                  disabled={mpesaTesting || !mpesaConfig?.is_configured}
                  style={{
                    background: 'transparent', color: C.gold, border: `0.5px solid ${C.gold}`, borderRadius: 6,
                    padding: '8px 18px', fontSize: 12, fontWeight: 500, cursor: mpesaTesting || !mpesaConfig?.is_configured ? 'not-allowed' : 'pointer',
                    opacity: mpesaTesting || !mpesaConfig?.is_configured ? 0.5 : 1,
                  }}
                >
                  {mpesaTesting ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={handleMpesaSave}
                  disabled={mpesaSaving}
                  style={{
                    background: C.gold, color: '#000', border: 'none', borderRadius: 6,
                    padding: '8px 18px', fontSize: 12, fontWeight: 500, cursor: mpesaSaving ? 'not-allowed' : 'pointer',
                    opacity: mpesaSaving ? 0.5 : 1,
                  }}
                >
                  {mpesaSaving ? 'Saving...' : 'Save Credentials'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MIKROTIK */}
        {activeTab === 'mikrotik' && (
          <div style={{ background: C.card, border: `0.5px solid ${C.line}`, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px 14px', borderBottom: `0.5px solid ${C.line}` }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#ccc' }}>ISP Router Status</div>
              <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>Connection status for all ISP MikroTik routers</div>
            </div>
            <div style={{ padding: '18px 20px' }}>
              {routersLoading ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#555', fontSize: 12 }}>Loading routers...</div>
              ) : routers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#555', fontSize: 12 }}>
                  No routers configured yet. ISPs need to configure their MikroTik from their dashboard.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['ONLINE', 'DISCONNECTED', 'ERROR'].map(statusGroup => {
                    const group = routers.filter(r => r.status === statusGroup)
                    if (group.length === 0) return null
                    return (
                      <div key={statusGroup}>
                        <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, marginTop: statusGroup === 'ONLINE' ? 0 : 12 }}>
                          {statusGroup} ({group.length})
                        </div>
                        {group.map(r => (
                          <div key={r.tenant_id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', marginBottom: 4, borderRadius: 6,
                            border: `0.5px solid ${C.line}`,
                          }}>
                            <div>
                              <div style={{ fontSize: 13, color: C.text }}>{r.tenant_name}</div>
                              <div style={{ fontSize: 11, color: '#555', marginTop: 1 }}>
                                {r.host ? `${r.host}:${r.port}` : 'Not set up'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{
                                display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                                background: r.status === 'ONLINE' ? C.green : r.status === 'DISCONNECTED' ? C.red : C.gold,
                              }} />
                              <span style={{ fontSize: 11, color: '#777', fontFamily: '"DM Mono", monospace' }}>
                                {r.status}
                              </span>
                              {r.last_error && (
                                <span style={{ fontSize: 10, color: C.red }} title={r.last_error}>⚠</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div style={{ padding: '12px 20px', borderTop: `0.5px solid ${C.line}`, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, color: '#444' }}>
                {routers.length} total router{routers.length !== 1 ? 's' : ''}
              </div>
              <button onClick={loadRouters} style={{
                background: 'transparent', color: C.gold, border: `0.5px solid ${C.gold}`,
                borderRadius: 6, padding: '8px 18px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}>↻ Refresh</button>
            </div>
          </div>
        )}

        {/* SECURITY */}
        {activeTab === 'security' && (
          <div style={{ background: C.card, border: `0.5px solid ${C.line}`, borderRadius: 'var(--radius-sm)', padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#ccc', marginBottom: 16 }}>Admin Credentials</div>
            {['Current Password', 'New Password', 'Confirm New Password'].map(label => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#777', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                <input type="password" placeholder={label} style={{
                  width: '100%', maxWidth: 400, background: C.line, border: `0.5px solid ${C.line}`,
                  borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#ccc', outline: 'none',
                  fontFamily: '"DM Mono", monospace',
                }} />
              </div>
            ))}
            <button style={{ marginTop: 8, background: C.gold, color: '#000', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              Update Password
            </button>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div style={{ background: C.card, border: `0.5px solid ${C.line}`, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px 14px', borderBottom: `0.5px solid ${C.line}` }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#ccc' }}>Alert Notifications</div>
              <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>System events delivered to your admin email</div>
            </div>
            <div style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{ width: 160, minWidth: 160, fontSize: 12, color: '#777' }}>
                  Alert Email
                  <span style={{ display: 'block', fontSize: 10, color: '#444', marginTop: 2 }}>Primary contact</span>
                </div>
                <div style={{ flex: 1 }}>
                  <input type="email" defaultValue="admin@honestbill.co.ke" style={{
                    width: '100%', background: C.line, border: `0.5px solid ${C.line}`, borderRadius: 6,
                    padding: '8px 12px', fontSize: 12, color: '#ccc', outline: 'none',
                    fontFamily: '"DM Mono", monospace',
                  }} />
                </div>
              </div>
              <div style={{ borderTop: `0.5px solid #111`, paddingTop: 12 }}>
                {[
                  { label: 'ISP approval pending', desc: 'When a new ISP registers and needs review' },
                  { label: 'Payment failure rate spike', desc: 'When failed transactions exceed 10% in an hour' },
                  { label: 'MikroTik disconnect', desc: 'When an ISP router goes offline' },
                  { label: 'New ISP signup', desc: 'When a new ISP completes registration' },
                ].map((event, i) => (
                  <div key={event.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 3 ? `0.5px solid #111` : 'none' }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#bbb' }}>{event.label}</div>
                      <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>{event.desc}</div>
                    </div>
                    <div style={{
                      width: 34, height: 19, borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      background: C.gold, position: 'relative', flexShrink: 0,
                    }}>
                      <div style={{
                        width: 13, height: 13, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 3, right: 3,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: `0.5px solid ${C.line}`, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, color: '#444' }}>Changes apply immediately</div>
              <button style={{
                background: C.gold, color: '#000', border: 'none', borderRadius: 6,
                padding: '8px 18px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}>Save Settings</button>
            </div>
          </div>
        )}

        {/* EMAIL / SMTP */}
        {activeTab === 'email' && (
          <div style={{ background: C.card, border: `0.5px solid ${C.line}`, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px 14px', borderBottom: `0.5px solid ${C.line}` }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#ccc' }}>SMTP Configuration</div>
              <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>Outgoing mail server for system emails</div>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'host', label: 'SMTP Host', sub: 'e.g. smtp.postmarkapp.com', type: 'text' },
                { key: 'port', label: 'Port', sub: '587 (TLS) or 465 (SSL)', type: 'number' },
                { key: 'username', label: 'Username', sub: 'SMTP login', type: 'text' },
                { key: 'password', label: 'Password', sub: 'Leave blank to keep existing', type: 'password' },
                { key: 'from_email', label: 'From Email', sub: 'Sender address', type: 'email' },
                { key: 'from_name', label: 'From Name', sub: 'Sender display name', type: 'text' },
              ].map(f => (
                <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 160, minWidth: 160, fontSize: 12, color: '#777' }}>
                    {f.label}
                    <span style={{ display: 'block', fontSize: 10, color: '#444', marginTop: 2 }}>{f.sub}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type={f.type}
                      value={(smtpForm as any)[f.key]}
                      placeholder={f.label}
                      onChange={e => setSmtpForm(fm => ({ ...fm, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                      style={{
                        width: '100%', background: C.line, border: `0.5px solid ${C.line}`, borderRadius: 6,
                        padding: '8px 12px', fontSize: 12, color: '#ccc', outline: 'none',
                        fontFamily: '"DM Mono", monospace',
                      }}
                    />
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 160, minWidth: 160, fontSize: 12, color: '#777' }}>
                  Use TLS
                  <span style={{ display: 'block', fontSize: 10, color: '#444', marginTop: 2 }}>STARTTLS encryption</span>
                </div>
                <div
                  onClick={() => setSmtpForm(fm => ({ ...fm, use_tls: !fm.use_tls }))}
                  style={{
                    width: 34, height: 19, borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    background: smtpForm.use_tls ? C.gold : '#222', position: 'relative', flexShrink: 0,
                  }}
                >
                  <div style={{
                    width: 13, height: 13, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3, transition: 'right 0.15s',
                    right: smtpForm.use_tls ? 3 : 18,
                  }} />
                </div>
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: `0.5px solid ${C.line}`, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 11, color: '#444' }}>
                  {smtpConfig?.is_configured ? 'Configured' : 'Not configured'}
                </div>
                {smtpTestResult && (
                  <span style={{ fontSize: 11, color: smtpTestResult.includes('valid') ? C.green : C.red }}>{smtpTestResult}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSmtpTest} disabled={smtpTesting || !smtpConfig?.is_configured} style={{
                  background: 'transparent', color: C.gold, border: `0.5px solid ${C.gold}`, borderRadius: 6,
                  padding: '8px 18px', fontSize: 12, fontWeight: 500, cursor: smtpTesting || !smtpConfig?.is_configured ? 'not-allowed' : 'pointer', opacity: smtpTesting || !smtpConfig?.is_configured ? 0.5 : 1,
                }}>{smtpTesting ? 'Testing...' : 'Test Connection'}</button>
                <button onClick={handleSmtpSave} disabled={smtpSaving} style={{
                  background: C.gold, color: '#000', border: 'none', borderRadius: 6,
                  padding: '8px 18px', fontSize: 12, fontWeight: 500, cursor: smtpSaving ? 'not-allowed' : 'pointer', opacity: smtpSaving ? 0.5 : 1,
                }}>{smtpSaving ? 'Saving...' : 'Save Config'}</button>
              </div>
            </div>
          </div>
        )}

        {/* API KEYS */}
        {activeTab === 'apikeys' && (
          <div style={{ background: C.card, border: `0.5px solid ${C.line}`, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px 14px', borderBottom: `0.5px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#ccc' }}>API Keys</div>
                <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>Tokens for programmatic platform access</div>
              </div>
              <button onClick={() => { setShowNewKeyForm(true); setNewKeyResult(null) }} style={{
                background: C.gold, color: '#000', border: 'none', borderRadius: 6,
                padding: '7px 16px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
              }}>+ Generate Key</button>
            </div>
            <div style={{ padding: '18px 20px' }}>
              {/* New key creation */}
              {showNewKeyForm && (
                <div style={{ marginBottom: 16, padding: 14, border: `0.5px solid ${C.gold}`, borderRadius: 'var(--radius-sm)', background: '#0d0a00' }}>
                  <div style={{ fontSize: 11, color: C.gold, marginBottom: 8 }}>New API Key</div>
                  {newKeyResult ? (
                    <>
                      <div style={{ fontSize: 11, color: C.green, marginBottom: 6 }}>Key created — copy it now. It won't be shown again.</div>
                      <div style={{
                        background: '#000', border: `0.5px solid ${C.line}`, borderRadius: 6, padding: '10px 12px',
                        fontFamily: '"DM Mono", monospace', fontSize: 12, color: C.gold, wordBreak: 'break-all', marginBottom: 8,
                      }}>{newKeyResult}</div>
                      <button onClick={() => { setShowNewKeyForm(false); setNewKeyResult(null) }} style={{
                        background: 'transparent', color: C.gold, border: `0.5px solid ${C.gold}`, borderRadius: 6,
                        padding: '6px 14px', fontSize: 11, cursor: 'pointer',
                      }}>Close</button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text" value={newKeyName} placeholder="e.g. CI/CD Token"
                        onChange={e => setNewKeyName(e.target.value)}
                        style={{
                          flex: 1, background: C.line, border: `0.5px solid ${C.line}`, borderRadius: 6,
                          padding: '8px 12px', fontSize: 12, color: '#ccc', outline: 'none',
                          fontFamily: '"DM Mono", monospace',
                        }}
                      />
                      <button onClick={handleCreateKey} disabled={newKeyCreating} style={{
                        background: C.gold, color: '#000', border: 'none', borderRadius: 6,
                        padding: '8px 16px', fontSize: 11, fontWeight: 500, cursor: newKeyCreating ? 'not-allowed' : 'pointer', opacity: newKeyCreating ? 0.5 : 1,
                      }}>{newKeyCreating ? 'Creating...' : 'Create'}</button>
                      <button onClick={() => setShowNewKeyForm(false)} style={{
                        background: 'transparent', color: '#555', border: `0.5px solid #333`, borderRadius: 6,
                        padding: '8px 12px', fontSize: 11, cursor: 'pointer',
                      }}>Cancel</button>
                    </div>
                  )}
                </div>
              )}

              {apiKeysLoading ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#555', fontSize: 12 }}>Loading keys...</div>
              ) : apiKeys.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#555', fontSize: 12 }}>No API keys created yet.</div>
              ) : (
                <div>
                  {apiKeys.map(k => (
                    <div key={k.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', marginBottom: 6, borderRadius: 6,
                      border: `0.5px solid ${C.line}`, opacity: k.is_active ? 1 : 0.4,
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, color: C.text }}>{k.name}</span>
                          <span style={{
                            fontSize: 9, padding: '2px 6px', borderRadius: 3,
                            background: k.is_active ? '#0a2a0a' : '#2a0a0a',
                            color: k.is_active ? C.green : C.red,
                          }}>{k.is_active ? 'ACTIVE' : 'REVOKED'}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#555', fontFamily: '"DM Mono", monospace', marginTop: 2 }}>
                          {k.key_prefix}... · created {new Date(k.created_at).toLocaleDateString()}
                          {k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleDateString()}` : ' · never used'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {k.is_active && (
                          <button onClick={() => handleRevokeKey(k.id)} style={{
                            background: 'transparent', color: C.gold, border: `0.5px solid ${C.gold}`, borderRadius: 4,
                            padding: '5px 10px', fontSize: 10, cursor: 'pointer',
                          }}>Revoke</button>
                        )}
                        <button onClick={() => handleDeleteKey(k.id)} style={{
                          background: 'transparent', color: C.red, border: `0.5px solid ${C.red}`, borderRadius: 4,
                          padding: '5px 10px', fontSize: 10, cursor: 'pointer', opacity: 0.6,
                        }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: '12px 20px', borderTop: `0.5px solid ${C.line}`, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, color: '#444' }}>{apiKeys.length} key{apiKeys.length !== 1 ? 's' : ''}</div>
              <button onClick={loadApiKeys} style={{
                background: 'transparent', color: C.gold, border: `0.5px solid ${C.gold}`, borderRadius: 6,
                padding: '8px 18px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}>↻ Refresh</button>
            </div>
          </div>
        )}

        {/* DANGER ZONE */}
        {activeTab === 'danger' && (
          <div style={{ border: `1px solid rgba(229,112,122,0.3)`, borderRadius: 'var(--radius-sm)', padding: 24, background: C.black }}>
            {[
              { label: 'Reset all feature flags', desc: 'Disable all premium features across all ISPs' },
              { label: 'Suspend all ISPs', desc: 'Temporarily disable all partner access' },
              { label: 'Wipe platform data', desc: 'Remove all transaction and session data' },
            ].map((action, i) => (
              <div key={action.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: i < 2 ? `0.5px solid rgba(229,112,122,0.15)` : 'none' }}>
                <div>
                  <div style={{ fontSize: 13, color: C.text }}>{action.label}</div>
                  <div style={{ fontSize: 12, color: C.red, opacity: 0.7 }}>{action.desc}</div>
                </div>
                <button style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.red}`, background: 'none', color: C.red, cursor: 'pointer', fontSize: 12 }}>
                  Reset
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logs Modal */}
      {showLogs && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowLogs(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '80%', maxWidth: 800, maxHeight: '80vh', background: '#050505',
            border: `0.5px solid ${C.line}`, borderRadius: 'var(--radius-sm)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>Application Logs (last {logs.length} lines)</span>
              <button onClick={() => setShowLogs(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            <pre style={{
              flex: 1, overflowY: 'auto', padding: 12, margin: 0,
              fontSize: 11, lineHeight: 1.6, color: '#888',
              fontFamily: '"DM Mono", monospace', background: '#000',
            }}>
              {logs.join('\n') || 'No logs available'}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
