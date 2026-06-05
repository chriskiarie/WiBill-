'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/context/ToastContext'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Package {
  id: string
  name: string
  price_ksh: number
  duration_hours: number
  duration_label: string
  max_devices: number
  is_active: boolean
  display_order: number
}

interface FormState {
  name: string
  price_ksh: string
  duration_hours: string
  duration_label: string
  max_devices: string
  display_order: string
}

const EMPTY_FORM: FormState = {
  name: '', price_ksh: '', duration_hours: '', duration_label: '',
  max_devices: '1', display_order: '0',
}

const PRESETS = [
  { label: '1 Hour',  duration_hours: 1,   duration_label: '1 Hour',  price_ksh: 20  },
  { label: '3 Hours', duration_hours: 3,   duration_label: '3 Hours', price_ksh: 50  },
  { label: '6 Hours', duration_hours: 6,   duration_label: '6 Hours', price_ksh: 80  },
  { label: '12 Hours',duration_hours: 12,  duration_label: '12 Hours',price_ksh: 150 },
  { label: '1 Day',   duration_hours: 24,  duration_label: '1 Day',   price_ksh: 200 },
  { label: '1 Week',  duration_hours: 168, duration_label: '1 Week',  price_ksh: 900 },
]

async function apiCall(path: string, token: string, method = 'GET', body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
  return data
}

function PackageModal({ pkg, token, onClose, onSaved }: {
  pkg: Package | null; token: string
  onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useToast()
  const isEdit = !!pkg
  const [form, setForm] = useState<FormState>(
    isEdit ? {
      name: pkg!.name,
      price_ksh: String(pkg!.price_ksh),
      duration_hours: String(pkg!.duration_hours),
      duration_label: pkg!.duration_label,
      max_devices: String(pkg!.max_devices),
      display_order: String(pkg!.display_order),
    } : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)

  const set = (k: keyof FormState) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const applyPreset = (p: typeof PRESETS[0]) => {
    setForm(f => ({
      ...f,
      duration_hours: String(p.duration_hours),
      duration_label: p.duration_label,
      price_ksh: String(p.price_ksh),
    }))
  }

  const save = async () => {
    if (!form.name || !form.price_ksh || !form.duration_hours || !form.duration_label) {
      showToast('Fill in all required fields', { type: 'error' }); return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        price_ksh: parseFloat(form.price_ksh),
        duration_hours: parseInt(form.duration_hours),
        duration_label: form.duration_label,
        max_devices: parseInt(form.max_devices) || 1,
        display_order: parseInt(form.display_order) || 0,
      }
      if (isEdit) {
        await apiCall(`/api/packages/${pkg!.id}`, token, 'PATCH', payload)
        showToast('Package updated', { type: 'success' })
      } else {
        await apiCall('/api/packages', token, 'POST', payload)
        showToast('Package created', { type: 'success' })
      }
      onSaved()
      onClose()
    } catch (err) {
      showToast((err as Error).message, { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const inp: React.CSSProperties = {
    background: '#0a0a0a', border: '0.5px solid #1e1e1e', borderRadius: 7,
    color: '#e0e0e0', fontFamily: 'DM Mono, monospace', fontSize: 13,
    padding: '9px 12px', width: '100%', boxSizing: 'border-box', outline: 'none',
  }
  const lbl: React.CSSProperties = {
    fontSize: 10, color: '#444', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.6px',
    display: 'block', marginBottom: 5,
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div style={{ background:'#0a0a0a', border:'0.5px solid #1e1e1e',
        borderRadius:13, padding:28, width:440, maxWidth:'94vw', maxHeight:'90vh', overflowY:'auto' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <span style={{ fontSize:14, fontWeight:700, color:'#f0f0f0' }}>
            {isEdit ? 'Edit package' : 'New package'}
          </span>
          <span onClick={onClose} style={{ color:'#333', fontSize:22, cursor:'pointer', lineHeight:1 }}>×</span>
        </div>

        {/* presets — only for new */}
        {!isEdit && (
          <div style={{ marginBottom:18 }}>
            <label style={lbl}>Quick preset</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => applyPreset(p)} style={{
                  padding:'5px 10px', borderRadius:6, fontSize:10, fontWeight:600,
                  cursor:'pointer', border:'0.5px solid',
                  borderColor: form.duration_label === p.duration_label ? '#3b82f6' : '#1a1a1a',
                  background: form.duration_label === p.duration_label ? '#06132a' : '#0d0d0d',
                  color: form.duration_label === p.duration_label ? '#60a5fa' : '#333',
                }}>
                  {p.label} · Ksh {p.price_ksh}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div style={{ gridColumn:'1/-1' }}>
            <label style={lbl}>Package name *</label>
            <input style={inp} placeholder="e.g. 1 Hour Browsing"
              value={form.name} onChange={e => set('name')(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Price (Ksh) *</label>
            <input style={inp} type="number" min={0}
              value={form.price_ksh} onChange={e => set('price_ksh')(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Duration (hours) *</label>
            <input style={inp} type="number" min={1}
              value={form.duration_hours} onChange={e => set('duration_hours')(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Duration label *</label>
            <input style={inp} placeholder="e.g. 1 Hour"
              value={form.duration_label} onChange={e => set('duration_label')(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Max devices</label>
            <input style={inp} type="number" min={1}
              value={form.max_devices} onChange={e => set('max_devices')(e.target.value)} />
          </div>
        </div>

        <div style={{ display:'flex', gap:10, marginTop:8 }}>
          <button onClick={onClose} style={{
            flex:1, padding:'10px', background:'transparent',
            border:'0.5px solid #1a1a1a', borderRadius:7,
            color:'#333', fontSize:11, fontWeight:600, cursor:'pointer',
          }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{
            flex:2, padding:'10px',
            background: saving ? '#0a1628' : '#3b82f6',
            border:'none', borderRadius:7,
            color: saving ? '#3b82f6' : '#030303',
            fontSize:11, fontWeight:700, cursor: saving ? 'not-allowed' : 'pointer',
            textTransform:'uppercase',
          }}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create package'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PackagesPage() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; pkg: Package | null }>({ open: false, pkg: null })
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      // Use authenticated /mine endpoint so tenant_id comes from JWT
      const data = await apiCall('/api/packages/mine', token)
      setPackages(Array.isArray(data) ? data : [])
    } catch (err) {
      showToast((err as Error).message, { type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [token, showToast])

  useEffect(() => { fetch_() }, [fetch_])

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return
    setDeleting(id)
    try {
      await apiCall(`/api/packages/${id}`, token!, 'DELETE')
      showToast(`"${name}" deleted`, { type: 'success' })
      setPackages(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      showToast((err as Error).message, { type: 'error' })
    } finally {
      setDeleting(null)
    }
  }

  const toggleActive = async (pkg: Package) => {
    try {
      await apiCall(`/api/packages/${pkg.id}`, token!, 'PATCH', { is_active: !pkg.is_active })
      setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, is_active: !p.is_active } : p))
      showToast(`${pkg.name} ${!pkg.is_active ? 'enabled' : 'disabled'}`, { type: 'success' })
    } catch (err) {
      showToast((err as Error).message, { type: 'error' })
    }
  }

  const mono: React.CSSProperties = { fontFamily: 'DM Mono, monospace' }
  const card: React.CSSProperties = {
    background:'#080808', border:'0.5px solid #141414', borderRadius:11,
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
      <Topbar title="Packages" />
      <div style={{ flex:1, overflowY:'auto', padding:'22px 28px', background:'#030303' }}>

        {/* header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#f0f0f0' }}>
              {packages.length} package{packages.length !== 1 ? 's' : ''}
            </div>
            <div style={{ ...mono, fontSize:10, color:'#2a2a2a', marginTop:2 }}>
              Customers see these on your captive portal
            </div>
          </div>
          <button
            onClick={() => setModal({ open: true, pkg: null })}
            style={{
              padding:'9px 18px', background:'#3b82f6', border:'none',
              borderRadius:8, color:'#030303', fontSize:11,
              fontWeight:700, cursor:'pointer', textTransform:'uppercase',
              letterSpacing:'0.3px',
            }}
          >
            + New package
          </button>
        </div>

        {loading ? (
          <LoadingSpinner size="md" label="Loading packages…" />
        ) : packages.length === 0 ? (
          <div style={{ ...card, padding:'60px 0', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>📦</div>
            <div style={{ fontSize:14, color:'#333', marginBottom:6 }}>No packages yet</div>
            <div style={{ ...mono, fontSize:11, color:'#1e1e1e', marginBottom:20 }}>
              Add packages for customers to buy on your portal
            </div>
            <button
              onClick={() => setModal({ open: true, pkg: null })}
              style={{
                padding:'9px 20px', background:'#3b82f6', border:'none',
                borderRadius:7, color:'#030303', fontSize:11, fontWeight:700, cursor:'pointer',
              }}
            >
              Create First Package
            </button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:10 }}>
            {packages
              .sort((a, b) => a.display_order - b.display_order)
              .map(pkg => (
              <div key={pkg.id} style={{
                ...card,
                padding:20, opacity: pkg.is_active ? 1 : 0.45,
                borderTop: `1.5px solid ${pkg.is_active ? '#3b82f6' : '#1e1e1e'}`,
                position:'relative',
              }}>
                {/* active toggle */}
                <div
                  onClick={() => toggleActive(pkg)}
                  title={pkg.is_active ? 'Click to disable' : 'Click to enable'}
                  style={{
                    position:'absolute', top:14, right:14,
                    width:28, height:16, borderRadius:8, cursor:'pointer',
                    background: pkg.is_active ? '#3b82f6' : '#1a1a1a',
                    transition:'background 0.2s',
                  }}
                >
                  <div style={{
                    width:12, height:12, borderRadius:'50%', background:'#fff',
                    position:'absolute', top:2,
                    left: pkg.is_active ? 14 : 2,
                    transition:'left 0.2s',
                  }} />
                </div>

                <div style={{ fontSize:14, fontWeight:700, color:'#f0f0f0', marginBottom:6, paddingRight:36 }}>
                  {pkg.name}
                </div>
                <div style={{ ...mono, fontSize:22, fontWeight:500, color:'#3b82f6', marginBottom:10 }}>
                  Ksh {pkg.price_ksh.toLocaleString()}
                </div>
                <div style={{ display:'flex', gap:12, marginBottom:16 }}>
                  <span style={{ ...mono, fontSize:10, color:'#444' }}>
                    ⏱ {pkg.duration_label}
                  </span>
                  <span style={{ ...mono, fontSize:10, color:'#444' }}>
                    📱 {pkg.max_devices} device{pkg.max_devices !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button
                    onClick={() => setModal({ open: true, pkg })}
                    style={{
                      flex:1, padding:'7px', background:'#0a0a0a',
                      border:'0.5px solid #1e1e1e', borderRadius:6,
                      color:'#3b82f6', fontSize:10, fontWeight:700,
                      cursor:'pointer', textTransform:'uppercase',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => del(pkg.id, pkg.name)}
                    disabled={deleting === pkg.id}
                    style={{
                      padding:'7px 14px', background:'transparent',
                      border:'0.5px solid #2a0a0a', borderRadius:6,
                      color:'#f87171', fontSize:10, fontWeight:700,
                      cursor: deleting === pkg.id ? 'not-allowed' : 'pointer',
                      textTransform:'uppercase',
                    }}
                  >
                    {deleting === pkg.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal.open && (
        <PackageModal
          pkg={modal.pkg}
          token={token!}
          onClose={() => setModal({ open: false, pkg: null })}
          onSaved={fetch_}
        />
      )}
    </div>
  )
}