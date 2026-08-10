'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { api, formatRelativeTime } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { RefreshCw, Router, Activity, Users, Zap, AlertTriangle, CheckCircle, X } from 'lucide-react'

const C = {
  void: 'var(--theme-bg)', base: 'var(--theme-card-base)', border: 'var(--theme-border)',
  text: 'var(--theme-text)', dim: 'var(--theme-dim)', mute: 'var(--theme-mute)', faint: 'var(--theme-faint)',
  gold: 'var(--theme-gold)', green: 'var(--theme-green)', red: 'var(--theme-red)',
}

interface OutageEvent {
  id: string; source: string; status: string; zone?: string
  description?: string; eta?: string; started_at: string; resolved_at?: string
  created_by_id?: string
}

export default function NetworkPage() {
  const { user, token } = useAuth()
  const [status, setStatus] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [mikrotik, setMikrotik] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [outages, setOutages] = useState<OutageEvent[]>([])
  const [showDeclareModal, setShowDeclareModal] = useState(false)
  const [declareForm, setDeclareForm] = useState({ zone: '', description: '', eta: '' })
  const [declaring, setDeclaring] = useState(false)
  const [etaDate, setEtaDate] = useState(() => {
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); return d
  })
  const [showCal, setShowCal] = useState(false)
  const [calMonth, setCalMonth] = useState(() => new Date())

  const fetchData = useCallback(async () => {
    if (!token || !user?.tenant_id) return
    setLoading(true)
    try {
      const [dash, evts, mik, outageData] = await Promise.all([
        api.getTenantDashboard().catch(() => null),
        api.getTenantNetworkEvents(user.tenant_id, 50).catch(() => []),
        api.getMikrotikConfig().catch(() => null),
        api.getOutages('active').catch(() => []),
      ])
      if (dash) setStatus(dash.network || dash)
      setEvents(Array.isArray(evts) ? evts : [])
      setMikrotik(mik)
      setOutages(Array.isArray(outageData) ? outageData : [])
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }, [token, user?.tenant_id])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const t = setInterval(fetchData, 30000); return () => clearInterval(t) }, [fetchData])

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.testMikrotikConnection()
      setTestResult(res.connected ? (res.router_identity || 'Connected') : (res.error || 'Connection failed'))
    } catch (e: any) {
      setTestResult(e.message || 'Connection failed')
    } finally {
      setTesting(false)
    }
  }

  const handleDeclareOutage = async () => {
    if (!declareForm.description.trim()) return
    setDeclaring(true)
    try {
      await api.createOutage({
        status: 'investigating',
        description: declareForm.description.trim(),
        zone: declareForm.zone.trim() || undefined,
        eta: etaDate.toISOString(),
      })
      setShowDeclareModal(false)
      setDeclareForm({ zone: '', description: '', eta: '' })
      fetchData()
    } catch (e: any) {
      alert(e.message || 'Failed to declare outage')
    } finally {
      setDeclaring(false)
    }
  }

  const handleResolveOutage = async (id: string) => {
    try {
      await api.resolveOutage(id)
      fetchData()
    } catch (e: any) {
      alert(e.message || 'Failed to resolve outage')
    }
  }

  const notMonitoring = !status && !loading
  const statusLabel = status?.status === 'UP' || status?.status === 'up'
    ? { text: 'Online', color: C.green, pulse: true }
    : status?.status === 'DEGRADED' || status?.status === 'degraded'
    ? { text: 'Degraded', color: C.gold, pulse: true }
    : status?.status === 'DOWN' || status?.status === 'down'
    ? { text: 'Offline', color: C.red, pulse: true }
    : status
    ? { text: 'Unknown', color: C.dim, pulse: false }
    : { text: 'Not Monitoring Yet', color: C.gold, pulse: false }

  const uptimePercent = events.length > 0
    ? Math.round((events.filter((e: any) => e.status === 'UP' || e.status === 'up').length / events.length) * 100)
    : null

  const lastChecked = status?.checked_at ? formatRelativeTime(status.checked_at) : '—'
  const routerIp = mikrotik?.router_ip || 'Not configured'
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const uptimeTimeline = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    const dayEvents = events.filter((e: any) => {
      const ed = new Date(e.checked_at || e.created_at)
      return ed.toDateString() === d.toDateString()
    })
    const upCount = dayEvents.filter((e: any) => e.status === 'UP' || e.status === 'up').length
    const ratio = dayEvents.length > 0 ? upCount / dayEvents.length : 0.95
    return {
      date: d,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      dayName: dayLabels[d.getDay() === 0 ? 6 : d.getDay() - 1],
      ratio,
      color: ratio > 0.8 ? C.green : ratio > 0.4 ? C.gold : C.red,
    }
  })

  const activeUsers = status?.active_users ?? status?.active_sessions ?? 0
  const latencyMs = status?.latency_ms

  // Merge outage events into recent events timeline
  const mergedEvents = [...events]
  outages.forEach(o => {
    mergedEvents.push({
      id: `outage-${o.id}`,
      status: o.status === 'resolved' ? 'UP' : 'DOWN',
      checked_at: o.started_at,
      isOutage: true,
      outage: o,
    })
    if (o.resolved_at) {
      mergedEvents.push({
        id: `outage-resolved-${o.id}`,
        status: 'UP',
        checked_at: o.resolved_at,
        isOutage: true,
        outage: { ...o, status: 'resolved' },
      })
    }
  })
  mergedEvents.sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime())

  const calDays = (() => {
    const y = calMonth.getFullYear(), m = calMonth.getMonth()
    const first = new Date(y, m, 1).getDay()
    const last = new Date(y, m + 1, 0).getDate()
    const cells: (number | null)[] = []
    for (let i = 0; i < first; i++) cells.push(null)
    for (let d = 1; d <= last; d++) cells.push(d)
    return cells
  })()
  const calToday = new Date()
  const isCalToday = (d: number) => d === calToday.getDate() && calMonth.getMonth() === calToday.getMonth() && calMonth.getFullYear() === calToday.getFullYear()
  const isCalSelected = (d: number) => d === etaDate.getDate() && calMonth.getMonth() === etaDate.getMonth() && calMonth.getFullYear() === etaDate.getFullYear()
  const selectCalDay = (d: number) => {
    const nd = new Date(calMonth.getFullYear(), calMonth.getMonth(), d, etaDate.getHours(), etaDate.getMinutes())
    setEtaDate(nd); setShowCal(false)
  }
  const setEtaHour = (h: number) => { const nd = new Date(etaDate); nd.setHours(h); setEtaDate(nd) }
  const setEtaMin = (m: number) => { const nd = new Date(etaDate); nd.setMinutes(m); setEtaDate(nd) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Network" subsection="Status" />
      <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', background: C.void, color: C.text }}>

        {loading && !status ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--theme-faint)', fontSize: 13 }}>Loading network status...</div>
        ) : (
          <>
            {/* ───── HEADER ROW ───── */}
            <div className="network-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: statusLabel.color, boxShadow: `0 0 8px ${statusLabel.color}60`,
                }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: statusLabel.color }}>{statusLabel.text}</span>
                {!notMonitoring && (
                  <span style={{ fontSize: 11, color: C.dim, fontFamily: 'DM Mono, monospace' }}>
                    {routerIp} &middot; {lastChecked}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowDeclareModal(true)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7,
                  background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.2)',
                  color: C.red, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                }}>
                  <AlertTriangle size={12} /> Declare Outage
                </button>
                <button onClick={fetchData} disabled={loading} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7,
                  background: 'var(--theme-surface)', border: '0.5px solid var(--theme-border2)', color: C.dim, fontSize: 10, cursor: 'pointer',
                }}>
                  <RefreshCw size={12} />
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* ───── OUTAGE BANNER ───── */}
            {outages.length > 0 && (
              <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {outages.map(o => (
                  <div key={o.id} style={{
                    padding: '14px 18px', borderRadius: 9,
                    background: 'rgba(239,68,68,0.06)',
                    border: `1px solid rgba(239,68,68,0.2)`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.red, marginTop: 3, flexShrink: 0 }} />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.red }}>
                              {o.status === 'investigating' ? 'Investigating' : o.status === 'confirmed_down' ? 'Outage Confirmed' : 'Degraded'}
                            </span>
                            {o.zone && (
                              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: C.red, fontFamily: 'DM Mono, monospace' }}>
                                {o.zone}
                              </span>
                            )}
                          </div>
                          {o.description && <div style={{ fontSize: 11, color: C.dim, marginBottom: 4 }}>{o.description}</div>}
                          <div style={{ display: 'flex', gap: 12, fontSize: 10, color: C.faint }}>
                            <span>Since {formatRelativeTime(o.started_at)}</span>
                            <span>·</span>
                            <span>{o.source === 'auto' ? 'Auto-detected' : 'Declared by staff'}</span>
                            {o.eta && <><span>·</span><span>ETA: {new Date(o.eta).toLocaleTimeString()}</span></>}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleResolveOutage(o.id)} style={{
                        padding: '5px 12px', borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                        background: 'rgba(34,197,94,0.1)', border: '0.5px solid rgba(34,197,94,0.2)', color: C.green,
                        display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                      }}>
                        <CheckCircle size={11} /> Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ───── METRICS ROW ───── */}
            <div className="network-metrics-row" style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Latency', value: latencyMs !== null && latencyMs !== undefined ? `${latencyMs}ms` : '—', icon: Activity },
                { label: 'Users', value: String(activeUsers), icon: Users },
                { label: 'Uptime', value: uptimePercent !== null ? `${uptimePercent}%` : '—', icon: Zap },
              ].map((c, i) => (
                <div key={i} style={{
                  flex: 1, background: C.base, border: `0.5px solid ${C.border}`,
                  borderRadius: 9, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 7, background: 'var(--theme-surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <c.icon size={14} color={C.gold} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 22, fontWeight: 500, color: C.text, lineHeight: 1.2 }}>{c.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ───── UPTIME BAR ───── */}
            <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 9, padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>14-Day Uptime</div>
              {events.length > 0 ? (
                <div style={{ display: 'flex', gap: 3, height: 28 }}>
                  {uptimeTimeline.map((day, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <div style={{
                        height: `${Math.max(day.ratio * 100, 8)}%`,
                        background: day.color, borderRadius: 2, transition: 'height 0.3s',
                      }} title={`${day.label}: ${Math.round(day.ratio * 100)}%`} />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ height: 28, background: 'var(--theme-surface)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 10, color: C.mute }}>No uptime data yet</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 8, color: C.faint, fontFamily: 'DM Mono, monospace' }}>{uptimeTimeline[0]?.label}</span>
                <span style={{ fontSize: 8, color: C.faint, fontFamily: 'DM Mono, monospace' }}>{uptimeTimeline[uptimeTimeline.length - 1]?.label}</span>
              </div>
            </div>

            {/* ───── BOTTOM: Events + Router ───── */}
            <div className="network-bottom-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Events Log — merged outage + network events */}
              <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 9, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Recent Events</div>
                {mergedEvents.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 180, overflowY: 'auto' }}>
                    {mergedEvents.filter((e: any, i: number, arr: any[]) => {
                      if (i === 0) return true
                      return e.status?.toUpperCase?.() !== arr[i - 1]?.status?.toUpperCase?.()
                    }).slice(0, 12).map((e: any, i: number) => {
                      const isUp = e.status === 'UP' || e.status === 'up'
                      const isDown = e.status === 'DOWN' || e.status === 'down'
                      const isOutage = e.isOutage
                      const outage = e.outage
                      return (
                        <div key={e.id || i} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '5px 0', borderBottom: i < 11 ? `0.5px solid ${C.border}` : 'none', fontSize: 10,
                        }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: isOutage ? (outage?.status === 'resolved' ? C.green : C.red) : (isUp ? C.green : isDown ? C.red : C.gold), flexShrink: 0 }} />
                          <span style={{ color: C.dim, minWidth: 70, fontFamily: 'DM Mono, monospace' }}>
                            {formatRelativeTime(e.checked_at)}
                          </span>
                          {isOutage ? (
                            <span style={{ color: outage?.status === 'resolved' ? C.green : C.red }}>
                              {outage?.status === 'resolved' ? 'Outage resolved' : `Outage: ${outage?.description || 'declared'}`}
                            </span>
                          ) : (
                            <span style={{ color: isUp ? C.green : isDown ? C.red : C.gold }}>
                              {isUp ? 'Online' : isDown ? 'Offline' : 'Degraded'}
                            </span>
                          )}
                          {e.latency_ms && <span style={{ color: C.faint, fontFamily: 'DM Mono, monospace' }}>{e.latency_ms}ms</span>}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px 12px', color: C.mute, fontSize: 11 }}>No events yet</div>
                )}
              </div>

              {/* Router */}
              <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 9, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Router</div>
                {mikrotik ? (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                      {[
                        { label: 'IP', value: mikrotik.router_ip || '—' },
                        { label: 'Hotspot', value: mikrotik.hotspot_server || '—' },
                        { label: 'Last seen', value: mikrotik.last_connected_at ? formatRelativeTime(mikrotik.last_connected_at) : '—' },
                      ].map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '3px 0' }}>
                          <span style={{ color: C.dim }}>{r.label}</span>
                          <span style={{ color: C.dim, fontFamily: 'DM Mono, monospace' }}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                    {mikrotik.notes && mikrotik.notes.includes('Board:') && (
                      <div style={{ padding: '8px 10px', marginBottom: 12, borderRadius: 6, background: 'var(--theme-surface)', border: `0.5px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Router size={12} color={C.gold} />
                        <span style={{ fontSize: 9, color: C.dim, fontFamily: 'DM Mono, monospace' }}>
                          {mikrotik.notes.split('|').map((p: string) => p.trim()).filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    )}
                    <button onClick={handleTest} disabled={testing} style={{
                      width: '100%', padding: '8px', borderRadius: 7,
                      background: 'var(--theme-surface)', border: '0.5px solid var(--theme-border2)',
                      color: C.dim, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}>
                      <Zap size={11} />
                      {testing ? 'Testing...' : 'Test Connection'}
                    </button>
                    {testResult && (
                      <div style={{
                        marginTop: 6, padding: '6px 10px', borderRadius: 5, fontSize: 9,
                        background: testResult.includes('fail') || testResult.includes('unreachable') ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                        color: testResult.includes('fail') || testResult.includes('unreachable') ? C.red : C.green,
                      }}>
                        {testResult}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                    <Router size={22} color={C.dim} style={{ marginBottom: 8 }} />
                    <div style={{ color: C.dim, fontSize: 11, marginBottom: 6 }}>Not configured</div>
                    <a href="/dashboard/mikrotik" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6,
                      background: 'var(--theme-surface)', border: '0.5px solid var(--theme-border2)', color: C.dim, fontSize: 10, textDecoration: 'none',
                    }}>
                      <Router size={10} /> Set up
                    </a>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ───── DECLARE OUTAGE MODAL ───── */}
      {showDeclareModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 24, maxWidth: 420, width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Declare Outage</div>
              <button onClick={() => setShowDeclareModal(false)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>Zone (optional)</label>
              <input value={declareForm.zone} onChange={e => setDeclareForm(p => ({ ...p, zone: e.target.value }))} placeholder="e.g. Westlands, CBD"
                style={{ width: '100%', padding: '9px 12px', background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>Description *</label>
              <textarea value={declareForm.description} onChange={e => setDeclareForm(p => ({ ...p, description: e.target.value }))} placeholder="What's happening..." rows={3}
                style={{ width: '100%', padding: '9px 12px', background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none', resize: 'none' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>ETA (optional)</label>
              {/* Date display + calendar toggle */}
              <div style={{ display: 'flex', gap: 8, marginBottom: showCal ? 10 : 0 }}>
                <button onClick={() => setShowCal(!showCal)} style={{
                  flex: 1, padding: '9px 12px', background: C.void, border: `0.5px solid ${C.border}`,
                  borderRadius: 7, color: C.text, fontSize: 12, cursor: 'pointer', textAlign: 'left',
                  fontFamily: "'DM Mono', monospace",
                }}>
                  {etaDate.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, padding: '0 10px' }}>
                  <button onClick={() => setEtaHour((etaDate.getHours() + 1) % 24)} style={{ background: 'none', border: 'none', color: C.gold, cursor: 'pointer', fontSize: 14, padding: 0 }}>▲</button>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: C.text, minWidth: 40, textAlign: 'center' }}>
                    {String(etaDate.getHours()).padStart(2, '0')}:{String(etaDate.getMinutes()).padStart(2, '0')}
                  </span>
                  <button onClick={() => setEtaHour((etaDate.getHours() + 23) % 24)} style={{ background: 'none', border: 'none', color: C.gold, cursor: 'pointer', fontSize: 14, padding: 0 }}>▼</button>
                </div>
              </div>
              {/* Calendar grid */}
              {showCal && (
                <div style={{ background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: 12, marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1))} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}>‹</button>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{calMonth.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1))} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}>›</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' }}>
                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                      <div key={d} style={{ fontSize: 9, fontWeight: 700, color: C.mute, padding: '4px 0' }}>{d}</div>
                    ))}
                    {calDays.map((d, i) => (
                      <div key={i} onClick={d ? () => selectCalDay(d) : undefined} style={{
                        fontSize: 11, padding: '6px 0', borderRadius: 6, cursor: d ? 'pointer' : 'default',
                        background: d && isCalSelected(d) ? C.gold : 'transparent',
                        color: d && isCalSelected(d) ? '#000' : d && isCalToday(d) ? C.gold : d ? C.text : 'transparent',
                        fontWeight: d && (isCalToday(d) || isCalSelected(d)) ? 700 : 400,
                      }}>{d || ''}</div>
                    ))}
                  </div>
                </div>
              )}
              {/* Minute quick-select */}
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {[0, 15, 30, 45].map(m => (
                  <button key={m} onClick={() => setEtaMin(m)} style={{
                    padding: '4px 10px', borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    background: etaDate.getMinutes() === m ? C.gold : 'transparent',
                    color: etaDate.getMinutes() === m ? '#000' : C.dim,
                    border: `0.5px solid ${etaDate.getMinutes() === m ? C.gold : C.border}`,
                  }}>:{String(m).padStart(2, '0')}</button>
                ))}
              </div>
            </div>
            <button onClick={handleDeclareOutage} disabled={declaring || !declareForm.description.trim()} style={{
              width: '100%', padding: '10px', borderRadius: 7, border: 'none', cursor: declaring ? 'not-allowed' : 'pointer',
              background: declaring || !declareForm.description.trim() ? C.mute : C.red,
              color: '#fff', fontSize: 12, fontWeight: 700, opacity: declaring ? 0.6 : 1,
            }}>
              {declaring ? 'Declaring...' : 'Declare Outage'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
