'use client'
import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function JoinPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get('ref') || searchParams?.get('token')

  const [ispName, setIspName] = useState('')
  const [ispSlug, setIspSlug] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-generate slug from ISP name
  useEffect(() => {
    if (ispName) {
      const auto = ispName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      setIspSlug(auto)
    }
  }, [ispName])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!ispName.trim()) {
      setError('ISP name is required')
      return
    }
    if (!ispSlug.trim()) {
      setError('Slug is required')
      return
    }
    if (ispSlug.length < 3) {
      setError('Slug must be at least 3 characters')
      return
    }
    if (!adminEmail.trim()) {
      setError('Admin email is required')
      return
    }
    if (!password) {
      setError('Password is required')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!token) {
      setError('Invalid invite link. Please request a new invite.')
      return
    }

    setLoading(true)

    try {
      // Clear ANY stale auth (from previous admin session) before registering new ISP
      localStorage.removeItem('wb_token')
      localStorage.removeItem('wb_role')
      localStorage.removeItem('wb_user')
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('role')
      sessionStorage.removeItem('wb_token')
      sessionStorage.removeItem('wb_role')
      sessionStorage.removeItem('wb_user')

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
      // Invited ISPs get status="active" → log in and go to onboarding
      // Cold signups get status="pending_approval" → go to waiting screen
      if (data.status === 'active') {
        // Log in to get JWT token
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
        router.push('/onboarding')
      } else {
        router.push('/join/pending-approval')
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="bg-gray-900 rounded-lg shadow-2xl p-8 max-w-md w-full border border-gray-800 text-center">
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Link</h1>
          <p className="text-gray-400 text-sm mb-6">
            This invite link is invalid or expired. Please request a new invite from your admin.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ background: '#080808', borderRadius: 12, border: '0.5px solid #141414', padding: 28 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', fontFamily: 'Space Grotesk, sans-serif', marginBottom: 8 }}>
              WiBill
            </h1>
            <p style={{ fontSize: 12, color: '#666', fontFamily: 'Inter, sans-serif', marginBottom: 12 }}>
              Create your ISP account
            </p>
            <div style={{ fontSize: 11, color: '#4ade80', background: '#0a2a0a', border: '0.5px solid #1a3a1a', borderRadius: 6, padding: 8 }}>
              ✓ Invite token verified
            </div>
          </div>

          {error && (
            <div style={{ background: '#0d0404', border: '0.5px solid #2a0a0a', borderRadius: 7, padding: '10px 14px', color: '#f87171', fontSize: 12, fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#555', marginBottom: 6, fontFamily: 'DM Mono, monospace' }}>
                ISP / Company Name
              </label>
              <input
                type="text"
                placeholder="e.g., Kaachonji Networks"
                value={ispName}
                onChange={e => setIspName(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%', background: '#0a0a0a', border: '0.5px solid #1e1e1e', borderRadius: 9, padding: '13px 16px',
                  color: '#f0f0f0', fontFamily: 'Inter, sans-serif', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  opacity: loading ? 0.5 : 1,
                } as any}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#555', marginBottom: 6, fontFamily: 'DM Mono, monospace' }}>
                Slug (URL-Safe Handle)
              </label>
              <input
                type="text"
                placeholder="kaachonji-networks"
                value={ispSlug}
                onChange={e => setIspSlug(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%', background: '#0a0a0a', border: '0.5px solid #1e1e1e', borderRadius: 9, padding: '13px 16px',
                  color: '#f0f0f0', fontFamily: 'DM Mono, monospace', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  opacity: loading ? 0.5 : 1,
                } as any}
                required
              />
              <div style={{ fontSize: 10, color: '#555', marginTop: 4, fontFamily: 'DM Mono, monospace' }}>
                Your portal URL: portal.honestbill.co.ke/{ispSlug}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#555', marginBottom: 6, fontFamily: 'DM Mono, monospace' }}>
                Admin Email
              </label>
              <input
                type="email"
                placeholder="admin@yourisp.co.ke"
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%', background: '#0a0a0a', border: '0.5px solid #1e1e1e', borderRadius: 9, padding: '13px 16px',
                  color: '#f0f0f0', fontFamily: 'Inter, sans-serif', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  opacity: loading ? 0.5 : 1,
                } as any}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#555', marginBottom: 6, fontFamily: 'DM Mono, monospace' }}>
                Password
              </label>
              <input
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%', background: '#0a0a0a', border: '0.5px solid #1e1e1e', borderRadius: 9, padding: '13px 16px',
                  color: '#f0f0f0', fontFamily: 'Inter, sans-serif', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  opacity: loading ? 0.5 : 1,
                } as any}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#555', marginBottom: 6, fontFamily: 'DM Mono, monospace' }}>
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%', background: '#0a0a0a', border: '0.5px solid #1e1e1e', borderRadius: 9, padding: '13px 16px',
                  color: '#f0f0f0', fontFamily: 'Inter, sans-serif', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  opacity: loading ? 0.5 : 1,
                } as any}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#555', marginBottom: 6, fontFamily: 'DM Mono, monospace' }}>
                Phone (Optional)
              </label>
              <input
                type="text"
                placeholder="0712345678"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%', background: '#0a0a0a', border: '0.5px solid #1e1e1e', borderRadius: 9, padding: '13px 16px',
                  color: '#f0f0f0', fontFamily: 'Inter, sans-serif', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  opacity: loading ? 0.5 : 1,
                } as any}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px', marginTop: 8, background: loading ? '#444' : '#1a6bff', border: 'none',
                borderRadius: 9, color: '#fff', fontFamily: 'Space Grotesk, sans-serif', fontSize: 13, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: 0.5, opacity: loading ? 0.6 : 1,
              } as any}
            >
              {loading ? 'Creating account...' : 'CREATE ACCOUNT'}
            </button>
          </form>

          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '0.5px solid #1a1a1a', textAlign: 'center', fontSize: 10, color: '#333', fontFamily: 'DM Mono, monospace' }}>
            This account requires admin approval before you can log in.
          </div>
        </div>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#030303', color: '#fff' }}>
        Loading...
      </div>
    }>
      <JoinPageInner />
    </Suspense>
  )
}