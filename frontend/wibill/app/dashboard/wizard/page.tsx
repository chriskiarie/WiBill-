'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import {
  Palette, LayoutTemplate, Settings,
  Save, Check, RefreshCw, Download,
  Plus, RotateCcw, Clock, FileDown, QrCode,
  ChevronLeft, ChevronRight, Wifi,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const STYLE_PRESETS = [
  { p: 0, n: 'Dark Indigo', f: 'Unbounded', bg:'#0c0c1a', hd:'#5b4fff', ac:'#5b4fff', cd:'rgba(255,255,255,.06)' },
  { p: 1, n: 'Sunset Orange', f: 'Bebas Neue', bg:'#fff7ed', hd:'#f97316', ac:'#f97316', cd:'#ffffff' },
  { p: 2, n: 'Sky Blue', f: 'Playfair Display', bg:'#f0f9ff', hd:'#0ea5e9', ac:'#0ea5e9', cd:'#ffffff' },
  { p: 3, n: 'Forest Green', f: 'Zilla Slab', bg:'#052e16', hd:'#16a34a', ac:'#16a34a', cd:'rgba(255,255,255,.07)' },
  { p: 4, n: 'Rose', f: 'Dancing Script', bg:'#fff1f2', hd:'#f43f5e', ac:'#f43f5e', cd:'#ffffff' },
  { p: 5, n: 'Slate', f: 'JetBrains Mono', bg:'#f8fafc', hd:'#1e293b', ac:'#1e293b', cd:'#ffffff' },
  { p: 6, n: 'Amber', f: 'Bangers', bg:'#fffbeb', hd:'#b45309', ac:'#b45309', cd:'#ffffff' },
  { p: 7, n: 'Purple', f: 'Orbitron', bg:'#faf5ff', hd:'#7c3aed', ac:'#7c3aed', cd:'#ffffff' },
]

const TEMPLATE_PALETTE_REC: Record<string, number> = {
  dashboard: 0, spotlight: 1, split: 5, bento: 7,
}

const TEMPLATES = [
  { id: 'dashboard', label: 'Dashboard', sub: 'Compact grid · Modal', icon: LayoutTemplate },
  { id: 'spotlight', label: 'Spotlight', sub: 'Hero header · Premium', icon: Wifi },
  { id: 'split', label: 'Split', sub: 'Split-screen · Brand', icon: ChevronRight },
  { id: 'bento', label: 'Bento', sub: 'Asymmetric · Apple-style', icon: ChevronLeft },
]

type Tab = 'template' | 'brand' | 'style' | 'export'

const TABS: { id: Tab; icon: any; label: string }[] = [
  { id: 'template', icon: LayoutTemplate, label: 'Template' },
  { id: 'brand', icon: Settings, label: 'Brand' },
  { id: 'style', icon: Palette, label: 'Style' },
  { id: 'export', icon: Download, label: 'Export' },
]

export default function PortalWizard() {
  const router = useRouter()
  const { user, token } = useAuth()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [tab, setTab] = useState<Tab>('template')
  const [tpl, setTpl] = useState('dashboard')
  const [palette, setPalette] = useState(0)
  const [font, setFont] = useState('Unbounded')
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [location, setLocation] = useState('')
  const [emoji, setEmoji] = useState('📡')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [toastMsg, setToastMsg] = useState('')
  const [loadingConfig, setLoadingConfig] = useState(true)

  const toast = (m: string) => { setToastMsg(m); setTimeout(() => setToastMsg(''), 3200) }

  const snaps = STYLE_PRESETS.find(sp => sp.p === palette)
  const previewUrl = `/${tpl}.html?palette=${palette}&font=${encodeURIComponent(font)}`

  useEffect(() => {
    const savedToken = localStorage.getItem('wb_token')
    if (!savedToken) { router.replace('/login'); return }
    const role = localStorage.getItem('wb_role')
    if (role === 'platform_admin') { router.replace('/admin'); return }
  }, [router])

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(`${API}/api/portal-config`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          if (data.portal_config) {
            const pc = data.portal_config
            if (pc.template_id) setTpl(pc.template_id)
            if (pc.brand) {
              if (pc.brand.name) setName(pc.brand.name)
              if (pc.brand.tagline) setTagline(pc.brand.tagline)
              if (pc.brand.location) setLocation(pc.brand.location)
              if (pc.brand.emoji) setEmoji(pc.brand.emoji)
              if (pc.brand.support_phone) setPhone(pc.brand.support_phone)
            }
            if (pc.typography?.font_family) setFont(pc.typography.font_family)
            if (pc.theme?.primary_color) {
              const match = STYLE_PRESETS.find(sp =>
                sp.hd.toLowerCase() === pc.theme.primary_color.toLowerCase()
              )
              if (match) {
                setPalette(match.p)
                setFont(pc.typography?.font_family || match.f)
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to load config:', e)
      } finally {
        setLoadingConfig(false)
      }
    }
    if (token) loadConfig()
  }, [token])

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('wb_portal_draft', JSON.stringify({ tpl, palette, font, name, tagline, location, emoji, phone }))
    }, 1000)
    return () => clearTimeout(timer)
  }, [tpl, palette, font, name, tagline, location, emoji, phone])

  function buildConfig() {
    return {
      template_id: tpl,
      brand: { name, tagline, location, emoji, support_phone: phone, logo_url: null },
      theme: {
        primary_color: snaps?.hd || '#5b4fff',
        secondary_color: snaps?.bg || '#0c0c1a',
        accent_color: snaps?.ac || '#5b4fff',
        background_type: 'solid',
        background_value: snaps?.bg || '#0c0c1a',
        gradient: null,
        background_url: null,
        overlay_opacity: 0.4,
        overlay_color: '#000000',
        button_style: 'rounded',
        button_gradient: null,
      },
      typography: {
        font_family: font,
        heading_size: 36,
        body_size: 16,
        font_weight: 600,
        letter_spacing: 0.5,
        heading_case: 'normal',
      },
      card: { style: 'glass', radius: 16, elevation: 0, size: 'compact' },
      layout: { sections: ['hero', 'logo', 'packages', 'footer'], banner_position: 'top' },
      components: {
        hero: true, logo: true, welcome_text: true, packages: true,
        promo_banner: false, countdown: false,
        reviews: false, qr_code: false, social_links: false, faq: false,
        terms: true, footer: true,
        saved_number_login: true,
        session_timer: true,
        terms_checkbox: false,
        share_button: false,
      },
      animations: { entrance: 'fade-in', floating_logo: false, particles: false, pulse_button: false, ripple: false },
      network_awareness: { show_status_banner: false, custom_status_message: '' },
      enabled_features: {
        mpesa_stk: true,
        card_payments: false,
        vouchers: true,
        sms_receipts: false,
      },
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/portal-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(buildConfig()),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      toast('Portal saved successfully!')
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error('Save failed:', e)
      toast('Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleExportZip() {
    setExporting(true)
    try {
      const res = await fetch(`${API}/api/portal/export/zip`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'portal.zip'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setExporting(false)
    }
  }

  async function handleExportQR() {
    try {
      const res = await fetch(`${API}/api/portal/export/qr-poster`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('QR export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'qr_poster.html'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('QR export failed:', e)
    }
  }

  async function loadSnapshots() {
    try {
      const res = await fetch(`${API}/api/portal-config/snapshots`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSnapshots(data.snapshots || [])
      }
    } catch {}
  }

  async function createSnapshot() {
    const tag = prompt('Name this version (e.g., "Christmas 2026"):')
    if (!tag) return
    try {
      const res = await fetch(`${API}/api/portal-config/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ version_tag: tag }),
      })
      if (res.ok) loadSnapshots()
    } catch {}
  }

  async function restoreSnapshot(id: string) {
    if (!confirm('Restore this version? Current changes will be overwritten.')) return
    try {
      const res = await fetch(`${API}/api/portal-config/snapshots/${id}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const pc = data.portal_config
        if (pc.template_id) setTpl(pc.template_id)
        if (pc.brand) {
          setName(pc.brand.name || '')
          setTagline(pc.brand.tagline || '')
          setLocation(pc.brand.location || '')
          setEmoji(pc.brand.emoji || '📡')
          setPhone(pc.brand.support_phone || '')
        }
        if (pc.typography?.font_family) setFont(pc.typography.font_family)
        loadSnapshots()
      }
    } catch {}
  }

  useEffect(() => { if (tab === 'export') loadSnapshots() }, [tab])

  if (loadingConfig) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: '#000', color: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: '#E8B84B' }} />
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#000', color: '#f0f0f0', overflow: 'hidden' }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ─── Left: Tabs + Panel ─── */}
      <div style={{ width: 360, background: '#0a0a0a', borderRight: '1px solid #141414', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* Tab Bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #141414', padding: '0 4px' }}>
          {TABS.map(t => {
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: '12px 0 10px', background: 'transparent', border: 'none',
                borderBottom: active ? '2px solid #E8B84B' : '2px solid transparent',
                color: active ? '#E8B84B' : '#666', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
              }}>
                <t.icon size={16} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Panel Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>

          {/* ── Template Tab ── */}
          {tab === 'template' && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#666', marginBottom: 16 }}>
                Choose a template
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {TEMPLATES.map(t => {
                  const active = tpl === t.id
                  return (
                    <button key={t.id} onClick={() => setTpl(t.id)} style={{
                      background: active ? '#141414' : '#050505',
                      border: active ? '1px solid #E8B84B' : '1px solid #1a1a1a',
                      borderRadius: 12, padding: 14, cursor: 'pointer',
                      textAlign: 'left', transition: 'all 0.2s',
                      boxShadow: active ? '0 0 16px rgba(232,184,75,0.15)' : 'none',
                    }}>
                      <t.icon size={20} style={{ color: active ? '#E8B84B' : '#666', marginBottom: 8 }} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: active ? '#f0f0f0' : '#999', marginBottom: 2 }}>{t.label}</div>
                      <div style={{ fontSize: 10, color: '#555' }}>{t.sub}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Brand Tab ── */}
          {tab === 'brand' && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#666', marginBottom: 16 }}>
                Brand Identity
              </div>

              {/* Live Brand Preview */}
              <div style={{
                background: snaps?.bg || '#0c0c1a', borderRadius: 14, padding: '16px 14px',
                textAlign: 'center', marginBottom: 20, border: '1px solid rgba(255,255,255,0.08)',
                minHeight: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                <div style={{ fontSize: 28, lineHeight: 1 }}>{emoji || '📡'}</div>
                <div style={{ fontFamily: `'${font}',sans-serif`, fontSize: 20, fontWeight: 700, color: snaps?.hd ? '#e8e6ff' : '#e8e6ff', letterSpacing: -0.3 }}>{name || 'Your WiFi'}</div>
                <div style={{ fontSize: 12, color: 'rgba(232,230,255,0.5)' }}>{tagline || 'Tagline'}</div>
                {location && <div style={{ fontSize: 10, color: 'rgba(232,230,255,0.4)', marginTop: 2 }}>{location}</div>}
              </div>

              {/* Fields */}
              {[
                { label: 'WiFi Name', value: name, set: setName, placeholder: 'Vertex WiFi' },
                { label: 'Tagline', value: tagline, set: setTagline, placeholder: 'Fast, reliable internet' },
                { label: 'Location', value: location, set: setLocation, placeholder: 'Nairobi, Kenya' },
                { label: 'Support Phone', value: phone, set: setPhone, placeholder: '+254 700 123 456' },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4 }}>{f.label}</div>
                  <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #141414', borderRadius: 10, fontSize: 14, fontFamily: 'Inter, sans-serif', color: '#f0f0f0', background: '#000', outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#E8B84B'}
                    onBlur={e => e.currentTarget.style.borderColor = '#141414'}
                  />
                </div>
              ))}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4 }}>Brand Emoji</div>
                <input value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={4}
                  style={{ width: 80, padding: '10px', border: '1px solid #141414', borderRadius: 10, fontSize: 20, textAlign: 'center', color: '#f0f0f0', background: '#000', outline: 'none' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#E8B84B'}
                  onBlur={e => e.currentTarget.style.borderColor = '#141414'}
                />
              </div>
            </div>
          )}

          {/* ── Style Tab ── */}
          {tab === 'style' && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#666', marginBottom: 8 }}>
                Palette & Font
              </div>
              <p style={{ fontSize: 12, color: '#666', marginBottom: 16, lineHeight: 1.4 }}>
                Each preset bundles a color palette and a heading font.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {STYLE_PRESETS.map(sp => {
                  const active = palette === sp.p
                  return (
                    <button key={sp.p} onClick={() => { setPalette(sp.p); setFont(sp.f) }} style={{
                      border: active ? '1px solid #fff' : '1px solid #1a1a1a',
                      borderRadius: 12, padding: 14, cursor: 'pointer', textAlign: 'center',
                      background: active ? '#0a0a0a' : '#050505',
                      boxShadow: active ? '0 0 16px rgba(255,255,255,0.2), 0 0 0 1px #fff' : 'none',
                      transform: active ? 'translateY(-2px) scale(1.02)' : 'none',
                      transition: 'all 0.25s cubic-bezier(.34,1.56,.64,1)',
                    }}>
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 10 }}>
                        {[sp.bg, sp.hd, sp.ac, sp.cd].map((c, i) => (
                          <div key={i} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.1)' }} />
                        ))}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f0f0', marginBottom: 2 }}>
                        {sp.n}
                        {TEMPLATE_PALETTE_REC[tpl] === sp.p && (
                          <span style={{ display: 'block', fontSize: 9, color: '#E8B84B', fontWeight: 600, marginTop: 2 }}>
                            ★ Recommended
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: '#666', fontFamily: `'${sp.f}',sans-serif`, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', display: 'inline-block' }}>
                        {sp.f}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Export Tab ── */}
          {tab === 'export' && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#666', marginBottom: 16 }}>
                Export & Versions
              </div>
              <button onClick={handleExportZip} disabled={exporting} style={{
                width: '100%', padding: '14px 0', borderRadius: 10, border: '1px solid #E8B84B',
                background: 'rgba(232,184,75,0.1)', color: '#E8B84B', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {exporting ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <FileDown size={16} />}
                {exporting ? 'Generating...' : 'Download MikroTik ZIP'}
              </button>
              <button onClick={handleExportQR} style={{
                width: '100%', padding: '14px 0', borderRadius: 10, border: '1px solid #141414',
                background: '#0a0a0a', color: '#666', cursor: 'pointer',
                fontSize: 13, fontWeight: 500, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <QrCode size={16} />
                Download QR Poster
              </button>

              <div style={{ borderTop: '1px solid #141414', paddingTop: 20 }}>
                <button onClick={createSnapshot} style={{
                  width: '100%', padding: '12px 0', borderRadius: 10, border: '1px solid #141414',
                  background: '#0a0a0a', color: '#f0f0f0', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <Plus size={16} />
                  Save Current as Version
                </button>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#666', marginBottom: 12 }}>
                  Saved Versions
                </div>
                {snapshots.length === 0 && (
                  <p style={{ fontSize: 12, color: '#555', textAlign: 'center', padding: 20 }}>No versions saved yet.</p>
                )}
                {snapshots.map((s: any) => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: 12,
                    borderRadius: 8, background: '#0a0a0a', marginBottom: 8, border: '1px solid #141414',
                  }}>
                    <Clock size={14} style={{ color: '#2a2a2a', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{s.version_tag}</div>
                      <div style={{ fontSize: 10, color: '#555' }}>{new Date(s.created_at).toLocaleDateString()}</div>
                    </div>
                    <button onClick={() => restoreSnapshot(s.id)} style={{
                      padding: '4px 10px', borderRadius: 6, border: '1px solid #141414',
                      background: 'transparent', color: '#666', cursor: 'pointer', fontSize: 10,
                    }}>
                      <RotateCcw size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Save Bar */}
        <div style={{ padding: 12, borderTop: '1px solid #141414' }}>
          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
            background: saved ? '#22c55e' : '#E8B84B',
            color: '#000', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.3s', fontFamily: 'Inter, sans-serif',
          }}>
            {saving ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <Check size={16} /> : <Save size={16} />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {/* ─── Right: Phone Preview ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#000' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px', borderBottom: '1px solid #141414', background: '#0a0a0a' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f0' }}>
            {TEMPLATES.find(t => t.id === tpl)?.label || 'Portal'} — {snaps?.n || 'Custom'}
          </span>
        </div>

        {/* Phone Frame */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'hidden' }}>
          <div style={{
            width: 320, borderRadius: 36, background: '#111', padding: 10,
            boxShadow: '0 0 0 1px #2a2a2a, 0 25px 60px rgba(0,0,0,0.6)', position: 'relative',
          }}>
            {/* Notch */}
            <div style={{
              position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
              width: 64, height: 7, background: '#111', borderRadius: 99, zIndex: 10, border: '1px solid #2a2a2a',
            }} />
            {/* Screen */}
            <div style={{ width: 300, height: 650, borderRadius: 26, overflow: 'hidden', background: '#000', position: 'relative' }}>
              <div style={{ width: 375, height: 812, transformOrigin: 'top left', transform: 'scale(0.8)' }}>
                <iframe
                  key={`${tpl}-${palette}-${font}`}
                  ref={iframeRef}
                  src={previewUrl}
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                  title="Portal Preview"
                />
              </div>
            </div>
            {/* Home indicator */}
            <div style={{ height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 120, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', color: '#f0f0f0', padding: '12px 24px', borderRadius: 99, fontSize: 14, fontWeight: 500, zIndex: 200, transition: 'all 0.3s', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', whiteSpace: 'nowrap', border: '1px solid #2a2a2a', bottom: toastMsg ? 24 : -80 }}>
        {toastMsg}
      </div>
    </div>
  )
}
