'use client'
import { Bell, Search } from 'lucide-react'
import { useAuth } from '@/lib/auth'

interface Props { title: string; networkUp?: boolean; latency?: number }

export default function Topbar({ title, networkUp = true, latency = 0 }: Props) {
  const { user } = useAuth()
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'IS'
  return (
    <header style={{
      height: 60, minHeight: 60, background: '#040404',
      borderBottom: '0.5px solid #111',
      display: 'flex', alignItems: 'center', padding: '0 28px', gap: 14,
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, letterSpacing: '-1px', color: '#fff', lineHeight: 1 }}>{title}</span>
      <div style={{ flex: 1 }} />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: networkUp ? '#030d06' : '#0d0303',
        border: `0.5px solid ${networkUp ? '#0a2214' : '#220a0a'}`,
        borderRadius: 20, padding: '5px 14px',
        fontFamily: 'DM Mono, monospace', fontSize: 10,
        color: networkUp ? '#22c55e' : '#f87171', fontWeight: 500,
      }}>
        <span className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: networkUp ? '#22c55e' : '#f87171', display: 'inline-block' }} />
        {networkUp ? `NETWORK UP${latency ? ` · ${latency}ms` : ''}` : 'NETWORK DOWN'}
      </div>
      <div style={{ width: 34, height: 34, background: '#0a0a0a', border: '0.5px solid #161616', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <Search size={15} color="#2a2a2a" />
      </div>
      <div style={{ width: 34, height: 34, background: '#0a0a0a', border: '0.5px solid #161616', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
        <Bell size={15} color="#2a2a2a" />
        <span style={{ position: 'absolute', top: 7, right: 7, width: 5, height: 5, background: '#3b82f6', borderRadius: '50%', border: '1.5px solid #040404' }} />
      </div>
      <div style={{ width: 34, height: 34, background: '#06132a', border: '0.5px solid #1a3a6e', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 500, color: '#3b82f6', cursor: 'pointer' }}>{initials}</div>
    </header>
  )
}
