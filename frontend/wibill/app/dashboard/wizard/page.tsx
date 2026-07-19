'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import {
  Palette, Type, LayoutGrid, ToggleLeft, Image, Sparkles, CreditCard,
  Download, History, Settings, ChevronLeft, ChevronRight, Monitor,
  Tablet, Smartphone, X, Check, Upload, Plus, Save, RotateCcw,
  Globe, Eye, ChevronDown, ChevronUp, Sliders, Sun, Moon,
  Droplets, Layers, AlignLeft, Bold, Underline, Hash,
  GripVertical, Square, Maximize2, Minimize2, FileDown, QrCode,
  Clock, Share2, Star, Menu, Zap, RefreshCw,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const TEMPLATES = [
  { id: 'executive-dark', name: 'Executive Dark', category: 'business', desc: 'Premium dark theme for corporate ISPs', badge: 'Popular', emoji: '🌟' },
  { id: 'executive-light', name: 'Executive Light', category: 'business', desc: 'Clean light theme for professional services', badge: 'New', emoji: '💼' },
  { id: 'premium-hotel', name: 'Premium Hotel', category: 'business', desc: 'Luxurious theme for hotels and resorts', badge: 'Trending', emoji: '🏨' },
  { id: 'modern-isp', name: 'Modern ISP', category: 'business', desc: 'Bold modern theme for tech-forward ISPs', badge: 'Popular', emoji: '🌐' },
  { id: 'corporate-blue', name: 'Corporate Blue', category: 'business', desc: 'Trustworthy blue theme for enterprise', badge: null, emoji: '💙' },
  { id: 'ocean-deep', name: 'Ocean Deep', category: 'business', desc: 'Deep blue ocean inspired calm theme', badge: null, emoji: '🌊' },
  { id: 'gaming-neon', name: 'Gaming Neon', category: 'entertainment', desc: 'Cyberpunk neon theme for gaming zones', badge: 'Trending', emoji: '🎮' },
  { id: 'cyberpunk', name: 'Cyberpunk', category: 'entertainment', desc: 'Dark futuristic theme with vibrant accents', badge: null, emoji: '⚡' },
  { id: 'streaming-portal', name: 'Streaming Portal', category: 'entertainment', desc: 'Netflix-inspired dark theme', badge: 'Popular', emoji: '🎬' },
  { id: 'rgb-wave', name: 'RGB Wave', category: 'entertainment', desc: 'Colorful RGB theme for tech events', badge: 'New', emoji: '🌈' },
  { id: 'sunset-vibes', name: 'Sunset Vibes', category: 'entertainment', desc: 'Warm sunset gradient theme', badge: null, emoji: '🌅' },
  { id: 'midnight-purple', name: 'Midnight Purple', category: 'entertainment', desc: 'Deep purple theme for premium lounges', badge: null, emoji: '💜' },
  { id: 'glass-morphism', name: 'Glass', category: 'minimal', desc: 'Modern glassmorphism design', badge: 'Popular', emoji: '🪟' },
  { id: 'apple-style', name: 'Apple Style', category: 'minimal', desc: 'Clean Apple-inspired minimal design', badge: null, emoji: '🍎' },
  { id: 'material-design', name: 'Material', category: 'minimal', desc: 'Google Material Design 3 inspired', badge: null, emoji: '📐' },
  { id: 'clean-white', name: 'Clean White', category: 'minimal', desc: 'Bright and clean white theme', badge: null, emoji: '⬜' },
  { id: 'cherry-blossom', name: 'Cherry Blossom', category: 'minimal', desc: 'Soft pink theme with elegance', badge: 'New', emoji: '🌸' },
  { id: 'kenyan-gold', name: 'Kenyan Gold', category: 'local', desc: 'Celebrate Kenya with gold and black', badge: 'Popular', emoji: '🦁' },
  { id: 'safari', name: 'Safari', category: 'local', desc: 'Earthy tones inspired by the savannah', badge: null, emoji: '🌿' },
  { id: 'afro-modern', name: 'Afro Modern', category: 'local', desc: 'Bold African patterns meets modern design', badge: 'New', emoji: '🎨' },
  { id: 'nairobi-night', name: 'Nairobi Night', category: 'local', desc: 'City lights inspired dark theme', badge: null, emoji: '🌃' },
  { id: 'coffee-shop', name: 'Coffee Shop', category: 'local', desc: 'Warm brown theme perfect for cafes', badge: 'New', emoji: '☕' },
]

const CATEGORIES = [
  { id: 'business', name: 'Business', emoji: '💼' },
  { id: 'entertainment', name: 'Entertainment', emoji: '🎮' },
  { id: 'minimal', name: 'Minimal', emoji: '◻️' },
  { id: 'local', name: 'Local', emoji: '🌍' },
]

const FONT_CATEGORIES: Record<string, { name: string; fonts: string[] }> = {
  corporate: { name: 'Corporate', fonts: ['Inter', 'Roboto', 'IBM Plex Sans', 'Open Sans', 'Lato', 'Nunito'] },
  luxury: { name: 'Luxury', fonts: ['Playfair Display', 'Cormorant Garamond', 'DM Serif Display', 'Libre Baskerville'] },
  modern: { name: 'Modern', fonts: ['Space Grotesk', 'Manrope', 'Sora', 'Outfit', 'Plus Jakarta Sans', 'Clash Grotesk'] },
  tech: { name: 'Tech', fonts: ['Orbitron', 'Exo 2', 'Audiowide', 'Rajdhani', 'Syncopate'] },
}

const CARD_STYLES = [
  { id: 'glass', name: 'Glass', icon: Square },
  { id: 'outline', name: 'Outline', icon: Square },
  { id: 'minimal', name: 'Minimal', icon: Minimize2 },
  { id: 'floating', name: 'Floating', icon: Maximize2 },
  { id: 'sharp', name: 'Sharp', icon: Square },
]

const ANIMATIONS = [
  { id: 'fade-in', name: 'Fade In', icon: Sun },
  { id: 'slide-up', name: 'Slide Up', icon: ChevronUp },
  { id: 'zoom', name: 'Zoom', icon: Maximize2 },
]

const SECTION_OPTIONS = [
  { id: 'hero', label: 'Hero / Welcome', default: true },
  { id: 'logo', label: 'Logo Area', default: true },
  { id: 'welcome_text', label: 'Welcome Text', default: true },
  { id: 'packages', label: 'Package Cards', default: true },
  { id: 'promo_banner', label: 'Promotion Banner', default: false },
  { id: 'countdown', label: 'Countdown Timer', default: false },
  { id: 'reviews', label: 'Testimonials', default: false },
  { id: 'qr_code', label: 'QR Code', default: false },
  { id: 'social_links', label: 'Social Links', default: false },
  { id: 'faq', label: 'FAQ', default: false },
  { id: 'terms', label: 'Terms & Conditions', default: true },
  { id: 'footer', label: 'Footer', default: true },
]

const COMPONENT_TOGGLES = [
  { id: 'saved_number_login', label: 'Saved Number Login', default: true },
  { id: 'session_timer', label: 'Session Timer', default: true },
  { id: 'terms_checkbox', label: 'T&C Checkbox', default: true },
  { id: 'share_button', label: 'Share WiFi', default: false },
]

const PAYMENT_TOGGLES = [
  { id: 'mpesa_stk', label: 'M-Pesa STK Push', default: true },
  { id: 'card_payments', label: 'Card Payments', default: false },
  { id: 'vouchers', label: 'Vouchers', default: true },
  { id: 'sms_receipts', label: 'SMS Receipts', default: false },
]

const BG_TYPES = [
  { id: 'solid', label: 'Solid', icon: Square },
  { id: 'gradient', label: 'Gradient', icon: Droplets },
  { id: 'image', label: 'Image', icon: Image },
]

const BTN_STYLES = [
  { id: 'rounded', label: 'Rounded' },
  { id: 'pill', label: 'Pill' },
  { id: 'sharp', label: 'Sharp' },
]

function getTemplatePreset(templateId: string) {
  const presets: Record<string, any> = {
    'executive-dark': { theme: { primary_color: '#E8B84B', secondary_color: '#1a1a2e', accent_color: '#f0c27a', background_type: 'solid', background_value: '#0f0f1a', overlay_opacity: 0.4, overlay_color: '#000000', button_style: 'rounded' }, typography: { font_family: 'Space Grotesk', heading_size: 36, body_size: 16, font_weight: 600, letter_spacing: 0.5, heading_case: 'normal' }, card: { style: 'glass', radius: 16, elevation: 0, size: 'compact' } },
    'executive-light': { theme: { primary_color: '#2D3436', secondary_color: '#f5f6fa', accent_color: '#0984e3', background_type: 'solid', background_value: '#ffffff', overlay_opacity: 0.1, overlay_color: '#000000', button_style: 'rounded' }, typography: { font_family: 'Inter', heading_size: 32, body_size: 15, font_weight: 500, letter_spacing: 0.3, heading_case: 'normal' }, card: { style: 'outline', radius: 12, elevation: 0, size: 'comfortable' } },
    'premium-hotel': { theme: { primary_color: '#C9A96E', secondary_color: '#1c1c1c', accent_color: '#e8d5a3', background_type: 'gradient', background_value: '#1a1410', gradient: 'linear-gradient(135deg, #1a1410 0%, #2d2318 100%)', overlay_opacity: 0.3, overlay_color: '#000000', button_style: 'pill' }, typography: { font_family: 'Playfair Display', heading_size: 42, body_size: 16, font_weight: 400, letter_spacing: 1.0, heading_case: 'uppercase' }, card: { style: 'minimal', radius: 8, elevation: 0, size: 'large' } },
    'modern-isp': { theme: { primary_color: '#00E676', secondary_color: '#0d1117', accent_color: '#58a6ff', background_type: 'solid', background_value: '#0d1117', overlay_opacity: 0.3, overlay_color: '#000000', button_style: 'rounded' }, typography: { font_family: 'Space Grotesk', heading_size: 34, body_size: 15, font_weight: 600, letter_spacing: 0.2, heading_case: 'normal' }, card: { style: 'glass', radius: 14, elevation: 1, size: 'comfortable' } },
    'corporate-blue': { theme: { primary_color: '#1a73e8', secondary_color: '#1e1e2f', accent_color: '#8ab4f8', background_type: 'solid', background_value: '#1e1e2f', overlay_opacity: 0.3, overlay_color: '#000000', button_style: 'rounded' }, typography: { font_family: 'IBM Plex Sans', heading_size: 30, body_size: 15, font_weight: 500, letter_spacing: 0.2, heading_case: 'normal' }, card: { style: 'outline', radius: 10, elevation: 0, size: 'compact' } },
    'gaming-neon': { theme: { primary_color: '#ff00ff', secondary_color: '#0a001a', accent_color: '#00ffff', background_type: 'solid', background_value: '#0a001a', overlay_opacity: 0.4, overlay_color: '#000000', button_style: 'sharp' }, typography: { font_family: 'Orbitron', heading_size: 38, body_size: 15, font_weight: 700, letter_spacing: 2.0, heading_case: 'uppercase' }, card: { style: 'glass', radius: 4, elevation: 2, size: 'compact' } },
    'cyberpunk': { theme: { primary_color: '#ff6b35', secondary_color: '#0d0d0d', accent_color: '#ffd700', background_type: 'solid', background_value: '#0d0d0d', overlay_opacity: 0.5, overlay_color: '#000000', button_style: 'sharp' }, typography: { font_family: 'Exo 2', heading_size: 36, body_size: 14, font_weight: 700, letter_spacing: 1.5, heading_case: 'uppercase' }, card: { style: 'floating', radius: 8, elevation: 3, size: 'compact' } },
    'streaming-portal': { theme: { primary_color: '#e50914', secondary_color: '#141414', accent_color: '#ffffff', background_type: 'solid', background_value: '#141414', overlay_opacity: 0.3, overlay_color: '#000000', button_style: 'rounded' }, typography: { font_family: 'Inter', heading_size: 32, body_size: 16, font_weight: 700, letter_spacing: 0.3, heading_case: 'normal' }, card: { style: 'minimal', radius: 4, elevation: 0, size: 'comfortable' } },
    'rgb-wave': { theme: { primary_color: '#ff0080', secondary_color: '#0a0a1a', accent_color: '#7000ff', background_type: 'gradient', background_value: '#0a0a1a', gradient: 'linear-gradient(135deg, #0a0a1a 0%, #1a0030 50%, #0a001a 100%)', overlay_opacity: 0.4, overlay_color: '#000000', button_style: 'pill' }, typography: { font_family: 'Space Grotesk', heading_size: 40, body_size: 15, font_weight: 700, letter_spacing: 1.0, heading_case: 'uppercase' }, card: { style: 'glass', radius: 20, elevation: 2, size: 'compact' } },
    'glass-morphism': { theme: { primary_color: '#ffffff', secondary_color: 'rgba(255,255,255,0.05)', accent_color: '#60a5fa', background_type: 'gradient', background_value: '#0f172a', gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', overlay_opacity: 0.2, overlay_color: '#000000', button_style: 'rounded' }, typography: { font_family: 'Inter', heading_size: 28, body_size: 14, font_weight: 400, letter_spacing: 0.2, heading_case: 'normal' }, card: { style: 'glass', radius: 24, elevation: 0, size: 'comfortable' } },
    'apple-style': { theme: { primary_color: '#1d1d1f', secondary_color: '#f5f5f7', accent_color: '#0071e3', background_type: 'solid', background_value: '#f5f5f7', overlay_opacity: 0, overlay_color: '#000000', button_style: 'pill' }, typography: { font_family: 'Inter', heading_size: 48, body_size: 17, font_weight: 600, letter_spacing: -0.5, heading_case: 'normal' }, card: { style: 'minimal', radius: 16, elevation: 0, size: 'large' } },
    'material-design': { theme: { primary_color: '#6750A4', secondary_color: '#1c1b1f', accent_color: '#D0BCFF', background_type: 'solid', background_value: '#1c1b1f', overlay_opacity: 0.2, overlay_color: '#000000', button_style: 'rounded' }, typography: { font_family: 'Inter', heading_size: 30, body_size: 14, font_weight: 500, letter_spacing: 0.1, heading_case: 'normal' }, card: { style: 'outline', radius: 28, elevation: 0, size: 'compact' } },
    'clean-white': { theme: { primary_color: '#333333', secondary_color: '#ffffff', accent_color: '#4A90D9', background_type: 'solid', background_value: '#ffffff', overlay_opacity: 0, overlay_color: '#000000', button_style: 'rounded' }, typography: { font_family: 'Inter', heading_size: 32, body_size: 16, font_weight: 400, letter_spacing: 0.3, heading_case: 'normal' }, card: { style: 'outline', radius: 8, elevation: 0, size: 'comfortable' } },
    'kenyan-gold': { theme: { primary_color: '#DAA520', secondary_color: '#0a0a0a', accent_color: '#FFD700', background_type: 'gradient', background_value: '#0a0a0a', gradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a1400 100%)', overlay_opacity: 0.3, overlay_color: '#000000', button_style: 'rounded' }, typography: { font_family: 'Space Grotesk', heading_size: 34, body_size: 16, font_weight: 600, letter_spacing: 0.3, heading_case: 'normal' }, card: { style: 'glass', radius: 12, elevation: 1, size: 'compact' } },
    'safari': { theme: { primary_color: '#C4873B', secondary_color: '#2a1f14', accent_color: '#E8B84B', background_type: 'gradient', background_value: '#2a1f14', gradient: 'linear-gradient(180deg, #2a1f14 0%, #1a120a 100%)', overlay_opacity: 0.4, overlay_color: '#000000', button_style: 'pill' }, typography: { font_family: 'Space Grotesk', heading_size: 36, body_size: 15, font_weight: 500, letter_spacing: 0.5, heading_case: 'normal' }, card: { style: 'minimal', radius: 8, elevation: 0, size: 'comfortable' } },
    'afro-modern': { theme: { primary_color: '#E85D26', secondary_color: '#1a0f0a', accent_color: '#F5A623', background_type: 'solid', background_value: '#1a0f0a', overlay_opacity: 0.4, overlay_color: '#000000', button_style: 'rounded' }, typography: { font_family: 'Space Grotesk', heading_size: 32, body_size: 15, font_weight: 700, letter_spacing: 0.5, heading_case: 'uppercase' }, card: { style: 'glass', radius: 16, elevation: 2, size: 'compact' } },
    'nairobi-night': { theme: { primary_color: '#6C3EB8', secondary_color: '#0a0a14', accent_color: '#B388FF', background_type: 'solid', background_value: '#0a0a14', overlay_opacity: 0.4, overlay_color: '#000000', button_style: 'rounded' }, typography: { font_family: 'Inter', heading_size: 30, body_size: 14, font_weight: 500, letter_spacing: 0.3, heading_case: 'normal' }, card: { style: 'floating', radius: 16, elevation: 2, size: 'compact' } },
    'sunset-vibes': { theme: { primary_color: '#FF6B6B', secondary_color: '#1a0a0a', accent_color: '#FFE66D', background_type: 'gradient', background_value: '#1a0a0a', gradient: 'linear-gradient(135deg, #1a0a0a 0%, #2d1b1b 50%, #1a1410 100%)', overlay_opacity: 0.3, overlay_color: '#000000', button_style: 'pill' }, typography: { font_family: 'Space Grotesk', heading_size: 34, body_size: 15, font_weight: 500, letter_spacing: 0.4, heading_case: 'normal' }, card: { style: 'glass', radius: 18, elevation: 0, size: 'comfortable' } },
    'ocean-deep': { theme: { primary_color: '#0077B6', secondary_color: '#03045E', accent_color: '#00B4D8', background_type: 'gradient', background_value: '#03045E', gradient: 'linear-gradient(180deg, #03045E 0%, #023E8A 100%)', overlay_opacity: 0.3, overlay_color: '#000000', button_style: 'rounded' }, typography: { font_family: 'Inter', heading_size: 32, body_size: 15, font_weight: 500, letter_spacing: 0.5, heading_case: 'normal' }, card: { style: 'glass', radius: 12, elevation: 0, size: 'comfortable' } },
    'midnight-purple': { theme: { primary_color: '#9b59b6', secondary_color: '#0d0015', accent_color: '#f1c40f', background_type: 'solid', background_value: '#0d0015', overlay_opacity: 0.4, overlay_color: '#000000', button_style: 'pill' }, typography: { font_family: 'Space Grotesk', heading_size: 36, body_size: 15, font_weight: 600, letter_spacing: 0.8, heading_case: 'normal' }, card: { style: 'glass', radius: 16, elevation: 2, size: 'compact' } },
    'coffee-shop': { theme: { primary_color: '#D4A574', secondary_color: '#1C1512', accent_color: '#8B5E3C', background_type: 'solid', background_value: '#1C1512', overlay_opacity: 0.3, overlay_color: '#000000', button_style: 'rounded' }, typography: { font_family: 'Space Grotesk', heading_size: 30, body_size: 14, font_weight: 500, letter_spacing: 0.3, heading_case: 'normal' }, card: { style: 'minimal', radius: 8, elevation: 0, size: 'comfortable' } },
    'cherry-blossom': { theme: { primary_color: '#FFB7C5', secondary_color: '#1a1014', accent_color: '#d4a0a0', background_type: 'gradient', background_value: '#1a1014', gradient: 'linear-gradient(135deg, #1a1014 0%, #2d1a20 100%)', overlay_opacity: 0.3, overlay_color: '#000000', button_style: 'pill' }, typography: { font_family: 'Inter', heading_size: 30, body_size: 14, font_weight: 400, letter_spacing: 0.5, heading_case: 'normal' }, card: { style: 'glass', radius: 20, elevation: 0, size: 'comfortable' } },
  }
  return presets[templateId] || presets['executive-dark']
}

const INITIAL_CONFIG = {
  template_id: 'executive-dark',
  brand: { name: '', tagline: '', location: '', emoji: '📶', support_phone: '', logo_url: null },
  theme: { primary_color: '#E8B84B', secondary_color: '#1a1a2e', accent_color: '#f0c27a', background_type: 'solid', background_value: '#0f0f1a', gradient: null, background_url: null, overlay_opacity: 0.4, overlay_color: '#000000', button_style: 'rounded', button_gradient: null },
  typography: { font_family: 'Space Grotesk', heading_size: 36, body_size: 16, font_weight: 600, letter_spacing: 0.5, heading_case: 'normal' },
  card: { style: 'glass', radius: 16, elevation: 0, size: 'compact' },
  layout: { sections: ['hero', 'logo', 'packages', 'footer'], banner_position: 'top' },
  components: { hero: true, logo: true, welcome_text: true, packages: true, promo_banner: false, countdown: false, reviews: false, qr_code: false, social_links: false, faq: false, terms: true, footer: true, saved_number_login: true, session_timer: true, terms_checkbox: true, share_button: false },
  animations: { entrance: 'fade-in', floating_logo: false, particles: false, pulse_button: false, ripple: false },
  network_awareness: { show_status_banner: false, custom_status_message: '' },
  enabled_features: { mpesa_stk: true, card_payments: false, vouchers: true, sms_receipts: false },
}

function Swatch({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: 32, height: 32, borderRadius: 8, background: color,
      border: selected ? '2px solid #fff' : '2px solid transparent',
      outline: selected ? '2px solid ' + color : 'none',
      cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
    }} />
  )
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: 32, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer', padding: 0, background: 'transparent' }} />
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 10px', color: '#fff', fontSize: 12, fontFamily: 'DM Mono, monospace' }} />
    </div>
  )
}

function SliderField({ label, value, min, max, step, onChange, suffix }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
        <span>{label}</span>
        <span>{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--theme-gold)' }} />
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} style={{
      width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
      background: checked ? 'var(--theme-gold)' : 'rgba(255,255,255,0.15)',
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

function CollapsiblePanel({ title, icon: Icon, defaultOpen, children }: { title: string; icon: any; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  return (
    <div style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px', background: 'transparent', border: 'none',
        color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 12,
        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        {Icon && <Icon size={14} style={{ opacity: 0.5 }} />}
        <span style={{ flex: 1, textAlign: 'left' }}>{title}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && <div style={{ padding: '0 16px 16px' }}>{children}</div>}
    </div>
  )
}

function GradientPreview({ gradient }: { gradient: string | null }) {
  if (!gradient) return null
  return <div style={{ height: 4, borderRadius: 2, background: gradient, marginTop: 8 }} />
}

export default function PortalWizard() {
  const router = useRouter()
  const { user, token } = useAuth()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'gallery' | 'editor'>('gallery')
  const [activeCategory, setActiveCategory] = useState('business')
  const [config, setConfig] = useState(INITIAL_CONFIG)
  const [activePanel, setActivePanel] = useState('theme')
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'phone'>('phone')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [exporting, setExporting] = useState(false)

  const PANELS = [
    { id: 'theme', icon: Palette, label: 'Theme Studio' },
    { id: 'typography', icon: Type, label: 'Typography' },
    { id: 'brand', icon: Settings, label: 'Brand' },
    { id: 'cards', icon: CreditCard, label: 'Package Cards' },
    { id: 'layout', icon: LayoutGrid, label: 'Layout' },
    { id: 'components', icon: ToggleLeft, label: 'Components' },
    { id: 'background', icon: Image, label: 'Background' },
    { id: 'animation', icon: Sparkles, label: 'Animation' },
    { id: 'export', icon: Download, label: 'Export' },
    { id: 'versions', icon: History, label: 'Versions' },
  ]

  const filteredTemplates = TEMPLATES.filter(t => t.category === activeCategory)

  function selectTemplate(templateId: string) {
    const preset = getTemplatePreset(templateId)
    setConfig(prev => ({
      ...prev,
      template_id: templateId,
      theme: { ...prev.theme, ...preset.theme },
      typography: { ...prev.typography, ...preset.typography },
      card: { ...prev.card, ...preset.card },
    }))
    setStep('editor')
  }

  function updateTheme(key: string, value: any) {
    setConfig(prev => {
      const next = { ...prev, theme: { ...prev.theme, [key]: value } }
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

  function updateBrand(key: string, value: any) {
    setConfig(prev => {
      const next = { ...prev, brand: { ...prev.brand, [key]: value } }
      scheduleBroadcast(next)
      return next
    })
  }

  function updateComponent(key: string, value: boolean) {
    setConfig(prev => ({
      ...prev,
      components: { ...prev.components, [key]: value },
      layout: {
        ...prev.layout,
        sections: value
          ? [...new Set([...prev.layout.sections, key])]
          : prev.layout.sections.filter(s => s !== key),
      },
    }))
  }

  function updateAnimation(key: string, value: any) {
    setConfig(prev => {
      const next = { ...prev, animations: { ...prev.animations, [key]: value } }
      scheduleBroadcast(next)
      return next
    })
  }

  function updateNetworkAwareness(key: string, value: any) {
    setConfig(prev => ({ ...prev, network_awareness: { ...prev.network_awareness, [key]: value } }))
  }

  function updateFeature(key: string, value: boolean) {
    setConfig(prev => ({ ...prev, enabled_features: { ...prev.enabled_features, [key]: value } }))
  }

  function toggleSection(sectionId: string) {
    setConfig(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        sections: prev.layout.sections.includes(sectionId)
          ? prev.layout.sections.filter(s => s !== sectionId)
          : [...prev.layout.sections, sectionId],
      },
    }))
  }

  const broadcastTimer = useRef<any>(null)
  function scheduleBroadcast(cfg: any) {
    if (broadcastTimer.current) clearTimeout(broadcastTimer.current)
    broadcastTimer.current = setTimeout(() => broadcastToPreview(cfg), 50)
  }

  function broadcastToPreview(cfg: any) {
    if (!iframeRef.current?.contentWindow) return
    const t = cfg.theme
    try {
      iframeRef.current.contentWindow.postMessage({
        type: 'UPDATE_PALETTE',
        palette: {
          primary: t.primary_color,
          secondary: t.secondary_color,
          accent: t.accent_color,
          bg: t.background_value,
          overlay: t.overlay_color,
          overlayOpacity: t.overlay_opacity,
        },
      }, '*')
      iframeRef.current.contentWindow.postMessage({
        type: 'UPDATE_BRAND_NAME',
        brandName: cfg.brand.name || 'Your ISP',
      }, '*')
      iframeRef.current.contentWindow.postMessage({
        type: 'UPDATE_TYPOGRAPHY',
        fontFamily: cfg.typography.font_family,
        headingSize: cfg.typography.heading_size,
        bodySize: cfg.typography.body_size,
        fontWeight: cfg.typography.font_weight,
        letterSpacing: cfg.typography.letter_spacing,
      }, '*')
      iframeRef.current.contentWindow.postMessage({
        type: 'UPDATE_CARD_STYLE',
        radius: cfg.card.radius + 'px',
        size: cfg.card.size,
        style: cfg.card.style,
      }, '*')
      iframeRef.current.contentWindow.postMessage({
        type: 'SET_CSS_VARS',
        vars: {
          '--primary': t.primary_color,
          '--secondary': t.secondary_color,
          '--accent': t.accent_color,
          '--bg': t.background_value,
          '--bg-gradient': t.gradient || 'none',
          '--overlay': t.overlay_color,
          '--overlay-opacity': String(t.overlay_opacity),
          '--font-family': cfg.typography.font_family,
          '--heading-size': cfg.typography.heading_size + 'px',
          '--body-size': cfg.typography.body_size + 'px',
          '--font-weight': String(cfg.typography.font_weight),
          '--card-radius': cfg.card.radius + 'px',
        },
      }, '*')
    } catch {}
  }

  const previewUrl = useCallback(() => {
    const t = config.template_id
    const baseId = ['executive-dark', 'executive-light', 'modern-isp', 'corporate-blue', 'ocean-deep', 'streaming-portal', 'glass-morphism', 'material-design', 'kenyan-gold', 'nairobi-night', 'cherry-blossom'].includes(t) ? 'dashboard' : ['premium-hotel', 'gaming-neon', 'rgb-wave', 'apple-style', 'clean-white', 'safari', 'sunset-vibes', 'coffee-shop'].includes(t) ? 'spotlight' : ['cyberpunk', 'afro-modern', 'midnight-purple'].includes(t) ? 'stories' : 'spotlight'
    const brand = config.brand
    const params = new URLSearchParams({
      template_id: baseId,
      name: brand.name || 'Your ISP',
      tagline: brand.tagline || '',
      location: brand.location || '',
      emoji: brand.emoji || '📶',
      font_family: config.typography.font_family,
      card_radius: config.card.radius + 'px',
      layout_size: config.card.size,
    })
    return `${API}/api/v1/portal-previews/${baseId}?${params.toString()}`
  }, [config])

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
      if (res.ok) {
        setShowVersions(true)
        loadSnapshots()
      }
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
        setConfig(prev => ({ ...prev, ...data.portal_config }))
        loadSnapshots()
      }
    } catch {}
  }

  useEffect(() => {
    if (showVersions) loadSnapshots()
  }, [showVersions])

  useEffect(() => {
    const saved = localStorage.getItem('wb_portal_draft')
    if (saved) {
      try {
        setConfig(JSON.parse(saved))
      } catch {}
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('wb_portal_draft', JSON.stringify(config))
    }, 1000)
    return () => clearTimeout(timer)
  }, [config])

  const displayName = user?.tenant_name || (user?.email?.split('@')[0] || 'My ISP')

  if (step === 'gallery') {
    return (
      <div style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '40px 0' }}>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ marginBottom: 48, textAlign: 'center' }}>
            <h1 style={{ fontSize: 40, fontWeight: 700, marginBottom: 8, background: 'linear-gradient(135deg, var(--theme-gold), #f0c27a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Portal Design Studio</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>Choose a starting point. You can customize everything later.</p>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
                padding: '10px 20px', borderRadius: 12, border: '0.5px solid',
                borderColor: activeCategory === cat.id ? 'var(--theme-gold)' : 'rgba(255,255,255,0.1)',
                background: activeCategory === cat.id ? 'rgba(232, 184, 75, 0.1)' : 'rgba(255,255,255,0.03)',
                color: activeCategory === cat.id ? 'var(--theme-gold)' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer', fontSize: 14, fontWeight: 500, transition: 'all 0.2s',
              }}>
                {cat.emoji} {cat.name}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {filteredTemplates.map(t => (
              <button key={t.id} onClick={() => selectTemplate(t.id)}
                style={{
                  background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '0.5px solid rgba(255,255,255,0.08)',
                  padding: 0, cursor: 'pointer', overflow: 'hidden', transition: 'all 0.25s', textAlign: 'left', display: 'block',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--theme-gold)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                <div style={{ height: 140, background: 'linear-gradient(135deg, var(--theme-gold)22, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                  {t.emoji}
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{t.name}</span>
                    {t.badge && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--theme-gold)', color: '#000', fontWeight: 600 }}>{t.badge}</span>}
                  </div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{t.desc}</p>
                  {t.badge === 'Popular' && <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                    {[1,2,3,4,5].map(i => <Star key={i} size={12} color="var(--theme-gold)" fill="var(--theme-gold)" />)}
                  </div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const theme = config.theme
  const typography = config.typography
  const card = config.card
  const brand = config.brand
  const components = config.components

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#000', color: '#fff', overflow: 'hidden' }}>
      {/* ─── Left Sidebar (Settings Panels) ─── */}
      <div style={{ width: 56, background: '#0a0a0a', borderRight: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0', flexShrink: 0 }}>
        {PANELS.map(p => (
          <button key={p.id} onClick={() => setActivePanel(p.id)} title={p.label} style={{
            width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 2,
            background: activePanel === p.id ? 'rgba(232,184,75,0.15)' : 'transparent',
            color: activePanel === p.id ? 'var(--theme-gold)' : 'rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
          }}>
            <p.icon size={18} />
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => setStep('gallery')} title="Back to gallery" style={{
          width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer',
          background: 'transparent', color: 'rgba(255,255,255,0.3)', fontSize: 10,
        }}>
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* ─── Panel Content ─── */}
      <div style={{ width: 320, background: '#0a0a0a', borderRight: '0.5px solid rgba(255,255,255,0.06)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {(() => {
              const p = PANELS.find(x => x.id === activePanel)
              return p ? <p.icon size={16} style={{ color: 'var(--theme-gold)' }} /> : null
            })()}
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{PANELS.find(p => p.id === activePanel)?.label}</span>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* ── Theme Studio Panel ── */}
          {activePanel === 'theme' && (
            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Primary Color</label>
                <ColorInput label="" value={theme.primary_color} onChange={v => updateTheme('primary_color', v)} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Secondary Color</label>
                <ColorInput label="" value={theme.secondary_color} onChange={v => updateTheme('secondary_color', v)} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Accent Color</label>
                <ColorInput label="" value={theme.accent_color} onChange={v => updateTheme('accent_color', v)} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Button Style</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {BTN_STYLES.map(bs => (
                    <button key={bs.id} onClick={() => updateTheme('button_style', bs.id)} style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, border: '0.5px solid',
                      borderColor: theme.button_style === bs.id ? 'var(--theme-gold)' : 'rgba(255,255,255,0.1)',
                      background: theme.button_style === bs.id ? 'rgba(232,184,75,0.1)' : 'rgba(255,255,255,0.03)',
                      color: theme.button_style === bs.id ? 'var(--theme-gold)' : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer', fontSize: 11, fontWeight: 500,
                    }}>{bs.label}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Background Type</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {BG_TYPES.map(bg => (
                    <button key={bg.id} onClick={() => updateTheme('background_type', bg.id)} style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, border: '0.5px solid',
                      borderColor: theme.background_type === bg.id ? 'var(--theme-gold)' : 'rgba(255,255,255,0.1)',
                      background: theme.background_type === bg.id ? 'rgba(232,184,75,0.1)' : 'rgba(255,255,255,0.03)',
                      color: theme.background_type === bg.id ? 'var(--theme-gold)' : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer', fontSize: 11,
                    }}><bg.icon size={14} style={{ marginRight: 4, display: 'inline' }} />{bg.label}</button>
                  ))}
                </div>
              </div>
              {theme.background_type === 'solid' && (
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Background Color</label>
                  <ColorInput label="" value={theme.background_value} onChange={v => updateTheme('background_value', v)} />
                </div>
              )}
              {theme.background_type === 'gradient' && (
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gradient</label>
                  <input type="text" value={theme.gradient || ''} onChange={e => updateTheme('gradient', e.target.value)}
                    placeholder="linear-gradient(135deg, #000, #333)"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 11, fontFamily: 'DM Mono, monospace' }} />
                  <GradientPreview gradient={theme.gradient} />
                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Background Color (fallback)</label>
                    <ColorInput label="" value={theme.background_value} onChange={v => updateTheme('background_value', v)} />
                  </div>
                </div>
              )}
              {theme.background_type === 'image' && (
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Background Image URL</label>
                  <input type="text" value={theme.background_url || ''} onChange={e => updateTheme('background_url', e.target.value)}
                    placeholder="https://example.com/bg.jpg"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }} />
                </div>
              )}
              <div style={{ marginTop: 20 }}>
                <SliderField label="Overlay Opacity" value={Math.round(theme.overlay_opacity * 100)} min={0} max={100} step={5} onChange={v => updateTheme('overlay_opacity', v / 100)} suffix="%" />
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overlay Color</label>
                  <ColorInput label="" value={theme.overlay_color} onChange={v => updateTheme('overlay_color', v)} />
                </div>
              </div>
            </div>
          )}

          {/* ── Typography Panel ── */}
          {activePanel === 'typography' && (
            <div style={{ padding: 16 }}>
              {Object.entries(FONT_CATEGORIES).map(([catKey, cat]) => (
                <div key={catKey} style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cat.name}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {cat.fonts.map(font => (
                      <button key={font} onClick={() => updateTypography('font_family', font)} style={{
                        padding: '6px 12px', borderRadius: 8, border: '0.5px solid',
                        borderColor: typography.font_family === font ? 'var(--theme-gold)' : 'rgba(255,255,255,0.08)',
                        background: typography.font_family === font ? 'rgba(232,184,75,0.1)' : 'rgba(255,255,255,0.03)',
                        color: typography.font_family === font ? 'var(--theme-gold)' : 'rgba(255,255,255,0.6)',
                        cursor: 'pointer', fontSize: 12, fontFamily: `'${font}', sans-serif`,
                        transition: 'all 0.15s',
                      }}>{font}</button>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
                <SliderField label="Heading Size" value={typography.heading_size} min={20} max={60} step={2} onChange={v => updateTypography('heading_size', v)} suffix="px" />
                <div style={{ marginTop: 12 }}>
                  <SliderField label="Body Size" value={typography.body_size} min={12} max={24} step={1} onChange={v => updateTypography('body_size', v)} suffix="px" />
                </div>
                <div style={{ marginTop: 12 }}>
                  <SliderField label="Font Weight" value={typography.font_weight} min={300} max={900} step={100} onChange={v => updateTypography('font_weight', v)} />
                </div>
                <div style={{ marginTop: 12 }}>
                  <SliderField label="Letter Spacing" value={typography.letter_spacing} min={-2} max={4} step={0.1} onChange={v => updateTypography('letter_spacing', v)} suffix="px" />
                </div>
                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Heading Case</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['normal', 'uppercase', 'lowercase'].map(c => (
                      <button key={c} onClick={() => updateTypography('heading_case', c)} style={{
                        flex: 1, padding: '6px 0', borderRadius: 8, border: '0.5px solid',
                        borderColor: typography.heading_case === c ? 'var(--theme-gold)' : 'rgba(255,255,255,0.1)',
                        background: typography.heading_case === c ? 'rgba(232,184,75,0.1)' : 'rgba(255,255,255,0.03)',
                        color: typography.heading_case === c ? 'var(--theme-gold)' : 'rgba(255,255,255,0.5)',
                        cursor: 'pointer', fontSize: 11,
                      }}>{c}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Brand Panel ── */}
          {activePanel === 'brand' && (
            <div style={{ padding: 16 }}>
              {[
                { key: 'name', label: 'ISP Name', placeholder: 'My ISP' },
                { key: 'tagline', label: 'Tagline', placeholder: 'Fast & Reliable WiFi' },
                { key: 'location', label: 'Location', placeholder: 'Nairobi, Kenya' },
                { key: 'support_phone', label: 'Support Phone', placeholder: '+254 700 000 000' },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{field.label}</label>
                  <input type="text" value={(brand as any)[field.key] || ''} onChange={e => updateBrand(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13 }} />
                </div>
              ))}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Emoji / Icon</label>
                <input type="text" value={brand.emoji} onChange={e => updateBrand('emoji', e.target.value)}
                  placeholder="📶" maxLength={4}
                  style={{ width: 60, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px', color: '#fff', fontSize: 24, textAlign: 'center' }} />
              </div>
            </div>
          )}

          {/* ── Cards Panel ── */}
          {activePanel === 'cards' && (
            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Card Style</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {CARD_STYLES.map(cs => (
                    <button key={cs.id} onClick={() => updateCard('style', cs.id)} style={{
                      padding: '10px 0', borderRadius: 8, border: '0.5px solid',
                      borderColor: card.style === cs.id ? 'var(--theme-gold)' : 'rgba(255,255,255,0.08)',
                      background: card.style === cs.id ? 'rgba(232,184,75,0.1)' : 'rgba(255,255,255,0.03)',
                      color: card.style === cs.id ? 'var(--theme-gold)' : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer', fontSize: 11, textAlign: 'center',
                    }}>
                      <cs.icon size={16} style={{ margin: '0 auto 4px', display: 'block' }} />
                      {cs.name}
                    </button>
                  ))}
                </div>
              </div>
              <SliderField label="Card Radius" value={card.radius} min={0} max={32} step={2} onChange={v => updateCard('radius', v)} suffix="px" />
              <div style={{ marginTop: 12 }}>
                <SliderField label="Elevation" value={card.elevation} min={0} max={8} step={1} onChange={v => updateCard('elevation', v)} />
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Card Size</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['compact', 'comfortable', 'large'].map(s => (
                    <button key={s} onClick={() => updateCard('size', s)} style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, border: '0.5px solid',
                      borderColor: card.size === s ? 'var(--theme-gold)' : 'rgba(255,255,255,0.1)',
                      background: card.size === s ? 'rgba(232,184,75,0.1)' : 'rgba(255,255,255,0.03)',
                      color: card.size === s ? 'var(--theme-gold)' : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer', fontSize: 11,
                    }}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Layout Panel ── */}
          {activePanel === 'layout' && (
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Toggle which sections appear on your portal. Drag to reorder (coming soon).</p>
              {SECTION_OPTIONS.map(s => {
                const enabled = config.layout.sections.includes(s.id)
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                    <GripVertical size={14} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                    <Toggle checked={enabled} onChange={() => toggleSection(s.id)} />
                    <span style={{ fontSize: 13, color: enabled ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)', flex: 1 }}>{s.label}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Components Panel ── */}
          {activePanel === 'components' && (
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Portal Features</p>
              {COMPONENT_TOGGLES.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                  <Toggle checked={(components as any)[c.id]} onChange={v => updateComponent(c.id, v)} />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', flex: 1 }}>{c.label}</span>
                </div>
              ))}
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', marginTop: 16, paddingTop: 16 }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Methods</p>
                {PAYMENT_TOGGLES.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                    <Toggle checked={(config.enabled_features as any)[p.id]} onChange={v => updateFeature(p.id, v)} />
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', flex: 1 }}>{p.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', marginTop: 16, paddingTop: 16 }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Network Status Banner</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                  <Toggle checked={config.network_awareness.show_status_banner} onChange={v => updateNetworkAwareness('show_status_banner', v)} />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', flex: 1 }}>Show status banner</span>
                </div>
                {config.network_awareness.show_status_banner && (
                  <input type="text" value={config.network_awareness.custom_status_message} onChange={e => updateNetworkAwareness('custom_status_message', e.target.value)}
                    placeholder="Custom status message (optional)"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12, marginTop: 8 }} />
                )}
              </div>
            </div>
          )}

          {/* ── Background Panel ── */}
          {activePanel === 'background' && (
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Upload your logo or background image.</p>
              <div style={{ border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 12, padding: 32, textAlign: 'center', marginBottom: 16, cursor: 'pointer' }}
                onClick={() => fileInputRef.current?.click()}>
                <Upload size={24} style={{ color: 'rgba(255,255,255,0.3)', marginBottom: 8 }} />
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Click to upload</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>PNG, JPG, SVG, WebP — Max 10MB</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const form = new FormData()
                  form.append('file', file)
                  form.append('subfolder', 'assets')
                  try {
                    const res = await fetch(`${API}/api/portal/assets/upload`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                      body: form,
                    })
                    if (res.ok) {
                      const data = await res.json()
                      if (file.type.includes('png') || file.type.includes('jpeg') || file.type.includes('svg')) {
                        updateBrand('logo_url', data.asset.url)
                      }
                    }
                  } catch {}
                }} />
              {brand.logo_url && (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <img src={brand.logo_url} alt="Uploaded logo" style={{ maxWidth: '100%', maxHeight: 60, borderRadius: 4 }} />
                  <button onClick={() => updateBrand('logo_url', null)} style={{ display: 'block', marginTop: 8, fontSize: 11, color: '#ff6b6b', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                </div>
              )}
            </div>
          )}

          {/* ── Animation Panel ── */}
          {activePanel === 'animation' && (
            <div style={{ padding: 16 }}>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Entrance Animation</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {ANIMATIONS.map(a => (
                  <button key={a.id} onClick={() => updateAnimation('entrance', a.id)} style={{
                    flex: 1, padding: '12px 0', borderRadius: 10, border: '0.5px solid',
                    borderColor: config.animations.entrance === a.id ? 'var(--theme-gold)' : 'rgba(255,255,255,0.08)',
                    background: config.animations.entrance === a.id ? 'rgba(232,184,75,0.1)' : 'rgba(255,255,255,0.03)',
                    color: config.animations.entrance === a.id ? 'var(--theme-gold)' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer', fontSize: 11, textAlign: 'center',
                  }}>
                    <a.icon size={18} style={{ margin: '0 auto 4px', display: 'block' }} />
                    {a.name}
                  </button>
                ))}
              </div>
              {[
                { key: 'floating_logo', label: 'Floating Logo' },
                { key: 'particles', label: 'Particles Effect' },
                { key: 'pulse_button', label: 'Pulse Button' },
                { key: 'ripple', label: 'Ripple Effect' },
              ].map(anim => (
                <div key={anim.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                  <Toggle checked={(config.animations as any)[anim.key]} onChange={v => updateAnimation(anim.key, v)} />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', flex: 1 }}>{anim.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Export Panel ── */}
          {activePanel === 'export' && (
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Export your portal design for offline or physical use.</p>
              <button onClick={handleExportZip} disabled={exporting} style={{
                width: '100%', padding: '14px 0', borderRadius: 10, border: '0.5px solid var(--theme-gold)',
                background: 'rgba(232,184,75,0.1)', color: 'var(--theme-gold)', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {exporting ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <FileDown size={16} />}
                {exporting ? 'Generating...' : 'Download MikroTik ZIP'}
              </button>
              <button onClick={handleExportQR} style={{
                width: '100%', padding: '14px 0', borderRadius: 10, border: '0.5px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                fontSize: 13, fontWeight: 500, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <QrCode size={16} />
                Download QR Poster
              </button>
              {snapshots.length > 0 && (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 8 }}>
                  {snapshots.length} version{snapshots.length !== 1 ? 's' : ''} saved
                </p>
              )}
            </div>
          )}

          {/* ── Versions Panel ── */}
          {activePanel === 'versions' && (
            <div style={{ padding: 16 }}>
              <button onClick={createSnapshot} style={{
                width: '100%', padding: '12px 0', borderRadius: 10, border: '0.5px solid var(--theme-gold)',
                background: 'rgba(232,184,75,0.1)', color: 'var(--theme-gold)', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <Plus size={16} />
                Save Current as Version
              </button>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saved Versions</p>
              {snapshots.length === 0 && (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 20 }}>No versions saved yet.</p>
              )}
              {snapshots.map((s: any) => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px',
                  borderRadius: 8, background: 'rgba(255,255,255,0.03)', marginBottom: 8,
                  border: '0.5px solid rgba(255,255,255,0.06)',
                }}>
                  <Clock size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.version_tag}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{new Date(s.created_at).toLocaleDateString()}</div>
                  </div>
                  <button onClick={() => restoreSnapshot(s.id)} style={{
                    padding: '4px 10px', borderRadius: 6, border: '0.5px solid rgba(255,255,255,0.15)',
                    background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 10,
                  }}>
                    <RotateCcw size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Save Bar ─── */}
        <div style={{ padding: 12, borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
            background: saved ? '#00E676' : 'var(--theme-gold)',
            color: saved ? '#fff' : '#000', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.3s',
          }}>
            {saving ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <Check size={16} /> : <Save size={16} />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {/* ─── Right Canvas (Preview) ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#050505' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', background: '#0a0a0a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
              {displayName} — {TEMPLATES.find(t => t.id === config.template_id)?.name || 'Portal'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {([
              { id: 'desktop' as const, icon: Monitor },
              { id: 'tablet' as const, icon: Tablet },
              { id: 'phone' as const, icon: Smartphone },
            ] as const).map(d => (
              <button key={d.id} onClick={() => setPreviewDevice(d.id)} style={{
                padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: previewDevice === d.id ? 'rgba(232,184,75,0.15)' : 'transparent',
                color: previewDevice === d.id ? 'var(--theme-gold)' : 'rgba(255,255,255,0.3)',
              }}>
                <d.icon size={16} />
              </button>
            ))}
          </div>
        </div>

        {/* Preview frame */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflow: 'hidden' }}>
          <div style={{
            width: previewDevice === 'phone' ? 375 : previewDevice === 'tablet' ? 600 : '100%',
            maxWidth: previewDevice === 'desktop' ? 1200 : undefined,
            height: previewDevice === 'phone' ? 812 : previewDevice === 'tablet' ? 800 : '100%',
            maxHeight: previewDevice !== 'desktop' ? undefined : '100%',
            borderRadius: previewDevice === 'phone' ? 40 : previewDevice === 'tablet' ? 24 : 12,
            overflow: 'hidden',
            border: previewDevice !== 'desktop' ? '2px solid rgba(255,255,255,0.08)' : 'none',
            boxShadow: previewDevice !== 'desktop' ? '0 20px 60px rgba(0,0,0,0.5)' : 'none',
            transition: 'all 0.3s',
          }}>
            <iframe ref={iframeRef} src={previewUrl()}
              style={{ width: '100%', height: '100%', border: 'none', background: theme.background_type === 'solid' ? theme.background_value : '#000' }}
              title="Portal Preview" />
          </div>
        </div>
      </div>
    </div>
  )
}
