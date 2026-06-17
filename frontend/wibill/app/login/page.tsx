'use client'

import { useState, FormEvent, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteToken, setInviteToken] = useState<string | null>(null)

  // Login fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Signup fields
  const [ispName, setIspName] = useState('')
  const [slug, setSlug] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPass, setRegPass] = useState('')
  const [phone, setPhone] = useState('')

  // Extract token from URL on mount (supports both ?ref= and ?token=)
  useEffect(() => {
    const token = searchParams?.get('ref') || searchParams?.get('token')
    if (token) {
      setInviteToken(token)
      setTab('signup') // Auto-switch to signup if invite token present
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
      // Build the register URL
      let registerUrl = `${API}/api/auth/register`
      
      // If we have an invite token, add it as a query parameter
      if (inviteToken) {
        registerUrl += `?token=${encodeURIComponent(inviteToken)}`
      }

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

      // Registration successful - show success message and login
      setError('')
      
      // Auto-login with new credentials
      try {
        await login(regEmail, regPass)
        router.push('/dashboard')
      } catch (loginErr: any) {
        // If auto-login fails, redirect to login page with email pre-filled
        router.push(`/login?email=${encodeURIComponent(regEmail)}`)
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

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
  }

  const lbl: React.CSSProperties = {
    fontSize: 11,
    color: '#444',
    fontWeight: 600,
    letterSpacing: '0.4px',
    marginBottom: 6,
    display: 'block',
  }

  const btn: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    background: inviteToken ? '#10b981' : '#3b82f6',
    border: 'none',
    borderRadius: 9,
    color: '#fff',
    fontFamily: 'Syne, sans-serif',
    fontSize: 13,
    fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    letterSpacing: '0.3px',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 34, fontWeight: 700 }}>
            <span style={{ color: '#E8B84B' }}>X</span>
            <span style={{ color: '#fff' }}>w</span>
            <span style={{ color: '#E8B84B' }}>B</span>
          </span>
          <div style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', fontSize: 14, color: '#2a2a2a', marginTop: 2 }}>
            ISP Management Portal
          </div>
        </div>

        {/* Show invite status if token present */}
        {inviteToken && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '0.5px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20,
            color: '#10b981',
            fontSize: 12,
            textAlign: 'center',
          }}>
            🎉 You've been invited. Create your account below.
          </div>
        )}

        {/* Tabs - hide if invite token present */}
        {!inviteToken && (
          <div style={{ display: 'flex', background: '#0a0a0a', border: '0.5px solid #161616', borderRadius: 10, padding: 4, marginBottom: 24, gap: 4 }}>
            {(['login', 'signup'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t)
                  setError('')
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: 'none',
                  borderRadius: 7,
                  cursor: 'pointer',
                  background: tab === t ? '#141414' : 'transparent',
                  color: tab === t ? '#fff' : '#333',
                  fontFamily: 'Syne, sans-serif',
                  fontSize: 12,
                  fontWeight: tab === t ? 700 : 400,
                }}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>
        )}

        <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 12, padding: 28 }}>
          {(tab === 'login' && !inviteToken) ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>EMAIL</label>
                <input
                  style={inp}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@yourisp.co.ke"
                  required
                />
              </div>
              <div>
                <label style={lbl}>PASSWORD</label>
                <input
                  style={inp}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              {error && (
                <div style={{ background: '#0d0404', border: '0.5px solid #2a0a0a', borderRadius: 7, padding: '10px 14px', color: '#f87171', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>
                  {error}
                </div>
              )}
              <button type="submit" style={btn}>
                {loading ? 'Signing in...' : 'SIGN IN'}
              </button>
              <div style={{ textAlign: 'center', fontSize: 11, color: '#222', fontFamily: 'DM Mono, monospace', marginTop: 4 }}>
                Demo: admin@xwbill.co.ke / admin1234
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>ISP NAME</label>
                <input
                  style={inp}
                  type="text"
                  value={ispName}
                  onChange={(e) => setIspName(e.target.value)}
                  placeholder="Your ISP Name"
                  required
                />
              </div>
              <div>
                <label style={lbl}>SLUG (URL-SAFE)</label>
                <input
                  style={inp}
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="my-isp"
                  required
                />
              </div>
              <div>
                <label style={lbl}>ADMIN EMAIL</label>
                <input
                  style={inp}
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="admin@yourisp.co.ke"
                  required
                />
              </div>
              <div>
                <label style={lbl}>PASSWORD</label>
                <input
                  style={inp}
                  type="password"
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label style={lbl}>PHONE (Optional)</label>
                <input
                  style={inp}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254..."
                />
              </div>
              {error && (
                <div style={{ background: '#0d0404', border: '0.5px solid #2a0a0a', borderRadius: 7, padding: '10px 14px', color: '#f87171', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>
                  {error}
                </div>
              )}
              <button type="submit" style={btn}>
                {loading ? 'Creating...' : inviteToken ? '🚀 LAUNCH MY DASHBOARD' : 'CREATE ACCOUNT'}
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
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}