'use client'

import { useState, FormEvent, useEffect, Suspense } from 'react'
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

function SignalArc({ radius, stroke, opacity, rotate }: { radius: number; stroke: string; opacity: number; rotate?: number }) {
  const size = radius * 2 + 40
  const cx = size / 2
  const cy = size / 2
  return (
    <svg width={size} height={size} style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) rotate(${rotate || 0}deg)`, opacity }}>
      <path
        d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
        fill="none"
        stroke={stroke}
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  )
}

const stats = [
  { label: 'Hotspots', value: '5' },
  { label: 'Processed', value: 'Ksh 141,700' },
  { label: 'Active Users', value: '109' },
]

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

  const formSection = (
    <>
      {/* Wordmark */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <span style={{
          fontFamily: '"Syne", sans-serif',
          fontSize: 38,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: '#E8B84B',
        }}>
          WiBill
        </span>
        <div style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 13,
          color: '#666',
          marginTop: 4,
          letterSpacing: '0.8px',
          fontWeight: 500,
        }}>
          ISP MANAGEMENT PORTAL
        </div>
      </div>

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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#030303',
      display: 'flex',
      overflow: 'hidden',
    }}>
      {/* ── LEFT: Form panel (45%) ── */}
      <div style={{
        flex: '0 0 45%', maxWidth: '45%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 40, position: 'relative',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {formSection}
        </div>
      </div>

      {/* ── RIGHT: Brand panel (55%) ── */}
      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
        background: '#030303',
      }}>
        {/* Background dot-grid mesh */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }} pointerEvents="none">
          <defs>
            <pattern id="dotgrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1" fill="rgba(232,184,75,0.3)" />
              <line x1="20" y1="20" x2="60" y2="20" stroke="rgba(232,184,75,0.06)" strokeWidth="0.5" />
              <line x1="20" y1="20" x2="20" y2="60" stroke="rgba(232,184,75,0.06)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dotgrid)" />
          {/* Extra sparse long lines */}
          <line x1="20%" y1="0" x2="80%" y2="40%" stroke="rgba(232,184,75,0.03)" strokeWidth="0.5" />
          <line x1="60%" y1="20%" x2="95%" y2="80%" stroke="rgba(34,197,94,0.03)" strokeWidth="0.5" />
        </svg>

        {/* Gradient mesh */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `
            radial-gradient(ellipse 70% 60% at 20% 30%, rgba(232,184,75,0.05) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 80% 70%, rgba(34,197,94,0.04) 0%, transparent 55%),
            radial-gradient(ellipse 60% 40% at 50% 90%, rgba(232,184,75,0.03) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
        }} />

        {/* Content container — anchored toward bottom-right */}
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: '90%', height: '90%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'flex-end', justifyContent: 'flex-end',
          padding: '0 60px 60px 0',
        }}>
          {/* Signal-wave arcs — bleeding off bottom-right corner */}
          <div style={{ position: 'relative', width: 400, height: 400, marginBottom: 20, marginRight: -60 }}>
            <SignalArc radius={60} stroke="rgba(232,184,75,0.06)" opacity={1} />
            <SignalArc radius={90} stroke="rgba(232,184,75,0.1)" opacity={1} />
            <SignalArc radius={120} stroke="rgba(232,184,75,0.15)" opacity={1} />
            <SignalArc radius={160} stroke="rgba(34,197,94,0.1)" opacity={1} rotate={180} />
            <SignalArc radius={80} stroke="rgba(34,197,94,0.06)" opacity={1} rotate={180} />
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 5, height: 5, borderRadius: '50%',
              background: '#E8B84B', opacity: 0.5,
            }} />
          </div>

          {/* Eyebrow label */}
          <div style={{
            fontFamily: '"Inter", sans-serif', fontSize: 10, fontWeight: 700,
            color: '#E8B84B', letterSpacing: '1.5px', marginBottom: 10,
            textTransform: 'uppercase',
          }}>
            Built for ISPs
          </div>

          {/* Tagline */}
          <div style={{
            fontFamily: '"Syne", sans-serif',
            fontSize: 17,
            fontWeight: 600,
            color: '#999',
            textAlign: 'right',
            letterSpacing: '0.2px',
            maxWidth: 340,
            lineHeight: 1.5,
            marginBottom: 28,
          }}>
            Billing infrastructure for Kenyan ISPs.
          </div>

          {/* Stat chips */}
          <div style={{ display: 'flex', gap: 14 }}>
            {stats.map((s, i) => (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '8px 14px', borderRadius: 8,
                border: '0.5px solid rgba(232,184,75,0.1)',
                background: 'rgba(255,255,255,0.015)',
              }}>
                <span style={{
                  fontFamily: '"DM Mono", monospace', fontSize: 10, fontWeight: 600,
                  color: '#E8B84B',
                }}>{s.value}</span>
                <span style={{
                  fontFamily: '"Inter", sans-serif', fontSize: 9, fontWeight: 500,
                  color: '#555', marginTop: 2, textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MOBILE FALLBACK (<768px): single centered form ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'none', /* hidden by default, shown via media query */
        background: '#030303', overflow: 'auto',
      }} className="login-mobile-fallback">
        <style>{`
          @media (max-width: 767px) {
            .login-mobile-fallback { display: flex !important; align-items: center; justify-content: center; padding: 40px 20px; }
          }
        `}</style>
        <div style={{ width: '100%', maxWidth: 420 }}>
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
