'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { api, formatRelativeTime } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { Wifi, RefreshCw, Router, Activity, Users, Clock, History, Zap, Server } from 'lucide-react'

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Network Status</h1>
          <button onClick={fetchData} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
            background: 'var(--theme-surface)', border: '0.5px solid var(--theme-border2)', color: C.dim, fontSize: 11, cursor: 'pointer',
          }}>
            <RefreshCw size={13} />
            {loading ? 'Refreshing...' : 'Refresh Now'}
          </button>
        </div>

        {loading && !status ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--theme-faint)', fontSize: 13 }}>Loading network status...</div>
        ) : (
          <>
            {/* ───── STATUS INDICATOR ───── */}
            <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '20px 24px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ position: 'relative', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: statusLabel.pulse ? `${statusLabel.color}20` : 'var(--theme-surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Wifi size={22} color={statusLabel.color} />
                  </div>
                  {statusLabel.pulse && (
                    <div style={{
                      position: 'absolute', width: 48, height: 48, borderRadius: '50%',
                      border: `2px solid ${statusLabel.color}40`,
                      animation: 'none',
                    }} />
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: statusLabel.color,
                      boxShadow: `0 0 8px ${statusLabel.color}80`,
                    }} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: statusLabel.color }}>{statusLabel.text}</span>
                  </div>
                  {notMonitoring ? (
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>Configure your router in MikroTik settings to begin monitoring</div>
                  ) : (
                    <div style={{ fontSize: 11, color: C.dim, fontFamily: 'DM Mono, monospace' }}>
                      Router IP: {routerIp} &middot; Last ping: {lastChecked}
                    </div>
                  )}
                  {status?.outage_minutes && (
                    <div style={{ fontSize: 10, color: C.red, marginTop: 4 }}>
                      Outage duration: {status.outage_minutes} minutes
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ───── METRIC CARDS ───── */}
            <div className="grid-3" style={{ display: 'grid', gap: 14, marginBottom: 16 }}>
              {[
                { label: 'Latency', value: latencyMs !== null && latencyMs !== undefined ? `${latencyMs}ms` : '—', sub: 'current', icon: Activity },
                { label: 'Active Users', value: String(activeUsers), sub: 'hotspot sessions', icon: Users },
                { label: 'Uptime (30d)', value: uptimePercent !== null ? `${uptimePercent}%` : '—', sub: 'based on recent pings', icon: Zap },
              ].map((c, i) => (
                <div key={i} style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--theme-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <c.icon size={16} color={C.gold} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{c.label}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 28, fontWeight: 500, color: C.text, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{c.value}</div>
                    <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.faint, marginTop: 2 }}>{c.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ───── UPTIME TIMELINE ───── */}
            <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '20px 24px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Uptime &mdash; Last 14 Days</div>
              {events.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {uptimeTimeline.map((day, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 9, color: C.faint, minWidth: 75, fontFamily: 'DM Mono, monospace' }}>{day.label}</span>
                      <div style={{ flex: 1, height: 14, background: 'var(--theme-surface)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: `${day.ratio * 100}%`, background: day.color, borderRadius: 3, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: 9, color: C.faint, minWidth: 35, textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>
                        {Math.round(day.ratio * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Array.from({ length: 7 }, (_, i) => {
                      const d = new Date()
                      d.setDate(d.getDate() - (6 - i))
                      return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
                    }).map((day, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 9, color: C.mute, minWidth: 75, fontFamily: 'DM Mono, monospace' }}>{day.label}</span>
                        <div style={{ flex: 1, height: 14, background: 'var(--theme-surface)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${60 + Math.random() * 35}%`, height: '100%', background: 'var(--theme-surface)', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 9, color: 'var(--theme-faint)', minWidth: 35, textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>—%</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: 'center', marginTop: 10 }}>
                    <span style={{ fontSize: 10, color: C.mute }}>Uptime data will appear once the network checker records pings</span>
                  </div>
                </div>
              )}
            </div>

            {/* ───── TWO COLUMN: Events + Router Config ───── */}
            <div className="grid-2" style={{ display: 'grid', gap: 16 }}>
              {/* Events Log */}
              <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recent Events</span>
                  <History size={13} color={C.dim} />
                </div>
                {events.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflowY: 'auto' }}>
                    {events.filter((e: any, i: number, arr: any[]) => {
                      if (i === 0) return true
                      const prev = arr[i - 1]?.status?.toUpperCase?.()
                      const cur = e.status?.toUpperCase?.()
                      return cur !== prev
                    }).slice(0, 30).map((e: any, i: number) => {
                      const isUp = e.status === 'UP' || e.status === 'up'
                      const isDown = e.status === 'DOWN' || e.status === 'down'
                      return (
                        <div key={e.id || i} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '6px 0', borderBottom: `0.5px solid ${C.border}`, fontSize: 10,
                        }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: isUp ? C.green : isDown ? C.red : C.gold,
                            flexShrink: 0,
                          }} />
                          <span style={{ color: C.dim, minWidth: 85, fontFamily: 'DM Mono, monospace' }}>
                            {formatRelativeTime(e.checked_at || e.created_at)}
                          </span>
                          <span style={{ color: isUp ? C.green : isDown ? C.red : C.gold, fontWeight: 500 }}>
                            {isUp ? 'Online' : isDown ? 'Offline' : 'Degraded'}
                          </span>
                          {e.latency_ms && (
                            <span style={{ color: C.faint, fontFamily: 'DM Mono, monospace' }}>
                              &middot; {e.latency_ms}ms
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ border: '1px dashed var(--theme-border2)', borderRadius: 8, textAlign: 'center', padding: '20px 16px' }}>
                    <div style={{ color: C.mute, fontSize: 12 }}>No events recorded yet</div>
                    <div style={{ fontSize: 10, color: 'var(--theme-faint)', marginTop: 2 }}>Network events appear here as the system checks your connection</div>
                  </div>
                )}
              </div>

              {/* Router Config Summary */}
              <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Router Configuration</span>
                  <Server size={13} color={C.dim} />
                </div>
                {mikrotik ? (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {[
                        { label: 'Router IP', value: mikrotik.router_ip || '—' },
                        { label: 'API Port', value: mikrotik.api_port || '—' },
                        { label: 'Username', value: mikrotik.api_username || '—' },
                        { label: 'Hotspot Server', value: mikrotik.hotspot_server || '—' },
                        { label: 'Connected', value: mikrotik.updated_at ? formatRelativeTime(mikrotik.updated_at) : '—' },
                      ].map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', borderBottom: `0.5px solid ${C.border}` }}>
                          <span style={{ color: C.dim }}>{r.label}</span>
                          <span style={{ color: C.dim, fontFamily: 'DM Mono, monospace' }}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={handleTest} disabled={testing} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
                      background: 'var(--theme-surface)', border: '0.5px solid var(--theme-border2)', color: C.dim, fontSize: 11, cursor: 'pointer', width: '100%', justifyContent: 'center',
                    }}>
                      <Zap size={13} />
                      {testing ? 'Testing...' : 'Test Connection'}
                    </button>
                    {testResult && (
                      <div style={{
                        marginTop: 8, padding: '8px 12px', borderRadius: 6, fontSize: 10,
                        background: testResult.includes('fail') || testResult.includes('unreachable') ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                        color: testResult.includes('fail') || testResult.includes('unreachable') ? C.red : C.green,
                        border: `0.5px solid ${testResult.includes('fail') || testResult.includes('unreachable') ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
                      }}>
                        {testResult}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                    <Router size={28} color={C.dim} style={{ marginBottom: 10 }} />
                    <div style={{ color: C.dim, fontSize: 12, marginBottom: 4 }}>Router Not Configured</div>
                    <div style={{ color: C.mute, fontSize: 10, marginBottom: 14 }}>Connect your MikroTik router to start monitoring</div>
                    <a href="/dashboard/mikrotik" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
                      background: 'var(--theme-surface)', border: '0.5px solid var(--theme-border2)', color: 'var(--theme-dim)', fontSize: 11, textDecoration: 'none',
                    }}>
                      <Router size={13} />
                      Configure Now
                    </a>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
