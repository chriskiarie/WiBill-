'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/context/ToastContext'
import { Router, CheckCircle, XCircle, Activity, Users, Wifi, HardDrive, Terminal, Download, RefreshCw, Server, Cpu, Clock, Zap } from 'lucide-react'

const C = {
  void: 'var(--theme-bg)', base: 'var(--theme-card-base)', surface: 'var(--theme-surface)',
  border: 'var(--theme-border)', border2: 'var(--theme-border2)',
  text: 'var(--theme-text)', dim: 'var(--theme-dim)', mute: 'var(--theme-mute)', faint: 'var(--theme-faint)',
  gold: 'var(--theme-gold)', green: 'var(--theme-green)', red: 'var(--theme-red)',
}

export default function MikrotikPage() {
  const { token } = useAuth()
  const { showToast } = useToast()

  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [health, setHealth] = useState<any>(null)
  const [activeUsers, setActiveUsers] = useState<any[]>([])
  const [installScript, setInstallScript] = useState<string | null>(null)
  const [showScript, setShowScript] = useState(false)
  const [provisioning, setProvisioning] = useState(false)
  const [generatingScript, setGeneratingScript] = useState(false)
  const [tab, setTab] = useState<'config' | 'users' | 'script'>('config')
  const [form, setForm] = useState({
    router_ip: '',
    api_port: '8728',
    api_username: '',
    api_password: '',
    hotspot_server: 'hotspot1',
    hotspot_profile_name: 'XwB_Profile',
    nas_ip_address: '',
    notes: '',
  })

  const fetchConfig = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await api.getMikrotikConfig()
      setConfig(data)
      setForm({
        router_ip: data.router_ip || '',
        api_port: data.api_port?.toString() || '8728',
        api_username: data.api_username || '',
        api_password: '',
        hotspot_server: data.hotspot_server || 'hotspot1',
        hotspot_profile_name: data.hotspot_profile_name || 'XwB_Profile',
        nas_ip_address: data.nas_ip_address || '',
        notes: data.notes || '',
      })
      fetchHealth()
    } catch { setConfig(null); setShowForm(true) } finally { setLoading(false) }
  }, [token])

  const fetchHealth = async () => {
    try {
      const h = await api.getMikrotikHealth()
      setHealth(h)
    } catch { setHealth(null) }
  }

  const fetchActiveUsers = async () => {
    try {
      const data = await api.getMikrotikUsers()
      setActiveUsers(data.users || [])
    } catch { setActiveUsers([]) }
  }

  useEffect(() => { fetchConfig() }, [fetchConfig])

  useEffect(() => {
    if (!config) return
    fetchHealth()
    fetchActiveUsers()
    const interval = setInterval(() => {
      fetchHealth()
      fetchActiveUsers()
    }, 15000)
    return () => clearInterval(interval)
  }, [config])

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await api.testMikrotikConnection()
      setTestResult(result)
      if (result.connected) {
        showToast(`Connected to ${result.router_identity} v${result.router_os_version?.split(' ')[0] || ''}`, { type: 'success' })
      } else {
        showToast(stripHtml(result.error || 'Connection failed'), { type: 'error' })
      }
      fetchHealth()
    } catch (e: any) {
      setTestResult({ connected: false, error: e.message || 'Connection failed' })
      showToast(stripHtml(e.message || 'Connection failed'), { type: 'error' })
    } finally { setTesting(false) }
  }

  const handleSave = async () => {
    if (!form.router_ip || !form.api_username) {
      showToast('Router IP and username required', { type: 'error' })
      return
    }
    setSaving(true)
    try {
      if (config) {
        await api.updateMikrotikConfig({
          router_ip: form.router_ip,
          api_port: parseInt(form.api_port) || 8728,
          api_username: form.api_username,
          api_password: form.api_password || undefined,
          hotspot_server: form.hotspot_server,
          hotspot_profile_name: form.hotspot_profile_name,
          nas_ip_address: form.nas_ip_address || undefined,
          notes: form.notes || undefined,
        })
      } else {
        await api.saveMikrotikConfig({
          router_ip: form.router_ip,
          api_port: parseInt(form.api_port) || 8728,
          api_username: form.api_username,
          api_password: form.api_password,
          hotspot_server: form.hotspot_server,
          hotspot_profile_name: form.hotspot_profile_name,
          nas_ip_address: form.nas_ip_address || undefined,
          notes: form.notes || undefined,
        })
      }
      showToast('Configuration saved', { type: 'success' })
      setShowForm(false)
      fetchConfig()
    } catch (e: any) { showToast(e.message || 'Failed', { type: 'error' }) } finally { setSaving(false) }
  }

  const handleProvision = async () => {
    setProvisioning(true)
    try {
      await api.provisionMikrotik()
      showToast('Bridge provisioned successfully', { type: 'success' })
      fetchConfig()
    } catch (e: any) {
      showToast(e.message || 'Provisioning failed', { type: 'error' })
    } finally { setProvisioning(false) }
  }

  const handleInstallScript = async () => {
    setGeneratingScript(true)
    try {
      const data = await api.getMikrotikInstallScript()
      setInstallScript(data)
      setShowScript(true)
    } catch (e: any) {
      showToast(e.message || 'Failed to generate script', { type: 'error' })
    } finally {
      setGeneratingScript(false)
    }
  }

  const copyInstallScript = () => {
    if (!installScript) return
    navigator.clipboard.writeText(installScript)
    showToast('Script copied to clipboard', { type: 'success' })
  }

  const downloadInstallScript = () => {
    if (!installScript) return
    const blob = new Blob([installScript], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'install.ps1'
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadLoginHtml = async () => {
    try {
      const html = await api.getMikrotikLoginHtml()
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'login.html'
      a.click()
      URL.revokeObjectURL(url)
      showToast('login.html downloaded — upload to Winbox Files > hotspot folder', { type: 'success' })
    } catch (e: any) {
      showToast(e.message || 'Failed to generate login.html', { type: 'error' })
    }
  }

  const f = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  const Input = ({ label, value, onChange, placeholder, type, mono }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean
  }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type || 'text'}
        style={{
          width: '100%', padding: '10px 12px', background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7,
          color: C.text, fontSize: 12, fontFamily: mono ? 'DM Mono, monospace' : 'Inter, sans-serif',
          boxSizing: 'border-box', outline: 'none',
        }} />
    </div>
  )

  const Card = ({ children, style }: any) => (
    <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 20, ...style }}>
      {children}
    </div>
  )

  const StatCard = ({ icon, label, value, color }: { icon: any; label: string; value: string; color?: string }) => (
    <div style={{ background: C.base, borderRadius: 8, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {icon}
        <span style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 500, color: color || C.text }}>{value || '—'}</div>
    </div>
  )

  const statusColor = (s: string) => s === 'CONNECTED' ? C.green : s === 'ERROR' ? C.red : s === 'PROVISIONED' ? C.gold : C.dim

  const statusLabel = (s: string) => {
    switch (s) {
      case 'CONNECTED': return 'Connected';
      case 'ERROR': return 'Error';
      case 'PROVISIONED': return 'Waiting for Bridge';
      case 'DISCONNECTED': return 'Not Configured';
      default: return s || 'Unknown';
    }
  }

  const stripHtml = (s: string) => s ? s.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim() : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="MikroTik" />
        <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', background: C.void }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>MikroTik</h1>
              {config && (
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 9, fontWeight: 700, fontFamily: 'DM Mono, monospace',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  background: config.status === 'CONNECTED' ? 'rgba(34,197,94,0.08)' : config.status === 'ERROR' ? 'rgba(239,68,68,0.08)' : C.base,
                  color: statusColor(config.status), border: `0.5px solid ${statusColor(config.status)}22`,
                }}>
                  {config.status || 'DISCONNECTED'}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>RouterOS hotspot integration</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {config && (
              <>
                <button onClick={fetchHealth} style={{ padding: '8px 14px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.dim, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RefreshCw size={13} /> Refresh
                </button>
                <button onClick={() => setShowForm(true)} style={{ padding: '8px 14px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  Edit Config
                </button>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <LoadingSpinner size="md" label="Loading router config..." />
        ) : (
          <div style={{ maxWidth: 720, width: '100%', margin: '0 auto' }}>
            {config && !showForm && (
              <>
                {/* Tab Navigation */}
                <div className="mikrotik-tabs" style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                  {[
                    { id: 'config', label: 'Dashboard' },
                    { id: 'users', label: `Active Users (${activeUsers.length})` },
                    { id: 'script', label: 'Install Script' },
                  ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id as any)}
                      style={{
                        padding: '8px 16px', background: tab === t.id ? C.border : 'transparent',
                        border: `0.5px solid ${tab === t.id ? C.border2 : 'transparent'}`, borderRadius: 7,
                        color: tab === t.id ? C.text : C.dim, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Dashboard Tab */}
                {tab === 'config' && (
                  <>
                    {/* Health Cards */}
                    <div className="grid-4" style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                      <StatCard icon={<Server size={14} color={C.gold} />} label="Router" value={health?.router_identity || health?.router_ip || config.router_ip} />
                      <StatCard icon={<Activity size={14} color={C.green} />} label="RouterOS" value={health?.router_os_version || health?.version || '—'} color={C.text} />
                      <StatCard icon={<HardDrive size={14} color={C.gold} />} label="Board" value={health?.board_name || '—'} color={C.text} />
                      <StatCard icon={<Clock size={14} color={C.gold} />} label="Uptime" value={health?.uptime || '—'} color={C.text} />
                    </div>

                    {/* Connection Status Card */}
                    <Card style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
                        {health?.status === 'CONNECTED' ? <CheckCircle size={18} color={C.green} /> :
                         health?.status === 'ERROR' ? <XCircle size={18} color={C.red} /> :
                         health?.status === 'PROVISIONED' ? <Activity size={18} color={C.gold} /> :
                         <XCircle size={18} color={C.dim} />}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{statusLabel(health?.status)}</span>
                            <span style={{
                              padding: '2px 8px', borderRadius: 20, fontSize: 9, fontWeight: 700,
                              fontFamily: 'DM Mono, monospace', textTransform: 'uppercase',
                              background: statusColor(health?.status) + '22',
                              color: statusColor(health?.status),
                              border: `0.5px solid ${statusColor(health?.status)}44`,
                            }}>
                              {health?.status || 'UNKNOWN'}
                            </span>
                          </div>
                          {health?.status === 'CONNECTED' && (
                            <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
                              {health?.router_os_version ? `v${health.router_os_version}` : ''}{health?.board_name ? ` · ${health.board_name}` : ''}
                            </div>
                          )}
                          {health?.status === 'ERROR' && (
                            <div style={{ fontSize: 10, color: C.red, marginTop: 2 }}>{stripHtml(health?.last_error || health?.error || 'Unknown error')}</div>
                          )}
                          {health?.status === 'PROVISIONED' && (
                            <div style={{ fontSize: 10, color: C.gold, marginTop: 2 }}>
                              Bridge tunnel created. Download and run the installer script on the on-prem PC.
                            </div>
                          )}
                          {health?.last_connected_at && (
                            <div style={{ fontSize: 9, color: C.dim, marginTop: 4, fontFamily: 'DM Mono, monospace' }}>
                              Last connected: {new Date(health.last_connected_at).toLocaleString()}
                            </div>
                          )}
                        </div>
                        {health?.uptime && (
                          <div style={{ fontSize: 10, color: C.dim, fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>
                            <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            {health.uptime}
                          </div>
                        )}
                      </div>

                      <div className="grid-2" style={{ display: 'grid', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Hotspot Server</div>
                          <div style={{ fontSize: 12, color: C.text, fontFamily: 'DM Mono, monospace' }}>{config.hotspot_server || 'hotspot1'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Hotspot Profile</div>
                          <div style={{ fontSize: 12, color: C.text, fontFamily: 'DM Mono, monospace' }}>{config.hotspot_profile_name || 'XwB_Profile'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Bridge URL</div>
                          <div style={{ fontSize: 12, color: C.dim, fontFamily: 'DM Mono, monospace' }}>{config.router_ip || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Tunnel ID</div>
                          <div style={{ fontSize: 12, color: C.dim, fontFamily: 'DM Mono, monospace' }}>{config.tunnel_id ? config.tunnel_id.substring(0, 12) + '…' : '—'}</div>
                        </div>
                      </div>
                    </Card>

                    {/* Provisioning Status (not yet provisioned) */}
                    {!config.tunnel_id && (
                      <Card style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Connect Router via Tunnel</div>
                        <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6, marginBottom: 14 }}>
                          Takes 2 minutes:<br />
                          1. <strong>Provision</strong> — creates a Cloudflare Tunnel and generates a unique bridge secret<br />
                          2. <strong>Install</strong> — run the generated PowerShell script on the always-on PC at the ISP site<br />
                          3. <strong>Verify</strong> — the dashboard shows CONNECTED when bridge + tunnel are live
                        </div>
                        <button onClick={handleProvision} disabled={provisioning}
                          style={{ padding: '10px 18px', background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 11, fontWeight: 700, cursor: provisioning ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: provisioning ? 0.6 : 1 }}>
                          <Zap size={14} /> {provisioning ? 'Provisioning...' : 'Provision Bridge'}
                        </button>
                      </Card>
                    )}

                    {/* Actions */}
                    <Card>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.dim, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {config.tunnel_id && (
                          <button onClick={handleInstallScript}
                            style={{ padding: '10px 18px', background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Download size={14} /> Download Install Script
                          </button>
                        )}
                        <button onClick={downloadLoginHtml}
                          style={{ padding: '10px 18px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Download size={14} /> login.html
                        </button>
                        <button onClick={handleTest} disabled={testing}
                          style={{ padding: '10px 18px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 11, fontWeight: 600, cursor: testing ? 'not-allowed' : 'pointer', opacity: testing ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Zap size={14} /> {testing ? 'Testing...' : 'Test Connection'}
                        </button>
                      </div>
                    </Card>
                  </>
                )}

                {/* Active Users Tab */}
                {tab === 'users' && (
                  <Card>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Active Users ({activeUsers.length})
                      </div>
                      <button onClick={fetchActiveUsers} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer' }}>
                        <RefreshCw size={13} />
                      </button>
                    </div>
                    {activeUsers.length === 0 ? (
                      <div style={{ padding: '30px 0', textAlign: 'center', color: C.dim, fontSize: 11 }}>
                        <Wifi size={24} color={C.mute} style={{ marginBottom: 8 }} />
                        <div>No active users on router</div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {activeUsers.map((u: any, i: number) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: C.base, borderRadius: 7, border: `0.5px solid ${C.border}` }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: C.text, fontFamily: 'DM Mono, monospace' }}>{u.mac_address || u.user}</div>
                              <div style={{ fontSize: 10, color: C.dim }}>{u.address} · {u.uptime}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 10, color: C.green, fontFamily: 'DM Mono, monospace' }}>{u.session_time_left || '—'}</div>
                              <div style={{ fontSize: 9, color: C.dim }}>{(u.bytes_in / 1024 / 1024).toFixed(1)}MB / {(u.bytes_out / 1024 / 1024).toFixed(1)}MB</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )}

                {/* Install Script Tab */}
                {tab === 'script' && (
                  <Card>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Install Script</div>
                        <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>Run this PowerShell script on the always-on PC at the ISP site</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {installScript && (
                          <>
                            <button onClick={copyInstallScript} style={{ padding: '6px 12px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Copy</button>
                            <button onClick={downloadInstallScript} style={{ padding: '6px 12px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Download size={12} /> Download
                            </button>
                          </>
                        )}
                        <button onClick={handleInstallScript} disabled={generatingScript}
                          style={{ padding: '6px 12px', background: C.border2, border: `0.5px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 10, fontWeight: 600, cursor: generatingScript ? 'not-allowed' : 'pointer', opacity: generatingScript ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {generatingScript ? 'Generating...' : installScript ? 'Regenerate' : 'Generate'}
                        </button>
                      </div>
                    </div>

                    <div style={{ padding: '12px 14px', background: 'var(--theme-surface)', border: `0.5px solid ${C.border}`, borderRadius: 7, marginBottom: 14, fontSize: 10, color: C.dim, lineHeight: 1.8 }}>
                      <div>ⓘ Run as Administrator on the ISP's always-on Windows PC</div>
                      <div>ⓘ Requires: Python 3, internet connection (for cloudflared + pip downloads)</div>
                      <div>ⓘ Installs: bridge.py service, cloudflared tunnel, NSSM service manager</div>
                    </div>

                    {installScript && (
                      <pre style={{
                        background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, padding: 16,
                        fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.dim, lineHeight: 1.6,
                        overflowX: 'auto', whiteSpace: 'pre', maxHeight: 400, overflowY: 'auto',
                      }}>
                        {installScript}
                      </pre>
                    )}

                    {!installScript && (
                      <div style={{ padding: '30px 0', textAlign: 'center', color: C.dim, fontSize: 11 }}>
                        <Terminal size={24} color={C.mute} style={{ marginBottom: 8 }} />
                        <div>Provision the bridge first, then generate the install script</div>
                      </div>
                    )}
                  </Card>
                )}
              </>
            )}

            {/* Setup / Edit Form */}
            {(showForm || !config) && (
              <Card>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.dim, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {config ? 'Update Router Config' : 'Connect Your MikroTik'}
                </div>

                {!config && (
                  <div style={{ padding: '12px 14px', background: C.surface, border: `0.5px solid ${C.gold}33`, borderRadius: 7, marginBottom: 20, fontSize: 11, color: C.gold, lineHeight: 1.6 }}>
                    Enter your MikroTik router details below. You must have API access enabled on the router.<br />
                    <strong>Need help?</strong> Provision the bridge and download the install script.
                  </div>
                )}

                <div className="grid-2" style={{ display: 'grid', gap: 12 }}>
                  <Input label="Router IP / Hostname *" value={form.router_ip} onChange={f('router_ip')} placeholder="192.168.88.1" mono />
                <div className="grid-2" style={{ display: 'grid', gap: 12 }}>
                    <Input label="API Port" value={form.api_port} onChange={f('api_port')} placeholder="8728" mono />
                    <Input label="Hotspot Interface" value={form.hotspot_server} onChange={f('hotspot_server')} placeholder="ether5" mono />
                  </div>
                  <Input label="API Username *" value={form.api_username} onChange={f('api_username')} placeholder="honestbill" mono />
                  <Input label="API Password" value={form.api_password} onChange={f('api_password')} placeholder={config ? 'Leave blank to keep' : ''} type="password" />
                  <Input label="Hotspot Profile" value={form.hotspot_profile_name} onChange={f('hotspot_profile_name')} placeholder="XwB_Profile" />
                  <Input label="NAS IP (optional)" value={form.nas_ip_address} onChange={f('nas_ip_address')} placeholder={config?.router_ip || 'Same as router IP'} />
                </div>
                <Input label="Notes (optional)" value={form.notes} onChange={f('notes')} placeholder="Location, contact info, etc." />

                {testResult && (
                  <div style={{
                    padding: 12, marginBottom: 12, borderRadius: 7, fontSize: 11, lineHeight: 1.5,
                    background: testResult.connected ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `0.5px solid ${testResult.connected ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    color: testResult.connected ? C.green : C.red,
                  }}>
                    {testResult.connected ? (
                      <>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>✅ Connected to {testResult.router_identity || testResult.router_ip}</div>
                        <div style={{ fontSize: 10, color: C.dim }}>
                          {testResult.router_os_version ? `v${testResult.router_os_version.split(' ')[0]}` : ''}{testResult.board_name ? ` · ${testResult.board_name}` : ''}{testResult.uptime ? ` · ${testResult.uptime}` : ''}
                        </div>
                        {testResult.hotspot_found === false && (
                          <div style={{ fontSize: 10, color: C.gold, marginTop: 4 }}>⚠ Hotspot server not found — check the interface name</div>
                        )}
                      </>
                    ) : (
                      <div>❌ {stripHtml(testResult.error || 'Connection failed')}</div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  <button onClick={downloadLoginHtml}
                    style={{ padding: '10px 18px', background: 'transparent', border: `0.5px solid ${C.border2}`, borderRadius: 7, color: C.dim, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Download size={14} /> login.html
                  </button>
                  <button onClick={handleTest} disabled={testing}
                    style={{
                      padding: '10px 18px', background: 'transparent', border: `0.5px solid ${C.border2}`, borderRadius: 7,
                      color: C.dim, fontSize: 11, fontWeight: 600, cursor: testing ? 'not-allowed' : 'pointer', opacity: testing ? 0.5 : 1,
                    }}>
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    style={{
                      flex: 1, padding: '12px', background: saving ? C.dim : C.gold, border: 'none', borderRadius: 7,
                      color: saving ? C.dim : '#000', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1,
                    }}>
                    {saving ? 'Saving...' : config ? 'Update Configuration' : 'Save Configuration'}
                  </button>
                  {config && (
                    <button onClick={() => { setShowForm(false); setTestResult(null) }}
                      style={{ padding: '12px 16px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.dim, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  )}
                </div>
              </Card>
            )}

            {!config && !showForm && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: C.dim }}>
                <Router size={40} color={C.mute} style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 14, marginBottom: 8, color: C.text }}>No Router Configured</div>
                <div style={{ fontSize: 12, color: C.dim, marginBottom: 16 }}>Connect your MikroTik to provision hotspots and manage users automatically</div>
                <button onClick={() => setShowForm(true)}
                  style={{ padding: '10px 20px', background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Add Router
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
