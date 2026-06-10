'use client'

import { useState, FormEvent, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const inp: React.CSSProperties = {
  width: '100%', background: '#0a0a0a', border: '0.5px solid #1e1e1e',
  borderRadius: 9, padding: '13px 16px', color: '#f0f0f0',
  fontFamily: 'DM Mono, monospace', fontSize: 13, outline: 'none',
  boxSizing: 'border-box', transition: 'border-color 0.15s',
}
const lbl: React.CSSProperties = {
  fontSize: 11, color: '#444', fontWeight: 600,
  letterSpacing: '0.4px', marginBottom: 6, display: 'block',
}

// ── Inner component ────────────────────────────────────────────────────────────
function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const inviteToken   = searchParams?.get('token') || ''
  const prefilledEmail = searchParams?.get('email') || searchParams?.get('username') || ''

  // If invite token present → start on signup. Otherwise → login.
  const [tab, setTab]         = useState<'login' | 'signup'>(inviteToken ? 'signup' : 'login')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // Login fields
  const [email, setEmail]       = useState(prefilledEmail)
  const [password, setPassword] = useState('')

  // Signup fields
  const [ispName, setIspName] = useState('')
  const [slug, setSlug]       = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPass, setRegPass]   = useState('')
  const [phone, setPhone]       = useState('')

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
      // Always append token if present — backend uses it to mark invite USED
      // and sets is_active=True (invited ISPs get instant access)
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

      const regData = await r.json()

      // ── TWO-PATH FLOW ──────────────────────────────────────────────────────
      // WITH invite token → backend sets is_active=True → log in immediately
      // WITHOUT invite token → backend sets is_active=False → show pending screen
      // ──────────────────────────────────────────────────────────────────────

      if (inviteToken) {
        // Invited ISP: auto-login and redirect to dashboard
        const loginBody = new URLSearchParams()
        loginBody.append('username', regEmail)
        loginBody.append('password', regPass)
        const lr = await fetch(`${API}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: loginBody.toString(),
        })
        if (!lr.ok) {
          // Edge case: login failed after registration — tell them to sign in
          setTab('login')
          setEmail(regEmail)
          setError('Account created. Please sign in to continue.')
          setLoading(false)
          return
        }
        const loginData = await lr.json()
        localStorage.setItem('wb_token', loginData.access_token)
        localStorage.setItem('wb_role', loginData.role || '')
        // Redirect straight to dashboard — no waiting screen
        router.replace('/dashboard')
      } else {
        // Cold signup (no invite): show pending approval message
        setError('')
        setLoading(false)
        // Replace form with pending screen
        router.replace('/login?pending=1')
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed')
      setLoading(false)
    }
  }

  // ── Pending approval screen (cold signup) ─────────────────────────────────
  const isPending = searchParams?.get('pending') === '1'
  if (isPending) {
    return (
      <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Inter, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 4 }}>WiBill</div>
          <div style={{ fontSize: 12, color: '#2a2a2a', fontFamily: 'DM Mono, monospace', marginBottom: 40 }}>XwB — ISP Management Portal</div>

          <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 12, padding: 32 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#E8B84B18', border: '0.5px solid #E8B84B40', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#E8B84B' }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', fontFamily: 'Space Grotesk, sans-serif', marginBottom: 12 }}>
              Application Received
            </div>
            <div style={{ fontSize: 13, color: '#666', lineHeight: 1.7, marginBottom: 24, fontFamily: 'DM Mono, monospace' }}>
              Your ISP account is pending review. You'll receive an email once approved and can sign in immediately after.
            </div>
            <button
              onClick={() => router.replace('/login')}
              style={{ background: 'none', border: '0.5px solid #1e1e1e', borderRadius: 8, padding: '10px 20px', color: '#444', fontSize: 12, fontFamily: 'DM Mono, monospace', cursor: 'pointer' }}
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Button style (gold for signup, blue for login) ────────────────────────
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
          {inviteToken && (
            <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E8B84B18', border: '0.5px solid #E8B84B40', borderRadius: 20, padding: '5px 14px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8B84B', boxShadow: '0 0 6px #E8B84B' }} />
              <span style={{ fontSize: 10, color: '#E8B84B', fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Invite link active
              </span>
            </div>
          )}
        </div>

        {/* Tabs — hidden when arriving from invite link */}
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
                  transition: 'all 0.15s',
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
                <input
                  style={inp} type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@yourisp.co.ke" required autoFocus={!email}
                  onFocus={e => { e.currentTarget.style.borderColor = '#E8B84B40' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#1e1e1e' }}
                />
              </div>
              <div>
                <label style={lbl}>PASSWORD</label>
                <input
                  style={inp} type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required autoFocus={!!email}
                  onFocus={e => { e.currentTarget.style.borderColor = '#E8B84B40' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#1e1e1e' }}
                />
              </div>
              {error && (
                <div style={{ background: '#0d0404', border: '0.5px solid #2a0a0a', borderRadius: 7, padding: '10px 14px', color: '#f87171', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>
                  {error}
                </div>
              )}
              <button type="submit" style={btnStyle} disabled={loading}>
                {loading ? 'Signing in...' : 'SIGN IN'}
              </button>
              <div style={{ textAlign: 'center', fontSize: 10, color: '#1e1e1e', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
                admin@xwbill.co.ke · admin1234
              </div>
            </form>
          )}

          {/* ── CREATE ACCOUNT ── */}
          {tab === 'signup' && (
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {inviteToken && (
                <div style={{ background: '#0a0a0a', border: '0.5px solid #1e1e1e', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#555', fontFamily: 'DM Mono, monospace', lineHeight: 1.5 }}>
                  Fill in your ISP details. You'll be taken straight to your dashboard after submitting.
                </div>
              )}
              <div>
                <label style={lbl}>ISP NAME</label>
                <input
                  style={inp} value={ispName} required autoFocus
                  onChange={e => {
                    setIspName(e.target.value)
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''))
                  }}
                  placeholder="Kaachonji Networks"
                  onFocus={e => { e.currentTarget.style.borderColor = '#E8B84B40' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#1e1e1e' }}
                />
              </div>
              <div>
                <label style={lbl}>ISP SLUG (URL)</label>
                <input
                  style={inp} value={slug} required
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="kaachonji-networks"
                  onFocus={e => { e.currentTarget.style.borderColor = '#E8B84B40' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#1e1e1e' }}
                />
                <div style={{ fontSize: 10, color: '#1e1e1e', marginTop: 4, fontFamily: 'DM Mono, monospace' }}>
                  portal/{slug || 'your-isp'}
                </div>
              </div>
              <div>
                <label style={lbl}>EMAIL</label>
                <input
                  style={inp} type="email" value={regEmail} required
                  onChange={e => setRegEmail(e.target.value)}
                  placeholder="admin@yourisp.co.ke"
                  onFocus={e => { e.currentTarget.style.borderColor = '#E8B84B40' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#1e1e1e' }}
                />
              </div>
              <div>
                <label style={lbl}>PASSWORD</label>
                <input
                  style={inp} type="password" value={regPass} required minLength={8}
                  onChange={e => setRegPass(e.target.value)}
                  placeholder="min 8 characters"
                  onFocus={e => { e.currentTarget.style.borderColor = '#E8B84B40' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#1e1e1e' }}
                />
              </div>
              <div>
                <label style={lbl}>PHONE <span style={{ color: '#2a2a2a', fontWeight: 400 }}>(optional)</span></label>
                <input
                  style={inp} value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0712345678"
                  onFocus={e => { e.currentTarget.style.borderColor = '#E8B84B40' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#1e1e1e' }}
                />
              </div>
              {error && (
                <div style={{ background: '#0d0404', border: '0.5px solid #2a0a0a', borderRadius: 7, padding: '10px 14px', color: '#f87171', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>
                  {error}
                </div>
              )}
              <button
                type="submit"
                style={{ ...btnStyle, marginTop: 4 }}
                disabled={loading || !ispName || !slug || !regEmail || !regPass}
              >
                {loading
                  ? (inviteToken ? 'Setting up your ISP...' : 'Creating account...')
                  : (inviteToken ? 'Launch My Dashboard →' : 'Create Account')}
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

// ── Suspense fallback ──────────────────────────────────────────────────────────
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