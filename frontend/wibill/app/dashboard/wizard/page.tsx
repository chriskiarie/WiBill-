'use client'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import {
  Palette, Type, LayoutGrid, CreditCard, Download, ChevronLeft,
  Monitor, Tablet, Smartphone, Check, Save, RefreshCw,
  Settings, FileDown, QrCode,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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

type LayoutType = 'dashboard' | 'spotlight' | 'stories'

const LAYOUTS: { id: LayoutType; name: string; desc: string }[] = [
  { id: 'dashboard', name: 'Dashboard', desc: 'Sidebar navigation, organized sections' },
  { id: 'spotlight', name: 'Spotlight', desc: 'Hero-forward, big visual impact' },
  { id: 'stories', name: 'Stories', desc: 'Vertical scroll, card-based flow' },
]

const CATEGORIES = [
  { id: 'business', name: 'Business', emoji: '💼' },
  { id: 'entertainment', name: 'Entertainment', emoji: '🎮' },
  { id: 'minimal', name: 'Minimal', emoji: '◻️' },
  { id: 'local', name: 'Local', emoji: '🌍' },
]

interface PaletteDef {
  id: string
  name: string
  bg: string
  card: string
  text: string
  textDim: string
  primary: string
  primaryDark: string
  accent: string
}

const PALETTES: Record<string, PaletteDef[]> = {
  business: [
    { id: 'gold-elite', name: 'Gold Elite', bg: '#0f0f1a', card: '#1a1a2e', text: '#f0f0f0', textDim: 'rgba(255,255,255,0.4)', primary: '#E8B84B', primaryDark: '#c9a03a', accent: '#f0c27a' },
    { id: 'corporate-blue', name: 'Corporate Blue', bg: '#1e1e2f', card: '#252540', text: '#e0e0e0', textDim: 'rgba(255,255,255,0.35)', primary: '#1a73e8', primaryDark: '#1557b0', accent: '#8ab4f8' },
    { id: 'executive-light', name: 'Executive Light', bg: '#ffffff', card: '#f0f0f0', text: '#1d1d1f', textDim: 'rgba(0,0,0,0.4)', primary: '#0984e3', primaryDark: '#0769b5', accent: '#74b9ff' },
    { id: 'ocean-deep', name: 'Ocean Deep', bg: '#03045E', card: '#023E8A', text: '#e0f0ff', textDim: 'rgba(255,255,255,0.35)', primary: '#0077B6', primaryDark: '#005f8f', accent: '#00B4D8' },
  ],
  entertainment: [
    { id: 'neon-gaming', name: 'Neon Gaming', bg: '#0a001a', card: '#150030', text: '#f0f0ff', textDim: 'rgba(255,255,255,0.35)', primary: '#ff00ff', primaryDark: '#cc00cc', accent: '#00ffff' },
    { id: 'streaming-red', name: 'Streaming Red', bg: '#141414', card: '#1f1f1f', text: '#f0f0f0', textDim: 'rgba(255,255,255,0.4)', primary: '#e50914', primaryDark: '#b80710', accent: '#ffffff' },
    { id: 'cyberpunk', name: 'Cyberpunk', bg: '#0d0d0d', card: '#1a1a1a', text: '#f0f0f0', textDim: 'rgba(255,255,255,0.35)', primary: '#ff6b35', primaryDark: '#e55a2b', accent: '#ffd700' },
    { id: 'rgb-wave', name: 'RGB Wave', bg: '#0a0a1a', card: '#150030', text: '#f0f0ff', textDim: 'rgba(255,255,255,0.35)', primary: '#ff0080', primaryDark: '#cc0066', accent: '#7000ff' },
  ],
  minimal: [
    { id: 'glass', name: 'Glass', bg: '#0f172a', card: 'rgba(255,255,255,0.06)', text: '#f0f0f0', textDim: 'rgba(255,255,255,0.35)', primary: '#60a5fa', primaryDark: '#4a8fe0', accent: '#93c5fd' },
    { id: 'apple-clean', name: 'Apple Clean', bg: '#f5f5f7', card: '#ffffff', text: '#1d1d1f', textDim: 'rgba(0,0,0,0.4)', primary: '#0071e3', primaryDark: '#005bb5', accent: '#34a0ff' },
    { id: 'material', name: 'Material', bg: '#1c1b1f', card: '#2b2930', text: '#e6e1e5', textDim: 'rgba(255,255,255,0.35)', primary: '#D0BCFF', primaryDark: '#b49de6', accent: '#e8def8' },
    { id: 'cherry-blossom', name: 'Cherry Blossom', bg: '#1a1014', card: '#2d1a20', text: '#f0e8ec', textDim: 'rgba(255,255,255,0.35)', primary: '#FFB7C5', primaryDark: '#e69fad', accent: '#ffd6e0' },
  ],
  local: [
    { id: 'kenyan-gold', name: 'Kenyan Gold', bg: '#0a0a0a', card: '#1a1400', text: '#f0e8c8', textDim: 'rgba(255,255,255,0.35)', primary: '#DAA520', primaryDark: '#b8891a', accent: '#FFD700' },
    { id: 'safari', name: 'Safari', bg: '#2a1f14', card: '#3a2d1e', text: '#f0e8d8', textDim: 'rgba(255,255,255,0.35)', primary: '#C4873B', primaryDark: '#a87230', accent: '#E8B84B' },
    { id: 'nairobi-night', name: 'Nairobi Night', bg: '#0a0a14', card: '#15152a', text: '#e8e0f0', textDim: 'rgba(255,255,255,0.35)', primary: '#6C3EB8', primaryDark: '#5a33a0', accent: '#B388FF' },
    { id: 'coffee-shop', name: 'Coffee Shop', bg: '#1C1512', card: '#2d2018', text: '#f0e8d8', textDim: 'rgba(255,255,255,0.35)', primary: '#D4A574', primaryDark: '#b88e63', accent: '#e8c9a8' },
  ],
}

const FONT_GROUPS: Record<string, { name: string; fonts: string[] }> = {
  clean: { name: 'Clean', fonts: ['Inter', 'Roboto', 'Open Sans'] },
  serif: { name: 'Serif', fonts: ['Playfair Display', 'DM Serif Display', 'Libre Baskerville'] },
  modern: { name: 'Modern', fonts: ['Space Grotesk', 'Manrope', 'Sora', 'Outfit'] },
  tech: { name: 'Tech', fonts: ['Orbitron', 'Exo 2', 'Rajdhani'] },
}

const CARD_STYLES = [
  { id: 'glass', name: 'Glass' },
  { id: 'outline', name: 'Outline' },
  { id: 'minimal', name: 'Minimal' },
  { id: 'floating', name: 'Floating' },
  { id: 'sharp', name: 'Sharp' },
]

const SECTION_OPTIONS = [
  { id: 'hero', label: 'Hero' },
  { id: 'logo', label: 'Logo' },
  { id: 'packages', label: 'Packages' },
  { id: 'footer', label: 'Footer' },
]

const INITIAL_CONFIG = {
  template_id: 'executive-dark',
  layout_type: 'dashboard' as LayoutType,
  palette_id: 'gold-elite',
  brand: { name: '', tagline: '', location: '', emoji: '📶', support_phone: '', logo_url: null as string | null },
  typography: { font_family: 'Inter', heading_size: 32, body_size: 15 },
  card: { style: 'glass', radius: 16, size: 'comfortable' as string },
  layout: { sections: ['hero', 'logo', 'packages', 'footer'] },
}

function getTemplateId(layout: LayoutType, paletteId: string): string {
  const map: Record<string, string> = {
    'dashboard-gold-elite': 'executive-dark',
    'dashboard-corporate-blue': 'corporate-blue',
    'dashboard-executive-light': 'executive-light',
    'dashboard-ocean-deep': 'ocean-deep',
    'spotlight-neon-gaming': 'gaming-neon',
    'spotlight-streaming-red': 'streaming-portal',
    'spotlight-cyberpunk': 'cyberpunk',
    'spotlight-rgb-wave': 'rgb-wave',
    'stories-glass': 'glass-morphism',
    'stories-apple-clean': 'apple-style',
    'stories-material': 'material-design',
    'stories-cherry-blossom': 'cherry-blossom',
    'dashboard-kenyan-gold': 'kenyan-gold',
    'dashboard-safari': 'safari',
    'dashboard-nairobi-night': 'nairobi-night',
    'dashboard-coffee-shop': 'coffee-shop',
  }
  return map[`${layout}-${paletteId}`] || 'executive-dark'
}

function getPreviewUrl(cfg: typeof INITIAL_CONFIG): string {
  const baseId = getTemplateId(cfg.layout_type, cfg.palette_id)
  const params = new URLSearchParams({
    name: cfg.brand.name || 'WiFi Portal',
    emoji: cfg.brand.emoji || '📶',
    tag: cfg.brand.tagline || '',
    loc: cfg.brand.location || '',
    phone: cfg.brand.support_phone || '',
    font: cfg.typography.font_family,
    shape: cfg.card.radius + 'px',
  })
  return `${API}/api/v1/portal-previews/${baseId}?${params.toString()}`
}

function computePalette(cfg: typeof INITIAL_CONFIG) {
  const allPalettes = Object.values(PALETTES).flat()
  const pal = allPalettes.find(p => p.id === cfg.palette_id) || PALETTES.business[0]
  return {
    bgStart: pal.bg,
    bgEnd: pal.bg,
    card: pal.card,
    text: pal.text,
    textDim: pal.textDim,
    primary: pal.primary,
    primaryDark: pal.primaryDark,
    accent: pal.accent,
    accentLight: pal.accent + '33',
    cardBorder: pal.textDim.includes('rgba(0') ? 'rgba(0,0,0,0.08)' : C.border,
    cardHl: pal.accent + '22',
  }
}

function MiniLayoutPreview({ layout, palette }: { layout: LayoutType; palette: PaletteDef }) {
  const isLight = ['#ffffff', '#f5f5f7'].includes(palette.bg)
  return (
    <div style={{ width: '100%', height: '100%', background: palette.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {layout === 'dashboard' && (
        <>
          <div style={{ display: 'flex', flex: 1 }}>
            <div style={{ width: 28, background: palette.primary + '22', borderRight: `1px solid ${palette.textDim}`, padding: '6px 4px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ width: '100%', height: 6, borderRadius: 2, background: i === 0 ? palette.primary : palette.textDim }} />
              ))}
            </div>
            <div style={{ flex: 1, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ width: '50%', height: 6, borderRadius: 2, background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)' }} />
              <div style={{ width: '30%', height: 4, borderRadius: 1, background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)' }} />
              <div style={{ display: 'flex', gap: 4, marginTop: 2, flex: 1 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ flex: 1, background: palette.card, borderRadius: 4, padding: 3, display: 'flex', flexDirection: 'column', gap: 2, border: `1px solid ${palette.textDim}` }}>
                    <div style={{ width: '60%', height: 3, borderRadius: 1, background: palette.textDim }} />
                    <div style={{ height: 3, flex: 1 }} />
                    <div style={{ height: 6, borderRadius: 2, background: palette.primary, opacity: 0.8 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
      {layout === 'spotlight' && (
        <>
          <div style={{ height: 36, background: `linear-gradient(135deg, ${palette.primary}33, ${palette.accent}22)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
            <div style={{ width: '40%', height: 5, borderRadius: 2, background: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)' }} />
          </div>
          <div style={{ flex: 1, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ width: '70%', height: 6, borderRadius: 2, background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)' }} />
            <div style={{ display: 'flex', gap: 4, flex: 1 }}>
              {[0, 1].map(i => (
                <div key={i} style={{ flex: 1, background: palette.card, borderRadius: 4, padding: 3, display: 'flex', flexDirection: 'column', gap: 2, border: `1px solid ${palette.textDim}` }}>
                  <div style={{ width: '50%', height: 3, borderRadius: 1, background: palette.textDim }} />
                  <div style={{ height: 3, flex: 1 }} />
                  <div style={{ height: 6, borderRadius: 2, background: i === 0 ? palette.primary : palette.accent, opacity: 0.8 }} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      {layout === 'stories' && (
        <div style={{ flex: 1, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ background: palette.card, borderRadius: 4, padding: '4px 6px', display: 'flex', alignItems: 'center', gap: 4, border: `1px solid ${palette.textDim}` }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: i === 0 ? palette.primary : palette.textDim, flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ width: '60%', height: 3, borderRadius: 1, background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)' }} />
                <div style={{ width: '40%', height: 2, borderRadius: 1, background: palette.textDim }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SliderField({ label, value, min, max, step, onChange, suffix }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.dim, marginBottom: 4 }}>
        <span>{label}</span>
        <span>{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: C.gold }} />
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} style={{
      width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
      background: checked ? C.gold : 'rgba(255,255,255,0.15)',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 2, left: checked ? 18 : 2,
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

export default function PortalWizard() {
  const { user, token } = useAuth()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [step, setStep] = useState<'gallery' | 'palette' | 'editor'>('gallery')
  const [activeCategory, setActiveCategory] = useState('business')
  const [selectedLayout, setSelectedLayout] = useState<LayoutType | null>(null)
  const [selectedPalette, setSelectedPalette] = useState<PaletteDef | null>(null)
  const [config, setConfig] = useState(INITIAL_CONFIG)
  const [activePanel, setActivePanel] = useState('brand')
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'phone'>('phone')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)

  const broadcastTimer = useRef<any>(null)
  const iframeLoaded = useRef(false)

  function scheduleBroadcast(cfg: typeof INITIAL_CONFIG) {
    if (broadcastTimer.current) clearTimeout(broadcastTimer.current)
    broadcastTimer.current = setTimeout(() => broadcastToPreview(cfg), 80)
  }

  function broadcastToPreview(cfg: typeof INITIAL_CONFIG) {
    const w = iframeRef.current?.contentWindow
    if (!w) return
    const pal = computePalette(cfg)
    try {
      w.postMessage({ type: 'UPDATE_PALETTE', colors: pal }, '*')
      w.postMessage({
        type: 'UPDATE_BRAND',
        name: cfg.brand.name || 'Your ISP',
        tagline: cfg.brand.tagline || '',
        location: cfg.brand.location || '',
        emoji: cfg.brand.emoji || '📶',
        phone: cfg.brand.support_phone || '',
        logo_url: cfg.brand.logo_url || '',
      }, '*')
      w.postMessage({
        type: 'UPDATE_TYPOGRAPHY',
        font: cfg.typography.font_family,
        heading_size: cfg.typography.heading_size + 'px',
        body_size: cfg.typography.body_size + 'px',
      }, '*')
      w.postMessage({
        type: 'UPDATE_CARD_STYLE',
        radius: cfg.card.radius + 'px',
        style: cfg.card.style,
        size: cfg.card.size,
      }, '*')
      w.postMessage({
        type: 'UPDATE_BUTTON_STYLE',
        style: 'rounded',
      }, '*')
      w.postMessage({
        type: 'UPDATE_LAYOUT',
        sections: cfg.layout.sections,
      }, '*')
      w.postMessage({
        type: 'UPDATE_NETWORK',
        show_banner: false,
        message: '',
      }, '*')
    } catch {}
  }

  const [previewSrc, setPreviewSrc] = useState('')

  useEffect(() => {
    if (selectedPalette) {
      setPreviewSrc(getPreviewUrl(config))
    }
  }, [config.template_id, config.palette_id, selectedPalette])

  function refreshPreview() {
    iframeLoaded.current = false
    setPreviewSrc(getPreviewUrl(config))
  }

  function onIframeLoad() {
    iframeLoaded.current = true
    broadcastToPreview(config)
  }

  useEffect(() => {
    if (iframeLoaded.current && iframeRef.current?.contentWindow) {
      broadcastToPreview(config)
    }
  }, [config])

  function updateBrand(key: string, value: any) {
    setConfig(prev => {
      const next = { ...prev, brand: { ...prev.brand, [key]: value } }
      scheduleBroadcast(next)
      return next
    })
  }

  function updateTypography(key: string, value: any) {
    setConfig(prev => {
      const next = { ...prev, typography: { ...prev.typography, [key]: value } }
      scheduleBroadcast(next)
      return next
    })
  }

  function updateCard(key: string, value: any) {
    setConfig(prev => {
      const next = { ...prev, card: { ...prev.card, [key]: value } }
      scheduleBroadcast(next)
      return next
    })
  }

  function toggleSection(sectionId: string) {
    setConfig(prev => {
      const sections = prev.layout.sections.includes(sectionId)
        ? prev.layout.sections.filter(s => s !== sectionId)
        : [...prev.layout.sections, sectionId]
      const next = { ...prev, layout: { ...prev.layout, sections } }
      scheduleBroadcast(next)
      return next
    })
  }

  function selectLayout(layout: LayoutType) {
    setSelectedLayout(layout)
    setStep('palette')
  }

  function selectPalette(palette: PaletteDef) {
    setSelectedPalette(palette)
    const templateId = getTemplateId(selectedLayout!, palette.id)
    setConfig(prev => ({
      ...prev,
      template_id: templateId,
      layout_type: selectedLayout!,
      palette_id: palette.id,
    }))
    setStep('editor')
    setTimeout(() => {
      setPreviewSrc(getPreviewUrl({ ...config, template_id: templateId, layout_type: selectedLayout!, palette_id: palette.id }))
    }, 50)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/portal-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error('Save failed:', e)
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

  useEffect(() => {
    const savedDraft = localStorage.getItem('wb_portal_draft')
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft)
        if (parsed.layout_type && parsed.palette_id) {
          setConfig(parsed)
          setSelectedLayout(parsed.layout_type)
          const allPalettes = Object.values(PALETTES).flat()
          const pal = allPalettes.find(p => p.id === parsed.palette_id)
          if (pal) {
            setSelectedPalette(pal)
            setStep('editor')
          }
        }
      } catch {}
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('wb_portal_draft', JSON.stringify(config))
    }, 1000)
    return () => clearTimeout(timer)
  }, [config])

  const hoverBg = C.base
  const activeBg = `${C.gold}1A`

  const PANELS = [
    { id: 'brand', icon: Settings, label: 'Brand' },
    { id: 'typography', icon: Type, label: 'Typography' },
    { id: 'cards', icon: CreditCard, label: 'Cards' },
    { id: 'layout', icon: LayoutGrid, label: 'Layout' },
    { id: 'export', icon: Download, label: 'Export' },
  ]

  if (step === 'gallery') {
    return (
      <div style={{ minHeight: '100vh', background: C.void, color: C.text }}>
        <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          .gallery-card { animation: fadeIn 0.3s ease both; }
          .gallery-card:hover .gallery-overlay { opacity: 1; }
        `}</style>

        <div style={{ borderBottom: `1px solid ${C.border}`, background: C.base }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${C.gold}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Palette size={16} style={{ color: C.gold }} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Design Studio</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 4, background: C.base, borderRadius: 8, padding: 2 }}>
                {[1, 2, 3].map(s => (
                  <div key={s} style={{ width: 8, height: 8, borderRadius: '50%', background: s === 1 ? C.gold : C.mute }} />
                ))}
              </div>
              <span style={{ fontSize: 11, color: C.dim, fontFamily: 'DM Mono, monospace' }}>Step 1 of 3</span>
            </div>
          </div>
        </div>

        <div style={{ padding: '48px 32px 0', textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, color: C.text, letterSpacing: '-0.5px' }}>Choose a layout</h1>
          <p style={{ color: C.dim, fontSize: 14, marginBottom: 36 }}>Pick a layout structure. You will choose colors next.</p>

          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 16, background: C.base, borderRadius: 10, padding: 3, width: 'fit-content', margin: '0 auto 16px' }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
                padding: '8px 18px', borderRadius: 8, border: 'none',
                background: activeCategory === cat.id ? C.gold : 'transparent',
                color: activeCategory === cat.id ? '#000' : C.dim,
                cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                fontFamily: 'Inter, sans-serif',
              }}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 32px 64px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {LAYOUTS.map((layout, i) => {
              const pal = PALETTES[activeCategory][0]
              return (
                <button key={layout.id} className="gallery-card" onClick={() => selectLayout(layout.id)}
                  style={{
                    animationDelay: `${i * 60}ms`,
                    background: C.base, borderRadius: 12, border: `1px solid ${C.border}`,
                    padding: 0, cursor: 'pointer', overflow: 'hidden', transition: 'border-color 0.2s, transform 0.2s',
                    textAlign: 'left', display: 'flex', flexDirection: 'column',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'none' }}>
                  <div style={{ height: 200, position: 'relative', overflow: 'hidden' }}>
                    <MiniLayoutPreview layout={layout.id} palette={pal} />
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none',
                    }} className="gallery-overlay">
                      <span style={{
                        padding: '8px 20px', borderRadius: 8, background: C.gold, color: '#000',
                        fontSize: 12, fontWeight: 600,
                      }}>Choose layout</span>
                    </div>
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{layout.name}</span>
                      <span style={{
                        fontSize: 9, padding: '2px 7px', borderRadius: 4,
                        background: `${C.gold}1A`, color: C.gold,
                        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>{activeCategory}</span>
                    </div>
                    <p style={{ fontSize: 12, color: C.dim, margin: 0 }}>{layout.desc}</p>
                    <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                      {PALETTES[activeCategory].map(p => (
                        <div key={p.id} style={{ width: 12, height: 12, borderRadius: '50%', background: p.primary, border: '1px solid rgba(255,255,255,0.1)' }} />
                      ))}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  if (step === 'palette') {
    const palettes = PALETTES[activeCategory]
    return (
      <div style={{ minHeight: '100vh', background: C.void, color: C.text }}>
        <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          .pal-card { animation: fadeIn 0.3s ease both; }
          .pal-card:hover { border-color: ${C.gold} !important; transform: translateY(-2px); }
        `}</style>

        <div style={{ borderBottom: `1px solid ${C.border}`, background: C.base }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setStep('gallery')} style={{
                width: 32, height: 32, borderRadius: 8, background: 'transparent', border: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.dim,
              }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Choose palette</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 4, background: C.base, borderRadius: 8, padding: 2 }}>
                {[1, 2, 3].map(s => (
                  <div key={s} style={{ width: 8, height: 8, borderRadius: '50%', background: s <= 2 ? C.gold : C.mute }} />
                ))}
              </div>
              <span style={{ fontSize: 11, color: C.dim, fontFamily: 'DM Mono, monospace' }}>Step 2 of 3</span>
            </div>
          </div>
        </div>

        <div style={{ padding: '48px 32px 0', textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, color: C.text, letterSpacing: '-0.5px' }}>
            {LAYOUTS.find(l => l.id === selectedLayout)?.name} palette
          </h1>
          <p style={{ color: C.dim, fontSize: 14, marginBottom: 36 }}>
            Pick a color scheme for your {activeCategory} portal.
          </p>
        </div>

        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 32px 64px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {palettes.map((pal, i) => (
              <button key={pal.id} className="pal-card" onClick={() => selectPalette(pal)}
                style={{
                  animationDelay: `${i * 60}ms`,
                  background: C.base, borderRadius: 12, border: `1px solid ${C.border}`,
                  padding: 0, cursor: 'pointer', overflow: 'hidden', transition: 'border-color 0.2s, transform 0.2s',
                  textAlign: 'left', display: 'flex', flexDirection: 'column',
                }}>
                <div style={{ height: 140, background: pal.bg, display: 'flex', flexDirection: 'column', padding: '12px 16px', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                    <div style={{ flex: 2, background: pal.card, borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 4, border: `1px solid ${pal.textDim}` }}>
                      <div style={{ width: '50%', height: 5, borderRadius: 2, background: pal.textDim }} />
                      <div style={{ width: '70%', height: 4, borderRadius: 2, background: pal.textDim }} />
                      <div style={{ height: 4, flex: 1 }} />
                      <div style={{ height: 14, borderRadius: 4, background: pal.primary, opacity: 0.9 }} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ flex: 1, background: pal.card, borderRadius: 6, border: `1px solid ${pal.textDim}` }} />
                      <div style={{ flex: 1, background: pal.card, borderRadius: 6, border: `1px solid ${pal.textDim}` }} />
                    </div>
                  </div>
                </div>
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{pal.name}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[pal.bg, pal.card, pal.primary, pal.accent].map((c, j) => (
                      <div key={j} style={{ width: 14, height: 14, borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.1)' }} />
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.void, color: C.text, overflow: 'hidden' }}>
      <div style={{ width: 56, background: C.base, borderRight: `0.5px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0', flexShrink: 0 }}>
        {PANELS.map(p => (
          <button key={p.id} onClick={() => setActivePanel(p.id)} title={p.label} style={{
            width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 2,
            background: activePanel === p.id ? activeBg : 'transparent',
            color: activePanel === p.id ? C.gold : C.dim,
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
          }}>
            <p.icon size={18} />
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => setStep('palette')} title="Back to palettes" style={{
          width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer',
          background: 'transparent', color: C.dim, fontSize: 10,
        }}>
          <ChevronLeft size={16} />
        </button>
      </div>

      <div style={{ width: 320, background: C.base, borderRight: `0.5px solid ${C.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: `0.5px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {(() => {
              const p = PANELS.find(x => x.id === activePanel)
              return p ? <p.icon size={16} style={{ color: C.gold }} /> : null
            })()}
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{PANELS.find(p => p.id === activePanel)?.label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 3 }}>
              {[1, 2, 3].map(s => (
                <div key={s} style={{ width: 6, height: 6, borderRadius: '50%', background: s <= 3 ? C.gold : C.mute }} />
              ))}
            </div>
            <span style={{ fontSize: 10, color: C.dim, fontFamily: 'DM Mono, monospace' }}>Step 3</span>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {activePanel === 'brand' && (
            <div style={{ padding: 16 }}>
              {[
                { key: 'name', label: 'ISP Name', placeholder: 'My ISP' },
                { key: 'tagline', label: 'Tagline', placeholder: 'Fast & Reliable WiFi' },
                { key: 'location', label: 'Location', placeholder: 'Nairobi, Kenya' },
                { key: 'support_phone', label: 'Support Phone', placeholder: '+254 700 000 000' },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: C.dim, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{field.label}</label>
                  <input type="text" value={(config.brand as any)[field.key] || ''} onChange={e => updateBrand(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    style={{ width: '100%', background: hoverBg, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 13 }} />
                </div>
              ))}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: C.dim, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Emoji / Icon</label>
                <input type="text" value={config.brand.emoji} onChange={e => updateBrand('emoji', e.target.value)}
                  placeholder="📶" maxLength={4}
                  style={{ width: 60, background: hoverBg, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '10px', color: C.text, fontSize: 24, textAlign: 'center' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: C.dim, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Logo URL</label>
                <input type="text" value={config.brand.logo_url || ''} onChange={e => updateBrand('logo_url', e.target.value || null)}
                  placeholder="https://example.com/logo.png"
                  style={{ width: '100%', background: hoverBg, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 12 }} />
              </div>
              {config.brand.logo_url && (
                <div style={{ background: hoverBg, borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <img src={config.brand.logo_url} alt="Logo" style={{ maxWidth: '100%', maxHeight: 60, borderRadius: 4 }} />
                  <button onClick={() => updateBrand('logo_url', null)} style={{ display: 'block', marginTop: 8, fontSize: 11, color: C.red, background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                </div>
              )}
            </div>
          )}

          {activePanel === 'typography' && (
            <div style={{ padding: 16 }}>
              {Object.entries(FONT_GROUPS).map(([catKey, cat]) => (
                <div key={catKey} style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, color: C.dim, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cat.name}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {cat.fonts.map(font => {
                      const sel = config.typography.font_family === font
                      return (
                        <button key={font} onClick={() => updateTypography('font_family', font)} style={{
                          padding: '6px 12px', borderRadius: 8, border: `0.5px solid ${sel ? C.gold : C.border}`,
                          background: sel ? activeBg : hoverBg,
                          color: sel ? C.gold : C.dim,
                          cursor: 'pointer', fontSize: 12, fontFamily: `'${font}', sans-serif`,
                          transition: 'all 0.15s',
                        }}>{font}</button>
                      )
                    })}
                  </div>
                </div>
              ))}
              <div style={{ borderTop: `0.5px solid ${C.border}`, paddingTop: 16 }}>
                <SliderField label="Heading Size" value={config.typography.heading_size} min={20} max={60} step={2} onChange={v => updateTypography('heading_size', v)} suffix="px" />
                <div style={{ marginTop: 12 }}>
                  <SliderField label="Body Size" value={config.typography.body_size} min={12} max={24} step={1} onChange={v => updateTypography('body_size', v)} suffix="px" />
                </div>
              </div>
            </div>
          )}

          {activePanel === 'cards' && (
            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: C.dim, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Card Style</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {CARD_STYLES.map(cs => {
                    const sel = config.card.style === cs.id
                    return (
                      <button key={cs.id} onClick={() => updateCard('style', cs.id)} style={{
                        padding: '10px 0', borderRadius: 8, border: `0.5px solid ${sel ? C.gold : C.border}`,
                        background: sel ? activeBg : hoverBg,
                        color: sel ? C.gold : C.dim, cursor: 'pointer', fontSize: 11, textAlign: 'center',
                      }}>{cs.name}</button>
                    )
                  })}
                </div>
              </div>
              <SliderField label="Card Radius" value={config.card.radius} min={0} max={32} step={2} onChange={v => updateCard('radius', v)} suffix="px" />
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 11, color: C.dim, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Card Size</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['compact', 'comfortable', 'large'].map(s => {
                    const sel = config.card.size === s
                    return (
                      <button key={s} onClick={() => updateCard('size', s)} style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, border: `0.5px solid ${sel ? C.gold : C.border}`,
                        background: sel ? activeBg : hoverBg,
                        color: sel ? C.gold : C.dim, cursor: 'pointer', fontSize: 11,
                      }}>{s}</button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {activePanel === 'layout' && (
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 11, color: C.dim, marginBottom: 16 }}>Toggle which sections appear on your portal.</p>
              {SECTION_OPTIONS.map(s => {
                const enabled = config.layout.sections.includes(s.id)
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `0.5px solid ${C.border}` }}>
                    <Toggle checked={enabled} onChange={() => toggleSection(s.id)} />
                    <span style={{ fontSize: 13, color: enabled ? C.text : C.mute, flex: 1 }}>{s.label}</span>
                  </div>
                )
              })}
            </div>
          )}

          {activePanel === 'export' && (
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 11, color: C.dim, marginBottom: 16 }}>Export your portal design.</p>
              <button onClick={handleExportZip} disabled={exporting} style={{
                width: '100%', padding: '14px 0', borderRadius: 10, border: `0.5px solid ${C.gold}`,
                background: activeBg, color: C.gold, cursor: 'pointer',
                fontSize: 13, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {exporting ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <FileDown size={16} />}
                {exporting ? 'Generating...' : 'Download MikroTik ZIP'}
              </button>
              <button onClick={handleExportQR} style={{
                width: '100%', padding: '14px 0', borderRadius: 10, border: `0.5px solid ${C.border}`,
                background: hoverBg, color: C.dim, cursor: 'pointer',
                fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <QrCode size={16} />
                Download QR Poster
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: 12, borderTop: `0.5px solid ${C.border}` }}>
          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
            background: saved ? C.green : C.gold,
            color: '#000', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.3s',
          }}>
            {saving ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <Check size={16} /> : <Save size={16} />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save & Publish'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.void }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: `0.5px solid ${C.border}`, background: C.base }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: C.dim, fontWeight: 500 }}>
              {selectedPalette?.name || 'Portal'}
            </span>
            <button onClick={refreshPreview} title="Refresh preview"
              style={{ padding: '4px 6px', borderRadius: 4, border: 'none', cursor: 'pointer', background: 'transparent', color: C.mute, fontSize: 11 }}>
              <RefreshCw size={12} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: C.base, borderRadius: 8, padding: 2 }}>
            {([
              { id: 'desktop' as const, icon: Monitor, label: 'Desktop' },
              { id: 'tablet' as const, icon: Tablet, label: 'Tablet' },
              { id: 'phone' as const, icon: Smartphone, label: 'Phone' },
            ] as const).map(d => (
              <button key={d.id} onClick={() => setPreviewDevice(d.id)} style={{
                padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: previewDevice === d.id ? C.gold : 'transparent',
                color: previewDevice === d.id ? '#000' : C.dim,
                fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all 0.15s',
              }}>
                <d.icon size={13} />
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'auto', background: C.void }}>
          {previewDevice === 'desktop' ? (
            <div style={{ width: '100%', maxWidth: 1200, height: '100%', borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}` }}>
              <iframe ref={iframeRef} src={previewSrc} onLoad={onIframeLoad}
                style={{ width: '100%', height: '100%', border: 'none', background: selectedPalette?.bg || C.void }}
                title="Portal Preview" />
            </div>
          ) : previewDevice === 'tablet' ? (
            <div style={{
              width: 600, height: '100%', maxHeight: 800,
              background: '#1a1a1a', borderRadius: 20, padding: '12px 8px',
              boxShadow: '0 25px 80px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ flex: 1, borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                <iframe ref={iframeRef} src={previewSrc} onLoad={onIframeLoad}
                  style={{ width: '100%', height: '100%', border: 'none', background: selectedPalette?.bg || C.void }}
                  title="Portal Preview" />
              </div>
              <div style={{ height: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 4 }}>
                <div style={{ width: 40, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
              </div>
            </div>
          ) : (
            <div style={{
              width: 390, height: '100%', maxHeight: 844,
              background: '#1a1a1a', borderRadius: 44, padding: '10px 6px',
              boxShadow: '0 30px 100px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.06)',
              display: 'flex', flexDirection: 'column', position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
                width: 120, height: 28, background: '#1a1a1a', borderRadius: 20,
                zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2a2a2a' }} />
              </div>
              <div style={{ flex: 1, borderRadius: 34, overflow: 'hidden', position: 'relative' }}>
                <iframe ref={iframeRef} src={previewSrc} onLoad={onIframeLoad}
                  style={{
                    width: '100%', height: '100%', border: 'none',
                    background: selectedPalette?.bg || C.void,
                  }}
                  title="Portal Preview" />
              </div>
              <div style={{ height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 120, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}