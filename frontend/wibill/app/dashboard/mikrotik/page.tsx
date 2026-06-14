'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/context/ToastContext'
import { Router, CheckCircle, XCircle, Activity, Users, Wifi, HardDrive } from 'lucide-react'

export default function MikrotikPage() {
  const { token } = useAuth()
  const { showToast } = useToast()

  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [form, setForm] = useState({ router_ip: '', api_port: '8728', api_username: '', api_password: '', hotspot_server: 'hotspot1' })

  const fetchConfig = async () => {
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
      })
      setShowForm(false)
    } catch { setConfig(null); setShowForm(true) } finally { setLoading(false) }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await api.testMikrotikConnection()
      setTestResult(result)
      if (result.status) {
        showToast('Router connected!', { type: 'success' })
      } else {
        showToast(result.message || 'Connection failed', { type: 'error' })
      }
    } catch (e: any) {
      setTestResult({ status: false, message: e.message })
      showToast(e.message || 'Test failed', { type: 'error' })
    } finally { setTesting(false) }
  }

  useEffect(() => { fetchConfig() }, [token])

  const handleSave = async () => {
    if (!form.router_ip || !form.api_username) { showToast('Router IP and username required', { type: 'error' }); return }
    setSaving(true)
    try {
      await api.saveMikrotikConfig({
        router_ip: form.router_ip,
        api_port: parseInt(form.api_port) || 8728,
        api_username: form.api_username,
        api_password: form.api_password || undefined,
        hotspot_server: form.hotspot_server,
      })
      showToast('MikroTik config saved', { type: 'success' })
      fetchConfig()
    } catch (e: any) { showToast(e.message || 'Failed', { type: 'error' }) } finally { setSaving(false) }
  }

  const StatusBadge = ({ ok, label, labelOk, labelFail }: { ok: boolean; label: string; labelOk?: string; labelFail?: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 14px', background: ok ? '#030d06' : '#0d0303', border: `0.5px solid ${ok ? '#0a2214' : '#220a0a'}`, borderRadius: 8 }}>
      {ok ? <CheckCircle size={16} color="#22c55e" /> : <XCircle size={16} color="#f87171" />}
      <div>
        <div style={{ fontSize: 11, color: '#888' }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: ok ? '#22c55e' : '#f87171' }}>{ok ? (labelOk || 'Connected') : (labelFail || 'Disconnected')}</div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="MikroTik" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: '#030303' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Router Configuration</h1>
            <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>MikroTik RouterOS hotspot integration</div>
          </div>
          {config && !showForm && (
            <button onClick={() => setShowForm(true)} style={{ padding: '8px 16px', background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 7, color: '#9ca3af', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              Edit Config
            </button>
          )}
        </div>

        {loading ? (
          <LoadingSpinner size="md" label="Loading router config..." />
        ) : (
          <div style={{ maxWidth: 600 }}>
            {/* Saved Config Display */}
            {config && !showForm && (
              <>
                <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 20, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <Router size={20} color="#3b82f6" />
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#888' }}>ROUTER CONFIG</div>
                  </div>

                  <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                    <StatusBadge ok={true} label="Connection" labelOk={`${config.router_ip}:${config.api_port}`} />
                    <StatusBadge ok={!!config.router_ip} label="Status" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: '#0a0a0a', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Users size={14} color="#22c55e" />
                        <span style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Active Users</span>
                      </div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 500, color: '#22c55e' }}>—</div>
                    </div>
                    <div style={{ background: '#0a0a0a', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <HardDrive size={14} color="#f59e0b" />
                        <span style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Hotspot</span>
                      </div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 500, color: '#f59e0b' }}>{config.hotspot_server || 'hotspot1'}</div>
                    </div>
                  </div>
                </div>

                <button onClick={handleTest} disabled={testing} style={{ width: '100%', padding: 12, background: '#3b82f6', border: 'none', borderRadius: 7, color: '#030303', fontSize: 12, fontWeight: 700, cursor: testing ? 'not-allowed' : 'pointer', opacity: testing ? 0.7 : 1, marginBottom: 8 }}>
                  {testing ? 'Testing Connection...' : 'Test Router Connection'}
                </button>

                {testResult && (
                  <div style={{ padding: 12, background: testResult.status ? '#030d06' : '#0d0303', border: `0.5px solid ${testResult.status ? '#0a2214' : '#220a0a'}`, borderRadius: 7, fontSize: 11, color: testResult.status ? '#22c55e' : '#f87171' }}>
                    {testResult.message || (testResult.status ? 'Router connected successfully' : 'Connection failed')}
                  </div>
                )}
              </>
            )}

            {/* Setup / Edit Form */}
            {showForm && (
              <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 20 }}>
                  {config ? 'UPDATE ROUTER CONFIG' : 'FIRST-TIME SETUP'}
                </div>

                <div style={{ padding: '12px 14px', background: '#0a1628', border: '0.5px solid #1a3a5a', borderRadius: 7, marginBottom: 20, fontSize: 11, color: '#5a9fd4', lineHeight: 1.6 }}>
                  Create an API user on your MikroTik with minimal permissions. Allow port {form.api_port || '8728'} from your HonestBill server IP only.
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>Router IP Address *</label>
                  <input value={form.router_ip} onChange={e => setForm(p => ({ ...p, router_ip: e.target.value }))} placeholder="192.168.88.1"
                    style={{ width: '100%', padding: '10px 12px', background: '#030303', border: '0.5px solid #1e1e1e', borderRadius: 7, color: '#e0e0e0', fontSize: 12, boxSizing: 'border-box', outline: 'none', fontFamily: 'DM Mono, monospace' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>API Port</label>
                    <input value={form.api_port} onChange={e => setForm(p => ({ ...p, api_port: e.target.value }))} placeholder="8728"
                      style={{ width: '100%', padding: '10px 12px', background: '#030303', border: '0.5px solid #1e1e1e', borderRadius: 7, color: '#e0e0e0', fontSize: 12, fontFamily: 'DM Mono, monospace', boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>Hotspot Server</label>
                    <input value={form.hotspot_server} onChange={e => setForm(p => ({ ...p, hotspot_server: e.target.value }))} placeholder="hotspot1"
                      style={{ width: '100%', padding: '10px 12px', background: '#030303', border: '0.5px solid #1e1e1e', borderRadius: 7, color: '#e0e0e0', fontSize: 12, fontFamily: 'DM Mono, monospace', boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>API Username *</label>
                  <input value={form.api_username} onChange={e => setForm(p => ({ ...p, api_username: e.target.value }))} placeholder="api_user"
                    style={{ width: '100%', padding: '10px 12px', background: '#030303', border: '0.5px solid #1e1e1e', borderRadius: 7, color: '#e0e0e0', fontSize: 12, fontFamily: 'DM Mono, monospace', boxSizing: 'border-box', outline: 'none' }} />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>API Password</label>
                  <input type="password" value={form.api_password} onChange={e => setForm(p => ({ ...p, api_password: e.target.value }))} placeholder={config ? 'Leave blank to keep existing' : ''}
                    style={{ width: '100%', padding: '10px 12px', background: '#030303', border: '0.5px solid #1e1e1e', borderRadius: 7, color: '#e0e0e0', fontSize: 12, fontFamily: 'DM Mono, monospace', boxSizing: 'border-box', outline: 'none' }} />
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '12px', background: saving ? '#444' : '#3b82f6', border: 'none', borderRadius: 7, color: '#030303', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Saving...' : 'Save Configuration'}
                  </button>
                  {config && (
                    <button onClick={() => setShowForm(false)} style={{ padding: '12px 16px', background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 7, color: '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  )}
                </div>
              </div>
            )}

            {!config && !showForm && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444' }}>
                <Router size={40} color="#1a1a1a" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 14, marginBottom: 8 }}>No Router Configured</div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>Connect your MikroTik to start managing hotspot users automatically</div>
                <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', background: '#3b82f6', border: 'none', borderRadius: 7, color: '#030303', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Add Router</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
