'use client'
import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { HeatmapCell, type CellData } from '@/components/HeatmapCell'
import './heatmap-card.css'

const C = {
  void: 'var(--theme-bg)',
  base: 'var(--theme-card-base)',
  border: 'var(--theme-border)',
  border2: 'var(--theme-border2)',
  text: 'var(--theme-text)',
  dim: 'var(--theme-dim)',
  mute: 'var(--theme-mute)',
  gold: 'var(--theme-gold)',
  green: 'var(--theme-green)',
  red: 'var(--theme-red)',
}

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const displayHours = Array.from({ length: 24 }, (_, i) => i)
const labelHours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]

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

  const maxSessions = useMemo(() =>
    peakHours.reduce((max, c) => Math.max(max, c.value), 0),
  [peakHours])

  const insight = `Peak usage: ${dayLabels[peakCell.day]} ${String(peakCell.hour).padStart(2, '0')}:00`
  const isPeak = (day: number, hour: number) => peakCell.day === day && peakCell.hour === hour
  const isSelected = (day: number, hour: number) => selectedCell?.day === day && selectedCell?.hour === hour
  const cellValue = (day: number, hour: number) => peakHours.find(c => c.day === day && c.hour === hour)?.value || 0

  const handleCellSelect = (data: CellData) => {
    const dayIndex = dayLabels.indexOf(data.day)
    setSelectedCell(prev =>
      prev?.day === dayIndex && prev?.hour === data.hour ? null : { day: dayIndex, hour: data.hour }
    )
  }

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
      <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', background: C.void }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--theme-text-muted)', fontSize: 13 }}>Loading analytics...</div>
        ) : (
          <>
            {/* ===== SLIM STAT STRIP ===== */}
            <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Revenue', value: fmtKsh(totalRevenue), color: C.gold },
                { label: 'Sessions', value: String(totalSessions), color: C.green },
                { label: 'Avg Daily', value: fmtKsh(revenueData.length ? Math.round(totalRevenue / revenueData.length) : 0), color: C.text },
                { label: 'Top Package', value: topPackages[0]?.name, color: C.dim },
              ].map((c, i) => (
                <div key={i} className="glass-card" style={{
                  padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {c.label}
                  </span>
                  {c.label === 'Top Package' && !c.value ? (
                    <span style={{ color: C.dim, fontSize: 10 }}>No sales yet</span>
                  ) : (
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 15, fontWeight: 500, color: c.color }}>
                      {c.value}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* ===== HERO: SESSION DENSITY BY HOUR ===== */}
            <div className="glass-card heatmap-hero" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[7, 30, 90].map(d => (
                    <button key={d} onClick={() => setPeriod(d)} style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 600, cursor: 'pointer',
                      background: period === d ? C.gold : 'transparent',
                      border: period === d ? 'none' : `0.5px solid ${C.border2}`,
                      color: period === d ? '#000' : C.dim,
                      fontFamily: 'DM Mono, monospace',
                    }}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              <div className="heatmap-insight">
                <span>&#x26A1;</span>
                <span>
                  {insight}
                  {' \u2014 '}<span className="value">{peakCell.value}</span> sessions
                  {' \u00b7 '}{(peakCell.value / avgValue).toFixed(1)}&times; daily average
                </span>
              </div>

              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
              <div className="grid-wrap" style={{ display: 'grid', gridTemplateColumns: '40px repeat(24, 1fr)', gap: 4, minWidth: 600 }}>
                  <div />
                  {displayHours.map(h => (
                    <div key={h} className="heatmap-hour-label" style={{ textAlign: 'center', padding: '2px 0' }}>
                      {labelHours.includes(h) ? String(h).padStart(2, '0') : ''}
                    </div>
                  ))}
                  {dayLabels.map((day, di) => (
                    <div key={`row-${di}`} style={{ display: 'contents' }}>
                      <div className="heatmap-day-label" style={{ padding: '6px 2px', display: 'flex', alignItems: 'center' }}>
                        {day}
                      </div>
                      {displayHours.map(h => (
                        <HeatmapCell
                          key={`${di}-${h}`}
                          data={{
                            day,
                            hour: h,
                            sessions: cellValue(di, h),
                            maxSessions,
                            isPeak: isPeak(di, h),
                          }}
                          selected={isSelected(di, h)}
                          onSelect={handleCellSelect}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                <div>
                  {selectedCell ? (
                    <div className="cell-selection-chip">
                      {dayLabels[selectedCell.day]} {String(selectedCell.hour).padStart(2, '0')}:00
                      {' \u2014 '}{cellValue(selectedCell.day, selectedCell.hour)} sessions
                      <button onClick={() => setSelectedCell(null)}>&#x2715; clear</button>
                    </div>
                  ) : (
                    <span className="heatmap-hour-label">Click any cell to inspect</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: C.dim, fontFamily: 'DM Mono, monospace' }}>
                  <span>Fewer</span>
                  <div style={{ width: 14, height: 14, borderRadius: 2, background: 'rgb(var(--hfr),var(--hfg),var(--hfb))', border: '0.5px solid rgba(255,255,255,0.05)' }} />
                  <div style={{ width: 14, height: 14, borderRadius: 2, background: '#3a2f13', border: '0.5px solid rgba(255,255,255,0.05)' }} />
                  <div style={{ width: 14, height: 14, borderRadius: 2, background: '#665521', border: '0.5px solid rgba(255,255,255,0.05)' }} />
                  <div style={{ width: 14, height: 14, borderRadius: 2, background: '#997c30', border: '0.5px solid rgba(255,255,255,0.05)' }} />
                  <div style={{ width: 14, height: 14, borderRadius: 2, background: '#e8b84b', border: '0.5px solid rgba(232,184,75,0.3)' }} />
                  <span>More</span>
                </div>
              </div>
            </div>

            {/* ===== SECONDARY ROW ===== */}
            <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
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

              <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                  Top Packages
                </div>
                {topPackages.length > 0 ? (
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ width: 120, height: 120 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={topPackages.slice(0, 5)} dataKey="total_revenue_ksh || count || 1" nameKey="name" cx="50%" cy="50%" innerRadius={24} outerRadius={48} paddingAngle={2}>
                            {topPackages.slice(0, 5).map((_, i) => (
                              <Cell key={i} fill={[C.gold, C.green, 'rgba(232,184,75,0.6)', 'rgba(232,184,75,0.3)', 'rgba(232,184,75,0.15)'][i]} />
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
                              background: [C.gold, C.green, 'rgba(232,184,75,0.6)', 'rgba(232,184,75,0.3)', 'rgba(232,184,75,0.15)'][i],
                              display: 'inline-block'
                            }} />
                            <span style={{ color: 'var(--theme-text)' }}>{p.name}</span>
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
