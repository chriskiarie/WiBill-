"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building, Wifi, Anchor, Waves,
  Cpu, Film, Paintbrush, Sunset,
  Snowflake, Apple, Box, Flower2,
  TreePine, Tent, Moon as MoonIcon, Coffee,
} from 'lucide-react';

interface Features {
  mpesa: boolean; voucher: boolean; sms: boolean; login: boolean;
  countdown: boolean; termsCheck: boolean; shareButton: boolean;
  announcement: boolean; customFooter: boolean;
}

interface State {
  step: number;
  tpl: string;
  palette: number;
  font: string;
  name: string; tag: string; loc: string; emoji: string; phone: string;
  feats: Features;
}

const CATEGORIES = [
  { id: 'business', name: 'Business' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'minimal', name: 'Minimal' },
  { id: 'local', name: 'Local' },
];

const TEMPLATES = [
  { id: 'executive-light', name: 'Executive Light', category: 'business', desc: 'Clean light theme for professional services', badge: 'New', icon: Building, colors: { bg: '#ffffff', header: '#2D3436', card: '#f0f0f0', accent: '#0984e3', text: '#1d1d1f', textDim: 'rgba(0,0,0,0.35)' } },
  { id: 'modern-isp', name: 'Modern ISP', category: 'business', desc: 'Bold modern theme for tech-forward ISPs', badge: 'Popular', icon: Wifi, colors: { bg: '#0d1117', header: '#00E676', card: '#161b22', accent: '#58a6ff', text: '#f0f0f0', textDim: 'rgba(255,255,255,0.35)' } },
  { id: 'corporate-blue', name: 'Corporate Blue', category: 'business', desc: 'Trustworthy blue theme for enterprise', badge: null, icon: Anchor, colors: { bg: '#1e1e2f', header: '#1a73e8', card: '#252540', accent: '#8ab4f8', text: '#e0e0e0', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'ocean-deep', name: 'Ocean Deep', category: 'business', desc: 'Deep blue ocean inspired calm theme', badge: null, icon: Waves, colors: { bg: '#03045E', header: '#0077B6', card: '#023E8A', accent: '#00B4D8', text: '#e0f0ff', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'cyberpunk', name: 'Cyberpunk', category: 'entertainment', desc: 'Dark futuristic theme with vibrant accents', badge: null, icon: Cpu, colors: { bg: '#0d0d0d', header: '#ff6b35', card: '#1a1a1a', accent: '#ffd700', text: '#f0f0f0', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'streaming-portal', name: 'Streaming Portal', category: 'entertainment', desc: 'Netflix-inspired dark theme', badge: 'Popular', icon: Film, colors: { bg: '#141414', header: '#e50914', card: '#1f1f1f', accent: '#ffffff', text: '#f0f0f0', textDim: 'rgba(255,255,255,0.35)' } },
  { id: 'rgb-wave', name: 'RGB Wave', category: 'entertainment', desc: 'Colorful RGB theme for tech events', badge: 'New', icon: Paintbrush, colors: { bg: '#0a0a1a', header: '#ff0080', card: '#150030', accent: '#7000ff', text: '#f0f0ff', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'sunset-vibes', name: 'Sunset Vibes', category: 'entertainment', desc: 'Warm sunset gradient theme', badge: null, icon: Sunset, colors: { bg: '#1a0a0a', header: '#FF6B6B', card: '#2d1b1b', accent: '#FFE66D', text: '#f0e8e0', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'glass-morphism', name: 'Glass', category: 'minimal', desc: 'Modern glassmorphism design', badge: 'Popular', icon: Snowflake, colors: { bg: '#0f172a', header: '#ffffff', card: 'rgba(255,255,255,0.06)', accent: '#60a5fa', text: '#f0f0f0', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'apple-style', name: 'Apple Style', category: 'minimal', desc: 'Clean Apple-inspired minimal design', badge: null, icon: Apple, colors: { bg: '#f5f5f7', header: '#1d1d1f', card: '#ffffff', accent: '#0071e3', text: '#1d1d1f', textDim: 'rgba(0,0,0,0.35)' } },
  { id: 'material-design', name: 'Material', category: 'minimal', desc: 'Google Material Design 3 inspired', badge: null, icon: Box, colors: { bg: '#1c1b1f', header: '#6750A4', card: '#2b2930', accent: '#D0BCFF', text: '#e6e1e5', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'cherry-blossom', name: 'Cherry Blossom', category: 'minimal', desc: 'Soft pink theme with elegance', badge: 'New', icon: Flower2, colors: { bg: '#1a1014', header: '#FFB7C5', card: '#2d1a20', accent: '#d4a0a0', text: '#f0e8ec', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'safari', name: 'Safari', category: 'local', desc: 'Earthy tones inspired by the savannah', badge: null, icon: TreePine, colors: { bg: '#2a1f14', header: '#C4873B', card: '#3a2d1e', accent: '#E8B84B', text: '#f0e8d8', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'afro-modern', name: 'Afro Modern', category: 'local', desc: 'Bold African patterns meets modern design', badge: 'New', icon: Tent, colors: { bg: '#1a0f0a', header: '#E85D26', card: '#2d1a10', accent: '#F5A623', text: '#f0e8d8', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'nairobi-night', name: 'Nairobi Night', category: 'local', desc: 'City lights inspired dark theme', badge: null, icon: MoonIcon, colors: { bg: '#0a0a14', header: '#6C3EB8', card: '#15152a', accent: '#B388FF', text: '#e8e0f0', textDim: 'rgba(255,255,255,0.3)' } },
  { id: 'coffee-shop', name: 'Coffee Shop', category: 'local', desc: 'Warm brown theme perfect for cafes', badge: 'New', icon: Coffee, colors: { bg: '#1C1512', header: '#D4A574', card: '#2d2018', accent: '#8B5E3C', text: '#f0e8d8', textDim: 'rgba(255,255,255,0.3)' } },
];

const FONTS = [
  { id: 'Playfair Display', cat: 'Serif' },
  { id: 'Orbitron', cat: 'Futuristic' },
  { id: 'Bebas Neue', cat: 'Condensed' },
  { id: 'Dancing Script', cat: 'Cursive' },
  { id: 'JetBrains Mono', cat: 'Monospace' },
  { id: 'Abril Fatface', cat: 'Display' },
  { id: 'Fredoka', cat: 'Playful' },
  { id: 'Unbounded', cat: 'Geometric' },
  { id: 'Rubik Glitch', cat: 'Glitch' },
  { id: 'Cormorant Garamond', cat: 'Book' },
  { id: 'Bangers', cat: 'Comic' },
  { id: 'Zilla Slab', cat: 'Slab' },
];

const STEPS = [
  { t: 'Choose Layout', s: 'Pick a template for your portal' },
  { t: 'Brand', s: 'Your WiFi name and tagline' },
  { t: 'Color Palette', s: 'Choose your color scheme' },
  { t: 'Typography', s: 'Select your heading font' },
  { t: 'Features', s: 'Toggle portal components' },
  { t: 'Preview & Launch', s: 'See it live, then go live' },
];

const PALS = [
  { n: 'Dark Indigo' }, { n: 'Sunset Orange' }, { n: 'Sky Blue' }, { n: 'Forest Green' },
  { n: 'Rose' }, { n: 'Slate' }, { n: 'Amber' }, { n: 'Purple' },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Orbitron:wght@400;500;600;700&family=Bebas+Neue&family=Dancing+Script:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Abril+Fatface&family=Fredoka:wght@400;500;600;700&family=Unbounded:wght@400;500;600;700&family=Rubik+Glitch&family=Cormorant+Garamond:wght@400;500;600;700&family=Bangers&family=Zilla+Slab:wght@400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#000;color:#f0f0f0;min-height:100vh;font-size:16px;line-height:1.5;overflow:hidden}
.app{display:grid;grid-template-columns:240px 1fr;height:100vh}

.sidebar{background:#000;padding:28px 20px;display:flex;flex-direction:column;border-right:1px solid #141414}
.logo{display:flex;align-items:center;gap:10px;margin-bottom:32px;padding:0 4px}
.logo-mark{width:32px;height:32px;background:#E8B84B;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-weight:700;font-size:13px;color:#000}
.logo-text{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:17px;letter-spacing:-.3px}
.logo-sub{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:1px;margin-top:2px}
.steps{flex:1;display:flex;flex-direction:column;gap:2px}
.step{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:10px;cursor:pointer;transition:all .2s;border:1px solid transparent}
.step:hover{background:rgba(255,255,255,.03)}
.step.active{background:rgba(232,184,75,.08);border-color:rgba(232,184,75,.2)}
.step.done .snum{background:#22c55e!important;color:#000!important;border-color:#22c55e!important}
.snum{width:26px;height:26px;border-radius:50%;border:1.5px solid #2a2a2a;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;font-family:'DM Mono',monospace;color:#666;transition:all .3s}
.step.active .snum{background:#E8B84B!important;color:#000!important;border-color:#E8B84B!important}
.sinfo .slabel{font-size:14px;font-weight:600;color:rgba(255,255,255,.9)}
.sinfo .sdesc{font-size:12px;color:#666;margin-top:3px}
.sconn{height:14px;width:1px;background:#141414;margin-left:24px}
.sidebar-footer{margin-top:auto;padding-top:20px;border-top:1px solid #141414}
.prog-label{font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#666;margin-bottom:8px;display:flex;justify-content:space-between}
.prog-label span{color:#E8B84B;font-weight:700}
.prog-track{background:#141414;border-radius:99px;height:3px;overflow:hidden}
.prog-fill{height:100%;background:#E8B84B;border-radius:99px;transition:width .5s}

.topbar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:20px 28px;border-bottom:1px solid #141414;gap:16px}
.ttitle{font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;letter-spacing:-.4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tsub{font-size:14px;color:#666;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tb-center{text-align:center;overflow:hidden;min-width:0}
.tbtns{display:flex;gap:10px}
.btn{padding:10px 20px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .15s;display:flex;align-items:center;gap:8px;font-family:'Inter',sans-serif}
.btn-ghost{background:transparent;border:1px solid #141414;color:#666}
.btn-ghost:hover{border-color:#2a2a2a;color:#f0f0f0}
.btn-primary{background:#E8B84B;color:#000}
.btn-primary:hover{background:#d4a534}
.btn-green{background:#22c55e;color:#000}
.btn-green:hover{background:#1da64e}

.content{padding:24px 28px;overflow-y:auto;height:calc(100vh - 69px)}
.panel{display:none}.panel.active{display:block}

.card{background:#0a0a0a;border:1px solid #141414;border-radius:12px;padding:20px;margin-bottom:14px}
.card-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#666;margin-bottom:16px;display:flex;align-items:center;gap:10px}
.card-title::after{content:'';flex:1;height:1px;background:#141414}

.card-tpl{min-height:calc(100vh - 69px - 48px - 14px);display:flex;flex-direction:column;overflow:hidden}
.card-tpl .tpl-grid{flex:1;display:flex;align-items:center;justify-content:center;gap:20px;padding:0;min-height:0}
.tpl-card{border-radius:20px;cursor:pointer;transition:all .5s cubic-bezier(.34,1.56,.64,1);position:relative;width:170px;flex-shrink:0}
.tpl-card:hover{transform:translateY(-4px)}
.tpl-card.active{width:320px}
.tpl-card.active ~ .tpl-card{width:140px;opacity:.5;filter:blur(.5px)}
.tpl-card.active:hover{transform:none}

/* Phone frame */
.tpl-phone{background:#1a1a1a;border-radius:20px;padding:8px;box-shadow:0 4px 14px rgba(0,0,0,.5),0 0 0 1px #2a2a2a;position:relative;transition:all .5s cubic-bezier(.34,1.56,.64,1)}
.tpl-card.active .tpl-phone{box-shadow:0 0 0 2px #E8B84B,0 12px 32px rgba(232,184,75,.3),0 0 60px rgba(232,184,75,.1)}
.tpl-phone::before{content:'';position:absolute;top:12px;left:50%;transform:translateX(-50%);width:50px;height:5px;background:#1a1a1a;border-radius:99px;z-index:10;border:1px solid #2a2a2a}
.tpl-phone::after{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:100%;height:18px;background:linear-gradient(180deg,rgba(255,255,255,.04),transparent);border-radius:14px 14px 0 0;pointer-events:none}
.tpl-screen{border-radius:14px;overflow:hidden;background:#000;aspect-ratio:375/812}
.tpl-screen iframe{width:100%;height:100%;border:none;pointer-events:none;display:block;overflow:hidden}
.tpl-screen iframe::-webkit-scrollbar{display:none;width:0}
.tpl-screen iframe body::-webkit-scrollbar{display:none}

/* Selected glow */
.tpl-card.active .tpl-glow{position:absolute;inset:-16px;border-radius:32px;background:radial-gradient(ellipse,rgba(232,184,75,.2),transparent 70%);pointer-events:none;z-index:-1;animation:glow-pulse 2s ease-in-out infinite}

@keyframes glow-pulse{0%,100%{opacity:.6}50%{opacity:1}}

/* Label */
.tpl-label{text-align:center;margin-top:12px;font-size:14px;font-weight:600;color:#f0f0f0;transition:all .3s}
.tpl-card:not(.active) .tpl-label{font-size:12px;margin-top:8px}
.tpl-label small{display:block;font-size:11px;color:#666;font-weight:400;margin-top:2px}
.tpl-card:not(.active) .tpl-label small{display:none}

/* Checkmark */
.tpl-check{position:absolute;top:-4px;right:-4px;width:24px;height:24px;border-radius:50%;background:#E8B84B;color:#000;font-size:11px;font-weight:700;display:none;align-items:center;justify-content:center;z-index:20;font-family:'DM Mono',monospace;box-shadow:0 2px 8px rgba(232,184,75,.4)}
.tpl-card.active .tpl-check{display:flex}

.font-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.font-card{border:1px solid #141414;border-radius:10px;padding:14px 10px;cursor:pointer;transition:all .2s;text-align:center}
.font-card:hover{border-color:#2a2a2a}
.font-card.sel{border-color:#E8B84B;box-shadow:0 0 0 1px rgba(232,184,75,.2)}
.font-card .fn-name{font-size:10px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px}
.font-card .fn-sample{font-size:24px;color:#f0f0f0;line-height:1.2;min-height:1.4em;display:flex;align-items:center;justify-content:center;font-weight:600}
.font-card .fn-cat{font-size:11px;color:#666;margin-top:6px}

.gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr;gap:16px;max-width:820px;margin:0 auto;height:100%}
.gallery-grid .gal-card:last-child:nth-child(4){grid-column:2}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.gal-card{background:#0a0a0a;border:1px solid #1a1a1a;border-radius:12px;overflow:hidden;cursor:pointer;transition:all .3s cubic-bezier(.34,1.56,.64,1);text-align:left;display:flex;flex-direction:column;height:100%}
.gal-card:hover{border-color:rgba(255,255,255,.15);box-shadow:0 0 0 1px rgba(255,255,255,.05);transform:translateY(-1px)}
.gal-card.sel{border-color:#fff;box-shadow:0 0 18px rgba(255,255,255,.25),0 0 0 1px #fff;transform:translateY(-3px) scale(1.03);position:relative;z-index:2}
.gal-preview{flex:1;position:relative;overflow:hidden;min-height:0}
.gal-info{padding:10px 12px 12px;display:flex;flex-direction:column}
.gal-info .gi-row{display:flex;align-items:center;gap:8px;margin-bottom:3px}
.gal-info .gi-row .gi-icon{width:14px;height:14px;flex-shrink:0}
.gal-info .gi-name{font-size:14px;font-weight:600;color:#f0f0f0}
.gal-badge{padding:2px 7px;border-radius:4px;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
.gal-badge.popular{background:rgba(232,184,75,.1);color:#E8B84B}
.gal-badge.trending{background:rgba(34,197,94,.1);color:#22c55e}
.gal-badge.new{background:rgba(255,255,255,.05);color:#666}
.gal-desc{font-size:12px;color:#666;margin:0;line-height:1.4}
.gal-dots{display:flex;gap:4px;margin-top:auto;padding-top:8px}
.gal-dot{width:10px;height:10px;border-radius:50%;border:1px solid rgba(255,255,255,.08)}
.cat-tabs{display:flex;gap:4px;justify-content:center;margin-bottom:28px;background:#0a0a0a;border-radius:10px;padding:3px;width:fit-content;margin-left:auto;margin-right:auto}
.cat-tab{padding:8px 18px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:600;transition:all .15s;font-family:'Inter',sans-serif}
.cat-tab.on{background:#E8B84B;color:#000}
.cat-tab.off{background:transparent;color:#666}
.cat-tab.off:hover{color:#f0f0f0}

.field{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
.field-label{font-size:14px;font-weight:600;color:#666}
.field-label small{display:block;font-size:12px;color:#666;font-weight:400;margin-top:2px}
.field input{width:100%;padding:12px 14px;border:1px solid #141414;border-radius:10px;font-size:15px;font-family:'Inter',sans-serif;color:#f0f0f0;background:#000;outline:none;transition:border .2s}
.field input:focus{border-color:#E8B84B}
.field input::placeholder{color:#444}

.opt-row{display:flex;align-items:center;gap:14px;margin-bottom:12px}
.opt-label{font-size:13px;font-weight:600;color:#666;min-width:130px}
.opt-group{display:flex;gap:8px;flex-wrap:wrap}
.opt-btn{padding:8px 16px;border-radius:8px;border:1px solid #141414;background:transparent;font-size:13px;font-weight:600;cursor:pointer;color:#666;transition:all .15s;font-family:'Inter',sans-serif}
.opt-btn:hover{border-color:#2a2a2a;color:#f0f0f0}
.opt-btn.on{background:#E8B84B;color:#000;border-color:#E8B84B}

.feat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.feat{display:flex;align-items:center;justify-content:space-between;background:#000;border:1px solid #141414;border-radius:10px;padding:12px 14px;transition:border .2s;cursor:pointer}
.feat.on{border-color:rgba(34,197,94,.3)}
.feat-info .fn{font-size:14px;font-weight:600}
.feat-info .fd{font-size:12px;color:#666;margin-top:2px}
.sw{position:relative;width:38px;height:20px;flex-shrink:0;margin-left:12px}
.sw input{opacity:0;width:0;height:0}
.sw-track{position:absolute;inset:0;background:#2a2a2a;border-radius:99px;cursor:pointer;transition:.3s}
.sw-track::before{content:'';position:absolute;width:14px;height:14px;left:3px;top:3px;border-radius:50%;background:#666;transition:.3s}
input:checked+.sw-track{background:#E8B84B}
input:checked+.sw-track::before{background:#000;transform:translateX(18px)}

.prev-shell{background:#0a0a0a;border:1px solid #141414;border-radius:12px;overflow:hidden}
.prev-toolbar{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #141414}
.prev-toolbar span{font-size:13px;font-weight:700;color:#666}
.dev-btn{background:none;border:1px solid #141414;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;color:#666;transition:all .15s;font-family:'Inter',sans-serif}
.dev-btn.on{background:#E8B84B;color:#000;border-color:#E8B84B}
.prev-note{margin-left:auto;font-size:11px;color:#666;font-family:'DM Mono',monospace}
.prev-stage{padding:24px;background:#000;display:flex;justify-content:center;align-items:flex-start;min-height:520px}
.device-phone{width:340px;border-radius:36px;overflow:hidden;background:#111;padding:10px;box-shadow:0 0 0 1px #2a2a2a,0 25px 50px rgba(0,0,0,.5);position:relative}
.device-phone::before{content:'';position:absolute;top:16px;left:50%;transform:translateX(-50%);width:64px;height:7px;background:#111;border-radius:99px;z-index:10;border:1px solid #2a2a2a}
.phone-screen{border-radius:26px;overflow:hidden;background:#000;aspect-ratio:390/844;overflow:hidden}
.phone-screen::-webkit-scrollbar{display:none}
.device-desktop{width:700px;border-radius:10px;overflow:hidden;background:#1a1a1a;padding:10px 10px 0;box-shadow:0 0 0 1px #2a2a2a,0 25px 50px rgba(0,0,0,.4)}
.desktop-bar{height:28px;display:flex;align-items:center;gap:8px;padding:0 12px;margin-bottom:8px}
.desktop-dot{width:9px;height:9px;border-radius:50%}
.desktop-url{flex:1;background:rgba(255,255,255,.06);border-radius:4px;height:16px;display:flex;align-items:center;padding:0 10px}
.desktop-url span{font-size:8px;color:rgba(255,255,255,.3);font-family:'DM Mono',monospace}
.desktop-screen{border-radius:6px 6px 0 0;overflow:hidden;aspect-ratio:1280/720;background:#000}
.desktop-screen::-webkit-scrollbar{display:none}

.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);z-index:100;display:none;align-items:center;justify-content:center;padding:24px}
.modal-overlay.open{display:flex}
.modal-box{background:#0a0a0a;border:1px solid #141414;border-radius:16px;width:90vw;max-width:960px;height:85vh;max-height:750px;display:flex;flex-direction:column;overflow:hidden}
.modal-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #141414}
.modal-header h3{font-family:'Space Grotesk',sans-serif;font-size:17px;font-weight:700;letter-spacing:-.2px}
.modal-close{background:none;border:none;font-size:20px;cursor:pointer;color:#666;padding:6px 10px;border-radius:8px;transition:all .2s}
.modal-close:hover{background:#141414;color:#f0f0f0}
.modal-content{flex:1;overflow:hidden;background:#000;padding:14px}
.modal-content iframe{width:100%;height:100%;border:none;border-radius:8px;background:#fff}

.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.summary-item{padding:12px;background:#000;border:1px solid #141414;border-radius:10px;text-align:center}
.summary-item .sm-label{font-size:10px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px}
.summary-item .sm-val{font-size:16px;font-weight:600;color:#f0f0f0}

.toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#f0f0f0;padding:12px 24px;border-radius:99px;font-size:14px;font-weight:500;z-index:200;transition:all .3s;box-shadow:0 8px 24px rgba(0,0,0,.3);white-space:nowrap;border:1px solid #2a2a2a}

.nav-side{position:fixed;right:28px;top:50%;transform:translateY(-50%);z-index:50;display:flex;flex-direction:column;gap:10px;align-items:center}
.nav-next{width:54px;height:54px;border-radius:50%;background:#E8B84B;color:#000;border:none;cursor:pointer;font-size:22px;display:flex;align-items:center;justify-content:center;transition:all .2s;box-shadow:0 4px 16px rgba(232,184,75,.3);font-family:'Inter',sans-serif;font-weight:700}
.nav-next:hover{transform:scale(1.1);box-shadow:0 6px 24px rgba(232,184,75,.4)}
.nav-back{background:transparent;border:1px solid #141414;color:#666;cursor:pointer;border-radius:50%;width:34px;height:34px;font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .15s}
.nav-back:hover{border-color:#2a2a2a;color:#f0f0f0}

@media(max-width:860px){
  .app{grid-template-columns:1fr}
  .sidebar{display:none}
  .feat-grid,.font-grid{grid-template-columns:1fr 1fr}
  .summary-grid{grid-template-columns:repeat(2,1fr)}
  .device-phone{width:100%}
  .device-desktop{width:100%}
  .ttitle{font-size:18px}
  .content{padding:16px}
  .card-tpl{min-height:auto}
  .card-tpl .tpl-grid{flex-wrap:wrap;gap:16px}
  .tpl-card{width:150px}
  .tpl-card.active{width:280px}
  .tpl-card.active ~ .tpl-card{width:120px}
}
@media(min-width:420px) and (max-width:860px){
  .card-tpl{min-height:auto}
  .card-tpl .tpl-grid{flex-wrap:wrap;gap:14px}
  .tpl-card{width:140px}
  .tpl-card.active{width:260px}
  .tpl-card.active ~ .tpl-card{width:110px}
}
`;

export default function OnboardingWizard() {
  const router = useRouter();
  useEffect(() => {
    const role = localStorage.getItem('wb_role');
    const token = localStorage.getItem('wb_token');
    if (!token) { router.replace('/login'); return; }
    if (role === 'platform_admin') { router.replace('/admin'); return; }
  }, [router]);

  const [S, setS] = useState<State>({
    step: 1, tpl: 'dashboard', palette: 0, font: 'Playfair Display',
    name: 'Vertex WiFi', tag: 'Fast, affordable internet for everyone.',
    loc: 'Nairobi CBD', emoji: '📡', phone: '+254 700 123 456',
    feats: { mpesa:true, voucher:false, sms:true, login:true, countdown:true,
             termsCheck:false, shareButton:false, announcement:false, customFooter:false },
  });

  const [gallerySel, setGallerySel] = useState<string|null>(null);
  const [activePreview, setActivePreview] = useState<string|null>(null);
  const [devMode, setDevMode] = useState<'phone'|'desktop'>('phone');
  const [toastMsg, setToastMsg] = useState('');
  const [activeCategory, setActiveCategory] = useState('business');

  const filteredTemplates = TEMPLATES.filter(t => t.category === activeCategory);

  const templateToPalette = (id: string): number => {
    const map: Record<string, number> = {
      'executive-light': 5, 'modern-isp': 3, 'corporate-blue': 2, 'ocean-deep': 2,
      'cyberpunk': 6, 'streaming-portal': 4, 'rgb-wave': 7, 'sunset-vibes': 1,
      'glass-morphism': 0, 'apple-style': 5, 'material-design': 7, 'cherry-blossom': 4,
      'safari': 6, 'afro-modern': 1, 'nairobi-night': 7, 'coffee-shop': 6,
    };
    return map[id] ?? 0;
  };

  function TemplatePreview({ colors }: { colors: typeof TEMPLATES[0]['colors'] }) {
    const isLight = ['#ffffff', '#f5f5f7'].includes(colors.bg);
    return (
      <div style={{ width:'100%', height:'100%', background:colors.bg, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ height:44, background:colors.header, display:'flex', alignItems:'center', padding:'0 10px', gap:6, flexShrink:0 }}>
          <div style={{ width:18, height:18, borderRadius:4, background: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)' }} />
          <div style={{ width:50, height:7, borderRadius:3, background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)' }} />
        </div>
        <div style={{ padding:'6px 8px', display:'flex', flexDirection:'column', gap:5, flex:1 }}>
          <div style={{ width:'65%', height:6, borderRadius:2, background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }} />
          <div style={{ width:'40%', height:4, borderRadius:2, background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
          <div style={{ display:'flex', gap:4, marginTop:3, flex:1 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ flex:1, background:colors.card, borderRadius:6, padding:4, display:'flex', flexDirection:'column', gap:2, border:`1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}` }}>
                <div style={{ width:'60%', height:3, borderRadius:1, background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }} />
                <div style={{ width:'80%', height:2, borderRadius:1, background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }} />
                <div style={{ flex:1 }} />
                <div style={{ height:8, borderRadius:3, background:colors.accent, opacity:.85 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const upd = (u: Partial<State>) => setS(p => ({ ...p, ...u }));
  const toast = (m: string) => { setToastMsg(m); setTimeout(() => setToastMsg(''), 3200); };

  const prevUrl = (tpl: string) => `/${tpl}.html?palette=${S.palette}&font=${encodeURIComponent(S.font)}`;

  const goto = (n: number) => { if (n >= 1 && n <= 6) upd({ step: n }); };

  const toggleFeat = (k: keyof Features) => upd({ feats: { ...S.feats, [k]: !S.feats[k] } });

  const saveAndLaunch = async () => {
    try {
      toast('Saving portal configuration...');
      const token = localStorage.getItem('wb_token');
      if (!token) throw new Error('No auth token');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiBase}/api/portal-config`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          template_id: S.tpl, palette_index: S.palette, font_family: S.font,
          name: S.name, tagline: S.tag, location: S.loc, emoji: S.emoji, support_phone: S.phone,
          enabled_features: { mpesa_stk: S.feats.mpesa, vouchers: S.feats.voucher, sms_receipts: S.feats.sms },
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      sessionStorage.setItem('onboarding_done', 'true');
      toast('Portal live! Redirecting...');
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err: any) { toast('❌ ' + (err.message || 'Error')); }
  };

  const sm = STEPS[S.step - 1];

  const templates = [
    { id:'dashboard', label:'Dashboard', sub:'Compact grid · Modal' },
    { id:'spotlight', label:'Spotlight', sub:'Hero header · Premium' },
    { id:'split', label:'Split', sub:'Split-screen · Brand' },
    { id:'bento', label:'Bento', sub:'Asymmetric · Apple-style' },
  ];

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="app">
        <aside className="sidebar">
          <div className="logo">
            <div className="logo-mark">W</div>
            <div><div className="logo-text">WiBill</div><div className="logo-sub">Portal Wizard</div></div>
          </div>
          <div className="steps">
            {STEPS.map((s, i) => (
              <div key={i}>
                <div className={`step ${S.step === i+1 ? 'active' : ''} ${S.step > i+1 ? 'done' : ''}`} onClick={() => goto(i+1)}>
                  <div className="snum">{S.step > i+1 ? '✓' : i+1}</div>
                  <div className="sinfo"><span className="slabel">{s.t}</span><span className="sdesc">{s.s}</span></div>
                </div>
                {i < 5 && <div className="sconn"></div>}
              </div>
            ))}
          </div>
          <div className="sidebar-footer">
            <div className="prog-label">Progress <span>{Math.round((S.step/6)*100)}%</span></div>
            <div className="prog-track"><div className="prog-fill" style={{ width:`${Math.round((S.step/6)*100)}%` }}></div></div>
          </div>
        </aside>

        <main style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
          <div className="topbar">
            <div></div>
            <div className="tb-center"><div className="ttitle">{sm.t}</div><div className="tsub">{sm.s}</div></div>
            <div></div>
          </div>

          <div className="content">
            {/* STEP 1: Layout */}
            {S.step === 1 && (
              <div className="card card-tpl">
                <div className="card-title">Choose your template</div>
                <div className="tpl-grid">
                  {templates.map(t => (
                    <div key={t.id} className={`tpl-card ${S.tpl === t.id ? 'active' : ''}`} onClick={() => upd({ tpl: t.id })}>
                      <div className="tpl-glow"></div>
                      <div className="tpl-check">✓</div>
                      <div className="tpl-phone">
                        <div className="tpl-screen">
                          <iframe key={`t-${t.id}-${S.palette}-${S.font}`} src={prevUrl(t.id)} loading="lazy" title={t.label} scrolling="no" />
                        </div>
                      </div>
                      <div className="tpl-label">{t.label}<small>{t.sub}</small></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: Brand */}
            {S.step === 2 && (
              <div className="card" style={{ maxWidth: 480 }}>
                <div className="card-title">Brand Identity</div>
                <div className="field">
                  <div className="field-label">WiFi Name <small>The name users see on the portal</small></div>
                  <input value={S.name} onChange={e => upd({ name: e.target.value })} placeholder="My WiFi" />
                </div>
                <div className="field">
                  <div className="field-label">Tagline <small>Brief description under the name</small></div>
                  <input value={S.tag} onChange={e => upd({ tag: e.target.value })} placeholder="Fast, reliable internet" />
                </div>
                <div className="field">
                  <div className="field-label">Location <small>Hotspot area</small></div>
                  <input value={S.loc} onChange={e => upd({ loc: e.target.value })} placeholder="Nairobi, Kenya" />
                </div>
                <div className="field">
                  <div className="field-label">Support Phone <small>For user assistance</small></div>
                  <input value={S.phone} onChange={e => upd({ phone: e.target.value })} placeholder="+254 700 123 456" />
                </div>
                <div className="field">
                  <div className="field-label">Emoji <small>Brand icon shown in the header</small></div>
                  <input value={S.emoji} onChange={e => upd({ emoji: e.target.value })} style={{ maxWidth: 80 }} />
                </div>
              </div>
            )}

            {/* STEP 3: Colors - Template Gallery */}
            {S.step === 3 && (
              <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 69px - 48px)', overflow:'hidden' }}>
                <div style={{ textAlign:'center', padding:'14px 20px 0' }}>
                  <div className="cat-tabs">
                    {CATEGORIES.map(cat => (
                      <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`cat-tab ${activeCategory === cat.id ? 'on' : 'off'}`}>
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ flex:1, overflow:'hidden', padding:'0 20px 20px' }}>
                  <div className="gallery-grid">
                    {filteredTemplates.map((t, i) => (
                      <div key={t.id} className={`gal-card ${gallerySel === t.id ? 'sel' : ''}`}
                        onClick={() => { setGallerySel(t.id); upd({ palette: templateToPalette(t.id) }); }}>
                        <div className="gal-preview">
                          <TemplatePreview colors={t.colors} />
                        </div>
                        <div className="gal-info">
                          <div className="gi-row">
                            <t.icon size={14} style={{ color:t.colors.header, flexShrink:0 }} />
                            <span className="gi-name">{t.name}</span>
                            {t.badge && (
                              <span className={`gal-badge ${t.badge.toLowerCase()}`}>{t.badge}</span>
                            )}
                          </div>
                          <p className="gal-desc">{t.desc}</p>
                          <div className="gal-dots">
                            {[t.colors.header, t.colors.accent, t.colors.card].map((c, j) => (
                              <div key={j} className="gal-dot" style={{ background:c }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Typography */}
            {S.step === 4 && (
              <div className="card">
                <div className="card-title">Typography</div>
                <p style={{ fontSize:12, color:'#666', marginBottom:14, lineHeight:1.5 }}>
                  Pick a heading font that matches your brand personality. The sample shows how "WiFi" looks in each font.
                </p>
                <div className="font-grid">
                  {FONTS.map(f => (
                    <div key={f.id} className={`font-card ${S.font === f.id ? 'sel' : ''}`} onClick={() => upd({ font: f.id })}>
                      <div className="fn-name">{f.id}</div>
                      <div className="fn-sample" style={{ fontFamily: `'${f.id}',sans-serif`, fontWeight: 600 }}>WiFi</div>
                      <div className="fn-cat">{f.cat}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 5: Features */}
            {S.step === 5 && (
              <div className="card">
                <div className="card-title">Features</div>
                <p style={{ fontSize:12, color:'#666', marginBottom:14, lineHeight:1.5 }}>
                  Toggle the portal components you want enabled. You'll set up packages and pricing from your dashboard.
                </p>
                <div className="feat-grid">
                  {[
                    { k:'mpesa' as const, n:'M-Pesa STK Push', d:'Instant Safaricom payment prompt' },
                    { k:'voucher' as const, n:'Voucher Codes', d:'Pre-paid code redemption' },
                    { k:'sms' as const, n:'SMS Receipts', d:'Text receipt after payment' },
                    { k:'login' as const, n:'Saved Number Login', d:'Return users skip re-typing' },
                    { k:'countdown' as const, n:'Session Timer', d:'Shows time remaining online' },
                    { k:'termsCheck' as const, n:'Terms Checkbox', d:'Users agree before paying' },
                    { k:'shareButton' as const, n:'Share WiFi', d:'Share hotspot with friends' },
                    { k:'announcement' as const, n:'Announcement Banner', d:'Promos and outage alerts' },
                  ].map(f => (
                    <div key={f.k} className={`feat ${S.feats[f.k]?'on':''}`} onClick={() => toggleFeat(f.k)}>
                      <div className="feat-info"><div className="fn">{f.n}</div><div className="fd">{f.d}</div></div>
                      <label className="sw"><input type="checkbox" checked={S.feats[f.k]} readOnly /><span className="sw-track"></span></label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 6: Preview & Launch */}
            {S.step === 6 && (
              <>
                <div className="prev-shell">
                  <div className="prev-toolbar">
                    <span>Preview</span>
                    <button className={`dev-btn ${devMode==='phone'?'on':''}`} onClick={() => setDevMode('phone')}>📱 Phone</button>
                    <button className={`dev-btn ${devMode==='desktop'?'on':''}`} onClick={() => setDevMode('desktop')}>🖥 Desktop</button>
                    <button className="dev-btn" style={{ marginLeft:'auto', color:'#E8B84B' }} onClick={() => setActivePreview(S.tpl)}>⛶ Full</button>
                    <div className="prev-note">{devMode==='phone' ? '390×844' : '1280×720'}</div>
                  </div>
                  <div className="prev-stage">
                    {devMode === 'phone' ? (
                      <div className="device-phone"><div className="phone-screen">
                        <iframe key={`p-${S.tpl}-${S.palette}-${S.font}`} src={prevUrl(S.tpl)} style={{ width:'100%', height:'100%', border:'none' }} title="Preview" />
                      </div></div>
                    ) : (
                      <div className="device-desktop">
                        <div className="desktop-bar">
                          <div className="desktop-dot" style={{ background:'#ff5f57' }}></div>
                          <div className="desktop-dot" style={{ background:'#febc2e' }}></div>
                          <div className="desktop-dot" style={{ background:'#28c840' }}></div>
                          <div className="desktop-url"><span>wibill.co.ke/portal/{S.name.toLowerCase().replace(/\s/g,'-')}</span></div>
                        </div>
                        <div className="desktop-screen">
                          <iframe key={`p-${S.tpl}-${S.palette}-${S.font}-d`} src={prevUrl(S.tpl)} style={{ width:'100%', height:'100%', border:'none' }} title="Desktop Preview" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card" style={{ marginTop:12 }}>
                  <div className="card-title">Summary</div>
                  <div className="summary-grid">
                    <div className="summary-item"><div className="sm-label">Template</div><div className="sm-val">{templates.find(t=>t.id===S.tpl)?.label}</div></div>
                    <div className="summary-item"><div className="sm-label">Palette</div><div className="sm-val">{PALS[S.palette].n}</div></div>
                    <div className="summary-item"><div className="sm-label">Font</div><div className="sm-val">{S.font}</div></div>
                    <div className="summary-item"><div className="sm-label">Features</div><div className="sm-val">{Object.values(S.feats).filter(Boolean).length} enabled</div></div>
                  </div>
                  <button className="btn btn-green" onClick={saveAndLaunch} style={{ width:'100%', justifyContent:'center', marginTop:14, padding:'10px 0' }}>
                    🚀 Save & Launch Portal
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Side navigation */}
      <div className="nav-side">
        {S.step > 1 && (
          <button className="nav-back" onClick={() => goto(S.step-1)} title="Back">←</button>
        )}
        {S.step < 6 ? (
          <button className="nav-next" onClick={() => goto(S.step+1)} title="Next">→</button>
        ) : (
          <button className="nav-next" onClick={saveAndLaunch} title="Launch Portal">✓</button>
        )}
      </div>

      <div className={`modal-overlay ${activePreview?'open':''}`} onClick={() => setActivePreview(null)}>
        <div className="modal-box" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Preview: {activePreview}</h3>
            <button className="modal-close" onClick={() => setActivePreview(null)}>×</button>
          </div>
          <div className="modal-content">
            {activePreview && <iframe key={`m-${activePreview}-${S.palette}-${S.font}`} src={prevUrl(activePreview)} title="Preview" />}
          </div>
        </div>
      </div>

      <div className="toast" style={{ bottom: toastMsg ? 24 : -80 }}>{toastMsg}</div>
    </div>
  );
}