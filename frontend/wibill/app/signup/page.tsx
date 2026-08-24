'use client'
import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const gold = '#E8B84B'
const text = '#f0f0f0'
const dim = '#777'

const inp: React.CSSProperties = {
  width: '100%',
  background: '#0a0a0a',
  border: '0.5px solid #141414',
  borderRadius: 7,
  padding: '12px 14px',
  color: '#f0f0f0',
  fontFamily: "'DM Mono', monospace",
  fontSize: 13,
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
}
const inpFocus: React.CSSProperties = {
  ...inp,
  borderColor: gold,
  boxShadow: '0 0 0 3px rgba(232,184,75,0.12)',
}
const lbl: React.CSSProperties = {
  fontSize: 10,
  color: '#666',
  fontWeight: 700,
  letterSpacing: '0.6px',
  marginBottom: 6,
  display: 'block',
  textTransform: 'uppercase',
  fontFamily: "'Inter', sans-serif",
}

export default function SignupPage() {
  const [focusField, setFocusField] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const [ispName, setIspName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [hotspotCount, setHotspotCount] = useState('')
  const [howHeard, setHowHeard] = useState('')

  const inputStyle = (name: string): React.CSSProperties =>
    focusField === name ? inpFocus : inp

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isp_name: ispName,
          contact_name: contactName,
          phone,
          email,
          hotspot_count: hotspotCount ? parseInt(hotspotCount) : null,
          how_heard: howHeard || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || 'Something went wrong')
      }
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050505',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'auto',
    }}>
      {/* Background texture */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'url(/landing-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.15,
      }} />

      {/* Back to home */}
      <Link href="/" style={{
        position: 'fixed', top: 20, left: 24, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 6,
        color: dim,
        fontSize: 12,
        fontFamily: "'Inter', sans-serif",
        fontWeight: 500,
        textDecoration: 'none',
        transition: 'color 0.2s',
      }}
        onMouseEnter={e => (e.currentTarget.style.color = text)}
        onMouseLeave={e => (e.currentTarget.style.color = dim)}
      >
        <ArrowLeft size={14} /> Back to home
      </Link>

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%',
        maxWidth: 440,
        padding: '0 20px',
      }}>
        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
            <img
              src="/logos/wibill-wb-monogram-192.png"
              alt="WiBill"
              style={{ width: 180, height: 180, objectFit: 'contain', display: 'block' }}
            />
          </Link>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 28,
            color: '#f0f0f0',
            margin: '20px 0 0',
            letterSpacing: '-0.01em',
          }}>Request access</h1>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 10,
            color: '#555',
            marginTop: 8,
            letterSpacing: '2px',
            fontWeight: 600,
          }}>
            ISP MANAGEMENT PORTAL
          </div>
        </div>

        <div style={{
          background: '#0a0a0a',
          border: '0.5px solid #141414',
          borderRadius: 11,
          padding: 32,
          boxShadow: '0 20px 60px -15px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.03)',
        }}>
          {submitted ? (
            /* ── Success state ── */
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(34,197,94,0.1)',
                border: '0.5px solid rgba(34,197,94,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <CheckCircle2 size={28} color="#22c55e" />
              </div>
              <h2 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                margin: '0 0 10px',
              }}>Thanks, {contactName.split(' ')[0] || 'there'}!</h2>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                color: dim,
                lineHeight: 1.6,
                margin: '0 0 28px',
              }}>
                We've received your request. We'll review it and get in touch within 24 hours.
              </p>
              <Link href="/" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                color: gold,
                fontSize: 12,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                textDecoration: 'none',
              }}>
                <ArrowLeft size={13} /> Back to home
              </Link>
            </div>
          ) : (
            /* ── Form ── */
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>ISP / BUSINESS NAME *</label>
                <input
                  style={inputStyle('ispName')}
                  type="text"
                  value={ispName}
                  onChange={e => setIspName(e.target.value)}
                  onFocus={() => setFocusField('ispName')}
                  onBlur={() => setFocusField(null)}
                  placeholder="e.g. Vertex WiFi"
                  required
                />
              </div>
              <div>
                <label style={lbl}>CONTACT NAME *</label>
                <input
                  style={inputStyle('contactName')}
                  type="text"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  onFocus={() => setFocusField('contactName')}
                  onBlur={() => setFocusField(null)}
                  placeholder="Your full name"
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>PHONE / WHATSAPP *</label>
                  <input
                    style={inputStyle('phone')}
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onFocus={() => setFocusField('phone')}
                    onBlur={() => setFocusField(null)}
                    placeholder="+254..."
                    required
                  />
                </div>
                <div>
                  <label style={lbl}>EMAIL *</label>
                  <input
                    style={inputStyle('email')}
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocusField('email')}
                    onBlur={() => setFocusField(null)}
                    placeholder="you@isp.co.ke"
                    required
                  />
                </div>
              </div>
              <div>
                <label style={lbl}>HOTSPOTS / ROUTERS</label>
                <input
                  style={inputStyle('hotspotCount')}
                  type="number"
                  min="0"
                  value={hotspotCount}
                  onChange={e => setHotspotCount(e.target.value)}
                  onFocus={() => setFocusField('hotspotCount')}
                  onBlur={() => setFocusField(null)}
                  placeholder="e.g. 5"
                />
              </div>
              <div>
                <label style={lbl}>HOW DID YOU HEAR ABOUT US? (OPTIONAL)</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={howHeard}
                    onChange={e => setHowHeard(e.target.value)}
                    onFocus={() => setFocusField('howHeard')}
                    onBlur={() => setFocusField(null)}
                    style={{
                      ...inputStyle('howHeard'),
                      paddingRight: 32,
                      cursor: 'pointer',
                      color: howHeard ? '#f0f0f0' : '#555',
                    }}
                  >
                    <option value="" style={{ background: '#0a0a0a', color: '#555' }}>Select an option...</option>
                    <option value="Google" style={{ background: '#0a0a0a' }}>Google</option>
                    <option value="WhatsApp group" style={{ background: '#0a0a0a' }}>WhatsApp group</option>
                    <option value="Friend / colleague" style={{ background: '#0a0a0a' }}>Friend / colleague</option>
                    <option value="Social media" style={{ background: '#0a0a0a' }}>Social media</option>
                    <option value="Existing ISP recommendation" style={{ background: '#0a0a0a' }}>Existing ISP recommendation</option>
                    <option value="Trade show / event" style={{ background: '#0a0a0a' }}>Trade show / event</option>
                    <option value="Other" style={{ background: '#0a0a0a' }}>Other</option>
                  </select>
                  <div style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    pointerEvents: 'none', color: '#555', fontSize: 10,
                  }}>▼</div>
                </div>
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '0.5px solid rgba(239,68,68,0.2)',
                  borderRadius: 7,
                  padding: '10px 14px',
                  color: '#ef4444',
                  fontSize: 12,
                  fontFamily: "'DM Mono', monospace",
                }}>{error}</div>
              )}

              <button type="submit" disabled={loading} style={{
                width: '100%',
                padding: '14px',
                background: loading ? '#555' : gold,
                border: 'none',
                borderRadius: 9,
                color: '#000',
                fontFamily: "'Syne', sans-serif",
                fontSize: 13,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                letterSpacing: '0.5px',
                transition: 'opacity 0.2s',
              }}>
                {loading ? 'Submitting...' : 'Submit request →'}
              </button>

              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                color: '#444',
                textAlign: 'center',
                margin: 0,
                lineHeight: 1.5,
              }}>
                No payment required. We'll set up your account after a quick call.
              </p>
            </form>
          )}
        </div>

        {/* Login link */}
        {!submitted && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#555' }}>
              Already have an account?{' '}
            </span>
            <Link href="/login" style={{
              color: gold,
              fontSize: 12,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              textDecoration: 'none',
            }}>Sign in</Link>
          </div>
        )}
      </div>
    </div>
  )
}
