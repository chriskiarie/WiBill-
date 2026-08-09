'use client'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/context/ToastContext'
import { CheckCircle, XCircle, Activity, Download, Copy, Terminal, Wifi, AlertTriangle, ChevronRight, RefreshCw, Search, Shield, Settings, Router, Globe, Server, Clock, Zap, ArrowRight } from 'lucide-react'

const C = {
  void: 'var(--theme-bg)', base: 'var(--theme-card-base)', surface: 'var(--theme-surface)',
  border: 'var(--theme-border)', border2: 'var(--theme-border2)',
  text: 'var(--theme-text)', dim: 'var(--theme-dim)', mute: 'var(--theme-mute)', faint: 'var(--theme-faint)',
  gold: 'var(--theme-gold)', green: 'var(--theme-green)', red: 'var(--theme-red)',
}

const STEPS = [
  { id: 1, label: 'Setup', icon: Settings, desc: 'Configure your router' },
  { id: 2, label: 'Connect', icon: Router, desc: 'Link your MikroTik router' },
  { id: 3, label: 'Bridge', icon: Server, desc: 'Install bridge on your PC' },
  { id: 4, label: 'Portal', icon: Globe, desc: 'Push login page to router' },
  { id: 5, label: 'Launch', icon: Zap, desc: 'Run checks & go live' },
]

const Card = ({ children, style }: any) => (
  <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 20, ...style }}>{children}</div>
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
          <div style={{ maxWidth: 680, width: '100%', margin: '0 auto' }}>
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
                {[
                  { label: 'OS Version', value: health.router_os_version || '—' },
                  { label: 'Uptime', value: health.uptime || '—' },
                  { label: 'Hotspot', value: health.hotspot_found ? 'Active' : 'Not configured', color: health.hotspot_found ? C.green : C.red },
                  { label: 'Bridge', value: 'Online', color: C.green },
                ].map(item => (
                  <div key={item.label} style={{ padding: 12, background: C.void, borderRadius: 7, border: `0.5px solid ${C.border}` }}>
                    <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: item.color || C.text, fontFamily: 'DM Mono, monospace' }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowWizard(true)}
                  style={{ flex: 1, padding: 12, background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Settings size={14} /> Reconfigure
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
          <div style={{ maxWidth: 680, width: '100%', margin: '0 auto' }}>
            <Card>
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'color-mix(in srgb, var(--theme-gold) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
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

  return <WizardFlow onBack={() => { setShowWizard(false); handleCheckHealth() }} packages={packages} />
}

function WizardFlow({ onBack, packages }: { onBack: () => void; packages: any[] }) {
  const { token } = useAuth()
  const { showToast } = useToast()

  const [step, setStep] = useState(1)

  const [ssid, setSsid] = useState('WiFi')
  const [wifiPassword, setWifiPassword] = useState('')
  const [networkOctet, setNetworkOctet] = useState('4')
  const [wifiInterface, setWifiInterface] = useState('wlan1')
  const [setupScript, setSetupScript] = useState<string | null>(null)
  const [setupLoading, setSetupLoading] = useState(false)

  const [routerIp, setRouterIp] = useState('')
  const [apiPort, setApiPort] = useState('8728')
  const [apiUsername, setApiUsername] = useState('wibill-api')
  const [apiPassword, setApiPassword] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectionResult, setConnectionResult] = useState<any>(null)

  // Step 2: Bridge
  const [bridgeScript, setBridgeScript] = useState<string | null>(null)
  const [bridgeLoading, setBridgeLoading] = useState(false)
  const [bridgeConfirmed, setBridgeConfirmed] = useState(false)
  const [bridgeBlocked, setBridgeBlocked] = useState<string | null>(null)
  const [bridgeHealth, setBridgeHealth] = useState<any>(null)

  useEffect(() => {
    if (step !== 3) return
    let cancelled = false
    const poll = async () => {
      try {
        const h = await api.getMikrotikHealth()
        if (!cancelled) setBridgeHealth(h)
      } catch { }
    }
    poll()
    const id = setInterval(poll, 3000)
    return () => { cancelled = true; clearInterval(id) }
  }, [step])

  // Step 3: Portal
  const [portalUploading, setPortalUploading] = useState(false)
  const [portalUploaded, setPortalUploaded] = useState(false)
  const [fileOnRouter, setFileOnRouter] = useState<boolean | null>(null)

  // Step 4: Launch
  const [preflight, setPreflight] = useState<any>(null)
  const [preflightLoading, setPreflightLoading] = useState(false)
  const [goLiveDone, setGoLiveDone] = useState(false)

  const [configLoaded, setConfigLoaded] = useState(false)
  const [configExists, setConfigExists] = useState(false)

  // Load existing config
  useEffect(() => {
    if (!token) return
    api.getMikrotikConfig().then(cfg => {
      if (cfg?.configured) {
        setRouterIp(cfg.router_ip || '')
        setApiPort(String(cfg.api_port || 8728))
        setApiUsername(cfg.api_username || 'wibill-api')
        setConfigExists(true)
      }
      setConfigLoaded(true)
    }).catch(() => { setConfigLoaded(true) })
  }, [token])

  const handleGenerateSetup = async () => {
    setSetupLoading(true)
    try {
      const script = await api.generateMikrotikScript({
        ssid: ssid.trim() || 'WiFi',
        network_octet: parseInt(networkOctet) || 4,
        wifi_interface: wifiInterface.trim() || 'wlan1',
      })
      setSetupScript(script)
      setRouterIp(`192.168.${parseInt(networkOctet) || 4}.1`)
      try {
        const data = await api.getMikrotikInstallScriptData()
        if (data?.api_password) setApiPassword(data.api_password)
      } catch { }
    } catch (e: any) {
      showToast(friendlyError(e?.message || 'Failed to generate setup script'), { type: 'error' })
    } finally { setSetupLoading(false) }
  }

  const handleCopySetup = () => {
    if (!setupScript) return
    navigator.clipboard.writeText(setupScript)
    showToast('Copied — paste in Winbox Terminal', { type: 'success' })
  }

  const handleConnect = async () => {
    if (!routerIp.trim()) { showToast('Enter router IP address', { type: 'error' }); return }
    if (!apiPassword.trim()) { showToast('Enter API password', { type: 'error' }); return }
    setConnecting(true)
    setConnectionResult(null)
    try {
      const payload: any = {
        router_ip: routerIp.trim(),
        api_port: parseInt(apiPort) || 8728,
        api_username: apiUsername.trim(),
      }
      if (apiPassword.trim()) {
        payload.api_password = apiPassword.trim()
      }
      if (configExists) {
        await api.updateMikrotikConfig(payload)
      } else {
        await api.saveMikrotikConfig({ ...payload, api_password: apiPassword.trim() || 'changeme' })
      }
      const result = await api.testMikrotikConnection()
      setConnectionResult(result)
      if (result.connected) {
        showToast(`Connected to ${result.router_identity || 'router'}`, { type: 'success' })
      } else {
        showToast(friendlyError(result.error || 'Connection failed'), { type: 'error' })
      }
    } catch (e: any) {
      setConnectionResult({ connected: false, error: friendlyError(e.message || 'Failed') })
      showToast(friendlyError(e.message || 'Failed'), { type: 'error' })
    } finally { setConnecting(false) }
  }

  // ── Step 2: Bridge ──
  const handleGenerateBridge = async () => {
    setBridgeLoading(true)
    setBridgeBlocked(null)
    setBridgeHealth(null)
    try {
      let provisioned = false
      try {
        const prov = await api.provisionMikrotik()
        provisioned = Boolean(prov && prov.tunnel_id)
      } catch (e: any) {
        // "Tunnel already provisioned" (HTTP 400) means the tunnel exists — proceed
        if ((e as any)?.status === 400) {
          provisioned = true
        } else {
          throw e
        }
      }

      if (!provisioned) {
        setBridgeBlocked(
          'No tunnel was created — the Cloudflare API token is missing or invalid on the server. ' +
          'Without it, cloudflared cannot be installed and your backend will never be able to reach this bridge. ' +
          'Ask your platform admin to set CLOUDFLARE_API_TOKEN, then try again.'
        )
        return
      }

      const data = await api.getMikrotikInstallScript()
      setBridgeScript(data)
    } catch (e: any) {
      setBridgeBlocked(friendlyError(e?.message || 'Failed to generate bridge installer'))
    } finally { setBridgeLoading(false) }
  }

  const handleCopyBridgeScript = () => {
    if (!bridgeScript) return
    navigator.clipboard.writeText(bridgeScript)
    showToast('Copied — paste in PowerShell as Admin on the PC', { type: 'success' })
  }

  // ── Step 3: Portal ──
  const handlePushPortal = async () => {
    setPortalUploading(true)
    try {
      const html = await api.getMikrotikLoginHtml()
      const result = await api.uploadPortalFile(html)
      if (result.ok) {
        showToast('login.html pushed to router', { type: 'success' })
        setPortalUploaded(true)
        setTimeout(async () => {
          try {
            const res = await api.getMikrotikFileStatus()
            setFileOnRouter(res.exists)
          } catch { setFileOnRouter(false) }
        }, 3000)
      }
    } catch (e: any) {
      showToast(friendlyError(e.message || 'Failed to push portal file'), { type: 'error' })
    } finally { setPortalUploading(false) }
  }

  // ── Step 4: Launch ──
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
        <div style={{ maxWidth: 680, width: '100%', margin: '0 auto' }}>

          {/* Step Tracker */}
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
                    {isDone ? <CheckCircle size={14} /> : isActive ? <s.icon size={14} /> : s.id}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: isActive || isDone ? C.gold : C.dim, marginTop: 6, textAlign: 'center' }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 9, color: isActive ? C.dim : 'transparent', marginTop: 2, textAlign: 'center', maxWidth: 80 }}>
                    {s.desc}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ══════ STEP 1: Setup ══════ */}
          {step === 1 && (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Step 1 of 5 — Setup Router
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 20, lineHeight: 1.6 }}>
                Generate a RouterOS script that configures your fresh router from scratch — bridge, DHCP, hotspot, API user, and walled garden. Paste it into Winbox once.
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>WiFi Network Name (SSID)</label>
                <input value={ssid} onChange={e => setSsid(e.target.value)} placeholder="My ISP WiFi"
                  style={{ width: '100%', padding: '10px 12px', background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>WiFi Password <span style={{ color: C.mute }}>(blank = open)</span></label>
                <input value={wifiPassword} onChange={e => setWifiPassword(e.target.value)} placeholder="Leave blank for open WiFi" type="password"
                  style={{ width: '100%', padding: '10px 12px', background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>Network Octet</label>
                  <input value={networkOctet} onChange={e => setNetworkOctet(e.target.value)} placeholder="4"
                    style={{ width: '100%', padding: '10px 12px', background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none', boxSizing: 'border-box' }} />
                  <div style={{ fontSize: 9, color: C.mute, marginTop: 3 }}>Router gets 192.168.<strong>{networkOctet || '4'}</strong>.1</div>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>WiFi Interface</label>
                  <input value={wifiInterface} onChange={e => setWifiInterface(e.target.value)} placeholder="wlan1"
                    style={{ width: '100%', padding: '10px 12px', background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none', boxSizing: 'border-box' }} />
                  <div style={{ fontSize: 9, color: C.mute, marginTop: 3 }}>Usually wlan1 on hAP lite</div>
                </div>
              </div>

              {!setupScript && !setupLoading && (
                <button onClick={handleGenerateSetup}
                  style={{ width: '100%', padding: 12, background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Terminal size={14} /> Generate Setup Script
                </button>
              )}

              {setupLoading && <LoadingSpinner size="sm" label="Generating script..." />}

              {setupScript && (
                <>
                  <div style={{ padding: 14, marginBottom: 12, background: 'color-mix(in srgb, var(--theme-gold) 8%, transparent)', border: `0.5px solid color-mix(in srgb, var(--theme-gold) 25%, transparent)`, borderRadius: 7 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 6 }}>Setup Instructions:</div>
                    <ol style={{ fontSize: 10, color: C.dim, lineHeight: 2, margin: 0, paddingLeft: 18 }}>
                      <li>Open <strong>Winbox</strong> → connect to your router</li>
                      <li>Go to <strong>New Terminal</strong></li>
                      <li>Paste the script below and press Enter</li>
                      <li>Wait for "WiBill setup complete" message</li>
                    </ol>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <button onClick={handleCopySetup}
                      style={{ padding: '8px 16px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Copy size={13} /> Copy Script
                    </button>
                    <button onClick={() => { setSetupScript(null) }}
                      style={{ padding: '8px 16px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.dim, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Reset
                    </button>
                  </div>

                  <pre style={{
                    background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, padding: 16,
                    fontSize: 9, fontFamily: 'DM Mono, monospace', color: C.dim, lineHeight: 1.5,
                    overflowX: 'auto', whiteSpace: 'pre', maxHeight: 300, overflowY: 'auto', marginBottom: 16,
                  }}>{setupScript}</pre>

                  <button onClick={() => setStep(2)}
                    style={{ width: '100%', padding: 12, background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    Script pasted into Winbox — Continue <ArrowRight size={14} />
                  </button>
                </>
              )}
            </Card>
          )}

          {/* ══════ STEP 2: Connect ══════ */}
          {step === 2 && (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Step 2 of 5 — Connect Router
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 20, lineHeight: 1.6 }}>
                Enter your MikroTik router details to test the API connection. The API user <strong>wibill-api</strong> was created by the Setup script in Step 1.
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>Router IP Address</label>
                <input value={routerIp} onChange={e => setRouterIp(e.target.value)} placeholder="192.168.4.1"
                  style={{ width: '100%', padding: '10px 12px', background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>API Port</label>
                  <input value={apiPort} onChange={e => setApiPort(e.target.value)} placeholder="8728"
                    style={{ width: '100%', padding: '10px 12px', background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>API Username</label>
                  <input value={apiUsername} onChange={e => setApiUsername(e.target.value)} placeholder="wibill-api"
                    style={{ width: '100%', padding: '10px 12px', background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>API Password</label>
                <input value={apiPassword} onChange={e => setApiPassword(e.target.value)} placeholder="Enter router API password" type="password"
                  style={{ width: '100%', padding: '10px 12px', background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <button onClick={handleConnect} disabled={connecting || !routerIp.trim() || !apiPassword.trim()}
                style={{ width: '100%', padding: 12, background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: (connecting || !routerIp.trim() || !apiPassword.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (connecting || !routerIp.trim() || !apiPassword.trim()) ? 0.5 : 1 }}>
                {connecting ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Activity size={14} />}
                {connecting ? 'Connecting...' : 'Test Connection'}
              </button>

              {connectionResult && (
                <div style={{
                  marginTop: 16, padding: 16, borderRadius: 7, fontSize: 11,
                  background: connectionResult.connected ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `0.5px solid ${connectionResult.connected ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                }}>
                  {connectionResult.connected ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CheckCircle size={16} color={C.green} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: C.green, fontSize: 13 }}>{connectionResult.router_identity || 'Connected'}</div>
                          <div style={{ fontSize: 9, color: C.dim }}>{connectionResult.board_name || 'MikroTik'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div style={{ padding: 8, background: C.void, borderRadius: 6 }}>
                          <div style={{ fontSize: 8, color: C.dim, textTransform: 'uppercase', fontWeight: 700 }}>OS Version</div>
                          <div style={{ fontSize: 10, color: C.text, fontFamily: 'DM Mono, monospace' }}>{connectionResult.router_os_version || '—'}</div>
                        </div>
                        <div style={{ padding: 8, background: C.void, borderRadius: 6 }}>
                          <div style={{ fontSize: 8, color: C.dim, textTransform: 'uppercase', fontWeight: 700 }}>Uptime</div>
                          <div style={{ fontSize: 10, color: C.text, fontFamily: 'DM Mono, monospace' }}>{connectionResult.uptime || '—'}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: connectionResult.hotspot_found ? C.green : C.red }} />
                        <span style={{ fontSize: 10, color: connectionResult.hotspot_found ? C.green : C.red }}>
                          Hotspot: {connectionResult.hotspot_found ? 'Configured' : 'Not found'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <XCircle size={14} color={C.red} style={{ marginTop: 1, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, color: C.red, marginBottom: 4 }}>Connection Failed</div>
                        <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.5 }}>{friendlyError(connectionResult.error || 'Could not reach router')}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {connectionResult?.connected && (
                <button onClick={() => setStep(3)}
                  style={{ width: '100%', padding: 12, marginTop: 16, background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  Continue <ArrowRight size={14} />
                </button>
              )}
            </Card>
          )}

          {/* ══════ STEP 3: Bridge ══════ */}
          {step === 3 && (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Step 3 of 5 — Bridge Setup
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 16, lineHeight: 1.6 }}>
                Run this one-time installer on the <strong>always-on PC at your site</strong> (same network as the router). It installs the bridge that connects your router to WiBill.
              </div>

              {(() => {
                const h = bridgeHealth
                if (!h || !h.configured) {
                  return (
                    <div style={{ padding: '10px 14px', marginBottom: 16, borderRadius: 7, background: 'color-mix(in srgb, var(--theme-gold) 8%, transparent)', border: `0.5px solid color-mix(in srgb, var(--theme-gold) 25%, transparent)`, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <RefreshCw size={13} color={C.gold} style={{ animation: 'spin 1.2s linear infinite' }} />
                      <span style={{ fontSize: 11, color: C.gold }}>Waiting for bridge...</span>
                    </div>
                  )
                }
                if (h.connected && h.router_reachable) {
                  return (
                    <div style={{ padding: '10px 14px', marginBottom: 16, borderRadius: 7, background: 'rgba(34,197,94,0.08)', border: `0.5px solid rgba(34,197,94,0.2)`, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle size={13} color={C.green} />
                      <span style={{ fontSize: 11, color: C.green }}>Bridge connected &nbsp;·&nbsp; Router reachable ({h.router_ip})</span>
                    </div>
                  )
                }
                return (
                  <div style={{ padding: '10px 14px', marginBottom: 16, borderRadius: 7, background: 'rgba(239,68,68,0.08)', border: `0.5px solid rgba(239,68,68,0.2)`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <XCircle size={13} color={C.red} />
                    <span style={{ fontSize: 11, color: C.red }}>{h.connected ? 'Bridge connected — router unreachable' : 'Bridge not reachable'} · {h.last_error || 'check the PC'}</span>
                  </div>
                )
              })()}

              {bridgeBlocked && (
                <div style={{ padding: 14, marginBottom: 16, borderRadius: 7, background: 'rgba(239,68,68,0.08)', border: `0.5px solid rgba(239,68,68,0.25)`, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <AlertTriangle size={15} color={C.red} style={{ marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginBottom: 4 }}>Bridge installer blocked</div>
                    <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.6 }}>{bridgeBlocked}</div>
                    <button onClick={() => setBridgeBlocked(null)}
                      style={{ marginTop: 8, padding: '6px 10px', background: 'transparent', border: `0.5px solid rgba(239,68,68,0.4)`, borderRadius: 5, color: C.red, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {!bridgeScript && !bridgeLoading && !bridgeBlocked && (
                <button onClick={handleGenerateBridge}
                  style={{ padding: '12px 20px', background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Server size={14} /> Generate Bridge Installer
                </button>
              )}

              {bridgeLoading && <LoadingSpinner size="sm" label="Setting up bridge..." />}

              {bridgeScript && (
                <>
                  <div style={{ padding: 14, marginBottom: 12, background: 'color-mix(in srgb, var(--theme-gold) 8%, transparent)', border: `0.5px solid color-mix(in srgb, var(--theme-gold) 25%, transparent)`, borderRadius: 7 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 6 }}>Installation Steps:</div>
                    <ol style={{ fontSize: 10, color: C.dim, lineHeight: 2, margin: 0, paddingLeft: 18 }}>
                      <li>Open <strong>PowerShell as Administrator</strong> on the PC</li>
                      <li>Paste the script below and press Enter</li>
                      <li>Wait ~2 minutes for everything to install</li>
                      <li>Keep this PC running 24/7 — the bridge must stay online</li>
                    </ol>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <button onClick={handleCopyBridgeScript}
                      style={{ padding: '8px 16px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Copy size={13} /> Copy Script
                    </button>
                    <button onClick={() => { setBridgeScript(null); setBridgeConfirmed(false); setBridgeBlocked(null) }}
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
                      Bridge is installed and running on the PC
                    </label>
                  </div>

                  <button onClick={() => setStep(4)} disabled={!bridgeConfirmed}
                    style={{ width: '100%', padding: 12, background: bridgeConfirmed ? C.gold : C.mute, border: 'none', borderRadius: 7, color: bridgeConfirmed ? '#000' : C.dim, fontSize: 12, fontWeight: 700, cursor: bridgeConfirmed ? 'pointer' : 'not-allowed', opacity: bridgeConfirmed ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    Installed — Continue <ArrowRight size={14} />
                  </button>
                </>
              )}
            </Card>
          )}

          {/* ══════ STEP 4: Portal ══════ */}
          {step === 4 && (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Step 4 of 5 — Push Portal Page
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 20, lineHeight: 1.6 }}>
                Push the <strong>login.html</strong> redirect file to your router. This file sends users to your branded portal when they connect to WiFi.
              </div>

              <div style={{ padding: 14, marginBottom: 16, background: 'color-mix(in srgb, var(--theme-gold) 6%, transparent)', border: `0.5px solid color-mix(in srgb, var(--theme-gold) 20%, transparent)`, borderRadius: 7 }}>
                <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.7 }}>
                  The bridge pushes login.html via <strong>/tool/fetch</strong> on the router. If the bridge is down, <strong>download login.html</strong> and upload manually via Winbox → Files → hotspot/.
                </div>
              </div>

              {!portalUploaded ? (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <button onClick={handlePushPortal} disabled={portalUploading}
                    style={{ flex: 1, padding: 12, background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: portalUploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: portalUploading ? 0.6 : 1 }}>
                    {portalUploading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Globe size={14} />}
                    {portalUploading ? 'Pushing...' : 'Generate & Push to Router'}
                  </button>
                  <button onClick={async () => {
                    try {
                      const html = await api.getMikrotikLoginHtml()
                      const blob = new Blob([html], { type: 'text/html' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a'); a.href = url; a.download = 'login.html'; a.click()
                      URL.revokeObjectURL(url)
                    } catch { showToast('Failed to download', { type: 'error' }) }
                  }} style={{ padding: '12px 16px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.dim, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Download size={13} /> Download
                  </button>
                </div>
              ) : (
                <div style={{ padding: 14, marginBottom: 16, background: 'rgba(34,197,94,0.08)', border: `0.5px solid rgba(34,197,94,0.2)`, borderRadius: 7, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={14} color={C.green} />
                  <span style={{ fontSize: 11, color: C.green }}>
                    Pushed to router {fileOnRouter === true ? '— confirmed on filesystem' : fileOnRouter === false ? '— waiting for router to download...' : ''}
                  </span>
                </div>
              )}

<button onClick={() => setStep(5)} disabled={!portalUploaded}
                    style={{ width: '100%', padding: 12, background: portalUploaded ? C.gold : C.mute, border: 'none', borderRadius: 7, color: portalUploaded ? '#000' : C.dim, fontSize: 12, fontWeight: 700, cursor: portalUploaded ? 'pointer' : 'not-allowed', opacity: portalUploaded ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    Portal Pushed — Continue <ArrowRight size={14} />
                  </button>
            </Card>
          )}

          {/* ══════ STEP 5: Launch ══════ */}
          {step === 5 && (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Step 5 of 5 — Go Live
              </div>

              {!hasActivePackage && (
                <div style={{ padding: 14, marginBottom: 20, borderRadius: 7, background: 'color-mix(in srgb, var(--theme-gold) 8%, transparent)', border: `0.5px solid color-mix(in srgb, var(--theme-gold) 25%, transparent)` }}>
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
                    style={{ width: '100%', padding: 12, background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, fontWeight: 600, cursor: preflightLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
                    {preflightLoading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Shield size={14} />}
                    {preflightLoading ? 'Running checks...' : preflight ? 'Re-run Pre-flight Checks' : 'Run Pre-flight Checks'}
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
                    style={{ width: '100%', padding: 14, background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Zap size={16} /> Go Live
                  </button>
                </>
              )}

              {goLiveDone && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <CheckCircle size={28} color={C.green} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>Setup Complete!</div>
                  <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6, maxWidth: 400, margin: '0 auto 20px' }}>
                    Your MikroTik hotspot is live. Customers connecting to your WiFi will see the branded portal and can purchase internet via M-Pesa.
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                    <a href="/dashboard" style={{ padding: '10px 18px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>Dashboard</a>
                    <a href="/dashboard/wizard" style={{ padding: '10px 18px', background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>Customize Portal</a>
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
