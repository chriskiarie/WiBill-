'use client'
import React, { useEffect, useState, useCallback, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Phase = 'register' | 'welcome' | 'loading'

const steps = [
  'Creating your account',
  'Setting up your portal',
  'Configuring payments',
  'Launching your dashboard',
]

function JoinPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get('ref') || searchParams?.get('token')

  const [phase, setPhase] = useState<Phase>('register')
  const [cardExiting, setCardExiting] = useState(false)
  const [buttonExiting, setButtonExiting] = useState(false)
  const [welcomeOut, setWelcomeOut] = useState(false)

  const [ispName, setIspName] = useState('')
  const [ispSlug, setIspSlug] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [stepIdx, setStepIdx] = useState(-1)
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set())
  const [progPct, setProgPct] = useState(0)

  const aliveRef = useRef(true)

  useEffect(() => {
    return () => { aliveRef.current = false }
  }, [])

  useEffect(() => {
    if (ispName) {
      const auto = ispName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      setIspSlug(auto)
    }
  }, [ispName])

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

  const resetToRegister = (msg: string) => {
    if (!aliveRef.current) return
    setError(msg)
    setPhase('register')
    setCardExiting(false)
    setButtonExiting(false)
    setLoading(false)
  }

  const handleSignup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!ispName.trim()) { setError('ISP name is required'); return }
    if (!ispSlug.trim() || ispSlug.length < 3) { setError('Slug must be at least 3 characters'); return }
    if (!adminEmail.trim()) { setError('Admin email is required'); return }
    if (!password || password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (!token) { setError('Invalid invite link'); return }

    setLoading(true)

    // ── Exit animation + API call in parallel ─────────────────
    setButtonExiting(true)
    await delay(150)
    setCardExiting(true)

    const apiPromise = (async () => {
      const res = await fetch(`${API}/api/auth/register?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isp_name: ispName.trim(),
          isp_slug: ispSlug.toLowerCase(),
          admin_email: adminEmail.toLowerCase(),
          admin_password: password,
          admin_phone: phone || '254700000000',
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(typeof d.detail === 'string' ? d.detail : 'Signup failed')
      }
      return res.json()
    })()

    // Wait for exit animation to finish
    const exitPromise = delay(750)
    const [signupData] = await Promise.all([apiPromise, exitPromise])

    // Pending → redirect
    if (signupData.status !== 'active') {
      router.push('/join/pending-approval')
      return
    }

    // ── Auto-login ────────────────────────────────────────────
    try {
      const loginForm = new URLSearchParams()
      loginForm.append('username', adminEmail.toLowerCase())
      loginForm.append('password', password)
      const loginRes = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: loginForm,
      })
      if (!loginRes.ok) {
        const d = await loginRes.json()
        throw new Error(typeof d.detail === 'string' ? d.detail : 'Auto-login failed')
      }
      const loginData = await loginRes.json()
      localStorage.setItem('wb_token', loginData.access_token)
      localStorage.setItem('wb_role', loginData.role)
      localStorage.setItem('wb_user', JSON.stringify({ email: adminEmail.toLowerCase(), role: loginData.role }))
    } catch (err: any) {
      resetToRegister(err?.message || 'Login failed — please log in manually.')
      return
    }

    // ── Welcome (fades in immediately — card is gone) ─────────
    setPhase('welcome')
    await delay(1800)
    setWelcomeOut(true)
    await delay(400)

    // ── Loading ────────────────────────────────────────────────
    setPhase('loading')
    setWelcomeOut(false)
    const targets = [20, 45, 75, 100]
    const durations = [550, 600, 500, 400]
    for (let i = 0; i < steps.length; i++) {
      setStepIdx(i)
      await delay(60)
      setProgPct(targets[i])
      await delay(durations[i])
      setDoneSteps(prev => new Set(prev).add(i))
    }
    await delay(400)

    router.push('/onboarding')
  }, [ispName, ispSlug, adminEmail, password, confirmPassword, phone, token, router])

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#080808', borderRadius: 12, border: '0.5px solid #141414', padding: 40, maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16, color: '#555' }}>✕</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#e0e0e0', marginBottom: 8, fontFamily: '"Space Grotesk", sans-serif' }}>Invalid Link</h1>
          <p style={{ fontSize: 13, color: '#555', fontFamily: 'Inter, sans-serif' }}>This invite link is invalid or expired.</p>
        </div>
      </div>
    )
  }

  const S = {
    input: {
      width: '100%', background: '#0a0a0a', border: '0.5px solid #1e1e1e', borderRadius: 9,
      padding: '13px 16px', color: '#f0f0f0', fontFamily: 'Inter, sans-serif',
      fontSize: 13, outline: 'none', boxSizing: 'border-box' as const,
    },
    label: {
      display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const,
      letterSpacing: '0.15em', color: '#555', marginBottom: 6, fontFamily: '"DM Mono", monospace',
    },
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: phase === 'loading' ? 0 : 20,
      position: 'relative' as const, overflow: 'hidden' as const,
    }}>
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(232,184,75,0.3); }
          50% { transform: scale(1.05); box-shadow: 0 0 0 18px rgba(232,184,75,0); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.8); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-out {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-16px); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ─── REGISTER CARD ─── */}
      {phase === 'register' && (
        <div style={{
          width: '100%', maxWidth: 420,
          transition: 'transform 0.65s cubic-bezier(0.76, 0, 0.24, 1), opacity 0.5s ease',
          transform: cardExiting ? 'translateX(-130%) rotate(-3deg)' : 'translateX(0) rotate(0deg)',
          opacity: cardExiting ? 0 : 1,
        }}>
          <div style={{ background: '#080808', borderRadius: 12, border: '0.5px solid #141414', padding: 28 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <img src="/logos/wibill-wb-monogram-192.png" alt="WiBill" style={{ width: 60, height: 60, objectFit: 'contain', display: 'block', margin: '0 auto 16px' }} />
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#e0e0e0', fontFamily: '"Space Grotesk", sans-serif', marginBottom: 4 }}>Join WiBill</h1>
              <p style={{ fontSize: 12, color: '#555', fontFamily: 'Inter, sans-serif' }}>Create your ISP account</p>
            </div>

            {error && (
              <div style={{ background: '#0d0404', border: '0.5px solid #2a0a0a', borderRadius: 7, padding: '10px 14px', color: '#f87171', fontSize: 12, fontFamily: '"DM Mono", monospace', marginBottom: 16, animation: 'fade-in 0.4s ease-out forwards' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={S.label}>ISP / Company Name</label>
                <input type="text" placeholder="e.g., Kaachonji Networks" value={ispName} onChange={e => setIspName(e.target.value)} disabled={loading} style={S.input} required />
              </div>
              <div>
                <label style={S.label}>Slug</label>
                <input type="text" placeholder="kaachonji-networks" value={ispSlug} onChange={e => setIspSlug(e.target.value)} disabled={loading} style={{ ...S.input, fontFamily: '"DM Mono", monospace' }} required />
                <div style={{ fontSize: 10, color: '#555', marginTop: 4, fontFamily: '"DM Mono", monospace' }}>portal.honestbill.co.ke/{ispSlug}</div>
              </div>
              <div>
                <label style={S.label}>Admin Email</label>
                <input type="email" placeholder="admin@yourisp.co.ke" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} disabled={loading} style={S.input} required />
              </div>
              <div>
                <label style={S.label}>Password</label>
                <input type="password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} style={S.input} required />
              </div>
              <div>
                <label style={S.label}>Confirm Password</label>
                <input type="password" placeholder="Re-enter password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={loading} style={S.input} required />
              </div>
              <div>
                <label style={S.label}>Phone (Optional)</label>
                <input type="text" placeholder="0712345678" value={phone} onChange={e => setPhone(e.target.value)} disabled={loading} style={S.input} />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '14px', marginTop: 8,
                  background: loading ? '#333' : '#E8B84B', border: 'none', borderRadius: 9,
                  color: '#3D2A06', fontFamily: '"Space Grotesk", sans-serif', fontSize: 13,
                  fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.45s cubic-bezier(0.76, 0, 0.24, 1), opacity 0.35s ease',
                  transform: buttonExiting ? 'translateX(140%) rotate(4deg)' : 'translateX(0) rotate(0deg)',
                  opacity: buttonExiting ? 0 : 1,
                }}
              >
                Create my account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── WELCOME ─── */}
      {phase === 'welcome' && (
        <div style={{
          animation: welcomeOut ? 'fade-out 0.4s ease-in forwards' : 'fade-in 0.7s ease-out forwards',
        }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: '#e0e0e0', margin: '0 0 14px', fontFamily: '"Space Grotesk", sans-serif', lineHeight: 1.2 }}>
            Welcome, <span style={{ color: '#E8B84B' }}>{ispName}</span>
          </h1>
          <p style={{
            fontSize: 15, color: '#6B6964', margin: 0, fontFamily: 'Inter, sans-serif',
            animation: 'fade-in 0.7s ease-out 0.35s forwards',
            opacity: 0, transform: 'translateY(18px)',
          }}>
            Your hotspot business is being set up
          </p>
          <div style={{
            marginTop: 32,
            animation: 'fade-in 0.7s ease-out 0.7s forwards',
            opacity: 0, transform: 'translateY(18px)',
          }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#E8B84B', marginRight: 10, animation: 'pulse-dot 1.6s ease-in-out infinite' }} />
            <span style={{ fontSize: 13, color: '#555', fontFamily: 'Inter, sans-serif' }}>Just a moment...</span>
          </div>
        </div>
      )}

      {/* ─── LOADING ─── */}
      {phase === 'loading' && (
        <div style={{
          width: '100vw', height: '100vh',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'fade-in 0.6s ease-out forwards',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: 18, background: '#E8B84B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 36, animation: 'breathe 2.4s ease-in-out infinite',
          }}>
            <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 34, fontWeight: 700, color: '#3D2A06' }}>{'>'}_</span>
          </div>

          <p style={{ fontSize: 18, fontWeight: 600, color: '#e0e0e0', fontFamily: '"Space Grotesk", sans-serif', marginBottom: 28, letterSpacing: '0.02em' }}>
            Preparing your workspace...
          </p>

          <div style={{ width: 280, height: 3, background: '#1A1A18', borderRadius: 2, marginBottom: 40, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: '#E8B84B', borderRadius: 2,
              transition: 'width 0.45s ease', width: `${progPct}%`,
            }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 260 }}>
            {steps.map((label, i) => {
              const isActive = stepIdx === i
              const isDone = doneSteps.has(i)
              let icon = '○'
              let color = '#3A3A37'
              if (isDone) { icon = '✓'; color = '#6B6964' }
              else if (isActive) { icon = '›'; color = '#E8B84B' }
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  fontSize: 14, fontFamily: 'Inter, sans-serif',
                  color, transition: 'color 0.25s ease',
                  animation: isActive ? 'fade-in 0.35s ease-out forwards' : 'none',
                }}>
                  <span style={{
                    flexShrink: 0, width: 18, textAlign: 'center',
                    fontFamily: '"DM Mono", monospace', fontSize: 16,
                    animation: isActive ? 'pulse-dot 1.4s ease-in-out infinite' : 'none',
                  }}>{icon}</span>
                  <span>{label}</span>
                </div>
              )
            })}
          </div>

          {doneSteps.size === steps.length && (
            <div style={{
              marginTop: 40, animation: 'slide-up 0.5s ease-out forwards',
              fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, color: '#E8B84B', fontWeight: 600,
            }}>
              Preparing your workspace...
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#000', color: '#555', fontFamily: '"DM Mono", monospace', fontSize: 12 }}>
        Loading...
      </div>
    }>
      <JoinPageInner />
    </Suspense>
  )
}
