'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/context/ToastContext'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface TrendDay {
  date: string
  transaction_count: number
  total_revenue_ksh: number
  isp_earnings_ksh: number
  platform_fees_ksh: number
}

interface TopPackage {
  package_id: string
  name: string
  price_ksh: number
  sold_count: number
  total_revenue_ksh: number
}

async function apiCall(path: string, token: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
  return data
}

const fmt = (n: number) => n.toLocaleString('en-KE')
const RANGES = [7, 14, 30, 90]
const PKG_COLORS = ['#3b82f6', '#a78bfa', '#22c55e', '#f59e0b', '#f87171', '#06b6d4']

export default function AnalyticsPage() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [days, setDays] = useState(30)
  const [trend, setTrend] = useState<TrendDay[]>([])
  const [topPkgs, setTopPkgs] = useState<TopPackage[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async (d: number) => {
    if (!token) return
    setLoading(true)
    try {
      const [trendData, pkgData] = await Promise.all([
        apiCall(`/api/analytics/revenue-trend?days=${d}`, token),
        apiCall('/api/analytics/top-packages?limit=6', token),
      ])
      setTrend(trendData.trend || [])
      setTopPkgs(pkgData.packages || [])
    } catch (err) {
      showToast((err as Error).message, { type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [token, showToast])

  useEffect(() => { fetchAll(days) }, [days, fetchAll])

  const mono: React.CSSProperties = { fontFamily: 'DM Mono, monospace' }
  const card: React.CSSProperties = {
    background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 20,
  }

  // totals
  const totalRevenue  = trend.reduce((s, d) => s + d.total_revenue_ksh, 0)
  const totalEarnings = trend.reduce((s, d) => s + d.isp_earnings_ksh, 0)
  const totalTx       = trend.reduce((s, d) => s + d.transaction_count, 0)
  const totalFees     = trend.reduce((s, d) => s + d.platform_fees_ksh, 0)
  const maxRevenue    = Math.max(...trend.map(d => d.total_revenue_ksh), 1)
  const maxTopRevenue = Math.max(...topPkgs.map(p => p.total_revenue_ksh), 1)

  // Format x-axis date labels — show every Nth
  const labelEvery = days <= 14 ? 1 : days <= 30 ? 3 : 7
  const dayLabel = (iso: string) => {
    const d = new Date(iso)
    return `${d.getDate()}/${d.getMonth() + 1}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Analytics" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: '#030303' }}>

        {/* range selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, alignItems: 'center' }}>
          <span style={{ ...mono, fontSize: 10, color: '#2a2a2a', marginRight: 6 }}>RANGE</span>
          {RANGES.map(r => (
            <button key={r} onClick={() => setDays(r)} style={{
              padding: '5px 14px', borderRadius: 6, fontSize: 10, fontWeight: 700,
              cursor: 'pointer', border: '0.5px solid',
              borderColor: days === r ? '#3b82f6' : '#1a1a1a',
              background: days === r ? '#06132a' : '#0a0a0a',
              color: days === r ? '#60a5fa' : '#333',
            }}>
              {r}d
            </button>
          ))}
          <span onClick={() => fetchAll(days)} style={{
            ...mono, fontSize: 10, color: '#3b82f6', cursor: 'pointer', marginLeft: 'auto',
          }}>
            refresh ↺
          </span>
        </div>

        {loading ? (
          <LoadingSpinner size="md" label="Loading analytics…" />
        ) : (
          <>
            {/* stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
              {[
                { label: `Revenue (${days}d)`,  value: `Ksh ${fmt(Math.round(totalRevenue))}`,  color: '#3b82f6' },
                { label: `Earnings (${days}d)`, value: `Ksh ${fmt(Math.round(totalEarnings))}`, color: '#22c55e' },
                { label: `Transactions`,         value: fmt(totalTx),                            color: '#a78bfa' },
                { label: `Platform fees`,        value: `Ksh ${fmt(Math.round(totalFees))}`,    color: '#f59e0b' },
              ].map(s => (
                <div key={s.label} style={{ ...card, borderTop: `1.5px solid ${s.color}` }}>
                  <div style={{ fontSize: 10, color: '#2a2a2a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>{s.label}</div>
                  <div style={{ ...mono, fontSize: 20, fontWeight: 500, color: '#f0f0f0', letterSpacing: '-0.5px' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* revenue trend chart */}
            <div style={{ ...card, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 18 }}>
                Revenue trend — last {days} days
              </div>

              {trend.length === 0 ? (
                <div style={{ ...mono, fontSize: 11, color: '#1e1e1e', textAlign: 'center', padding: '30px 0' }}>
                  No transactions in this period
                </div>
              ) : (
                <>
                  {/* bars */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100, marginBottom: 8 }}>
                    {trend.map((d, i) => {
                      const h = Math.max(2, Math.round((d.total_revenue_ksh / maxRevenue) * 100))
                      return (
                        <div
                          key={i}
                          title={`${dayLabel(d.date)}: Ksh ${fmt(Math.round(d.total_revenue_ksh))} · ${d.transaction_count} tx`}
                          style={{
                            flex: 1, height: `${h}%`,
                            background: d.total_revenue_ksh > 0 ? '#3b82f6' : '#0d0d0d',
                            borderRadius: '2px 2px 0 0',
                            cursor: 'default', transition: 'opacity 0.1s',
                            minWidth: 2,
                          }}
                        />
                      )
                    })}
                  </div>
                  {/* x labels */}
                  <div style={{ display: 'flex', gap: 3 }}>
                    {trend.map((d, i) => (
                      <div key={i} style={{
                        flex: 1, textAlign: 'center',
                        ...mono, fontSize: 8, color: i % labelEvery === 0 ? '#333' : 'transparent',
                        minWidth: 2,
                      }}>
                        {dayLabel(d.date)}
                      </div>
                    ))}
                  </div>

                  {/* daily breakdown table — last 7 */}
                  <div style={{ marginTop: 20, borderTop: '0.5px solid #0d0d0d', paddingTop: 16 }}>
                    <div style={{ fontSize: 10, color: '#2a2a2a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                      Recent days
                    </div>
                    {[...trend].reverse().slice(0, 7).map((d, i) => (
                      <div key={i} style={{
                        display: 'grid', gridTemplateColumns: '80px 1fr 100px 100px 80px',
                        padding: '7px 0', borderBottom: '0.5px solid #080808', alignItems: 'center',
                      }}>
                        <span style={{ ...mono, fontSize: 10, color: '#444' }}>{dayLabel(d.date)}</span>
                        <div style={{ height: 4, background: '#0d0d0d', borderRadius: 2, marginRight: 12 }}>
                          <div style={{
                            height: '100%', borderRadius: 2, background: '#3b82f6',
                            width: `${(d.total_revenue_ksh / maxRevenue) * 100}%`,
                          }} />
                        </div>
                        <span style={{ ...mono, fontSize: 11, color: '#e0e0e0' }}>Ksh {fmt(Math.round(d.total_revenue_ksh))}</span>
                        <span style={{ ...mono, fontSize: 10, color: '#333' }}>Ksh {fmt(Math.round(d.isp_earnings_ksh))} net</span>
                        <span style={{ ...mono, fontSize: 10, color: '#2a2a2a' }}>{d.transaction_count} tx</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* top packages */}
            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 18 }}>
                Top packages by revenue
              </div>
              {topPkgs.length === 0 ? (
                <div style={{ ...mono, fontSize: 11, color: '#1e1e1e', textAlign: 'center', padding: '30px 0' }}>
                  No package data yet
                </div>
              ) : (
                topPkgs.map((p, i) => (
                  <div key={p.package_id} style={{
                    display: 'grid', gridTemplateColumns: '24px 1fr 80px 110px 60px',
                    padding: '10px 0', borderBottom: i < topPkgs.length - 1 ? '0.5px solid #0a0a0a' : 'none',
                    alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ ...mono, fontSize: 11, color: PKG_COLORS[i], fontWeight: 700 }}>
                      #{i + 1}
                    </span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#ddd', marginBottom: 4 }}>{p.name}</div>
                      <div style={{ height: 3, background: '#0d0d0d', borderRadius: 2 }}>
                        <div style={{
                          height: '100%', borderRadius: 2, background: PKG_COLORS[i],
                          width: `${(p.total_revenue_ksh / maxTopRevenue) * 100}%`,
                        }} />
                      </div>
                    </div>
                    <span style={{ ...mono, fontSize: 10, color: '#444' }}>Ksh {fmt(p.price_ksh)}/unit</span>
                    <span style={{ ...mono, fontSize: 11, color: '#e0e0e0' }}>Ksh {fmt(Math.round(p.total_revenue_ksh))}</span>
                    <span style={{ ...mono, fontSize: 10, color: '#555' }}>{p.sold_count} sold</span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}