"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

const STYLE_PRESETS = [
  { p: 0, n: 'Dark Indigo', f: 'Unbounded', bg:'#0c0c1a', hd:'#5b4fff', ac:'#5b4fff', cd:'rgba(255,255,255,.06)' },
  { p: 1, n: 'Sunset Orange', f: 'Bebas Neue', bg:'#fff7ed', hd:'#f97316', ac:'#f97316', cd:'#ffffff' },
  { p: 2, n: 'Sky Blue', f: 'Playfair Display', bg:'#f0f9ff', hd:'#0ea5e9', ac:'#0ea5e9', cd:'#ffffff' },
  { p: 3, n: 'Forest Green', f: 'Zilla Slab', bg:'#052e16', hd:'#16a34a', ac:'#16a34a', cd:'rgba(255,255,255,.07)' },
  { p: 4, n: 'Rose', f: 'Dancing Script', bg:'#fff1f2', hd:'#f43f5e', ac:'#f43f5e', cd:'#ffffff' },
  { p: 5, n: 'Slate', f: 'JetBrains Mono', bg:'#f8fafc', hd:'#1e293b', ac:'#1e293b', cd:'#ffffff' },
  { p: 6, n: 'Amber', f: 'Bangers', bg:'#fffbeb', hd:'#b45309', ac:'#b45309', cd:'#ffffff' },
  { p: 7, n: 'Purple', f: 'Orbitron', bg:'#faf5ff', hd:'#7c3aed', ac:'#7c3aed', cd:'#ffffff' },
];

const STEPS = [
  { t: 'Choose Layout', s: 'Pick a template for your portal' },
  { t: 'Brand', s: 'Your WiFi name and tagline' },
  { t: 'Style', s: 'Choose a palette and font' },
  { t: 'Features', s: 'Toggle portal components' },
  { t: 'Preview & Launch', s: 'See it live, then go live' },
];

const TEMPLATE_PALETTE_REC: Record<string, number> = {
  dashboard: 0, spotlight: 1, split: 5, bento: 7,
};

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
.btn{padding:10px 20px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .15s;display:flex;align-items:center;gap:8px;font-family:'Inter',sans-serif}
.btn-green{background:#22c55e;color:#000}
.btn-green:hover{background:#1da64e}

.content{padding:24px 28px;height:calc(100vh - 69px);display:flex;flex-direction:column;overflow:hidden}
.content > *{height:100%}

.card{background:#0a0a0a;border:1px solid #141414;border-radius:12px;padding:20px;margin-bottom:14px}
.card-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#666;margin-bottom:16px;display:flex;align-items:center;gap:10px}
.card-title::after{content:'';flex:1;height:1px;background:#141414}

.card-tpl{height:100%;display:flex;flex-direction:column;overflow:hidden}
.card-tpl .tpl-grid{flex:1;display:flex;align-items:center;justify-content:center;gap:20px;padding:0;min-height:0}
.tpl-card{border-radius:20px;cursor:pointer;transition:all .5s cubic-bezier(.34,1.56,.64,1);position:relative;width:170px;flex-shrink:0}
.tpl-card:hover{transform:translateY(-4px)}
.tpl-card.active{width:320px}
.tpl-card.active ~ .tpl-card{width:140px;opacity:.5;filter:blur(.5px)}
.tpl-card.active:hover{transform:none}

.tpl-phone{background:#1a1a1a;border-radius:20px;padding:8px;box-shadow:0 4px 14px rgba(0,0,0,.5),0 0 0 1px #2a2a2a;position:relative;transition:all .5s cubic-bezier(.34,1.56,.64,1)}
.tpl-card.active .tpl-phone{box-shadow:0 0 0 2px #E8B84B,0 12px 32px rgba(232,184,75,.3),0 0 60px rgba(232,184,75,.1)}
.tpl-phone::before{content:'';position:absolute;top:12px;left:50%;transform:translateX(-50%);width:50px;height:5px;background:#1a1a1a;border-radius:99px;z-index:10;border:1px solid #2a2a2a}
.tpl-phone::after{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:100%;height:18px;background:linear-gradient(180deg,rgba(255,255,255,.04),transparent);border-radius:14px 14px 0 0;pointer-events:none}
.tpl-screen{border-radius:14px;overflow:hidden;background:#000;aspect-ratio:375/812}
.tpl-screen iframe{width:100%;height:100%;border:none;pointer-events:none;display:block;overflow:hidden}
.tpl-screen iframe::-webkit-scrollbar{display:none;width:0}

.tpl-card.active .tpl-glow{position:absolute;inset:-16px;border-radius:32px;background:radial-gradient(ellipse,rgba(232,184,75,.2),transparent 70%);pointer-events:none;z-index:-1;animation:glow-pulse 2s ease-in-out infinite}
@keyframes glow-pulse{0%,100%{opacity:.6}50%{opacity:1}}
.tpl-label{text-align:center;margin-top:12px;font-size:14px;font-weight:600;color:#f0f0f0;transition:all .3s}
.tpl-card:not(.active) .tpl-label{font-size:12px;margin-top:8px}
.tpl-label small{display:block;font-size:11px;color:#666;font-weight:400;margin-top:2px}
.tpl-card:not(.active) .tpl-label small{display:none}
.tpl-check{position:absolute;top:-4px;right:-4px;width:24px;height:24px;border-radius:50%;background:#E8B84B;color:#000;font-size:11px;font-weight:700;display:none;align-items:center;justify-content:center;z-index:20;font-family:'DM Mono',monospace;box-shadow:0 2px 8px rgba(232,184,75,.4)}
.tpl-card.active .tpl-check{display:flex}

.field{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}
.field-label{font-size:12px;font-weight:600;color:#666}
.field-label small{display:block;font-size:11px;color:#555;font-weight:400}
.field input{width:100%;padding:10px 12px;border:1px solid #141414;border-radius:10px;font-size:14px;font-family:'Inter',sans-serif;color:#f0f0f0;background:#000;outline:none;transition:border .2s}
.field input:focus{border-color:#E8B84B}
.field input::placeholder{color:#444}

.brand-preview{background:var(--bg,#0c0c1a);border-radius:16px;padding:16px 14px;text-align:center;margin-bottom:16px;border:1px solid rgba(255,255,255,.08);min-height:80px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
.bp-emoji{font-size:28px;line-height:1}
.bp-name{font-family:var(--f,'Inter'),sans-serif;font-size:20px;font-weight:700;color:var(--text,#e8e6ff);letter-spacing:-.3px}
.bp-tag{font-size:12px;color:var(--dim,rgba(232,230,255,.5))}
.bp-loc{font-size:10px;color:var(--dim,rgba(232,230,255,.4));margin-top:2px}

.style-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;flex:1;align-content:center}
.style-card{border:1px solid #1a1a1a;border-radius:14px;padding:16px;cursor:pointer;transition:all .25s cubic-bezier(.34,1.56,.64,1);text-align:center;background:#050505}
.style-card:hover{border-color:rgba(255,255,255,.12);transform:translateY(-1px)}
.style-card.sel{border-color:#fff;box-shadow:0 0 16px rgba(255,255,255,.2),0 0 0 1px #fff;transform:translateY(-2px) scale(1.02)}
.sc-swatches{display:flex;gap:5px;justify-content:center;margin-bottom:10px}
.sc-dot{width:22px;height:22px;border-radius:50%;border:1px solid rgba(255,255,255,.1)}
.sc-name{font-size:12px;font-weight:600;color:#f0f0f0;margin-bottom:2px}
.sc-font{font-size:10px;color:#666;font-family:var(--f);padding:2px 8px;border-radius:4px;background:rgba(255,255,255,.04);display:inline-block}

.feat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.feat{display:flex;align-items:center;justify-content:space-between;background:#000;border:1px solid #141414;border-radius:10px;padding:10px 12px;transition:border .2s;cursor:pointer}
.feat.on{border-color:rgba(34,197,94,.3)}
.feat-info .fn{font-size:13px;font-weight:600}
.feat-info .fd{font-size:11px;color:#666;margin-top:1px}
.sw{position:relative;width:36px;height:18px;flex-shrink:0;margin-left:10px}
.sw input{opacity:0;width:0;height:0}
.sw-track{position:absolute;inset:0;background:#2a2a2a;border-radius:99px;cursor:pointer;transition:.3s}
.sw-track::before{content:'';position:absolute;width:12px;height:12px;left:3px;top:3px;border-radius:50%;background:#666;transition:.3s}
input:checked+.sw-track{background:#E8B84B}
input:checked+.sw-track::before{background:#000;transform:translateX(18px)}

.preview-layout{display:grid;grid-template-columns:1fr 1fr;gap:16px;height:100%;align-items:start}
.phone-wrap{background:#0a0a0a;border:1px solid #141414;border-radius:12px;padding:16px;display:flex;justify-content:center;align-items:center;height:100%}
.phone-frame{width:320px;border-radius:36px;background:#111;padding:10px;box-shadow:0 0 0 1px #2a2a2a,0 25px 60px rgba(0,0,0,.6);position:relative}
.phone-frame::before{content:'';position:absolute;top:16px;left:50%;transform:translateX(-50%);width:64px;height:7px;background:#111;border-radius:99px;z-index:10;border:1px solid #2a2a2a}
.phone-viewport{width:300px;height:650px;border-radius:26px;overflow:hidden;background:#000;position:relative}
.phone-scale{width:375px;height:812px;transform-origin:top left;transform:scale(0.8)}
.phone-scale iframe{width:100%;height:100%;border:none;display:block}

.summary-side{display:flex;flex-direction:column;gap:10px}
.summary-card{background:#0a0a0a;border:1px solid #141414;border-radius:12px;padding:16px}
.sc-title{font-size:10px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:.7px;margin-bottom:10px}
.sg-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid #0f0f0f}
.sg-row:last-child{border:none}
.sg-label{color:#666}
.sg-val{color:#f0f0f0;font-weight:600}

.nav-side{position:fixed;right:28px;top:50%;transform:translateY(-50%);z-index:50;display:flex;flex-direction:column;gap:10px;align-items:center}
.nav-next{width:54px;height:54px;border-radius:50%;background:#E8B84B;color:#000;border:none;cursor:pointer;font-size:22px;display:flex;align-items:center;justify-content:center;transition:all .2s;box-shadow:0 4px 16px rgba(232,184,75,.3);font-family:'Inter',sans-serif;font-weight:700}
.nav-next:hover{transform:scale(1.1);box-shadow:0 6px 24px rgba(232,184,75,.4)}
.nav-back{background:transparent;border:1px solid #141414;color:#666;cursor:pointer;border-radius:50%;width:34px;height:34px;font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .15s}
.nav-back:hover{border-color:#2a2a2a;color:#f0f0f0}

.toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#f0f0f0;padding:12px 24px;border-radius:99px;font-size:14px;font-weight:500;z-index:200;transition:all .3s;box-shadow:0 8px 24px rgba(0,0,0,.3);white-space:nowrap;border:1px solid #2a2a2a}

@media(max-width:860px){
  .app{grid-template-columns:1fr}
  .sidebar{display:none}
  .style-grid{grid-template-columns:repeat(2,1fr)}
  .feat-grid{grid-template-columns:1fr}
  .preview-layout{grid-template-columns:1fr}
  .ttitle{font-size:18px}
  .content{padding:16px}
  .card-tpl .tpl-grid{flex-wrap:wrap;gap:16px}
  .tpl-card{width:150px}
  .tpl-card.active{width:280px}
  .tpl-card.active ~ .tpl-card{width:120px}
}
`;

export default function OnboardingWizard() {
  const router = useRouter();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const force = searchParams?.get('force') === 'true';

  useEffect(() => {
    const role = localStorage.getItem('wb_role');
    const token = localStorage.getItem('wb_token');
    if (!token) { router.replace('/login'); return; }
    if (role === 'platform_admin') { router.replace('/admin'); return; }
    // One-time enforcement — skip if ?force=true (explicit re-open from Settings)
    if (!force && sessionStorage.getItem('onboarding_done') === 'true') {
      router.replace('/dashboard/wizard');
    }
  }, [router, force]);

  const [S, setS] = useState<State>({
    step: 1, tpl: 'dashboard', palette: 0, font: 'Unbounded',
    name: 'Vertex WiFi', tag: 'Fast, affordable internet for everyone.',
    loc: 'Nairobi CBD', emoji: '📡', phone: '+254 700 123 456',
    feats: { mpesa:true, voucher:false, sms:true, login:true, countdown:true,
             termsCheck:false, shareButton:false, announcement:false, customFooter:false },
  });

  const [toastMsg, setToastMsg] = useState('');

  const [launched, setLaunched] = useState(false);

  const upd = (u: Partial<State>) => setS(p => ({ ...p, ...u }));
  const toast = (m: string) => { setToastMsg(m); setTimeout(() => setToastMsg(''), 3200); };

  const prevUrl = (tpl: string) => `/${tpl}.html?palette=${S.palette}&font=${encodeURIComponent(S.font)}`;

  const goto = (n: number) => { if (n >= 1 && n <= 5) upd({ step: n }); };

  const toggleFeat = (k: keyof Features) => upd({ feats: { ...S.feats, [k]: !S.feats[k] } });

  const saveAndLaunch = async () => {
    try {
      toast('Saving portal configuration...');
      const token = localStorage.getItem('wb_token');
      if (!token) throw new Error('No auth token');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const snaps = STYLE_PRESETS.find(sp => sp.p === S.palette);
      const res = await fetch(`${apiBase}/api/portal-config`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          template_id: S.tpl,
          palette_index: S.palette,
          brand: { name: S.name, tagline: S.tag, location: S.loc, emoji: S.emoji, support_phone: S.phone, logo_url: null },
          theme: {
            primary_color: snaps?.hd || '#5b4fff',
            secondary_color: snaps?.bg || '#0c0c1a',
            accent_color: snaps?.ac || '#5b4fff',
            background_type: 'solid', background_value: snaps?.bg || '#0c0c1a',
            gradient: null, background_url: null,
            overlay_opacity: 0.4, overlay_color: '#000000',
            button_style: 'rounded', button_gradient: null,
          },
          typography: { font_family: S.font, heading_size: 36, body_size: 16, font_weight: 600, letter_spacing: 0.5, heading_case: 'normal' },
          card: { style: 'glass', radius: 16, elevation: 0, size: 'compact' },
          layout: { sections: ['hero', 'logo', 'packages', 'footer'], banner_position: 'top' },
          components: {
            hero: true, logo: true, welcome_text: true, packages: true,
            promo_banner: S.feats.announcement, countdown: false, reviews: false,
            qr_code: false, social_links: false, faq: false,
            terms: true, footer: true,
            saved_number_login: S.feats.login, session_timer: S.feats.countdown,
            terms_checkbox: S.feats.termsCheck, share_button: S.feats.shareButton,
          },
          animations: { entrance: 'fade-in', floating_logo: false, particles: false, pulse_button: false, ripple: false },
          network_awareness: { show_status_banner: false, custom_status_message: '' },
          enabled_features: { mpesa_stk: S.feats.mpesa, card_payments: false, vouchers: S.feats.voucher, sms_receipts: S.feats.sms },
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      sessionStorage.setItem('onboarding_done', 'true');
      setLaunched(true);
    } catch (err: any) { toast('❌ ' + (err.message || 'Error')); }
  };

  const sm = STEPS[S.step - 1];
  const snaps = STYLE_PRESETS.find(sp => sp.p === S.palette);
  const scale = 300 / 375;

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
                {i < 4 && <div className="sconn"></div>}
              </div>
            ))}
          </div>
          <div className="sidebar-footer">
            <div className="prog-label">Progress <span>{Math.round((S.step/5)*100)}%</span></div>
            <div className="prog-track"><div className="prog-fill" style={{ width:`${Math.round((S.step/5)*100)}%` }}></div></div>
          </div>
        </aside>

        <main style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
          <div className="topbar">
            <div></div>
            <div className="tb-center"><div className="ttitle">{sm.t}</div><div className="tsub">{sm.s}</div></div>
            <div></div>
          </div>

          <div className="content">
            {/* STEP 1: Template */}
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
              <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16, height:'100%', alignContent:'start' }}>
                <div className="card" style={{ margin:0 }}>
                  <div className="card-title">Brand Identity</div>
                  <div className="field">
                    <div className="field-label">WiFi Name</div>
                    <input value={S.name} onChange={e => upd({ name: e.target.value })} placeholder="Vertex WiFi" />
                  </div>
                  <div className="field">
                    <div className="field-label">Tagline</div>
                    <input value={S.tag} onChange={e => upd({ tag: e.target.value })} placeholder="Fast, reliable internet" />
                  </div>
                  <div className="field">
                    <div className="field-label">Location <small>Shown below the tagline</small></div>
                    <input value={S.loc} onChange={e => upd({ loc: e.target.value })} placeholder="Nairobi, Kenya" />
                  </div>
                  <div className="field">
                    <div className="field-label">Support Phone</div>
                    <input value={S.phone} onChange={e => upd({ phone: e.target.value })} placeholder="+254 700 123 456" />
                  </div>
                  <div className="field">
                    <div className="field-label">Brand Emoji</div>
                    <input value={S.emoji} onChange={e => upd({ emoji: e.target.value })} style={{ maxWidth: 80, fontSize:20, textAlign:'center' }} />
                  </div>
                </div>
                <div className="card" style={{ margin:0, display:'flex', flexDirection:'column' }}>
                  <div className="card-title">Preview</div>
                  <div className="brand-preview" style={{ background:snaps?.bg || '#0c0c1a', flex:1 }}>
                    <div className="bp-emoji">{S.emoji || '📡'}</div>
                    <div className="bp-name" style={{ fontFamily:`'${S.font}',sans-serif` }}>{S.name || 'Your WiFi'}</div>
                    <div className="bp-tag">{S.tag || 'Tagline'}</div>
                    <div className="bp-loc">{S.loc || ''}</div>
                  </div>
                  <div style={{ fontSize:10, color:'#555', textAlign:'center', padding:'8px 0 0' }}>
                    This is how your brand will appear on the portal header
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Style — merged palette + font presets */}
            {S.step === 3 && (
              <div className="card" style={{ display:'flex', flexDirection:'column', height:'100%', margin:0 }}>
                <div className="card-title">Choose a style</div>
                <p style={{ fontSize:12, color:'#666', marginBottom:14, lineHeight:1.4 }}>
                  Each preset bundles a color palette and a heading font. Pick the one that fits your brand.
                </p>
                <div className="style-grid">
                  {STYLE_PRESETS.map(sp => (
                    <div key={sp.p} className={`style-card ${S.palette === sp.p ? 'sel' : ''}`}
                      onClick={() => upd({ palette: sp.p, font: sp.f })}>
                      <div className="sc-swatches">
                        <div className="sc-dot" style={{ background:sp.bg }} />
                        <div className="sc-dot" style={{ background:sp.hd }} />
                        <div className="sc-dot" style={{ background:sp.ac }} />
                        <div className="sc-dot" style={{ background:sp.cd }} />
                      </div>
                      <div className="sc-name">{sp.n}
                        {TEMPLATE_PALETTE_REC[S.tpl] === sp.p && (
                          <span style={{ display:'block', fontSize:9, color:'#E8B84B', fontWeight:600, marginTop:2 }}>★ Recommended</span>
                        )}
                      </div>
                      <div className="sc-font" style={{ fontFamily:`'${sp.f}',sans-serif` }}>{sp.f}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: Features */}
            {S.step === 4 && (
              <div className="card" style={{ margin:0 }}>
                <div className="card-title">Features</div>
                <p style={{ fontSize:12, color:'#666', marginBottom:12, lineHeight:1.4 }}>
                  Toggle portal components. Packages are configured from your dashboard.
                </p>
                <div className="feat-grid">
                  {[
                    { k:'mpesa' as const, n:'M-Pesa STK Push', d:'Safaricom payment prompt' },
                    { k:'voucher' as const, n:'Voucher Codes', d:'Pre-paid code redemption' },
                    { k:'sms' as const, n:'SMS Receipts', d:'Text receipt after payment' },
                    { k:'login' as const, n:'Saved Number Login', d:'Return users skip re-typing' },
                    { k:'countdown' as const, n:'Session Timer', d:'Shows time remaining' },
                    { k:'termsCheck' as const, n:'Terms Checkbox', d:'Users agree before paying' },
                    { k:'shareButton' as const, n:'Share WiFi', d:'Share hotspot link' },
                    { k:'announcement' as const, n:'Announcement Banner', d:'Promos and alerts' },
                  ].map(f => (
                    <div key={f.k} className={`feat ${S.feats[f.k]?'on':''}`} onClick={() => toggleFeat(f.k)}>
                      <div className="feat-info"><div className="fn">{f.n}</div><div className="fd">{f.d}</div></div>
                      <label className="sw"><input type="checkbox" checked={S.feats[f.k]} readOnly /><span className="sw-track"></span></label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 5: Preview & Launch */}
            {S.step === 5 && (
              <div className="preview-layout">
                <div className="phone-wrap">
                  <div className="phone-frame">
                    <div className="phone-viewport">
                      <div className="phone-scale" style={{ transform:`scale(${scale})` }}>
                        <iframe key={`p-${S.tpl}-${S.palette}-${S.font}`} src={prevUrl(S.tpl)} title="Preview" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="summary-side">
                  <div className="summary-card">
                    <div className="sc-title">Portal Summary</div>
                    <div className="sg-row"><span className="sg-label">Template</span><span className="sg-val">{templates.find(t=>t.id===S.tpl)?.label}</span></div>
                    <div className="sg-row"><span className="sg-label">Style</span><span className="sg-val">{snaps?.n || 'Dark Indigo'}</span></div>
                    <div className="sg-row"><span className="sg-label">Font</span><span className="sg-val">{S.font}</span></div>
                    <div className="sg-row"><span className="sg-label">Features</span><span className="sg-val">{Object.values(S.feats).filter(Boolean).length} enabled</span></div>
                  </div>

                  <div className="summary-card" style={{ flex:1 }}>
                    {launched ? (
                      <>
                        <div className="sc-title" style={{ color:'#22c55e' }}>✓ Portal Published</div>
                        <div style={{ fontSize:13, color:'#f0f0f0', lineHeight:1.5, marginBottom:12 }}>
                          Your portal is live. You can customize it further from your dashboard.
                        </div>
                        <button className="btn btn-green" onClick={() => window.close()} style={{ width:'100%', justifyContent:'center', padding:'12px 0', fontSize:15 }}>
                          ← Return to Dashboard
                        </button>
                        <div style={{ fontSize:10, color:'#555', textAlign:'center', marginTop:8 }}>
                          This tab will close. If it doesn't, close it manually.
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="sc-title">Launch</div>
                        <div style={{ fontSize:12, color:'#666', lineHeight:1.5, marginBottom:12 }}>
                          Your portal will be published immediately with the settings above. You can always edit it later from your dashboard.
                        </div>
                        <button className="btn btn-green" onClick={saveAndLaunch} style={{ width:'100%', justifyContent:'center', padding:'12px 0', fontSize:15 }}>
                          🚀 Save & Launch Portal
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Side navigation */}
      {!launched && (
      <div className="nav-side">
        {S.step > 1 && (
          <button className="nav-back" onClick={() => goto(S.step-1)} title="Back">←</button>
        )}
        {S.step < 5 ? (
          <button className="nav-next" onClick={() => goto(S.step+1)} title="Next">→</button>
        ) : (
          <button className="nav-next" onClick={saveAndLaunch} title="Launch Portal">✓</button>
        )}
      </div>
      )}

      <div className="toast" style={{ bottom: toastMsg ? 24 : -80 }}>{toastMsg}</div>
    </div>
  );
}
