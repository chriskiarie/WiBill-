'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import Topbar from '@/components/Topbar'
import { TrendingUp, TrendingDown, Wifi, Users, DollarSign, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const MOCK = {
  revenue: { gross_ksh: 91400, isp_earnings_ksh: 82260, platform_fee_ksh: 9140, transaction_count: 847 },
  today_ksh: 4820,
  active_sessions: 12,
  clients_today: 38,
  network: { status: 'up', latency_ms: 14 },
  weekly: [
    { day: 'Mon', ksh: 3200 }, { day: 'Tue', ksh: 4100 }, { day: 'Wed', ksh: 2800 },
    { day: 'Thu', ksh: 4820 }, { day: 'Fri', ksh: 0 }, { day: 'Sat', ksh: 0 }, { day: 'Sun', ksh: 0 },
  ],
  packages: [
    { name: '1hr · Ksh 20', pct: 50, color: '#3b82f6' },
    { name: '6hr · Ksh 50', pct: 25, color: '#a78bfa' },
    { name: '24hr · Ksh 100', pct: 17, color: '#22c55e' },
    { name: 'Weekly · Ksh 500', pct: 8, color: '#f59e0b' },
  ],
  sessions: [
    { id: '1', mac: 'AA:BB:CC:11:22:33', pkg: '1hr', expires_at: new Date(Date.now() + 42 * 60000).toISOString(), status: 'active' },
    { id: '2', mac: 'DD:EE:FF:44:55:66', pkg: '6hr', expires_at: new Date(Date.now() + 258 * 60000).toISOString(), status: 'active' },
    { id: '3', mac: '11:22:33:AA:BB:CC', pkg: '24hr', expires_at: new Date(Date.now() + 1265 * 60000).toISOString(), status: 'active' },
    { id: '4', mac: '77:88:99:DD:EE:FF', pkg: '1hr', expires_at: new Date(Date.now() + 4 * 60000).toISOString(), status: 'active' },
    { id: '5', mac: '33:44:AB:CD:EF:01', pkg: '6hr', expires_at: new Date(Date.now() + 28 * 60000).toISOString(), status: 'active' },
  ],
  transactions: [
    { phone: '0712 ••• 456', pkg: '1hr', amount: 20, fee: 2, at: '10:41' },
    { phone: '0798 ••• 012', pkg: '6hr', amount: 50, fee: 5, at: '10:39' },
    { phone: '0723 ••• 789', pkg: '24hr', amount: 100, fee: 10, at: '10:35' },
    { phone: '0745 ••• 321', pkg: '1hr', amount: 20, fee: 2, at: '10:28' },
    { phone: '0711 ••• 654', pkg: '6hr', amount: 50, fee: 5, at: '10:22' },
    { phone: '0733 ••• 987', pkg: '24hr', amount: 100, fee: 10, at: '10:14' },
  ],
}

function fmt(n: number) { return n.toLocaleString('en-KE') }

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
      setLeft(h > 0 ? `${h}h${String(m).padStart(2,'0')}m` : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expires_at])
  return <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 500, color: crit ? '#f87171' : '#22c55e', minWidth: 48, textAlign: 'right' }}>{left}</span>
}

export default function DashboardPage() {
  const { token, user, role } = useAuth()
  const router = useRouter()
  const [data, setData] = useState(MOCK)
  const [networkUp, setNetworkUp] = useState(true)
  const [latency, setLatency] = useState(14)
  const [sessions, setSessions] = useState(MOCK.sessions)

  useEffect(() => {
    if (!token) return
    fetch(`${API}/api/tenants/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setData(prev => ({ ...prev, revenue: d.revenue, active_sessions: d.active_sessions, network: d.network }))
        setNetworkUp(d.network?.status === 'up')
        setLatency(d.network?.latency_ms || 0)
      }).catch(() => {})

    fetch(`${API}/api/sessions/?status=active`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.length) setSessions(d) })
      .catch(() => {})
  }, [token])

  // First-login redirect to onboarding for ISP admins
  useEffect(() => {
    const done = sessionStorage.getItem('onboarding_done');
    if (!done && role === 'isp_admin') {
      router.push('/onboarding');
    }
  }, [role]);

  const kick = async (id: string) => {
    if (!confirm('Terminate this session?')) return
    try {
      await fetch(`${API}/api/sessions/${id}/terminate`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      setSessions(s => s.filter(x => x.id !== id))
    } catch {}
  }

  const maxWeekly = Math.max(...data.weekly.map(w => w.ksh), 1)
  const today = new Date()
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  // Stat card
  const Stat = ({ label, value, sub, up, color, icon: Icon }: any) => (
    <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: '18px 18px', position: 'relative', overflow: 'hidden', borderTop: `1.5px solid ${color}` }}>
      <div style={{ fontSize: 10, color: '#2a2a2a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={12} color={color} />{label}
      </div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 24, fontWeight: 500, color: '#f0f0f0', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, marginTop: 7, fontFamily: 'DM Mono, monospace', color: up === true ? '#22c55e' : up === false ? '#f87171' : '#2a2a2a' }}>{sub}</div>
      <Icon size={40} color={color} style={{ position: 'absolute', right: 14, top: 14, opacity: 0.04 }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Dashboard" networkUp={networkUp} latency={latency} />
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
          <Stat label="Today's revenue" value={`Ksh ${fmt(data.today_ksh || 4820)}`} sub="↑ +12% vs yesterday" up={true} color="#3b82f6" icon={DollarSign} />
          <Stat label="This month" value={`Ksh ${fmt(data.revenue.gross_ksh)}`} sub={`Ksh ${fmt(data.revenue.isp_earnings_ksh)} net`} up={null} color="#a78bfa" icon={Calendar} />
          <Stat label="Active sessions" value={`${data.active_sessions}`} sub={`${sessions.filter(s => { const d = new Date(s.expires_at).getTime() - Date.now(); return d < 300000 && d > 0 }).length} expiring soon`} up={true} color="#22c55e" icon={Wifi} />
          <Stat label="Clients today" value={`${data.clients_today}`} sub="↓ −4 vs yesterday" up={false} color="#f59e0b" icon={Users} />
        </div>

        {/* Mid row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12, marginBottom: 12 }}>
          {/* Bar chart */}
          <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Revenue · Last 7 days</span>
              <span style={{ fontSize: 10, color: '#3b82f6', fontFamily: 'DM Mono, monospace', cursor: 'pointer' }}>full report →</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.weekly.map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#2a2a2a', width: 24 }}>{w.day}</span>
                  <div style={{ flex: 1, height: 5, background: '#0d0d0d', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(w.ksh / maxWeekly) * 100}%`, background: i === 3 ? '#60a5fa' : w.ksh > 0 ? '#3b82f6' : '#0d0d0d', borderRadius: 3, transition: 'width 0.6s ease' }} />
                  </div>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: w.ksh ? '#555' : '#1a1a1a', width: 60, textAlign: 'right' }}>{w.ksh ? `Ksh ${fmt(w.ksh)}` : '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Pie */}
            <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 18 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: 14 }}>Package Split</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <svg width="64" height="64" viewBox="0 0 64 64">
                  {(() => {
                    let offset = 0
                    const total = 150.8
                    return data.packages.map((p, i) => {
                      const len = (p.pct / 100) * total
                      const el = <circle key={i} cx="32" cy="32" r="24" fill="none" stroke={p.color} strokeWidth="10" strokeDasharray={`${len} ${total}`} strokeDashoffset={-offset} transform="rotate(-90 32 32)" />
                      offset += len
                      return el
                    })
                  })()}
                  <circle cx="32" cy="32" r="19" fill="#080808" />
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {data.packages.map((p, i) => (
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
                <span style={{ fontSize: 9, color: '#2a2a2a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Loyalty Pool</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 18, fontWeight: 500, color: '#f59e0b', letterSpacing: '-0.5px' }}>2,840 pts</span>
              </div>
              <div style={{ height: 4, background: '#0d0d0d', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: '68%', background: '#f59e0b', borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 10, color: '#1e1e1e', fontFamily: 'DM Mono, monospace' }}>68% of cap · redeemable as internet tokens</div>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12 }}>
          {/* Live sessions */}
          <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Live Sessions</span>
              <span style={{ fontSize: 10, color: '#3b82f6', fontFamily: 'DM Mono, monospace', cursor: 'pointer' }}>all {sessions.length} →</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {sessions.slice(0, 5).map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#050505', borderRadius: 7, border: '0.5px solid #111' }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#2a2a2a', flex: 1, letterSpacing: '0.3px' }}>{s.mac?.slice(0, 11)}…</span>
                  <span style={{ fontSize: 10, color: '#222', width: 28 }}>{(s as any).pkg || '—'}</span>
                  <Countdown expires_at={s.expires_at} />
                  <span onClick={() => kick(s.id)} style={{ fontSize: 9, color: '#1e1e1e', cursor: 'pointer', padding: '2px 6px', border: '0.5px solid #161616', borderRadius: 4, fontFamily: 'DM Mono, monospace' }}>kick</span>
                </div>
              ))}
            </div>
          </div>

          {/* Transactions */}
          <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Recent Transactions</span>
              <span style={{ fontSize: 10, color: '#3b82f6', fontFamily: 'DM Mono, monospace', cursor: 'pointer' }}>export CSV →</span>
            </div>
            <div>
              {data.transactions.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', borderBottom: i < data.transactions.length - 1 ? '0.5px solid #0d0d0d' : 'none' }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#333', flex: 1 }}>{t.phone}</span>
                  <span style={{ fontSize: 10, color: '#222' }}>{t.pkg}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 500, color: '#e0e0e0' }}>Ksh {t.amount}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#1e1e1e' }}>−{t.fee} fee</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
