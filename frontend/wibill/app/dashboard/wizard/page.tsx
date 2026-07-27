'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import {
  Palette, LayoutTemplate, Settings, Type,
  Save, Check, RefreshCw, Download,
  Plus, RotateCcw, Clock, FileDown, QrCode,
  ChevronLeft, ChevronRight, Wifi,
  Briefcase, Building, Crown, Anchor, Waves,
  Gamepad2, Cpu, Film, Paintbrush, Sunset, Gem,
  Snowflake, Apple, Box, Flower2, TreePine, Star,
  Palette as PaletteIcon, Moon as MoonIcon, Coffee, Upload,
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
  'executive-dark': 0, 'executive-light': 5, 'premium-hotel': 1,
}

const TEMPLATES = [
  { id: 'executive-dark', name: 'Executive Dark', category: 'business', desc: 'Premium dark theme for corporate ISPs', badge: 'Popular', icon: Briefcase, colors: { bg: '#0f0f1a', header: '#E8B84B', card: '#1a1a2e', accent: '#f0c27a', text: '#f0f0f0' } },
  { id: 'executive-light', name: 'Executive Light', category: 'business', desc: 'Clean light theme for professional services', badge: 'New', icon: Building, colors: { bg: '#ffffff', header: '#2D3436', card: '#f0f0f0', accent: '#0984e3', text: '#1d1d1f' } },
  { id: 'premium-hotel', name: 'Premium Hotel', category: 'business', desc: 'Luxurious theme for hotels and resorts', badge: 'Trending', icon: Crown, colors: { bg: '#1a1410', header: '#C9A96E', card: '#2d2318', accent: '#e8d5a3', text: '#f0e8d8' } },
  { id: 'modern-isp', name: 'Modern ISP', category: 'business', desc: 'Bold theme for tech-forward ISPs', badge: 'Popular', icon: Wifi, colors: { bg: '#0d1117', header: '#00E676', card: '#161b22', accent: '#58a6ff', text: '#f0f0f0' } },
  { id: 'corporate-blue', name: 'Corporate Blue', category: 'business', desc: 'Trustworthy blue theme for enterprise', badge: null, icon: Anchor, colors: { bg: '#1e1e2f', header: '#1a73e8', card: '#252540', accent: '#8ab4f8', text: '#e0e0e0' } },
  { id: 'ocean-deep', name: 'Ocean Deep', category: 'business', desc: 'Deep blue ocean inspired calm theme', badge: null, icon: Waves, colors: { bg: '#03045E', header: '#0077B6', card: '#023E8A', accent: '#00B4D8', text: '#e0f0ff' } },
  { id: 'gaming-neon', name: 'Gaming Neon', category: 'entertainment', desc: 'Cyberpunk neon theme for gaming zones', badge: 'Trending', icon: Gamepad2, colors: { bg: '#0a001a', header: '#ff00ff', card: '#150030', accent: '#00ffff', text: '#f0f0ff' } },
  { id: 'cyberpunk', name: 'Cyberpunk', category: 'entertainment', desc: 'Dark futuristic theme with vibrant accents', badge: null, icon: Cpu, colors: { bg: '#0d0d0d', header: '#ff6b35', card: '#1a1a1a', accent: '#ffd700', text: '#f0f0f0' } },
  { id: 'streaming-portal', name: 'Streaming Portal', category: 'entertainment', desc: 'Netflix-inspired dark theme', badge: 'Popular', icon: Film, colors: { bg: '#141414', header: '#e50914', card: '#1f1f1f', accent: '#ffffff', text: '#f0f0f0' } },
  { id: 'rgb-wave', name: 'RGB Wave', category: 'entertainment', desc: 'Colorful RGB theme for tech events', badge: 'New', icon: Paintbrush, colors: { bg: '#0a0a1a', header: '#ff0080', card: '#150030', accent: '#7000ff', text: '#f0f0ff' } },
  { id: 'sunset-vibes', name: 'Sunset Vibes', category: 'entertainment', desc: 'Warm sunset gradient theme', badge: null, icon: Sunset, colors: { bg: '#1a0a0a', header: '#FF6B6B', card: '#2d1b1b', accent: '#FFE66D', text: '#f0e8e0' } },
  { id: 'midnight-purple', name: 'Midnight Purple', category: 'entertainment', desc: 'Deep purple theme for premium lounges', badge: null, icon: Gem, colors: { bg: '#0d0015', header: '#9b59b6', card: '#1a0028', accent: '#f1c40f', text: '#f0e8ff' } },
  { id: 'glass-morphism', name: 'Glass', category: 'minimal', desc: 'Modern glassmorphism design', badge: 'Popular', icon: Snowflake, colors: { bg: '#0f172a', header: '#ffffff', card: 'rgba(255,255,255,0.06)', accent: '#60a5fa', text: '#f0f0f0' } },
  { id: 'apple-style', name: 'Apple Style', category: 'minimal', desc: 'Clean Apple-inspired minimal design', badge: null, icon: Apple, colors: { bg: '#f5f5f7', header: '#1d1d1f', card: '#ffffff', accent: '#0071e3', text: '#1d1d1f' } },
  { id: 'material-design', name: 'Material', category: 'minimal', desc: 'Google Material Design 3 inspired', badge: null, icon: Box, colors: { bg: '#1c1b1f', header: '#6750A4', card: '#2b2930', accent: '#D0BCFF', text: '#e6e1e5' } },
  { id: 'clean-white', name: 'Clean White', category: 'minimal', desc: 'Bright and clean white theme', badge: null, icon: Box, colors: { bg: '#ffffff', header: '#333333', card: '#f5f5f5', accent: '#4A90D9', text: '#1a1a1a' } },
  { id: 'cherry-blossom', name: 'Cherry Blossom', category: 'minimal', desc: 'Soft pink theme with elegance', badge: 'New', icon: Flower2, colors: { bg: '#1a1014', header: '#FFB7C5', card: '#2d1a20', accent: '#d4a0a0', text: '#f0e8ec' } },
  { id: 'kenyan-gold', name: 'Kenyan Gold', category: 'local', desc: 'Celebrate Kenya with gold and black', badge: 'Popular', icon: Star, colors: { bg: '#0a0a0a', header: '#DAA520', card: '#1a1400', accent: '#FFD700', text: '#f0e8c8' } },
  { id: 'safari', name: 'Safari', category: 'local', desc: 'Earthy tones inspired by the savannah', badge: null, icon: TreePine, colors: { bg: '#2a1f14', header: '#C4873B', card: '#3a2d1e', accent: '#E8B84B', text: '#f0e8d8' } },
  { id: 'afro-modern', name: 'Afro Modern', category: 'local', desc: 'Bold African patterns meets modern design', badge: 'New', icon: PaletteIcon, colors: { bg: '#1a0f0a', header: '#E85D26', card: '#2d1a10', accent: '#F5A623', text: '#f0e8d8' } },
  { id: 'nairobi-night', name: 'Nairobi Night', category: 'local', desc: 'City lights inspired dark theme', badge: null, icon: MoonIcon, colors: { bg: '#0a0a14', header: '#6C3EB8', card: '#15152a', accent: '#B388FF', text: '#e8e0f0' } },
  { id: 'coffee-shop', name: 'Coffee Shop', category: 'local', desc: 'Warm brown theme perfect for cafes', badge: 'New', icon: Coffee, colors: { bg: '#1C1512', header: '#D4A574', card: '#2d2018', accent: '#8B5E3C', text: '#f0e8d8' } },
]

const CATEGORIES = [
  { id: 'business', name: '💼 Business' },
  { id: 'entertainment', name: '🎮 Entertainment' },
  { id: 'minimal', name: '◻️ Minimal' },
  { id: 'local', name: '🌍 Local' },
]

const FONT_CATEGORIES: Record<string, { name: string; fonts: string[] }> = {
  corporate: { name: 'Clean', fonts: ['Inter', 'Roboto', 'Open Sans', 'Space Grotesk'] },
  luxury: { name: 'Serif', fonts: ['Playfair Display', 'DM Serif Display', 'Libre Baskerville'] },
  modern: { name: 'Modern', fonts: ['Manrope', 'Sora', 'Outfit', 'Unbounded'] },
  tech: { name: 'Tech', fonts: ['Orbitron', 'Exo 2', 'Rajdhani', 'JetBrains Mono'] },
}

const BRAND_ICONS = ['📶', '📡', '🌐', '⚡', '🔒', '🚀', '💻', '📱', '🎯', '⭐', '🔥', '💎', '🌊', '🏔️', '🎨', '🎵', '🌈', '🦁', '🌴', '🍕', '🛡️', '🎪']

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<Tab>('template')
  const [activeCategory, setActiveCategory] = useState('business')
  const [tpl, setTpl] = useState('executive-dark')
  const [palette, setPalette] = useState(0)
  const [font, setFont] = useState('Unbounded')
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [location, setLocation] = useState('')
  const [emoji, setEmoji] = useState('📡')
  const [phone, setPhone] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#5b4fff')
  const [secondaryColor, setSecondaryColor] = useState('#0c0c1a')
  const [accentColor, setAccentColor] = useState('#5b4fff')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [toastMsg, setToastMsg] = useState('')
  const [loadingConfig, setLoadingConfig] = useState(true)

  const toast = (m: string) => { setToastMsg(m); setTimeout(() => setToastMsg(''), 3200) }
  const snaps = STYLE_PRESETS.find(sp => sp.p === palette)
  const filteredTemplates = TEMPLATES.filter(t => t.category === activeCategory)

  const sel = TEMPLATES.find(t => t.id === tpl)
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
              if (pc.brand.logo_url) setLogoUrl(pc.brand.logo_url)
            }
            if (pc.typography?.font_family) setFont(pc.typography.font_family)
            if (pc.theme) {
              if (pc.theme.primary_color) setPrimaryColor(pc.theme.primary_color)
              if (pc.theme.secondary_color) setSecondaryColor(pc.theme.secondary_color)
              if (pc.theme.accent_color) setAccentColor(pc.theme.accent_color)
              const match = STYLE_PRESETS.find(sp => sp.hd.toLowerCase() === pc.theme.primary_color.toLowerCase())
              if (match) { setPalette(match.p); setFont(pc.typography?.font_family || match.f) }
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
      localStorage.setItem('wb_portal_draft', JSON.stringify({ tpl, palette, font, name, tagline, location, emoji, phone, primaryColor, secondaryColor, accentColor, logoUrl }))
    }, 1000)
    return () => clearTimeout(timer)
  }, [tpl, palette, font, name, tagline, location, emoji, phone, primaryColor, secondaryColor, accentColor, logoUrl, palette])

  function buildConfig() {
    return {
      template_id: tpl,
      palette_index: palette,
      brand: { name, tagline, location, emoji, support_phone: phone, logo_url: logoUrl },
      theme: {
        primary_color: primaryColor || snaps?.hd || '#5b4fff',
        secondary_color: secondaryColor || snaps?.bg || '#0c0c1a',
        accent_color: accentColor || snaps?.ac || '#5b4fff',
        background_type: 'solid', background_value: secondaryColor || snaps?.bg || '#0c0c1a',
        gradient: null, background_url: null,
        overlay_opacity: 0.4, overlay_color: '#000000',
        button_style: 'rounded', button_gradient: null,
      },
      typography: { font_family: font, heading_size: 36, body_size: 16, font_weight: 600, letter_spacing: 0.5, heading_case: 'normal' },
      card: { style: 'glass', radius: 16, elevation: 0, size: 'compact' },
      layout: { sections: ['hero', 'logo', 'packages', 'footer'], banner_position: 'top' },
      components: { hero: true, logo: true, welcome_text: true, packages: true, promo_banner: false, countdown: false, reviews: false, qr_code: false, social_links: false, faq: false, terms: true, footer: true, saved_number_login: true, session_timer: true, terms_checkbox: false, share_button: false },
      animations: { entrance: 'fade-in', floating_logo: false, particles: false, pulse_button: false, ripple: false },
      network_awareness: { show_status_banner: false, custom_status_message: '' },
      enabled_features: { mpesa_stk: true, card_payments: false, vouchers: true, sms_receipts: false },
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
      setSaved(true); toast('Portal saved successfully!')
      setTimeout(() => setSaved(false), 3000)
    } catch (e) { console.error('Save failed:', e); toast('Save failed')
    } finally { setSaving(false) }
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
      const a = document.createElement('a'); a.href = url; a.download = 'portal.zip'; a.click()
      URL.revokeObjectURL(url)
    } catch (e) { console.error('Export failed:', e)
    } finally { setExporting(false) }
  }

  async function handleExportQR() {
    try {
      const res = await fetch(`${API}/api/portal/export/qr-poster`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('QR export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'qr_poster.html'; a.click()
      URL.revokeObjectURL(url)
    } catch (e) { console.error('QR export failed:', e) }
  }

  async function loadSnapshots() {
    try {
      const res = await fetch(`${API}/api/portal-config/snapshots`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) { const data = await res.json(); setSnapshots(data.snapshots || []) }
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
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const pc = data.portal_config
        if (pc.template_id) setTpl(pc.template_id)
        if (pc.brand) {
          setName(pc.brand.name || ''); setTagline(pc.brand.tagline || '')
          setLocation(pc.brand.location || ''); setEmoji(pc.brand.emoji || '📡')
          setPhone(pc.brand.support_phone || ''); setLogoUrl(pc.brand.logo_url || null)
        }
        if (pc.typography?.font_family) setFont(pc.typography.font_family)
        if (pc.theme) {
          if (pc.theme.primary_color) setPrimaryColor(pc.theme.primary_color)
          if (pc.theme.secondary_color) setSecondaryColor(pc.theme.secondary_color)
          if (pc.theme.accent_color) setAccentColor(pc.theme.accent_color)
        }
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
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Left side */}
      <div style={{ width: 380, background: '#0a0a0a', borderRight: '1px solid #141414', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #141414', padding: '0 4px' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '12px 0 10px', background: 'transparent', border: 'none',
              borderBottom: tab === t.id ? '2px solid #E8B84B' : '2px solid transparent',
              color: tab === t.id ? '#E8B84B' : '#666', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
            }}>
              <t.icon size={16} />{t.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {/* ── Template Tab ── */}
          {tab === 'template' && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#666', marginBottom: 12 }}>
                Choose a template
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
                    padding: '6px 14px', borderRadius: 8, border: 'none',
                    background: activeCategory === cat.id ? '#E8B84B' : 'rgba(255,255,255,0.04)',
                    color: activeCategory === cat.id ? '#000' : '#666',
                    cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    fontFamily: 'Inter, sans-serif',
                  }}>{cat.name}</button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {filteredTemplates.map(t => {
                  const active = tpl === t.id
                  return (
                    <button key={t.id} onClick={() => setTpl(t.id)} style={{
                      background: active ? '#141414' : '#050505', cursor: 'pointer',
                      border: active ? '1px solid #E8B84B' : '1px solid #1a1a1a',
                      borderRadius: 12, padding: 12, textAlign: 'left', transition: 'all 0.2s',
                      boxShadow: active ? '0 0 16px rgba(232,184,75,0.15)' : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <t.icon size={16} style={{ color: active ? '#E8B84B' : '#555', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: active ? '#f0f0f0' : '#999' }}>{t.name}</span>
                        {t.badge && (
                          <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3,
                            background: t.badge === 'Popular' ? 'rgba(232,184,75,0.15)' : 'rgba(255,255,255,0.04)',
                            color: t.badge === 'Popular' ? '#E8B84B' : '#666', fontWeight: 600,
                          }}>{t.badge}</span>
                        )}
                      </div>
                      <p style={{ fontSize: 10, color: '#555', margin: 0, lineHeight: 1.3 }}>{t.desc}</p>
                      <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
                        {[t.colors.header, t.colors.accent, t.colors.card].map((c, j) => (
                          <div key={j} style={{ width: 8, height: 8, borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.06)' }} />
                        ))}
                      </div>
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
              <div style={{
                background: snaps?.bg || '#0c0c1a', borderRadius: 14, padding: '16px 14px',
                textAlign: 'center', marginBottom: 20, border: '1px solid rgba(255,255,255,0.08)',
                minHeight: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                {logoUrl ? <img src={logoUrl} style={{ height: 36, marginBottom: 4 }} /> : <div style={{ fontSize: 28, lineHeight: 1 }}>{emoji || '📡'}</div>}
                <div style={{ fontFamily: `'${font}',sans-serif`, fontSize: 20, fontWeight: 700, color: '#e8e6ff', letterSpacing: -0.3 }}>{name || 'Your WiFi'}</div>
                <div style={{ fontSize: 12, color: 'rgba(232,230,255,0.5)' }}>{tagline || 'Tagline'}</div>
                {location && <div style={{ fontSize: 10, color: 'rgba(232,230,255,0.4)', marginTop: 2 }}>{location}</div>}
              </div>
              {[
                { label: 'WiFi Name', value: name, set: setName, placeholder: 'Vertex WiFi' },
                { label: 'Tagline', value: tagline, set: setTagline, placeholder: 'Fast, reliable internet' },
                { label: 'Location', value: location, set: setLocation, placeholder: 'Nairobi, Kenya' },
                { label: 'Support Phone', value: phone, set: setPhone, placeholder: '+254 700 123 456' },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4 }}>{f.label}</div>
                  <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #141414', borderRadius: 10, fontSize: 14, fontFamily: 'Inter, sans-serif', color: '#f0f0f0', background: '#000', outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#E8B84B'}
                    onBlur={e => e.currentTarget.style.borderColor = '#141414'}
                  />
                </div>
              ))}
              <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 8 }}>Brand Icon</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 12 }}>
                {BRAND_ICONS.map(ic => (
                  <button key={ic} onClick={() => { setEmoji(ic); setLogoUrl(null) }} style={{
                    padding: 8, borderRadius: 8, border: emoji === ic && !logoUrl ? '1px solid #E8B84B' : '1px solid #141414',
                    background: emoji === ic && !logoUrl ? 'rgba(232,184,75,0.1)' : '#000', cursor: 'pointer', fontSize: 20,
                  }}>{ic}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <button onClick={() => fileInputRef.current?.click()} style={{
                  flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #141414',
                  background: '#000', color: '#666', cursor: 'pointer', fontSize: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <Upload size={14} /> Upload Logo
                </button>
                {logoUrl && (
                  <button onClick={() => setLogoUrl(null)} style={{
                    padding: '10px 14px', borderRadius: 10, border: '1px solid #ef4444',
                    background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontSize: 11,
                  }}>Remove</button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const form = new FormData()
                  form.append('file', file); form.append('subfolder', 'assets')
                  try {
                    const res = await fetch(`${API}/api/portal/assets/upload`, {
                      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
                    })
                    if (res.ok) {
                      const data = await res.json()
                      setLogoUrl(data.asset?.url || URL.createObjectURL(file))
                      setEmoji('')
                    }
                  } catch {}
                }} />
            </div>
          )}

          {/* ── Style Tab ── */}
          {tab === 'style' && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#666', marginBottom: 12 }}>
                Palette Presets
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                {STYLE_PRESETS.map(sp => {
                  const active = palette === sp.p
                  return (
                    <button key={sp.p} onClick={() => { setPalette(sp.p); setFont(sp.f); setPrimaryColor(sp.hd); setSecondaryColor(sp.bg); setAccentColor(sp.ac) }} style={{
                      border: active ? '1px solid #fff' : '1px solid #1a1a1a',
                      borderRadius: 12, padding: 12, cursor: 'pointer', textAlign: 'center',
                      background: active ? '#0a0a0a' : '#050505',
                      boxShadow: active ? '0 0 16px rgba(255,255,255,0.2)' : 'none',
                      transform: active ? 'translateY(-2px) scale(1.02)' : 'none',
                      transition: 'all 0.25s cubic-bezier(.34,1.56,.64,1)',
                    }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 8 }}>
                        {[sp.bg, sp.hd, sp.ac, sp.cd].map((c, i) => (
                          <div key={i} style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.1)' }} />
                        ))}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f0f0', marginBottom: 2 }}>
                        {sp.n}
                        {TEMPLATE_PALETTE_REC[tpl] === sp.p && (
                          <span style={{ display: 'block', fontSize: 9, color: '#E8B84B', fontWeight: 600, marginTop: 2 }}>★ Recommended</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: '#666', fontFamily: `'${sp.f}',sans-serif`, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', display: 'inline-block' }}>{sp.f}</div>
                    </button>
                  )
                })}
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#666', marginBottom: 12 }}>Custom Colors</div>
              <div style={{ marginBottom: 16 }}>
                {[
                  { label: 'Primary', value: primaryColor, set: setPrimaryColor },
                  { label: 'Secondary', value: secondaryColor, set: setSecondaryColor },
                  { label: 'Accent', value: accentColor, set: setAccentColor },
                ].map(c => (
                  <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <input type="color" value={c.value} onChange={e => c.set(e.target.value)}
                      style={{ width: 32, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer', padding: 0, background: 'transparent' }} />
                    <div style={{ fontSize: 11, color: '#666', width: 60 }}>{c.label}</div>
                    <input type="text" value={c.value} onChange={e => c.set(e.target.value)}
                      style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 10px', color: '#fff', fontSize: 12, fontFamily: 'DM Mono, monospace' }} />
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#666', marginBottom: 12 }}>Typography</div>
              {Object.entries(FONT_CATEGORIES).map(([catKey, cat]) => (
                <div key={catKey} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: '#555', marginBottom: 6 }}>{cat.name}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {cat.fonts.map(f => {
                      const sel = font === f
                      return (
                        <button key={f} onClick={() => setFont(f)} style={{
                          padding: '5px 10px', borderRadius: 6, border: `0.5px solid ${sel ? '#E8B84B' : '#141414'}`,
                          background: sel ? 'rgba(232,184,75,0.1)' : 'transparent',
                          color: sel ? '#E8B84B' : '#666', cursor: 'pointer', fontSize: 11,
                          fontFamily: `'${f}',sans-serif`,
                        }}>{f}</button>
                      )
                    })}
                  </div>
                </div>
              ))}
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
                <QrCode size={16} /> Download QR Poster
              </button>
              <div style={{ borderTop: '1px solid #141414', paddingTop: 20 }}>
                <button onClick={createSnapshot} style={{
                  width: '100%', padding: '12px 0', borderRadius: 10, border: '1px solid #141414',
                  background: '#0a0a0a', color: '#f0f0f0', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <Plus size={16} /> Save Current as Version
                </button>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#666', marginBottom: 12 }}>Saved Versions</div>
                {snapshots.length === 0 && <p style={{ fontSize: 12, color: '#555', textAlign: 'center', padding: 20 }}>No versions saved yet.</p>}
                {snapshots.map((s: any) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, background: '#0a0a0a', marginBottom: 8, border: '1px solid #141414' }}>
                    <Clock size={14} style={{ color: '#2a2a2a', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{s.version_tag}</div>
                      <div style={{ fontSize: 10, color: '#555' }}>{new Date(s.created_at).toLocaleDateString()}</div>
                    </div>
                    <button onClick={() => restoreSnapshot(s.id)} style={{
                      padding: '4px 10px', borderRadius: 6, border: '1px solid #141414',
                      background: 'transparent', color: '#666', cursor: 'pointer', fontSize: 10,
                    }}><RotateCcw size={12} /></button>
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
            background: saved ? '#22c55e' : '#E8B84B', color: '#000', cursor: 'pointer',
            fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.3s', fontFamily: 'Inter, sans-serif',
          }}>
            {saving ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <Check size={16} /> : <Save size={16} />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {/* Right: Phone Preview */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#000' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px', borderBottom: '1px solid #141414', background: '#0a0a0a' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f0' }}>
            {sel?.name || 'Portal'} — {snaps?.n || 'Custom'}
          </span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'hidden' }}>
          <div style={{
            width: 360, borderRadius: 44, background: '#111', padding: 12,
            boxShadow: '0 0 0 1px #2a2a2a, 0 30px 80px rgba(0,0,0,0.7)', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)',
              width: 70, height: 7, background: '#111', borderRadius: 99, zIndex: 10,
              border: '1px solid #2a2a2a',
            }} />
            <div style={{ width: 336, height: 700, borderRadius: 32, overflow: 'hidden', background: '#000', position: 'relative' }}>
              <div style={{ width: 375, height: 812, transformOrigin: 'top left', transform: 'scale(0.896)' }}>
                <iframe key={`${tpl}-${palette}-${font}`} ref={iframeRef} src={previewUrl}
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                  title="Portal Preview" />
              </div>
            </div>
            <div style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 130, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
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
