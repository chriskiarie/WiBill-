'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/context/ToastContext'
import { CheckCircle, XCircle, Activity, Download, Copy, Terminal, Wifi, AlertTriangle, ChevronRight, RefreshCw, Search, Shield, Settings } from 'lucide-react'

const C = {
  void: 'var(--theme-bg)', base: 'var(--theme-card-base)', surface: 'var(--theme-surface)',
  border: 'var(--theme-border)', border2: 'var(--theme-border2)',
  text: 'var(--theme-text)', dim: 'var(--theme-dim)', mute: 'var(--theme-mute)', faint: 'var(--theme-faint)',
  gold: 'var(--theme-gold)', green: 'var(--theme-green)', red: 'var(--theme-red)',
}

const STEPS = [
  { id: 1, label: 'Router Script' },
  { id: 2, label: 'Bridge' },
  { id: 3, label: 'Portal' },
  { id: 4, label: 'Test' },
  { id: 5, label: 'Go Live' },
]

const Card = ({ children, style }: any) => (
  <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 20, ...style }}>{children}</div>
)

const Input = ({ label, value, onChange, placeholder, type, mono, suffix, error }: any) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>{label}</label>
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type || 'text'}
        style={{
          flex: 1, padding: '10px 12px', background: C.void, border: `0.5px solid ${error ? C.red : C.border}`, borderRadius: 7,
          color: C.text, fontSize: 12, fontFamily: mono ? 'DM Mono, monospace' : 'Inter, sans-serif',
          boxSizing: 'border-box', outline: 'none',
        }} />
      {suffix && <span style={{ fontSize: 10, color: C.dim, fontFamily: 'DM Mono, monospace' }}>{suffix}</span>}
    </div>
  </div>
)

function friendlyError(raw: string): string {
  if (!raw) return 'Unknown error'
  if (raw.includes('Bridge is offline')) return 'Bridge is offline — make sure bridge.py is running on the same network as the router'
  if (raw.includes('Bridge is busy')) return 'Bridge is busy — try again in a few seconds'
  if (raw.includes('Bridge authentication')) return 'Bridge authentication failed — check the bridge secret'
  if (raw.includes('Unexpected response')) return 'Bridge is not responding correctly — check that bridge.py is running'
  if (raw.includes('502')) return 'Could not reach the bridge — ensure bridge.py is running and the tunnel is active'
  if (raw.includes('ECONNREFUSED')) return 'Connection refused — bridge is not running on the expected port'
  if (raw.includes('timeout')) return 'Connection timed out — bridge may be unreachable'
  if (raw.includes('No MikroTik config')) return 'No router configured — run the setup wizard first'
  if (raw.includes('<!doctype') || raw.includes('<html')) return 'Bridge returned an error page — check that bridge.py is running'
  return raw
}

export default function MikrotikWizard() {
  const { token } = useAuth()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)

  const [health, setHealth] = useState<any>(null)
  const [packages, setPackages] = useState<any[]>([])

  useEffect(() => {
    if (!token) return
    Promise.all([
      api.getMikrotikHealth().catch(() => null),
      api.getPackages().catch(() => []),
    ]).then(([h, pkgs]) => {
      setHealth(h)
      setPackages(pkgs || [])
      setLoading(false)
    })
  }, [token])

  const handleCheckHealth = async () => {
    try {
      const h = await api.getMikrotikHealth()
      setHealth(h)
    } catch { setHealth({ connected: false, configured: false }) }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Topbar title="MikroTik Setup" />
        <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', background: C.void, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSpinner size="md" label="Loading..." />
        </div>
      </div>
    )
  }

  if (!showWizard && health?.connected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Topbar title="MikroTik Setup" />
        <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', background: C.void }}>
          <div style={{ maxWidth: 720, width: '100%', margin: '0 auto' }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wifi size={18} color={C.green} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Router Connected</div>
                  <div style={{ fontSize: 10, color: C.dim }}>{health.router_identity || 'MikroTik router'} · {health.board_name || '—'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                <div style={{ padding: 12, background: C.void, borderRadius: 7, border: `0.5px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>OS Version</div>
                  <div style={{ fontSize: 12, color: C.text, fontFamily: 'DM Mono, monospace' }}>{health.router_os_version || '—'}</div>
                </div>
                <div style={{ padding: 12, background: C.void, borderRadius: 7, border: `0.5px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Uptime</div>
                  <div style={{ fontSize: 12, color: C.text, fontFamily: 'DM Mono, monospace' }}>{health.uptime || '—'}</div>
                </div>
                <div style={{ padding: 12, background: C.void, borderRadius: 7, border: `0.5px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Hotspot</div>
                  <div style={{ fontSize: 12, color: health.hotspot_found ? C.green : C.red, fontFamily: 'DM Mono, monospace' }}>
                    {health.hotspot_found ? 'Active' : 'Not configured'}
                  </div>
                </div>
                <div style={{ padding: 12, background: C.void, borderRadius: 7, border: `0.5px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Bridge</div>
                  <div style={{ fontSize: 12, color: C.green, fontFamily: 'DM Mono, monospace' }}>Online</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowWizard(true)}
                  style={{ flex: 1, padding: 12, background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Settings size={14} /> Reconfigure Router
                </button>
                <button onClick={handleCheckHealth}
                  style={{ padding: '12px 16px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.dim, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RefreshCw size={13} /> Refresh
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!showWizard) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Topbar title="MikroTik Setup" />
        <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', background: C.void }}>
          <div style={{ maxWidth: 720, width: '100%', margin: '0 auto' }}>
            <Card>
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(232,184,75,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Wifi size={24} color={C.gold} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>Connect Your MikroTik Router</div>
                <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.7, maxWidth: 400, margin: '0 auto 24px' }}>
                  Set up your MikroTik hotspot so customers connecting to your WiFi see the branded captive portal and can purchase internet via M-Pesa.
                </div>
                <button onClick={() => setShowWizard(true)}
                  style={{ padding: '14px 32px', background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Settings size={16} /> Start Setup Wizard
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return <WizardFlow onBack={() => { setShowWizard(false); handleCheckHealth() }} />
}

function WizardFlow({ onBack }: { onBack: () => void }) {
  const { token } = useAuth()
  const { showToast } = useToast()

  const [step, setStep] = useState(1)

  const [ssid, setSsid] = useState('')
  const [networkOctet, setNetworkOctet] = useState(4)
  const [wifiInterface, setWifiInterface] = useState('wlan1')
  const [availableInterfaces, setAvailableInterfaces] = useState<string[]>(['wlan1'])
  const [backendHost, setBackendHost] = useState('')
  const [script, setScript] = useState<string | null>(null)
  const [scriptLoading, setScriptLoading] = useState(false)
  const [subnetOk, setSubnetOk] = useState<boolean | null>(null)
  const [subnetChecking, setSubnetChecking] = useState(false)

  const [bridgeScript, setBridgeScript] = useState<string | null>(null)
  const [bridgeLoading, setBridgeLoading] = useState(false)
  const [bridgeProvisioned, setBridgeProvisioned] = useState(false)
  const [bridgeConfirmed, setBridgeConfirmed] = useState(false)

  const [portalHtml, setPortalHtml] = useState<string | null>(null)
  const [portalUploading, setPortalUploading] = useState(false)
  const [portalUploaded, setPortalUploaded] = useState(false)
  const [fileOnRouter, setFileOnRouter] = useState<boolean | null>(null)
  const [fileChecking, setFileChecking] = useState(false)
  const [step3Confirmed, setStep3Confirmed] = useState(false)

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [hostsPolling, setHostsPolling] = useState(false)
  const [detectedDevices, setDetectedDevices] = useState<any[]>([])
  const [pollingActive, setPollingActive] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const [packages, setPackages] = useState<any[]>([])
  const [preflight, setPreflight] = useState<any>(null)
  const [preflightLoading, setPreflightLoading] = useState(false)
  const [goLiveDone, setGoLiveDone] = useState(false)

  useEffect(() => {
    if (!token) return
    Promise.all([
      api.getMikrotikConfig().catch(() => null),
      api.getPackages().catch(() => []),
      api.getMikrotikInterfaces().catch(() => ({ interfaces: [{ name: 'wlan1' }] })),
    ]).then(([cfg, pkgs, ifaces]) => {
      setPackages(pkgs || [])
      const names = (ifaces?.interfaces || []).map((i: any) => i.name)
      if (names.length) setAvailableInterfaces(names)
      if (!names.includes('wlan1')) setAvailableInterfaces([...names, 'wlan1'])
    })
  }, [token])

  useEffect(() => {
    if (networkOctet < 1 || networkOctet > 254) return
    setSubnetChecking(true)
    const timer = setTimeout(async () => {
      try {
        const res = await api.checkMikrotikSubnet(networkOctet)
        setSubnetOk(res.available)
      } catch { setSubnetOk(null) }
      setSubnetChecking(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [networkOctet])

  const handleGenerateScript = async () => {
    if (!ssid.trim()) { showToast('Enter a WiFi name', { type: 'error' }); return }
    setScriptLoading(true)
    try {
      const data = await api.generateMikrotikScript({
        ssid: ssid.trim(),
        network_octet: networkOctet,
        wifi_interface: wifiInterface,
        backend_host: backendHost || undefined,
      })
      setScript(data)
    } catch (e: any) {
      showToast(friendlyError(e.message || 'Failed to generate script'), { type: 'error' })
    } finally { setScriptLoading(false) }
  }

  const handleCopyScript = () => {
    if (!script) return
    navigator.clipboard.writeText(script)
    showToast('Script copied', { type: 'success' })
  }

  const handleDownloadScript = () => {
    if (!script) return
    const blob = new Blob([script], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'wibill-setup.rsc'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleGenerateBridge = async () => {
    setBridgeLoading(true)
    try {
      await api.provisionMikrotik().catch(() => null)
      const data = await api.getMikrotikInstallScript()
      setBridgeScript(data)
      setBridgeProvisioned(true)
    } catch (e: any) {
      showToast(friendlyError(e.message || 'Failed to generate bridge installer'), { type: 'error' })
    } finally { setBridgeLoading(false) }
  }

  const handleCopyBridgeScript = () => {
    if (!bridgeScript) return
    navigator.clipboard.writeText(bridgeScript)
    showToast('PowerShell command copied — paste it on the PC connected to the router', { type: 'success' })
  }

  const handleGenerateAndPushLoginHtml = async () => {
    setPortalUploading(true)
    try {
      const html = await api.getMikrotikLoginHtml()
      setPortalHtml(html)
      const result = await api.uploadPortalFile(html)
      if (result.ok) {
        showToast('login.html pushed to router', { type: 'success' })
        setPortalUploaded(true)
        setTimeout(() => { setFileChecking(true); verifyFileOnRouter() }, 3000)
      }
    } catch (e: any) {
      showToast(friendlyError(e.message || 'Failed to upload portal file'), { type: 'error' })
    } finally { setPortalUploading(false) }
  }

  const verifyFileOnRouter = async () => {
    try {
      const res = await api.getMikrotikFileStatus()
      setFileOnRouter(res.exists)
      if (!res.exists) {
        setTimeout(() => verifyFileOnRouter(), 3000)
      }
    } catch { setFileOnRouter(false) }
    setFileChecking(false)
  }

  const handleDownloadLoginHtml = async () => {
    try {
      const html = await api.getMikrotikLoginHtml()
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'login.html'; a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      showToast(friendlyError(e.message || 'Failed'), { type: 'error' })
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await api.testMikrotikConnection()
      setTestResult(result)
      if (result.connected) {
        showToast(`Connected to ${result.router_identity}`, { type: 'success' })
        startHostPolling()
      } else {
        showToast(friendlyError(result.error || 'Failed to connect'), { type: 'error' })
      }
    } catch (e: any) {
      setTestResult({ connected: false, error: friendlyError(e.message || 'Failed') })
    } finally { setTesting(false) }
  }

  const startHostPolling = () => {
    setPollingActive(true)
    const poll = async () => {
      try {
        const data = await api.getMikrotikHosts()
        setDetectedDevices(data.hosts || [])
      } catch {}
    }
    poll()
    pollRef.current = setInterval(poll, 3000)
  }

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const deviceCount = detectedDevices.filter((d: any) => !d.authorized).length
  const activeCount = detectedDevices.filter((d: any) => d.authorized === 'true').length

  const handlePreflight = async () => {
    setPreflightLoading(true)
    try {
      const result = await api.getMikrotikPreflight()
      setPreflight(result)
    } catch (e: any) {
      showToast(friendlyError(e.message || 'Preflight check failed'), { type: 'error' })
    } finally { setPreflightLoading(false) }
  }

  const handleGoLive = async () => {
    try {
      await api.goLiveMikrotik()
      setGoLiveDone(true)
      showToast('Hotspot is live!', { type: 'success' })
    } catch (e: any) {
      showToast(friendlyError(e.message || 'Failed to go live'), { type: 'error' })
    }
  }

  const hasActivePackage = packages.some(p => p.is_active)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="MikroTik Setup" />
      <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', background: C.void }}>
        <div style={{ maxWidth: 720, width: '100%', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 0, marginBottom: 32, alignItems: 'stretch' }}>
            {STEPS.map((s, i) => {
              const isActive = step === s.id
              const isDone = step > s.id
              return (
                <div key={s.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  {i > 0 && (
                    <div style={{ position: 'absolute', top: 14, left: 0, right: '50%', height: 1.5, background: isDone ? C.gold : C.border, zIndex: 0 }} />
                  )}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isDone ? C.gold : isActive ? 'transparent' : C.mute,
                    border: `1.5px solid ${isDone ? C.gold : isActive ? C.gold : C.border2}`,
                    color: isDone ? '#000' : isActive ? C.gold : C.dim,
                    fontSize: 11, fontWeight: 700, fontFamily: 'DM Mono, monospace', zIndex: 1, transition: 'all 0.3s',
                  }}>
                    {isDone ? '✓' : s.id}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: isActive || isDone ? C.gold : C.dim, marginTop: 6, textAlign: 'center' }}>
                    {s.label}
                  </div>
                </div>
              )
            })}
          </div>

          {step === 1 && (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Step 1 of 4 — Configure Your Router
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 20, lineHeight: 1.6 }}>
                Set up your WiFi network and generate a script that configures the router completely. Open <strong>Winbox → New Terminal</strong>, paste it, press Enter.
              </div>

              {!script && (
                <div style={{ display: 'grid', gap: 12 }}>
                  <Input label="WiFi Network Name (SSID)" value={ssid} onChange={setSsid} placeholder="e.g. MyISP WiFi" />
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>
                      Network Octet {subnetOk === true && <span style={{ color: C.green }}>✓ Available</span>}
                      {subnetOk === false && <span style={{ color: C.red }}>✗ Collision!</span>}
                      {subnetChecking && <span style={{ color: C.dim }}> checking...</span>}
                    </label>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: C.dim, fontFamily: 'DM Mono, monospace' }}>192.168.</span>
                      <input value={networkOctet} onChange={e => {
                        const v = parseInt(e.target.value) || 4
                        setNetworkOctet(Math.max(1, Math.min(254, v)))
                      }} type="number" min={1} max={254}
                        style={{
                          width: 60, padding: '10px 12px', background: C.void,
                          border: `0.5px solid ${subnetOk === false ? C.red : C.border}`, borderRadius: 7,
                          color: C.text, fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none', textAlign: 'center',
                        }} />
                      <span style={{ fontSize: 11, color: C.dim, fontFamily: 'DM Mono, monospace' }}>.0/24</span>
                    </div>
                    {subnetOk === false && <div style={{ fontSize: 9, color: C.red, marginTop: 4 }}>This subnet is already in use on the router. Choose a different octet.</div>}
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>Wireless Interface</label>
                    <select value={wifiInterface} onChange={e => setWifiInterface(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none' }}>
                      {availableInterfaces.map(iface => <option key={iface} value={iface}>{iface}</option>)}
                    </select>
                  </div>
                  <Input label="Backend Host (optional)" value={backendHost} onChange={setBackendHost} placeholder="Auto-detected" mono />
                </div>
              )}

              {!script && !scriptLoading && (
                <button onClick={handleGenerateScript} disabled={!ssid.trim() || subnetOk === false}
                  style={{ width: '100%', padding: 12, background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: (ssid.trim() && subnetOk !== false) ? 'pointer' : 'not-allowed', opacity: (ssid.trim() && subnetOk !== false) ? 1 : 0.5, marginTop: 12 }}>
                  Generate Setup Script
                </button>
              )}

              {scriptLoading && <LoadingSpinner size="sm" label="Generating script..." />}

              {script && (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <button onClick={handleCopyScript} style={{ padding: '8px 16px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Copy size={13} /> Copy
                    </button>
                    <button onClick={handleDownloadScript} style={{ padding: '8px 16px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Download size={13} /> .rsc
                    </button>
                    <button onClick={() => { setScript(null); setSsid('') }}
                      style={{ padding: '8px 16px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.dim, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Reset
                    </button>
                  </div>
                  <pre style={{
                    background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, padding: 16,
                    fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.dim, lineHeight: 1.6,
                    overflowX: 'auto', whiteSpace: 'pre', maxHeight: 400, overflowY: 'auto', marginBottom: 16,
                  }}>{script}</pre>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 7, marginBottom: 16 }}>
                    <Terminal size={16} color={C.gold} />
                    <span style={{ fontSize: 11, color: C.dim, flex: 1 }}>Open <strong>Winbox → New Terminal</strong>, paste the script, press <strong>Enter</strong>. Wait ~10s.</span>
                  </div>
                  <button onClick={() => setStep(2)} style={{ width: '100%', padding: 12, background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    I've run the script <ChevronRight size={14} />
                  </button>
                </>
              )}
            </Card>
          )}

          {step === 2 && (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Step 2 of 5 — Bridge Setup
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 16, lineHeight: 1.6 }}>
                Run this one-time installer on the <strong>always-on PC at your site</strong> (same network as the router). It installs the bridge that connects your router to WiBill.
              </div>

              {!bridgeScript && !bridgeLoading && (
                <button onClick={handleGenerateBridge}
                  style={{ padding: '12px 20px', background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  Generate Bridge Installer
                </button>
              )}

              {bridgeLoading && <LoadingSpinner size="sm" label="Setting up bridge..." />}

              {bridgeScript && (
                <>
                  <div style={{ padding: 14, marginBottom: 12, background: 'rgba(232,184,75,0.08)', border: `0.5px solid rgba(232,184,75,0.25)`, borderRadius: 7 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 6 }}>How to install:</div>
                    <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.7 }}>
                      1. Open <strong>PowerShell as Administrator</strong> on the PC<br/>
                      2. Paste the command below<br/>
                      3. Wait for it to finish (~2 minutes)
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <button onClick={handleCopyBridgeScript}
                      style={{ padding: '8px 16px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Copy size={13} /> Copy
                    </button>
                    <button onClick={() => { setBridgeScript(null); setBridgeProvisioned(false) }}
                      style={{ padding: '8px 16px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.dim, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Reset
                    </button>
                  </div>

                  <pre style={{
                    background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, padding: 16,
                    fontSize: 9, fontFamily: 'DM Mono, monospace', color: C.dim, lineHeight: 1.5,
                    overflowX: 'auto', whiteSpace: 'pre', maxHeight: 300, overflowY: 'auto', marginBottom: 16,
                  }}>{bridgeScript}</pre>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <input type="checkbox" id="bridge-confirm" checked={bridgeConfirmed} onChange={e => setBridgeConfirmed(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: C.gold }} />
                    <label htmlFor="bridge-confirm" style={{ fontSize: 11, color: C.text, cursor: 'pointer' }}>
                      Bridge is running on the PC
                    </label>
                  </div>

                  <button onClick={() => setStep(3)} disabled={!bridgeConfirmed}
                    style={{ width: '100%', padding: 12, background: bridgeConfirmed ? C.gold : C.mute, border: 'none', borderRadius: 7, color: bridgeConfirmed ? '#000' : C.dim, fontSize: 12, fontWeight: 700, cursor: bridgeConfirmed ? 'pointer' : 'not-allowed', opacity: bridgeConfirmed ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    Done <ChevronRight size={14} />
                  </button>
                </>
              )}
            </Card>
          )}

          {step === 3 && (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Step 3 of 5 — Upload Portal Redirect
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 20, lineHeight: 1.6 }}>
                Push the <strong>login.html</strong> redirect file directly to your router. This file sends users to your branded portal when they connect.
              </div>

              <button onClick={handleGenerateAndPushLoginHtml} disabled={portalUploading}
                style={{ padding: '12px 20px', background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: portalUploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, opacity: portalUploading ? 0.6 : 1 }}>
                {portalUploading ? 'Pushing to router...' : portalUploaded ? 'Re-push login.html' : 'Generate & Push login.html'}
              </button>

              {portalUploaded && (
                <div style={{ padding: 14, marginBottom: 16, background: 'rgba(34,197,94,0.08)', border: `0.5px solid rgba(34,197,94,0.2)`, borderRadius: 7, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={14} color={C.green} />
                  <span style={{ fontSize: 11, color: C.green }}>
                    Pushed to router {fileOnRouter === true ? '— confirmed on filesystem' : fileOnRouter === false ? '— waiting for router to download...' : ''}
                  </span>
                </div>
              )}

              {!portalUploaded && (
                <>
                  <button onClick={handleDownloadLoginHtml} style={{ padding: '8px 16px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
                    <Download size={13} /> Download login.html (manual upload)
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <input type="checkbox" id="step3-confirm" checked={step3Confirmed} onChange={e => setStep3Confirmed(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: C.gold }} />
                    <label htmlFor="step3-confirm" style={{ fontSize: 11, color: C.text, cursor: 'pointer' }}>
                      I've uploaded <strong>login.html</strong> to the hotspot folder in Winbox
                    </label>
                  </div>
                </>
              )}

              <button onClick={() => setStep(4)} disabled={!portalUploaded && !step3Confirmed}
                style={{ width: '100%', padding: 12, background: (portalUploaded || step3Confirmed) ? C.gold : C.mute, border: 'none', borderRadius: 7, color: (portalUploaded || step3Confirmed) ? '#000' : C.dim, fontSize: 12, fontWeight: 700, cursor: (portalUploaded || step3Confirmed) ? 'pointer' : 'not-allowed', opacity: (portalUploaded || step3Confirmed) ? 1 : 0.5 }}>
                Done <ChevronRight size={14} style={{ verticalAlign: 'middle' }} />
              </button>
            </Card>
          )}

          {step === 4 && (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Step 4 of 5 — Verify Connection
              </div>

              <button onClick={handleTest} disabled={testing}
                style={{ padding: '12px 20px', background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: testing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, opacity: testing ? 0.6 : 1 }}>
                <Activity size={14} /> {testing ? 'Testing...' : 'Test Connection'}
              </button>

              {testResult && (
                <div style={{
                  padding: 16, marginBottom: 16, borderRadius: 7, fontSize: 11, lineHeight: 1.6,
                  background: testResult.connected ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `0.5px solid ${testResult.connected ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                }}>
                  {testResult.connected ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <CheckCircle size={16} color={C.green} />
                        <span style={{ fontWeight: 600, color: C.green }}>{testResult.router_identity || 'Router'}</span>
                      </div>
                      <div style={{ fontSize: 10, color: C.dim, marginLeft: 24 }}>
                        <div>OS: {testResult.router_os_version || '—'} · Board: {testResult.board_name || '—'}</div>
                        <div>Uptime: {testResult.uptime || '—'}</div>
                        <div style={{ color: testResult.hotspot_found ? C.green : C.red, marginTop: 4 }}>
                          Hotspot: {testResult.hotspot_found ? '✓ Found' : '✗ Not found'}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <XCircle size={16} color={C.red} style={{ marginTop: 1, flexShrink: 0 }} />
                      <span style={{ color: C.red }}>{friendlyError(testResult.error || 'Failed')}</span>
                    </div>
                  )}
                </div>
              )}

              {pollingActive && (
                <div style={{ padding: 16, marginBottom: 16, background: C.surface, borderRadius: 7, border: `0.5px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Search size={14} color={C.gold} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>Device Detection — polling for connected devices...</span>
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, display: 'flex', gap: 16 }}>
                    <span>{deviceCount} device(s) waiting for auth</span>
                    <span>{activeCount} active session(s)</span>
                  </div>
                  {detectedDevices.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 9, color: C.dim, fontFamily: 'DM Mono, monospace' }}>
                      {detectedDevices.slice(0, 5).map((d: any, i: number) => (
                        <div key={i} style={{ padding: '4px 0', borderBottom: `0.5px solid ${C.border}` }}>
                          {d.mac || d['mac-address'] || '—'} · {d.address || '—'} · {d.authorized === 'true' ? '✓' : '○'}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 8, fontSize: 9, color: C.dim }}>
                    Connect a phone to <strong>{ssid || 'your WiFi'}</strong> to see it appear here
                  </div>
                </div>
              )}

              <button onClick={() => setStep(5)} disabled={!testResult?.connected}
                style={{ width: '100%', padding: 12, background: testResult?.connected ? C.gold : C.mute, border: 'none', borderRadius: 7, color: testResult?.connected ? '#000' : C.dim, fontSize: 12, fontWeight: 700, cursor: testResult?.connected ? 'pointer' : 'not-allowed', opacity: testResult?.connected ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                Connection confirmed <ChevronRight size={14} />
              </button>
            </Card>
          )}

          {step === 5 && (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Step 5 of 5 — Go Live
              </div>

              {!hasActivePackage && (
                <div style={{ padding: 14, marginBottom: 20, borderRadius: 7, background: 'rgba(232,184,75,0.08)', border: `0.5px solid rgba(232,184,75,0.25)` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <AlertTriangle size={14} color={C.gold} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.gold }}>No active packages</span>
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.6 }}>
                    Customers won't be able to purchase internet. <a href="/dashboard/packages" style={{ color: C.gold }}>Add Packages →</a>
                  </div>
                </div>
              )}

              {!goLiveDone && (
                <>
                  <button onClick={handlePreflight} disabled={preflightLoading}
                    style={{ padding: '10px 18px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 11, fontWeight: 600, cursor: preflightLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                    <Shield size={13} /> {preflightLoading ? 'Running checks...' : preflight ? 'Re-run Pre-flight Checks' : 'Run Pre-flight Checks'}
                  </button>

                  {preflight && (
                    <div style={{ marginBottom: 20 }}>
                      {Object.entries(preflight.checks || {}).map(([key, check]: [string, any]) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `0.5px solid ${C.border}` }}>
                          {check.passed ? <CheckCircle size={12} color={C.green} /> : <XCircle size={12} color={C.red} />}
                          <span style={{ fontSize: 10, color: C.text, textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                          <span style={{ fontSize: 9, color: C.dim, marginLeft: 'auto' }}>{check.message}</span>
                        </div>
                      ))}
                      {preflight.all_passed && (
                        <div style={{ marginTop: 12, padding: 10, background: 'rgba(34,197,94,0.08)', borderRadius: 7, fontSize: 10, color: C.green, textAlign: 'center' }}>
                          All checks passed — ready to go live
                        </div>
                      )}
                    </div>
                  )}

                  {hasActivePackage && (
                    <div style={{ padding: 12, marginBottom: 20, borderRadius: 7, background: 'rgba(34,197,94,0.08)', border: `0.5px solid rgba(34,197,94,0.2)`, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle size={14} color={C.green} />
                      <span style={{ fontSize: 10, color: C.green }}>{packages.filter(p => p.is_active).length} package(s) configured</span>
                    </div>
                  )}

                  <button onClick={handleGoLive}
                    style={{ width: '100%', padding: 12, background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <CheckCircle size={16} /> Go Live
                  </button>
                </>
              )}

              {goLiveDone && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>Setup Complete!</div>
                  <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
                    Your MikroTik hotspot is live. Customers connecting to <strong>{ssid || 'your WiFi'}</strong> will see the branded portal and can purchase internet via M-Pesa.
                  </div>
                  <div style={{ display: 'grid', gap: 12, marginTop: 20, marginBottom: 20 }}>
                    <div style={{ padding: 14, background: C.surface, borderRadius: 7, border: `0.5px solid ${C.border}` }}>
                      <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>SSID</div>
                      <div style={{ fontSize: 14, color: C.text, fontFamily: 'DM Mono, monospace' }}>{ssid || 'WiBill Hotspot'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                    <a href="/dashboard" style={{ padding: '10px 18px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>Dashboard</a>
                    <a href="/dashboard/portal" style={{ padding: '10px 18px', background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>Customize Portal</a>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
