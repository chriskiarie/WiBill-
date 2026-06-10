'use client'

import { useState, FormEvent, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const inp: React.CSSProperties = {
  width: '100%', background: '#0a0a0a', border: '0.5px solid #1e1e1e',
  borderRadius: 9, padding: '13px 16px', color: '#f0f0f0',
  fontFamily: 'DM Mono, monospace', fontSize: 13, outline: 'none',
  boxSizing: 'border-box',
}
const lbl: React.CSSProperties = {
  fontSize: 11, color: '#444', fontWeight: 600,
  letterSpacing: '0.4px', marginBottom: 6, display: 'block',
}

// ── Inner component (uses useSearchParams — must be inside Suspense) ──────────
function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // If ?token= is present in URL, this is an invite link → go straight to signup
  const inviteToken = searchParams?.get('token') || ''
  const prefilledEmail = searchParams?.get('email') || searchParams?.get('username') || ''

  const [tab, setTab] = useState<'login' | 'signup'>(inviteToken ? 'signup' : 'login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Login fields
  const [email, setEmail] = useState(prefilledEmail)
  const [password, setPassword] = useState('')

  // Signup fields
  const [ispName, setIspName] = useState('')
  const [slug, setSlug] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPass, setRegPass] = useState('')
  const [phone, setPhone] = useState('')

  // If token arrives after mount (edge case), switch to signup tab
  useEffect(() => {
    if (inviteToken) setTab('signup')
  }, [inviteToken])

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const body = new URLSearchParams()
      body.append('username', email)
      body.append('password', password)
      const r = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error(d.detail || 'Login failed')
      }
      const data = await r.json()
      localStorage.setItem('wb_token', data.access_token)
      localStorage.setItem('wb_role', data.role || '')
      router.replace(data.role === 'platform_admin' ? '/admin' : '/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  // ── Register ───────────────────────────────────────────────────────────────
  const handleSignup = async (e: FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      // Append the invite token as a query param if present
      const url = inviteToken
        ? `${API}/api/auth/register?token=${encodeURIComponent(inviteToken)}`
        : `${API}/api/auth/register`

      const r = await fetch(url, {
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

      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error(d.detail || 'Registration failed')
      }

      // Registration succeeded — now log in automatically
      const loginBody = new URLSearchParams()
      loginBody.append('username', regEmail)
      loginBody.append('password', regPass)
      const lr = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: loginBody.toString(),
      })
      if (!lr.ok) {
        // Registration worked but auto-login failed — send to login tab
        setTab('login')
        setEmail(regEmail)
        setError('Account created. Please sign in.')
        return
      }
      const loginData = await lr.json()
      localStorage.setItem('wb_token', loginData.access_token)
      localStorage.setItem('wb_role', loginData.role || '')
      router.replace('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const btnStyle: React.CSSProperties = {
    width: '100%', padding: '14px',
    background: tab === 'signup' ? '#E8B84B' : '#3b82f6',
    border: 'none', borderRadius: 9,
    color: tab === 'signup' ? '#000' : '#fff',
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 13, fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    letterSpacing: '0.5px',
    transition: 'opacity 0.15s',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 32, fontWeight: 800, letterSpacing: '-1px', color: '#fff' }}>
            WiBill
          </div>
          <div style={{ fontSize: 12, color: '#2a2a2a', marginTop: 4, fontFamily: 'DM Mono, monospace' }}>
            XwB — ISP Management Portal
          </div>
          {/* Show invite badge when arriving via token */}
          {inviteToken && (
            <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E8B84B18', border: '0.5px solid #E8B84B40', borderRadius: 20, padding: '5px 14px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8B84B' }} />
              <span style={{ fontSize: 10, color: '#E8B84B', fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Invite link active
              </span>
            </div>
          )}
        </div>

        {/* Tabs — hide Sign In tab when coming from invite link */}
        {!inviteToken && (
          <div style={{ display: 'flex', background: '#0a0a0a', border: '0.5px solid #161616', borderRadius: 10, padding: 4, marginBottom: 24, gap: 4 }}>
            {(['login', 'signup'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError('') }}
                style={{
                  flex: 1, padding: '10px', border: 'none', borderRadius: 7, cursor: 'pointer',
                  background: tab === t ? '#141414' : 'transparent',
                  color: tab === t ? '#fff' : '#333',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: 12, fontWeight: tab === t ? 700 : 400,
                }}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>
        )}

        <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 12, padding: 28 }}>

          {/* ── SIGN IN ── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>EMAIL</label>
                <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@yourisp.co.ke" required autoFocus={!email} />
              </div>
              <div>
                <label style={lbl}>PASSWORD</label>
                <input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoFocus={!!email} />
              </div>
              {error && (
                <div style={{ background: '#0d0404', border: '0.5px solid #2a0a0a', borderRadius: 7, padding: '10px 14px', color: '#f87171', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>
                  {error}
                </div>
              )}
              <button type="submit" style={btnStyle} disabled={loading}>
                {loading ? 'Signing in...' : 'SIGN IN'}
              </button>
              <div style={{ textAlign: 'center', fontSize: 10, color: '#1e1e1e', fontFamily: 'DM Mono, monospace', marginTop: 4 }}>
                admin@xwbill.co.ke · admin1234
              </div>
            </form>
          )}

          {/* ── CREATE ACCOUNT ── */}
          {tab === 'signup' && (
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {inviteToken && (
                <div style={{ background: '#0a0a0a', border: '0.5px solid #1e1e1e', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#666', fontFamily: 'DM Mono, monospace', marginBottom: 2 }}>
                  Fill in your ISP details below. After submitting you'll be taken to your dashboard.
                </div>
              )}
              <div>
                <label style={lbl}>ISP NAME</label>
                <input
                  style={inp}
                  value={ispName}
                  onChange={e => {
                    setIspName(e.target.value)
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''))
                  }}
                  placeholder="Kaachonji Networks"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label style={lbl}>ISP SLUG (URL)</label>
                <input style={inp} value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="kaachonji-networks" required />
                <div style={{ fontSize: 10, color: '#1e1e1e', marginTop: 4, fontFamily: 'DM Mono, monospace' }}>
                  wi-bill.vercel.app/portal/{slug || 'your-isp'}
                </div>
              </div>
              <div>
                <label style={lbl}>EMAIL</label>
                <input style={inp} type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="admin@yourisp.co.ke" required />
              </div>
              <div>
                <label style={lbl}>PASSWORD</label>
                <input style={inp} type="password" value={regPass} onChange={e => setRegPass(e.target.value)} placeholder="min 8 characters" minLength={8} required />
              </div>
              <div>
                <label style={lbl}>PHONE <span style={{ color: '#2a2a2a', fontWeight: 400 }}>(optional)</span></label>
                <input style={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712345678" />
              </div>
              {error && (
                <div style={{ background: '#0d0404', border: '0.5px solid #2a0a0a', borderRadius: 7, padding: '10px 14px', color: '#f87171', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>
                  {error}
                </div>
              )}
              <button type="submit" style={{ ...btnStyle, marginTop: 4 }} disabled={loading || !ispName || !slug || !regEmail || !regPass}>
                {loading ? 'Setting up your ISP...' : inviteToken ? 'Launch My Dashboard' : 'Create Account'}
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 10, color: '#161616', fontFamily: 'DM Mono, monospace' }}>
          WiBill · XwB · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}

// ── Suspense wrapper (required for useSearchParams in Next.js 16) ─────────────
function LoginSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 24, height: 24, border: '1px solid #141414', borderTop: '1px solid #E8B84B', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#333', letterSpacing: '0.1em' }}>LOADING</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginInner />
    </Suspense>
  )
}