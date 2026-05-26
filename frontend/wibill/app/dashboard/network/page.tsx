'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import Topbar from '@/components/Topbar'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const MOCK_EVENTS = [
  { id:'1', status:'DEGRADED', latency_ms: null, checked_at: new Date(Date.now()-120000).toISOString() },
  { id:'2', status:'UP', latency_ms: 12, checked_at: new Date(Date.now()-180000).toISOString() },
  { id:'3', status:'UP', latency_ms: 18, checked_at: new Date(Date.now()-240000).toISOString() },
  { id:'4', status:'DOWN', latency_ms: null, checked_at: new Date(Date.now()-600000).toISOString() },
  { id:'5', status:'UP', latency_ms: 9, checked_at: new Date(Date.now()-900000).toISOString() },
]

function ago(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  return `${Math.floor(diff/3600)}h ago`
}

export default function NetworkPage() {
  const { token, user } = useAuth()
  const [status, setStatus] = useState<any>({ status: 'unknown' })
  const [events, setEvents] = useState<any[]>(MOCK_EVENTS)

  useEffect(() => {
    if (!token) return
    const tid = user?.tenant_id
    if (!tid) return
    fetch(`${API}/api/tenants/${tid}/network-status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then(d => { if (d) setStatus(d) }).catch(() => {})
    fetch(`${API}/api/tenants/${tid}/network-events?limit=20`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then(d => { if (d?.length) setEvents(d) }).catch(() => {})
  }, [token])

  const isUp = status.status === 'up' || status.status === 'UP'
  const isDeg = status.status === 'degraded' || status.status === 'DEGRADED'
  const color = isUp ? '#22c55e' : isDeg ? '#f59e0b' : '#f87171'
  const bg = isUp ? '#030d06' : isDeg ? '#0a0700' : '#0d0303'
  const border = isUp ? '#082214' : isDeg ? '#1a1000' : '#220808'

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
      <Topbar title="Network" networkUp={isUp} latency={status.latency_ms} />
      <div style={{ flex:1, overflowY:'auto', padding:'22px 28px', background:'#030303' }}>
        {/* Status card */}
        <div style={{ background:bg, border:`0.5px solid ${border}`, borderRadius:12, padding:24, marginBottom:20, display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:48, height:48, borderRadius:12, background:'rgba(0,0,0,0.3)', border:`0.5px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div className="pulse" style={{ width:16, height:16, borderRadius:'50%', background:color }} />
          </div>
          <div>
            <div style={{ fontFamily:'DM Mono, monospace', fontSize:13, fontWeight:500, color, letterSpacing:'0.3px' }}>
              {isUp ? 'NETWORK OPERATIONAL' : isDeg ? 'NETWORK DEGRADED' : 'NETWORK DOWN'}
            </div>
            <div style={{ fontSize:11, color:'#2a2a2a', marginTop:4, fontFamily:'DM Mono, monospace' }}>
              {status.latency_ms ? `${status.latency_ms}ms latency` : 'No response'} · polled every 60s
            </div>
          </div>
          <div style={{ marginLeft:'auto', fontFamily:'DM Mono, monospace', fontSize:10, color:'#1e1e1e' }}>
            {status.checked_at ? ago(status.checked_at) : 'Never polled'}
          </div>
        </div>

        {/* Event log */}
        <div style={{ background:'#080808', border:'0.5px solid #141414', borderRadius:11, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'0.5px solid #101010', fontFamily:'Syne, sans-serif', fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.3px' }}>
            Network Event Log
          </div>
          {events.map((e, i) => {
            const c = e.status === 'UP' ? '#22c55e' : e.status === 'DEGRADED' ? '#f59e0b' : '#f87171'
            return (
              <div key={e.id || i} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 18px', borderBottom: i < events.length - 1 ? '0.5px solid #0a0a0a' : 'none' }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:c, flexShrink:0 }} />
                <span style={{ fontFamily:'DM Mono, monospace', fontSize:11, color:c, fontWeight:500, width:90 }}>{e.status}</span>
                <span style={{ fontFamily:'DM Mono, monospace', fontSize:11, color:'#1e1e1e', flex:1 }}>
                  {e.latency_ms ? `${e.latency_ms}ms` : 'No response'}
                </span>
                <span style={{ fontFamily:'DM Mono, monospace', fontSize:10, color:'#1a1a1a' }}>{ago(e.checked_at)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
