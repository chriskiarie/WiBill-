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

  // Live clock
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

  // Ticker rotation
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

  // Revenue tick
  useEffect(() => {
    const id = setInterval(() => {
      setRevenue(r => r + [50, 100, 100, 150][Math.floor(Math.random() * 4)])
    }, 5500)
    return () => clearInterval(id)
  }, [])

  // Sessions tick
  useEffect(() => {
    const id = setInterval(() => {
      setSessions(s => {
        const next = s + (Math.random() > 0.45 ? 1 : -1)
        return next < 60 ? 60 : next
      })
    }, 7000)
    return () => clearInterval(id)
  }, [])

  // Pricing card 3D tilt
  const handlePricingMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = pricingCardRef.current
    const sheen = pricingSheenRef.current
    if (!card || !sheen) return
    const r = card.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    const rotateY = ((x / r.width) - 0.5) * 10
    const rotateX = ((y / r.height) - 0.5) * -10
    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.015)`
    sheen.style.setProperty('--mx', (x / r.width) * 100 + '%')
    sheen.style.setProperty('--my', (y / r.height) * 100 + '%')
  }

  const handlePricingLeave = () => {
    const card = pricingCardRef.current
    if (card) card.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)'
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
      {/* Background texture */}
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
        padding: '22px 48px', maxWidth: 1200, margin: '0 auto',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{
            fontFamily: "'Instrument Serif', serif",
            fontStyle: 'italic', fontSize: 22, color: cream,
            letterSpacing: '0.01em',
          }}>WiBill</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 30, fontSize: 14, color: dim }}>
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

        {/* Scroll cue */}
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
          {/* Title bar */}
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

          {/* Window body */}
          <div style={{ padding: '20px 22px 18px' }}>
            {/* Header */}
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

            {/* Stat grid */}
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

            {/* Ticker row */}
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

            {/* Fade teaser */}
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

        {/* 3D Pricing card */}
        <div style={{ perspective: 1200, display: 'flex', justifyContent: 'center' }}>
          <div
            ref={pricingCardRef}
            onMouseMove={handlePricingMove}
            onMouseLeave={handlePricingLeave}
            style={{
              maxWidth: 420, width: '100%',
              background: 'linear-gradient(165deg, #131211, #0c0b0a 60%)',
              border: '0.5px solid #2c2924', borderRadius: 18,
              padding: '40px 34px', textAlign: 'center',
              position: 'relative', overflow: 'hidden',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              boxShadow: '0 20px 50px -25px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(239,159,39,0.08) inset',
              cursor: 'default',
            }}
          >
            {/* Sheen overlay */}
            <div
              ref={pricingSheenRef}
              style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(circle 220px at var(--mx, 50%) var(--my, 50%), rgba(239,159,39,0.16), transparent 70%)',
              }}
            />

            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 52, color: gold, marginBottom: 6, transform: 'translateZ(24px)' }}>
              5<span style={{ fontSize: 20, color: dim }}>%</span>
            </div>
            <div style={{ fontSize: 14, color: dim, marginBottom: 24, transform: 'translateZ(24px)' }}>of what you collect. That&apos;s the whole model.</div>
            <div style={{ textAlign: 'left', fontSize: 13.5, color: dim, lineHeight: 2.1, marginBottom: 28, transform: 'translateZ(24px)' }}>
              {['No monthly minimum', 'No setup fee', 'No per-client charge', 'Pay only when you get paid'].map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Check size={14} color={teal} /> {item}
                </div>
              ))}
            </div>
            <Link href="/signup" style={{
              display: 'block', width: '100%', padding: 13,
              background: gold, border: 'none', borderRadius: 10,
              color: goldText, fontWeight: 600, fontSize: 14,
              fontFamily: "'Inter', sans-serif", cursor: 'pointer',
              textDecoration: 'none', textAlign: 'center',
              transform: 'translateZ(24px)',
            }}>Get started <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} /></Link>
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
          <div style={{
            position: 'relative', width: 200, height: 200, background: bg3,
            borderRadius: 30, overflow: 'hidden',
            boxShadow: '0 7px 29px 0px rgba(0,0,0,0.45)',
            border: '2px solid rgba(239,159,39,0.18)',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundColor: '#2a1a05',
              backgroundImage: 'linear-gradient(135deg, #1a1105 0%, #6b3d0a 45%, #ef9f27 100%)',
            }} />
            <div style={{
              position: 'absolute', right: '50%', bottom: '50%',
              transform: 'translate(50%, 50%)',
              fontSize: '1.2em', fontWeight: 500,
              color: '#fff', letterSpacing: 2, zIndex: 1,
              fontFamily: "'Instrument Serif', serif", fontStyle: 'italic',
            }}>WiBill</div>
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

      {/* ── Animations & Mobile ── */}
      <style>{`
        @keyframes pulseFade{0%,100%{opacity:1;}50%{opacity:0.35;}}
        @keyframes scrollPulse{0%{opacity:0.2;}50%{opacity:1;}100%{opacity:0.2;}}
        @media (max-width: 720px) {
          nav { padding: 18px 20px !important; }
          .nav-links { gap: 14px; }
          section { padding-left: 20px !important; padding-right: 20px !important; }
          .stat-grid, .steps, .feature-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
