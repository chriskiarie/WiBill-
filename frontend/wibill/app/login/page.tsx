'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function LoginForm() {
  const { login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams?.get('token') || ''

  const [tab, setTab] = useState<'login' | 'signup'>(inviteToken ? 'signup' : 'login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [ispName, setIspName] = useState('')
  const [slug, setSlug] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPass, setRegPass] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    if (ispName) {
      setSlug(ispName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    }
  }, [ispName])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try { await login(email, password) }
    catch (err: any) { setError(err.message || 'Login failed') }
    finally { setLoading(false) }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const url = inviteToken
        ? `${API}/api/auth/register?token=${encodeURIComponent(inviteToken)}`
        : `${API}/api/auth/register`

      const res = await fetch(url, {
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
        throw new Error(typeof d.detail === 'string' ? d.detail : 'Registration failed')
      }
      router.push('/join/pending-approval')
    } catch (err: any) { setError(err.message || 'Registration failed') }
    finally { setLoading(false) }
  }

  const inp: React.CSSProperties = {
    width: '100%', background: '#0a0a0a', border: '0.5px solid #1e1e1e',
    borderRadius: 9, padding: '13px 16px', color: '#f0f0f0',
    fontFamily: 'DM Mono, monospace', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 10, color: '#555', fontFamily: 'DM Mono, monospace',
    letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' as const,
  }
  const btn: React.CSSProperties = {
    width: '100%', background: '#1a6bff', border: 'none', borderRadius: 9,
    padding: '14px', color: '#fff', fontFamily: 'Syne, sans-serif',
    fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', fontFamily: 'Syne, sans-serif' }}>WiBill</div>
          <div style={{ fontSize: 11, color: '#333', fontFamily: 'DM Mono, monospace', marginTop: 4 }}>XwB — ISP Management Portal</div>
        </div>

        <div style={{ display: 'flex', background: '#0a0a0a', border: '0.5px solid #141414', borderRadius: 10, padding: 4, marginBottom: 20 }}>
          {(['login', 'signup'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '9px', border: 'none', borderRadius: 7, cursor: 'pointer',
              background: tab === t ? '#141414' : 'transparent',
              color: tab === t ? '#fff' : '#333',
              fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: tab === t ? 700 : 400,
            }}>{t === 'login' ? 'Sign In' : 'Create Account'}</button>
          ))}
        </div>

        <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 12, padding: 28 }}>
          {tab === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={lbl}>EMAIL</label><input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@yourisp.co.ke" required /></div>
              <div><label style={lbl}>PASSWORD</label><input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required /></div>
              {error && <div style={{ background: '#0d0404', border: '0.5px solid #2a0a0a', borderRadius: 7, padding: '10px 14px', color: '#f87171', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>{error}</div>}
              <button type="submit" style={btn}>{loading ? 'Signing in...' : 'SIGN IN'}</button>
            </form>
          ) : (
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {inviteToken && <div style={{ background: '#0a1a0a', border: '0.5px solid #1a3a1a', borderRadius: 7, padding: '10px 14px', color: '#4ade80', fontSize: 11, fontFamily: 'DM Mono, monospace' }}>Invite token detected. Your account will be created immediately.</div>}
              <div><label style={lbl}>ISP NAME</label><input style={inp} value={ispName} onChange={e => setIspName(e.target.value)} placeholder="e.g. Kaachonji Networks" required /></div>
              <div><label style={lbl}>ISP SLUG (URL)</label><input style={inp} value={slug} onChange={e => setSlug(e.target.value)} placeholder="kaachonji-networks" required /><div style={{ fontSize: 10, color: '#333', marginTop: 4, fontFamily: 'DM Mono, monospace' }}>used in portal URL: /portal/{slug}</div></div>
              <div><label style={lbl}>EMAIL</label><input style={inp} type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="admin@yourisp.co.ke" required /></div>
              <div><label style={lbl}>PASSWORD</label><input style={inp} type="password" value={regPass} onChange={e => setRegPass(e.target.value)} placeholder="min 8 characters" required /></div>
              <div><label style={lbl}>PHONE (optional)</label><input style={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712345678" /></div>
              {error && <div style={{ background: '#0d0404', border: '0.5px solid #2a0a0a', borderRadius: 7, padding: '10px 14px', color: '#f87171', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>{error}</div>}
              <button type="submit" style={btn}>{loading ? 'Creating account...' : 'CREATE ACCOUNT & LAUNCH'}</button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 10, color: '#161616', fontFamily: 'DM Mono, monospace' }}>
          HonestBill · WiBill · ISP · XwB
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#fff' }}>Loading...</div></div>}>
      <LoginForm />
    </Suspense>
  )
}
