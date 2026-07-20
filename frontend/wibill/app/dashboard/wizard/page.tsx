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
  Clock, Share2, Menu, Zap, RefreshCw,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const TEMPLATES = [
  { id: 'executive-dark', name: 'Executive Dark', category: 'business', desc: 'Premium dark theme for corporate ISPs', badge: 'Popular', colors: { bg: '#0f0f1a', header: '#E8B84B', card: '#1a1a2e', accent: '#f0c27a', text: '#f0f0f0', textDim: 'rgba(255,255,255,0.35)' } },
  { id: 'executive-light', name: 'Executive Light', category: 'business', desc: 'Clean light theme for professional services', badge: 'New', colors: { bg: '#ffffff', header: '#2D3436', card: '#f0f0f0', accent: '#0984e3', text: '#1d1d1f', textDim: 'rgba(0,0,0,0.35)' } },
  { id: 'premium-hotel', name: 'Premium Hotel', category: 'business', desc: 'Luxurious theme for hotels and resorts', badge: 'Trending', colors: { bg: '#1a1410', header: '#C9A96E', card: '#2d2318', accent: '#e8d5a3', text: '#f0e8d8', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'modern-isp', name: 'Modern ISP', category: 'business', desc: 'Bold modern theme for tech-forward ISPs', badge: 'Popular', colors: { bg: '#0d1117', header: '#00E676', card: '#161b22', accent: '#58a6ff', text: '#f0f0f0', textDim: 'rgba(255,255,255,0.35)' } },
  { id: 'corporate-blue', name: 'Corporate Blue', category: 'business', desc: 'Trustworthy blue theme for enterprise', badge: null, colors: { bg: '#1e1e2f', header: '#1a73e8', card: '#252540', accent: '#8ab4f8', text: '#e0e0e0', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'ocean-deep', name: 'Ocean Deep', category: 'business', desc: 'Deep blue ocean inspired calm theme', badge: null, colors: { bg: '#03045E', header: '#0077B6', card: '#023E8A', accent: '#00B4D8', text: '#e0f0ff', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'gaming-neon', name: 'Gaming Neon', category: 'entertainment', desc: 'Cyberpunk neon theme for gaming zones', badge: 'Trending', colors: { bg: '#0a001a', header: '#ff00ff', card: '#150030', accent: '#00ffff', text: '#f0f0ff', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'cyberpunk', name: 'Cyberpunk', category: 'entertainment', desc: 'Dark futuristic theme with vibrant accents', badge: null, colors: { bg: '#0d0d0d', header: '#ff6b35', card: '#1a1a1a', accent: '#ffd700', text: '#f0f0f0', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'streaming-portal', name: 'Streaming Portal', category: 'entertainment', desc: 'Netflix-inspired dark theme', badge: 'Popular', colors: { bg: '#141414', header: '#e50914', card: '#1f1f1f', accent: '#ffffff', text: '#f0f0f0', textDim: 'rgba(255,255,255,0.35)' } },
  { id: 'rgb-wave', name: 'RGB Wave', category: 'entertainment', desc: 'Colorful RGB theme for tech events', badge: 'New', colors: { bg: '#0a0a1a', header: '#ff0080', card: '#150030', accent: '#7000ff', text: '#f0f0ff', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'sunset-vibes', name: 'Sunset Vibes', category: 'entertainment', desc: 'Warm sunset gradient theme', badge: null, colors: { bg: '#1a0a0a', header: '#FF6B6B', card: '#2d1b1b', accent: '#FFE66D', text: '#f0e8e0', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'midnight-purple', name: 'Midnight Purple', category: 'entertainment', desc: 'Deep purple theme for premium lounges', badge: null, colors: { bg: '#0d0015', header: '#9b59b6', card: '#1a0028', accent: '#f1c40f', text: '#f0e8ff', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'glass-morphism', name: 'Glass', category: 'minimal', desc: 'Modern glassmorphism design', badge: 'Popular', colors: { bg: '#0f172a', header: '#ffffff', card: 'rgba(255,255,255,0.06)', accent: '#60a5fa', text: '#f0f0f0', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'apple-style', name: 'Apple Style', category: 'minimal', desc: 'Clean Apple-inspired minimal design', badge: null, colors: { bg: '#f5f5f7', header: '#1d1d1f', card: '#ffffff', accent: '#0071e3', text: '#1d1d1f', textDim: 'rgba(0,0,0,0.35)' } },
  { id: 'material-design', name: 'Material', category: 'minimal', desc: 'Google Material Design 3 inspired', badge: null, colors: { bg: '#1c1b1f', header: '#6750A4', card: '#2b2930', accent: '#D0BCFF', text: '#e6e1e5', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'clean-white', name: 'Clean White', category: 'minimal', desc: 'Bright and clean white theme', badge: null, colors: { bg: '#ffffff', header: '#333333', card: '#f5f5f5', accent: '#4A90D9', text: '#1a1a1a', textDim: 'rgba(0,0,0,0.35)' } },
  { id: 'cherry-blossom', name: 'Cherry Blossom', category: 'minimal', desc: 'Soft pink theme with elegance', badge: 'New', colors: { bg: '#1a1014', header: '#FFB7C5', card: '#2d1a20', accent: '#d4a0a0', text: '#f0e8ec', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'kenyan-gold', name: 'Kenyan Gold', category: 'local', desc: 'Celebrate Kenya with gold and black', badge: 'Popular', colors: { bg: '#0a0a0a', header: '#DAA520', card: '#1a1400', accent: '#FFD700', text: '#f0e8c8', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'safari', name: 'Safari', category: 'local', desc: 'Earthy tones inspired by the savannah', badge: null, colors: { bg: '#2a1f14', header: '#C4873B', card: '#3a2d1e', accent: '#E8B84B', text: '#f0e8d8', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'afro-modern', name: 'Afro Modern', category: 'local', desc: 'Bold African patterns meets modern design', badge: 'New', colors: { bg: '#1a0f0a', header: '#E85D26', card: '#2d1a10', accent: '#F5A623', text: '#f0e8d8', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'nairobi-night', name: 'Nairobi Night', category: 'local', desc: 'City lights inspired dark theme', badge: null, colors: { bg: '#0a0a14', header: '#6C3EB8', card: '#15152a', accent: '#B388FF', text: '#e8e0f0', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'coffee-shop', name: 'Coffee Shop', category: 'local', desc: 'Warm brown theme perfect for cafes', badge: 'New', colors: { bg: '#1C1512', header: '#D4A574', card: '#2d2018', accent: '#8B5E3C', text: '#f0e8d8', textDim: 'rgba(255,255,255,0.3)' } },
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

function TemplatePreview({ colors, radius }: { colors: { bg: string; header: string; card: string; accent: string; text: string; textDim: string }; radius?: number }) {
  const r = radius || 12
  const isLight = ['#ffffff', '#f5f5f7'].includes(colors.bg)
  return (
    <div style={{ width: '100%', height: '100%', background: colors.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ height: 48, background: colors.header, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: 4, background: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)' }} />
        <div style={{ width: 60, height: 8, borderRadius: 4, background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)' }} />
      </div>
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ width: '70%', height: 7, borderRadius: 3, background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)', marginBottom: 2 }} />
        <div style={{ width: '45%', height: 5, borderRadius: 2, background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
        <div style={{ display: 'flex', gap: 5, marginTop: 4, flex: 1 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ flex: 1, background: colors.card, borderRadius: r * 0.5, padding: 5, display: 'flex', flexDirection: 'column', gap: 3, border: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}` }}>
              <div style={{ width: '60%', height: 4, borderRadius: 2, background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }} />
              <div style={{ width: '80%', height: 3, borderRadius: 1, background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }} />
              <div style={{ height: 3, flex: 1 }} />
              <div style={{ height: 10, borderRadius: 4, background: colors.accent, opacity: 0.85 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
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

  const C = {
    void: 'var(--theme-bg)',
    base: 'var(--theme-card-base)',
    surface: 'var(--theme-surface)',
    border: 'var(--theme-border)',
    border2: 'var(--theme-border2)',
    text: 'var(--theme-text)',
    dim: 'var(--theme-dim)',
    mute: 'var(--theme-mute)',
    gold: 'var(--theme-gold)',
    green: 'var(--theme-green)',
    red: 'var(--theme-red)',
    muted: 'var(--theme-text-muted)',
  }

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
  const iframeLoaded = useRef(false)

  function scheduleBroadcast(cfg: any) {
    if (broadcastTimer.current) clearTimeout(broadcastTimer.current)
    broadcastTimer.current = setTimeout(() => broadcastToPreview(cfg), 80)
  }

  function templateToBaseId(templateId: string): string {
    const dash = ['executive-dark', 'executive-light', 'modern-isp', 'corporate-blue', 'ocean-deep', 'streaming-portal', 'glass-morphism', 'material-design', 'kenyan-gold', 'nairobi-night', 'cherry-blossom']
    const spot = ['premium-hotel', 'gaming-neon', 'rgb-wave', 'apple-style', 'clean-white', 'safari', 'sunset-vibes', 'coffee-shop']
    if (dash.includes(templateId)) return 'dashboard'
    if (spot.includes(templateId)) return 'spotlight'
    return 'stories'
  }

  function computePalette(cfg: any) {
    const t = cfg.theme
    const isLight = ['executive-light', 'apple-style', 'clean-white'].includes(cfg.template_id)
    return {
      bgStart: t.gradient ? t.background_value : t.background_value,
      bgEnd: t.gradient ? t.background_value : t.background_value,
      card: t.secondary_color || (isLight ? '#f0f0f0' : '#1a1a2e'),
      text: isLight ? '#1d1d1f' : '#f0f0f0',
      textDim: isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.45)',
      primary: t.primary_color,
      primaryDark: t.primary_color,
      accent: t.accent_color,
      accentLight: t.accent_color + '33',
      cardBorder: isLight ? 'rgba(0,0,0,0.08)' : C.border,
      cardHl: t.accent_color + '22',
    }
  }

  function broadcastToPreview(cfg: any) {
    const w = iframeRef.current?.contentWindow
    if (!w) return
    const t = cfg.theme
    const pal = computePalette(cfg)
    try {
      w.postMessage({
        type: 'UPDATE_PALETTE',
        colors: pal,
      }, '*')
      w.postMessage({
        type: 'UPDATE_BRAND_NAME',
        name: cfg.brand.name || 'Your ISP',
      }, '*')
      w.postMessage({
        type: 'UPDATE_TYPOGRAPHY',
        font: cfg.typography.font_family,
      }, '*')
      w.postMessage({
        type: 'UPDATE_CARD_STYLE',
        radius: cfg.card.radius + 'px',
      }, '*')
    } catch {}
  }

  function getPreviewUrl(cfg: any) {
    const baseId = templateToBaseId(cfg.template_id)
    const brand = cfg.brand
    const pal = computePalette(cfg)
    const params = new URLSearchParams({
      name: brand.name || 'WiFi Portal',
      emoji: brand.emoji || '📶',
      tag: brand.tagline || '',
      loc: brand.location || '',
      phone: brand.support_phone || '',
      font: cfg.typography.font_family,
      shape: cfg.card.radius + 'px',
    })
    return `${API}/api/v1/portal-previews/${baseId}?${params.toString()}`
  }

  const [previewSrc, setPreviewSrc] = useState('')

  useEffect(() => {
    setPreviewSrc(getPreviewUrl(config))
  }, [config.template_id])

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
    const TEMPLATE_COUNT = filteredTemplates.length
    return (
      <div style={{ minHeight: '100vh', background: C.void, color: C.text }}>
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          .tpl-card { animation: fadeIn 0.3s ease both; }
          .tpl-card:hover .tpl-overlay { opacity: 1; }
        `}</style>

        {/* ─── Top Bar ─── */}
        <div style={{ borderBottom: `1px solid ${C.border}`, background: C.base }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${C.gold}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Palette size={16} style={{ color: C.gold }} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Portal Design Studio</span>
            </div>
            <span style={{ fontSize: 11, color: C.dim, fontFamily: 'DM Mono, monospace' }}>{TEMPLATE_COUNT} templates</span>
          </div>
        </div>

        {/* ─── Hero ─── */}
        <div style={{ padding: '48px 32px 0', textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, color: C.text, letterSpacing: '-0.5px' }}>Choose a template</h1>
          <p style={{ color: C.dim, fontSize: 14, marginBottom: 36 }}>Every template is fully customizable. Pick one to get started.</p>

          {/* ─── Category Tabs ─── */}
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 40, background: C.base, borderRadius: 10, padding: 3, width: 'fit-content', margin: '0 auto 40px' }}>
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

        {/* ─── Template Grid ─── */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px 64px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filteredTemplates.map((t, i) => (
              <button key={t.id} className="tpl-card" onClick={() => selectTemplate(t.id)}
                style={{
                  animationDelay: `${i * 40}ms`,
                  background: C.base, borderRadius: 12, border: `1px solid ${C.border}`,
                  padding: 0, cursor: 'pointer', overflow: 'hidden', transition: 'border-color 0.2s, transform 0.2s',
                  textAlign: 'left', display: 'flex', flexDirection: 'column',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'none' }}>
                {/* Preview Area */}
                <div style={{ height: 180, position: 'relative', overflow: 'hidden' }}>
                  <TemplatePreview colors={t.colors} radius={getTemplatePreset(t.id).card.radius} />
                  {/* Hover overlay */}
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none',
                  }} className="tpl-overlay">
                    <span style={{
                      padding: '8px 20px', borderRadius: 8, background: C.gold, color: '#000',
                      fontSize: 12, fontWeight: 600, letterSpacing: '0.3px',
                    }}>Use template</span>
                  </div>
                </div>
                {/* Info */}
                <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{t.name}</span>
                    {t.badge && (
                      <span style={{
                        fontSize: 9, padding: '2px 7px', borderRadius: 4,
                        background: t.badge === 'Popular' ? `${C.gold}1A` : t.badge === 'Trending' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                        color: t.badge === 'Popular' ? C.gold : t.badge === 'Trending' ? C.green : C.dim,
                        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>{t.badge}</span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: C.dim, margin: 0, lineHeight: 1.4 }}>{t.desc}</p>
                  {/* Color dots */}
                  <div style={{ display: 'flex', gap: 4, marginTop: 'auto', paddingTop: 10 }}>
                    {[t.colors.header, t.colors.accent, t.colors.card].map((c, j) => (
                      <div key={j} style={{ width: 10, height: 10, borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.08)' }} />
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

  const theme = config.theme
  const typography = config.typography
  const card = config.card
  const brand = config.brand
  const components = config.components

  const S = (sel: string) => `var(--theme-${sel})`
  const activeBg = `${C.gold}1A`
  const hoverBg = 'var(--theme-surface)'

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.void, color: C.text, overflow: 'hidden' }}>
      {/* ─── Left Sidebar (Settings Panels) ─── */}
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
        <button onClick={() => setStep('gallery')} title="Back to gallery" style={{
          width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer',
          background: 'transparent', color: C.muted, fontSize: 10,
        }}>
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* ─── Panel Content ─── */}
      <div style={{ width: 320, background: C.base, borderRight: `0.5px solid ${C.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: `0.5px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {(() => {
              const p = PANELS.find(x => x.id === activePanel)
              return p ? <p.icon size={16} style={{ color: C.gold }} /> : null
            })()}
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{PANELS.find(p => p.id === activePanel)?.label}</span>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* ── Theme Studio Panel ── */}
          {activePanel === 'theme' && (
            <div style={{ padding: 16 }}>
              {['Primary Color', 'Secondary Color', 'Accent Color'].map(label => (
                <div key={label} style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, color: C.dim, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
                  <ColorInput label="" value={theme[label === 'Primary Color' ? 'primary_color' : label === 'Secondary Color' ? 'secondary_color' : 'accent_color']}
                    onChange={v => updateTheme(label === 'Primary Color' ? 'primary_color' : label === 'Secondary Color' ? 'secondary_color' : 'accent_color', v)} />
                </div>
              ))}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: C.dim, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Button Style</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {BTN_STYLES.map(bs => {
                    const sel = theme.button_style === bs.id
                    return (
                      <button key={bs.id} onClick={() => updateTheme('button_style', bs.id)} style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, border: `0.5px solid ${sel ? C.gold : C.border}`,
                        background: sel ? activeBg : hoverBg,
                        color: sel ? C.gold : C.dim, cursor: 'pointer', fontSize: 11, fontWeight: 500,
                      }}>{bs.label}</button>
                    )
                  })}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: C.dim, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Background Type</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {BG_TYPES.map(bg => {
                    const sel = theme.background_type === bg.id
                    return (
                      <button key={bg.id} onClick={() => updateTheme('background_type', bg.id)} style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, border: `0.5px solid ${sel ? C.gold : C.border}`,
                        background: sel ? activeBg : hoverBg,
                        color: sel ? C.gold : C.dim, cursor: 'pointer', fontSize: 11,
                      }}><bg.icon size={14} style={{ marginRight: 4, display: 'inline' }} />{bg.label}</button>
                    )
                  })}
                </div>
              </div>
              {theme.background_type === 'solid' && (
                <div>
                  <label style={{ fontSize: 11, color: C.dim, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Background Color</label>
                  <ColorInput label="" value={theme.background_value} onChange={v => updateTheme('background_value', v)} />
                </div>
              )}
              {theme.background_type === 'gradient' && (
                <div>
                  <label style={{ fontSize: 11, color: C.dim, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gradient</label>
                  <input type="text" value={theme.gradient || ''} onChange={e => updateTheme('gradient', e.target.value)}
                    placeholder="linear-gradient(135deg, #000, #333)"
                    style={{ width: '100%', background: hoverBg, border: `0.5px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', color: C.text, fontSize: 11, fontFamily: 'DM Mono, monospace' }} />
                  <GradientPreview gradient={theme.gradient} />
                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 11, color: C.dim, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Background Color (fallback)</label>
                    <ColorInput label="" value={theme.background_value} onChange={v => updateTheme('background_value', v)} />
                  </div>
                </div>
              )}
              {theme.background_type === 'image' && (
                <div>
                  <label style={{ fontSize: 11, color: C.dim, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Background Image URL</label>
                  <input type="text" value={theme.background_url || ''} onChange={e => updateTheme('background_url', e.target.value)}
                    placeholder="https://example.com/bg.jpg"
                    style={{ width: '100%', background: hoverBg, border: `0.5px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', color: C.text, fontSize: 12 }} />
                </div>
              )}
              <div style={{ marginTop: 20 }}>
                <SliderField label="Overlay Opacity" value={Math.round(theme.overlay_opacity * 100)} min={0} max={100} step={5} onChange={v => updateTheme('overlay_opacity', v / 100)} suffix="%" />
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 11, color: C.dim, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overlay Color</label>
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
                  <label style={{ fontSize: 11, color: C.dim, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cat.name}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {cat.fonts.map(font => {
                      const sel = typography.font_family === font
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
                <SliderField label="Heading Size" value={typography.heading_size} min={20} max={60} step={2} onChange={v => updateTypography('heading_size', v)} suffix="px" />
                <div style={{ marginTop: 12 }}><SliderField label="Body Size" value={typography.body_size} min={12} max={24} step={1} onChange={v => updateTypography('body_size', v)} suffix="px" /></div>
                <div style={{ marginTop: 12 }}><SliderField label="Font Weight" value={typography.font_weight} min={300} max={900} step={100} onChange={v => updateTypography('font_weight', v)} /></div>
                <div style={{ marginTop: 12 }}><SliderField label="Letter Spacing" value={typography.letter_spacing} min={-2} max={4} step={0.1} onChange={v => updateTypography('letter_spacing', v)} suffix="px" /></div>
                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 11, color: C.dim, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Heading Case</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['normal', 'uppercase', 'lowercase'].map(c => {
                      const sel = typography.heading_case === c
                      return (
                        <button key={c} onClick={() => updateTypography('heading_case', c)} style={{
                          flex: 1, padding: '6px 0', borderRadius: 8, border: `0.5px solid ${sel ? C.gold : C.border}`,
                          background: sel ? activeBg : hoverBg,
                          color: sel ? C.gold : C.dim, cursor: 'pointer', fontSize: 11,
                        }}>{c}</button>
                      )
                    })}
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
                  <label style={{ fontSize: 11, color: C.dim, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{field.label}</label>
                  <input type="text" value={(brand as any)[field.key] || ''} onChange={e => updateBrand(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    style={{ width: '100%', background: hoverBg, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 13 }} />
                </div>
              ))}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: C.dim, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Emoji / Icon</label>
                <input type="text" value={brand.emoji} onChange={e => updateBrand('emoji', e.target.value)}
                  placeholder="📶" maxLength={4}
                  style={{ width: 60, background: hoverBg, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '10px', color: C.text, fontSize: 24, textAlign: 'center' }} />
              </div>
            </div>
          )}

          {/* ── Cards Panel ── */}
          {activePanel === 'cards' && (
            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: C.dim, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Card Style</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {CARD_STYLES.map(cs => {
                    const sel = card.style === cs.id
                    return (
                      <button key={cs.id} onClick={() => updateCard('style', cs.id)} style={{
                        padding: '10px 0', borderRadius: 8, border: `0.5px solid ${sel ? C.gold : C.border}`,
                        background: sel ? activeBg : hoverBg,
                        color: sel ? C.gold : C.dim, cursor: 'pointer', fontSize: 11, textAlign: 'center',
                      }}>
                        <cs.icon size={16} style={{ margin: '0 auto 4px', display: 'block' }} />
                        {cs.name}
                      </button>
                    )
                  })}
                </div>
              </div>
              <SliderField label="Card Radius" value={card.radius} min={0} max={32} step={2} onChange={v => updateCard('radius', v)} suffix="px" />
              <div style={{ marginTop: 12 }}><SliderField label="Elevation" value={card.elevation} min={0} max={8} step={1} onChange={v => updateCard('elevation', v)} /></div>
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 11, color: C.dim, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Card Size</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['compact', 'comfortable', 'large'].map(s => {
                    const sel = card.size === s
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

          {/* ── Layout Panel ── */}
          {activePanel === 'layout' && (
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 11, color: C.dim, marginBottom: 16 }}>Toggle which sections appear on your portal. Drag to reorder (coming soon).</p>
              {SECTION_OPTIONS.map(s => {
                const enabled = config.layout.sections.includes(s.id)
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `0.5px solid ${C.border}` }}>
                    <GripVertical size={14} style={{ color: C.muted, flexShrink: 0 }} />
                    <Toggle checked={enabled} onChange={() => toggleSection(s.id)} />
                    <span style={{ fontSize: 13, color: enabled ? C.text : C.muted, flex: 1 }}>{s.label}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Components Panel ── */}
          {activePanel === 'components' && (
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 11, color: C.dim, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Portal Features</p>
              {COMPONENT_TOGGLES.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                  <Toggle checked={(components as any)[c.id]} onChange={v => updateComponent(c.id, v)} />
                  <span style={{ fontSize: 13, color: C.dim, flex: 1 }}>{c.label}</span>
                </div>
              ))}
              <div style={{ borderTop: `0.5px solid ${C.border}`, marginTop: 16, paddingTop: 16 }}>
                <p style={{ fontSize: 11, color: C.dim, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Methods</p>
                {PAYMENT_TOGGLES.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                    <Toggle checked={(config.enabled_features as any)[p.id]} onChange={v => updateFeature(p.id, v)} />
                    <span style={{ fontSize: 13, color: C.dim, flex: 1 }}>{p.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: `0.5px solid ${C.border}`, marginTop: 16, paddingTop: 16 }}>
                <p style={{ fontSize: 11, color: C.dim, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Network Status Banner</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                  <Toggle checked={config.network_awareness.show_status_banner} onChange={v => updateNetworkAwareness('show_status_banner', v)} />
                  <span style={{ fontSize: 13, color: C.dim, flex: 1 }}>Show status banner</span>
                </div>
                {config.network_awareness.show_status_banner && (
                  <input type="text" value={config.network_awareness.custom_status_message} onChange={e => updateNetworkAwareness('custom_status_message', e.target.value)}
                    placeholder="Custom status message (optional)"
                    style={{ width: '100%', background: hoverBg, border: `0.5px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', color: C.text, fontSize: 12, marginTop: 8 }} />
                )}
              </div>
            </div>
          )}

          {/* ── Background Panel ── */}
          {activePanel === 'background' && (
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 11, color: C.dim, marginBottom: 16 }}>Upload your logo or background image.</p>
              <div style={{ border: `1px dashed ${C.border}`, borderRadius: 12, padding: 32, textAlign: 'center', marginBottom: 16, cursor: 'pointer' }}
                onClick={() => fileInputRef.current?.click()}>
                <Upload size={24} style={{ color: C.muted, marginBottom: 8 }} />
                <p style={{ fontSize: 12, color: C.dim }}>Click to upload</p>
                <p style={{ fontSize: 10, color: C.muted }}>PNG, JPG, SVG, WebP — Max 10MB</p>
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
                <div style={{ background: hoverBg, borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <img src={brand.logo_url} alt="Uploaded logo" style={{ maxWidth: '100%', maxHeight: 60, borderRadius: 4 }} />
                  <button onClick={() => updateBrand('logo_url', null)} style={{ display: 'block', marginTop: 8, fontSize: 11, color: C.red, background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                </div>
              )}
            </div>
          )}

          {/* ── Animation Panel ── */}
          {activePanel === 'animation' && (
            <div style={{ padding: 16 }}>
              <label style={{ fontSize: 11, color: C.dim, display: 'block', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Entrance Animation</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {ANIMATIONS.map(a => {
                  const sel = config.animations.entrance === a.id
                  return (
                    <button key={a.id} onClick={() => updateAnimation('entrance', a.id)} style={{
                      flex: 1, padding: '12px 0', borderRadius: 10, border: `0.5px solid ${sel ? C.gold : C.border}`,
                      background: sel ? activeBg : hoverBg,
                      color: sel ? C.gold : C.dim, cursor: 'pointer', fontSize: 11, textAlign: 'center',
                    }}>
                      <a.icon size={18} style={{ margin: '0 auto 4px', display: 'block' }} />
                      {a.name}
                    </button>
                  )
                })}
              </div>
              {[
                { key: 'floating_logo', label: 'Floating Logo' },
                { key: 'particles', label: 'Particles Effect' },
                { key: 'pulse_button', label: 'Pulse Button' },
                { key: 'ripple', label: 'Ripple Effect' },
              ].map(anim => (
                <div key={anim.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                  <Toggle checked={(config.animations as any)[anim.key]} onChange={v => updateAnimation(anim.key, v)} />
                  <span style={{ fontSize: 13, color: C.dim, flex: 1 }}>{anim.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Export Panel ── */}
          {activePanel === 'export' && (
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 11, color: C.dim, marginBottom: 16 }}>Export your portal design for offline or physical use.</p>
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
                fontSize: 13, fontWeight: 500, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <QrCode size={16} />
                Download QR Poster
              </button>
              {snapshots.length > 0 && (
                <p style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 8 }}>
                  {snapshots.length} version{snapshots.length !== 1 ? 's' : ''} saved
                </p>
              )}
            </div>
          )}

          {/* ── Versions Panel ── */}
          {activePanel === 'versions' && (
            <div style={{ padding: 16 }}>
              <button onClick={createSnapshot} style={{
                width: '100%', padding: '12px 0', borderRadius: 10, border: `0.5px solid ${C.gold}`,
                background: activeBg, color: C.gold, cursor: 'pointer',
                fontSize: 13, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <Plus size={16} />
                Save Current as Version
              </button>
              <p style={{ fontSize: 11, color: C.dim, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saved Versions</p>
              {snapshots.length === 0 && (
                <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: 20 }}>No versions saved yet.</p>
              )}
              {snapshots.map((s: any) => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px',
                  borderRadius: 8, background: hoverBg, marginBottom: 8,
                  border: `0.5px solid ${C.border}`,
                }}>
                  <Clock size={14} style={{ color: C.muted, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.version_tag}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{new Date(s.created_at).toLocaleDateString()}</div>
                  </div>
                  <button onClick={() => restoreSnapshot(s.id)} style={{
                    padding: '4px 10px', borderRadius: 6, border: `0.5px solid ${C.border}`,
                    background: 'transparent', color: C.dim, cursor: 'pointer', fontSize: 10,
                  }}>
                    <RotateCcw size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Save Bar ─── */}
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

      {/* ─── Right Canvas (Preview) ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.void }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: `0.5px solid ${C.border}`, background: C.base }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: C.dim, fontWeight: 500 }}>
              {TEMPLATES.find(t => t.id === config.template_id)?.name || 'Portal'}
            </span>
            <button onClick={refreshPreview} title="Refresh preview"
              style={{ padding: '4px 6px', borderRadius: 4, border: 'none', cursor: 'pointer', background: 'transparent', color: C.muted, fontSize: 11 }}>
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

        {/* Preview frame */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'hidden', background: C.void }}>
          {previewDevice === 'desktop' ? (
            <div style={{ width: '100%', maxWidth: 1200, height: '100%', borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}` }}>
              <iframe ref={iframeRef} src={previewSrc} onLoad={onIframeLoad}
                style={{ width: '100%', height: '100%', border: 'none', background: config.theme.background_type === 'solid' ? config.theme.background_value : C.void }}
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
                  scrolling="no"
                  style={{ width: '100%', height: '100%', border: 'none', background: config.theme.background_type === 'solid' ? config.theme.background_value : C.void, pointerEvents: 'none' }}
                  title="Portal Preview" />
              </div>
              <div style={{ height: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 4 }}>
                <div style={{ width: 40, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
              </div>
            </div>
          ) : (
            /* Phone device frame */
            <div style={{
              width: 390, height: '100%', maxHeight: 844,
              background: '#1a1a1a', borderRadius: 44, padding: '10px 6px',
              boxShadow: '0 30px 100px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.06)',
              display: 'flex', flexDirection: 'column', position: 'relative',
            }}>
              {/* Notch / Dynamic Island */}
              <div style={{
                position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
                width: 120, height: 28, background: '#1a1a1a', borderRadius: 20,
                zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2a2a2a' }} />
              </div>
              {/* Screen */}
              <div style={{ flex: 1, borderRadius: 34, overflow: 'hidden', position: 'relative' }}>
                <iframe ref={iframeRef} src={previewSrc} onLoad={onIframeLoad}
                  scrolling="no"
                  style={{
                    width: '100%', height: '100%', border: 'none',
                    background: config.theme.background_type === 'solid' ? config.theme.background_value : C.void,
                    pointerEvents: 'none',
                  }}
                  title="Portal Preview" />
              </div>
              {/* Home indicator */}
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
