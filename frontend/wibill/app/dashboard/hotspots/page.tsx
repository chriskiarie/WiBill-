'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import Topbar from '@/components/Topbar'
import { Plus, Wifi, MapPin, Users, DollarSign, Activity } from 'lucide-react'

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

const mockHotspots = [
  { id: 1, name: 'Downtown Tower', location: 'Nairobi CBD', activeUsers: 47, totalUsers: 120, status: 'online', revenue: 58400 },
  { id: 2, name: 'Westlands Hub', location: 'Westlands, Nairobi', activeUsers: 32, totalUsers: 85, status: 'online', revenue: 39200 },
  { id: 3, name: 'Eastlands Node', location: 'Eastlands, Nairobi', activeUsers: 18, totalUsers: 60, status: 'online', revenue: 21500 },
  { id: 4, name: 'Kilimani Spot', location: 'Kilimani, Nairobi', activeUsers: 0, totalUsers: 40, status: 'offline', revenue: 12800 },
  { id: 5, name: 'Karen Hotspot', location: 'Karen, Nairobi', activeUsers: 12, totalUsers: 35, status: 'online', revenue: 9800 },
]

export default function HotspotsPage() {
  const { token } = useAuth()

  const totalRevenue = mockHotspots.reduce((s, h) => s + h.revenue, 0)
  const totalActive = mockHotspots.reduce((s, h) => s + h.activeUsers, 0)
  const onlineCount = mockHotspots.filter(h => h.status === 'online').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Hotspots" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: C.void }}>
        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Hotspots', value: String(mockHotspots.length), color: C.text, icon: Wifi },
            { label: 'Online', value: String(onlineCount), color: C.green, icon: Activity },
            { label: 'Active Users', value: String(totalActive), color: C.gold, icon: Users },
            { label: 'Total Revenue', value: `Ksh ${totalRevenue.toLocaleString()}`, color: C.green, icon: DollarSign },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.035)', backdropFilter: 'blur(20px)',
              borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
              padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500, color: s.color }}>{s.value}</div>
              </div>
              <s.icon size={18} color={C.dim} style={{ opacity: 0.4 }} />
            </div>
          ))}
        </div>

        {/* Add button + list */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: C.gold, color: '#000', fontWeight: 600,
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, cursor: 'pointer',
          }}>
            <Plus size={14} /> Add Hotspot
          </button>
        </div>

        {/* Hotspot cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mockHotspots.map(h => (
            <div key={h.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.025)', backdropFilter: 'blur(20px)',
              borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
              padding: '14px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: h.status === 'online' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Wifi size={16} color={h.status === 'online' ? C.green : C.red} />
                </div>
                <div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: C.text }}>{h.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <MapPin size={10} color={C.dim} />
                    <span style={{ fontSize: 11, color: C.dim, fontFamily: 'Inter, sans-serif' }}>{h.location}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Users</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: C.text }}>{h.activeUsers}<span style={{ color: C.dim, fontSize: 11 }}>/{h.totalUsers}</span></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Revenue</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: C.gold }}>Ksh {h.revenue.toLocaleString()}</div>
                </div>
                <div style={{
                  padding: '3px 10px', borderRadius: 20,
                  background: h.status === 'online' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  fontSize: 10, fontWeight: 600,
                  color: h.status === 'online' ? C.green : C.red,
                  fontFamily: 'Inter, sans-serif',
                }}>
                  {h.status === 'online' ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
