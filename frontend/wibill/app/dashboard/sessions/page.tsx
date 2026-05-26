'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import Topbar from '@/components/Topbar'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function Countdown({ expires_at }: { expires_at: string }) {
  const [left, setLeft] = useState('')
  const [crit, setCrit] = useState(false)
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(expires_at).getTime() - Date.now()) / 1000))
      const h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60), s = diff % 60
      setCrit(diff < 300)
      setLeft(h > 0 ? `${h}h ${String(m).padStart(2,'0')}m` : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [expires_at])
  return <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 500, color: crit ? '#f87171' : '#22c55e' }}>{left || '—'}</span>
}

export default function SessionsPage() {
  const { token } = useAuth()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/sessions/?status=active`, { headers: { Authorization: `Bearer ${token}` } })
      if (r.ok) setSessions(await r.json())
      else setSessions(MOCK_SESSIONS)
    } catch { setSessions(MOCK_SESSIONS) }
    setLoading(false)
  }

  useEffect(() => { if (token) load() }, [token])

  const kick = async (id: string) => {
    if (!confirm('Terminate this user\'s session?')) return
    await fetch(`${API}/api/sessions/${id}/terminate`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    setSessions(s => s.filter(x => x.id !== id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Live Sessions" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: '#030303' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#252525' }}>{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</div>
          <button onClick={load} style={{ background: '#0a0a0a', border: '0.5px solid #1a1a1a', borderRadius: 7, padding: '7px 14px', color: '#333', fontFamily: 'Syne, sans-serif', fontSize: 11, cursor: 'pointer' }}>Refresh</button>
        </div>
        <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr auto', gap: 0 }}>
            {['MAC ADDRESS', 'PHONE', 'PACKAGE', 'IP', 'TIME LEFT', ''].map((h, i) => (
              <div key={i} style={{ padding: '11px 16px', fontSize: 9, fontWeight: 700, color: '#1e1e1e', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '0.5px solid #101010' }}>{h}</div>
            ))}
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#1e1e1e' }}>Loading sessions…</div>
          ) : sessions.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#1e1e1e' }}>No active sessions</div>
          ) : sessions.map((s, i) => (
            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr auto', borderBottom: i < sessions.length - 1 ? '0.5px solid #0d0d0d' : 'none' }}>
              <div style={{ padding: '13px 16px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#333' }}>{s.mac_address || '—'}</div>
              <div style={{ padding: '13px 16px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#2a2a2a' }}>{s.phone_number?.replace(/(\d{3})\d{4}(\d{3})/, '$1••••$2') || '—'}</div>
              <div style={{ padding: '13px 16px', fontSize: 11, color: '#222' }}>{s.package_id?.slice(0, 8) || '—'}</div>
              <div style={{ padding: '13px 16px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#222' }}>{s.ip_address || '—'}</div>
              <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center' }}><Countdown expires_at={s.expires_at} /></div>
              <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center' }}>
                <button onClick={() => kick(s.id)} style={{ background: 'transparent', border: '0.5px solid #1e1e1e', borderRadius: 6, padding: '4px 10px', color: '#2a2a2a', fontSize: 10, cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>Kick</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const MOCK_SESSIONS = [
  { id: '1', mac_address: 'AA:BB:CC:11:22:33', phone_number: '0712345456', package_id: '1hr', ip_address: '192.168.1.10', expires_at: new Date(Date.now() + 42*60000).toISOString() },
  { id: '2', mac_address: 'DD:EE:FF:44:55:66', phone_number: '0798123012', package_id: '6hr', ip_address: '192.168.1.11', expires_at: new Date(Date.now() + 258*60000).toISOString() },
  { id: '3', mac_address: '11:22:33:AA:BB:CC', phone_number: '0723456789', package_id: '24hr', ip_address: '192.168.1.12', expires_at: new Date(Date.now() + 1265*60000).toISOString() },
  { id: '4', mac_address: '77:88:99:DD:EE:FF', phone_number: '0745678321', package_id: '1hr', ip_address: '192.168.1.13', expires_at: new Date(Date.now() + 4*60000).toISOString() },
]
