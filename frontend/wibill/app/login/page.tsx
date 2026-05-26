'use client'
import { useState, FormEvent } from 'react'
import { useAuth } from '@/lib/auth'

export default function LoginPage() {
  const { login } = useAuth()
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Login fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Signup fields
  const [ispName, setIspName] = useState('')
  const [slug, setSlug] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPass, setRegPass] = useState('')
  const [phone, setPhone] = useState('')

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try { await login(email, password) }
    catch (err: any) { setError(err.message || 'Login failed') }
    finally { setLoading(false) }
  }

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${API}/api/auth/register`, {
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
      await login(regEmail, regPass)
    } catch (err: any) { setError(err.message || 'Registration failed') }
    finally { setLoading(false) }
  }

  const inp: React.CSSProperties = {
    width: '100%', background: '#0a0a0a', border: '0.5px solid #1e1e1e',
    borderRadius: 9, padding: '13px 16px', color: '#f0f0f0',
    fontFamily: 'DM Mono, monospace', fontSize: 13, outline: 'none',
  }
  const lbl: React.CSSProperties = { fontSize: 11, color: '#444', fontWeight: 600, letterSpacing: '0.4px', marginBottom: 6, display: 'block' }
  const btn: React.CSSProperties = {
    width: '100%', padding: '14px', background: '#3b82f6', border: 'none',
    borderRadius: 9, color: '#fff', fontFamily: 'Syne, sans-serif',
    fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1, letterSpacing: '0.3px',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 34, fontWeight: 800, letterSpacing: '-1px', color: '#fff' }}>WiBill</div>
          <div style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', fontSize: 14, color: '#2a2a2a', marginTop: 2 }}>XwB — ISP Management Portal</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#0a0a0a', border: '0.5px solid #161616', borderRadius: 10, padding: 4, marginBottom: 24, gap: 4 }}>
          {(['login', 'signup'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError('') }} style={{
              flex: 1, padding: '10px', border: 'none', borderRadius: 7, cursor: 'pointer',
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
              <div style={{ textAlign: 'center', fontSize: 11, color: '#222', fontFamily: 'DM Mono, monospace', marginTop: 4 }}>
                Demo: admin@xwbill.co.ke / admin1234
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>ISP NAME</label>
                <input style={inp} value={ispName} onChange={e => { setIspName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')) }} placeholder="Kaachonji Networks" required />
              </div>
              <div>
                <label style={lbl}>ISP SLUG (URL)</label>
                <input style={inp} value={slug} onChange={e => setSlug(e.target.value)} placeholder="kaachonji-networks" required />
                <div style={{ fontSize: 10, color: '#1e1e1e', marginTop: 4, fontFamily: 'DM Mono, monospace' }}>portal.honestbill.co.ke/{slug || 'your-isp'}</div>
              </div>
              <div><label style={lbl}>EMAIL</label><input style={inp} type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="admin@yourisp.co.ke" required /></div>
              <div><label style={lbl}>PASSWORD</label><input style={inp} type="password" value={regPass} onChange={e => setRegPass(e.target.value)} placeholder="min 8 characters" required /></div>
              <div><label style={lbl}>PHONE (optional)</label><input style={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712345678" /></div>
              {error && <div style={{ background: '#0d0404', border: '0.5px solid #2a0a0a', borderRadius: 7, padding: '10px 14px', color: '#f87171', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>{error}</div>}
              <button type="submit" style={{ ...btn, marginTop: 4 }}>{loading ? 'Creating account...' : 'CREATE ACCOUNT & LAUNCH'}</button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 10, color: '#161616', fontFamily: 'DM Mono, monospace' }}>
          HONESTBILL · WIBILL · XwB · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
