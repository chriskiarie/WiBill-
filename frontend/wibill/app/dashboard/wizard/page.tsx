'use client'
import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import Topbar from '@/components/Topbar'
import {
  Palette, LayoutTemplate, Settings, Type,
  Save, Check, RefreshCw, Download,
  Plus, RotateCcw, Clock, FileDown, QrCode,
  ChevronLeft, ChevronRight, Wifi,
  Briefcase, Building, Crown, Anchor, Waves,
  Gamepad2, Cpu, Film, Paintbrush, Sunset, Gem,
  Snowflake, Apple, Box, Flower2, TreePine, Star,
  Palette as PaletteIcon, Moon as MoonIcon, Coffee, Upload,
  Signal, Radio, Globe, Server, Antenna, Activity, WifiOff,
  Smartphone, Laptop, Tablet, Tv, WifiHigh, WifiZero,
  Network, Router, MonitorSmartphone,
  Zap, Shield, Rocket, Layers, Cloud, Satellite, Lock, Database,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function toAbsoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('blob:') || url.startsWith('data:')) return url
  if (url.startsWith('/uploads/') || url.startsWith('\\uploads\\')) return `${API}${url.replace(/\\/g, '/')}`
  if (url.includes('/uploads/')) {
    const idx = url.indexOf('/uploads/')
    return `${API}${url.slice(idx)}`
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${API}${url}`
}

function toRelativeUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('blob:') || url.startsWith('data:')) return url
  if (url.startsWith(API)) return url.slice(API.length)
  if (url.includes('/uploads/')) {
    const idx = url.indexOf('/uploads/')
    return url.slice(idx)
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return url
}

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

const MAIN_TEMPLATES = [
  { id:'dashboard', label:'Dashboard', desc:'Compact grid · Modal', icon: LayoutTemplate },
  { id:'spotlight', label:'Spotlight', desc:'Hero header · Premium', icon: Star },
  { id:'split', label:'Split', desc:'Split-screen · Brand', icon: LayoutTemplate },
  { id:'bento', label:'Bento', desc:'Asymmetric · Apple-style', icon: LayoutTemplate },
]

const BRAND_STICKERS: { name: string; src: string }[] = [
  { name: 'WiFi Signal', src: '/stickers/wifi-signal.png' },
  { name: 'Website', src: '/stickers/website.png' },
  { name: 'WiFi', src: '/stickers/wifi.png' },
  { name: 'WiFi Router', src: '/stickers/wifi-router.png' },
  { name: 'WiFi Blue', src: '/stickers/wifi-blue.png' },
  { name: 'WiFi Icon', src: '/stickers/wifi-icon.png' },
  { name: 'Technology', src: '/stickers/technology.png' },
  { name: 'Internet', src: '/stickers/internet-1.png' },
  { name: 'High Speed', src: '/stickers/high-speed.png' },
  { name: 'Internet Access', src: '/stickers/internet-access.png' },
  { name: 'Internet Globe', src: '/stickers/internet.png' },
  { name: 'IoT', src: '/stickers/internet-of-things.png' },
]

const FONT_CATEGORIES: Record<string, { name: string; fonts: { family: string; preview: string }[] }> = {
  corporate: {
    name: 'Clean & Professional',
    fonts: [
      { family: 'Inter', preview: 'Inter is a versatile sans-serif designed for screens' },
      { family: 'Roboto', preview: 'Roboto offers friendly, mechanical structure' },
      { family: 'Open Sans', preview: 'Open Sans is a humanist sans-serif' },
      { family: 'Space Grotesk', preview: 'Space Grotesk is a modern, geometric sans' },
    ],
  },
  luxury: {
    name: 'Serif & Elegant',
    fonts: [
      { family: 'Playfair Display', preview: 'Playfair Display — timeless elegance in every letter' },
      { family: 'DM Serif Display', preview: 'DM Serif — crisp, contemporary serif' },
      { family: 'Libre Baskerville', preview: 'Libre Baskerville — classic newspaper serif' },
    ],
  },
  modern: {
    name: 'Modern & Bold',
    fonts: [
      { family: 'Manrope', preview: 'Manrope — variable geometric sans' },
      { family: 'Sora', preview: 'Sora — elegant and minimal' },
      { family: 'Outfit', preview: 'Outfit — clean, rounded, friendly' },
      { family: 'Unbounded', preview: 'Unbounded — bold, modern display' },
    ],
  },
  tech: {
    name: 'Tech & Monospace',
    fonts: [
      { family: 'Orbitron', preview: 'Orbitron — futuristic, tech-forward' },
      { family: 'Exo 2', preview: 'Exo 2 — sci-fi inspired' },
      { family: 'Rajdhani', preview: 'Rajdhani — wide, modern, fast' },
      { family: 'JetBrains Mono', preview: 'JetBrains Mono — developer-favourite monospace' },
    ],
  },
}

type Tab = 'template' | 'brand' | 'fonts' | 'colors' | 'export'

const TABS: { id: Tab; icon: any; label: string }[] = [
  { id: 'template', icon: LayoutTemplate, label: 'Template' },
  { id: 'brand', icon: Settings, label: 'Brand' },
  { id: 'fonts', icon: Type, label: 'Fonts' },
  { id: 'colors', icon: Palette, label: 'Colors' },
  { id: 'export', icon: Download, label: 'Export' },
]

export default function PortalWizard() {
  const router = useRouter()
  const { user, token } = useAuth()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<Tab>('template')
  const [tpl, setTpl] = useState('dashboard')
  const [palette, setPalette] = useState(0)
  const [font, setFont] = useState('Inter')
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [location, setLocation] = useState('')
  const [emoji, setEmoji] = useState('📡')
  const [phone, setPhone] = useState('')
  const [supportEmail, setSupportEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [facebookUrl, setFacebookUrl] = useState('')
  const [twitterUrl, setTwitterUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [technicianName, setTechnicianName] = useState('')
  const [technicianPhone, setTechnicianPhone] = useState('')
  const [heroTitle, setHeroTitle] = useState('')
  const [sectionHeading, setSectionHeading] = useState('')
  const [footerText, setFooterText] = useState('')
  const [termsUrl, setTermsUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#5b4fff')
  const [secondaryColor, setSecondaryColor] = useState('#0c0c1a')
  const [accentColor, setAccentColor] = useState('#5b4fff')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null)
  const [stickerDataUrl, setStickerDataUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [toastMsg, setToastMsg] = useState('')
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [hasSavedConfig, setHasSavedConfig] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [previewingSnapshot, setPreviewingSnapshot] = useState<string | null>(null)
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null)
  const [livePackages, setLivePackages] = useState<any[]>([])

  const toast = (m: string) => { setToastMsg(m); setTimeout(() => setToastMsg(''), 3200) }
  const snaps = STYLE_PRESETS.find(sp => sp.p === palette)
  const sel = MAIN_TEMPLATES.find(t => t.id === tpl)

  const accentRgba = (alpha: number) => {
    const c = getComputedStyle(document.documentElement).getPropertyValue('--theme-gold').trim() || '#E8B84B'
    const hex = c.startsWith('#') ? c : '#E8B84B'
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }

  const previewParams = new URLSearchParams({
    palette: String(palette), font, name: name || 'Your WiFi',
    emoji: emoji || '📡', tag: tagline, loc: location, phone,
    hero_title: heroTitle || '', section_heading: sectionHeading || '',
    primary: primaryColor || '', secondary: secondaryColor || '', accent: accentColor || '',
  })
  if (livePackages.length > 0) {
    const pkgsJson = JSON.stringify(livePackages.filter((p: any) => p.is_active !== false).map((p: any) => ({
      n: p.name, p: p.price_ksh, d: p.duration_label || `${p.duration_hours}h`, star: false,
    })))
    previewParams.set('pkgs', pkgsJson)
  }
  const effectiveLogo = logoUrl || stickerDataUrl
  if (effectiveLogo) previewParams.set('logo_url', effectiveLogo)
  if (whatsapp) previewParams.set('whatsapp', whatsapp)
  if (technicianName) previewParams.set('technician_name', technicianName)
  if (technicianPhone) previewParams.set('technician_phone', technicianPhone)
  const previewUrl = `${API}/api/v1/portal-previews/${tpl}?${previewParams.toString()}`

  useEffect(() => {
    if (!selectedSticker) { setStickerDataUrl(null); return }
    fetch(selectedSticker)
      .then(r => r.blob())
      .then(blob => {
        const reader = new FileReader()
        reader.onloadend = () => setStickerDataUrl(reader.result as string)
        reader.readAsDataURL(blob)
      })
      .catch(() => setStickerDataUrl(null))
  }, [selectedSticker])

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
            setHasSavedConfig(true)
            setIsLocked(true)
            const pc = data.portal_config
            if (pc.template_id) setTpl(pc.template_id)
            if (pc.brand) {
              if (pc.brand.name !== undefined) setName(pc.brand.name)
              if (pc.brand.tagline !== undefined) setTagline(pc.brand.tagline)
              if (pc.brand.location !== undefined) setLocation(pc.brand.location)
              if (pc.brand.emoji !== undefined && pc.brand.emoji !== null) setEmoji(pc.brand.emoji)
              if (pc.brand.support_phone !== undefined) setPhone(pc.brand.support_phone)
              if (pc.brand.support_email !== undefined) setSupportEmail(pc.brand.support_email)
              if (pc.brand.whatsapp !== undefined) setWhatsapp(pc.brand.whatsapp)
              if (pc.brand.website_url !== undefined) setWebsiteUrl(pc.brand.website_url)
              if (pc.brand.facebook_url !== undefined) setFacebookUrl(pc.brand.facebook_url)
              if (pc.brand.twitter_url !== undefined) setTwitterUrl(pc.brand.twitter_url)
              if (pc.brand.instagram_url !== undefined) setInstagramUrl(pc.brand.instagram_url)
              if (pc.brand.logo_url !== undefined) setLogoUrl(toAbsoluteUrl(pc.brand.logo_url))
              if (pc.brand.emoji) {
                const matchedSticker = BRAND_STICKERS.find(st => st.name === pc.brand.emoji)
                if (matchedSticker) { setSelectedSticker(matchedSticker.src) }
              }
              if (pc.brand.hero_title !== undefined) setHeroTitle(pc.brand.hero_title)
              if (pc.brand.section_heading !== undefined) setSectionHeading(pc.brand.section_heading)
              if (pc.brand.footer_text !== undefined) setFooterText(pc.brand.footer_text)
              if (pc.brand.terms_url !== undefined) setTermsUrl(pc.brand.terms_url)
            }
            if (pc.typography?.font_family) setFont(pc.typography.font_family)
            if (pc.theme) {
              if (pc.theme.primary_color) setPrimaryColor(pc.theme.primary_color)
              if (pc.theme.secondary_color) setSecondaryColor(pc.theme.secondary_color)
              if (pc.theme.accent_color) setAccentColor(pc.theme.accent_color)
            }
            if (pc.palette_index !== null && pc.palette_index !== undefined) {
              setPalette(pc.palette_index)
            } else if (pc.theme?.primary_color) {
              const match = STYLE_PRESETS.find(sp => sp.hd.toLowerCase() === pc.theme.primary_color.toLowerCase())
              if (match) setPalette(match.p)
            }
          }
        }
      } catch (e) {
        console.error('Failed to load config:', e)
      } finally {
        setLoadingConfig(false)
      }
    }
    if (token) { loadConfig(); loadSnapshots(); fetchLivePackages() }
  }, [token])

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('wb_portal_draft', JSON.stringify({ tpl, palette, font, name, tagline, location, emoji, phone, supportEmail, whatsapp, websiteUrl, facebookUrl, twitterUrl, instagramUrl, heroTitle, sectionHeading, footerText, termsUrl, primaryColor, secondaryColor, accentColor, logoUrl: logoUrl && !logoUrl.startsWith('blob:') ? logoUrl : null }))
    }, 1000)
    return () => clearTimeout(timer)
  }, [tpl, palette, font, name, tagline, location, emoji, phone, supportEmail, whatsapp, websiteUrl, facebookUrl, twitterUrl, instagramUrl, heroTitle, sectionHeading, footerText, termsUrl, primaryColor, secondaryColor, accentColor, logoUrl])

  const previewKey = `${tpl}-${palette}-${font}-${name}-${tagline}-${location}-${emoji}-${phone}-${supportEmail}-${whatsapp}-${websiteUrl}-${facebookUrl}-${twitterUrl}-${instagramUrl}-${heroTitle}-${sectionHeading}-${footerText}-${termsUrl}-${logoUrl}-${selectedSticker || ''}`

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    setPreviewLoading(true)
    const timer = setTimeout(() => {
      iframe.src = previewUrl
    }, 200)
    return () => clearTimeout(timer)
  }, [previewKey, stickerDataUrl, previewUrl])

  function buildConfig() {
    return {
      template_id: tpl,
      palette_index: palette,
      brand: { name, tagline, location, emoji, support_phone: phone, support_email: supportEmail, whatsapp, website_url: websiteUrl, facebook_url: facebookUrl, twitter_url: twitterUrl, instagram_url: instagramUrl, logo_url: toRelativeUrl(logoUrl), hero_title: heroTitle, section_heading: sectionHeading, footer_text: footerText, terms_url: termsUrl, technician_name: technicianName, technician_phone: technicianPhone },
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
      setSaved(true); setActiveSnapshotId(null); toast('Portal saved successfully!')
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
      if (res.ok) {
        const data = await res.json()
        setSnapshots(data.snapshots || [])
      } else {
        setSnapshots([])
      }
    } catch { setSnapshots([]) }
  }

  async function fetchLivePackages() {
    try {
      const res = await fetch(`${API}/api/packages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) { const data = await res.json(); setLivePackages(Array.isArray(data) ? data : []) }
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
      if (res.ok) {
        loadSnapshots()
        toast('Version saved!')
      } else {
        const err = await res.json().catch(() => ({ detail: 'Save failed' }))
        toast(err.detail || 'Failed to save version')
      }
    } catch { toast('Network error — try again') }
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
          setPhone(pc.brand.support_phone || ''); setLogoUrl(toAbsoluteUrl(pc.brand.logo_url))
          setSupportEmail(pc.brand.support_email || ''); setWhatsapp(pc.brand.whatsapp || '')
          setWebsiteUrl(pc.brand.website_url || '')
          setFacebookUrl(pc.brand.facebook_url || ''); setTwitterUrl(pc.brand.twitter_url || '')
          setInstagramUrl(pc.brand.instagram_url || '')
          setTechnicianName(pc.brand.technician_name || '')
          setTechnicianPhone(pc.brand.technician_phone || '')
          setHeroTitle(pc.brand.hero_title || ''); setSectionHeading(pc.brand.section_heading || '')
          setFooterText(pc.brand.footer_text || ''); setTermsUrl(pc.brand.terms_url || '')
          if (pc.brand.emoji) {
            const matchedSticker = BRAND_STICKERS.find(st => st.name === pc.brand.emoji)
            if (matchedSticker) { setSelectedSticker(matchedSticker.src) }
          }
        }
        if (pc.typography?.font_family) setFont(pc.typography.font_family)
        if (pc.theme) {
          if (pc.theme.primary_color) setPrimaryColor(pc.theme.primary_color)
          if (pc.theme.secondary_color) setSecondaryColor(pc.theme.secondary_color)
          if (pc.theme.accent_color) setAccentColor(pc.theme.accent_color)
        }
        if (pc.palette_index !== null && pc.palette_index !== undefined) {
          setPalette(pc.palette_index)
        } else if (pc.theme?.primary_color) {
          const match = STYLE_PRESETS.find(sp => sp.hd.toLowerCase() === pc.theme.primary_color.toLowerCase())
          if (match) setPalette(match.p)
        }
        loadSnapshots()
        setActiveSnapshotId(id)
        toast('Version restored!')
      } else {
        toast('Failed to restore version')
      }
    } catch { toast('Network error') }
  }

  async function deleteSnapshot(id: string, tag: string) {
    if (!confirm(`Delete "${tag}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`${API}/api/portal-config/snapshots/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) { loadSnapshots(); toast('Version deleted') }
      else { toast('Failed to delete version') }
    } catch { toast('Network error') }
  }

  useEffect(() => { if (tab === 'export') loadSnapshots() }, [tab])

  if (loadingConfig) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000', color: '#f0f0f0' }}>
        <Topbar title="Portal Design" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--theme-gold)' }} />
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000', color: '#f0f0f0', overflow: 'hidden' }}>
        <Topbar title="Portal Design" />
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes slideUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Left side */}
      <div className="wizard-left-panel" style={{ width: 420, background: '#0a0a0a', borderRight: '1px solid #141414', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #141414', padding: '0 4px' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '12px 0 10px', background: 'transparent', border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--theme-gold)' : '2px solid transparent',
              color: tab === t.id ? 'var(--theme-gold)' : '#666', cursor: 'pointer', fontSize: 10, fontWeight: 600,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
            }}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {/* ══════════════════════════════════════════════
             TEMPLATE TAB — 4 main templates as phone cards
             ══════════════════════════════════════════════ */}
          {tab === 'template' && (
            <div style={{ animation: 'fadeIn 0.25s ease' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#666', marginBottom: 14 }}>
                Choose Layout
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {MAIN_TEMPLATES.map(t => {
                  const active = tpl === t.id
                  return (
                    <button key={t.id} onClick={() => { setTpl(t.id) }}
                      style={{
                        display: 'flex', gap: 16, alignItems: 'center', cursor: 'pointer',
                        background: active ? '#0f0f0f' : 'transparent',
                        border: active ? `1px solid ${accentRgba(0.3)}` : '1px solid #141414',
                        borderRadius: 14, padding: '10px 14px',
                        transition: 'all 0.25s cubic-bezier(.34,1.56,.64,1)',
                      }}>
                      {/* Tiny phone preview */}
                      <div style={{
                        width: 56, height: 100, borderRadius: 8, overflow: 'hidden',
                        background: snaps?.bg || '#0c0c1a', flexShrink: 0,
                        border: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex', flexDirection: 'column',
                      }}>
                        <div style={{ height: 14, background: snaps?.hd || '#5b4fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 20, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.3)' }} />
                        </div>
                        <div style={{ flex: 1, padding: '4px 5px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ width: '80%', height: 4, borderRadius: 2, background: snaps?.hd || '#5b4fff', opacity: 0.6 }} />
                          <div style={{ width: '60%', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }} />
                          <div style={{ display: 'flex', gap: 2, marginTop: 'auto' }}>
                            {[1,2,3].map(i => (
                              <div key={i} style={{ flex: 1, height: 20, borderRadius: 3, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.06)' }} />
                            ))}
                          </div>
                        </div>
                      </div>
                        <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 600, color: active ? '#f0f0f0' : '#999', marginBottom: 2 }}>{t.label}</div>
                          <div style={{ fontSize: 13, color: '#555' }}>{t.desc}</div>
                      </div>
                      {active && <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--theme-gold)', color: '#000', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✓</div>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
             BRAND TAB — rich editing, Lucide icons, logo upload
             ══════════════════════════════════════════════ */}
          {tab === 'brand' && (
            <div style={{ animation: 'fadeIn 0.25s ease' }}>
              <div style={{
                textAlign: 'center', marginBottom: 20,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                {(logoUrl || selectedSticker) ? (
                  <img src={logoUrl || selectedSticker || ''} style={{ width: 48, height: 48, objectFit: 'contain' }} alt="Logo" />
                ) : null}
                <div style={{ fontFamily: `'${font}',sans-serif`, fontSize: 18, fontWeight: 700, color: '#e8e6ff' }}>{name || 'Your WiFi'}</div>
                <div style={{ fontSize: 12, color: 'rgba(232,230,255,0.5)' }}>{tagline || 'Tagline'}</div>
                {location && <div style={{ fontSize: 10, color: 'rgba(232,230,255,0.4)', marginTop: 1 }}>{location}</div>}
              </div>

              <div style={{ fontSize: 10, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Brand Details</div>
              {[
                { label: 'WiFi Name', value: name, set: setName, placeholder: 'Vertex WiFi' },
                { label: 'Tagline', value: tagline, set: setTagline, placeholder: 'Fast, reliable internet' },
                { label: 'Location', value: location, set: setLocation, placeholder: 'Nairobi, Kenya' },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 3 }}>{f.label}</div>
                  <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #141414', borderRadius: 9, fontSize: 13, fontFamily: 'Inter, sans-serif', color: '#f0f0f0', background: '#000', outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--theme-gold)'}
                    onBlur={e => e.currentTarget.style.borderColor = '#141414'} />
                </div>
              ))}

              <div style={{ fontSize: 10, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.7, margin: '12px 0 10px' }}>Card Text</div>
              {[
                { label: 'Hero Title', value: heroTitle, set: setHeroTitle, placeholder: 'Choose Your Plan' },
                { label: 'Section Heading', value: sectionHeading, set: setSectionHeading, placeholder: 'Internet Packages' },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 3 }}>{f.label}</div>
                  <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #141414', borderRadius: 9, fontSize: 13, fontFamily: 'Inter, sans-serif', color: '#f0f0f0', background: '#000', outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--theme-gold)'}
                    onBlur={e => e.currentTarget.style.borderColor = '#141414'} />
                </div>
              ))}

              <div style={{ fontSize: 10, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.7, margin: '12px 0 10px' }}>Contact</div>
              {[
                { label: 'Support Phone', value: phone, set: setPhone, placeholder: '+254 700 123 456', type: 'tel' },
                { label: 'WhatsApp', value: whatsapp, set: setWhatsapp, placeholder: '+254 700 123 456', type: 'tel' },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 3 }}>{f.label}</div>
                  <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} type={f.type || 'text'}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #141414', borderRadius: 9, fontSize: 13, fontFamily: 'Inter, sans-serif', color: '#f0f0f0', background: '#000', outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--theme-gold)'}
                    onBlur={e => e.currentTarget.style.borderColor = '#141414'} />
                </div>
              ))}

              <div style={{ fontSize: 10, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.7, margin: '12px 0 10px' }}>Technician Contact (optional)</div>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 6, lineHeight: 1.4 }}>
                Shown on first portal visit — clients can save this number to their phone for support.
              </div>
              {[
                { label: 'Technician Name', value: technicianName, set: setTechnicianName, placeholder: 'e.g. John Kamau' },
                { label: 'Technician Phone', value: technicianPhone, set: setTechnicianPhone, placeholder: '+254 712 345 678', type: 'tel' },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 3 }}>{f.label}</div>
                  <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} type={f.type || 'text'}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #141414', borderRadius: 9, fontSize: 13, fontFamily: 'Inter, sans-serif', color: '#f0f0f0', background: '#000', outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--theme-gold)'}
                    onBlur={e => e.currentTarget.style.borderColor = '#141414'} />
                </div>
              ))}

              <div style={{ fontSize: 10, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.7, margin: '12px 0 8px' }}>Brand Sticker</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5, marginBottom: 10 }}>
                {BRAND_STICKERS.map(st => {
                  const active = !logoUrl && selectedSticker === st.src
                  return (
                    <button key={st.name} onClick={() => { setEmoji(st.name); setSelectedSticker(st.src); setLogoUrl(null) }} style={{
                      padding: '7px 0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: active ? '1px solid var(--theme-gold)' : '1px solid #2a2a2a',
                      background: active ? accentRgba(0.15) : 'rgba(255,255,255,0.1)', cursor: 'pointer',
                    }} title={st.name}>
                      <img src={st.src} style={{ width: 24, height: 24, objectFit: 'contain' }} alt={st.name} />
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{
                  flex: 1, padding: '10px 0', borderRadius: 9, border: '1px solid #141414',
                  background: uploading ? 'rgba(255,255,255,0.03)' : '#000',
                  color: uploading ? '#555' : '#666', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 11,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Inter, sans-serif',
                }}>
                  {uploading ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={13} />}
                  {uploading ? 'Uploading...' : 'Upload Logo'}
                </button>
                {logoUrl && (
                  <button onClick={() => { setLogoUrl(null); setSelectedSticker(null); setEmoji('') }} style={{
                    padding: '10px 14px', borderRadius: 9, border: '1px solid #ef4444',
                    background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', fontSize: 11,
                    fontFamily: 'Inter, sans-serif',
                  }}>Remove</button>
                )}
              </div>
              <div style={{ fontSize: 9, color: '#444', lineHeight: 1.4 }}>
                Recommended: 180×180px PNG or SVG. Files larger than recommended size? Use <a href="https://tinypng.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--theme-gold)' }}>TinyPNG</a> or <a href="https://www.iloveimg.com/resize-image" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--theme-gold)' }}>iLoveIMG</a> to resize.
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setUploading(true)
                  const form = new FormData()
                  form.append('file', file); form.append('subfolder', 'assets')
                  try {
                    const res = await fetch(`${API}/api/portal/assets/upload`, {
                      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
                    })
                    if (res.ok) {
                      const data = await res.json()
                      const url = data.asset?.url
                      if (url) {
                        setLogoUrl(toAbsoluteUrl(url))
                        setEmoji(''); setSelectedSticker(null)
                      } else {
                        const fallback = URL.createObjectURL(file)
                        setLogoUrl(fallback)
                        setEmoji(''); setSelectedSticker(null)
                      }
                    } else {
                      const fallback = URL.createObjectURL(file)
                      setLogoUrl(fallback)
                      setEmoji(''); setSelectedSticker(null)
                    }
                  } catch {
                    const fallback = URL.createObjectURL(file)
                    setLogoUrl(fallback)
                    setEmoji('')
                  } finally { setUploading(false) }
                }} />
            </div>
          )}

          {/* ══════════════════════════════════════════════
             FONTS TAB — proper font browser with previews
             ══════════════════════════════════════════════ */}
          {tab === 'fonts' && (
            <div style={{ animation: 'fadeIn 0.25s ease' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#666', marginBottom: 14 }}>
                Choose a Font
              </div>
              {Object.entries(FONT_CATEGORIES).map(([catKey, cat]) => (
                <div key={catKey} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#555', marginBottom: 8, letterSpacing: 0.5 }}>{cat.name}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {cat.fonts.map(f => {
                      const sel = font === f.family
                      return (
                        <button key={f.family} onClick={() => setFont(f.family)} style={{
                          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                          background: sel ? accentRgba(0.06) : 'transparent',
                          border: sel ? `1px solid ${accentRgba(0.25)}` : '1px solid #141414',
                          borderRadius: 10, padding: '10px 14px', textAlign: 'left',
                          transition: 'all 0.2s',
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: `'${f.family}',sans-serif`, fontSize: 15, fontWeight: 600, color: sel ? '#f0f0f0' : '#999', marginBottom: 3, letterSpacing: 0 }}>{f.family}</div>
                            <div style={{ fontFamily: `'${f.family}',sans-serif`, fontSize: 13, color: '#555', letterSpacing: 0, lineHeight: 1.3 }}>{f.preview}</div>
                          </div>
                          {sel && (
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--theme-gold)', color: '#000', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✓</div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══════════════════════════════════════════════
             COLORS TAB (moved from Style)
             ══════════════════════════════════════════════ */}
          {tab === 'colors' && (
            <div style={{ animation: 'fadeIn 0.25s ease' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#666', marginBottom: 12 }}>
                Palette Presets
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                {STYLE_PRESETS.map(sp => {
                  const active = palette === sp.p
                  return (
                    <button key={sp.p} onClick={() => { setPalette(sp.p); setPrimaryColor(sp.hd); setSecondaryColor(sp.bg); setAccentColor(sp.ac) }} style={{
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
                          <span style={{ display: 'block', fontSize: 9, color: 'var(--theme-gold)', fontWeight: 600, marginTop: 2 }}>★ Recommended</span>
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
            </div>
          )}

          {/* ══════════════════════════════════════════════
             EXPORT TAB
             ══════════════════════════════════════════════ */}
          {tab === 'export' && (
            <div style={{ animation: 'fadeIn 0.25s ease' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#666', marginBottom: 16 }}>
                Export & Versions
              </div>
              <button onClick={handleExportZip} disabled={exporting} style={{
                width: '100%', padding: '14px 0', borderRadius: 10, border: '1px solid var(--theme-gold)',
                background: accentRgba(0.1), color: 'var(--theme-gold)', cursor: 'pointer',
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
                {snapshots.map((s: any) => {
                  const isActive = activeSnapshotId === s.id
                  return (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8,
                    background: isActive ? accentRgba(0.1) : '#0a0a0a', marginBottom: 8,
                    border: isActive ? `1.5px solid var(--theme-gold)` : '1px solid #141414',
                  }}>
                    <Clock size={14} style={{ color: isActive ? 'var(--theme-gold)' : '#2a2a2a', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{s.version_tag}</span>
                        {isActive && <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--theme-gold)', background: accentRgba(0.15), padding: '1px 5px', borderRadius: 3, fontFamily: "'DM Mono', monospace" }}>ACTIVE</span>}
                      </div>
                      <div style={{ fontSize: 10, color: '#555' }}>{new Date(s.created_at).toLocaleDateString()}</div>
                    </div>
                    <button onClick={() => restoreSnapshot(s.id)} style={{
                      padding: '4px 10px', borderRadius: 6, border: isActive ? '1px solid var(--theme-gold)' : '1px solid #141414',
                      background: isActive ? accentRgba(0.1) : 'transparent', color: isActive ? 'var(--theme-gold)' : '#666', cursor: 'pointer', fontSize: 10,
                    }}><RotateCcw size={12} /></button>
                  </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Save Bar */}
        <div style={{ padding: 12, borderTop: '1px solid #141414' }}>
          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
            background: saved ? '#22c55e' : 'var(--theme-gold)', color: '#000', cursor: 'pointer',
            fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.3s', fontFamily: 'Inter, sans-serif',
          }}>
            {saving ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <Check size={16} /> : <Save size={16} />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {/* ═══ LOCKED VIEW OVERLAY ═══ */}
      {isLocked && hasSavedConfig && (
        <div className="wizard-locked-overlay" style={{
          position: 'fixed', top: 64, left: 228, width: 420, height: 'calc(100vh - 64px)', zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 32,
        }}>
          <div style={{ width: '100%', maxWidth: 340 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--theme-gold)', marginBottom: 6 }}>Your Portal</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#f0f0f0', marginBottom: 4 }}>Saved Portal Found</div>
              <div style={{ fontSize: 12, color: '#666' }}>Preview your saved versions or unlock to customize.</div>
            </div>

            {/* Saved Versions List */}
            <div style={{ maxHeight: 340, overflowY: 'auto', marginBottom: 16 }}>
              {snapshots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#555', fontSize: 12 }}>No saved versions yet.</div>
              ) : snapshots.map((s: any) => {
                const isActive = activeSnapshotId === s.id
                const isPreview = previewingSnapshot === s.id
                return (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  borderRadius: 10, marginBottom: 6, cursor: 'pointer',
                  background: isActive ? accentRgba(0.15) : isPreview ? accentRgba(0.08) : '#0a0a0a',
                  border: isActive ? `1.5px solid var(--theme-gold)` : isPreview ? `1px solid ${accentRgba(0.3)}` : '1px solid #1a1a1a',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { if (!isActive && !isPreview) e.currentTarget.style.borderColor = '#2a2a2a' }}
                  onMouseLeave={e => { if (!isActive && !isPreview) e.currentTarget.style.borderColor = '#1a1a1a' }}
                >
                  <Clock size={14} style={{ color: isActive ? 'var(--theme-gold)' : isPreview ? 'var(--theme-gold)' : '#444', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#f0f0f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.version_tag}</span>
                      {isActive && <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--theme-gold)', background: accentRgba(0.15), padding: '1px 5px', borderRadius: 3, fontFamily: "'DM Mono', monospace" }}>ACTIVE</span>}
                    </div>
                    <div style={{ fontSize: 10, color: '#555' }}>{new Date(s.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); restoreSnapshot(s.id) }} style={{
                    padding: '5px 8px', borderRadius: 6, border: isActive ? '1px solid var(--theme-gold)' : '1px solid #2a2a2a',
                    background: isActive ? accentRgba(0.1) : 'transparent', color: isActive ? 'var(--theme-gold)' : '#888', cursor: 'pointer', fontSize: 10,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }} title="Restore this version"><RotateCcw size={11} /> {isActive ? 'Loaded' : 'Load'}</button>
                  <button onClick={(e) => { e.stopPropagation(); deleteSnapshot(s.id, s.version_tag) }} style={{
                    padding: '5px 8px', borderRadius: 6, border: '1px solid #2a2a2a',
                    background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 10,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }} title="Delete this version"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
                </div>
                )
              })}
            </div>

            {/* Unlock Button */}
            <button onClick={() => setIsLocked(false)} style={{
              width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
              background: 'var(--theme-gold)', color: '#000', cursor: 'pointer',
              fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Unlock to Customize
            </button>
          </div>
        </div>
      )}

      {/* Right: Phone Preview */}
      <div className="wizard-right-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#000' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 16px', borderBottom: '1px solid #141414', background: '#0a0a0a' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f0' }}>
            {sel?.label || 'Portal'} — {snaps?.n || 'Custom'}
          </span>
        </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'hidden' }}>
            <div style={{
              width: 380, borderRadius: 44, background: '#111', padding: 12,
              boxShadow: '0 0 0 1px #2a2a2a, 0 30px 80px rgba(0,0,0,0.7)', position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)',
                width: 80, height: 6, background: '#111', borderRadius: 99, zIndex: 10,
                border: '1px solid #2a2a2a',
              }} />
              <div style={{ width: 356, height: 780, borderRadius: 32, overflow: 'hidden', position: 'relative' }}>
                {React.createElement('iframe', {
                  key: previewKey,
                  ref: iframeRef,
                  src: previewUrl,
                  onLoad: () => setPreviewLoading(false),
                  scrolling: 'no',
                    style: { width: '375px', height: '812px', border: 'none', display: 'block', transform: `scale(${356/375})`, transformOrigin: 'top left' },
                  title: 'Portal Preview',
                })}
              </div>
              <div style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 130, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
              </div>
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
