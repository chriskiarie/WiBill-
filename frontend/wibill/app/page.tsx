'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronRight, Check } from 'lucide-react'

const gold = '#E8B84B'
const goldText = '#3a2000'
const cream = '#EDEBE6'
const dim = '#a8a69f'
const mute = '#6b6963'
const teal = '#5DCAA5'
const bg2 = '#0c0b0a'
const bg3 = '#141310'
const line = '#201f1b'
const lineSoft = '#1c1b18'

const tickerLines = [
  "M. Achieng paid Ksh 50 · just now",
  "J. Otieno reconnected — no login needed · 12s ago",
  "B. Wanjiru paid Ksh 100 · 40s ago",
  "New device recognized · returning customer · 1m ago",
  "S. Kamau paid Ksh 50 · 2m ago",
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [scrollFade, setScrollFade] = useState(1)
  const [tickerIdx, setTickerIdx] = useState(0)
  const [tickerSwap, setTickerSwap] = useState(false)
  const [revenue, setRevenue] = useState(14200)
  const [sessions, setSessions] = useState(86)
  const [windowTime, setWindowTime] = useState('')
  const [pricingHovered, setPricingHovered] = useState(false)
  const [contactHovered, setContactHovered] = useState(false)
  const pricingCardRef = useRef<HTMLDivElement>(null)
  const pricingSheenRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40)
      setScrollFade(Math.max(0, 1 - window.scrollY / 250))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setWindowTime(
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0')
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setTickerSwap(true)
      setTimeout(() => {
        setTickerIdx(prev => (prev + 1) % tickerLines.length)
        setTickerSwap(false)
      }, 350)
    }, 4200)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setRevenue(r => r + [50, 100, 100, 150][Math.floor(Math.random() * 4)])
    }, 5500)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setSessions(s => {
        const next = s + (Math.random() > 0.45 ? 1 : -1)
        return next < 60 ? 60 : next
      })
    }, 7000)
    return () => clearInterval(id)
  }, [])

  const handlePricingMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = pricingCardRef.current
    const sheen = pricingSheenRef.current
    if (!card || !sheen) return
    const r = card.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    const rotateY = ((x / r.width) - 0.5) * 8
    const rotateX = ((y / r.height) - 0.5) * -8
    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`
    sheen.style.setProperty('--mx', (x / r.width) * 100 + '%')
    sheen.style.setProperty('--my', (y / r.height) * 100 + '%')
  }

  const handlePricingLeave = () => {
    const card = pricingCardRef.current
    if (card) card.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)'
    setPricingHovered(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050505',
      color: cream,
      fontFamily: "'Inter', sans-serif",
      overflowX: 'hidden',
      WebkitFontSmoothing: 'antialiased',
    }}>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'url(/landing-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.15,
      }} />

      {/* ═══════ NAV ═══════ */}
      <nav style={{
        position: 'relative', zIndex: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 48px', maxWidth: 1200, margin: '0 auto',
      }}>
        {/* WiBill wordmark badge */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logos/wibill-wb-monogram-180.png" alt="WiBill" style={{ height: 48, width: 48, objectFit: 'contain', display: 'block' }} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 30, fontSize: 14, color: dim }}>
          <a href="#how" style={{ color: dim, textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = cream)}
            onMouseLeave={e => (e.currentTarget.style.color = dim)}
          >How it works</a>
          <a href="#features" style={{ color: dim, textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = cream)}
            onMouseLeave={e => (e.currentTarget.style.color = dim)}
          >Features</a>
          <a href="#pricing" style={{ color: dim, textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = cream)}
            onMouseLeave={e => (e.currentTarget.style.color = dim)}
          >Pricing</a>
          <Link href="/signup" style={{
            background: gold, border: 'none', color: goldText,
            fontWeight: 600, borderRadius: 10, padding: '10px 18px', fontSize: 14,
            cursor: 'pointer', fontFamily: "'Inter', sans-serif", textDecoration: 'none',
          }}>Get started</Link>
        </div>
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section style={{
        position: 'relative', zIndex: 1,
        textAlign: 'center',
        padding: '72px 28px 56px',
        maxWidth: 760, margin: '0 auto',
      }}>
        <img src="/logos/wibill-wordmark-badge-512.png" alt="WiBill" style={{ width: 200, height: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto 16px' }} />
        <h1 style={{
          fontFamily: "'Instrument Serif', serif",
          fontStyle: 'italic', fontWeight: 500,
          fontSize: 'clamp(40px, 6vw, 64px)',
          lineHeight: 1.12, color: cream,
          letterSpacing: '-0.015em',
          marginBottom: 22,
        }}>Billing, finally<br />done right.</h1>

        <p style={{
          fontSize: 15.5, color: dim,
          maxWidth: 480, margin: '0 auto 30px',
          lineHeight: 1.65,
        }}>
          Self-serve MikroTik billing for Kenyan ISPs. No sales calls, no quotes, no waiting — just the best version of what&apos;s out there.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link href="/signup" style={{
            background: gold, border: 'none', color: goldText,
            fontWeight: 600, borderRadius: 10, padding: '12px 22px', fontSize: 14,
            cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            display: 'inline-flex', alignItems: 'center', gap: 6,
            textDecoration: 'none', transition: 'opacity 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >Get started <ArrowRight size={14} /></Link>
          <a href="#how" style={{
            background: 'transparent', border: '0.5px solid #38372f', color: cream,
            borderRadius: 10, padding: '12px 22px', fontSize: 14,
            cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            display: 'inline-flex', alignItems: 'center', gap: 6,
            textDecoration: 'none', transition: 'border-color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#555')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#38372f')}
          >See how it works <ChevronRight size={14} /></a>
        </div>

        <div style={{
          marginTop: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          opacity: scrollFade, transition: 'opacity 0.5s ease',
          color: mute, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
        }}>
          <span>Scroll</span>
          <div style={{
            width: 1, height: 32, marginTop: 4,
            background: `linear-gradient(to bottom, ${gold}, transparent)`,
            animation: 'scrollPulse 1.8s ease-in-out infinite',
          }} />
        </div>
      </section>

      {/* ═══════ DASHBOARD PREVIEW ═══════ */}
      <div style={{ padding: '0 40px 64px', maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{
          background: bg2, border: '0.5px solid #262420', borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.03)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 16px',
            borderBottom: '0.5px solid #1c1b18',
          }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#a8524a' }} />
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#a8823f' }} />
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#4a8f5c' }} />
            </div>
            <div style={{
              flex: 1, textAlign: 'center',
              fontFamily: "'DM Mono', monospace",
              fontSize: 11, color: '#6b6963',
              background: bg3, borderRadius: 6, padding: '4px 12px', margin: '0 40px',
            }}>wi-bill.com/dashboard</div>
            <div style={{
              fontSize: 10, color: teal, letterSpacing: '0.06em', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: teal, animation: 'pulseFade 2.2s ease-in-out infinite' }} />
              LIVE
            </div>
          </div>

          <div style={{ padding: '20px 22px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#c9c7c0' }}>
                <span style={{ fontSize: 16 }}>📶</span> Good morning, Nuru Net
              </div>
              <div style={{
                fontSize: 10, color: mute,
                fontFamily: "'DM Mono', monospace",
              }}>{windowTime}</div>
              <div style={{
                fontSize: 11, color: teal,
                display: 'flex', alignItems: 'center', gap: 5,
                background: '#04342c', border: '0.5px solid #085041',
                borderRadius: 6, padding: '4px 10px',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: teal }} />
                Network operational
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div style={{ background: bg3, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 500 }}>Today&apos;s revenue</div>
                <div style={{ fontSize: 20, fontFamily: "'DM Mono', monospace", color: gold, transition: 'transform 0.2s ease' }}>Ksh {revenue.toLocaleString()}</div>
              </div>
              <div style={{ background: bg3, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 500 }}>Active sessions</div>
                <div style={{ fontSize: 20, fontFamily: "'DM Mono', monospace", color: cream }}>{sessions}</div>
              </div>
              <div style={{ background: bg3, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 500 }}>Failed today</div>
                <div style={{ fontSize: 20, fontFamily: "'DM Mono', monospace", color: cream }}>0</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '0 2px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: teal, flexShrink: 0, animation: 'pulseFade 1.8s ease-in-out infinite' }} />
              <div style={{
                fontSize: 11.5, color: dim,
                fontFamily: "'DM Mono', monospace",
                transition: 'opacity 0.35s ease, transform 0.35s ease',
                opacity: tickerSwap ? 0 : 1,
                transform: tickerSwap ? 'translateY(3px)' : 'translateY(0)',
              }}>{tickerLines[tickerIdx]}</div>
            </div>

            <div style={{
              marginTop: 12, height: 56, borderRadius: 10,
              background: bg3, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: `linear-gradient(to bottom, transparent 0%, ${bg2} 100%)`,
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section id="how" style={{ position: 'relative', zIndex: 1, padding: '64px 28px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ fontSize: 12, color: gold, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', marginBottom: 12, fontWeight: 600 }}>How it works</div>
        <h2 style={{
          fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 500,
          fontSize: 32, textAlign: 'center', marginBottom: 14, color: cream,
        }}>Three steps. No sales call.</h2>
        <p style={{ textAlign: 'center', color: dim, fontSize: 14.5, maxWidth: 480, margin: '0 auto 44px', lineHeight: 1.6 }}>
          From signup to your first M-Pesa payment, without waiting on anyone.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {[
            { num: '01', title: 'Sign up', desc: 'Create your account and brand your captive portal — logo, colors, name. Takes minutes.' },
            { num: '02', title: 'Connect your router', desc: 'Paste one command into your MikroTik\u2019s terminal. No app to install, no file to drag around.', cmd: '/tool fetch url="mikrotik.wi-bill.com/onboard/{token}"...' },
            { num: '03', title: 'Get paid', desc: 'Your customers connect, see the network\u2019s live, and pay via M-Pesa. You watch it happen.' },
          ].map((step) => (
            <div key={step.num}>
              <div style={{ fontFamily: "'DM Mono', monospace", color: gold, fontSize: 13, marginBottom: 10 }}>{step.num}</div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: cream }}>{step.title}</h3>
              <p style={{ fontSize: 13, color: dim, lineHeight: 1.6 }}>{step.desc}</p>
              {step.cmd && (
                <div style={{
                  marginTop: 12, background: bg3, borderRadius: 8,
                  padding: '10px 12px',
                  fontFamily: "'DM Mono', monospace", fontSize: 11.5, color: '#c9c7c0',
                  overflowX: 'auto', whiteSpace: 'nowrap',
                }}>{step.cmd}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ WHY WIBILL ═══════ */}
      <section id="features" style={{ position: 'relative', zIndex: 1, padding: '64px 28px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ fontSize: 12, color: gold, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', marginBottom: 12, fontWeight: 600 }}>Why WiBill</div>
        <h2 style={{
          fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 500,
          fontSize: 32, textAlign: 'center', marginBottom: 14, color: cream,
        }}>Built around trust, not just billing.</h2>
        <p style={{ textAlign: 'center', color: dim, fontSize: 14.5, maxWidth: 480, margin: '0 auto 44px', lineHeight: 1.6 }}>
          Every feature here exists to answer one question: why should a customer believe the internet is worth paying for today.
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1,
          background: lineSoft, borderRadius: 14, overflow: 'hidden',
        }}>
          {[
            { icon: '◈', title: 'Outage transparency', desc: 'Customers see network status before they pay, not after — the single biggest source of billing disputes, gone.' },
            { icon: '◇', title: 'Instant reconnect', desc: 'Returning devices skip login entirely — recognized by MAC, not memory. No re-typing a phone number every visit.' },
            { icon: '▣', title: 'A portal that looks like you', desc: 'Your logo, your colors, your name — customers see your brand, not a generic billing page bolted onto your WiFi.' },
            { icon: '◎', title: 'Self-serve, always', desc: 'No quote request, no sales call, ever. Sign up and you\u2019re billing customers the same day.' },
          ].map((item) => (
            <div key={item.title} style={{ background: '#050505', padding: 28 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: '#412402',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16, fontSize: 16, color: gold,
              }}>{item.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: cream }}>{item.title}</h3>
              <p style={{ fontSize: 13, color: dim, lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ PRICING ═══════ */}
      <section id="pricing" style={{ position: 'relative', zIndex: 1, padding: '64px 28px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ fontSize: 12, color: gold, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', marginBottom: 12, fontWeight: 600 }}>Pricing</div>
        <h2 style={{
          fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 500,
          fontSize: 32, textAlign: 'center', marginBottom: 14, color: cream,
        }}>One number. No surprises.</h2>
        <p style={{ textAlign: 'center', color: dim, fontSize: 14.5, maxWidth: 480, margin: '0 auto 44px', lineHeight: 1.6 }}>
          No monthly fee. No per-client charge. No minimum.
        </p>

        <div style={{ perspective: 1200, display: 'flex', justifyContent: 'center' }}>
          <div
            ref={pricingCardRef}
            className={`pricing-card ${pricingHovered ? 'pricing-card--hovered' : ''}`}
            onMouseMove={handlePricingMove}
            onMouseEnter={() => setPricingHovered(true)}
            onMouseLeave={handlePricingLeave}
          >
            {/* Sheen overlay */}
            <div ref={pricingSheenRef} className="pricing-sheen" />

            {/* The big 5% — always rendered, scales to 0 on hover */}
            <div className="pricing-veil">
              <span className="pricing-veil-num">5<span className="pricing-veil-pct">%</span></span>
              <span className="pricing-veil-hint">Hover to see the model</span>
            </div>

            {/* The revealed content — rotates in on hover */}
            <div className="pricing-content">
              <div className="pricing-rate">5<span className="pricing-rate-pct">%</span></div>
              <div className="pricing-label">of what you collect. That&apos;s the whole model.</div>
              <div className="pricing-list">
                {['No monthly minimum', 'No setup fee', 'No per-client charge', 'Pay only when you get paid'].map((item) => (
                  <div key={item} className="pricing-list-item">
                    <Check size={14} color={teal} /> {item}
                  </div>
                ))}
              </div>
              <Link href="/signup" className="pricing-cta">Get started <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ CONNECT ═══════ */}
      <section id="connect" style={{ position: 'relative', zIndex: 1, padding: '64px 28px 20px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ fontSize: 12, color: gold, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', marginBottom: 12, fontWeight: 600 }}>Connect</div>
        <h2 style={{
          fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 500,
          fontSize: 32, textAlign: 'center', marginBottom: 14, color: cream,
        }}>Find us online.</h2>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 36 }}>
          <div
            className={`connect-card ${contactHovered ? 'connect-card--hovered' : ''}`}
            onMouseEnter={() => setContactHovered(true)}
            onMouseLeave={() => setContactHovered(false)}
          >
            <div className="connect-bg" />
            <div className="connect-voice">Say hello</div>
            <div className="connect-logo"><img src="/logos/wibill-wordmark-badge-512.png" alt="WiBill" style={{ height: 56, width: 'auto', objectFit: 'contain', display: 'block' }} /></div>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
              <div className="connect-box connect-box1">
                <span className="c-icon">
                  <svg viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" className="c-svg">
                    <path d="M 9.9980469 3 C 6.1390469 3 3 6.1419531 3 10.001953 L 3 20.001953 C 3 23.860953 6.1419531 27 10.001953 27 L 20.001953 27 C 23.860953 27 27 23.858047 27 19.998047 L 27 9.9980469 C 27 6.1390469 23.858047 3 19.998047 3 L 9.9980469 3 z M 22 7 C 22.552 7 23 7.448 23 8 C 23 8.552 22.552 9 22 9 C 21.448 9 21 8.552 21 8 C 21 7.448 21.448 7 22 7 z M 15 9 C 18.309 9 21 11.691 21 15 C 21 18.309 18.309 21 15 21 C 11.691 21 9 18.309 9 15 C 9 11.691 11.691 9 15 9 z M 15 11 A 4 4 0 0 0 11 15 A 4 4 0 0 0 15 19 A 4 4 0 0 0 19 15 A 4 4 0 0 0 15 11 z" />
                  </svg>
                </span>
              </div>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
              <div className="connect-box connect-box2">
                <span className="c-icon">
                  <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className="c-svg">
                    <path d="M459.37 151.716c.325 4.548.325 9.097.325 13.645 0 138.72-105.583 298.558-298.558 298.558-59.452 0-114.68-17.219-161.137-47.106 8.447.974 16.568 1.299 25.34 1.299 49.055 0 94.213-16.568 130.274-44.832-46.132-.975-84.792-31.188-98.112-72.772 6.498.974 12.995 1.624 19.818 1.624 9.421 0 18.843-1.3 27.614-3.573-48.081-9.747-84.143-51.98-84.143-102.985v-1.299c13.969 7.797 30.214 12.67 47.431 13.319-28.264-18.843-46.781-51.005-46.781-87.391 0-19.492 5.197-37.36 14.294-52.954 51.655 63.675 129.3 105.258 216.365 109.807-1.624-7.797-2.599-15.918-2.599-24.04 0-57.828 46.782-104.934 104.934-104.934 30.213 0 57.502 12.67 76.67 33.137 23.715-4.548 46.456-13.32 66.599-25.34-7.798 24.366-24.366 44.833-46.132 57.827 21.117-2.273 41.584-8.122 60.426-16.243-14.292 20.791-32.161 39.308-52.628 54.253z" />
                  </svg>
                </span>
              </div>
            </a>
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer">
              <div className="connect-box connect-box3">
                <span className="c-icon">
                  <svg viewBox="0 0 640 512" xmlns="http://www.w3.org/2000/svg" className="c-svg">
                    <path d="M524.531,69.836a1.5,1.5,0,0,0-.764-.7A485.065,485.065,0,0,0,404.081,32.03a1.816,1.816,0,0,0-1.923.91,337.461,337.461,0,0,0-14.9,30.6,447.848,447.848,0,0,0-134.426,0,309.541,309.541,0,0,0-15.135-30.6,1.89,1.89,0,0,0-1.924-.91A483.689,483.689,0,0,0,116.085,69.137a1.712,1.712,0,0,0-.788.676C39.068,183.651,18.186,294.69,28.43,404.354a2.016,2.016,0,0,0,.765,1.375A487.666,487.666,0,0,0,176.02,479.918a1.9,1.9,0,0,0,2.063-.676A348.2,348.2,0,0,0,208.12,430.4a1.86,1.86,0,0,0-1.019-2.588,321.173,321.173,0,0,1-45.868-21.853,1.885,1.885,0,0,1-.185-3.126c3.082-2.309,6.166-4.711,9.109-7.137a1.819,1.819,0,0,1,1.9-.256c96.229,43.917,200.41,43.917,295.5,0a1.812,1.812,0,0,1,1.924.233c2.944,2.426,6.027,4.851,9.132,7.16a1.884,1.884,0,0,1-.162,3.126,301.407,301.407,0,0,1-45.89,21.83,1.875,1.875,0,0,0-1,2.611,391.055,391.055,0,0,0,30.014,48.815,1.864,1.864,0,0,0,2.063.7A486.048,486.048,0,0,0,610.7,405.729a1.882,1.882,0,0,0,.765-1.352C623.729,277.594,590.933,167.465,524.531,69.836ZM222.491,337.58c-28.972,0-52.844-26.587-52.844-59.239S193.056,219.1,222.491,219.1c29.665,0,53.306,26.82,52.843,59.239C275.334,310.993,251.924,337.58,222.491,337.58Zm195.38,0c-28.971,0-52.843-26.587-52.843-59.239S388.437,219.1,417.871,219.1c29.667,0,53.307,26.82,52.844,59.239C470.715,310.993,447.538,337.58,417.871,337.58Z" />
                  </svg>
                </span>
              </div>
            </a>
            <div className="connect-box connect-box4" />
          </div>
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <div style={{ textAlign: 'center', padding: '80px 28px 100px', position: 'relative', zIndex: 1 }}>
        <h2 style={{
          fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 500,
          fontSize: 34, marginBottom: 28, maxWidth: 520, margin: '0 auto 28px',
        }}>Ready to bill customers who trust you?</h2>
        <Link href="/signup" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: gold, color: goldText,
          padding: '14px 28px', borderRadius: 10,
          fontSize: 15, fontWeight: 600, fontFamily: "'Inter', sans-serif",
          textDecoration: 'none', transition: 'opacity 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >Get started <ArrowRight size={15} /></Link>
      </div>

      {/* ═══════ FOOTER ═══════ */}
      <footer style={{
        position: 'relative', zIndex: 1,
        borderTop: '0.5px solid #1c1b18',
        padding: '28px 48px', textAlign: 'center',
        fontSize: 12, color: mute,
      }}>
        &copy; {new Date().getFullYear()} WiBill. Built for Kenyan ISPs.
      </footer>

      {/* ═══════ CSS ANIMATIONS ═══════ */}
      <style>{`
        @keyframes pulseFade{0%,100%{opacity:1;}50%{opacity:0.35;}}
        @keyframes scrollPulse{0%{opacity:0.2;}50%{opacity:1;}100%{opacity:0.2;}}

        /* ── PRICING CARD ── */
        .pricing-card {
          max-width: 420px;
          width: 100%;
          height: 400px;
          padding: 34px;
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          background: rgba(20, 19, 16, 0.62);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          text-align: center;
          border: 1px solid rgba(239,159,39,0.15);
          transform-style: preserve-3d;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          box-shadow: 0 20px 50px -25px rgba(0,0,0,0.7);
          cursor: default;
        }
        .pricing-card::before {
          content: '';
          height: 110%;
          width: 110%;
          position: absolute;
          top: -5%;
          left: -5%;
          z-index: -1;
          background: linear-gradient(135deg, #1a1105 0%, #6b3d0a 45%, rgba(239,159,39,0.55) 100%);
          filter: blur(30px);
          border-radius: 20px;
          opacity: 0;
          transition: opacity 0.5s ease;
        }
        .pricing-card--hovered::before {
          opacity: 0.22;
        }
        .pricing-card--hovered {
          box-shadow: 0 30px 70px -25px rgba(0,0,0,0.8), 0 0 40px -12px rgba(239,159,39,0.1);
        }

        .pricing-sheen {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          opacity: 0;
          transition: opacity 0.3s ease;
          background: radial-gradient(circle 220px at var(--mx, 50%) var(--my, 50%), rgba(239,159,39,0.1), transparent 70%);
          z-index: 1;
        }
        .pricing-card--hovered .pricing-sheen { opacity: 1; }

        /* The big 5% veil */
        .pricing-veil {
          color: #fff;
          width: 100%;
          margin: 0;
          position: absolute;
          top: 50%;
          left: 0;
          text-align: center;
          pointer-events: none;
          transform: scale(1) translateY(-50%);
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
          z-index: 3;
        }
        .pricing-card--hovered .pricing-veil {
          transform: scale(0) translateY(-50%);
        }
        .pricing-veil-num {
          font-family: 'Instrument Serif', serif;
          font-style: italic;
          font-size: 120px;
          font-weight: 500;
          color: ${gold};
          letter-spacing: 2px;
          display: block;
          line-height: 1;
        }
        .pricing-veil-pct {
          font-size: 56px;
          color: ${dim};
          vertical-align: top;
        }
        .pricing-veil-hint {
          display: block;
          margin-top: 16px;
          font-size: 10.5px;
          color: ${mute};
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-family: 'Inter', sans-serif;
          transition: opacity 0.3s ease;
        }
        .pricing-card--hovered .pricing-veil-hint {
          opacity: 0;
        }

        /* The revealed content — rotates in */
        .pricing-content {
          opacity: 0;
          transform: rotate(45deg) scale(0);
          transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.1s,
                      opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.1s;
          width: 100%;
          z-index: 2;
        }
        .pricing-card--hovered .pricing-content {
          opacity: 1;
          transform: rotate(0deg) scale(1);
        }
        .pricing-rate {
          font-family: 'DM Mono', monospace;
          font-size: 52px;
          color: ${gold};
          margin-bottom: 6px;
        }
        .pricing-rate-pct {
          font-size: 20px;
          color: ${dim};
        }
        .pricing-label {
          font-size: 14px;
          color: ${dim};
          margin-bottom: 24px;
        }
        .pricing-list {
          text-align: left;
          font-size: 13.5px;
          color: ${dim};
          line-height: 2.1;
          margin-bottom: 28px;
        }
        .pricing-list-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pricing-cta {
          display: block;
          width: 100%;
          padding: 13px;
          background: ${gold};
          border: none;
          border-radius: 10px;
          color: ${goldText};
          font-weight: 600;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          text-decoration: none;
          text-align: center;
        }
        .pricing-cta:hover {
          opacity: 0.85;
        }

        /* ── CONNECT CARD ── */
        .connect-card {
          position: relative;
          width: 260px;
          height: 260px;
          background: ${bg3};
          border-radius: 30px;
          overflow: hidden;
          box-shadow: 0 7px 29px 0px rgba(0,0,0,0.45);
          transition: all 1s ease-in-out;
          border: 2px solid rgba(239,159,39,0.18);
        }
        .connect-card--hovered {
          transform: scale(1.06);
        }
        .connect-bg {
          position: absolute;
          inset: 0;
          background-color: #2a1a05;
          background-image: linear-gradient(135deg, #1a1105 0%, #6b3d0a 45%, ${gold} 100%);
        }
        .connect-voice {
          position: absolute;
          bottom: 26px;
          left: 0;
          width: 100%;
          z-index: 2;
          text-align: center;
          opacity: 1;
          transition: opacity 0.5s cubic-bezier(0.22,1,0.36,1);
          font-family: 'Instrument Serif', serif;
          font-style: italic;
          color: rgba(255,255,255,0.85);
          font-size: 16px;
          letter-spacing: 1px;
          pointer-events: none;
        }
        .connect-card--hovered .connect-voice {
          opacity: 0;
          pointer-events: none;
        }
        .connect-logo {
          position: absolute;
          right: 50%;
          bottom: 50%;
          transform: translate(50%, 50%);
          transition: transform 0.6s cubic-bezier(0.22,1,0.36,1), letter-spacing 0.6s cubic-bezier(0.22,1,0.36,1);
          font-size: 1.5em;
          font-weight: 500;
          color: #fff;
          letter-spacing: 3px;
          z-index: 1;
          font-family: 'Instrument Serif', serif;
          font-style: italic;
        }
        .connect-card--hovered .connect-logo {
          transform: translate(84px, -62px);
          letter-spacing: 0;
        }
        .c-icon {
          display: inline-block;
          width: 20px;
          height: 20px;
        }
        .c-svg {
          fill: rgba(255,255,255,0.8);
          width: 100%;
          transition: all 0.5s ease-in-out;
        }
        .connect-box {
          position: absolute;
          padding: 10px;
          text-align: right;
          background: rgba(20,19,16,0.4);
          border-top: 2px solid rgba(239,159,39,0.5);
          border-right: 1px solid rgba(239,159,39,0.3);
          border-radius: 10% 13% 42% 0%/10% 12% 75% 0%;
          box-shadow: -7px 7px 29px 0px rgba(0,0,0,0.4);
          transform-origin: bottom left;
          transition: all 1s ease-in-out;
        }
        .connect-box::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          opacity: 0;
          transition: all 0.5s ease-in-out;
        }
        .connect-box:hover .c-svg {
          fill: #fff;
        }
        .connect-box1 {
          width: 70%;
          height: 70%;
          bottom: -70%;
          left: -70%;
        }
        .connect-box1::before {
          background: radial-gradient(circle at 30% 107%, #ffe6a8 0%, #ffe6a8 5%, ${gold} 60%, #a8524a 90%);
        }
        .connect-box1:hover::before { opacity: 1; }
        .connect-box1:hover .c-icon .c-svg { filter: drop-shadow(0 0 5px #ffe6a8); }

        .connect-box2 {
          width: 50%;
          height: 50%;
          bottom: -50%;
          left: -50%;
          transition-delay: 0.2s;
        }
        .connect-box2::before {
          background: radial-gradient(circle at 30% 107%, #d9a24a 0%, #8a5a1a 90%);
        }
        .connect-box2:hover::before { opacity: 1; }
        .connect-box2:hover .c-icon .c-svg { filter: drop-shadow(0 0 5px #d9a24a); }

        .connect-box3 {
          width: 30%;
          height: 30%;
          bottom: -30%;
          left: -30%;
          transition-delay: 0.4s;
        }
        .connect-box3::before {
          background: radial-gradient(circle at 30% 107%, #6b4a1f 0%, #2a1a05 90%);
        }
        .connect-box3:hover::before { opacity: 1; }
        .connect-box3:hover .c-icon .c-svg { filter: drop-shadow(0 0 5px #6b4a1f); }

        .connect-box4 {
          width: 10%;
          height: 10%;
          bottom: -10%;
          left: -10%;
          transition-delay: 0.6s;
        }

        .connect-card--hovered .connect-box {
          bottom: -1px;
          left: -1px;
        }

        @media (max-width: 720px) {
          nav { padding: 18px 20px !important; }
          .nav-links { gap: 14px; }
          section { padding-left: 20px !important; padding-right: 20px !important; }
          .stat-grid, .steps, .feature-grid { grid-template-columns: 1fr !important; }
          .pricing-veil { display: none; }
          .pricing-content { opacity: 1; transform: none; }
          .pricing-card { height: auto; padding: 30px 20px; }
          .connect-voice { display: none; }
        }
      `}</style>
    </div>
  )
}
