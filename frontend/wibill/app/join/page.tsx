'use client'
import React, { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Phase = 'register' | 'welcome' | 'loading' | 'wizard'

const steps = [
  { label: 'Creating your account' },
  { label: 'Setting up your portal' },
  { label: 'Configuring payments' },
  { label: 'Launching your dashboard' },
]

function JoinPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get('ref') || searchParams?.get('token')

  const [phase, setPhase] = useState<Phase>('register')
  const [buttonExiting, setButtonExiting] = useState(false)
  const [cardExiting, setCardExiting] = useState(false)

  const [line1Vis, setLine1Vis] = useState(false)
  const [line2Vis, setLine2Vis] = useState(false)
  const [line3Vis, setLine3Vis] = useState(false)
  const [linesOut, setLinesOut] = useState(false)

  const [activeStep, setActiveStep] = useState(0)
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set())
  const [progress, setProgress] = useState(0)

  const [toastVis, setToastVis] = useState(false)

  const [ispName, setIspName] = useState('')
  const [ispSlug, setIspSlug] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const apiCalledRef = useRef(false)
  const abortRef = useRef(false)

  useEffect(() => {
    if (ispName) {
      const auto = ispName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      setIspSlug(auto)
    }
  }, [ispName])

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

  const runSteps = async () => {
    const durations = [650, 700, 600, 500]
    const targets = [20, 45, 75, 100]
    for (let i = 0; i < steps.length; i++) {
      setActiveStep(i + 1)
      await delay(80)
      setProgress(targets[i])
      await delay(durations[i])
      setDoneSteps(prev => new Set(prev).add(i + 1))
    }
    await delay(400)
  }

  const startAnimation = async () => {
    setButtonExiting(true)
    await delay(200)
    setCardExiting(true)
    await delay(700)

    setPhase('welcome')
    await delay(100)
    setLine1Vis(true)
    await delay(450)
    setLine2Vis(true)
    await delay(350)
    setLine3Vis(true)
    await delay(1800)

    setLinesOut(true)
    await delay(500)
    setPhase('loading')
    await delay(200)

    await runSteps()

    setPhase('wizard')
    await delay(1200)
    setToastVis(true)
    await delay(3000)
    setToastVis(false)
    await delay(500)
    router.push('/onboarding')
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (abortRef.current) return
    setError('')

    if (!ispName.trim()) { setError('ISP name is required'); return }
    if (!ispSlug.trim()) { setError('Slug is required'); return }
    if (ispSlug.length < 3) { setError('Slug must be at least 3 characters'); return }
    if (!adminEmail.trim()) { setError('Admin email is required'); return }
    if (!password) { setError('Password is required'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (!token) { setError('Invalid invite link. Please request a new invite.'); return }

    setLoading(true)
    startAnimation()

    localStorage.removeItem('wb_token')
    localStorage.removeItem('wb_role')
    localStorage.removeItem('wb_user')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('role')
    sessionStorage.removeItem('wb_token')
    sessionStorage.removeItem('wb_role')
    sessionStorage.removeItem('wb_user')

    try {
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
        const data = await res.json()
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Signup failed')
      }

      const data = await res.json()

      if (data.status === 'active') {
        const loginForm = new URLSearchParams()
        loginForm.append('username', adminEmail.toLowerCase())
        loginForm.append('password', password)
        const loginRes = await fetch(`${API}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: loginForm,
        })
        if (!loginRes.ok) {
          const errData = await loginRes.json()
          throw new Error(typeof errData.detail === 'string' ? errData.detail : 'Auto-login failed')
        }
        const loginData = await loginRes.json()
        localStorage.setItem('wb_token', loginData.access_token)
        localStorage.setItem('wb_role', loginData.role)
        localStorage.setItem('wb_user', JSON.stringify({ email: adminEmail.toLowerCase(), role: loginData.role }))
        sessionStorage.setItem('token', loginData.access_token)
        sessionStorage.setItem('role', loginData.role)
      } else {
        router.push('/join/pending-approval')
      }
    } catch (err: any) {
      if (!abortRef.current) {
        abortRef.current = true
        setError(err?.message || 'An error occurred')
        setLoading(false)
        setPhase('register')
        setButtonExiting(false)
        setCardExiting(false)
        setLine1Vis(false)
        setLine2Vis(false)
        setLine3Vis(false)
        setLinesOut(false)
        setActiveStep(0)
        setDoneSteps(new Set())
        setProgress(0)
      }
    }
  }

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#080808', borderRadius: 12, border: '0.5px solid #141414', padding: 40, maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16, color: '#555' }}>✕</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#e0e0e0', marginBottom: 8, fontFamily: '"Space Grotesk", sans-serif' }}>Invalid Link</h1>
          <p style={{ fontSize: 13, color: '#555', fontFamily: 'Inter, sans-serif' }}>
            This invite link is invalid or expired. Please request a new invite.
          </p>
        </div>
      </div>
    )
  }

  // ── Styles object ──
  const S = {
    page: { minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' as const, overflow: 'hidden' as const },
    card: {
      width: '100%', maxWidth: 420, background: '#080808', borderRadius: 12,
      border: '0.5px solid #141414', padding: 28, boxSizing: 'border-box' as const,
      transition: 'transform 0.65s cubic-bezier(0.76, 0, 0.24, 1), opacity 0.5s ease',
    },
    cardExit: { transform: 'translateX(-130%) rotate(-3deg)', opacity: 0 },
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
    <div style={S.page}>
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(232,184,75,0.3); }
          50% { transform: scale(1.04); box-shadow: 0 0 0 10px rgba(232,184,75,0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes toast-in {
          from { transform: translateX(120%) translateY(20px); opacity: 0; }
          to { transform: translateX(0) translateY(0); opacity: 1; }
        }
        @keyframes toast-out {
          from { transform: translateX(0) translateY(0); opacity: 1; }
          to { transform: translateX(120%) translateY(20px); opacity: 0; }
        }
        @keyframes progress-pulse {
          0% { opacity: 1; }
          50% { opacity: 0.6; }
          100% { opacity: 1; }
        }
        .step-dot { transition: all 0.2s ease; }
        .step-dot.done { color: #6B6964; }
        .step-dot.active { color: #E8B84B; }
        .step-dot.inactive { color: #3A3A37; }
      `}</style>

      {/* ─── PHASE 1: REGISTER ─── */}
      {phase === 'register' && (
        <div style={{ ...S.card, ...(cardExiting ? S.cardExit : {}) }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#E8B84B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 20, fontWeight: 700, color: '#3D2A06' }}>{'>'}_</span>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#e0e0e0', fontFamily: '"Space Grotesk", sans-serif', marginBottom: 4 }}>Join WiBill</h1>
            <p style={{ fontSize: 12, color: '#555', fontFamily: 'Inter, sans-serif' }}>Create your ISP account</p>
          </div>

          {error && (
            <div style={{ background: '#0d0404', border: '0.5px solid #2a0a0a', borderRadius: 7, padding: '10px 14px', color: '#f87171', fontSize: 12, fontFamily: '"DM Mono", monospace', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={S.label}>ISP / Company Name</label>
              <input type="text" placeholder="e.g., Kaachonji Networks" value={ispName} onChange={e => setIspName(e.target.value)} disabled={loading} style={S.input} required />
            </div>
            <div>
              <label style={S.label}>Slug (URL-Safe Handle)</label>
              <input type="text" placeholder="kaachonji-networks" value={ispSlug} onChange={e => setIspSlug(e.target.value)} disabled={loading} style={{ ...S.input, fontFamily: '"DM Mono", monospace' }} required />
              <div style={{ fontSize: 10, color: '#555', marginTop: 4, fontFamily: '"DM Mono", monospace' }}>Portal: portal.honestbill.co.ke/{ispSlug}</div>
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
                transition: 'transform 0.5s cubic-bezier(0.76, 0, 0.24, 1), opacity 0.4s ease',
                transform: buttonExiting ? 'translateX(130%) rotate(3deg)' : 'none',
                opacity: buttonExiting ? 0 : 1,
              }}
            >
              {loading ? 'Creating account...' : 'Create my account'}
            </button>
          </form>
        </div>
      )}

      {/* ─── PHASE 2: WELCOME ─── */}
      {phase === 'welcome' && (
        <div style={{ textAlign: 'center' }}>
          {[
            { vis: line1Vis, content: <h1 style={{ fontSize: 32, fontWeight: 700, color: '#e0e0e0', margin: 0, fontFamily: '"Space Grotesk", sans-serif' }}>
              Welcome, <span style={{ color: '#E8B84B' }}>{ispName}</span>
            </h1> },
            { vis: line2Vis, content: <p style={{ fontSize: 14, color: '#6B6964', margin: 0, fontFamily: 'Inter, sans-serif' }}>
              Your hotspot business is being set up
            </p>, mt: 12 },
            { vis: line3Vis, content: <><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#E8B84B', marginRight: 8, animation: 'breathe 2s ease-in-out infinite' }} />
              <span style={{ fontSize: 13, color: '#555', fontFamily: 'Inter, sans-serif' }}>Just a moment...</span></>, mt: 24 },
          ].map((item, i) => {
            const isVis = item.vis
            const isOut = linesOut
            let opacity = 0
            let transform = 'translateY(14px)'
            let transition = 'opacity 0.7s ease-out, transform 0.7s ease-out'
            if (isOut) { opacity = 0; transform = 'translateY(-14px)'; transition = 'opacity 0.4s ease-in, transform 0.4s ease-in' }
            else if (isVis) { opacity = 1; transform = 'translateY(0)' }
            return (
              <div key={i} style={{ opacity, transform, transition, marginTop: item.mt || 0 }}>
                {item.content}
              </div>
            )
          })}
        </div>
      )}

      {/* ─── PHASE 3: LOADING ─── */}
      {phase === 'loading' && (
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: '#E8B84B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', animation: 'breathe 2s ease-in-out infinite',
          }}>
            <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 24, fontWeight: 700, color: '#3D2A06' }}>{'>'}_</span>
          </div>

          <p style={{ fontSize: 16, fontWeight: 600, color: '#e0e0e0', fontFamily: '"Space Grotesk", sans-serif', marginBottom: 20 }}>
            Preparing your space
          </p>

          {/* Progress bar */}
          <div style={{ width: 200, height: 2, background: '#1A1A18', borderRadius: 1, margin: '0 auto 28px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#E8B84B', borderRadius: 1, transition: 'width 0.4s ease', width: `${progress}%` }} />
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', maxWidth: 220, margin: '0 auto' }}>
            {steps.map((step, i) => {
              const idx = i + 1
              const isActive = activeStep === idx
              const isDone = doneSteps.has(idx)
              let icon = '○'
              let color = '#3A3A37'
              if (isDone) { icon = '✓'; color = '#6B6964' }
              else if (isActive) { icon = '›'; color = '#E8B84B' }
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontSize: 13, fontFamily: 'Inter, sans-serif',
                  color, transition: 'color 0.2s ease',
                }}>
                  <span style={{
                    flexShrink: 0, width: 16, textAlign: 'center',
                    fontFamily: '"DM Mono", monospace', fontSize: 14,
                    animation: isActive ? 'progress-pulse 1.2s ease-in-out infinite' : 'none',
                  }}>{icon}</span>
                  <span>{step.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── PHASE 4: WIZARD ─── */}
      {phase === 'wizard' && (
        <div style={{
          width: '100%', maxWidth: 420,
          background: '#080808', borderRadius: 12, border: '0.5px solid #141414', padding: 32,
          boxSizing: 'border-box',
          transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
          opacity: 1, transform: 'scale(1)',
        }}>
          {/* Step dots */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
            {[1, 2, 3, 4].map(s => (
              <div key={s} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: s === 1 ? '#E8B84B' : '#2A2A27',
                transition: 'background 0.2s',
              }} />
            ))}
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#555', fontFamily: '"DM Mono", monospace', marginBottom: 24 }}>
            Step 1 of 4
          </div>

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: '#E8B84B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 24, fontWeight: 700, color: '#3D2A06' }}>{'>'}_</span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e0e0e0', margin: 0, fontFamily: '"Space Grotesk", sans-serif' }}>
              Welcome to WiBill
            </h2>
            <p style={{ fontSize: 13, color: '#555', marginTop: 8, fontFamily: 'Inter, sans-serif' }}>
              Your account is ready. Let's set up your portal.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#0a0a0a', borderRadius: 8, border: '0.5px solid #1a1a1a' }}>
              <span style={{ color: '#E8B84B', fontSize: 14 }}>⊞</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#ccc' }}>Portal Name</div>
                <div style={{ fontSize: 11, color: '#555' }}>{ispName} WiFi</div>
              </div>
              <span style={{ color: '#4ade80', fontSize: 11 }}>✓</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#0a0a0a', borderRadius: 8, border: '0.5px solid #1a1a1a' }}>
              <span style={{ color: '#555', fontSize: 14 }}>◈</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#ccc' }}>M-Pesa</div>
                <div style={{ fontSize: 11, color: '#555' }}>Next step</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#0a0a0a', borderRadius: 8, border: '0.5px solid #1a1a1a' }}>
              <span style={{ color: '#555', fontSize: 14 }}>⌗</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#ccc' }}>MikroTik</div>
                <div style={{ fontSize: 11, color: '#555' }}>Next step</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push('/onboarding')}
            style={{
              width: '100%', padding: '14px', marginTop: 20,
              background: '#E8B84B', border: 'none', borderRadius: 9,
              color: '#3D2A06', fontFamily: '"Space Grotesk", sans-serif',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Continue Setup →
          </button>
        </div>
      )}

      {/* ─── TOAST ─── */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 999,
        animation: toastVis ? 'toast-in 0.4s ease-out forwards' : 'toast-out 0.3s ease-in forwards',
        pointerEvents: toastVis ? 'auto' : 'none',
      }}>
        <div style={{
          background: '#0D0D0B', border: '0.5px solid #2A2A27', borderRadius: 8,
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
          minWidth: 200, boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#ccc', fontFamily: 'Inter, sans-serif' }}>Account created successfully</span>
        </div>
      </div>
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
