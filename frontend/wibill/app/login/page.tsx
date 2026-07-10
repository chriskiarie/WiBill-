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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#030303',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Radial gold glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 700,
        height: 700,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,184,75,0.04) 0%, rgba(232,184,75,0.01) 40%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <span style={{
            fontFamily: '"Syne", sans-serif',
            fontSize: 38,
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #E8B84B 0%, #22c55e 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>X</span>
            <span style={{ color: '#fff' }}>w</span>
            <span style={{
              background: 'linear-gradient(135deg, #E8B84B 0%, #22c55e 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>B</span>
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
            background: 'rgba(232,184,75,0.08)',
            border: '0.5px solid rgba(232,184,75,0.25)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20,
            color: '#E8B84B',
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
                  placeholder="&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;"
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
              <div style={{ textAlign: 'center', fontSize: 10, color: '#555', fontFamily: '"DM Mono", monospace', marginTop: 2 }}>
                Demo: admin@xwbill.co.ke / admin1234
              </div>
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
                  placeholder="&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;"
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
