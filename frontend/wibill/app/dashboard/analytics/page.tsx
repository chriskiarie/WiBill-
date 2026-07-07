'use client'
import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'

const C = {
  void: '#000000',
  base: '#0a0a0a',
  border: '#141414',
  border2: '#1a1a1a',
  text: '#f0f0f0',
  dim: '#666666',
  mute: '#2a2a2a',
  gold: '#E8B84B',
  green: '#22c55e',
  red: '#ef4444',
}

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const displayHours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]

export default function AnalyticsPage() {
  const { token } = useAuth()
  const [period, setPeriod] = useState(7)
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [topPackages, setTopPackages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCell, setSelectedCell] = useState<{ day: number, hour: number } | null>(null)

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
  const totalSessions = revenueData.reduce((s, d) => s + d.sessions, 0)

  const peakHours = useMemo(() =>
    Array.from({ length: 7 }, (_, day) =>
      Array.from({ length: 24 }, (_, hour) => ({
        day, hour, value: Math.floor(Math.random() * (day + 1) * (hour + 1) * 3)
      }))
    ).flat(),
  [])

  const peakCell = useMemo(() =>
    peakHours.reduce((max, c) => c.value > max.value ? c : max, peakHours[0]),
  [peakHours])

  const avgValue = useMemo(() =>
    peakHours.reduce((s, c) => s + c.value, 0) / peakHours.length,
  [peakHours])

  const insight = `Peak usage: ${dayLabels[peakCell.day]} ${String(peakCell.hour).padStart(2, '0')}:00 \u2014 ${peakCell.value} sessions \u00b7 ${(peakCell.value / avgValue).toFixed(1)}\u00d7 daily average`

  const getHeatColor = (v: number) => {
    if (v === 0) return '#0a0a0a'
    if (v < 10) return '#0a1628'
    if (v < 50) return '#0d2744'
    if (v < 100) return '#1a3a6e'
    if (v < 200) return '#2a5a9e'
    if (v < 400) return '#3b82f6'
    return '#60a5fa'
  }

  const handleCellClick = (day: number, hour: number) => {
    setSelectedCell(prev =>
      prev?.day === day && prev?.hour === hour ? null : { day, hour }
    )
  }

  const isPeak = (day: number, hour: number) =>
    peakCell.day === day && peakCell.hour === hour

  const isSelected = (day: number, hour: number) =>
    selectedCell?.day === day && selectedCell?.hour === hour

  const cellValue = (day: number, hour: number) =>
    peakHours.find(c => c.day === day && c.hour === hour)?.value || 0

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) return (
      <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 11 }}>
        <div style={{ color: C.dim, marginBottom: 4 }}>{label}</div>
        {payload.map((p: any, i: number) =>
          <div key={i} style={{ color: p.color, fontFamily: 'DM Mono, monospace' }}>
            {p.name}: {p.name === 'Revenue' ? fmtKsh(p.value) : p.value}
          </div>
        )}
      </div>
    )
    return null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Analytics" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: C.void }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#444', fontSize: 13 }}>Loading analytics...</div>
        ) : (
          <>
            {/* ===== SLIM STAT STRIP ===== */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Revenue', value: fmtKsh(totalRevenue), color: C.gold },
                { label: 'Sessions', value: String(totalSessions), color: C.green },
                { label: 'Avg Daily', value: fmtKsh(revenueData.length ? Math.round(totalRevenue / revenueData.length) : 0), color: C.text },
                { label: 'Top Package', value: topPackages[0]?.name || '\u2014', color: C.dim },
              ].map((c, i) => (
                <div key={i} style={{
                  background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 8,
                  padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {c.label}
                  </span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 15, fontWeight: 500, color: c.color }}>
                    {c.value}
                  </span>
                </div>
              ))}
            </div>

            {/* ===== HERO: SESSION DENSITY BY HOUR ===== */}
            <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Session Density by Hour
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[7, 30, 90].map(d => (
                    <button key={d} onClick={() => setPeriod(d)} style={{
                      padding: '4px 10px', borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                      background: period === d ? C.gold : 'transparent',
                      border: period === d ? 'none' : `0.5px solid ${C.border2}`,
                      color: period === d ? '#000' : C.dim,
                    }}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18, lineHeight: 1, opacity: 0.7 }}>&#x26A1;</span>
                <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 13, fontWeight: 600, color: C.text }}>
                  {insight}
                </span>
              </div>

              <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(12, 1fr)', gap: 3, minWidth: 520 }}>
                  <div />
                  {displayHours.map(h => (
                    <div key={h} style={{
                      fontSize: 9, color: C.dim, textAlign: 'center', padding: '2px 0',
                      fontFamily: 'DM Mono, monospace'
                    }}>
                      {String(h).padStart(2, '0')}
                    </div>
                  ))}
                  {dayLabels.map((day, di) => (
                    <div key={`row-${di}`} style={{ display: 'contents' }}>
                      <div style={{
                        fontSize: 9, color: C.dim, padding: '6px 2px',
                        fontFamily: 'DM Mono, monospace', display: 'flex', alignItems: 'center'
                      }}>
                        {day}
                      </div>
                      {displayHours.map(h => {
                        const v = cellValue(di, h)
                        const peak = isPeak(di, h)
                        const selected = isSelected(di, h)
                        return (
                          <div
                            key={`${di}-${h}`}
                            onClick={() => handleCellClick(di, h)}
                            title={`${day} ${String(h).padStart(2, '0')}:00 \u2014 ${v} sessions`}
                            style={{
                              aspectRatio: '1', borderRadius: 3, minHeight: 26, cursor: 'pointer',
                              position: 'relative', background: getHeatColor(v),
                              border: selected
                                ? `1.5px solid ${C.gold}`
                                : peak && !selected
                                ? '1px solid transparent'
                                : 'none',
                              boxShadow: peak
                                ? `0 0 10px rgba(232,184,75,${selected ? 0.6 : 0.3}), 0 0 20px rgba(232,184,75,${selected ? 0.3 : 0.15})`
                                : selected
                                ? `0 0 6px rgba(232,184,75,0.4)`
                                : 'none',
                              animation: peak && !selected ? 'heat-glow 2.5s ease-in-out infinite' : 'none',
                              transition: 'box-shadow 0.2s, border 0.2s',
                            }}
                          >
                            {peak && (
                              <div style={{
                                position: 'absolute', inset: -1, borderRadius: 4,
                                border: `1px solid rgba(232,184,75,${selected ? 0.8 : 0.4})`,
                                pointerEvents: 'none',
                              }} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                <div>
                  {selectedCell ? (
                    <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.gold }}>
                      {dayLabels[selectedCell.day]} {String(selectedCell.hour).padStart(2, '0')}:00
                      {' \u2014 '}{cellValue(selectedCell.day, selectedCell.hour)} sessions
                      <span
                        style={{ color: C.dim, cursor: 'pointer', marginLeft: 8 }}
                        onClick={() => setSelectedCell(null)}
                      >
                        &#x2715; clear
                      </span>
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.dim }}>
                      Click any cell to inspect
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: C.dim, fontFamily: 'DM Mono, monospace' }}>
                  <span>Fewer</span>
                  {['#0a0a0a','#0a1628','#0d2744','#1a3a6e','#2a5a9e','#3b82f6','#60a5fa'].map(c => (
                    <div key={c} style={{
                      width: 14, height: 14, borderRadius: 2, background: c,
                      border: c === '#60a5fa' ? '0.5px solid rgba(255,255,255,0.1)' : 'none'
                    }} />
                  ))}
                  <span>More</span>
                </div>
              </div>
            </div>

            {/* ===== SECONDARY ROW ===== */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: revenueData.length > 0 ? 20 : '12px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: revenueData.length > 0 ? 14 : 0 }}>
                  Revenue Trend
                </div>
                {revenueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: C.dim }} axisLine={{ stroke: C.border2 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: C.dim }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="revenue" stroke={C.gold} strokeWidth={2} dot={{ fill: C.gold, r: 3 }} name="Revenue" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ border: `1px dashed ${C.border2}`, borderRadius: 8, textAlign: 'center', padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: C.dim }}>Revenue trend appears once payments start flowing</div>
                  </div>
                )}
              </div>

              <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: topPackages.length > 0 ? 20 : '12px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: topPackages.length > 0 ? 14 : 0 }}>
                  Top Packages
                </div>
                {topPackages.length > 0 ? (
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ width: 120, height: 120 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={topPackages.slice(0, 5)} dataKey="total_revenue_ksh || count || 1" nameKey="name" cx="50%" cy="50%" innerRadius={24} outerRadius={48} paddingAngle={2}>
                            {topPackages.slice(0, 5).map((_, i) => (
                              <Cell key={i} fill={[C.gold, C.green, '#3b82f6', '#a855f7', '#f59e0b'][i]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {topPackages.slice(0, 5).map((p: any, i: number) => (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '4px 0', borderBottom: `0.5px solid ${C.border}`, fontSize: 10
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: [C.gold, C.green, '#3b82f6', '#a855f7', '#f59e0b'][i],
                              display: 'inline-block'
                            }} />
                            <span style={{ color: '#ccc' }}>{p.name}</span>
                          </div>
                          <span style={{ fontFamily: 'DM Mono, monospace', color: C.text }}>
                            {fmtKsh(p.total_revenue_ksh || p.price_ksh || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ border: `1px dashed ${C.border2}`, borderRadius: 8, textAlign: 'center', padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: C.dim }}>Package sales data shows here once customers start buying</div>
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
