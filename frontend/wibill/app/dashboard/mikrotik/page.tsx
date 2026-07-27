'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/context/ToastContext'
import { CheckCircle, XCircle, Activity, Download, Copy, Terminal, Wifi, AlertTriangle } from 'lucide-react'

const C = {
  void: 'var(--theme-bg)', base: 'var(--theme-card-base)', surface: 'var(--theme-surface)',
  border: 'var(--theme-border)', border2: 'var(--theme-border2)',
  text: 'var(--theme-text)', dim: 'var(--theme-dim)', mute: 'var(--theme-mute)', faint: 'var(--theme-faint)',
  gold: 'var(--theme-gold)', green: 'var(--theme-green)', red: 'var(--theme-red)',
}

const STEPS = [
  { id: 1, label: 'Router Script' },
  { id: 2, label: 'Portal File' },
  { id: 3, label: 'Test Connection' },
  { id: 4, label: 'Go Live' },
]

export default function MikrotikPage() {
  const { token } = useAuth()
  const { showToast } = useToast()

  const [step, setStep] = useState(1)
  const [script, setScript] = useState<string | null>(null)
  const [scriptLoading, setScriptLoading] = useState(false)
  const [step1Ready, setStep1Ready] = useState(false)
  const [step1TimeElapsed, setStep1TimeElapsed] = useState(false)
  const [step2Confirmed, setStep2Confirmed] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [packages, setPackages] = useState<any[]>([])
  const [goLiveDone, setGoLiveDone] = useState(false)
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const step1TimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [portalUrl, setPortalUrl] = useState('')

  useEffect(() => {
    if (!token) return
    api.getMikrotikConfig().then(setConfig).catch(() => {}).finally(() => setLoading(false))
    api.getPackages().then(setPackages).catch(() => {})
  }, [token])

  useEffect(() => {
    api.getMe().then((user: any) => {
      if (user?.tenant?.slug) {
        setPortalUrl(`${window.location.origin}/portal/${user.tenant.slug}`)
      }
    }).catch(() => {
      setPortalUrl(`${window.location.origin}/portal/demo`)
    })
  }, [token])

  const fetchScript = useCallback(async () => {
    setScriptLoading(true)
    setStep1TimeElapsed(false)
    try {
      const data = await api.getMikrotikRouterOsScript()
      setScript(data)
      step1TimerRef.current = setTimeout(() => setStep1TimeElapsed(true), 5000)
    } catch (e: any) {
      showToast(e.message || 'Failed to generate script', { type: 'error' })
    } finally {
      setScriptLoading(false)
    }
  }, [showToast])

  const handleStep1Advance = useCallback(() => {
    setStep1Ready(true)
    setStep(2)
  }, [])

  const handleDownloadScript = () => {
    if (!script) return
    const blob = new Blob([script], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'wibill-setup.rsc'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyScript = () => {
    if (!script) return
    navigator.clipboard.writeText(script)
    showToast('Script copied to clipboard', { type: 'success' })
  }

  const handleDownloadLoginHtml = async () => {
    try {
      const html = await api.getMikrotikLoginHtml()
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'login.html'
      a.click()
      URL.revokeObjectURL(url)
      showToast('login.html downloaded', { type: 'success' })
    } catch (e: any) {
      showToast(e.message || 'Failed to generate login.html', { type: 'error' })
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
      } else {
        showToast(result.error || 'Connection failed', { type: 'error' })
      }
    } catch (e: any) {
      setTestResult({ connected: false, error: e.message || 'Connection failed' })
      showToast(e.message || 'Connection failed', { type: 'error' })
    } finally {
      setTesting(false)
    }
  }

  const handleGoLive = async () => {
    setGoLiveDone(true)
    showToast('Setup complete! Your hotspot is live.', { type: 'success' })
  }

  const canAdvanceToStep3 = step2Confirmed
  const canAdvanceToStep4 = testResult?.connected && testResult?.hotspot_found
  const hasActivePackage = packages.some(p => p.is_active)

  const stripHtml = (s: string) => s ? s.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim() : ''

  const Card = ({ children, style }: any) => (
    <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 20, ...style }}>
      {children}
    </div>
  )

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="MikroTik Setup" />
      <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', background: C.void }}>
        <div style={{ maxWidth: 720, width: '100%', margin: '0 auto' }}>

          {/* Step Indicator */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 32, alignItems: 'stretch' }}>
            {STEPS.map((s, i) => {
              const isActive = step === s.id
              const isDone = step > s.id
              return (
                <div key={s.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  {i > 0 && (
                    <div style={{
                      position: 'absolute', top: 14, left: 0, right: '50%', height: 1.5,
                      background: isDone ? C.gold : C.border, zIndex: 0,
                    }} />
                  )}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isDone ? C.gold : isActive ? 'transparent' : C.mute,
                    border: `1.5px solid ${isDone ? C.gold : isActive ? C.gold : C.border2}`,
                    color: isDone ? '#000' : isActive ? C.gold : C.dim,
                    fontSize: 11, fontWeight: 700, fontFamily: 'DM Mono, monospace',
                    zIndex: 1, transition: 'all 0.3s',
                  }}>
                    {isDone ? '✓' : s.id}
                  </div>
                  <div style={{
                    fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                    color: isActive || isDone ? C.gold : C.dim, marginTop: 6, textAlign: 'center',
                  }}>
                    {s.label}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Step 1 — Router Script */}
          {step === 1 && (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Step 1 of 4 — Configure Your Router
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 20, lineHeight: 1.6 }}>
                This script configures your MikroTik router completely — bridge, DHCP, hotspot, walled garden, and API user.
                Open <strong>Winbox → New Terminal</strong>, paste the entire script, and press Enter.
              </div>

              {!script && !scriptLoading && (
                <button onClick={fetchScript}
                  style={{ padding: '12px 20px', background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Generate Setup Script
                </button>
              )}

              {scriptLoading && <LoadingSpinner size="sm" label="Generating script..." />}

              {script && (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <button onClick={handleCopyScript}
                      style={{ padding: '8px 16px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Copy size={13} /> Copy Script
                    </button>
                    <button onClick={handleDownloadScript}
                      style={{ padding: '8px 16px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Download size={13} /> Download .rsc
                    </button>
                  </div>

                  <pre style={{
                    background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, padding: 16,
                    fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.dim, lineHeight: 1.6,
                    overflowX: 'auto', whiteSpace: 'pre', maxHeight: 400, overflowY: 'auto', marginBottom: 20,
                  }}>
                    {script}
                  </pre>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 7, marginBottom: 16 }}>
                    <Terminal size={16} color={C.gold} />
                    <span style={{ fontSize: 11, color: C.dim, flex: 1 }}>
                      Open <strong>Winbox → New Terminal</strong>, paste the script above, and press <strong>Enter</strong>. Wait about 10 seconds for it to complete.
                    </span>
                  </div>

                  {step1TimeElapsed && (
                    <button onClick={handleStep1Advance}
                      style={{ width: '100%', padding: 12, background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      I've run the script →
                    </button>
                  )}
                  {!step1TimeElapsed && (
                    <div style={{ textAlign: 'center', fontSize: 10, color: C.dim, padding: 8 }}>
                      The advance button will appear in 5 seconds — please read through the script carefully
                    </div>
                  )}
                </>
              )}
            </Card>
          )}

          {/* Step 2 — Portal File */}
          {step === 2 && (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Step 2 of 4 — Upload Portal Redirect
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 20, lineHeight: 1.6 }}>
                Download the <strong>login.html</strong> file below. Then in <strong>Winbox → Files</strong>, navigate to the <strong>hotspot</strong> folder and upload this file.
                This file redirects users to your branded portal when they connect to WiFi.
              </div>

              <button onClick={handleDownloadLoginHtml}
                style={{ padding: '12px 20px', background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <Download size={14} /> Download login.html
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <input type="checkbox" id="step2-confirm" checked={step2Confirmed} onChange={e => setStep2Confirmed(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: C.gold }} />
                <label htmlFor="step2-confirm" style={{ fontSize: 11, color: C.text, cursor: 'pointer' }}>
                  I've uploaded <strong>login.html</strong> to the hotspot folder in Winbox
                </label>
              </div>

              <button onClick={() => setStep(3)} disabled={!step2Confirmed}
                style={{ width: '100%', padding: 12, background: step2Confirmed ? C.gold : C.mute, border: 'none', borderRadius: 7, color: step2Confirmed ? '#000' : C.dim, fontSize: 12, fontWeight: 700, cursor: step2Confirmed ? 'pointer' : 'not-allowed', opacity: step2Confirmed ? 1 : 0.5 }}>
                Done →
              </button>
            </Card>
          )}

          {/* Step 3 — Test Connection */}
          {step === 3 && (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Step 3 of 4 — Verify Connection
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 20, lineHeight: 1.6 }}>
                Test that the dashboard can reach your MikroTik router and detect the hotspot server.
              </div>

              <button onClick={handleTest} disabled={testing}
                style={{ padding: '12px 20px', background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: testing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, opacity: testing ? 0.6 : 1 }}>
                <Activity size={14} /> {testing ? 'Testing...' : 'Test Connection'}
              </button>

              {testResult && (
                <div style={{
                  padding: 16, marginBottom: 20, borderRadius: 7, fontSize: 11, lineHeight: 1.6,
                  background: testResult.connected ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `0.5px solid ${testResult.connected ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                }}>
                  {testResult.connected ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <CheckCircle size={16} color={C.green} />
                        <span style={{ fontWeight: 600, color: C.green }}>Connected to {testResult.router_identity || 'Router'}</span>
                      </div>
                      <div style={{ fontSize: 10, color: C.dim, marginLeft: 24 }}>
                        <div>Version: {testResult.router_os_version || '—'}</div>
                        <div>Board: {testResult.board_name || '—'}</div>
                        <div>Uptime: {testResult.uptime || '—'}</div>
                        <div style={{ color: testResult.hotspot_found ? C.green : C.red, marginTop: 4 }}>
                          Hotspot server: {testResult.hotspot_found ? '✓ Found' : '✗ Not found'}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <XCircle size={16} color={C.red} />
                        <span style={{ fontWeight: 600, color: C.red }}>Connection Failed</span>
                      </div>
                      <div style={{ fontSize: 10, color: C.dim, marginLeft: 24, lineHeight: 1.7 }}>
                        {stripHtml(testResult.error || 'Unknown error')}
                      </div>
                      {(testResult.error || '').includes('502') && (
                        <div style={{ marginTop: 10, padding: '10px 14', background: 'rgba(232,184,75,0.08)', borderRadius: 7, border: '0.5px solid rgba(232,184,75,0.25)', fontSize: 10, color: C.dim, lineHeight: 1.7 }}>
                          <strong style={{ color: C.gold }}>Bridge not set up yet?</strong><br />
                          The test connection goes through the WiBill bridge (bridge.py + Cloudflare tunnel), which must be running on an always-on PC at your site.
                          You need to provision the bridge first (
                          <a href="/dashboard/network" style={{ color: C.gold }}>Network Settings</a>) and run the installer on your local PC.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <button onClick={() => setStep(4)} disabled={!canAdvanceToStep4}
                style={{ width: '100%', padding: 12, background: canAdvanceToStep4 ? C.gold : C.mute, border: 'none', borderRadius: 7, color: canAdvanceToStep4 ? '#000' : C.dim, fontSize: 12, fontWeight: 700, cursor: canAdvanceToStep4 ? 'pointer' : 'not-allowed', opacity: canAdvanceToStep4 ? 1 : 0.5 }}>
                Connection confirmed →
              </button>
            </Card>
          )}

          {/* Step 4 — Go Live */}
          {step === 4 && (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Step 4 of 4 — Go Live
              </div>

              {/* Pre-flight: package check */}
              {!hasActivePackage && (
                <div style={{
                  padding: 14, marginBottom: 20, borderRadius: 7,
                  background: 'rgba(232,184,75,0.08)', border: `0.5px solid rgba(232,184,75,0.25)`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <AlertTriangle size={14} color={C.gold} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.gold }}>No active packages</span>
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.6 }}>
                    You have no internet packages configured. Customers won't be able to purchase internet.
                    <br />
                    <a href="/dashboard/packages" style={{ color: C.gold, textDecoration: 'underline' }}>Add Packages →</a>
                  </div>
                </div>
              )}

              {!goLiveDone ? (
                <>
                  <div style={{ fontSize: 11, color: C.dim, marginBottom: 20, lineHeight: 1.6 }}>
                    Your hotspot is ready. Customers connecting to your WiFi will be redirected to your portal automatically.
                  </div>

                  <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                    <div style={{ padding: 14, background: C.surface, borderRadius: 7, border: `0.5px solid ${C.border}` }}>
                      <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Your Portal URL</div>
                      <div style={{ fontSize: 11, color: C.gold, fontFamily: 'DM Mono, monospace', wordBreak: 'break-all' }}>{portalUrl}</div>
                    </div>
                    <div style={{ padding: 14, background: C.surface, borderRadius: 7, border: `0.5px solid ${C.border}` }}>
                      <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>WiFi Network Name</div>
                      <div style={{ fontSize: 11, color: C.text, fontFamily: 'DM Mono, monospace' }}>WiBill Hotspot</div>
                    </div>
                  </div>

                  <div style={{
                    padding: 14, background: C.surface, borderRadius: 7, border: `0.5px solid ${C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                    flexDirection: 'column', gap: 8,
                  }}>
                    <Wifi size={24} color={C.gold} />
                    <div style={{ fontSize: 10, color: C.dim, textAlign: 'center' }}>
                      Customers scan this QR code to connect
                    </div>
                    <div style={{
                      width: 120, height: 120, background: '#fff', borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, color: '#999', fontFamily: 'DM Mono, monospace', textAlign: 'center',
                      padding: 8, boxSizing: 'border-box',
                    }}>
                      QR placeholder<br />({window.location.hostname})
                    </div>
                  </div>

                  {hasActivePackage && (
                    <div style={{
                      padding: 12, marginBottom: 20, borderRadius: 7,
                      background: 'rgba(34,197,94,0.08)', border: `0.5px solid rgba(34,197,94,0.2)`,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <CheckCircle size={14} color={C.green} />
                      <span style={{ fontSize: 10, color: C.green }}>
                        {packages.filter(p => p.is_active).length} active package(s) configured
                      </span>
                    </div>
                  )}

                  <button onClick={handleGoLive}
                    style={{ width: '100%', padding: 12, background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <CheckCircle size={16} /> Go Live
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>Setup Complete!</div>
                  <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
                    Your MikroTik hotspot is configured and connected to WiBill. Customers can now connect to your WiFi,
                    see the branded portal, and purchase internet packages via M-Pesa.
                  </div>
                  <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 8 }}>
                    <a href="/dashboard" style={{ padding: '10px 18px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                      Go to Dashboard
                    </a>
                    <a href="/dashboard/portal" style={{ padding: '10px 18px', background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                      Customize Portal
                    </a>
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
