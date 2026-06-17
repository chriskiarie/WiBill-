'use client'
import { useState, useRef, useEffect } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const STEP_LABELS = ['Layout', 'Brand', 'Packages', 'Features', 'Launch']

const TEMPLATES = [
  { id: 'dashboard', label: 'Dashboard Light', sub: 'Sidebar nav · Organized', desc: 'Professional layout with sidebar navigation and clean card-based package display.' },
  { id: 'spotlight', label: 'Dashboard Dark', sub: 'Hero header · Premium feel', desc: 'Dark premium template with a hero section and full-width package cards.' },
  { id: 'stories', label: 'Minimal Flow', sub: 'Horizontal cards · Mobile-first', desc: 'Mobile-optimized horizontal card layout with minimal design.' },
]

const CARD_STYLES = [
  { value: '16px', label: 'Rounded' },
  { value: '6px', label: 'Sharp' },
  { value: '99px', label: 'Pill' },
]

const CARD_SIZES = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Standard' },
  { value: 'large', label: 'Generous' },
]

interface Package {
  name: string
  duration: string
  durationHours: number
  price: number
}

interface WizardData {
  template: string
  cardStyle: string
  cardSize: string
  brandName: string
  tagline: string
  location: string
  supportPhone: string
  packages: Package[]
  features: {
    mpesa: boolean
    vouchers: boolean
    loyalty: boolean
  }
}

const defaultData: WizardData = {
  template: 'dashboard',
  cardStyle: '16px',
  cardSize: 'comfortable',
  brandName: '',
  tagline: 'Fast, affordable internet for everyone.',
  location: '',
  supportPhone: '254700000000',
  packages: [
    { name: '1 Hour', duration: '60 min', durationHours: 1, price: 20 },
    { name: 'Daily', duration: '24 hrs', durationHours: 24, price: 100 },
  ],
  features: {
    mpesa: true,
    vouchers: false,
    loyalty: false,
  },
}

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<WizardData>(defaultData)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fadingOut, setFadingOut] = useState(false)

  const updateData = (partial: Partial<WizardData>) => setData(prev => ({ ...prev, ...partial }))

  const canAdvance = (): boolean => {
    if (step === 0) return true
    if (step === 1) return data.brandName.trim().length > 0
    if (step === 2) return data.packages.length > 0 && data.packages.every(p => p.name && p.price > 0)
    return true
  }

  const handleNext = () => {
    if (!canAdvance()) return
    if (step < 4) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 0) setStep(step - 1)
  }

  const handleLaunch = async () => {
    setSaving(true)
    setError('')
    try {
      const token = localStorage.getItem('wb_token')
      if (!token) { setError('Not authenticated'); setSaving(false); return }

      const portalConfig = {
        template_id: data.template,
        palette_index: 0,
        font_family: 'Inter',
        card_radius: data.cardStyle,
        layout_size: data.cardSize,
        name: data.brandName,
        tagline: data.tagline,
        location: data.location,
        emoji: 'globe',
        support_phone: data.supportPhone,
        show_status_banner: true,
        status_message: '',
        enabled_features: {
          mpesa_stk: data.features.mpesa,
          card_payments: false,
          vouchers: data.features.vouchers,
          sms_receipts: false,
        },
      }
      const configRes = await fetch(`${API}/api/portal-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(portalConfig),
      })
      if (!configRes.ok) { const d = await configRes.json(); throw new Error(d.detail || 'Config save failed') }

      for (let i = 0; i < data.packages.length; i++) {
        const p = data.packages[i]
        const pkgRes = await fetch(`${API}/api/packages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: p.name,
            price_ksh: p.price,
            duration_hours: p.durationHours,
            duration_label: p.duration,
            max_devices: 1,
            display_order: i,
          }),
        })
        if (!pkgRes.ok) { const d = await pkgRes.json(); throw new Error(d.detail || `Package "${p.name}" failed`) }
      }

      setFadingOut(true)
      setTimeout(onComplete, 600)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong')
      setSaving(false)
    }
  }

  const updatePkg = (i: number, field: keyof Package, val: any) => {
    const pkgs = [...data.packages]
    pkgs[i] = { ...pkgs[i], [field]: val }
    updateData({ packages: pkgs })
  }

  const addPkg = () => {
    updateData({ packages: [...data.packages, { name: '', duration: '1 hr', durationHours: 1, price: 50 }] })
  }

  const removePkg = (i: number) => {
    if (data.packages.length <= 1) return
    updateData({ packages: data.packages.filter((_, idx) => idx !== i) })
  }

  const buildPreviewUrl = (templateId: string): string => {
    const params = new URLSearchParams({
      name: data.brandName || 'Your ISP',
      tag: data.tagline,
      loc: data.location || 'Nairobi',
      phone: data.supportPhone,
      font: 'Inter',
      palette: '0',
      shape: data.cardStyle,
      size: data.cardSize,
      packages: encodeURIComponent(JSON.stringify(
        data.packages.map(p => ({ n: p.name || 'Package', d: p.duration, s: 'Unlimited', p: p.price, star: false }))
      )),
      showSB: 'true',
      sbMsg: 'Internet is live',
    })
    return `${API}/api/v1/portal-previews/${templateId}?${params.toString()}`
  }

  const S = {
    page: { background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column' as const, position: 'relative' as const, opacity: fadingOut ? 0 : 1, transition: 'opacity 0.5s ease' },
    topStrip: { height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: '0.5px solid #1A1A18', background: '#000', flexShrink: 0, position: 'fixed' as const, top: 0, left: 0, right: 0, zIndex: 100 },
    logo: { display: 'flex', alignItems: 'center', gap: 8 },
    logoMark: { width: 28, height: 28, borderRadius: 7, background: '#E8B84B', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    logoText: { fontFamily: '"Space Grotesk", sans-serif', fontSize: 16, fontWeight: 700, color: '#EDEBE6' },
    dots: { display: 'flex', alignItems: 'center', gap: 8 },
    dot: { width: 8, height: 8, borderRadius: '50%', transition: 'all 0.3s ease' },
    dotActive: { background: '#E8B84B', boxShadow: '0 0 0 3px rgba(232,184,75,0.25)' },
    dotDone: { background: '#E8B84B' },
    dotPending: { background: '#1A1A18' },
    rightArea: { display: 'flex', alignItems: 'center', gap: 16 },
    stepLabel: { fontFamily: '"DM Mono", monospace', fontSize: 12, color: '#3A3A37' },
    btnNext: { height: 36, padding: '0 20px', borderRadius: 8, background: '#E8B84B', border: 'none', color: '#3D2A06', fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
    btnBack: { height: 36, padding: '0 16px', borderRadius: 8, background: 'transparent', border: '0.5px solid #2A2A27', color: '#8C8A84', fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    content: { padding: '96px 60px 40px', flex: 1, overflow: 'auto' },
    title: { fontFamily: '"Space Grotesk", sans-serif', fontSize: 28, fontWeight: 600, color: '#EDEBE6', margin: '0 0 4px' },
    subtitle: { fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#6B6964', margin: '0 0 32px' },
    sectionLabel: { fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#8C8A84', marginBottom: 16 },
    card: { background: '#0D0D0B', border: '0.5px solid #2A2A27', borderRadius: 10, overflow: 'hidden' },
    input: { width: '100%', background: '#0a0a0a', border: '0.5px solid #1e1e1e', borderRadius: 9, padding: '13px 16px', color: '#f0f0f0', fontFamily: 'Inter, sans-serif', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const },
    label: { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.15em', color: '#555', marginBottom: 6, fontFamily: '"DM Mono", monospace' },
  }

  const dotStyle = (i: number) => {
    if (step > i) return { ...S.dot, ...S.dotDone }
    if (step === i) return { ...S.dot, ...S.dotActive }
    return { ...S.dot, ...S.dotPending }
  }

  return (
    <div style={S.page}>
      {/* ─── TOP STRIP ─── */}
      <div style={S.topStrip}>
        <div style={S.logo}>
          <div style={S.logoMark}><span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 700, color: '#3D2A06' }}>{'>'}_</span></div>
          <span style={S.logoText}>WiBill</span>
        </div>
        <div style={S.dots}>
          {STEP_LABELS.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {i > 0 && <div style={{ width: 24, height: 1, background: step >= i ? '#E8B84B' : '#1A1A18' }} />}
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={dotStyle(i)} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: step === i ? '#E8B84B' : '#3A3A37', transition: 'color 0.3s ease' }}>{label}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={S.rightArea}>
          <span style={S.stepLabel}>Step {step + 1} of 5</span>
          {step < 4 ? (
            <button style={{ ...S.btnNext, opacity: canAdvance() ? 1 : 0.35, cursor: canAdvance() ? 'pointer' : 'default' }} onClick={handleNext} disabled={!canAdvance()}>
              Next →
            </button>
          ) : null}
        </div>
      </div>

      {/* ─── CONTENT AREA ─── */}
      <div style={S.content}>
        {/* STEP 0 — CHOOSE LAYOUT */}
        {step === 0 && (
          <>
            <h1 style={S.title}>Choose your portal template</h1>
            <p style={S.subtitle}>Select the layout that matches your brand — you can customise everything next.</p>
            <div style={{ display: 'flex', gap: 16, marginBottom: 40 }}>
              {TEMPLATES.map(tpl => {
                const sel = data.template === tpl.id
                return (
                  <div key={tpl.id} onClick={() => updateData({ template: tpl.id })} style={{
                    flex: 1, minHeight: 340, background: '#0D0D0B', border: sel ? '1.5px solid #E8B84B' : '0.5px solid #2A2A27',
                    borderRadius: 10, overflow: 'hidden', cursor: 'pointer', position: 'relative', transition: 'border 0.2s ease',
                  }}>
                    <div style={{ height: 260, overflow: 'hidden', position: 'relative' }}>
                      {sel && (
                        <div style={{ position: 'absolute', top: 8, right: 8, background: '#E8B84B', color: '#3D2A06', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 12, zIndex: 10 }}>
                          ✓ Selected
                        </div>
                      )}
                      <iframe src={buildPreviewUrl(tpl.id)} style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-same-origin" title={tpl.label} />
                    </div>
                    <div style={{ padding: '14px 16px', borderTop: '1px solid #1A1A18' }}>
                      <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 600, color: '#EDEBE6', marginBottom: 2 }}>{tpl.label}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#6B6964' }}>{tpl.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={S.sectionLabel}>Package Card Style</div>
            <div style={{ display: 'flex', gap: 32, marginBottom: 40 }}>
              <div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#6B6964', marginBottom: 10 }}>Corner style</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {CARD_STYLES.map(opt => (
                    <button key={opt.value} onClick={() => updateData({ cardStyle: opt.value })} style={{
                      padding: '8px 18px', borderRadius: 20, border: data.cardStyle === opt.value ? '1px solid #E8B84B' : '0.5px solid #2A2A27',
                      background: data.cardStyle === opt.value ? 'rgba(232,184,75,0.1)' : '#0D0D0B', color: data.cardStyle === opt.value ? '#E8B84B' : '#8C8A84',
                      fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer', transition: 'all 0.2s ease',
                    }}>{opt.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#6B6964', marginBottom: 10 }}>Card size</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {CARD_SIZES.map(opt => (
                    <button key={opt.value} onClick={() => updateData({ cardSize: opt.value })} style={{
                      padding: '8px 18px', borderRadius: 20, border: data.cardSize === opt.value ? '1px solid #E8B84B' : '0.5px solid #2A2A27',
                      background: data.cardSize === opt.value ? 'rgba(232,184,75,0.1)' : '#0D0D0B', color: data.cardSize === opt.value ? '#E8B84B' : '#8C8A84',
                      fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer', transition: 'all 0.2s ease',
                    }}>{opt.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* STEP 1 — BRAND */}
        {step === 1 && (
          <>
            <h1 style={S.title}>Brand your portal</h1>
            <p style={S.subtitle}>Your hotspot name, tagline, and contact details — watch it update live on the preview.</p>
            <div style={{ display: 'flex', gap: 24, minHeight: 400 }}>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 18 }}>
                  <label style={S.label}>Hotspot Name</label>
                  <input type="text" placeholder="e.g. Kaachonji WiFi" value={data.brandName} onChange={e => updateData({ brandName: e.target.value })} style={S.input} />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label style={S.label}>Tagline</label>
                  <input type="text" placeholder="Fast, reliable internet" value={data.tagline} onChange={e => updateData({ tagline: e.target.value })} style={S.input} />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label style={S.label}>Location / Area</label>
                  <input type="text" placeholder="e.g. Nairobi CBD" value={data.location} onChange={e => updateData({ location: e.target.value })} style={S.input} />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label style={S.label}>Support Phone</label>
                  <input type="text" placeholder="254700000000" value={data.supportPhone} onChange={e => updateData({ supportPhone: e.target.value })} style={S.input} />
                </div>
              </div>
              <div style={{ flex: 1, background: '#0D0D0B', border: '0.5px solid #2A2A27', borderRadius: 10, overflow: 'hidden', minHeight: 400, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 8, left: 8, fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#3A3A37', background: '#000', padding: '4px 8px', borderRadius: 4, zIndex: 10 }}>
                  Live Preview
                </div>
                <iframe src={buildPreviewUrl(data.template)} style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-same-origin" title="Brand Preview" />
              </div>
            </div>
          </>
        )}

        {/* STEP 2 — PACKAGES */}
        {step === 2 && (
          <>
            <h1 style={S.title}>Configure your packages</h1>
            <p style={S.subtitle}>Define the internet plans your customers will buy at the hotspot.</p>
            <div style={S.card}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: 8, padding: '16px 16px 8px' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#6B6964' }}>Name</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#6B6964' }}>Duration</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#6B6964' }}>Price (KES)</span>
                <div />
              </div>
              <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.packages.map((pkg, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                    <input type="text" value={pkg.name} onChange={e => updatePkg(i, 'name', e.target.value)} placeholder="e.g. 1 Hour" style={{ background: '#0a0a0a', border: '0.5px solid #1e1e1e', borderRadius: 6, padding: '10px 12px', color: '#f0f0f0', fontFamily: 'Inter, sans-serif', fontSize: 13, outline: 'none' }} />
                    <input type="text" value={pkg.duration} onChange={e => updatePkg(i, 'duration', e.target.value)} placeholder="e.g. 60 min" style={{ background: '#0a0a0a', border: '0.5px solid #1e1e1e', borderRadius: 6, padding: '10px 12px', color: '#f0f0f0', fontFamily: 'Inter, sans-serif', fontSize: 13, outline: 'none' }} />
                    <input type="number" value={pkg.price || ''} onChange={e => updatePkg(i, 'price', parseInt(e.target.value) || 0)} placeholder="20" min={0} style={{ background: '#0a0a0a', border: '0.5px solid #1e1e1e', borderRadius: 6, padding: '10px 12px', color: '#f0f0f0', fontFamily: 'Inter, sans-serif', fontSize: 13, outline: 'none' }} />
                    <button onClick={() => removePkg(i)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16, padding: '4px 8px' }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addPkg} style={{
                width: '100%', padding: 12, background: 'transparent', border: '1px dashed #2A2A27', borderRadius: 0,
                color: '#6B6964', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                + Add another package
              </button>
            </div>
          </>
        )}

        {/* STEP 3 — FEATURES */}
        {step === 3 && (
          <>
            <h1 style={S.title}>Choose your features</h1>
            <p style={S.subtitle}>Enable the features your hotspot needs. You can change these later.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 560 }}>
              {[
                { key: 'mpesa' as const, name: 'M-Pesa Payments', desc: 'Accept payments directly via M-Pesa STK push. Your customers pay from their phone — no cash, no cards.' },
                { key: 'vouchers' as const, name: 'Voucher Codes', desc: 'Generate printable access codes that customers can redeem for internet. Great for events and resellers.' },
                { key: 'loyalty' as const, name: 'Loyalty Points', desc: 'Reward repeat customers automatically. Points earned on every purchase can be redeemed for free data.' },
              ].map(feat => {
                const enabled = data.features[feat.key]
                return (
                  <div key={feat.key} style={{ background: '#0D0D0B', border: '0.5px solid #2A2A27', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 600, color: '#EDEBE6', marginBottom: 2 }}>{feat.name}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#6B6964', lineHeight: 1.4 }}>{feat.desc}</div>
                    </div>
                    <div onClick={() => updateData({ features: { ...data.features, [feat.key]: !enabled } })} style={{
                      width: 40, height: 22, borderRadius: 11, background: enabled ? '#E8B84B' : '#2A2A27', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0, marginLeft: 20,
                    }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
                        left: enabled ? 21 : 3, transition: 'left 0.2s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 24, fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#3A3A37', lineHeight: 1.5 }}>
              MikroTik router configuration is set up separately after onboarding — you'll need your router credentials handy.
            </div>
          </>
        )}

        {/* STEP 4 — PREVIEW & LAUNCH */}
        {step === 4 && (
          <>
            <h1 style={S.title}>Preview and launch</h1>
            <p style={S.subtitle}>This is exactly what your customers will see. Ready to go live?</p>
            <div style={{ background: '#0D0D0B', border: '0.5px solid #2A2A27', borderRadius: 10, overflow: 'hidden', minHeight: 500, marginBottom: 24, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 8, left: 8, fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#3A3A37', background: '#000', padding: '4px 8px', borderRadius: 4, zIndex: 10 }}>
                Your Portal
              </div>
              <iframe src={buildPreviewUrl(data.template)} style={{ width: '100%', height: 640, border: 'none' }} sandbox="allow-same-origin" title="Portal Preview" />
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {error && <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#E5707A', flex: 1 }}>{error}</div>}
              <button onClick={handleLaunch} disabled={saving} style={{
                padding: '14px 32px', borderRadius: 8, background: saving ? '#333' : '#E8B84B', border: 'none',
                color: '#3D2A06', fontFamily: '"Space Grotesk", sans-serif', fontSize: 15, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto',
              }}>
                {saving ? 'Launching...' : 'Launch my hotspot →'}
              </button>
            </div>
          </>
        )}

        {/* BACK BUTTON */}
        {step > 0 && step < 4 && (
          <div style={{ marginTop: 24 }}>
            <button style={S.btnBack} onClick={handleBack}>← Back</button>
          </div>
        )}
      </div>
    </div>
  )
}
