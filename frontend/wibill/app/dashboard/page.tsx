'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { api, formatKsh } from '@/lib/api'
import { useFetch } from '@/lib/hooks/useFetch'
import { useSession } from '@/lib/hooks/useSession'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/context/ToastContext'
import { TrendingUp, TrendingDown, Wifi, Users, DollarSign, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface DashboardStats {
  revenue: {
    gross_ksh: number
    isp_earnings_ksh: number
    platform_fee_ksh: number
    transaction_count: number
  }
  active_sessions: number
  network: {
    status: 'up' | 'down' | 'degraded'
    latency_ms: number
  }
}

export default function DashboardPage() {
  const { token, user, role, hydrated } = useAuth()
  const router = useRouter()
  const { showToast } = useToast()
  const [today_ksh, setToday_ksh] = useState(0)
  const [clients_today, setClients_today] = useState(0)

  // Fetch dashboard stats
  const { data: dashStats, loading: statsLoading, error: statsError, refetch: refetchStats } = useFetch<DashboardStats>(
    token ? '/api/tenants/dashboard' : null,
    token,
    { autoLoad: true, pollInterval: 60000 } // Poll every minute
  )

  // Fetch sessions
  const {
    sessions,
    loading: sessionsLoading,
    error: sessionsError,
    refetch: refetchSessions,
    expiringCount,
  } = useSession(token, { status: 'active', pollInterval: 30000 })

  // Fetch transactions
  const {
    transactions,
    loading: transLoading,
    error: transError,
    refetch: refetchTransactions,
  } = useTransactions(token, { pageSize: 6, pollInterval: 30000 })

  // Fetch network status
  const {
    status: networkStatus,
    loading: networkLoading,
    error: networkError,
    refetch: refetchNetwork,
  } = useNetworkStatus(token, { pollInterval: 30000 })

  // Onboarding redirect for ISP admins
  useEffect(() => {
    if (!hydrated) return
    const done = sessionStorage.getItem('onboarding_done')
    if (!done && role === 'isp_admin') {
      router.push('/onboarding')
    }
  }, [role, hydrated, router])

  // Show errors as toasts
  useEffect(() => {
    if (statsError) showToast('Error loading dashboard', { type: 'error', message: statsError })
    if (sessionsError) showToast('Error loading sessions', { type: 'error', message: sessionsError })
    if (transError) showToast('Error loading transactions', { type: 'error', message: transError })
    if (networkError) showToast('Network status error', { type: 'error', message: networkError })
  }, [statsError, sessionsError, transError, networkError, showToast])

  const kick = async (id: string) => {
    if (!confirm('Terminate this session?')) return
    try {
      await api.terminateSession(id)
      await refetchSessions()
      showToast('Session terminated', { type: 'success' })
    } catch (err) {
      showToast('Failed to terminate session', {
        type: 'error',
        message: (err as Error).message,
      })
    }
  }

  const fmt = (n: number) => n.toLocaleString('en-KE')
  const today = new Date()
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Calculate weekly revenue (mock for now - will be real data from API)
  const weekly = [
    { day: 'Mon', ksh: 0 },
    { day: 'Tue', ksh: 0 },
    { day: 'Wed', ksh: 0 },
    { day: 'Thu', ksh: 0 },
    { day: 'Fri', ksh: 0 },
    { day: 'Sat', ksh: 0 },
    { day: 'Sun', ksh: 0 },
  ]
  const maxWeekly = Math.max(...weekly.map(w => w.ksh), 1)

  // Calculate package split from transactions
  const packages = [
    { name: '1hr · Ksh 20', pct: 0, color: '#3b82f6' },
    { name: '6hr · Ksh 50', pct: 0, color: '#a78bfa' },
    { name: '24hr · Ksh 100', pct: 0, color: '#22c55e' },
    { name: 'Weekly · Ksh 500', pct: 0, color: '#f59e0b' },
  ]

  // Stat card component
  const Stat = ({ label, value, sub, up, color, icon: Icon }: any) => (
    <div
      style={{
        background: '#080808',
        border: '0.5px solid #141414',
        borderRadius: 11,
        padding: '18px 18px',
        position: 'relative',
        overflow: 'hidden',
        borderTop: `1.5px solid ${color}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: '#2a2a2a',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Icon size={12} color={color} />
        {label}
      </div>
      <div
        style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 24,
          fontWeight: 500,
          color: statsLoading ? '#444' : '#f0f0f0',
          letterSpacing: '-0.5px',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          marginTop: 7,
          fontFamily: 'DM Mono, monospace',
          color: up === true ? '#22c55e' : up === false ? '#f87171' : '#2a2a2a',
        }}
      >
        {sub}
      </div>
      <Icon size={40} color={color} style={{ position: 'absolute', right: 14, top: 14, opacity: 0.04 }} />
    </div>
  )

  // Countdown component
  function Countdown({ expires_at }: { expires_at: string }) {
    const [left, setLeft] = useState('')
    const [crit, setCrit] = useState(false)
    useEffect(() => {
      const tick = () => {
        const diff = Math.max(0, Math.floor((new Date(expires_at).getTime() - Date.now()) / 1000))
        const h = Math.floor(diff / 3600)
        const m = Math.floor((diff % 3600) / 60)
        const s = diff % 60
        setCrit(diff < 300)
        setLeft(h > 0 ? `${h}h${String(m).padStart(2, '0')}m` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
      }
      tick()
      const id = setInterval(tick, 1000)
      return () => clearInterval(id)
    }, [expires_at])
    return (
      <span
        style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 11,
          fontWeight: 500,
          color: crit ? '#f87171' : '#22c55e',
          minWidth: 48,
          textAlign: 'right',
        }}
      >
        {left}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar
        title="Dashboard"
        networkUp={networkStatus?.status === 'up'}
        latency={networkStatus?.latency_ms || 0}
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: '#030303' }}>
        {/* Date */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#252525', letterSpacing: '0.5px' }}>
            {days[today.getDay()].toUpperCase()} · {today.getDate()} {months[today.getMonth()].toUpperCase()} {today.getFullYear()}
          </span>
          <span style={{ fontSize: 13, color: '#1e1e1e', fontWeight: 400 }}>
            Good {today.getHours() < 12 ? 'morning' : today.getHours() < 17 ? 'afternoon' : 'evening'}
          </span>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
          <Stat
            label="Today's revenue"
            value={statsLoading ? '—' : `Ksh ${fmt(today_ksh)}`}
            sub="↑ +12% vs yesterday"
            up={true}
            color="#3b82f6"
            icon={DollarSign}
          />
          <Stat
            label="This month"
            value={statsLoading ? '—' : `Ksh ${fmt(dashStats?.revenue?.gross_ksh || 0)}`}
            sub={`Ksh ${fmt(dashStats?.revenue?.isp_earnings_ksh || 0)} net`}
            up={null}
            color="#a78bfa"
            icon={Calendar}
          />
          <Stat
            label="Active sessions"
            value={sessionsLoading ? '—' : `${sessions.length}`}
            sub={`${expiringCount} expiring soon`}
            up={true}
            color="#22c55e"
            icon={Wifi}
          />
          <Stat
            label="Clients today"
            value={statsLoading ? '—' : `${clients_today}`}
            sub="↓ −4 vs yesterday"
            up={false}
            color="#f59e0b"
            icon={Users}
          />
        </div>

        {/* Mid row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12, marginBottom: 12 }}>
          {/* Bar chart */}
          <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Revenue · Last 7 days
              </span>
              <span style={{ fontSize: 10, color: '#3b82f6', fontFamily: 'DM Mono, monospace', cursor: 'pointer' }}>
                full report →
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {weekly.map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#2a2a2a', width: 24 }}>
                    {w.day}
                  </span>
                  <div style={{ flex: 1, height: 5, background: '#0d0d0d', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${(w.ksh / maxWeekly) * 100}%`,
                        background: i === 3 ? '#60a5fa' : w.ksh > 0 ? '#3b82f6' : '#0d0d0d',
                        borderRadius: 3,
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: w.ksh ? '#555' : '#1a1a1a', width: 60, textAlign: 'right' }}>
                    {w.ksh ? `Ksh ${fmt(w.ksh)}` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Pie */}
            <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 18 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: 14 }}>
                Package Split
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <svg width="64" height="64" viewBox="0 0 64 64">
                  {(() => {
                    let offset = 0
                    const total = 150.8
                    return packages.map((p, i) => {
                      const len = (p.pct / 100) * total
                      const el = (
                        <circle
                          key={i}
                          cx="32"
                          cy="32"
                          r="24"
                          fill="none"
                          stroke={p.color}
                          strokeWidth="10"
                          strokeDasharray={`${len} ${total}`}
                          strokeDashoffset={-offset}
                          transform="rotate(-90 32 32)"
                        />
                      )
                      offset += len
                      return el
                    })
                  })()}
                  <circle cx="32" cy="32" r="19" fill="#080808" />
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {packages.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: '#444' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{p.name}</span>
                      <span style={{ fontFamily: 'DM Mono, monospace', color: '#555' }}>{p.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Loyalty */}
            <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <span style={{ fontSize: 9, color: '#2a2a2a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Loyalty Pool
                </span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 18, fontWeight: 500, color: '#f59e0b', letterSpacing: '-0.5px' }}>
                  2,840 pts
                </span>
              </div>
              <div style={{ height: 4, background: '#0d0d0d', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: '68%', background: '#f59e0b', borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 10, color: '#1e1e1e', fontFamily: 'DM Mono, monospace' }}>
                68% of cap · redeemable as internet tokens
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12 }}>
          {/* Live sessions */}
          <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Live Sessions
              </span>
              <span style={{ fontSize: 10, color: '#3b82f6', fontFamily: 'DM Mono, monospace', cursor: 'pointer' }}>
                all {sessions.length} →
              </span>
            </div>

            {sessionsLoading ? (
              <LoadingSpinner size="sm" />
            ) : sessions.length === 0 ? (
              <div style={{ color: '#444', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>
                No active sessions
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {sessions.slice(0, 5).map(s => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      background: '#050505',
                      borderRadius: 7,
                      border: '0.5px solid #111',
                    }}
                  >
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#2a2a2a', flex: 1, letterSpacing: '0.3px' }}>
                      {s.mac?.slice(0, 11)}…
                    </span>
                    <span style={{ fontSize: 10, color: '#222', width: 28 }}>
                      {s.package || '—'}
                    </span>
                    <Countdown expires_at={s.expires_at} />
                    <span
                      onClick={() => kick(s.id)}
                      style={{
                        fontSize: 9,
                        color: '#1e1e1e',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        border: '0.5px solid #161616',
                        borderRadius: 4,
                        fontFamily: 'DM Mono, monospace',
                      }}
                    >
                      kick
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transactions */}
          <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Recent Transactions
              </span>
              <span
                onClick={refetchTransactions}
                style={{
                  fontSize: 10,
                  color: '#3b82f6',
                  fontFamily: 'DM Mono, monospace',
                  cursor: 'pointer',
                }}
              >
                refresh →
              </span>
            </div>

            {transLoading ? (
              <LoadingSpinner size="sm" />
            ) : transactions.length === 0 ? (
              <div style={{ color: '#444', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>
                No transactions
              </div>
            ) : (
              <div>
                {transactions.slice(0, 6).map((t, i) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '9px 0',
                      borderBottom: i < Math.min(6, transactions.length) - 1 ? '0.5px solid #0d0d0d' : 'none',
                    }}
                  >
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#333', flex: 1 }}>
                      {(t.phone_number || t.phone || '').slice(0, 4)} ••• {(t.phone_number || t.phone || '').slice(-4)}
                    </span>
                    <span style={{ fontSize: 10, color: '#222' }}>{t.package}</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 500, color: '#e0e0e0' }}>
                      {formatKsh(t.amount_ksh)}
                    </span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#1e1e1e' }}>
                      −{formatKsh(t.platform_fee_ksh)} fee
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
