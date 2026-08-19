'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { api, formatRelativeTime } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/context/ToastContext'
import { CheckCircle, XCircle, Activity, Clock, Copy, Terminal, AlertTriangle, RefreshCw, Shield, Settings, Router, Globe, Zap, ArrowRight, ExternalLink, Plus } from 'lucide-react'

const C = {
  void: 'var(--theme-bg)', base: 'var(--theme-card-base)', surface: 'var(--theme-surface)',
  border: 'var(--theme-border)', border2: 'var(--theme-border2)',
  text: 'var(--theme-text)', dim: 'var(--theme-dim)', mute: 'var(--theme-mute)', faint: 'var(--theme-faint)',
  gold: 'var(--theme-gold)', green: 'var(--theme-green)', red: 'var(--theme-red)',
}

const PILL = (color: string) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '3px 10px', borderRadius: 99,
  background: `color-mix(in srgb, ${color} 10%, transparent)`,
  border: `0.5px solid color-mix(in srgb, ${color} 30%, transparent)`,
  fontFamily: 'DM Mono, monospace', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const,
  letterSpacing: '0.08em', color,
})

const Card = ({ children, style }: any) => (
  <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 20, ...style }}>{children}</div>
)

const sectionLabel = {
  fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase' as const,
  letterSpacing: '0.08em', fontFamily: 'Inter, sans-serif', marginBottom: 10,
}

function StepTracker({ steps, currentStep, isComplete }: {
  steps: { id: number; label: string; icon: any }[]
  currentStep: number
  isComplete: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 24, alignItems: 'stretch' }}>
      {steps.map((s, i) => {
        const isActive = currentStep === s.id
        const isDone = currentStep > s.id || (currentStep === s.id && isComplete)
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
              {isDone ? <CheckCircle size={14} /> : isActive && !isComplete ? <RefreshCw size={14} style={{ animation: 'spin 1.2s linear infinite' }} /> : <s.icon size={14} />}
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: isActive || isDone ? C.gold : C.dim, marginTop: 6, textAlign: 'center' }}>
              {s.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TimeAgo({ iso }: { iso?: string | null }) {
  if (!iso) return <span style={{ color: C.dim, fontFamily: 'DM Mono, monospace' }}>never</span>
  return <span style={{ color: C.dim, fontFamily: 'DM Mono, monospace' }}>{formatRelativeTime(iso)}</span>
}

function friendlyError(raw: string): string {
  if (!raw) return 'Unknown error'
  if (raw.includes('expected end of command')) return 'RouterOS rejected the script — re-paste the command, ensuring both lines are pasted (fetch + import)'
  if (raw.includes('expected end of symbol')) return 'Router rejected the script — copy the command, do not type it by hand'
  if (raw.includes('405')) return 'Command not supported by this router — check the RouterOS version and pick the right one'
  if (raw.includes('No MikroTik config')) return 'No router configured — run the setup wizard first'
  if (raw.includes('timeout')) return 'Connection timed out — your router may be offline'
  if (raw.includes('Unauthorized') || raw.includes('401')) return 'Your session expired — refresh and try again'
  return raw
}

// MikroTik board_name → product catalog with CDN images
// CDN pattern: https://cdn.mikrotik.com/web-assets/rb_images/{id}_tm.webp
const ROUTER_CATALOG: Record<string, { name: string; image: string; url: string }> = {
  // hAP wireless routers
  'hAP ac^2': { name: 'hAP ac²', image: 'https://cdn.mikrotik.com/web-assets/rb_images/1468_tm.webp', url: 'https://mikrotik.com/products/hap_ac2' },
  'hAP ac²': { name: 'hAP ac²', image: 'https://cdn.mikrotik.com/web-assets/rb_images/1468_tm.webp', url: 'https://mikrotik.com/products/hap_ac2' },
  'hAP ac³': { name: 'hAP ac³', image: 'https://cdn.mikrotik.com/web-assets/rb_images/1975_tm.webp', url: 'https://mikrotik.com/products/hap_ac3' },
  'hAP ax^3': { name: 'hAP ax³', image: 'https://cdn.mikrotik.com/web-assets/rb_images/2211_tm.webp', url: 'https://mikrotik.com/products/hap_ax3' },
  'hAP ax^2': { name: 'hAP ax²', image: 'https://cdn.mikrotik.com/web-assets/rb_images/2203_tm.webp', url: 'https://mikrotik.com/products/hap_ax2' },
  'hAP ax lite': { name: 'hAP ax lite', image: 'https://cdn.mikrotik.com/web-assets/rb_images/2225_tm.webp', url: 'https://mikrotik.com/products/hap_ax_lite' },
  'hAP ac lite': { name: 'hAP ac lite', image: 'https://cdn.mikrotik.com/web-assets/rb_images/1413_tm.webp', url: 'https://mikrotik.com/products/hap_ac_lite' },
  'hAP ac lite TC': { name: 'hAP ac lite TC', image: 'https://cdn.mikrotik.com/web-assets/rb_images/1230_tm.webp', url: 'https://mikrotik.com/products/hap_ac_lite_tc' },
  'hAP ac': { name: 'hAP ac', image: 'https://cdn.mikrotik.com/web-assets/rb_images/1169_tm.webp', url: 'https://mikrotik.com/products/hap_ac' },
  'hAP lite': { name: 'hAP lite', image: 'https://cdn.mikrotik.com/web-assets/rb_images/1007_tm.webp', url: 'https://mikrotik.com/products/hap_lite' },
  'hAP lite TC': { name: 'hAP lite TC', image: 'https://cdn.mikrotik.com/web-assets/rb_images/1766_tm.webp', url: 'https://mikrotik.com/products/hap_lite_tc' },
  'hAP mini': { name: 'hAP mini', image: 'https://cdn.mikrotik.com/web-assets/rb_images/1007_tm.webp', url: 'https://mikrotik.com/products/hap_lite' },
  'hAP': { name: 'hAP', image: 'https://cdn.mikrotik.com/web-assets/rb_images/1059_tm.webp', url: 'https://mikrotik.com/products/hap' },
  // hEX wired routers
  'hEX S': { name: 'hEX S', image: 'https://cdn.mikrotik.com/web-assets/rb_images/1539_tm.webp', url: 'https://mikrotik.com/products/hex_s' },
  'hEX refresh': { name: 'hEX refresh', image: 'https://cdn.mikrotik.com/web-assets/rb_images/2408_tm.webp', url: 'https://mikrotik.com/products/hex_2024' },
  'hEX': { name: 'hEX', image: 'https://cdn.mikrotik.com/web-assets/rb_images/1405_tm.webp', url: 'https://mikrotik.com/products/hex' },
  'hEX lite': { name: 'hEX lite', image: 'https://cdn.mikrotik.com/web-assets/rb_images/1040_tm.webp', url: 'https://mikrotik.com/products/hex_lite' },
  'hEX PoE': { name: 'hEX PoE', image: 'https://cdn.mikrotik.com/web-assets/rb_images/1219_tm.webp', url: 'https://mikrotik.com/products/hex_poe' },
  'hEX PoE lite': { name: 'hEX PoE lite', image: 'https://cdn.mikrotik.com/web-assets/rb_images/1412_tm.webp', url: 'https://mikrotik.com/products/hex_poe_lite' },
  // L009 series
  'L009UiGS-RM': { name: 'L009UiGS-RM', image: 'https://cdn.mikrotik.com/web-assets/rb_images/2267_tm.webp', url: 'https://mikrotik.com/products/l009uigs_rm' },
  'L009UiGS-2HaxD-IN': { name: 'L009UiGS-2HaxD-IN', image: 'https://cdn.mikrotik.com/web-assets/rb_images/2263_tm.webp', url: 'https://mikrotik.com/products/l009uigs_2haxd_in' },
  // RB series
  'RB951Ui-2HnD': { name: 'RB951Ui-2HnD', image: 'https://cdn.mikrotik.com/web-assets/rb_images/902_tm.webp', url: 'https://mikrotik.com/products/rb951ui_2hnd' },
  'RB4011iGS+RM': { name: 'RB4011iGS+RM', image: 'https://cdn.mikrotik.com/web-assets/rb_images/1633_tm.webp', url: 'https://mikrotik.com/products/rb4011igs_rm' },
  'RB4011iGS+5HacQ2HnD-IN': { name: 'RB4011iGS+5HacQ2HnD-IN', image: 'https://cdn.mikrotik.com/web-assets/rb_images/1630_tm.webp', url: 'https://mikrotik.com/products/rb4011igs_5hacq2hnd_in' },
  'RB5009UGS+IN': { name: 'RB5009UGS+IN', image: 'https://cdn.mikrotik.com/web-assets/rb_images/2065_tm.webp', url: 'https://mikrotik.com/products/rb5009ugs_in' },
  'RB5009UPr+S+IN': { name: 'RB5009UPr+S+IN', image: 'https://cdn.mikrotik.com/web-assets/rb_images/2190_tm.webp', url: 'https://mikrotik.com/products/rb5009upr_s_in' },
  'RB5009UPr+S+OUT': { name: 'RB5009UPr+S+OUT', image: 'https://cdn.mikrotik.com/web-assets/rb_images/2250_tm.webp', url: 'https://mikrotik.com/products/rb5009upr_s_out' },
  'CCR2004-16G-2S+': { name: 'CCR2004-16G-2S+', image: 'https://cdn.mikrotik.com/web-assets/rb_images/2563_tm.webp', url: 'https://mikrotik.com/products/ccr2004_16g_2splus' },
  'CCR2004-1G-12S+2XS': { name: 'CCR2004-1G-12S+2XS', image: 'https://cdn.mikrotik.com/web-assets/rb_images/1935_tm.webp', url: 'https://mikrotik.com/products/ccr2004_1g_12s_2xs' },
  // Chateau
  'Chateau': { name: 'Chateau', image: 'https://cdn.mikrotik.com/web-assets/rb_images/2187_tm.webp', url: 'https://mikrotik.com/products/chateau' },
  'Chateau5G ax': { name: 'Chateau 5G ax', image: 'https://cdn.mikrotik.com/web-assets/rb_images/2205_tm.webp', url: 'https://mikrotik.com/products/chateau_5g_ax' },
  // Audience / cAP / wAP
  'Audience': { name: 'Audience', image: 'https://cdn.mikrotik.com/web-assets/rb_images/2247_tm.webp', url: 'https://mikrotik.com/products/audience' },
  'cAP ac': { name: 'cAP ac', image: 'https://cdn.mikrotik.com/web-assets/rb_images/1447_tm.webp', url: 'https://mikrotik.com/products/cap_ac' },
  'cAP XL ac': { name: 'cAP XL ac', image: 'https://cdn.mikrotik.com/web-assets/rb_images/2099_tm.webp', url: 'https://mikrotik.com/products/cap_xl_ac' },
  'wAP ac': { name: 'wAP ac', image: 'https://cdn.mikrotik.com/web-assets/rb_images/2410_tm.webp', url: 'https://mikrotik.com/products/wap_ac' },
}

function lookupRouter(boardName: string | null | undefined) {
  if (!boardName || boardName === '—' || boardName === 'unknown') return null
  if (ROUTER_CATALOG[boardName]) return ROUTER_CATALOG[boardName]
  const normalized = boardName.toLowerCase().replace(/[^a-z0-9]/g, '')
  for (const [key, value] of Object.entries(ROUTER_CATALOG)) {
    const keyNorm = key.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (normalized.includes(keyNorm) || keyNorm.includes(normalized)) return value
  }
  return null
}

// ============================================================================
// PAGE — two top-level states: onboarding OR router management
// ============================================================================

export default function MikrotikPage() {
  const { token } = useAuth()

  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState<any>(null)
  const [onboard, setOnboard] = useState<any>(null)
  const [actions, setActions] = useState<any[]>([])

  // mode === 'onboarding' once "Add router" / "Re-run setup" is clicked;
  // otherwise the page state machine picks manage (router exists) or the
  // empty state (zero routers).
  const [modeOverride, setModeOverride] = useState<'onboarding' | 'manage' | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [startManual, setStartManual] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!token) return
    const [h, st, ac] = await Promise.all([
      api.getMikrotikHealth().catch(() => null),
      api.getOnboardStatus().catch(() => null),
      api.getMikrotikActions().catch(() => null),
    ])
    setHealth(h)
    setOnboard(st)
    if (ac?.actions) setActions(ac.actions)
    setLoading(false)
  }, [token])

  useEffect(() => { fetchAll() }, [fetchAll, refreshTick])
  useEffect(() => { const t = setInterval(() => setRefreshTick(x => x + 1), 30000); return () => clearInterval(t) }, [])
  useEffect(() => {
    if (!loading && modeOverride === null) {
      const hasRouter = health?.configured === true || !!health?.last_poll_at || onboard?.status === 'used'
      if (hasRouter) setModeOverride('manage')
    }
  }, [health, onboard, loading, modeOverride])

  const handleAddRouter = () => {
    setStartManual(false)
    setModeOverride('onboarding')
    try { fetchAll() } catch { /* noop */ }
  }

  const handleRerunSetup = () => {
    setStartManual(true)
    setModeOverride('onboarding')
    try { fetchAll() } catch { /* noop */ }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Topbar title="MikroTik" />
        <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', background: C.void, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSpinner size="md" color="var(--theme-gold)" label="Loading..." />
        </div>
      </div>
    )
  }

  const hasRouter = health?.configured === true || !!health?.last_poll_at || onboard?.status === 'used'
  const showOnboarding = modeOverride === 'onboarding'
  const showManage = modeOverride === 'manage' || (modeOverride === null && hasRouter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title={showOnboarding ? 'MikroTik Setup' : 'MikroTik'} />
      <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', background: C.void }}>
        <div style={{ maxWidth: 900, width: '100%', margin: '0 auto' }}>
          {showOnboarding ? (
            <OnboardingView
              onboard={onboard}
              onConfigured={() => { setModeOverride('manage'); setStartManual(false) }}
              onRefresh={() => setRefreshTick(x => x + 1)}
              startManual={startManual}
            />
          ) : showManage ? (
            <RouterManagementView
              health={health}
              onboard={onboard}
              actions={actions}
              onReconfigure={handleRerunSetup}
              onAddRouter={handleAddRouter}
            />
          ) : (
            <EmptyState onAddRouter={handleAddRouter} />
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// EMPTY STATE — zero routers configured
// ============================================================================

function EmptyState({ onAddRouter }: { onAddRouter: () => void }) {
  return (
    <Card style={{ padding: '56px 24px', textAlign: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'color-mix(in srgb, var(--theme-gold) 8%, transparent)', border: '0.5px solid color-mix(in srgb, var(--theme-gold) 22%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Router size={22} color={C.gold} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: '"Space Grotesk", sans-serif', marginBottom: 8 }}>
        Connect your first router
      </div>
      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.7, maxWidth: 360, margin: '0 auto 24px' }}>
        Link your MikroTik router to activate WiFi billing — packages, sessions, and M-Pesa payments all run through it.
      </div>
      <button onClick={onAddRouter} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 22px', borderRadius: 7, background: C.gold, border: 'none', color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
        Add router
      </button>
    </Card>
  )
}

// ============================================================================
// ONBOARDING VIEW — Quick Connect is the default self-serve path. Manual
// setup is a fallback for restrictive networks or partial configs.
// ============================================================================

const QUICK_STEPS = [
  { id: 1, label: 'Generate', icon: Terminal },
  { id: 2, label: 'Running', icon: Activity },
  { id: 3, label: 'Registered', icon: Router },
  { id: 4, label: 'Configured', icon: Zap },
]

function OnboardingView({ onboard, onConfigured, onRefresh, startManual }: {
  onboard: any
  onConfigured: () => void
  onRefresh: () => void
  startManual?: boolean
}) {
  const [showManual, setShowManual] = useState(!!startManual)

  if (showManual) {
    return <ManualSetup onDone={onConfigured} onBackToQuick={() => setShowManual(false)} />
  }

  return (
    <>
      <QuickConnectFlow onboard={onboard} onConfigured={onConfigured} onRefresh={onRefresh} onSwitchManual={() => setShowManual(true)} />
      <Card style={{ marginTop: 12, padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.6 }}>
            Prefer to do this manually, or hit a snag?
          </div>
          <button onClick={() => setShowManual(true)}
            style={{ padding: '7px 12px', borderRadius: 7, background: 'var(--theme-surface)', border: `0.5px solid ${C.border}`, color: C.dim, fontSize: 10, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
            Switch to manual setup
          </button>
        </div>
      </Card>
    </>
  )
}

// ============================================================================
// QUICK CONNECT — 4-step tracker with real polling + timeout
// ============================================================================

function QuickConnectFlow({ onboard, onConfigured, onRefresh, onSwitchManual }: {
  onboard: any
  onConfigured: () => void
  onRefresh: () => void
  onSwitchManual: () => void
}) {
  const { showToast } = useToast()

  const [rosVersion, setRosVersion] = useState<string>('6')
  const [generating, setGenerating] = useState(false)
  const [onboardData, setOnboardData] = useState<any>(null)
  const [onboardStatus, setOnboardStatus] = useState<any>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [registeredAt, setRegisteredAt] = useState<number | null>(null)
  const [forceConfigured, setForceConfigured] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [copied, setCopied] = useState(false)
  const [nowMs, setNowMs] = useState(Date.now())
  const [showConflict, setShowConflict] = useState(false)
  const [conflictData, setConflictData] = useState<any>(null)
  const [restoredNoCommand, setRestoredNoCommand] = useState(false)

  const TIMEOUT_MS = 5 * 60 * 1000
  const REGISTER_TIMEOUT_MS = 2 * 60 * 1000

  // Real polling of GET /api/onboard/status — every 4s. Keeps running past
  // REGISTERED so CONFIGURED is triggered by the router's first real poll
  // (first_poll_at), not merely by registration succeeding.
  useEffect(() => {
    if (!onboardData) return
    let cancelled = false
    const poll = async () => {
      try {
        const st = await api.getOnboardStatus()
        if (cancelled) return
        setOnboardStatus(st)
        if (st.status === 'used') {
          if (registeredAt === null) setRegisteredAt(Date.now())
          if (st.registration_data?.existing_hotspot) {
            setConflictData(st.registration_data)
            setShowConflict(true)
          }
          // Auto-advance the moment the poll scheduler has genuinely run.
          if (st.first_poll_at) setForceConfigured(true)
        }
      } catch { /* transient: keep polling */ }
    }
    poll()
    const id = setInterval(poll, 4000)
    return () => { cancelled = true; clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardData?.token])

  // Countdown clock + timeout check (pending phase).
  useEffect(() => {
    if (!onboardData) return
    const id = setInterval(() => {
      const now = Date.now()
      setNowMs(now)
      if (startedAt && now - startedAt > TIMEOUT_MS && onboardStatus?.status !== 'used') {
        setTimedOut(true)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [onboardData, onboardStatus?.status, startedAt])

  // Sync from the page-level onboard snapshot if it already exists (page reload mid-onboarding).
  useEffect(() => {
    if (!onboardData && onboard && onboard.status === 'pending' && onboard.token) {
      setOnboardData({ token: onboard.token, command: '', expires_at: onboard.expires_at, ros_version: onboard.ros_version })
      setOnboardStatus(onboard)
      setStartedAt(Date.now())
      // Reloaded mid-onboarding: the raw command isn't persisted on the server,
      // so indicate it must be regenerated rather than showing an empty box.
      setRestoredNoCommand(true)
    }
  }, [onboard])

  const configured = (forceConfigured || !!onboardStatus?.first_poll_at) && !showConflict

  // Once truly configured (first poll observed, or forced), hand off.
  useEffect(() => {
    if (configured) {
      const t = setTimeout(() => onConfigured(), 2500)
      return () => clearTimeout(t)
    }
  }, [configured, onConfigured])

  const handleGenerate = async () => {
    setGenerating(true)
    setTimedOut(false)
    setNowMs(Date.now())
    try {
      const res = await api.generateOnboardToken(rosVersion)
      setOnboardData(res)
      setOnboardStatus({ status: 'pending', token: res.token })
      setStartedAt(Date.now())
      onRefresh()
    } catch (e: any) {
      showToast(friendlyError(e?.message || 'Failed to generate token'), { type: 'error' })
    } finally { setGenerating(false) }
  }

  const handleCopy = () => {
    if (!onboardData?.command) return
    navigator.clipboard.writeText(onboardData.command)
    setCopied(true)
    showToast('Copied — paste into your router terminal', { type: 'success' })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleResolveConflict = async (overwrite: boolean) => {
    try {
      await api.resolveOnboardConflict(onboardData.token, overwrite)
      setShowConflict(false)
      setConflictData(null)
      showToast(overwrite ? 'Overwriting existing hotspot config' : 'Keeping existing hotspot config', { type: 'success' })
    } catch (e: any) {
      showToast(e?.message || 'Failed to resolve conflict', { type: 'error' })
    }
  }

  const handleReset = () => {
    setOnboardData(null)
    setOnboardStatus(null)
    setStartedAt(null)
    setRegisteredAt(null)
    setForceConfigured(false)
    setTimedOut(false)
    setCopied(false)
    setShowConflict(false)
    setConflictData(null)
    setRestoredNoCommand(false)
  }

  const reg = onboardStatus?.registration_data
  const currentStep = (() => {
    if (!onboardData) return 1
    if (onboardStatus?.status === 'used') return configured ? 4 : 3
    return 2
  })()
  const isComplete = configured

  // "Continue anyway" escape hatch: if the router registered but no first poll
  // arrived within REGISTER_TIMEOUT_MS, let the ISP proceed instead of waiting
  // forever on REGISTERED (mirrors the RUNNING-phase timeout).
  const registerStuck = !!registeredAt && onboardStatus?.status === 'used' && !configured && nowMs - registeredAt > REGISTER_TIMEOUT_MS

  const expiresAt = onboardData?.expires_at ? new Date(onboardData.expires_at).getTime() : null
  const msLeft = expiresAt ? expiresAt - nowMs : null
  const minsLeft = msLeft !== null ? Math.floor(msLeft / 60000) : null
  const urgent = minsLeft !== null && minsLeft <= 5

  return (
    <>
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Quick Connect
        </div>
        <div style={{ fontSize: 11, color: C.dim, marginBottom: 20, lineHeight: 1.6 }}>
          Generate a one-line command, paste it into your router's terminal — Winbox, SSH, or Webfig all work.
          No app install required. Your router registers itself and starts polling WiBill every 30 seconds.
        </div>

        <StepTracker steps={QUICK_STEPS} currentStep={currentStep} isComplete={isComplete} />

        {timedOut ? (
          <div>
            <div style={{ padding: 16, marginBottom: 16, borderRadius: 7, background: 'rgba(239,68,68,0.06)', border: `0.5px solid rgba(239,68,68,0.25)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <XCircle size={16} color={C.red} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.red }}>No response from your router yet</span>
              </div>
              <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.7 }}>
                After about 5 minutes a router that fetched the script should have registered. The token may have
                expired, or the router never fetched it. Generate a fresh command and try again — or use manual setup
                if the router is on a restrictive network.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleGenerate} disabled={generating}
                style={{ flex: 1, padding: 12, background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: generating ? 0.6 : 1 }}>
                {generating ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Terminal size={14} />}
                Try Again
              </button>
              <button onClick={onSwitchManual}
                style={{ padding: '12px 16px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.dim, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                Switch to manual setup
              </button>
            </div>
          </div>
        ) : !onboardData ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 8 }}>RouterOS Version</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['6', '7'].map(v => (
                  <button key={v} onClick={() => setRosVersion(v)} style={{
                    flex: 1, padding: '10px 16px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    background: rosVersion === v ? C.gold : 'transparent',
                    color: rosVersion === v ? '#000' : C.dim,
                    border: `1px solid ${rosVersion === v ? C.gold : C.border}`,
                  }}>
                    RouterOS {v}.x
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 9, color: C.mute, marginTop: 4 }}>
                Check: Winbox → System → Resources → Version (first digit)
              </div>
            </div>

            <button onClick={handleGenerate} disabled={generating}
              style={{ width: '100%', padding: 12, background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: generating ? 0.6 : 1 }}>
              {generating ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Terminal size={14} />}
              {generating ? 'Generating...' : 'Generate Command'}
            </button>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <span style={{ fontSize: 10, color: C.dim }}>
                Prefer to do this manually, or hit a snag?{' '}
                <a onClick={onSwitchManual} style={{ color: C.gold, cursor: 'pointer', textDecoration: 'underline' }}>Switch to manual setup</a>
              </span>
            </div>
          </>
        ) : (
          <>
            {/* Paste instructions */}
            <div style={{ padding: 14, marginBottom: 12, background: 'color-mix(in srgb, var(--theme-gold) 8%, transparent)', border: `0.5px solid color-mix(in srgb, var(--theme-gold) 25%, transparent)`, borderRadius: 7 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 6 }}>Paste this into your router terminal:</div>
              <ol style={{ fontSize: 10, color: C.dim, lineHeight: 2, margin: 0, paddingLeft: 18 }}>
                <li>Open <strong>Winbox</strong> or <strong>SSH</strong> into your router</li>
                <li>Go to <strong>New Terminal</strong></li>
                <li>Paste both lines of the command below and press Enter (first line fetches, second imports)</li>
                <li>Wait a few seconds for registration</li>
              </ol>
            </div>

            {restoredNoCommand ? (
              <div style={{ padding: 16, marginBottom: 16, borderRadius: 7, background: 'color-mix(in srgb, var(--theme-gold) 8%, transparent)', border: `0.5px solid color-mix(in srgb, var(--theme-gold) 25%, transparent)` }}>
                <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.7, marginBottom: 12 }}>
                  You reloaded mid-onboarding, so the exact command from before is no longer available. Generate a
                  fresh one and paste it into your router terminal — or keep waiting if you already ran the old one.
                </div>
                <button onClick={handleReset}
                  style={{ width: '100%', padding: 12, background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Terminal size={14} /> Generate a New Command
                </button>
              </div>
            ) : (
              <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button onClick={handleCopy}
                  style={{ padding: '8px 16px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: copied ? C.green : C.text, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Copy size={13} /> {copied ? 'Copied!' : 'Copy Command'}
                </button>
                <button onClick={handleReset}
                  style={{ padding: '8px 16px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.dim, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  Reset
                </button>
              </div>

              <pre style={{
                background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, padding: 16,
                fontSize: 9, fontFamily: 'DM Mono, monospace', color: C.dim, lineHeight: 1.5,
                overflowX: 'auto', whiteSpace: 'pre', marginBottom: 16,
              }}>{onboardData.command}</pre>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: C.dim }}>
                  This command works on RouterOS {rosVersion}.x.
                </span>
                {msLeft !== null && msLeft > 0 ? (
                  <span style={{ ...PILL(urgent ? C.red : C.gold), ...(urgent ? {} : {}) }}>
                    <Clock size={9} /> Expires in {minsLeft}m
                  </span>
                ) : (
                  <span style={PILL(C.red)}><Clock size={9} /> Expired — generate a new one</span>
                )}
              </div>
              </>
            )}

            {currentStep === 2 && !timedOut && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 7, background: 'color-mix(in srgb, var(--theme-gold) 8%, transparent)', border: `0.5px solid color-mix(in srgb, var(--theme-gold) 25%, transparent)`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={13} color={C.gold} style={{ animation: 'spin 1.2s linear infinite' }} />
                <span style={{ fontSize: 11, color: C.gold }}>Waiting for router to register...</span>
              </div>
            )}

            {currentStep === 3 && (
              <>
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 7, background: 'rgba(34,197,94,0.08)', border: `0.5px solid rgba(34,197,94,0.2)`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={13} color={C.green} />
                  <span style={{ fontSize: 11, color: C.green }}>
                    Router identified — {reg?.board || 'MikroTik'} · RouterOS {reg?.ros_version || '?'}
                  </span>
                  <span style={{ fontSize: 9, color: C.dim, marginLeft: 'auto' }}>Finishing setup...</span>
                </div>

                {registerStuck && (
                  <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 7, background: 'color-mix(in srgb, var(--theme-gold) 8%, transparent)', border: `0.5px solid color-mix(in srgb, var(--theme-gold) 25%, transparent)` }}>
                    <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.6 }}>
                      Connected, but we couldn&apos;t confirm live status yet — check back in a minute.
                    </div>
                  </div>
                )}
              </>
            )}

            {isComplete && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 7, background: 'rgba(34,197,94,0.08)', border: `0.5px solid rgba(34,197,94,0.2)`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={13} color={C.green} />
                <span style={{ fontSize: 11, color: C.green }}>
                  Configured — {conflictData?.board || reg?.board || 'router'} · RouterOS {conflictData?.ros_version || reg?.ros_version || '?'} connected
                </span>
              </div>
            )}
          </>
        )}
      </Card>

      {showConflict && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 24, maxWidth: 420, width: '90%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <AlertTriangle size={18} color={C.gold} />
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Existing Hotspot Found</div>
            </div>
            <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.7, marginBottom: 20 }}>
              This router already has a hotspot configuration. Registering it keeps working — but its current portal will
              be replaced when you push the WiBill portal page. What would you like to do?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => handleResolveConflict(true)}
                style={{ flex: 1, padding: 10, background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Register Router
              </button>
              <button onClick={() => handleResolveConflict(false)}
                style={{ flex: 1, padding: 10, background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.dim, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Keep Existing
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

// ============================================================================
// MANUAL SETUP — 3 steps (Setup → Portal → Launch). Bridge step retired.
// ============================================================================

const MANUAL_STEPS = [
  { id: 1, label: 'Setup', icon: Settings },
  { id: 2, label: 'Portal', icon: Globe },
  { id: 3, label: 'Launch', icon: Zap },
]

function ManualSetup({ onDone, onBackToQuick }: { onDone: () => void; onBackToQuick: () => void }) {
  const { showToast } = useToast()

  const [step, setStep] = useState(1)

  // Step 1 — Setup
  const [ssid, setSsid] = useState('WiFi')
  const [networkOctet, setNetworkOctet] = useState('4')
  const [wifiInterface, setWifiInterface] = useState('wlan1')
  const [setupScript, setSetupScript] = useState<string | null>(null)
  const [setupLoading, setSetupLoading] = useState(false)

  // Step 2 — Portal (RouterAction enqueued, poll status)
  const [portalAction, setPortalAction] = useState<any>(null)
  const [portalStatus, setPortalStatus] = useState<string | null>(null)
  const [portalUploading, setPortalUploading] = useState(false)

  // Step 3 — Launch
  const [preflight, setPreflight] = useState<any>(null)
  const [preflightLoading, setPreflightLoading] = useState(false)
  const [goLiveDone, setGoLiveDone] = useState(false)

  const handleGenerateSetup = async () => {
    setSetupLoading(true)
    try {
      const script = await api.generateMikrotikScript({
        ssid: ssid.trim() || 'WiFi',
        network_octet: parseInt(networkOctet) || 4,
        wifi_interface: wifiInterface.trim() || 'wlan1',
      })
      setSetupScript(script)
    } catch (e: any) {
      showToast(friendlyError(e?.message || 'Failed to generate setup script'), { type: 'error' })
    } finally { setSetupLoading(false) }
  }

  const handleCopySetup = () => {
    if (!setupScript) return
    navigator.clipboard.writeText(setupScript)
    showToast('Copied — paste in Winbox Terminal', { type: 'success' })
  }

  // Portal step: generate login.html → enqueue push_portal action → poll status.
  const handlePushPortal = async () => {
    setPortalUploading(true)
    setPortalAction({ status: 'pending' })
    setPortalStatus('pending')
    try {
      const html = await api.getMikrotikLoginHtml()
      const result = await api.uploadPortalFile(html)
      if (result?.ok) {
        setPortalAction(result)
        setPortalStatus(result.status || 'pending')
        showToast('Portal push queued — applies within ~30s', { type: 'success' })
      }
    } catch (e: any) {
      setPortalAction(null)
      setPortalStatus(null)
      showToast(friendlyError(e.message || 'Failed to push portal file'), { type: 'error' })
    } finally { setPortalUploading(false) }
  }

  // Poll the enqueued action until acked.
  useEffect(() => {
    if (!portalAction?.action_id) return
    let cancelled = false
    const poll = async () => {
      try {
        const fs = await api.getMikrotikFileStatus()
        if (cancelled) return
        setPortalStatus(fs.status)
        if (fs.status === 'acked') showToast('Portal page is live on the router', { type: 'success' })
      } catch { /* keep polling */ }
    }
    poll()
    const id = setInterval(poll, 3000)
    return () => { cancelled = true; clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portalAction?.action_id])

  // Step 3 — Launch
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
      setTimeout(onDone, 2000)
    } catch (e: any) {
      showToast(friendlyError(e.message || 'Failed to go live'), { type: 'error' })
    }
  }

  const portalPendingSeconds = (() => {
    if (!portalAction?.status && !portalStatus) return null
    if (portalStatus === 'acked') return null
    return 45
  })()

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <button onClick={onBackToQuick} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: C.dim, fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
          <ArrowRight size={12} style={{ transform: 'rotate(180deg)' }} /> Back to Quick Connect
        </button>
      </div>

      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Manual Setup
        </div>
        <div style={{ fontSize: 11, color: C.dim, marginBottom: 20, lineHeight: 1.6 }}>
          Configure your router step by step. Use this path when auto-onboarding fails, or the router already has
          partial hotspot config you want to keep.
        </div>

        <StepTracker steps={MANUAL_STEPS} currentStep={step} isComplete={step > 3 && false} />

        {/* ══ STEP 1: SETUP ══ */}
        {step === 1 && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>WiFi Network Name (SSID)</label>
              <input value={ssid} onChange={e => setSsid(e.target.value)} placeholder="My ISP WiFi"
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

            {setupLoading && <LoadingSpinner size="sm" color="var(--theme-gold)" label="Generating script..." />}

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

                {/* Code block header with copy button */}
                <div style={{ border: `0.5px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: C.surface, borderBottom: `0.5px solid ${C.border}` }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.mute }} />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.mute }} />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.mute }} />
                    <span style={{ fontSize: 9, color: C.dim, fontFamily: 'DM Mono, monospace', marginLeft: 8, flex: 1 }}>wibill-setup.rsc</span>
                    <button onClick={handleCopySetup} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 5, background: C.base, border: `0.5px solid ${C.border}`, color: C.text, fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>
                      <Copy size={10} /> Copy
                    </button>
                  </div>
                  <pre style={{
                    background: C.void, padding: 16, margin: 0,
                    fontSize: 9, fontFamily: 'DM Mono, monospace', color: C.dim, lineHeight: 1.6,
                    overflowX: 'auto', whiteSpace: 'pre', maxHeight: 280, overflowY: 'auto', borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
                  }}>{setupScript}</pre>
                </div>

                <button onClick={() => setStep(2)}
                  style={{ width: '100%', padding: 12, background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  Script pasted into Winbox — Continue <ArrowRight size={14} />
                </button>
              </>
            )}
          </>
        )}

        {/* ══ STEP 2: PORTAL ══ */}
        {step === 2 && (
          <>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 16, lineHeight: 1.6 }}>
              Push the <strong>login.html</strong> redirect file to your router. The router downloads it itself on its
              next 30-second check-in — no bridge needed.
            </div>

            {!portalAction?.action_id && !portalUploading && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handlePushPortal} style={{ flex: 1, padding: 12, background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {portalUploading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Globe size={14} />}
                  Push Portal Page
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
                  <Terminal size={13} /> Download login.html
                </button>
              </div>
            )}

            {portalUploading && <LoadingSpinner size="sm" color="var(--theme-gold)" label="Queueing your branded portal page..." />}

            {portalAction?.action_id && portalStatus !== 'acked' && (
              <div style={{ padding: 12, marginBottom: 12, borderRadius: 7, background: 'color-mix(in srgb, var(--theme-gold) 8%, transparent)', border: `0.5px solid color-mix(in srgb, var(--theme-gold) 25%, transparent)`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={13} color={C.gold} style={{ animation: 'spin 1.2s linear infinite' }} />
                <span style={{ fontSize: 11, color: C.gold }}>
                  {portalPendingSeconds != null && portalPendingSeconds > 0
                    ? 'This will apply the next time your router checks in (~30s intervals)'
                    : 'Queueing your branded portal page...'}
                </span>
              </div>
            )}

            {portalStatus === 'acked' && (
              <div style={{ padding: 12, marginBottom: 12, borderRadius: 7, background: 'rgba(34,197,94,0.08)', border: `0.5px solid rgba(34,197,94,0.2)`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={14} color={C.green} />
                <span style={{ fontSize: 11, color: C.green }}>Portal live — login.html applied to router</span>
              </div>
            )}

            <button onClick={() => setStep(3)} disabled={portalStatus !== 'acked'}
              style={{ width: '100%', padding: 12, background: portalStatus === 'acked' ? C.gold : C.mute, border: 'none', borderRadius: 7, color: portalStatus === 'acked' ? '#000' : C.dim, fontSize: 12, fontWeight: 700, cursor: portalStatus === 'acked' ? 'pointer' : 'not-allowed', opacity: portalStatus === 'acked' ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              Portal Pushed — Continue <ArrowRight size={14} />
            </button>
          </>
        )}

        {/* ══ STEP 3: LAUNCH ══ */}
        {step === 3 && (
          <>
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
                <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
                  Your MikroTik hotspot is live. Taking you to the router view...
                </div>
              </div>
            )}
          </>
        )}
      </Card>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

// ============================================================================
// ROUTER MANAGEMENT VIEW — list of router cards (one today, N tomorrow)
// ============================================================================

function displayClean(value: string | null | undefined): string {
  if (!value) return '—'
  if (/^\{+\[?\//.test(value)) return 'unknown'
  return value
}

// Plain-language activity entry for an action
function activityLabel(a: any): string {
  const status = a?.status
  switch (a?.action_type) {
    case 'push_portal':
      if (status === 'acked') return 'Portal pushed and confirmed'
      if (status === 'delivered') return 'Portal push delivered'
      return 'Portal push queued'
    case 'add_bypass': return status === 'acked' ? 'Bypass added' : 'Bypass add queued'
    case 'remove_bypass': return status === 'acked' ? 'Bypass removed' : 'Bypass remove queued'
    default: return (a?.action_type || 'action').replace(/_/g, ' ')
  }
}

function activityTone(a: any): 'done' | 'pending' {
  return a?.status === 'acked' ? 'done' : 'pending'
}

function RouterManagementView({ health, onboard, actions, onReconfigure, onAddRouter }: {
  health: any
  onboard: any
  actions: any[]
  onReconfigure: () => void
  onAddRouter: () => void
}) {
  const online = health?.connected === true
  const statusText = online ? 'Online' : health?.last_poll_at ? 'Offline' : 'Never Connected'
  const statusColor = online ? C.green : health?.last_poll_at ? C.red : C.gold

  const boardName = displayClean(health?.board_name || health?.router_identity)
  const rosVersion = displayClean(health?.router_os_version)
  const ssid = displayClean(health?.ssid)
  const routerIp = displayClean(health?.router_ip)

  const catalog = lookupRouter(health?.board_name || health?.router_identity)
  const [imgFailed, setImgFailed] = useState(false)

  const portalAction = [...actions].reverse().find((a: any) => a.action_type === 'push_portal')
  const portalState = !portalAction ? 'none' : portalAction.status

  const now = Date.now()
  const entries: { id: string; label: string; time: number; tone: 'done' | 'pending' | 'warn'; kind: string }[] = []
  if (onboard?.registration_data) {
    entries.push({ id: 'registered', label: 'Router registered', kind: 'registration', time: new Date(onboard.used_at || now).getTime(), tone: 'done' })
  }
  if (!online && health?.last_poll_at) {
    entries.push({ id: 'offline', label: 'Stopped checking in', kind: 'offline', time: new Date(health.last_poll_at).getTime(), tone: 'warn' })
  }
  for (const a of actions) {
    entries.push({ id: `a-${a.id}`, label: activityLabel(a), kind: a.action_type, time: new Date(a.acked_at || a.delivered_at || a.created_at).getTime(), tone: activityTone(a) })
  }
  entries.sort((x, y) => y.time - x.time)
  const timeline = entries.slice(0, 5)

  const setupItems = [
    { label: 'SSID', value: ssid !== '—' ? ssid : 'Not set', confirmed: ssid !== '—' },
    { label: 'Portal', value: portalState === 'acked' ? 'Live' : portalState === 'delivered' ? 'Pushing…' : portalState === 'pending' ? 'Queued' : 'Not pushed', confirmed: portalState === 'acked' },
    { label: 'Walled garden', value: health?.walled_garden === 'yes' ? 'Configured' : 'Not confirmed', confirmed: health?.walled_garden === 'yes' },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor, boxShadow: `0 0 10px ${statusColor}80`, flexShrink: 0, animation: online ? 'pulse 2s infinite' : 'none' }} />
          <span style={{ fontSize: 16, fontWeight: 700, fontFamily: '"Space Grotesk", sans-serif', color: statusColor }}>{statusText}</span>
          {health?.last_poll_at && (
            <span style={{ fontSize: 10, color: C.dim, fontFamily: 'DM Mono, monospace' }}>last seen <TimeAgo iso={health.last_poll_at} /></span>
          )}
        </div>
        <button onClick={onAddRouter} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7,
          background: 'color-mix(in srgb, var(--theme-gold) 8%, transparent)',
          border: '0.5px solid color-mix(in srgb, var(--theme-gold) 30%, transparent)',
          color: C.gold, fontSize: 10, fontWeight: 600, cursor: 'pointer',
        }}>
          <Plus size={12} /> Add router
        </button>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {/* Hero image area */}
        <div style={{
          height: 220, background: 'linear-gradient(180deg, #111 0%, #0d0d0d 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          borderBottom: `0.5px solid ${C.border}`,
        }}>
          {catalog && !imgFailed ? (
            <img
              src={catalog.image}
              alt={catalog.name}
              onError={() => setImgFailed(true)}
              style={{ maxHeight: 180, maxWidth: '80%', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none' }}
            />
          ) : (
            <Router size={64} color={C.dim} strokeWidth={1} />
          )}
          {/* Status pill overlay */}
          <div style={{
            position: 'absolute', top: 16, right: 16,
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            border: `0.5px solid ${statusColor}40`,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, boxShadow: `0 0 6px ${statusColor}80` }} />
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'DM Mono, monospace', color: statusColor }}>{statusText}</span>
          </div>
          {/* Settings + External link overlay */}
          <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 4 }}>
            <button onClick={onReconfigure} title="Re-run setup" style={{ ...ghostIcon, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
              <Settings size={13} color={C.dim} />
            </button>
            <a href="/dashboard/network" title="View on network" style={{ ...ghostIcon, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', textDecoration: 'none' }}>
              <ExternalLink size={13} color={C.dim} />
            </a>
          </div>
        </div>

        {/* Identity + specs row */}
        <div style={{ padding: '18px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: '"Space Grotesk", sans-serif' }}>
                  {boardName}
                </span>
                {catalog && (
                  <a href={catalog.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: C.dim, textDecoration: 'none', fontFamily: 'DM Mono, monospace', opacity: 0.6 }}>view on mikrotik.com ↗</a>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 10, color: C.dim, fontFamily: 'DM Mono, monospace' }}>
                <span>{routerIp}</span>
                <span style={{ color: C.border2 }}>·</span>
                <span>RouterOS {rosVersion}</span>
                <span style={{ color: C.border2 }}>·</span>
                <span>polls every 30s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Setup section */}
        <div style={{ padding: '0 20px 18px' }}>
          <div style={{ ...sectionLabel, marginBottom: 10 }}>Setup</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {setupItems.map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: C.void, borderRadius: 7, border: `0.5px solid ${C.border}`, flex: '1 1 160px', minWidth: 0 }}>
                {item.confirmed ? (
                  <CheckCircle size={14} color={C.green} style={{ flexShrink: 0 }} />
                ) : (
                  <span style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${C.border2}`, flexShrink: 0, display: 'inline-block' }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: item.confirmed ? C.text : C.dim, fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity timeline */}
        <div style={{ padding: '0 20px 20px', borderTop: `0.5px solid ${C.border}`, paddingTop: 18 }}>
          <div style={{ ...sectionLabel, marginBottom: 12 }}>Activity</div>
          {timeline.length > 0 ? (
            <div>
              {timeline.map((e, i) => {
                const dotColor = e.tone === 'warn' ? C.red : e.tone === 'done' ? (e.kind === 'registration' ? C.gold : C.green) : C.dim
                const isNewest = i === 0
                return (
                  <div key={e.id} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 12, flexShrink: 0 }}>
                      <span style={{
                        width: isNewest ? 9 : 7, height: isNewest ? 9 : 7, borderRadius: '50%', flexShrink: 0, marginTop: 3,
                        background: isNewest ? dotColor : 'transparent',
                        border: `1.5px solid ${dotColor}`,
                        boxShadow: isNewest ? `0 0 8px ${dotColor}60` : 'none',
                      }} />
                      {i < timeline.length - 1 && <span style={{ width: 1, flex: 1, background: C.border, marginTop: 4 }} />}
                    </div>
                    <div style={{ paddingBottom: i < timeline.length - 1 ? 14 : 0, minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 11, color: C.text }}>{e.label}</div>
                      <div style={{ fontSize: 9, color: C.faint, fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
                        <TimeAgo iso={new Date(e.time).toISOString()} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6 }}>
              No activity yet. Actions pushed to your router will show here.
            </div>
          )}
        </div>
      </Card>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.35 } }`}</style>
    </>
  )
}

const ghostIcon = {
  width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: 'none', cursor: 'pointer', color: C.dim,
}