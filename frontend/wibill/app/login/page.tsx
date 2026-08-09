'use client'

import { useState, FormEvent, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Eye, EyeOff, Mail, Lock, Shield, Wifi, CreditCard, Headphones, CheckCircle } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keepSignedIn, setKeepSignedIn] = useState(false)

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

  const features = [
    { icon: Wifi, label: 'Network', desc: 'Hotspot & PPPoE control' },
    { icon: CreditCard, label: 'Billing', desc: 'Invoices & payments' },
    { icon: Headphones, label: 'Support', desc: 'Tickets & activity logs' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: '#030303',
      display: 'flex',
      fontFamily: 'Inter, sans-serif',
      overflow: 'hidden',
    }}>
      {/* ═══════ LEFT: Marketing Panel ═══════ */}
      <div style={{
        flex: '1 1 55%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 56px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle background pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='52' viewBox='0 0 60 52' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 15v22L30 52 0 37V15z' fill='none' stroke='%23E8B84B' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 52px',
        }} />

        {/* Gold glow */}
        <div style={{
          position: 'absolute', top: '-200px', left: '-200px',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,184,75,0.06) 0%, transparent 65%)',
          filter: 'blur(80px)', pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Brand */}
          <div style={{ marginBottom: 48 }}>
            <div style={{
              fontFamily: '"Instrument Serif", serif',
              fontStyle: 'italic',
              fontSize: 52,
              fontWeight: 400,
              color: '#EDEBE6',
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}>
              WiBill
            </div>
          </div>

          {/* Tagline */}
          <h1 style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: 36,
            fontWeight: 700,
            color: '#f0f0f0',
            lineHeight: 1.15,
            margin: '0 0 16px 0',
            letterSpacing: '-0.02em',
          }}>
            Run your ISP<br />from one smart<br />dashboard.
          </h1>

          <p style={{
            fontSize: 14,
            color: '#666',
            lineHeight: 1.7,
            margin: '0 0 48px 0',
            maxWidth: 400,
          }}>
            Monitor clients, payments, tickets, network devices, and service delivery with a clean control center built for fast operations.
          </p>

          {/* Feature cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 48 }}>
            {features.map((f) => (
              <div key={f.label} style={{
                flex: 1,
                padding: '20px 16px',
                background: 'rgba(255,255,255,0.02)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
              }}>
                <f.icon size={18} color="#E8B84B" style={{ marginBottom: 10 }} />
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#f0f0f0',
                  marginBottom: 4,
                }}>{f.label}</div>
                <div style={{
                  fontSize: 11,
                  color: '#555',
                  lineHeight: 1.4,
                }}>{f.desc}</div>
              </div>
            ))}
          </div>

          {/* Status bar */}
          <div style={{
            display: 'flex',
            gap: 24,
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.02)',
            border: '0.5px solid rgba(255,255,255,0.05)',
            borderRadius: 8,
            width: 'fit-content',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontSize: 11, color: '#555' }}>System ready</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={12} color="#555" />
              <span style={{ fontSize: 11, color: '#555' }}>Encrypted session</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ RIGHT: Login Form ═══════ */}
      <div style={{
        flex: '1 1 45%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        position: 'relative',
      }}>
        {/* Subtle glow behind card */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,184,75,0.04) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400 }}>
          {/* Welcome badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            background: 'rgba(34,197,94,0.08)',
            border: '0.5px solid rgba(34,197,94,0.15)',
            borderRadius: 20,
            marginBottom: 20,
          }}>
            <CheckCircle size={13} color="#22c55e" />
            <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 500 }}>Welcome back</span>
          </div>

          {/* Heading */}
          <h2 style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: 28,
            fontWeight: 700,
            color: '#f0f0f0',
            margin: '0 0 8px 0',
            letterSpacing: '-0.02em',
          }}>
            {tab === 'login' ? 'Sign in to continue' : 'Create your account'}
          </h2>

          <p style={{
            fontSize: 13,
            color: '#555',
            margin: '0 0 28px 0',
            lineHeight: 1.5,
          }}>
            {tab === 'login'
              ? 'Use your administrator credentials to access the WiBill control panel.'
              : 'Set up your ISP management dashboard in minutes.'}
          </p>

          {/* Tabs */}
          {!inviteToken && (
            <div style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
              padding: 3,
              marginBottom: 24,
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
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 12,
                    fontWeight: tab === t ? 700 : 500,
                    transition: 'all 0.2s',
                  }}
                >
                  {t === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>
          )}

          {/* Invite banner */}
          {inviteToken && (
            <div style={{
              background: 'rgba(34,197,94,0.08)',
              border: '0.5px solid rgba(34,197,94,0.2)',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 24,
              color: '#22c55e',
              fontSize: 12,
              textAlign: 'center',
            }}>
              You have been invited. Create your account below.
            </div>
          )}

          {/* Card */}
          <div style={{
            background: 'rgba(10, 10, 10, 0.6)',
            backdropFilter: 'blur(24px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: 28,
          }}>
            {(tab === 'login' && !inviteToken) ? (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Email */}
                <div>
                  <label style={{ fontSize: 10, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 7 }}>
                    Email address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="#444" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@yourisp.co.ke"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 40px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '0.5px solid rgba(255,255,255,0.08)',
                        borderRadius: 10,
                        color: '#f0f0f0',
                        fontFamily: '"DM Mono", monospace',
                        fontSize: 13,
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                      }}
                      onFocus={(e) => { e.target.style.borderColor = '#E8B84B'; e.target.style.boxShadow = '0 0 0 3px rgba(232,184,75,0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label style={{ fontSize: 10, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 7 }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} color="#444" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 44px 12px 40px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '0.5px solid rgba(255,255,255,0.08)',
                        borderRadius: 10,
                        color: '#f0f0f0',
                        fontFamily: '"DM Mono", monospace',
                        fontSize: 13,
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                      }}
                      onFocus={(e) => { e.target.style.borderColor = '#E8B84B'; e.target.style.boxShadow = '0 0 0 3px rgba(232,184,75,0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: 12, top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 4, display: 'flex',
                        color: showPassword ? '#E8B84B' : '#444',
                        transition: 'color 200ms',
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Keep signed in */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#555' }}>
                    <input
                      type="checkbox"
                      checked={keepSignedIn}
                      onChange={(e) => setKeepSignedIn(e.target.checked)}
                      style={{ accentColor: '#E8B84B', width: 14, height: 14 }}
                    />
                    Keep me signed in
                  </label>
                </div>

                {/* Error */}
                {error && (
                  <div style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '0.5px solid rgba(239,68,68,0.2)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    color: '#ef4444',
                    fontSize: 12,
                    fontFamily: '"DM Mono", monospace',
                  }}>
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button type="submit" disabled={loading} style={{
                  width: '100%',
                  padding: '14px',
                  background: loading ? 'rgba(255,255,255,0.05)' : '#E8B84B',
                  border: 'none',
                  borderRadius: 10,
                  color: loading ? '#555' : '#000',
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  letterSpacing: '0.3px',
                  transition: 'background 0.2s, opacity 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}>
                  {loading ? 'Signing in...' : (
                    <>
                      <Lock size={15} />
                      Sign In
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 10, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 7 }}>ISP Name</label>
                  <input type="text" value={ispName} onChange={e => setIspName(e.target.value)} placeholder="Your ISP Name" required
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#f0f0f0', fontFamily: '"DM Mono", monospace', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 7 }}>Slug (URL-safe)</label>
                  <input type="text" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="my-isp" required
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#f0f0f0', fontFamily: '"DM Mono", monospace', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 7 }}>Admin Email</label>
                  <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="admin@yourisp.co.ke" required
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#f0f0f0', fontFamily: '"DM Mono", monospace', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 7 }}>Password</label>
                  <input type="password" value={regPass} onChange={e => setRegPass(e.target.value)} placeholder="••••••••" required
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#f0f0f0', fontFamily: '"DM Mono", monospace', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 7 }}>Phone (optional)</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254..."
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#f0f0f0', fontFamily: '"DM Mono", monospace', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 12, fontFamily: '"DM Mono", monospace' }}>
                    {error}
                  </div>
                )}
                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '14px',
                  background: loading ? 'rgba(255,255,255,0.05)' : '#E8B84B',
                  border: 'none', borderRadius: 10,
                  color: loading ? '#555' : '#000',
                  fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  {loading ? 'Creating...' : inviteToken ? 'LAUNCH MY DASHBOARD' : 'CREATE ACCOUNT'}
                </button>
              </form>
            )}
          </div>

          {/* Security note */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 20,
            padding: '10px 14px',
            background: 'rgba(34,197,94,0.04)',
            border: '0.5px solid rgba(34,197,94,0.1)',
            borderRadius: 8,
          }}>
            <Shield size={14} color="#22c55e" />
            <span style={{ fontSize: 11, color: '#555' }}>Your session is protected with secure authentication.</span>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: 24,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}>
            <span style={{
              fontSize: 10,
              color: '#333',
              padding: '3px 8px',
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.05)',
              borderRadius: 4,
              fontFamily: '"DM Mono", monospace',
            }}>
              WiBill v2.0
            </span>
          </div>
          <div style={{
            marginTop: 12,
            textAlign: 'center',
            fontSize: 11,
            color: '#333',
          }}>
            &copy; {new Date().getFullYear()} WiBill. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #E8B84B', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
