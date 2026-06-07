'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { api, formatKsh } from '@/lib/api'
import { useFetch } from '@/lib/hooks/useFetch'
import { useSession } from '@/lib/hooks/useSession'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/context/ToastContext'
import { useRouter } from 'next/navigation'
import React from 'react'

// ─── exact shape the backend returns ────────────────────────────────────────
interface DashStats {
  revenue: {
    gross_ksh: number
    isp_earnings_ksh: number
    platform_fee_ksh: number
    transaction_count: number
  }
  active_sessions: number
  network: { status: string; latency_ms: number | null }
}

// ─── helpers ─────────────────────────────────────────────────────────────────
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const PKG_COLORS = ['#3b82f6','#a78bfa','#22c55e','#f59e0b','#f87171']
const fmt = (n: number) => n.toLocaleString('en-KE')

function dayIndex(date: Date) {
  // Mon=0 … Sun=6
  return date.getDay() === 0 ? 6 : date.getDay() - 1
}

// live countdown shown in sessions list
function Countdown({ expires_at }: { expires_at: string }) {
  const [left, setLeft] = React.useState('')
  const [crit, setCrit] = React.useState(false)
  React.useEffect(() => {
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
  return (
    <span style={{ fontFamily:'DM Mono, monospace', fontSize:11, fontWeight:500,
      color: crit ? '#f87171' : '#22c55e', minWidth:48, textAlign:'right' }}>
      {left}
    </span>
  )
}

// ─── main component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { token, user, role, hydrated } = useAuth()
  const router = useRouter()
  const { showToast } = useToast()

  // ── onboarding redirect: use onboarding_complete from /api/auth/me ──────────
  useEffect(() => {
    if (!hydrated || !token) return
    // only redirect if we haven't already settled this session
    if (sessionStorage.getItem('onboarding_checked')) return
    sessionStorage.setItem('onboarding_checked', 'true')

    if (role === 'isp_admin') {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(me => {
          if (!me.onboarding_complete) router.push('/onboarding')
        })
        .catch(() => {}) // fail silently, stay on dashboard
    }
  }, [hydrated, token, role, router])

  // ── data hooks ───────────────────────────────────────────────────────────────
  const { data: dashStats, loading: statsLoading, error: statsErr } =
    useFetch<DashStats>(token ? '/api/tenants/dashboard' : null, token,
      { autoLoad: true, pollInterval: 60000 })

  const { sessions, loading: sessionsLoading, error: sessionsErr,
    refetch: refetchSessions, expiringCount } =
    useSession(token, { status: 'active', pollInterval: 30000 })

  // fetch more transactions so the weekly chart has enough data
  const { transactions, loading: transLoading, error: transErr,
    refetch: refetchTrans } =
    useTransactions(token, { pageSize: 50, pollInterval: 60000 })

  const { status: netStatus } =
    useNetworkStatus(token, { pollInterval: 30000 })

  // ── error toasts (only once per error string) ────────────────────────────────
  const shownErrs = useRef(new Set<string>())
  useEffect(() => {
    [statsErr, sessionsErr, transErr].filter(Boolean).forEach(e => {
      if (!shownErrs.current.has(e!)) {
        shownErrs.current.add(e!)
        showToast(e!, { type: 'error' })
      }
    })
  }, [statsErr, sessionsErr, transErr, showToast])

  // ── kick session ─────────────────────────────────────────────────────────────
  const kick = async (id: string) => {
    if (!confirm('Terminate this session?')) return
    try {
      await api.terminateSession(id)
      await refetchSessions()
      showToast('Session terminated', { type: 'success' })
    } catch (err) {
      showToast('Failed to terminate', { type: 'error' })
    }
  }

  // ── derive weekly revenue from actual transactions ───────────────────────────
  const weeklyKsh = Array(7).fill(0)
  transactions.forEach(t => {
    // t.created_at is an ISO string; amount is t.amount_ksh (from hook shape)
    const d = new Date(t.created_at)
    weeklyKsh[dayIndex(d)] += (t.amount_ksh || 0)
  })
  const maxWeekly = Math.max(...weeklyKsh, 1)
  const todayIdx = dayIndex(new Date())

  // ── derive package split from transactions ───────────────────────────────────
  // transactions from useTransactions hook expose `package` field
  // (the hook maps package_id from backend)
  const pkgCounts: Record<string, number> = {}
  transactions.forEach(t => {
    // try both field names since backend may return package_id
    const name = (t as any).package || (t as any).package_id || 'Other'
    pkgCounts[name] = (pkgCounts[name] || 0) + 1
  })
  const totalTx = transactions.length || 1
  const pkgSlices = Object.entries(pkgCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count], i) => ({
      name,
      pct: Math.round((count / totalTx) * 100),
      color: PKG_COLORS[i],
    }))
  if (pkgSlices.length === 0) {
    pkgSlices.push({ name: 'No data yet', pct: 100, color: '#1e1e1e' })
  }

  // ── pull figures from dashStats (backend-authoritative totals) ───────────────
  const grossKsh   = dashStats?.revenue?.gross_ksh       || 0
  const earningsKsh= dashStats?.revenue?.isp_earnings_ksh|| 0
  const feeKsh     = dashStats?.revenue?.platform_fee_ksh|| 0
  const txCount    = dashStats?.revenue?.transaction_count|| 0
  const activeCount= dashStats?.active_sessions           || sessions.length

  // today's revenue: sum transactions where created_at is today (local)
  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const todayKsh = transactions
    .filter(t => new Date(t.created_at) >= todayStart)
    .reduce((s, t) => s + (t.amount_ksh || 0), 0)

  // clients today = unique phone numbers today
  const clientsToday = new Set(
    transactions
      .filter(t => new Date(t.created_at) >= todayStart)
      .map(t => (t as any).phone_number || (t as any).phone || '')
      .filter(Boolean)
  ).size

  const today = new Date()

  // ─── layout constants ──────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background:'#080808', border:'0.5px solid #141414', borderRadius:11, padding:18,
  }
  const label: React.CSSProperties = {
    fontSize:10, color:'#2a2a2a', fontWeight:700,
    textTransform:'uppercase', letterSpacing:'0.5px',
  }
  const mono: React.CSSProperties = {
    fontFamily:'DM Mono, monospace',
  }

  // ─── stat card ────────────────────────────────────────────────────────────
  const Stat = ({ title, value, sub, color, loading: ld }: {
    title:string; value:string; sub:string; color:string; loading?:boolean
  }) => (
    <div style={{ ...card, borderTop:`1.5px solid ${color}` }}>
      <div style={{ ...label, marginBottom:12 }}>{title}</div>
      <div style={{ ...mono, fontSize:22, fontWeight:500,
        color: ld ? '#333' : '#f0f0f0', letterSpacing:'-0.5px', lineHeight:1 }}>
        {ld ? '—' : value}
      </div>
      <div style={{ ...mono, fontSize:10, color:'#2a2a2a', marginTop:7 }}>{sub}</div>
    </div>
  )

  // ── donut SVG ────────────────────────────────────────────────────────────
  const CIRCUM = 150.8
  let arcOffset = 0
  const arcs = pkgSlices.map(p => {
    const len = (p.pct / 100) * CIRCUM
    const el = { offset: arcOffset, len, color: p.color }
    arcOffset += len
    return el
  })

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
      <Topbar
        title="Dashboard"
        networkUp={netStatus?.status === 'up'}
        latency={netStatus?.latency_ms || 0}
      />

      <div style={{ flex:1, overflowY:'auto', padding:'22px 28px', background:'#030303' }}>

        {/* date bar */}
        <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:20 }}>
          <span style={{ ...mono, fontSize:11, color:'#252525', letterSpacing:'0.5px' }}>
            {['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][today.getDay()]}
            {' · '}{today.getDate()} {MONTHS[today.getMonth()].toUpperCase()} {today.getFullYear()}
          </span>
          <span style={{ fontSize:12, color:'#1e1e1e' }}>
            Good {today.getHours() < 12 ? 'morning' : today.getHours() < 17 ? 'afternoon' : 'evening'}
          </span>
        </div>

        {/* ── row 1: stat cards ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:12 }}>
          <Stat
            title="Today's revenue"
            value={`Ksh ${fmt(todayKsh)}`}
            sub={`${clientsToday} client${clientsToday !== 1 ? 's' : ''} today`}
            color="#3b82f6"
            loading={transLoading}
          />
          <Stat
            title="Month total"
            value={`Ksh ${fmt(grossKsh)}`}
            sub={`Ksh ${fmt(earningsKsh)} net · Ksh ${fmt(feeKsh)} fee`}
            color="#a78bfa"
            loading={statsLoading}
          />
          <Stat
            title="Active sessions"
            value={`${activeCount}`}
            sub={expiringCount > 0 ? `${expiringCount} expiring soon` : 'All stable'}
            color="#22c55e"
            loading={sessionsLoading && !activeCount}
          />
          <Stat
            title="All-time transactions"
            value={`${txCount}`}
            sub={`Ksh ${fmt(grossKsh)} total gross`}
            color="#f59e0b"
            loading={statsLoading}
          />
        </div>

        {/* ── row 2: chart + right col ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:12, marginBottom:12 }}>

          {/* weekly revenue bar chart — real data */}
          <div style={card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <span style={{ ...label }}>Revenue · last 7 days</span>
              <span onClick={refetchTrans} style={{ ...mono, fontSize:10, color:'#3b82f6', cursor:'pointer' }}>
                refresh ↺
              </span>
            </div>

            {transLoading && transactions.length === 0
              ? <LoadingSpinner size="sm" />
              : (
                <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                  {DAY_LABELS.map((day, i) => {
                    const ksh = weeklyKsh[i]
                    const isToday = i === todayIdx
                    return (
                      <div key={day} style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ ...mono, fontSize:10, width:26,
                          color: isToday ? '#60a5fa' : '#252525' }}>
                          {day}
                        </span>
                        <div style={{ flex:1, height:5, background:'#0d0d0d',
                          borderRadius:3, overflow:'hidden' }}>
                          <div style={{
                            height:'100%', borderRadius:3,
                            width: `${(ksh / maxWeekly) * 100}%`,
                            background: isToday ? '#60a5fa' : ksh > 0 ? '#3b82f6' : 'transparent',
                            transition:'width 0.5s ease',
                            minWidth: ksh > 0 ? 3 : 0,
                          }} />
                        </div>
                        <span style={{ ...mono, fontSize:10,
                          color: ksh > 0 ? '#555' : '#1e1e1e',
                          width:70, textAlign:'right' }}>
                          {ksh > 0 ? `Ksh ${fmt(Math.round(ksh))}` : '—'}
                        </span>
                      </div>
                    )
                  })}
                  {transactions.length === 0 && (
                    <div style={{ ...mono, fontSize:10, color:'#1a1a1a',
                      textAlign:'center', paddingTop:6 }}>
                      Chart fills automatically as payments come in
                    </div>
                  )}
                </div>
              )
            }
          </div>

          {/* right column */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

            {/* package split donut — real data */}
            <div style={card}>
              <span style={{ ...label, display:'block', marginBottom:14 }}>Package split</span>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <svg width="64" height="64" viewBox="0 0 64 64" style={{ flexShrink:0 }}>
                  {arcs.map((arc, i) => (
                    <circle key={i} cx="32" cy="32" r="24"
                      fill="none" stroke={arc.color} strokeWidth="10"
                      strokeDasharray={`${arc.len} ${CIRCUM}`}
                      strokeDashoffset={-arc.offset}
                      transform="rotate(-90 32 32)"
                    />
                  ))}
                  <circle cx="32" cy="32" r="19" fill="#080808" />
                  <text x="32" y="35" textAnchor="middle"
                    fontSize="9" fill="#333" fontFamily="DM Mono, monospace">
                    {totalTx === 1 ? '0' : totalTx}
                  </text>
                </svg>
                <div style={{ display:'flex', flexDirection:'column', gap:7, flex:1, minWidth:0 }}>
                  {pkgSlices.map((p, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center',
                      gap:7, fontSize:10, color:'#444' }}>
                      <div style={{ width:7, height:7, borderRadius:2,
                        background:p.color, flexShrink:0 }} />
                      <span style={{ flex:1, overflow:'hidden',
                        textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {p.name}
                      </span>
                      <span style={{ ...mono, color:'#555', flexShrink:0 }}>
                        {p.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* network card — real data */}
            <div style={card}>
              <div style={{ display:'flex', justifyContent:'space-between',
                alignItems:'center', marginBottom:10 }}>
                <span style={label}>Network</span>
                <span style={{
                  ...mono, fontSize:9, fontWeight:700, padding:'2px 8px',
                  borderRadius:4,
                  background: netStatus?.status === 'up' ? '#0d2010'
                    : netStatus?.status === 'degraded' ? '#1a1200' : '#200808',
                  color: netStatus?.status === 'up' ? '#22c55e'
                    : netStatus?.status === 'degraded' ? '#f59e0b' : '#f87171',
                }}>
                  {(netStatus?.status || 'checking').toUpperCase()}
                </span>
              </div>
              <div style={{ ...mono, fontSize:20, fontWeight:500,
                color:'#f0f0f0', letterSpacing:'-0.5px', marginBottom:5 }}>
                {netStatus?.latency_ms ? `${netStatus.latency_ms}ms` : '—'}
              </div>
              <div style={{ ...mono, fontSize:10, color:'#1e1e1e' }}>
                {netStatus?.status === 'up' ? 'Router reachable'
                  : netStatus?.status === 'degraded' ? 'MikroTik unreachable'
                  : 'Router offline'}
              </div>
            </div>
          </div>
        </div>

        {/* ── row 3: sessions + transactions ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:12 }}>

          {/* live sessions */}
          <div style={card}>
            <div style={{ display:'flex', justifyContent:'space-between',
              alignItems:'center', marginBottom:14 }}>
              <span style={label}>Live sessions</span>
              <span onClick={refetchSessions}
                style={{ ...mono, fontSize:10, color:'#3b82f6', cursor:'pointer' }}>
                {sessions.length > 5 ? `+${sessions.length - 5} more →` : 'refresh ↺'}
              </span>
            </div>

            {sessionsLoading && sessions.length === 0
              ? <LoadingSpinner size="sm" />
              : sessions.length === 0
              ? <div style={{ ...mono, fontSize:11, color:'#1e1e1e',
                  textAlign:'center', padding:'20px 0' }}>
                  No active sessions
                </div>
              : (
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {sessions.slice(0, 5).map(s => (
                    <div key={s.id} style={{ display:'flex', alignItems:'center',
                      gap:8, padding:'8px 10px', background:'#050505',
                      borderRadius:7, border:'0.5px solid #111' }}>
                      <span style={{ ...mono, fontSize:10, color:'#2a2a2a',
                        flex:1, letterSpacing:'0.3px' }}>
                        {(s.mac || '').slice(0, 11)}…
                      </span>
                      <span style={{ fontSize:10, color:'#1e1e1e', width:30,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {s.package || '—'}
                      </span>
                      <Countdown expires_at={s.expires_at} />
                      <span onClick={() => kick(s.id)} style={{ ...mono,
                        fontSize:9, color:'#1e1e1e', cursor:'pointer',
                        padding:'2px 6px', border:'0.5px solid #161616',
                        borderRadius:4 }}>
                        kick
                      </span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          {/* recent transactions — real data, no mock */}
          <div style={card}>
            <div style={{ display:'flex', justifyContent:'space-between',
              alignItems:'center', marginBottom:14 }}>
              <span style={label}>Recent transactions</span>
              <span onClick={refetchTrans}
                style={{ ...mono, fontSize:10, color:'#3b82f6', cursor:'pointer' }}>
                refresh ↺
              </span>
            </div>

            {transLoading && transactions.length === 0
              ? <LoadingSpinner size="sm" />
              : transactions.length === 0
              ? <div style={{ ...mono, fontSize:11, color:'#1e1e1e',
                  textAlign:'center', padding:'20px 0' }}>
                  No transactions yet
                </div>
              : (
                <div>
                  {transactions.slice(0, 6).map((t, i) => {
                    // backend returns phone_number; hook may expose as phone
                    const phone = (t as any).phone_number || (t as any).phone || ''
                    const masked = phone.length >= 8
                      ? `${phone.slice(0, 4)} ••• ${phone.slice(-4)}`
                      : phone || '—'
                    const pkg = (t as any).package || (t as any).package_id || '—'
                    const amt = t.amount_ksh || (t as any).amount || 0
                    const fee = t.platform_fee_ksh || (t as any).platform_fee || 0
                    return (
                      <div key={t.id} style={{ display:'flex', alignItems:'center',
                        gap:10, padding:'9px 0',
                        borderBottom: i < Math.min(6, transactions.length) - 1
                          ? '0.5px solid #0d0d0d' : 'none' }}>
                        <span style={{ ...mono, fontSize:10, color:'#333', flex:1 }}>
                          {masked}
                        </span>
                        <span style={{ fontSize:10, color:'#222',
                          overflow:'hidden', textOverflow:'ellipsis',
                          whiteSpace:'nowrap', maxWidth:60 }}>
                          {pkg}
                        </span>
                        <span style={{ ...mono, fontSize:13,
                          fontWeight:500, color:'#e0e0e0', flexShrink:0 }}>
                          Ksh {fmt(amt)}
                        </span>
                        <span style={{ ...mono, fontSize:9, color:'#1e1e1e',
                          flexShrink:0 }}>
                          −{fmt(fee)} fee
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            }
          </div>
        </div>
      </div>
    </div>
  )
}