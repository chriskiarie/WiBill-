'use client'
import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function JoinPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get('token')

  const [ispName, setIspName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [usernameError, setUsernameError] = useState('')

  // Auto-generate username from ISP name
  useEffect(() => {
    if (ispName) {
      const auto = ispName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      setUsername(auto)
    }
  }, [ispName])

  // Validate username in real-time
  const validateUsername = async (val: string) => {
    if (!val) {
      setUsernameError('')
      return
    }
    if (!/^[a-z0-9_-]{3,50}$/.test(val)) {
      setUsernameError('3-50 chars, lowercase, alphanumeric, dash, underscore only')
      return
    }
    // Could add backend check here for availability
    setUsernameError('')
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!ispName.trim()) {
      setError('ISP name is required')
      return
    }
    if (!username.trim()) {
      setError('Username is required')
      return
    }
    if (!/^[a-z0-9_-]{3,50}$/.test(username)) {
      setError('Invalid username format')
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
      const res = await fetch(`${API}/api/auth/register?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isp_name: ispName.trim(),
          username: username.toLowerCase(),
          password,
          admin_phone: phone || '254700000000',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Signup failed')
      }

      // Success → redirect to pending approval screen
      router.push('/join/pending-approval')
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
          <div className="text-xs text-gray-500">
            Redirecting to login...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-lg shadow-2xl p-8 border border-gray-800">
          <div className="text-center mb-8">
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', fontFamily: 'Space Grotesk, sans-serif', marginBottom: 8 }}>
              WiBill
            </h1>
            <p style={{ fontSize: 12, color: '#666', fontFamily: 'Inter, sans-serif' }}>
              Create your ISP account
            </p>
            <div style={{ fontSize: 11, color: '#4ade80', marginTop: 12, background: '#0a2a0a', border: '0.5px solid #1a3a1a', borderRadius: 6, padding: 8 }}>
              ✓ Invite token verified
            </div>
          </div>

          {error && (
            <div style={{ background: '#0d0404', border: '0.5px solid #2a0a0a', borderRadius: 7, padding: '10px 14px', color: '#f87171', fontSize: 12, fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* ISP Name */}
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#888', marginBottom: 6, fontFamily: 'DM Mono, monospace' }}>
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
                }}
                required
              />
            </div>

            {/* Username */}
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#888', marginBottom: 6, fontFamily: 'DM Mono, monospace' }}>
                Username (Your Login Handle)
              </label>
              <input
                type="text"
                placeholder="kaachonji-networks"
                value={username}
                onChange={e => {
                  setUsername(e.target.value)
                  validateUsername(e.target.value)
                }}
                disabled={loading}
                style={{
                  width: '100%', background: '#0a0a0a', border: usernameError ? '0.5px solid #dc2626' : '0.5px solid #1e1e1e', borderRadius: 9, padding: '13px 16px',
                  color: '#f0f0f0', fontFamily: 'DM Mono, monospace', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  opacity: loading ? 0.5 : 1,
                }}
                required
              />
              {usernameError && <div style={{ fontSize: 10, color: '#f87171', marginTop: 4, fontFamily: 'DM Mono, monospace' }}>{usernameError}</div>}
              <div style={{ fontSize: 10, color: '#555', marginTop: 4, fontFamily: 'DM Mono, monospace' }}>
                You'll use this to log in. Must be unique and memorable.
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#888', marginBottom: 6, fontFamily: 'DM Mono, monospace' }}>
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
                }}
                required
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#888', marginBottom: 6, fontFamily: 'DM Mono, monospace' }}>
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
                }}
                required
              />
            </div>

            {/* Phone (Optional) */}
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#888', marginBottom: 6, fontFamily: 'DM Mono, monospace' }}>
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
                }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !!usernameError}
              style={{
                width: '100%', padding: '14px', marginTop: 8, background: loading || usernameError ? '#444' : '#1a6bff', border: 'none',
                borderRadius: 9, color: '#fff', fontFamily: 'Space Grotesk, sans-serif', fontSize: 13, fontWeight: 700,
                cursor: loading || usernameError ? 'not-allowed' : 'pointer', letterSpacing: 0.5, opacity: loading || usernameError ? 0.6 : 1,
              }}
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