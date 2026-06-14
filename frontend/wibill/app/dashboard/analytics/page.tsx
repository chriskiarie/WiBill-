'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'

const colors = { gold: '#E8B84B', blue: '#3b82f6', green: '#22c55e', red: '#f87171', purple: '#a855f7', amber: '#f59e0b', base: '#080808', void: '#030303', text: '#e0e0e0', muted: '#2a2a2a' }

export default function AnalyticsPage() {
  const { token } = useAuth()
  const [period, setPeriod] = useState(7)
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [topPackages, setTopPackages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    Promise.all([
      api.getRevenueTrend(period),
      api.getTopPackages(10),
    ]).then(([trend, pkgs]) => {
      if (trend?.trend) {
        setRevenueData(trend.trend.map((d: any) => ({
          date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: d.total_revenue_ksh || 0,
          sessions: d.session_count || 0,
        })))
      }
      setTopPackages(Array.isArray(pkgs) ? pkgs : pkgs?.packages || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [token, period])

  const fmtKsh = (n: number) => `Ksh ${n?.toLocaleString('en-KE') || '0'}`
  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0)

  const peakHours = Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 24 }, (_, hour) => ({
      day, hour, value: Math.floor(Math.random() * (day + 1) * (hour + 1) * 3) // placeholder - real data from backend
    }))
  ).flat()

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`)

  const getHeatColor = (v: number) => {
    if (v === 0) return '#0a0a0a'
    if (v < 10) return '#0a1628'
    if (v < 50) return '#1a3a6e'
    if (v < 100) return '#2a5a9e'
    if (v < 200) return '#3b82f6'
    return '#60a5fa'
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) return (
      <div style={{ background: '#0a0a0a', border: '0.5px solid #1a1a1a', borderRadius: 6, padding: '8px 12px', fontSize: 11 }}>
        <div style={{ color: '#888', marginBottom: 4 }}>{label}</div>
        {payload.map((p: any, i: number) => <div key={i} style={{ color: p.color, fontFamily: 'DM Mono, monospace' }}>{p.name}: {p.name === 'Revenue' ? fmtKsh(p.value) : p.value}</div>)}
      </div>
    )
    return null
  }

  const chartHeight = revenueData.length > 0 ? 260 : 80

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Analytics" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: colors.void }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Analytics</h1>
          <div style={{ display: 'flex', gap: 6 }}>
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setPeriod(d)} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: period === d ? colors.blue : '#0a0a0a', border: period === d ? `0.5px solid ${colors.blue}` : '0.5px solid #1a1a1a', color: period === d ? '#fff' : '#555' }}>
                {d}d
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#444', fontSize: 13 }}>Loading analytics...</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              {[
                { label: `Revenue (${period}d)`, value: fmtKsh(totalRevenue), sub: `${revenueData.length} days`, color: colors.gold },
                { label: 'Transactions', value: String(revenueData.reduce((s, d) => s + d.sessions, 0)), sub: 'total', color: colors.blue },
                { label: 'Avg Daily', value: fmtKsh(revenueData.length ? totalRevenue / revenueData.length : 0), sub: 'per day', color: colors.green },
                { label: 'Top Package', value: topPackages[0]?.name || '—', sub: 'best seller', color: '#aaa', isName: true },
              ].map((c, i) => (
                <div key={i} style={{ background: colors.base, border: '0.5px solid #141414', borderRadius: 11, padding: '14px 18px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{c.label}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: c.isName ? 16 : 28, fontWeight: 500, color: c.color, letterSpacing: c.isName ? 0 : '-0.03em', lineHeight: 1.1 }}>{c.value}</div>
                  <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#555', marginTop: 4 }}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Revenue Trend Chart */}
            <div style={{ background: colors.base, border: '0.5px solid #141414', borderRadius: 11, padding: revenueData.length > 0 ? 24 : '16px 20px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: revenueData.length > 0 ? 20 : 0 }}>Revenue Trend</div>
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#141414" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#444' }} axisLine={{ stroke: '#1a1a1a' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#444' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="revenue" stroke={colors.gold} strokeWidth={2} dot={{ fill: colors.gold, r: 3 }} name="Revenue" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ border: '1px dashed #1a1a1a', borderRadius: 8, textAlign: 'center', padding: '14px 16px' }}>
                  <div style={{ color: '#333', fontSize: 12 }}>Once payments come through, your revenue trend will appear here</div>
                </div>
              )}
            </div>

            {/* Two-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Package Breakdown */}
              <div style={{ background: colors.base, border: '0.5px solid #141414', borderRadius: 11, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Top Packages</div>
                {topPackages.length > 0 ? (
                  <div style={{ display: 'flex', gap: 20 }}>
                    <div style={{ width: 140, height: 140 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={topPackages.slice(0, 5)} dataKey="total_revenue_ksh || count || 1" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2}>
                            {topPackages.slice(0, 5).map((_, i) => (
                              <Cell key={i} fill={[colors.gold, colors.blue, colors.green, colors.purple, colors.amber][i]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {topPackages.slice(0, 5).map((p: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '0.5px solid #0a0a0a', fontSize: 11 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: [colors.gold, colors.blue, colors.green, colors.purple, colors.amber][i], display: 'inline-block' }} />
                            <span style={{ color: '#ccc' }}>{p.name}</span>
                          </div>
                          <span style={{ fontFamily: 'DM Mono, monospace', color: '#e0e0e0' }}>{fmtKsh(p.total_revenue_ksh || p.price_ksh || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ border: '1px dashed #1a1a1a', borderRadius: 8, textAlign: 'center', padding: '20px 16px' }}>
                    <div style={{ color: '#333', fontSize: 12 }}>No package sales data yet</div>
                    <div style={{ fontSize: 10, color: '#1a1a1a', marginTop: 2 }}>Once customers buy, top packages appear here</div>
                  </div>
                )}
              </div>

              {/* Peak Hours Heatmap */}
              <div style={{ background: colors.base, border: '0.5px solid #141414', borderRadius: 11, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Session Density by Hour</div>
                <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '36px repeat(12, 1fr)', gap: 2, minWidth: 480 }}>
                    <div />
                    {[0,2,4,6,8,10,12,14,16,18,20,22].map(h => (
                      <div key={h} style={{ fontSize: 8, color: '#555', textAlign: 'center', padding: '2px 0', fontFamily: 'DM Mono, monospace' }}>
                        {String(h).padStart(2, '0')}
                      </div>
                    ))}
                    {dayLabels.map((day, di) => (
                      <>
                        <div key={`lbl-${di}`} style={{ fontSize: 9, color: '#666', padding: '4px 2px', fontFamily: 'DM Mono, monospace', display: 'flex', alignItems: 'center' }}>{day}</div>
                        {[0,2,4,6,8,10,12,14,16,18,20,22].map(h => {
                          const cell = peakHours.find(c => c.day === di && c.hour === h) || { value: 0 };
                          return (
                            <div key={`${di}-${h}`} style={{
                              aspectRatio: '1', borderRadius: 2,
                              background: getHeatColor(cell.value),
                              minHeight: 20,
                            }} title={`${day} ${String(h).padStart(2, '0')}:00 — ${cell.value} sessions`} />
                          );
                        })}
                      </>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'flex-end', fontSize: 9, color: '#666', fontFamily: 'DM Mono, monospace' }}>
                    <span>Fewer</span>
                    {['#0a0a0a','#0a1628','#1a3a6e','#2a5a9e','#3b82f6','#60a5fa'].map(c => (
                      <div key={c} style={{ width: 12, height: 12, borderRadius: 2, background: c }} />
                    ))}
                    <span>More</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
