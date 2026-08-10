'use client'

import { useState, FormEvent, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Eye, EyeOff, ArrowRight, Shield, Loader2 } from 'lucide-react'

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
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #080B11 0%, #0A0E18 30%, #0D1220 60%, #080B11 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
    }}>
      {/* ── Ambient glow — anchored to center ── */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '60vw', height: '60vw', maxWidth: 700, maxHeight: 700,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(18,32,60,0.6) 0%, rgba(8,11,17,0) 65%)',
        pointerEvents: 'none',
      }} />
      {/* Gold accent glow — top-right */}
      <div style={{
        position: 'absolute', top: '-15%', right: '-10%',
        width: '50vw', height: '50vw', maxWidth: 600, maxHeight: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,184,75,0.05) 0%, transparent 55%)',
        filter: 'blur(80px)', pointerEvents: 'none',
      }} />
      {/* Gold accent glow — bottom-left */}
      <div style={{
        position: 'absolute', bottom: '-15%', left: '-10%',
        width: '45vw', height: '45vw', maxWidth: 550, maxHeight: 550,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,184,75,0.04) 0%, transparent 55%)',
        filter: 'blur(80px)', pointerEvents: 'none',
      }} />
      {/* Tech grid — higher opacity, tighter spacing */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: `linear-gradient(rgba(232,184,75,0.4) 1px, transparent 1px),
          linear-gradient(90deg, rgba(232,184,75,0.4) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />
      {/* Dot matrix overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: `radial-gradient(circle, rgba(232,184,75,0.5) 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
        pointerEvents: 'none',
      }} />

      {/* ── Floating particles (decorative dots) ── */}
      {[
        { top: '12%', left: '8%', size: 3, opacity: 0.15, delay: '0s' },
        { top: '25%', right: '15%', size: 2, opacity: 0.1, delay: '1s' },
        { bottom: '20%', left: '20%', size: 2, opacity: 0.12, delay: '2s' },
        { top: '60%', right: '8%', size: 3, opacity: 0.08, delay: '0.5s' },
        { bottom: '35%', left: '5%', size: 2, opacity: 0.1, delay: '1.5s' },
      ].map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          ...p,
          width: p.size, height: p.size, borderRadius: '50%',
          background: '#E8B84B',
          opacity: p.opacity,
          animation: `float ${4 + i}s ease-in-out infinite`,
          animationDelay: p.delay,
        }} />
      ))}

      {/* ── Main card ── */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 440,
        margin: 24,
      }}>
        {/* Brand */}
        <div style={{
          textAlign: 'center',
          marginBottom: 48,
        }}>
          {/* Logo mark — abstract "W" shape */}
          <div style={{
            width: 48, height: 48,
            margin: '0 auto 20px',
            position: 'relative',
          }}>
            <div style={{
              width: '100%', height: '100%',
              border: '2px solid #E8B84B',
              borderRadius: 12,
              transform: 'rotate(45deg)',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%) rotate(-45deg)',
                fontFamily: '"Syne", sans-serif',
                fontSize: 18, fontWeight: 800,
                color: '#E8B84B',
                letterSpacing: '-0.05em',
              }}>W</div>
            </div>
          </div>

          <div style={{
            fontFamily: '"Syne", sans-serif',
            fontSize: 32,
            fontWeight: 800,
            color: '#f0f0f0',
            letterSpacing: '-0.04em',
            lineHeight: 1,
            marginBottom: 8,
          }}>
            WiBill
          </div>
          <div style={{
            fontFamily: '"DM Mono", monospace',
            fontSize: 10,
            color: '#444',
            letterSpacing: '3px',
            textTransform: 'uppercase',
          }}>
            Command Center
          </div>
        </div>

        {/* Tabs */}
        {!inviteToken && (
          <div style={{
            display: 'flex',
            gap: 0,
            marginBottom: 32,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            {(['login', 'signup'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError('') }}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  border: 'none',
                  borderBottom: tab === t ? '2px solid #E8B84B' : '2px solid transparent',
                  cursor: 'pointer',
                  background: 'transparent',
                  color: tab === t ? '#E8B84B' : '#555',
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  fontSize: 13,
                  fontWeight: tab === t ? 700 : 500,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  transition: 'all 0.25s ease',
                }}
              >
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>
        )}

        {/* Invite banner */}
        {inviteToken && (
          <div style={{
            background: 'rgba(34,197,94,0.06)',
            border: '1px solid rgba(34,197,94,0.15)',
            borderRadius: 10,
            padding: '14px 18px',
            marginBottom: 28,
            color: '#22c55e',
            fontSize: 13,
            textAlign: 'center',
            fontWeight: 500,
          }}>
            You have been invited to join. Create your account below.
          </div>
        )}

        {/* Form card */}
        <div style={{
          position: 'relative',
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(40px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.3)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderTop: '1px solid rgba(232,184,75,0.2)',
          borderRadius: 20,
          padding: '36px 32px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}>
          {/* Top accent gradient line */}
          <div style={{
            position: 'absolute', top: -1, left: 48, right: 48, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(232,184,75,0.35), transparent)',
          }} />
          {(tab === 'login' && !inviteToken) ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Email */}
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: '"DM Mono", monospace',
                  fontSize: 10,
                  color: emailFocused ? '#E8B84B' : '#555',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                  transition: 'color 0.25s ease',
                }}>Email</label>
                <div style={{
                  position: 'relative',
                  border: `1px solid ${emailFocused ? 'rgba(232,184,75,0.45)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 12,
                  background: 'rgba(0,0,0,0.45)',
                  transition: 'all 0.25s ease',
                  boxShadow: emailFocused ? '0 0 0 3px rgba(232,184,75,0.1), inset 0 1px 0 rgba(255,255,255,0.04)' : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    placeholder="admin@yourisp.co.ke"
                    required
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'transparent',
                      border: 'none',
                      color: '#f0f0f0',
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label style={{
                    display: 'block',
                    fontFamily: '"DM Mono", monospace',
                    fontSize: 10,
                    color: passwordFocused ? '#E8B84B' : '#555',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    transition: 'color 0.25s ease',
                  }}>Password</label>
                  <button type="button" onClick={() => {}} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                    fontSize: 11, color: '#555',
                    padding: 0, transition: 'color 0.2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#E8B84B'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#555'; }}
                  >Forgot password?</button>
                </div>
                <div style={{
                  position: 'relative',
                  border: `1px solid ${passwordFocused ? 'rgba(232,184,75,0.45)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 12,
                  background: 'rgba(0,0,0,0.45)',
                  transition: 'all 0.25s ease',
                  boxShadow: passwordFocused ? '0 0 0 3px rgba(232,184,75,0.1), inset 0 1px 0 rgba(255,255,255,0.04)' : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    placeholder="Enter your password"
                    required
                    style={{
                      width: '100%',
                      padding: '14px 48px 14px 16px',
                      background: 'transparent',
                      border: 'none',
                      color: '#f0f0f0',
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: 14, top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: 4, display: 'flex',
                      color: showPassword ? '#E8B84B' : '#444',
                      transition: 'color 0.2s',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember device */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: -4 }}>
                <input type="checkbox" id="remember" style={{ accentColor: '#E8B84B', width: 14, height: 14 }} />
                <label htmlFor="remember" style={{
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  fontSize: 12, color: '#555', cursor: 'pointer',
                  userSelect: 'none',
                }}>Remember this device</label>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderRadius: 10,
                  padding: '12px 16px',
                  color: '#ef4444',
                  fontSize: 13,
                  fontWeight: 500,
                }}>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading} style={{
                width: '100%',
                padding: '15px',
                background: loading ? 'rgba(232,184,75,0.15)' : 'linear-gradient(135deg, #E8B84B 0%, #d4a03a 100%)',
                border: 'none',
                borderRadius: 12,
                color: loading ? 'rgba(232,184,75,0.5)' : '#000',
                fontFamily: '"Syne", sans-serif',
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.5px',
                transition: 'all 0.25s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: loading ? 'none' : '0 8px 32px rgba(232,184,75,0.2)',
              }}>
                {loading ? (
                  <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={16} style={{ transition: 'transform 0.2s' }} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#555', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>ISP Name</label>
                <input type="text" value={ispName} onChange={e => setIspName(e.target.value)} placeholder="Your ISP Name" required
                  style={{ width: '100%', padding: '13px 16px', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#f0f0f0', fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.25s, box-shadow 0.25s', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(232,184,75,0.45)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,184,75,0.1), inset 0 1px 0 rgba(255,255,255,0.04)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.03)'; }} />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#555', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Slug</label>
                <input type="text" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="my-isp" required
                  style={{ width: '100%', padding: '13px 16px', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#f0f0f0', fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.25s, box-shadow 0.25s', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(232,184,75,0.45)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,184,75,0.1), inset 0 1px 0 rgba(255,255,255,0.04)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.03)'; }} />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#555', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Email</label>
                <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="admin@yourisp.co.ke" required
                  style={{ width: '100%', padding: '13px 16px', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#f0f0f0', fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.25s, box-shadow 0.25s', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(232,184,75,0.45)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,184,75,0.1), inset 0 1px 0 rgba(255,255,255,0.04)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.03)'; }} />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#555', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Password</label>
                <input type="password" value={regPass} onChange={e => setRegPass(e.target.value)} placeholder="••••••••" required
                  style={{ width: '100%', padding: '13px 16px', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#f0f0f0', fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.25s, box-shadow 0.25s', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(232,184,75,0.45)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,184,75,0.1), inset 0 1px 0 rgba(255,255,255,0.04)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.03)'; }} />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#555', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Phone (optional)</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254..."
                  style={{ width: '100%', padding: '13px 16px', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#f0f0f0', fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.25s, box-shadow 0.25s', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(232,184,75,0.45)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,184,75,0.1), inset 0 1px 0 rgba(255,255,255,0.04)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.03)'; }} />
              </div>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '12px 16px', color: '#ef4444', fontSize: 13, fontWeight: 500 }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '15px',
                background: loading ? 'rgba(232,184,75,0.15)' : 'linear-gradient(135deg, #E8B84B 0%, #d4a03a 100%)',
                border: 'none', borderRadius: 12,
                color: loading ? 'rgba(232,184,75,0.5)' : '#000',
                fontFamily: '"Syne", sans-serif', fontSize: 14, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: loading ? 'none' : '0 8px 32px rgba(232,184,75,0.2)',
              }}>
                {loading ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : (
                  <>
                    {inviteToken ? 'Launch Dashboard' : 'Create Account'}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Security footer */}
        <div style={{
          marginTop: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '10px 16px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
        }}>
          <Shield size={13} color="#E8B84B" />
          <span style={{
            fontFamily: '"DM Mono", monospace',
            fontSize: 10,
            color: '#666',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}>
            Encrypted session
          </span>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: '#22c55e',
            animation: 'pulse 2s ease-in-out infinite',
            marginLeft: 2,
          }} />
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #080B11 0%, #0D1220 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(232,184,75,0.2)', borderTopColor: '#E8B84B', animation: 'spin 0.8s linear infinite' }} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
