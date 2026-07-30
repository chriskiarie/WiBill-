'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { api, formatRelativeTime } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { RefreshCw, Router, Activity, Users, Zap } from 'lucide-react'

const C = {
  void: 'var(--theme-bg)', base: 'var(--theme-card-base)', border: 'var(--theme-border)',
  text: 'var(--theme-text)', dim: 'var(--theme-dim)', mute: 'var(--theme-mute)', faint: 'var(--theme-faint)',
  gold: 'var(--theme-gold)', green: 'var(--theme-green)', red: 'var(--theme-red)',
}

export default function NetworkPage() {
  const { user, token } = useAuth()
  const [status, setStatus] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [mikrotik, setMikrotik] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!token || !user?.tenant_id) return
    setLoading(true)
    try {
      const [dash, evts, mik] = await Promise.all([
        api.getTenantDashboard().catch(() => null),
        api.getTenantNetworkEvents(user.tenant_id, 50).catch(() => []),
        api.getMikrotikConfig().catch(() => null),
      ])
      if (dash) setStatus(dash.network || dash)
      setEvents(Array.isArray(evts) ? evts : [])
      setMikrotik(mik)
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }, [token, user?.tenant_id])

  useEffect(() => { fetchData() }, [fetchData])

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
  const hotspotName = mikrotik?.hotspot_server || '—'

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Network" subsection="Status" />
      <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', background: C.void, color: C.text }}>

        {loading && !status ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--theme-faint)', fontSize: 13 }}>Loading network status...</div>
        ) : (
          <>
            {/* ───── HEADER ROW ───── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
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
              <button onClick={fetchData} disabled={loading} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7,
                background: 'var(--theme-surface)', border: '0.5px solid var(--theme-border2)', color: C.dim, fontSize: 10, cursor: 'pointer',
              }}>
                <RefreshCw size={12} />
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {/* ───── METRICS ROW ───── */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
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
                <span style={{ fontSize: 8, color: C.faint, fontFamily: 'DM Mono, monospace' }}>
                  {uptimeTimeline[0]?.label}
                </span>
                <span style={{ fontSize: 8, color: C.faint, fontFamily: 'DM Mono, monospace' }}>
                  {uptimeTimeline[uptimeTimeline.length - 1]?.label}
                </span>
              </div>
            </div>

            {/* ───── BOTTOM: Events + Router ───── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Events Log */}
              <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 9, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Recent Events</div>
                {events.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 180, overflowY: 'auto' }}>
                    {events.filter((e: any, i: number, arr: any[]) => {
                      if (i === 0) return true
                      return e.status?.toUpperCase?.() !== arr[i - 1]?.status?.toUpperCase?.()
                    }).slice(0, 12).map((e: any, i: number) => {
                      const isUp = e.status === 'UP' || e.status === 'up'
                      const isDown = e.status === 'DOWN' || e.status === 'down'
                      return (
                        <div key={e.id || i} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '5px 0', borderBottom: i < 11 ? `0.5px solid ${C.border}` : 'none', fontSize: 10,
                        }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: isUp ? C.green : isDown ? C.red : C.gold, flexShrink: 0 }} />
                          <span style={{ color: C.dim, minWidth: 70, fontFamily: 'DM Mono, monospace' }}>
                            {formatRelativeTime(e.checked_at || e.created_at)}
                          </span>
                          <span style={{ color: isUp ? C.green : isDown ? C.red : C.gold }}>
                            {isUp ? 'Online' : isDown ? 'Offline' : 'Degraded'}
                          </span>
                          {e.latency_ms && <span style={{ color: C.faint, fontFamily: 'DM Mono, monospace' }}>{e.latency_ms}ms</span>}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px 12px', color: C.mute, fontSize: 11 }}>
                    No events yet
                  </div>
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
                        { label: 'Last seen', value: mikrotik.updated_at ? formatRelativeTime(mikrotik.updated_at) : '—' },
                      ].map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '3px 0' }}>
                          <span style={{ color: C.dim }}>{r.label}</span>
                          <span style={{ color: C.dim, fontFamily: 'DM Mono, monospace' }}>{r.value}</span>
                        </div>
                      ))}
                    </div>
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
                      <Router size={10} />
                      Set up
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* ───── OUTAGE WARNING ───── */}
            {status?.outage_minutes && (
              <div style={{
                marginTop: 12, padding: '10px 14px', borderRadius: 7,
                background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.15)',
                fontSize: 11, color: C.red,
              }}>
                Active outage: {status.outage_minutes} minutes
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
