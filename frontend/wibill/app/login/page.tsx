'use client'

import { useState, FormEvent, useEffect, Suspense, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const inp: React.CSSProperties = {
  width: '100%',
  background: '#0a0a0a',
  border: '0.5px solid #1e1e1e',
  borderRadius: 9,
  padding: '13px 16px',
  color: '#f0f0f0',
  fontFamily: 'DM Mono, monospace',
  fontSize: 13,
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
}
const inpFocus: React.CSSProperties = {
  ...inp,
  borderColor: '#E8B84B',
  boxShadow: '0 0 0 3px rgba(232,184,75,0.12)',
}
const lbl: React.CSSProperties = {
  fontSize: 10,
  color: '#777',
  fontWeight: 700,
  letterSpacing: '0.6px',
  marginBottom: 6,
  display: 'block',
  textTransform: 'uppercase',
}

const stats = [
  { label: 'Hotspots', value: '5' },
  { label: 'Processed', value: 'Ksh 141,700' },
  { label: 'Active Users', value: '109' },
]

// ── 3D hover glass card CSS ──
const cardCSS = `
  #gcard{background:linear-gradient(135deg,rgba(16,16,16,0.94),rgba(28,28,28,0.82));border:.5px solid rgba(232,184,75,0.12);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-radius:16px;position:relative;transition:transform .12s ease-out;transform-style:preserve-3d;overflow:hidden;will-change:transform}
  #gcard>.gl{position:absolute;inset:0;background:linear-gradient(135deg,rgba(232,184,75,0.05),transparent 50%);pointer-events:none;border-radius:16px;z-index:1}
  #gcard>.cl{position:absolute;height:.5px;width:60%;left:20%;background:linear-gradient(90deg,transparent,rgba(232,184,75,0.1),transparent);pointer-events:none;z-index:2}
  #gcard>.cl1{top:35%;animation:cp 4s ease-in-out infinite}
  #gcard>.cl2{top:62%;animation:cp 4s ease-in-out 2s infinite}
  @keyframes cp{0%,100%{opacity:.1;transform:scaleX(.8)}50%{opacity:.4;transform:scaleX(1)}}
  #gcard>.pt{position:absolute;width:4px;height:4px;border-radius:50%;background:rgba(232,184,75,0.4);pointer-events:none;animation:pf 5s ease-in-out infinite;z-index:2}
  #gcard>.pt2{top:20%;left:12%;animation-delay:0s}
  #gcard>.pt3{top:72%;right:15%;animation-delay:1.7s}
  #gcard>.pt4{top:42%;left:72%;animation-delay:3.3s}
  #gcard>.pt5{top:55%;left:85%;animation-delay:.8s}
  #gcard>.pt6{top:85%;left:42%;animation-delay:2.5s}
  #gcard>.pt7{top:10%;right:35%;animation-delay:4s}
  @keyframes pf{0%,100%{transform:translateY(0) scale(1);opacity:.3}50%{transform:translateY(-10px) scale(2);opacity:.7}}
  #gcard>.cc{position:relative;z-index:1;padding:28px 36px;text-align:center}
`

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [focusField, setFocusField] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [ispName, setIspName] = useState('')
  const [slug, setSlug] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPass, setRegPass] = useState('')
  const [phone, setPhone] = useState('')

  const [cardHovered, setCardHovered] = useState(false)
  const [cardTransform, setCardTransform] = useState('')
  const cardRef = useRef<HTMLDivElement>(null)

  const handleCardMove = useCallback((e: React.MouseEvent) => {
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const rotateY = (x - 0.5) * 12
    const rotateX = (0.5 - y) * 12
    setCardTransform(`rotateX(${rotateX}deg) rotateY(${rotateY}deg)`)
    if (!cardHovered) setCardHovered(true)
  }, [cardHovered])

  const handleCardLeave = useCallback(() => {
    setCardTransform('')
    setCardHovered(false)
  }, [])

  useEffect(() => {
    const token = searchParams?.get('ref') || searchParams?.get('token')
    if (token) {
      setInviteToken(token)
      setTab('signup')
    }
  }, [searchParams])

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let registerUrl = `${API}/api/auth/register`
      if (inviteToken) registerUrl += `?token=${encodeURIComponent(inviteToken)}`

      const res = await fetch(registerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isp_name: ispName,
          isp_slug: slug,
          admin_email: regEmail,
          admin_password: regPass,
          admin_phone: phone || '254700000000',
          support_phone: phone || null,
        }),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || 'Registration failed')
      }

      setError('')
      try {
        await login(regEmail, regPass)
        router.push('/dashboard')
      } catch {
        router.push(`/login?email=${encodeURIComponent(regEmail)}`)
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (name: string): React.CSSProperties =>
    focusField === name ? inpFocus : inp

  const wordmarkSection = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{
        fontFamily: '"Instrument Serif", serif',
        fontSize: 88,
        fontWeight: 400,
        letterSpacing: '-0.03em',
        color: '#EDEBE6',
        textShadow: '0 0 60px rgba(237,235,230,0.1)',
        lineHeight: 1,
      }}>
        WiBill
      </span>
      <div style={{
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: 11,
        color: '#555',
        marginTop: 6,
        letterSpacing: '2.5px',
        fontWeight: 600,
      }}>
        ISP MANAGEMENT PORTAL
      </div>
    </div>
  )

  const formSection = (
    <>

      {/* Invite banner */}
      {inviteToken && (
        <div style={{
          background: 'rgba(34,197,94,0.08)',
          border: '0.5px solid rgba(34,197,94,0.2)',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 20,
          color: '#22c55e',
          fontSize: 12,
          textAlign: 'center',
          fontFamily: '"Space Grotesk", sans-serif',
        }}>
          You have been invited. Create your account below.
        </div>
      )}

      {/* Tabs */}
      {!inviteToken && (
        <div style={{
          display: 'flex',
          background: '#080808',
          border: '0.5px solid #141414',
          borderRadius: 10,
          padding: 3,
          marginBottom: 20,
          gap: 3,
        }}>
          {(['login', 'signup'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              style={{
                flex: 1,
                padding: '9px',
                border: 'none',
                borderRadius: 7,
                cursor: 'pointer',
                background: tab === t ? '#141414' : 'transparent',
                color: tab === t ? '#E8B84B' : '#555',
                fontFamily: '"Syne", sans-serif',
                fontSize: 12,
                fontWeight: tab === t ? 700 : 500,
                letterSpacing: '0.3px',
                transition: 'all 0.2s',
              }}
            >
              {t === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>
      )}

      {/* Card */}
      <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 12, padding: 28 }}>
        {(tab === 'login' && !inviteToken) ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={lbl}>EMAIL</label>
              <input
                style={inputStyle('email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusField('email')}
                onBlur={() => setFocusField(null)}
                placeholder="admin@yourisp.co.ke"
                required
              />
            </div>
            <div>
              <label style={lbl}>PASSWORD</label>
              <input
                style={inputStyle('password')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusField('password')}
                onBlur={() => setFocusField(null)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '10px 14px', color: '#ef4444', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>
                {error}
              </div>
            )}
            <button type="submit" style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#555' : '#E8B84B',
              border: 'none',
              borderRadius: 9,
              color: '#000',
              fontFamily: '"Syne", sans-serif',
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              letterSpacing: '0.5px',
              transition: 'opacity 0.2s',
            }}>
              {loading ? 'Signing in...' : 'SIGN IN'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={lbl}>ISP NAME</label>
              <input
                style={inputStyle('ispName')}
                type="text"
                value={ispName}
                onChange={(e) => setIspName(e.target.value)}
                onFocus={() => setFocusField('ispName')}
                onBlur={() => setFocusField(null)}
                placeholder="Your ISP Name"
                required
              />
            </div>
            <div>
              <label style={lbl}>SLUG (URL-SAFE)</label>
              <input
                style={inputStyle('slug')}
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                onFocus={() => setFocusField('slug')}
                onBlur={() => setFocusField(null)}
                placeholder="my-isp"
                required
              />
            </div>
            <div>
              <label style={lbl}>ADMIN EMAIL</label>
              <input
                style={inputStyle('regEmail')}
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                onFocus={() => setFocusField('regEmail')}
                onBlur={() => setFocusField(null)}
                placeholder="admin@yourisp.co.ke"
                required
              />
            </div>
            <div>
              <label style={lbl}>PASSWORD</label>
              <input
                style={inputStyle('regPass')}
                type="password"
                value={regPass}
                onChange={(e) => setRegPass(e.target.value)}
                onFocus={() => setFocusField('regPass')}
                onBlur={() => setFocusField(null)}
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label style={lbl}>PHONE (OPTIONAL)</label>
              <input
                style={inputStyle('phone')}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onFocus={() => setFocusField('phone')}
                onBlur={() => setFocusField(null)}
                placeholder="+254..."
              />
            </div>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '10px 14px', color: '#ef4444', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>
                {error}
              </div>
            )}
            <button type="submit" style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#555' : '#E8B84B',
              border: 'none',
              borderRadius: 9,
              color: '#000',
              fontFamily: '"Syne", sans-serif',
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              letterSpacing: '0.5px',
              transition: 'opacity 0.2s',
            }}>
              {loading ? 'Creating...' : inviteToken ? 'LAUNCH MY DASHBOARD' : 'CREATE ACCOUNT'}
            </button>
          </form>
        )}
      </div>
    </>
  )

  const glowStyle: React.CSSProperties = cardHovered
    ? { boxShadow: '0 0 30px rgba(232,184,75,0.15), 0 0 80px rgba(232,184,75,0.06)' }
    : {}

  return (
    <div style={{
      minHeight: '100vh',
      background: '#030303',
      display: 'flex',
      overflow: 'hidden',
    }}>
      {/* ── Full-screen background image with left fade ── */}
      <img
        src="/login-bg.jpg"
        alt=""
        style={{
          position: 'fixed', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: 0.45,
        }}
      />
      <div style={{
        position: 'fixed', inset: 0,
        background: 'linear-gradient(90deg, #030303 25%, transparent 55%)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* ── LEFT: Form + wordmark panel (45%) ── */}
      <div style={{
        flex: '0 0 45%', maxWidth: '45%',
        display: 'flex', flexDirection: 'column',
        padding: '60px 40px 40px', position: 'relative', zIndex: 2,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 48 }}>
          {wordmarkSection}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 420 }}>
            {formSection}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Brand panel (55%) ── */}
      <div style={{
        flex: 1,
        position: 'relative', overflow: 'hidden',
        zIndex: 2,
      }}>
        <style>{cardCSS}</style>

        {/* Dot-grid overlay */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12 }} pointerEvents="none">
          <defs>
            <pattern id="dotgrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1" fill="rgba(232,184,75,0.3)" />
              <line x1="20" y1="20" x2="60" y2="20" stroke="rgba(232,184,75,0.05)" strokeWidth="0.5" />
              <line x1="20" y1="20" x2="20" y2="60" stroke="rgba(232,184,75,0.05)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dotgrid)" />
          <line x1="20%" y1="0" x2="80%" y2="40%" stroke="rgba(232,184,75,0.03)" strokeWidth="0.5" />
          <line x1="60%" y1="20%" x2="95%" y2="80%" stroke="rgba(34,197,94,0.03)" strokeWidth="0.5" />
        </svg>

        {/* ── 3D Glass card (bottom overlay) ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '20px 40px 36px',
          zIndex: 3,
          perspective: 800,
        }}>
          <div
            id="gcard"
            ref={cardRef}
            onMouseMove={handleCardMove}
            onMouseLeave={handleCardLeave}
            style={{ transform: cardTransform, ...glowStyle, margin: '0 auto', width: 'fit-content', maxWidth: 500 }}
          >
            <div className="gl" />
            <div className="cl cl1" /><div className="cl cl2" />
            <div className="pt pt2" /><div className="pt pt3" /><div className="pt pt4" />
            <div className="pt pt5" /><div className="pt pt6" /><div className="pt pt7" />

            <div className="cc">
              <div style={{
                fontFamily: '"Inter", sans-serif', fontSize: 10, fontWeight: 700,
                color: '#E8B84B', letterSpacing: '1.5px', marginBottom: 8,
                textTransform: 'uppercase', textAlign: 'center',
              }}>
                Built for ISPs
              </div>

              <div style={{
                fontFamily: '"Syne", sans-serif',
                fontSize: 16, fontWeight: 600,
                color: '#999',
                letterSpacing: '0.2px',
                lineHeight: 1.5,
                marginBottom: 16,
                textAlign: 'center',
              }}>
                Billing infrastructure for Kenyan ISPs.
              </div>

              <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
                {stats.map((s, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                    <span style={{
                      fontFamily: '"DM Mono", monospace', fontSize: 14, fontWeight: 600,
                      color: '#E8B84B',
                    }}>{s.value}</span>
                    <span style={{
                      fontFamily: '"Inter", sans-serif', fontSize: 9, fontWeight: 600,
                      color: '#555', textTransform: 'uppercase', letterSpacing: '0.4px',
                    }}>{s.label}</span>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: 14, paddingTop: 12,
                borderTop: '0.5px solid rgba(232,184,75,0.08)',
                fontFamily: '"Inter", sans-serif', fontSize: 9, fontWeight: 500,
                color: '#444', letterSpacing: '0.8px',
                textAlign: 'center',
              }}>
                TRUSTED · RELIABLE · KENYAN
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE FALLBACK (<768px): single centered form ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'none',
        background: '#030303', overflow: 'auto',
      }} className="login-mobile-fallback">
        <style>{`
          @media (max-width: 767px) {
            .login-mobile-fallback { display: flex !important; align-items: center; justify-content: center; padding: 40px 20px; }
          }
        `}</style>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ marginBottom: 40 }}>{wordmarkSection}</div>
          {formSection}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #E8B84B', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
