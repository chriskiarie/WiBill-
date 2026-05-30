"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Package {
  n: string;
  d: string;
  s: string;
  p: number;
  star: boolean;
}

interface Voucher {
  prefix: string;
  dur: string;
  val: number;
}

interface Features {
  mpesa: boolean;
  card: boolean;
  sms: boolean;
  login: boolean;
  countdown: boolean;
  voucher: boolean;
  loyalty: boolean;
  referral: boolean;
  announcement: boolean;
  customFooter: boolean;
  shareButton: boolean;
  termsCheck: boolean;
}

interface State {
  step: number;
  tpl: 'spotlight' | 'dashboard' | 'stories';
  shape: string;
  size: 'compact' | 'comfortable' | 'large';
  palette: number;
  name: string;
  tag: string;
  loc: string;
  emoji: string;
  phone: string;
  font: string;
  showSB: boolean;
  sbMsg: string;
  pkgs: Package[];
  feats: Features;
  vouchers: Voucher[];
  loyaltyRate: number;
  loyaltyValue: number;
  loyaltyMin: number;
  loyaltyName: string;
  loyaltyIcon: string;
  refReward: number;
  refDiscount: number;
  refMax: number;
  annMsg: string;
  annStyle: 'info' | 'promo' | 'urgent' | 'success';
  annPos: 'top' | 'above-pay';
  footerTxt: string;
  footerLinkLabel: string;
  footerLinkUrl: string;
  devMode: 'phone' | 'desktop';
}

const PALS = [
  {
    n: 'Midnight Indigo',
    s: 'Dark & Premium',
    c: ['#0c0c1a', '#1a1040', '#5b4fff', '#8b73ff'],
    bg: '#0c0c1a',
    card: 'rgba(255,255,255,.06)',
    cardborder: 'rgba(255,255,255,.12)',
    cardhl: 'linear-gradient(135deg,rgba(91,79,255,.5),rgba(139,115,255,.3))',
    cardborderhl: 'rgba(91,79,255,.6)',
    text: '#e8e6ff',
    textdim: 'rgba(232,230,255,.5)',
    btn: '#5b4fff',
    btntxt: '#ffffff',
    hltxt: '#c7d2fe',
    accent: '#8b73ff',
    statusbg: 'rgba(16,185,129,.15)',
    statusborder: 'rgba(16,185,129,.4)',
    statustxt: '#6ee7b7',
    cardhlbg: false,
  },
  {
    n: 'Nairobi Sun',
    s: 'Warm & Vibrant',
    c: ['#fff7ed', '#fed7aa', '#f97316', '#9a3412'],
    bg: '#fff7ed',
    card: '#ffffff',
    cardborder: '#fed7aa',
    cardhl: '#f97316',
    cardborderhl: '#f97316',
    cardhlbg: true,
    text: '#431407',
    textdim: '#a1520b',
    btn: '#f97316',
    btntxt: '#ffffff',
    hltxt: '#ffffff',
    accent: '#ea6b03',
    statusbg: 'rgba(16,185,129,.1)',
    statusborder: 'rgba(16,185,129,.35)',
    statustxt: '#065f46',
  },
  {
    n: 'Ocean Deep',
    s: 'Cool & Trustworthy',
    c: ['#f0f9ff', '#bae6fd', '#0ea5e9', '#0c4a6e'],
    bg: '#f0f9ff',
    card: '#ffffff',
    cardborder: '#bae6fd',
    cardhl: '#0c4a6e',
    cardborderhl: '#0c4a6e',
    cardhlbg: true,
    text: '#0c4a6e',
    textdim: '#0369a1',
    btn: '#0ea5e9',
    btntxt: '#ffffff',
    hltxt: '#ffffff',
    accent: '#0284c7',
    statusbg: 'rgba(16,185,129,.1)',
    statusborder: 'rgba(16,185,129,.35)',
    statustxt: '#065f46',
  },
  {
    n: 'Forest Night',
    s: 'Natural & Calm',
    c: ['#052e16', '#14532d', '#16a34a', '#86efac'],
    bg: '#052e16',
    card: 'rgba(255,255,255,.07)',
    cardborder: 'rgba(134,239,172,.15)',
    cardhl: 'rgba(22,163,74,.3)',
    cardborderhl: 'rgba(134,239,172,.5)',
    text: '#dcfce7',
    textdim: 'rgba(220,252,231,.5)',
    btn: '#16a34a',
    btntxt: '#ffffff',
    hltxt: '#bbf7d0',
    accent: '#22c55e',
    statusbg: 'rgba(16,185,129,.2)',
    statusborder: 'rgba(16,185,129,.5)',
    statustxt: '#6ee7b7',
    cardhlbg: false,
  },
  {
    n: 'Rose Quartz',
    s: 'Elegant & Warm',
    c: ['#fff1f2', '#fecdd3', '#f43f5e', '#4c0519'],
    bg: '#fff1f2',
    card: '#ffffff',
    cardborder: '#fecdd3',
    cardhl: '#f43f5e',
    cardborderhl: '#f43f5e',
    cardhlbg: true,
    text: '#4c0519',
    textdim: '#881337',
    btn: '#f43f5e',
    btntxt: '#ffffff',
    hltxt: '#ffffff',
    accent: '#e11d48',
    statusbg: 'rgba(16,185,129,.1)',
    statusborder: 'rgba(16,185,129,.35)',
    statustxt: '#065f46',
  },
  {
    n: 'Obsidian Slate',
    s: 'Corporate & Sharp',
    c: ['#f8fafc', '#e2e8f0', '#1e293b', '#0f172a'],
    bg: '#f8fafc',
    card: '#ffffff',
    cardborder: '#e2e8f0',
    cardhl: '#1e293b',
    cardborderhl: '#1e293b',
    cardhlbg: true,
    text: '#0f172a',
    textdim: '#64748b',
    btn: '#1e293b',
    btntxt: '#ffffff',
    hltxt: '#ffffff',
    accent: '#334155',
    statusbg: 'rgba(16,185,129,.1)',
    statusborder: 'rgba(16,185,129,.35)',
    statustxt: '#065f46',
  },
  {
    n: 'Amber Dusk',
    s: 'Bold & Inviting',
    c: ['#fffbeb', '#fef3c7', '#d97706', '#78350f'],
    bg: '#fffbeb',
    card: '#ffffff',
    cardborder: '#fde68a',
    cardhl: '#d97706',
    cardborderhl: '#d97706',
    cardhlbg: true,
    text: '#451a03',
    textdim: '#92400e',
    btn: '#b45309',
    btntxt: '#ffffff',
    hltxt: '#ffffff',
    accent: '#d97706',
    statusbg: 'rgba(16,185,129,.1)',
    statusborder: 'rgba(16,185,129,.35)',
    statustxt: '#065f46',
  },
  {
    n: 'Electric Violet',
    s: 'Gen-Z & Electric',
    c: ['#faf5ff', '#ede9fe', '#7c3aed', '#2e1065'],
    bg: '#faf5ff',
    card: '#ffffff',
    cardborder: '#ddd6fe',
    cardhl: '#7c3aed',
    cardborderhl: '#7c3aed',
    cardhlbg: true,
    text: '#2e1065',
    textdim: '#6d28d9',
    btn: '#7c3aed',
    btntxt: '#ffffff',
    hltxt: '#ffffff',
    accent: '#6d28d9',
    statusbg: 'rgba(16,185,129,.1)',
    statusborder: 'rgba(16,185,129,.35)',
    statustxt: '#065f46',
  },
];

const PALETTE_TOKENS = PALS.map((p) => ({
  name: p.n,
  primary: p.btn,
  primaryDark: p.cardborderhl,
  bgStart: p.bg,
  bgEnd: p.bg,
  text: p.text,
  textDim: p.textdim,
  card: p.card,
  cardBorder: p.cardborder,
  cardHl: p.cardhl,
  accent: p.accent,
  accentLight: p.cardhl,
}));

const PAY_FEATS = [
  { k: 'mpesa', n: 'M-Pesa STK Push', d: 'Instant Safaricom prompt' },
  { k: 'card', n: 'Card Payment', d: 'Visa / Mastercard' },
  { k: 'voucher', n: 'Voucher / Scratch Card', d: 'Prepaid code redemption' },
  { k: 'sms', n: 'SMS Confirmation', d: 'Text receipt after payment' },
];

const PORTAL_FEATS = [
  { k: 'login', n: 'Saved Number Login', d: 'Return users skip re-typing' },
  { k: 'countdown', n: 'Session Countdown Timer', d: 'Shows time remaining while online' },
  { k: 'termsCheck', n: 'Terms & Conditions Checkbox', d: 'Users agree before paying' },
  { k: 'shareButton', n: 'Share WiFi Button', d: 'Lets users share hotspot with friends' },
];

const LOYALTY_FEATS = [
  { k: 'loyalty', n: 'Loyalty Points', d: 'Earn points, redeem for free data' },
  { k: 'referral', n: 'Referral Program', d: 'Users earn rewards for bringing friends' },
];

const ANNOUNCE_FEATS = [
  { k: 'announcement', n: 'Announcement Banner', d: 'Promos, outage alerts, offers' },
  { k: 'customFooter', n: 'Custom Footer', d: 'Terms link, branding, contact' },
];

const STEP_META = [
  null,
  { 
    t: 'Choose Layout', 
    s: 'Select the baseline structure for your captive portal network.' 
  },
  { 
    t: 'Brand & Colors', 
    s: 'Define your identity, palette, and typography' 
  },
  { 
    t: 'Packages & Pricing', 
    s: 'Configure your internet plans' 
  },
  { 
    t: 'Features & Extras', 
    s: 'Payments, loyalty, vouchers, referrals and more' 
  },
  { 
    t: 'Preview & Export', 
    s: 'See exactly what customers see, then export or share' 
  },
];

const CSS_STYLES = `
  *{margin:0;padding:0;box-sizing:border-box}
  :root{
    --ink:#0e0e14;--ink2:#3a3a4a;--muted:#8888a0;--surface:#f5f4f1;--white:#ffffff;
    --border:#e4e2dd;--accent:#5b4fff;--accent-light:#ede9ff;--green:#10b981;--red:#ef4444;
    --radius:14px;--shadow:0 2px 12px rgba(0,0,0,.07);
  }
  body{font-family:'Figtree',sans-serif;background:var(--surface);color:var(--ink);min-height:100vh;font-size:15px}
  .app{display:grid;grid-template-columns:260px 1fr;min-height:100vh}
  .sidebar{background:var(--ink);color:#fff;padding:1.75rem 1.5rem;position:sticky;top:0;height:100vh;overflow-y:auto;display:flex;flex-direction:column}
  .xbill-logo{display:flex;align-items:center;gap:.6rem;margin-bottom:2rem}
  .xbill-logo-mark{width:32px;height:32px;background:var(--accent);border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;font-size:.85rem;color:#fff}
  .xbill-logo-text{font-family:'Syne',sans-serif;font-weight:800;font-size:1.4rem;letter-spacing:-.02em}
  .xbill-logo-sub{font-size:.7rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.12em;margin-top:.05rem}
  .steps{display:flex;flex-direction:column;gap:2px}
  .step{display:flex;align-items:center;gap:.85rem;padding:.8rem 1rem;border-radius:10px;cursor:pointer;transition:all .2s;border:1px solid transparent}
  .step:hover:not(.active){background:rgba(255,255,255,.04)}
  .step.active{background:rgba(91,79,255,.15);border-color:rgba(91,79,255,.3)}
  .step.done .snum{background:var(--green)!important;border-color:var(--green)!important;color:#fff!important}
  .snum{width:26px;height:26px;border-radius:50%;border:1.5px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;flex-shrink:0;font-family:'Space Mono',monospace;transition:all .3s;color:rgba(255,255,255,.5)}
  .step.active .snum{background:var(--accent)!important;border-color:var(--accent)!important;color:#fff!important}
  .sinfo .slabel{font-size:.82rem;font-weight:600;color:rgba(255,255,255,.85)}
  .sinfo .sdesc{font-size:.68rem;color:rgba(255,255,255,.35);margin-top:.08rem}
  .conn{width:1px;height:18px;background:rgba(255,255,255,.08);margin-left:calc(1rem + 13px - .5px)}
  .sidebar-footer{margin-top:auto;padding-top:1.5rem;border-top:1px solid rgba(255,255,255,.06)}
  .prog-label{font-size:.65rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.3);margin-bottom:.6rem;display:flex;justify-content:space-between;align-items:center}
  .prog-label span{color:var(--accent);font-weight:700}
  .prog-track{background:rgba(255,255,255,.08);border-radius:99px;height:3px;overflow:hidden}
  .prog-fill{height:100%;background:linear-gradient(90deg,var(--accent),#8b73ff);border-radius:99px;transition:width .5s cubic-bezier(.4,0,.2,1)}
  .topbar{background:var(--white);border-bottom:1px solid var(--border);padding:1.25rem 2rem;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
  .ttitle{font-family:'Syne',sans-serif;font-size:2rem;font-weight:900;letter-spacing:-.03em;line-height:1.2;color:var(--ink)}
  .tsub{font-size:.95rem;color:var(--muted);margin-top:.3rem;line-height:1.5;max-width:500px}
  .tbtns{display:flex;gap:.6rem;align-items:center}
  .btn{padding:.55rem 1.1rem;border-radius:8px;font-size:.82rem;font-weight:600;cursor:pointer;border:none;font-family:'Figtree',sans-serif;transition:all .2s;display:flex;align-items:center;gap:.4rem}
  .btn-ghost{background:transparent;border:1.5px solid var(--border);color:var(--ink2)}
  .btn-ghost:hover{border-color:#bbb;background:var(--surface)}
  .btn-primary{background:var(--accent);color:#fff}
  .btn-primary:hover{background:#4a3fee;transform:translateY(-1px)}
  .btn-green{background:var(--green);color:#fff}
  .btn-green:hover{background:#0da271}
  .content{padding:2.5rem 3rem;overflow-y:auto;max-height:calc(100vh - 100px)}
  .panel{display:none}.panel.active{display:block}
  .card{background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:1.4rem;margin-bottom:1.1rem}
  .card-title{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:1.1rem;display:flex;align-items:center;gap:.5rem}
  .card-title::after{content:'';flex:1;height:1px;background:var(--border)}
  .tpl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
  .tpl-card{border:2px solid var(--border);border-radius:var(--radius);overflow:hidden;cursor:pointer;transition:all .3s cubic-bezier(.4,0,.2,1);position:relative;background:var(--white)}
  .tpl-card:hover{border-color:rgba(91,79,255,.5);transform:translateY(-8px);box-shadow:0 20px 40px rgba(0,0,0,.15)}
  .tpl-card.sel{border:2px solid var(--accent);box-shadow:0 0 0 1px rgba(91,79,255,.25),0 16px 48px rgba(91,79,255,.2),0 0 80px rgba(91,79,255,.1);transform:translateY(-4px)}
  .tpl-card.sel::before{content:'';position:absolute;inset:-30px;background:radial-gradient(circle,rgba(91,79,255,.12),transparent 65%);z-index:-1;filter:blur(24px);pointer-events:none}
  .tpl-card .tpl-thumb{transition:transform .3s ease}
  .tpl-card:hover .tpl-thumb{transform:scale(1.04)}
  .tpl-badge{position:absolute;top:.55rem;right:.55rem;background:var(--accent);color:#fff;font-size:.6rem;font-weight:700;padding:.35rem .7rem;border-radius:99px;font-family:'Space Mono',monospace;opacity:0;transition:opacity .3s;box-shadow:0 4px 12px rgba(91,79,255,.3);z-index:5}
  .tpl-card.sel .tpl-badge{opacity:1}
  .tpl-thumb{height:280px;overflow:hidden;position:relative;scrollbar-width:none;-ms-overflow-style:none}
  .tpl-thumb::-webkit-scrollbar{display:none}
  .tpl-label{padding:1rem 1.2rem;font-size:.95rem;font-weight:700;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;background:var(--white)}
  .tpl-label small{font-weight:400;color:var(--muted);font-size:.8rem}
  .tpl-label .tpl-personality{display:flex;flex-direction:column;align-items:flex-end;gap:.1rem}
  .tpl-label .tpl-personality-main{font-size:.95rem;font-weight:700;color:var(--ink)}
  .tpl-label .tpl-personality-sub{font-size:.7rem;color:var(--muted);font-weight:500;letter-spacing:.05em}
  .tpl-tip{margin-top:1.5rem;padding:1rem;background:#f8f6f1;border-radius:12px;font-size:.85rem;color:#666;line-height:1.6;border-left:4px solid var(--accent)}
  .tpl-tip strong{color:var(--ink);font-weight:700;display:block;margin-bottom:.4rem}
  .opt-row{display:flex;align-items:center;gap:1rem;margin-bottom:.85rem}
  .opt-label{font-size:.82rem;font-weight:600;color:var(--ink2);min-width:150px}
  .opt-label small{display:block;font-size:.68rem;color:var(--muted);font-weight:400}
  .opt-group{display:flex;gap:.45rem;flex:1;flex-wrap:wrap}
  .opt-btn{padding:.45rem 1rem;border-radius:8px;border:1.5px solid var(--border);background:var(--white);font-size:.78rem;font-weight:600;cursor:pointer;font-family:'Figtree',sans-serif;transition:all .2s;color:var(--ink2);white-space:nowrap}
  .opt-btn.on{background:var(--ink);color:#fff;border-color:var(--ink)}
  .field{display:flex;align-items:flex-start;gap:1rem;margin-bottom:.9rem}
  .field-label{font-size:.82rem;font-weight:600;min-width:150px;padding-top:.4rem;color:var(--ink2)}
  .field-label small{display:block;font-size:.68rem;color:var(--muted);font-weight:400}
  .field input,.field select,.field textarea{flex:1;padding:.55rem .9rem;border:1.5px solid var(--border);border-radius:9px;font-size:.85rem;font-family:'Figtree',sans-serif;color:var(--ink);background:var(--white);outline:none;transition:border .2s}
  .field input:focus,.field select:focus,.field textarea:focus{border-color:var(--accent)}
  .field textarea{resize:vertical;min-height:60px}
  .pal-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem}
  .pal{border:2px solid var(--border);border-radius:10px;overflow:hidden;cursor:pointer;transition:all .3s cubic-bezier(.4,0,.2,1);position:relative}
  .pal:hover{transform:translateY(-4px);border-color:rgba(91,79,255,.4);box-shadow:0 12px 28px rgba(0,0,0,.12)}
  .pal.sel{border-color:var(--accent);box-shadow:0 0 0 1px rgba(91,79,255,.25),0 12px 32px rgba(91,79,255,.18)}
  .pal.sel::before{content:'';position:absolute;inset:-20px;background:radial-gradient(circle,rgba(91,79,255,.1),transparent 60%);z-index:-1;filter:blur(20px);pointer-events:none}
  .pal-swatches{display:flex;height:36px}
  .pal-sw{flex:1}
  .pal-name{font-size:.72rem;font-weight:700;padding:.45rem .75rem;background:#fff;color:var(--ink)}
  .pal-name small{display:block;font-size:.62rem;color:var(--muted);font-weight:400}
  .pkg-hdr{display:grid;grid-template-columns:1.4fr 1fr .9fr .9fr auto auto;gap:.4rem;margin-bottom:.5rem;padding:0 .5rem}
  .pkg-hdr span{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
  .pkg-list{display:flex;flex-direction:column;gap:.55rem;margin-bottom:.75rem}
  .pkg-row{display:grid;grid-template-columns:1.4fr 1fr .9fr .9fr auto auto;gap:.4rem;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.65rem .5rem;transition:all .2s}
  .pkg-row:hover{border-color:rgba(91,79,255,.3);background:#fefdfb}
  .pkg-row input{border:1.5px solid var(--border);border-radius:7px;padding:.38rem .6rem;font-size:.8rem;background:var(--white);width:100%;outline:none;font-family:'Figtree',sans-serif;transition:border .2s}
  .pkg-row input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(91,79,255,.08)}
  .pkg-star{background:none;border:1.5px solid var(--border);border-radius:6px;padding:.35rem .55rem;cursor:pointer;font-size:.75rem;transition:all .2s;color:var(--muted)}
  .pkg-star.on{background:#fef9c3;border-color:#fcd34d;color:#b45309;box-shadow:0 2px 8px rgba(252,211,77,.2)}
  .pkg-del{background:none;border:none;color:#ccc;cursor:pointer;font-size:1.1rem;padding:.2rem;transition:color .2s;line-height:1}
  .pkg-del:hover{color:var(--red)}
  .add-pkg{background:transparent;border:1.5px dashed var(--border);border-radius:10px;padding:.6rem;width:100%;font-size:.8rem;color:var(--muted);cursor:pointer;font-family:'Figtree',sans-serif;font-weight:600;transition:all .2s}
  .add-pkg:hover{border-color:var(--accent);color:var(--accent);border-style:solid}
  .feat-grid{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:.6rem}
  .feat{display:flex;align-items:center;justify-content:space-between;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.85rem 1rem;transition:all .2s;cursor:pointer}
  .feat:hover{border-color:rgba(91,79,255,.2);background:#fefdfb}
  .feat.on{border-color:rgba(16,185,129,.35);background:rgba(16,185,129,.03)}
  .feat-info .fn{font-size:.83rem;font-weight:600}
  .feat-info .fd{font-size:.7rem;color:var(--muted);margin-top:.1rem}
  .sw{position:relative;width:38px;height:20px;flex-shrink:0;margin-left:1rem}
  .sw input{opacity:0;width:0;height:0}
  .sw-track{position:absolute;inset:0;background:#ddd;border-radius:99px;cursor:pointer;transition:.3s}
  .sw-track::before{content:'';position:absolute;width:14px;height:14px;left:3px;top:3px;border-radius:50%;background:#fff;transition:.3s;box-shadow:0 1px 3px rgba(0,0,0,.15)}
  input:checked+.sw-track{background:var(--green)}
  input:checked+.sw-track::before{transform:translateX(18px)}
  .infobox{background:#eff6ff;border:1px solid #bfdbfe;border-radius:9px;padding:.7rem 1rem;font-size:.79rem;color:#1d4ed8;display:flex;gap:.5rem;align-items:flex-start;margin-bottom:.85rem;line-height:1.4}
  .infobox-amber{background:#fffbeb;border:1px solid #fde68a;color:#92400e}
  .infobox-green{background:#f0fdf4;border:1px solid #86efac;color:#166534}
  .preview-shell{background:var(--white);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:1.1rem}
  .prev-toolbar{background:var(--surface);border-bottom:1px solid var(--border);padding:.6rem 1rem;display:flex;align-items:center;gap:.6rem}
  .prev-toolbar span{font-size:.78rem;font-weight:700}
  .dev-btn{background:none;border:1.5px solid var(--border);border-radius:7px;padding:.3rem .7rem;font-size:.73rem;font-weight:600;cursor:pointer;font-family:'Figtree',sans-serif;color:var(--muted);transition:all .2s}
  .dev-btn.on{background:var(--ink);color:#fff;border-color:var(--ink)}
  .prev-note{margin-left:auto;font-size:.7rem;color:var(--muted);font-family:'Space Mono',monospace}
  .prev-stage{padding:2rem;background:repeating-linear-gradient(45deg,#f0efe9,#f0efe9 10px,#eae9e3 10px,#eae9e3 20px);display:flex;justify-content:center;align-items:flex-start;min-height:640px;overflow:hidden}
  .device-phone{width:390px;border-radius:44px;overflow:hidden;background:#111;padding:12px;box-shadow:0 0 0 2px #333,0 25px 60px rgba(0,0,0,.4),inset 0 0 0 1px rgba(255,255,255,.05);position:relative;transition:all .4s;scrollbar-width:none;-ms-overflow-style:none}
  .device-phone::-webkit-scrollbar{display:none}
  .device-phone::before{content:'';position:absolute;top:22px;left:50%;transform:translateX(-50%);width:70px;height:8px;background:#111;border-radius:99px;z-index:10;border:1.5px solid #333}
  .phone-screen{border-radius:34px;overflow:hidden;background:#fff;height:720px;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none}
  .phone-screen::-webkit-scrollbar{display:none}
  .device-desktop{width:780px;border-radius:12px;overflow:hidden;background:#2a2a2a;padding:10px 10px 0;box-shadow:0 0 0 1.5px #444,0 20px 50px rgba(0,0,0,.3);scrollbar-width:none;-ms-overflow-style:none}
  .device-desktop::-webkit-scrollbar{display:none}
  .desktop-bar{height:28px;display:flex;align-items:center;gap:.45rem;padding:0 .7rem;margin-bottom:8px}
  .desktop-dot{width:9px;height:9px;border-radius:50%}
  .desktop-url{flex:1;background:rgba(255,255,255,.08);border-radius:4px;height:16px;display:flex;align-items:center;padding:0 .5rem}
  .desktop-url span{font-size:.5rem;color:rgba(255,255,255,.4);font-family:'Space Mono',monospace}
  .desktop-screen{border-radius:6px 6px 0 0;overflow:hidden;height:540px;overflow-y:auto;background:#fff;scrollbar-width:none;-ms-overflow-style:none}
  .desktop-screen::-webkit-scrollbar{display:none}
  .export-grid{display:grid;grid-template-columns:1fr 1fr;gap:.85rem}
  .exp-card{background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius);padding:1.25rem;cursor:pointer;transition:all .25s cubic-bezier(.4,0,.2,1);text-align:center;position:relative}
  .exp-card:hover{border-color:var(--accent);transform:translateY(-6px);background:#f0eeff;box-shadow:0 12px 32px rgba(91,79,255,.15)}
  .exp-card::after{content:'';position:absolute;inset:-1px;background:radial-gradient(circle at top right,rgba(91,79,255,.08),transparent 70%);border-radius:var(--radius);opacity:0;transition:opacity .25s;pointer-events:none}
  .exp-card:hover::after{opacity:1}
  .exp-icon{font-size:1.7rem;margin-bottom:.55rem;transition:transform .3s}
  .exp-card:hover .exp-icon{transform:scale(1.15)}
  .exp-card h3{font-size:.88rem;font-weight:700;margin-bottom:.25rem;font-family:'Syne',sans-serif;color:var(--ink)}
  .exp-card p{font-size:.75rem;color:var(--muted);line-height:1.4}
  .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(4px)}
  .modal-bg.open{display:flex}
  .modal{background:#fff;border-radius:20px;padding:2rem;width:520px;max-width:90vw;box-shadow:0 30px 80px rgba(0,0,0,.25)}
  .modal h2{font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:800;margin-bottom:.4rem}
  .modal p{font-size:.82rem;color:var(--muted);margin-bottom:1.25rem;line-height:1.5}
  .modal-step{display:flex;align-items:flex-start;gap:.75rem;background:var(--surface);border-radius:10px;padding:.85rem 1rem;margin-bottom:.6rem}
  .modal-step-num{width:22px;height:22px;border-radius:50%;background:var(--accent);color:#fff;font-size:.65rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:'Space Mono',monospace;margin-top:.05rem}
  .modal-step-info strong{font-size:.82rem;font-weight:700;display:block}
  .modal-step-info span{font-size:.75rem;color:var(--muted)}
  .modal-divider{text-align:center;font-size:.75rem;color:var(--muted);margin:.75rem 0;font-weight:600}
  .modal-code{background:#0f172a;color:#94a3b8;padding:1rem 1.1rem;border-radius:9px;font-size:.78rem;font-family:'Space Mono',monospace;word-break:break-all;line-height:1.6;margin-bottom:1rem;cursor:pointer;transition:background .2s}
  .modal-code:hover{background:#1e293b}
  .modal-btns{display:flex;gap:.65rem;margin-bottom:1rem}
  .modal-dismiss{text-align:center;font-size:.78rem;color:var(--muted);cursor:pointer;text-decoration:underline}

  .preview-modal-overlay{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.3);
    backdrop-filter:blur(12px);
    -webkit-backdrop-filter:blur(12px);
    z-index:100;
    display:flex;
    align-items:center;
    justify-content:center;
    opacity:0;
    pointer-events:none;
    transition:opacity .3s cubic-bezier(.4,0,.2,1);
    padding:1rem;
  }

  .preview-modal-overlay.active{
    opacity:1;
    pointer-events:auto;
  }

  .preview-modal-box{
    background:rgba(255,255,255,.95);
    backdrop-filter:blur(20px);
    -webkit-backdrop-filter:blur(20px);
    border:1px solid rgba(255,255,255,.3);
    border-radius:24px;
    box-shadow:0 25px 50px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.6);
    width:90vw;
    max-width:1100px;
    height:85vh;
    max-height:800px;
    display:flex;
    flex-direction:column;
    overflow:hidden;
    transform:scale(.92);
    transition:transform .3s cubic-bezier(.4,0,.2,1);
  }

  .preview-modal-overlay.active .preview-modal-box{
    transform:scale(1);
  }

  .preview-modal-header{
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:1.5rem 2rem;
    border-bottom:1px solid rgba(0,0,0,.08);
    background:linear-gradient(180deg,rgba(255,255,255,.7),rgba(255,255,255,.5));
  }

  .preview-modal-title{
    display:flex;
    flex-direction:column;
    gap:.25rem;
  }

  .preview-modal-title h3{
    font-family:'Syne',sans-serif;
    font-size:1.2rem;
    font-weight:800;
    color:#0e0e14;
    letter-spacing:-.01em;
  }

  .preview-modal-title h3 span{
    color:#5b4fff;
    text-transform:capitalize;
  }

  .preview-modal-title p{
    font-size:.82rem;
    color:#8888a0;
    line-height:1.4;
  }

  .preview-modal-close{
    background:rgba(239,68,68,.1);
    border:1px solid rgba(239,68,68,.2);
    border-radius:10px;
    padding:.6rem;
    cursor:pointer;
    transition:all .2s;
    color:#6b7280;
    flex-shrink:0;
    display:flex;
    align-items:center;
    justify-content:center;
    width:40px;
    height:40px;
  }

  .preview-modal-close:hover{
    background:rgba(239,68,68,.15);
    border-color:rgba(239,68,68,.4);
    color:#ef4444;
  }

  .preview-modal-content{
    flex:1;
    overflow:hidden;
    background:#f5f4f1;
    position:relative;
  }

  .preview-modal-content iframe{
    width:100%;
    height:100%;
    border:none;
    scrollbar-width:none;
    -ms-overflow-style:none;
  }

  .preview-modal-content iframe::-webkit-scrollbar{
    display:none;
  }

  .toast{
    position:fixed;
    bottom:-100px;
    left:50%;
    transform:translateX(-50%);
    background:#1a1a1a;
    color:#fff;
    padding:.8rem 1.4rem;
    border-radius:99px;
    font-size:.85rem;
    font-weight:600;
    z-index:200;
    transition:bottom .3s cubic-bezier(.4,0,.2,1);
    box-shadow:0 12px 32px rgba(0,0,0,.25);
    display:flex;
    align-items:center;
    gap:.5rem;
  }

  .toast.show{
    bottom:2rem;
  }

  @media(max-width:860px){
    .app{grid-template-columns:1fr}
    .sidebar{display:none}
    .tpl-grid{grid-template-columns:1fr}
    .pal-grid{grid-template-columns:1fr 1fr}
    .feat-grid{grid-template-columns:1fr}
    .export-grid{grid-template-columns:1fr}
    .device-phone{width:100%}
    .device-desktop{width:100%}
    .preview-modal-box{width:95vw;height:90vh;max-width:none;max-height:none}
  }
`;

export default function XbillPortalWizard() {
  const [S, setS] = useState<State>({
    step: 1,
    tpl: 'spotlight',
    shape: '16px',
    size: 'compact',
    palette: 0,
    name: 'Vertex WiFi',
    tag: 'Fast, affordable internet for everyone.',
    loc: 'Nairobi CBD',
    emoji: '📡',
    phone: '+254 700 123 456',
    font: 'Syne',
    showSB: true,
    sbMsg: '✅ Internet is live and fast right now',
    pkgs: [
      { n: '1 Hour', d: '60 min', s: '10 Mbps', p: 20, star: false },
      { n: '6 Hours', d: '6 hrs', s: 'Unlimited', p: 80, star: true },
      { n: 'Daily', d: '24 hrs', s: 'Unlimited', p: 150, star: false },
      { n: 'Weekly', d: '7 days', s: 'Unlimited', p: 500, star: false },
    ],
    feats: {
      mpesa: true,
      card: false,
      sms: true,
      login: true,
      countdown: true,
      voucher: false,
      loyalty: false,
      referral: false,
      announcement: false,
      customFooter: false,
      shareButton: false,
      termsCheck: false,
    },
    vouchers: [
      { prefix: 'VX1H', dur: '1 Hour', val: 20 },
      { prefix: 'VX6H', dur: '6 Hours', val: 80 },
    ],
    loyaltyRate: 1,
    loyaltyValue: 0.5,
    loyaltyMin: 100,
    loyaltyName: 'Stars',
    loyaltyIcon: '⭐',
    refReward: 20,
    refDiscount: 10,
    refMax: 10,
    annMsg: '🎉 Weekend Special: Buy any package today and get DOUBLE data. Offer ends midnight!',
    annStyle: 'promo',
    annPos: 'top',
    footerTxt: 'Terms & Privacy · Vertex WiFi © 2025',
    footerLinkLabel: 'View Terms',
    footerLinkUrl: 'https://example.com/terms',
    devMode: 'phone',
  });

  const [toastMsg, setToastMsg] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activePreview, setActivePreview] = useState<'spotlight' | 'dashboard' | 'stories' | null>(null);
  
  const iframeRefs = useRef<{
    spotlight: HTMLIFrameElement | null;
    dashboard: HTMLIFrameElement | null;
    stories: HTMLIFrameElement | null;
  }>({
    spotlight: null,
    dashboard: null,
    stories: null,
  });

  const router = useRouter();

  const toast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3200);
  };

  const updateState = (updates: Partial<State>) => {
    setS(prev => ({ ...prev, ...updates }));
  };

  const broadcastPaletteUpdate = (paletteIdx: number) => {
    const palette = PALETTE_TOKENS[paletteIdx];
    const iframeIds: Array<'spotlight' | 'dashboard' | 'stories'> = ['spotlight', 'dashboard', 'stories'];
    
    iframeIds.forEach((id) => {
      const frame = iframeRefs.current[id];
      if (frame?.contentWindow) {
        frame.contentWindow.postMessage({
          type: 'UPDATE_PALETTE',
          colors: palette,
        }, '*');
      }
    });
  };

  const broadcastBrandNameUpdate = (brandName: string) => {
    const iframeIds: Array<'spotlight' | 'dashboard' | 'stories'> = ['spotlight', 'dashboard', 'stories'];
    
    iframeIds.forEach((id) => {
      const frame = iframeRefs.current[id];
      if (frame?.contentWindow) {
        frame.contentWindow.postMessage({
          type: 'UPDATE_BRAND_NAME',
          name: brandName,
        }, '*');
      }
    });
  };

  const broadcastTypographyUpdate = (fontFamily: string) => {
    const iframeIds: Array<'spotlight' | 'dashboard' | 'stories'> = ['spotlight', 'dashboard', 'stories'];
    
    iframeIds.forEach((id) => {
      const frame = iframeRefs.current[id];
      if (frame?.contentWindow) {
        frame.contentWindow.postMessage({
          type: 'UPDATE_TYPOGRAPHY',
          font: fontFamily,
        }, '*');
      }
    });
  };

  const broadcastCardStyleUpdate = (cardRadius: string, cardSize: string) => {
    const iframeIds: Array<'spotlight' | 'dashboard' | 'stories'> = ['spotlight', 'dashboard', 'stories'];
    
    iframeIds.forEach((id) => {
      const frame = iframeRefs.current[id];
      if (frame?.contentWindow) {
        frame.contentWindow.postMessage({
          type: 'UPDATE_CARD_STYLE',
          radius: cardRadius,
          size: cardSize,
        }, '*');
      }
    });
  };

  const handlePaletteSelect = (paletteIdx: number) => {
    updateState({ palette: paletteIdx });
    broadcastPaletteUpdate(paletteIdx);
  };

  const handleNameChange = (newName: string) => {
    updateState({ name: newName });
    broadcastBrandNameUpdate(newName);
  };

  const handleFontChange = (newFont: string) => {
    updateState({ font: newFont });
    broadcastTypographyUpdate(newFont);
  };

  const handleShapeChange = (newShape: string) => {
    updateState({ shape: newShape });
    broadcastCardStyleUpdate(newShape, S.size);
  };

  const handleSizeChange = (newSize: 'compact' | 'comfortable' | 'large') => {
    updateState({ size: newSize });
    broadcastCardStyleUpdate(S.shape, newSize);
  };

  const rgba = (hex: string, a: number): string => {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (h.length !== 6) return `rgba(128,128,128,${a})`;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  };

  const goto = (n: number) => {
    if (n < 1 || n > 5) return;
    updateState({ step: n });
  };

  const toggleFeat = (k: keyof Features, v: boolean) => {
    const newFeats = { ...S.feats, [k]: v };
    updateState({ feats: newFeats });
  };

  const addPkg = () => {
    updateState({ pkgs: [...S.pkgs, { n: 'New Plan', d: '1 hr', s: '10 Mbps', p: 50, star: false }] });
  };

  const removePkg = (i: number) => {
    if (S.pkgs.length <= 1) {
      toast('Need at least 1 package');
      return;
    }
    updateState({ pkgs: S.pkgs.filter((_, idx) => idx !== i) });
  };

  const toggleStar = (i: number) => {
    const newPkgs = [...S.pkgs];
    newPkgs[i].star = !newPkgs[i].star;
    updateState({ pkgs: newPkgs });
  };

  const updatePkg = (i: number, field: keyof Package, value: any) => {
    const newPkgs = [...S.pkgs];
    newPkgs[i] = { ...newPkgs[i], [field]: value };
    updateState({ pkgs: newPkgs });
  };

  // ============ BUILD PREVIEW URL FUNCTION ============
  const buildPreviewUrl = (template: string): string => {
    const params = new URLSearchParams({
      name: S.name,
      tag: S.tag,
      emoji: S.emoji,
      loc: S.loc,
      phone: S.phone,
      font: S.font,
      palette: S.palette.toString(),
      shape: S.shape,
      size: S.size,
      packages: encodeURIComponent(JSON.stringify(S.pkgs)),
      showSB: S.showSB.toString(),
      sbMsg: S.sbMsg,
    });
    return `http://localhost:8000/api/v1/portal-previews/${template}?${params.toString()}`;
  };
  // ============ END BUILD PREVIEW URL ============

  // ============ NEW RENDER PREVIEW FUNCTION ============
  const renderPreview = (): React.ReactNode => {
    if (S.devMode === 'phone') {
      return (
        <div className="device-phone">
          <div className="phone-screen">
            <iframe 
              key={`phone-${S.tpl}-${S.palette}-${S.font}-${S.name}-${S.tag}-${S.loc}-${S.emoji}-${S.size}-${S.shape}-${S.showSB}-${S.pkgs.length}`}
              src={buildPreviewUrl(S.tpl)}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              title="Mobile Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      );
    } else {
      return (
        <div className="device-desktop">
          <div className="desktop-bar">
            <div className="desktop-dot" style={{ background: '#ff5f57' }}></div>
            <div className="desktop-dot" style={{ background: '#febc2e' }}></div>
            <div className="desktop-dot" style={{ background: '#28c840' }}></div>
            <div className="desktop-url">
              <span>wibill.co.ke/portal/{S.name.toLowerCase().replace(/\s/g, '-')}</span>
            </div>
          </div>
          <div className="desktop-screen">
            <iframe 
              key={`desktop-${S.tpl}-${S.palette}-${S.font}-${S.name}-${S.tag}-${S.loc}-${S.emoji}-${S.size}-${S.shape}-${S.showSB}-${S.pkgs.length}`}
              src={buildPreviewUrl(S.tpl)}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              title="Desktop Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      );
    }
  };
  // ============ END NEW RENDER PREVIEW ============

  const downloadPortal = () => {
    toast('Portal HTML download initiated ✓');
  };

  const copyConfig = () => {
    toast('Config JSON copied ✓');
  };

  const calculateDurationHours = (durationStr: string): number => {
    const str = durationStr.toLowerCase().trim();
    const match = str.match(/(\d+)/);
    if (!match) return 1;
    
    const num = parseInt(match[1]);
    
    if (str.includes('min')) return Math.ceil(num / 60);
    if (str.includes('hr') || str.includes('hour')) return num;
    if (str.includes('day')) return num * 24;
    if (str.includes('week')) return num * 168;
    if (str.includes('month')) return num * 720;
    
    return num;
  };

  const saveAndLaunch = async () => {
    try {
      toast('💾 Saving portal configuration...');

      const token = localStorage.getItem('wb_token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const portalConfig = {
        template_id: S.tpl,
        palette_index: S.palette,
        font_family: S.font,
        card_radius: S.shape,
        layout_size: S.size,
        name: S.name,
        tagline: S.tag,
        location: S.loc,
        emoji: S.emoji,
        support_phone: S.phone,
        show_status_banner: S.showSB,
        status_message: S.sbMsg,
        enabled_features: {
          mpesa_stk: S.feats.mpesa,
          card_payments: S.feats.card,
          vouchers: S.feats.voucher,
          sms_receipts: S.feats.sms,
        },
      };

      console.log('📤 POST /api/tenants/portal-config with payload:', portalConfig);

      const configResponse = await fetch(`${apiBase}/api/portal-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(portalConfig),
      });

      if (!configResponse.ok) {
        const errData = await configResponse.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errData.detail || `Portal config save failed (${configResponse.status})`);
      }

      const configResult = await configResponse.json();
      console.log('✅ Portal config saved:', configResult);

      let packagesCreated = 0;
      let packagesFailed = 0;

      for (const p of S.pkgs) {
        const durationHours = calculateDurationHours(p.d);
        
        console.log(`📦 Creating package: "${p.n}" (${durationHours}h at Ksh${p.p})`);

        const pkgResponse = await fetch(`${apiBase}/api/packages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: p.n,
            price_ksh: parseFloat(p.p.toString()),
            duration_hours: durationHours,
            duration_label: p.d,
            max_devices: 1,
            display_order: packagesCreated,
          }),
        });

        if (!pkgResponse.ok) {
          const errData = await pkgResponse.json().catch(() => ({ detail: 'Unknown error' }));
          console.error(`⚠️ Package "${p.n}" failed:`, errData);
          packagesFailed++;
        } else {
          const pkgResult = await pkgResponse.json();
          console.log(`✅ Package "${p.n}" created (ID: ${pkgResult.id})`);
          packagesCreated++;
        }
      }

      console.log(`📊 Package summary: ${packagesCreated}/${S.pkgs.length} created`);

      sessionStorage.setItem('onboarding_done', 'true');
      
      if (packagesCreated > 0) {
        toast(`🚀 Portal live! ${packagesCreated} packages created. Redirecting...`);
      } else {
        toast(`⚠️ Portal config saved but no packages created. Redirecting...`);
      }
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err: any) {
      console.error('❌ Launch failed:', err);
      toast('❌ ' + (err.message || 'Something went wrong'));
    }
  };

  const pct = Math.round((S.step / 5) * 100);
  const stepMeta = STEP_META[S.step] || { t: '', s: '' };

  const templates = [
    { 
      id: 'spotlight' as const, 
      label: 'Spotlight Dark',
      personality: 'Premium • Hero Focused',
      sub: 'Hero header · Premium feel' 
    },
    { 
      id: 'dashboard' as const, 
      label: 'Dashboard Light',
      personality: 'Business • Structured',
      sub: 'Sidebar nav · Organized' 
    },
    { 
      id: 'stories' as const, 
      label: 'Stories Flow',
      personality: 'Mobile First • Engagement',
      sub: 'Horizontal cards · Mobile-first' 
    },
  ];

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: CSS_STYLES }} />
      
      <div className="app">
        <aside className="sidebar">
          <div className="xbill-logo">
            <div className="xbill-logo-mark">W</div>
            <div>
              <div className="xbill-logo-text">WiBill</div>
              <div className="xbill-logo-sub">Portal Wizard</div>
            </div>
          </div>
          <div className="steps">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step}>
                <div
                  className={`step ${S.step === step ? 'active' : ''} ${S.step > step ? 'done' : ''}`}
                  onClick={() => goto(step)}
                >
                  <div className="snum">{S.step > step ? '✓' : step}</div>
                  <div className="sinfo">
                    <span className="slabel">{STEP_META[step]?.t.split(' & ')[0] || ''}</span>
                    <span className="sdesc">{STEP_META[step]?.s.split(' & ')[0] || ''}</span>
                  </div>
                </div>
                {step < 5 && <div className="conn"></div>}
              </div>
            ))}
          </div>
          <div className="sidebar-footer">
            <div className="prog-label">
              Progress <span>{pct}%</span>
            </div>
            <div className="prog-track">
              <div className="prog-fill" style={{ width: `${pct}%` }}></div>
            </div>
          </div>
        </aside>

        <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <div className="topbar">
            <div>
              <div className="ttitle">{stepMeta.t}</div>
              <div className="tsub">{stepMeta.s}</div>
            </div>
            <div className="tbtns">
              {S.step > 1 && (
                <button className="btn btn-ghost" onClick={() => goto(S.step - 1)}>
                  ← Back
                </button>
              )}
              {S.step < 5 && (
                <button className="btn btn-primary" onClick={() => goto(S.step + 1)}>
                  Next →
                </button>
              )}
              {S.step === 5 && (
                <button className="btn btn-green" onClick={() => setShowModal(true)}>
                  ⬆ Share Wizard
                </button>
              )}
            </div>
          </div>

          <div className="content">
            {S.step === 1 && (
              <>
                <div className="card">
                  <div className="card-title">Portal Layout</div>
                  <div className="tpl-grid">
                    {templates.map((tpl) => (
                      <div
                        key={tpl.id}
                        className={`tpl-card ${S.tpl === tpl.id ? 'sel' : ''}`}
                        onClick={() => updateState({ tpl: tpl.id })}
                      >
                        <span className="tpl-badge">✓ Selected</span>
                        <div 
                          className="tpl-thumb"
                          style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setActivePreview(tpl.id); 
                          }}
                        >
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'transparent',
                            transition: 'background .3s',
                            zIndex: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0,
                            pointerEvents: 'none'
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.15)';
                            (e.currentTarget as HTMLElement).style.opacity = '1';
                            (e.currentTarget as HTMLElement).style.pointerEvents = 'auto';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                            (e.currentTarget as HTMLElement).style.opacity = '0';
                            (e.currentTarget as HTMLElement).style.pointerEvents = 'none';
                          }}>
                            <span style={{
                              background: '#fff',
                              color: '#000',
                              padding: '0.5rem 1rem',
                              borderRadius: '9999px',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              transition: 'all .2s',
                            }}>
                              Click to Preview
                            </span>
                          </div>
                          <iframe 
                            key={`template-${tpl.id}-${S.palette}-${S.font}-${S.name}-${S.tag}-${S.loc}-${S.emoji}-${S.pkgs.length}`}
                            src={buildPreviewUrl(tpl.id)}
                            className="w-full h-full border-none pointer-events-none" 
                            title={`${tpl.label} Preview`}
                            tabIndex={-1}
                            style={{ display: 'block', width: '100%', height: '100%' }}
                            sandbox="allow-same-origin"
                          />
                        </div>
                        <div className="tpl-label">
                          <div>
                            {tpl.label} <small>{tpl.sub}</small>
                          </div>
                          <div className="tpl-personality">
                            <div className="tpl-personality-main">◆</div>
                            <div className="tpl-personality-sub">{tpl.personality}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card" style={{ marginBottom: 0 }}>
                  <div className="card-title">Package Card Shape</div>
                  <div className="opt-row">
                    <div className="opt-label">Corner style</div>
                    <div className="opt-group">
                      {[
                        { v: '16px', l: 'Rounded' },
                        { v: '99px', l: 'Pill / Oval' },
                        { v: '6px', l: 'Sharp' },
                        { v: '0px', l: 'Square' },
                      ].map((opt) => (
                        <button
                          key={opt.v}
                          className={`opt-btn ${S.shape === opt.v ? 'on' : ''}`}
                          onClick={() => handleShapeChange(opt.v)}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="opt-row" style={{ marginBottom: 0 }}>
                    <div className="opt-label">
                      Card size<small>How big the package cards are</small>
                    </div>
                    <div className="opt-group">
                      {[
                        { v: 'compact' as const, l: 'Compact' },
                        { v: 'comfortable' as const, l: 'Comfortable' },
                        { v: 'large' as const, l: 'Large' },
                      ].map((opt) => (
                        <button
                          key={opt.v}
                          className={`opt-btn ${S.size === opt.v ? 'on' : ''}`}
                          onClick={() => handleSizeChange(opt.v)}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {S.step === 2 && (
              <>
                <div className="card">
                  <div className="card-title">ISP Identity</div>
                  <div className="field">
                    <div className="field-label">
                      Hotspot name<small>Your WiFi zone name</small>
                    </div>
                    <input
                      value={S.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. Westlands WiFi Hub"
                    />
                  </div>
                  <div className="field">
                    <div className="field-label">
                      Tagline<small>One line below the name</small>
                    </div>
                    <input
                      value={S.tag}
                      onChange={(e) => updateState({ tag: e.target.value })}
                      placeholder="e.g. Stay connected, pay less"
                    />
                  </div>
                  <div className="field">
                    <div className="field-label">
                      Location / Area<small>Shown as context</small>
                    </div>
                    <input
                      value={S.loc}
                      onChange={(e) => updateState({ loc: e.target.value })}
                      placeholder="e.g. Westlands, Nairobi"
                    />
                  </div>
                  <div className="field">
                    <div className="field-label">
                      Logo / Icon<small>Emoji or 2 initials</small>
                    </div>
                    <input
                      value={S.emoji}
                      onChange={(e) => updateState({ emoji: e.target.value })}
                      style={{ maxWidth: '90px' }}
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <div className="field-label">
                      ISP Contact<small>Support number / WhatsApp</small>
                    </div>
                    <input
                      value={S.phone}
                      onChange={(e) => updateState({ phone: e.target.value })}
                      placeholder="+254 700 000 000"
                    />
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">Color Palette</div>
                  <div className="pal-grid">
                    {PALS.map((p, i) => (
                      <div
                        key={i}
                        className={`pal ${S.palette === i ? 'sel' : ''}`}
                        onClick={() => handlePaletteSelect(i)}
                      >
                        <div className="pal-swatches">
                          {p.c.map((c, j) => (
                            <div key={j} className="pal-sw" style={{ background: c }}></div>
                          ))}
                        </div>
                        <div className="pal-name">
                          {p.n}<small>{p.s}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card" style={{ marginBottom: 0 }}>
                  <div className="card-title">Typography</div>
                  <div className="opt-row" style={{ marginBottom: 0 }}>
                    <div className="opt-label">Heading font</div>
                    <select
                      className="opt-btn on"
                      style={{ flex: 1, cursor: 'pointer', padding: '.5rem .9rem' }}
                      value={S.font}
                      onChange={(e) => handleFontChange(e.target.value)}
                    >
                      <option value="Syne">Syne — Bold & Geometric</option>
                      <option value="Cabinet Grotesk">Cabinet Grotesk — Punchy Modern</option>
                      <option value="Space Mono">Space Mono — Techy Mono</option>
                      <option value="Figtree">Figtree — Clean & Friendly</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {S.step === 3 && (
              <>
                <div className="card">
                  <div className="card-title">Internet Packages</div>
                  <div className="pkg-hdr">
                    <span>Plan Name</span>
                    <span>Duration</span>
                    <span>Speed</span>
                    <span>Price (KES)</span>
                    <span>★</span>
                    <span></span>
                  </div>
                  <div className="pkg-list">
                    {S.pkgs.map((p, i) => (
                      <div key={i} className="pkg-row">
                        <input
                          value={p.n}
                          onChange={(e) => updatePkg(i, 'n', e.target.value)}
                          placeholder="Plan name"
                        />
                        <input
                          value={p.d}
                          onChange={(e) => updatePkg(i, 'd', e.target.value)}
                          placeholder="6 hrs"
                        />
                        <input
                          value={p.s}
                          onChange={(e) => updatePkg(i, 's', e.target.value)}
                          placeholder="10 Mbps"
                        />
                        <input
                          type="number"
                          value={p.p}
                          onChange={(e) => updatePkg(i, 'p', +e.target.value)}
                          placeholder="80"
                        />
                        <button
                          className={`pkg-star ${p.star ? 'on' : ''}`}
                          onClick={() => toggleStar(i)}
                          title="Mark as popular"
                        >
                          ★
                        </button>
                        <button className="pkg-del" onClick={() => removePkg(i)}>
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <button className="add-pkg" onClick={addPkg}>
                    + Add Package
                  </button>
                </div>

                <div className="card" style={{ marginBottom: 0 }}>
                  <div className="card-title">Network Status Banner</div>
                  <div className="infobox">
                    <span>💡</span>
                    <span>Show customers whether the internet is working before they pay.</span>
                  </div>
                  <div className="opt-row">
                    <div className="opt-label">Status indicator</div>
                    <div className="opt-group">
                      <button
                        className={`opt-btn ${S.showSB ? 'on' : ''}`}
                        onClick={() => updateState({ showSB: true })}
                      >
                        Show Status
                      </button>
                      <button
                        className={`opt-btn ${!S.showSB ? 'on' : ''}`}
                        onClick={() => updateState({ showSB: false })}
                      >
                        Hide
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {S.step === 4 && (
              <>
                <div className="card">
                  <div className="card-title">Payment Methods</div>
                  <div className="feat-grid">
                    {PAY_FEATS.map((f) => (
                      <div
                        key={f.k}
                        className={`feat ${S.feats[f.k as keyof Features] ? 'on' : ''}`}
                      >
                        <div className="feat-info">
                          <div className="fn">{f.n}</div>
                          <div className="fd">{f.d}</div>
                        </div>
                        <label className="sw">
                          <input
                            type="checkbox"
                            checked={S.feats[f.k as keyof Features]}
                            onChange={(e) => toggleFeat(f.k as keyof Features, e.target.checked)}
                          />
                          <span className="sw-track"></span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card" style={{ marginBottom: 0 }}>
                  <div className="card-title">Portal Features</div>
                  <div className="feat-grid">
                    {PORTAL_FEATS.map((f) => (
                      <div
                        key={f.k}
                        className={`feat ${S.feats[f.k as keyof Features] ? 'on' : ''}`}
                      >
                        <div className="feat-info">
                          <div className="fn">{f.n}</div>
                          <div className="fd">{f.d}</div>
                        </div>
                        <label className="sw">
                          <input
                            type="checkbox"
                            checked={S.feats[f.k as keyof Features]}
                            onChange={(e) => toggleFeat(f.k as keyof Features, e.target.checked)}
                          />
                          <span className="sw-track"></span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {S.step === 5 && (
              <>
                <div className="preview-shell">
                  <div className="prev-toolbar">
                    <span>Live Preview</span>
                    <button
                      className={`dev-btn ${S.devMode === 'phone' ? 'on' : ''}`}
                      onClick={() => updateState({ devMode: 'phone' })}
                    >
                      📱 Phone
                    </button>
                    <button
                      className={`dev-btn ${S.devMode === 'desktop' ? 'on' : ''}`}
                      onClick={() => updateState({ devMode: 'desktop' })}
                    >
                      🖥 Desktop
                    </button>
                    <span className="prev-note">
                      {S.devMode === 'phone' ? '390 × 720 · mobile' : '780 × 540 · desktop'}
                    </span>
                  </div>
                  <div className="prev-stage">{renderPreview()}</div>
                </div>

                <div className="export-grid">
                  <div className="exp-card" onClick={downloadPortal}>
                    <div className="exp-icon">📥</div>
                    <h3>Download Portal HTML</h3>
                    <p>Drop directly into your MikroTik hotspot server folder</p>
                  </div>
                  <div className="exp-card" onClick={() => setShowModal(true)}>
                    <div className="exp-icon">🔗</div>
                    <h3>Share Wizard Link</h3>
                    <p>Send any ISP a link — they design their own portal in minutes</p>
                  </div>
                  <div className="exp-card" onClick={copyConfig}>
                    <div className="exp-icon">📋</div>
                    <h3>Copy Config JSON</h3>
                    <p>Use in WiBill backend for dynamic server-side rendering</p>
                  </div>
                  <div className="exp-card" onClick={saveAndLaunch}>
                    <div className="exp-icon">🚀</div>
                    <h3>Launch Portal</h3>
                    <p>Save config and deploy to your dashboard</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* GLASSMORPHISM PREVIEW MODAL */}
      <div 
        className={`preview-modal-overlay ${activePreview ? 'active' : ''}`}
        onClick={() => setActivePreview(null)}
      >
        <div 
          className="preview-modal-box"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="preview-modal-header">
            <div className="preview-modal-title">
              <h3>Live Preview: <span>{activePreview}</span></h3>
              <p>Interact with the portal exactly as your customers will see it.</p>
            </div>
            <button 
              className="preview-modal-close"
              onClick={() => setActivePreview(null)}
              aria-label="Close preview"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="preview-modal-content">
            {activePreview && (
              <iframe 
                key={`modal-${activePreview}-${S.palette}-${S.font}-${S.name}-${S.tag}-${S.loc}-${S.emoji}-${S.size}-${S.shape}-${S.showSB}-${S.pkgs.length}`}
                src={buildPreviewUrl(activePreview)}
                title={`${activePreview} preview`}
                sandbox="allow-same-origin"
              />
            )}
          </div>
        </div>
      </div>

      {/* SHARE MODAL */}
      <div className={`modal-bg ${showModal ? 'open' : ''}`} onClick={() => setShowModal(false)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h2>Share WiBill Wizard with ISPs</h2>
          <p>Any ISP can open this link, design their portal in minutes, and download a production-ready HTML file.</p>
          <div style={{ marginBottom: '1.25rem' }}>
            <div className="modal-step">
              <div className="modal-step-num">1</div>
              <div className="modal-step-info">
                <strong>Option A — Share this HTML file directly</strong>
                <span>Download and send the wizard HTML file via WhatsApp, email, or Drive.</span>
              </div>
            </div>
            <div className="modal-step">
              <div className="modal-step-num">2</div>
              <div className="modal-step-info">
                <strong>Option B — Host on GitHub Pages (free)</strong>
                <span>Upload to a GitHub repo → enable Pages → share the URL forever.</span>
              </div>
            </div>
            <div className="modal-step">
              <div className="modal-step-num">3</div>
              <div className="modal-step-info">
                <strong>Option C — WiBill Cloud (coming soon)</strong>
                <span>One click → hosted link at wibill.co.ke/wizard.</span>
              </div>
            </div>
          </div>
          <div className="modal-divider">GitHub Pages URL (after hosting)</div>
          <div className="modal-code" onClick={() => {
            navigator.clipboard.writeText('https://your-username.github.io/wibill-wizard/');
            toast('GitHub URL copied — update with your actual URL');
          }}>
            https://your-username.github.io/wibill-wizard/ ← click to copy
          </div>
          <div className="modal-btns">
            <button className="btn btn-primary" onClick={() => {
              toast('Download initiated ✓');
              setShowModal(false);
            }}>
              📥 Download Wizard File
            </button>
            <button className="btn btn-ghost" onClick={() => {
              navigator.clipboard.writeText('https://your-username.github.io/wibill-wizard/');
              toast('GitHub URL copied ✓');
            }}>
              📋 Copy GitHub URL
            </button>
            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>
              Close
            </button>
          </div>
          <div className="modal-dismiss" onClick={() => setShowModal(false)}>
            dismiss
          </div>
        </div>
      </div>

      {/* TOAST */}
      <div className={`toast ${toastMsg ? 'show' : ''}`}>
        ✓ <span>{toastMsg}</span>
      </div>
    </div>
  );
}

