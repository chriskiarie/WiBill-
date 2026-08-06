'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { Plus, Wifi, MapPin, Users, DollarSign, Activity, X, Power, PowerOff, RefreshCw, Router, Eye, ExternalLink } from 'lucide-react'

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

type Hotspot = {
  id: number
  name: string
  location: string
  activeUsers: number
  totalUsers: number
  status: 'online' | 'offline' | 'disabled'
  revenue: number
  ip?: string
  serverName?: string
  uptime?: string
}

const initialHotspots: Hotspot[] = [
  { id: 1, name: 'Downtown Tower', location: 'Nairobi CBD', activeUsers: 47, totalUsers: 120, status: 'online', revenue: 58400, ip: '192.168.88.1', serverName: 'hotspot1', uptime: '12d 4h' },
  { id: 2, name: 'Westlands Hub', location: 'Westlands, Nairobi', activeUsers: 32, totalUsers: 85, status: 'online', revenue: 39200, ip: '192.168.88.1', serverName: 'hotspot2', uptime: '8d 2h' },
  { id: 3, name: 'Eastlands Node', location: 'Eastlands, Nairobi', activeUsers: 18, totalUsers: 60, status: 'online', revenue: 21500, ip: '10.0.0.1', serverName: 'hotspot3', uptime: '3d 17h' },
  { id: 4, name: 'Kilimani Spot', location: 'Kilimani, Nairobi', activeUsers: 0, totalUsers: 40, status: 'offline', revenue: 12800, ip: '10.0.0.2', serverName: 'hotspot4' },
  { id: 5, name: 'Karen Hotspot', location: 'Karen, Nairobi', activeUsers: 12, totalUsers: 35, status: 'disabled', revenue: 9800, ip: '192.168.88.1', serverName: 'hotspot5' },
]

export default function HotspotsPage() {
  const { token } = useAuth()
  const [hotspots, setHotspots] = useState<Hotspot[]>(initialHotspots)
  const [selected, setSelected] = useState<Hotspot | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({ name: '', location: '', ip: '', serverName: 'hotspot1' })

  const totalRevenue = hotspots.reduce((s, h) => s + h.revenue, 0)
  const totalActive = hotspots.reduce((s, h) => s + h.activeUsers, 0)
  const onlineCount = hotspots.filter(h => h.status === 'online').length

  const toggleStatus = (id: number) => {
    setHotspots(prev => prev.map(h => {
      if (h.id !== id) return h
      const next: Hotspot['status'] = h.status === 'online' ? 'offline' : h.status === 'offline' ? 'disabled' : 'online'
      return { ...h, status: next }
    }))
    if (selected?.id === id) {
      setSelected(prev => prev ? { ...prev, status: hotspots.find(h => h.id === id)?.status === 'online' ? 'offline' as const : 'online' as const } : null)
    }
  }

  const statusColor = (s: Hotspot['status']) => s === 'online' ? C.green : s === 'offline' ? C.red : C.dim
  const statusLabel = (s: Hotspot['status']) => s === 'online' ? 'Online' : s === 'offline' ? 'Offline' : 'Disabled'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Hotspots" />
      <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', background: C.void }}>
        {/* Quick stats */}
        <div className="grid-4" style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Hotspots', value: String(hotspots.length), color: C.text, icon: Wifi },
            { label: 'Online', value: String(onlineCount), color: C.green, icon: Activity },
            { label: 'Active Users', value: String(totalActive), color: C.gold, icon: Users },
            { label: 'Total Revenue', value: `Ksh ${totalRevenue.toLocaleString()}`, color: C.green, icon: DollarSign },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'var(--theme-surface)', backdropFilter: 'blur(20px)',
              borderRadius: 12, border: '1px solid var(--theme-border)',
              padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--theme-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500, color: s.color }}>{s.value}</div>
              </div>
              <s.icon size={18} color={C.dim} style={{ opacity: 0.4 }} />
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--theme-dim)' }}>
            {hotspots.filter(h => h.status === 'online').length} online / {hotspots.length} total
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowAddForm(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: C.gold, color: '#000', fontWeight: 600,
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, cursor: 'pointer',
            }}>
              <Plus size={14} /> Add Hotspot
            </button>
          </div>
        </div>

        {/* Hotspot cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {hotspots.map(h => {
            const isSelected = selected?.id === h.id
            return (
            <div key={h.id} className="hotspot-card" style={{
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              background: 'var(--theme-card-base)',
              borderRadius: 10, border: isSelected ? '1.5px solid var(--theme-gold)' : '1px solid var(--theme-border)',
              padding: '14px 20px', cursor: 'pointer',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              boxShadow: isSelected ? '0 0 0 1px color-mix(in srgb, var(--theme-gold) 15%, transparent), 0 0 20px color-mix(in srgb, var(--theme-gold) 6%, transparent)' : 'none',
            }}
              onClick={() => setSelected(h)}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--theme-border2)' }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--theme-border)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: h.status === 'online' ? 'rgba(34,197,94,0.12)' : h.status === 'offline' ? 'rgba(239,68,68,0.12)' : 'rgba(107,114,128,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Wifi size={16} color={statusColor(h.status)} />
                </div>
                <div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: C.text }}>{h.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <MapPin size={11} color={C.dim} />
                    <span style={{ fontSize: 12, color: C.dim }}>{h.location}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Users</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: C.text }}>{h.activeUsers}<span style={{ color: C.dim, fontSize: 12 }}>/{h.totalUsers}</span></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Revenue</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: C.gold }}>Ksh {h.revenue.toLocaleString()}</div>
                </div>
                <div
                  onClick={e => { e.stopPropagation(); toggleStatus(h.id) }}
                  title={`Click to ${h.status === 'online' ? 'disable' : h.status === 'offline' ? 'disable' : 'enable'}`}
                  style={{
                    padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
                    background: h.status === 'online' ? 'rgba(34,197,94,0.1)' : h.status === 'offline' ? 'rgba(239,68,68,0.1)' : 'rgba(107,114,128,0.1)',
                    fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                    color: statusColor(h.status),
                  }}>
                  {h.status === 'online' ? <Power size={10} /> : h.status === 'disabled' ? <PowerOff size={10} /> : <PowerOff size={10} />}
                  {statusLabel(h.status)}
                </div>
                <Eye size={14} color={selected?.id === h.id ? C.gold : C.dim} style={{ opacity: selected?.id === h.id ? 0.9 : 0.5 }} />
              </div>
            </div>
          )})}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{
            marginTop: 16, position: 'relative', overflow: 'hidden',
            background: 'var(--theme-card-base)',
            borderRadius: 12, border: '1px solid var(--theme-border)',
            padding: 20, animation: 'fade-in 0.2s ease',
          }}>
            {/* Status ribbon */}
            <div style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: 5,
              background: statusColor(selected.status),
              transition: 'background 0.3s',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: C.text }}>{selected.name}</h2>
                  <span style={{
                    padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                    background: selected.status === 'online' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    color: statusColor(selected.status),
                  }}>
                    {statusLabel(selected.status)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: C.dim, fontSize: 13 }}>
                  <MapPin size={13} /> {selected.location}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => toggleStatus(selected.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 6, border: '1px solid var(--theme-border)',
                  background: 'transparent', color: C.text, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>
                  {selected.status === 'online' ? <PowerOff size={13} /> : <Power size={13} />}
                  {selected.status === 'online' ? 'Disable' : 'Enable'}
                </button>
                <a href="/dashboard/mikrotik" style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 6, border: 'none',
                  background: C.gold, color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  textDecoration: 'none', fontFamily: "'Space Grotesk', sans-serif",
                }}>
                  <Router size={13} /> MikroTik
                </a>
                <button onClick={() => setSelected(null)} style={{
                  width: 32, height: 32, borderRadius: 6, border: 'none',
                  background: 'transparent', color: C.dim, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="grid-4" style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Server', value: selected.serverName || '—' },
                { label: 'Router IP', value: selected.ip || '—' },
                { label: 'Active Users', value: String(selected.activeUsers) },
                { label: 'Total Users', value: String(selected.totalUsers) },
                { label: 'Revenue', value: `Ksh ${selected.revenue.toLocaleString()}`, color: C.gold },
                { label: 'Uptime', value: selected.uptime || '—' },
              ].map((d, i) => (
                <div key={i} style={{ background: 'var(--theme-card-base)', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>{d.label}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 500, color: (d as any).color || C.text }}>{d.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => toggleStatus(selected.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 7, border: '1px solid var(--theme-border)',
                background: 'transparent', color: C.text, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>
        )}

        {/* Add form modal */}
        {showAddForm && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} onClick={() => setShowAddForm(false)}>
            <div className="hotspot-modal" style={{
              width: 400, background: 'var(--theme-card-base)',
              border: '1px solid var(--theme-border)', borderRadius: 14, padding: 24,
            }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: C.text }}>Add Hotspot</h3>
                <button onClick={() => setShowAddForm(false)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>
              {(['name', 'location', 'ip', 'serverName'] as const).map(f => (
                <div key={f} style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>{f === 'serverName' ? 'Server Name' : f.charAt(0).toUpperCase() + f.slice(1)}</label>
                  <input value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                    style={{
                      width: '100%', height: 36, borderRadius: 7, border: '1px solid var(--theme-border)',
                      background: 'var(--theme-bg)', color: 'var(--theme-text)', padding: '0 10px',
                      fontSize: 12, fontFamily: "'DM Mono', monospace", outline: 'none',
                    }} />
                </div>
              ))}
              <button onClick={() => {
                const newHotspot: Hotspot = {
                  id: Math.max(...hotspots.map(h => h.id)) + 1,
                  name: form.name || `Hotspot ${hotspots.length + 1}`,
                  location: form.location || '—',
                  activeUsers: 0, totalUsers: 0, status: 'online', revenue: 0,
                  ip: form.ip, serverName: form.serverName,
                }
                setHotspots(prev => [...prev, newHotspot])
                setShowAddForm(false)
                setForm({ name: '', location: '', ip: '', serverName: 'hotspot1' })
              }} style={{
                width: '100%', height: 38, borderRadius: 7, border: 'none',
                background: C.gold, color: '#000', fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Space Grotesk', sans-serif", fontSize: 12,
              }}>
                Create Hotspot
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
