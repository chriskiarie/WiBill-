'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import Topbar from '@/components/Topbar'
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const MOCK = [
  { id:'1', name:'Quick Hour', price_ksh:20, duration_hours:1, duration_label:'1 Hour', max_devices:1, is_active:true },
  { id:'2', name:'Half Day', price_ksh:50, duration_hours:6, duration_label:'6 Hours', max_devices:2, is_active:true },
  { id:'3', name:'Full Day', price_ksh:100, duration_hours:24, duration_label:'24 Hours', max_devices:3, is_active:true },
  { id:'4', name:'Weekly Pass', price_ksh:500, duration_hours:168, duration_label:'7 Days', max_devices:5, is_active:false },
]

export default function PackagesPage() {
  const { token } = useAuth()
  const [pkgs, setPkgs] = useState<any[]>(MOCK)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name:'', price_ksh:'', duration_hours:'', duration_label:'', max_devices:'1' })

  useEffect(() => {
    if (!token) return
    fetch(`${API}/api/packages/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.length) setPkgs(d) })
      .catch(() => {})
  }, [token])

  const toggle = async (pkg: any) => {
    await fetch(`${API}/api/packages/${pkg.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !pkg.is_active }) }).catch(() => {})
    setPkgs(p => p.map(x => x.id === pkg.id ? { ...x, is_active: !x.is_active } : x))
  }

  const del = async (id: string) => {
    if (!confirm('Delete this package?')) return
    await fetch(`${API}/api/packages/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    setPkgs(p => p.filter(x => x.id !== id))
  }

  const create = async (e: any) => {
    e.preventDefault()
    const body = { name: form.name, price_ksh: +form.price_ksh, duration_hours: +form.duration_hours, duration_label: form.duration_label || `${form.duration_hours}h`, max_devices: +form.max_devices }
    const res = await fetch(`${API}/api/packages/`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null)
    const d = res?.ok ? await res.json() : null
    setPkgs(p => [...p, d || { ...body, id: Date.now().toString(), is_active: true }])
    setModal(false); setForm({ name:'', price_ksh:'', duration_hours:'', duration_label:'', max_devices:'1' })
  }

  const inp: React.CSSProperties = { width:'100%', background:'#060606', border:'0.5px solid #1a1a1a', borderRadius:8, padding:'11px 14px', color:'#f0f0f0', fontFamily:'DM Mono, monospace', fontSize:12, outline:'none' }
  const lbl: React.CSSProperties = { fontSize:10, color:'#333', fontWeight:700, letterSpacing:'0.5px', marginBottom:5, display:'block', textTransform:'uppercase' }

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
      <Topbar title="Packages" />
      <div style={{ flex:1, overflowY:'auto', padding:'22px 28px', background:'#030303' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontFamily:'DM Mono, monospace', fontSize:11, color:'#252525' }}>{pkgs.filter(p=>p.is_active).length} active · {pkgs.length} total</div>
          <button onClick={() => setModal(true)} style={{ display:'flex', alignItems:'center', gap:7, background:'#3b82f6', border:'none', borderRadius:8, padding:'9px 16px', color:'#fff', fontFamily:'Syne, sans-serif', fontSize:12, fontWeight:700, cursor:'pointer' }}>
            <Plus size={13} /> New Package
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
          {pkgs.map(pkg => (
            <div key={pkg.id} style={{ background:'#080808', border:`0.5px solid ${pkg.is_active ? '#141414' : '#0d0d0d'}`, borderRadius:11, padding:20, opacity: pkg.is_active ? 1 : 0.5 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color: pkg.is_active ? '#f0f0f0' : '#333' }}>{pkg.name}</div>
                  <div style={{ fontSize:10, color:'#1e1e1e', marginTop:3, fontFamily:'DM Mono, monospace' }}>{pkg.duration_label}</div>
                </div>
                <div style={{ fontFamily:'DM Mono, monospace', fontSize:20, fontWeight:500, color:'#3b82f6', letterSpacing:'-0.5px' }}>Ksh {pkg.price_ksh}</div>
              </div>
              <div style={{ fontSize:10, color:'#222', marginBottom:16, fontFamily:'DM Mono, monospace' }}>
                {pkg.duration_hours}h · {pkg.max_devices} device{pkg.max_devices > 1 ? 's' : ''}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => toggle(pkg)} style={{ display:'flex', alignItems:'center', gap:5, flex:1, justifyContent:'center', background:'#0a0a0a', border:'0.5px solid #1a1a1a', borderRadius:7, padding:'7px', color: pkg.is_active ? '#22c55e' : '#333', fontSize:10, cursor:'pointer', fontFamily:'DM Mono, monospace' }}>
                  {pkg.is_active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                  {pkg.is_active ? 'Active' : 'Disabled'}
                </button>
                <button onClick={() => del(pkg.id)} style={{ background:'#0a0a0a', border:'0.5px solid #1a1a1a', borderRadius:7, padding:'7px 10px', color:'#2a2a2a', cursor:'pointer', display:'flex', alignItems:'center' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'#080808', border:'0.5px solid #1a1a1a', borderRadius:14, padding:28, width:420 }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, color:'#fff', marginBottom:22 }}>New Package</div>
            <form onSubmit={create} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div><label style={lbl}>Package Name</label><input style={inp} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Quick Hour" required /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div><label style={lbl}>Price (Ksh)</label><input style={inp} type="number" value={form.price_ksh} onChange={e=>setForm(f=>({...f,price_ksh:e.target.value}))} placeholder="20" required /></div>
                <div><label style={lbl}>Duration (hours)</label><input style={inp} type="number" value={form.duration_hours} onChange={e=>setForm(f=>({...f,duration_hours:e.target.value}))} placeholder="1" required /></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div><label style={lbl}>Label</label><input style={inp} value={form.duration_label} onChange={e=>setForm(f=>({...f,duration_label:e.target.value}))} placeholder="1 Hour" /></div>
                <div><label style={lbl}>Max Devices</label><input style={inp} type="number" value={form.max_devices} onChange={e=>setForm(f=>({...f,max_devices:e.target.value}))} /></div>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:6 }}>
                <button type="button" onClick={()=>setModal(false)} style={{ flex:1, background:'#0a0a0a', border:'0.5px solid #1a1a1a', borderRadius:8, padding:'11px', color:'#333', fontFamily:'Syne, sans-serif', fontSize:12, cursor:'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex:1, background:'#3b82f6', border:'none', borderRadius:8, padding:'11px', color:'#fff', fontFamily:'Syne, sans-serif', fontSize:12, fontWeight:700, cursor:'pointer' }}>Create Package</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
