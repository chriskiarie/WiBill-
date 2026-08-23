'use client'

import { useState, FormEvent, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Eye, EyeOff } from 'lucide-react'

const inp: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: 9,
  padding: '13px 16px',
  color: '#f0f0f0',
  fontFamily: 'DM Mono, monospace',
  fontSize: 13,
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
}
const inpFocus: React.CSSProperties = {
  ...inp,
  borderColor: '#E8B84B',
  boxShadow: '0 0 0 3px rgba(232,184,75,0.12)',
}
const lbl: React.CSSProperties = {
  fontSize: 10,
  color: '#777',
  fontWeight: 700,
  letterSpacing: '0.6px',
  marginBottom: 6,
  display: 'block',
  textTransform: 'uppercase',
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focusField, setFocusField] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    const token = searchParams?.get('ref') || searchParams?.get('token')
    if (token) {
      router.push(`/signup?ref=${encodeURIComponent(token)}`)
    }
  }, [searchParams, router])

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

  const inputStyle = (name: string): React.CSSProperties =>
    focusField === name ? inpFocus : inp

  const formSection = (
    <>
      {/* Card */}
      <div style={{
        background: 'rgba(10, 10, 10, 0.6)',
        backdropFilter: 'blur(24px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        border: '0.5px solid rgba(255,255,255,0.06)',
        borderRadius: 16,
        padding: 28,
      }}>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={lbl}>EMAIL</label>
            <input
              style={inputStyle('email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusField('email')}
              onBlur={() => setFocusField(null)}
              required
            />
          </div>
          <div>
            <label style={lbl}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inputStyle('password'), paddingRight: 44 }}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusField('password')}
                onBlur={() => setFocusField(null)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 4, display: 'flex',
                  color: showPassword ? '#E8B84B' : 'rgba(255,255,255,0.5)',
                  transition: 'color 200ms',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '10px 14px', color: '#ef4444', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>
              {error}
            </div>
          )}
          <button type="submit" style={{
            width: '100%',
            padding: '14px',
            background: loading ? '#555' : '#E8B84B',
            border: 'none',
            borderRadius: 9,
            color: '#000',
            fontFamily: '"Syne", sans-serif',
            fontSize: 13,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            letterSpacing: '0.5px',
            transition: 'opacity 0.2s',
          }}>
            {loading ? 'Signing in...' : 'SIGN IN'}
          </button>
        </form>
      </div>

      {/* Create account link */}
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <a
          href="/signup"
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: 12,
            fontFamily: '"Space Grotesk", sans-serif',
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#E8B84B')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
        >
          Create account →
        </a>
      </div>
    </>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: '#030303',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'auto',
    }}>
      {/* ÔöÇÔöÇ Full-screen background image ÔöÇÔöÇ */}
      <img
        src="/login-bg.jpg"
        alt=""
        style={{
          position: 'fixed', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: 0.4,
        }}
      />

      {/* ÔöÇÔöÇ WiBill wordmark - centered across full screen ÔöÇÔöÇ */}
      <div style={{
        position: 'relative', zIndex: 2,
        textAlign: 'center',
        paddingTop: 40,
        paddingBottom: 60,
      }}>
        <img
          src="/logos/wibill-wb-monogram-192.png"
          alt="WiBill"
          style={{ width: 160, height: 160, objectFit: 'contain', display: 'inline-block' }}
        />
        <div style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 11,
          color: '#555',
          marginTop: 8,
          letterSpacing: '2.5px',
          fontWeight: 600,
        }}>
          ISP MANAGEMENT PORTAL
        </div>
      </div>

      {/* ÔöÇÔöÇ Form ÔöÇÔöÇ */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%',
        maxWidth: 420,
        padding: '0 20px',
        paddingBottom: 60,
      }}>
        {formSection}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #E8B84B', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
