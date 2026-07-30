'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, CreditCard, Paintbrush, Radio, Globe, Zap, Wifi, LayoutTemplate, Shield } from 'lucide-react'

const gold = '#E8B84B'
const cream = '#EDEBE6'
const dim = '#777'
const cardBg = 'rgba(10,10,10,0.65)'
const cardBorder = 'rgba(255,255,255,0.06)'

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      color: cream,
      fontFamily: "'Space Grotesk', sans-serif",
      overflowX: 'hidden',
    }}>
      {/* Background texture */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'url(/landing-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.2,
      }} />

      {/* ═══════ NAV ═══════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 40px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(0,0,0,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '0.5px solid rgba(255,255,255,0.06)' : '0.5px solid transparent',
        transition: 'all 0.3s',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{
            fontFamily: "'Instrument Serif', serif",
            fontStyle: 'italic', fontSize: 24, color: cream,
          }}>WiBill</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/login" style={{
            color: dim, fontSize: 13, fontFamily: "'Inter', sans-serif",
            fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = cream)}
            onMouseLeave={e => (e.currentTarget.style.color = dim)}
          >Login</Link>
          <Link href="/signup" style={{
            background: gold, color: '#000', padding: '8px 18px',
            borderRadius: 8, fontSize: 12, fontFamily: "'Syne', sans-serif",
            fontWeight: 700, letterSpacing: '0.5px', textDecoration: 'none',
          }}>REQUEST ACCESS</Link>
        </div>
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section style={{
        position: 'relative', zIndex: 1,
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 40px 60px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: "'Instrument Serif', serif",
          fontStyle: 'italic',
          fontSize: 'clamp(72px, 12vw, 140px)',
          fontWeight: 400,
          color: cream,
          letterSpacing: '-0.04em',
          lineHeight: 0.9,
          textShadow: '0 0 100px rgba(237,235,230,0.06)',
          margin: 0,
        }}>WiBill</h1>

        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 16,
          color: dim,
          maxWidth: 380,
          lineHeight: 1.5,
          marginTop: 16,
          marginBottom: 36,
        }}>
          Hotspot billing for Kenyan ISPs.<br />
          Captive portals. M-Pesa. MikroTik.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: gold, color: '#000',
            padding: '13px 28px', borderRadius: 10,
            fontSize: 13, fontFamily: "'Syne', sans-serif",
            fontWeight: 700, letterSpacing: '0.5px', textDecoration: 'none',
          }}>GET STARTED <ArrowRight size={15} /></Link>
          <Link href="/login" style={{
            color: dim, padding: '13px 20px', borderRadius: 10,
            fontSize: 13, fontFamily: "'Inter', sans-serif",
            fontWeight: 500, textDecoration: 'none',
            border: '0.5px solid rgba(255,255,255,0.08)',
            transition: 'color 0.2s, border-color 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = cream; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.color = dim; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
          >Log in</Link>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '60px 40px 80px', maxWidth: 1000, margin: '0 auto',
      }}>
        <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {[
            { icon: Wifi, title: 'Connect your MikroTik', desc: 'One script. No manual config. Your router talks to WiBill automatically.' },
            { icon: LayoutTemplate, title: 'Design your portal', desc: 'Pick a template, brand it with your logo and colors. Done in minutes.' },
            { icon: CreditCard, title: 'Go live and get paid', desc: 'M-Pesa built in, voucher codes, live session tracking.' },
          ].map((step, i) => (
            <div key={step.title} className="step-card" style={{
              background: 'rgba(14,14,14,0.8)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '0.5px solid rgba(255,255,255,0.06)',
              borderRadius: 16,
              padding: '32px 24px',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'default',
              transition: 'transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.borderColor = 'rgba(232,184,75,0.2)'
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4), 0 0 30px rgba(232,184,75,0.04)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {/* Gradient glow on hover */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(232,184,75,0.3), transparent)',
                opacity: 0,
                transition: 'opacity 0.25s ease',
              }} className="step-glow" />

              {/* Step number — subtle, not a label */}
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 48, fontWeight: 500,
                color: 'rgba(232,184,75,0.07)',
                lineHeight: 1, marginBottom: 8,
                userSelect: 'none',
              }}>{String(i + 1).padStart(2, '0')}</div>

              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(232,184,75,0.08)',
                border: '0.5px solid rgba(232,184,75,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
                transition: 'background 0.25s ease, border-color 0.25s ease',
              }}>
                <step.icon size={20} color={gold} strokeWidth={1.8} />
              </div>
              <h3 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 17, fontWeight: 700, margin: '0 0 8px', color: cream,
              }}>{step.title}</h3>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13, color: dim, lineHeight: 1.55, margin: 0,
              }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '0 40px 80px', maxWidth: 1000, margin: '0 auto',
      }}>
        <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Wide card */}
          <div className="feature-card" style={{
            background: 'rgba(14,14,14,0.8)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: '28px 24px',
            gridColumn: 'span 2',
            cursor: 'default',
            transition: 'transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px)'
              e.currentTarget.style.borderColor = 'rgba(232,184,75,0.2)'
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(232,184,75,0.08)',
                border: '0.5px solid rgba(232,184,75,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Paintbrush size={20} color={gold} strokeWidth={1.8} />
              </div>
              <div>
                <h3 style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 18, fontWeight: 700, margin: '0 0 6px', color: cream,
                }}>Branded Captive Portals</h3>
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13, color: dim, lineHeight: 1.55, margin: '0 0 10px',
                }}>Your brand, your portal. Custom logos, colors, and layouts — no design skills needed. Every ISP gets their own identity.</p>
                <div style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 10, color: '#444',
                }}>HTML5 · mobile-first · 2s load</div>
              </div>
            </div>
          </div>

          {/* 2×2 */}
          {[
            { icon: CreditCard, title: 'M-Pesa Payments', desc: 'STK Push. User enters number, confirms on phone, internet opens. Receipts tracked automatically.', tech: 'Daraja API · real-time callback' },
            { icon: Wifi, title: 'MikroTik Integration', desc: 'One script on your router. Users appear and disappear automatically based on payment.', tech: 'RouterOS API · hotspot user mgmt' },
            { icon: Zap, title: 'Voucher System', desc: 'Prepaid codes for walk-in customers. Print, sell, done. No phone needed.', tech: 'batch generate · expiry · MAC-bound' },
            { icon: Radio, title: 'Live Monitoring', desc: 'Watch sessions in real time. Know who is online, when they expire, and what they paid.', tech: '60s poll interval · auto-expire' },
          ].map((item) => (
            <div key={item.title} className="feature-card" style={{
              background: 'rgba(14,14,14,0.8)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '0.5px solid rgba(255,255,255,0.06)',
              borderRadius: 16,
              padding: '24px 22px',
              cursor: 'default',
              transition: 'transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.borderColor = 'rgba(232,184,75,0.2)'
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(232,184,75,0.08)',
                  border: '0.5px solid rgba(232,184,75,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <item.icon size={18} color={gold} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: cream,
                  }}>{item.title}</h3>
                  <p style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12, color: dim, lineHeight: 1.55, margin: '0 0 10px',
                  }}>{item.desc}</p>
                  <div style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 10, color: '#444',
                  }}>{item.tech}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '0 40px 80px', textAlign: 'center',
      }}>
        <h2 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 28, fontWeight: 700,
          letterSpacing: '-0.02em', margin: '0 0 10px',
        }}>
          Get your portal live this week.
        </h2>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 14, color: dim,
          maxWidth: 380, margin: '0 auto 28px', lineHeight: 1.6,
        }}>
          Connect your MikroTik. Brand your portal. Start billing through M-Pesa.
        </p>
        <Link href="/signup" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: gold, color: '#000',
          padding: '13px 32px', borderRadius: 10,
          fontSize: 13, fontFamily: "'Syne', sans-serif",
          fontWeight: 700, letterSpacing: '0.5px', textDecoration: 'none',
        }}>REQUEST ACCESS <ArrowRight size={15} /></Link>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer style={{
        position: 'relative', zIndex: 1,
        borderTop: '0.5px solid rgba(255,255,255,0.06)',
        padding: '28px 40px',
        maxWidth: 1000, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: "'Instrument Serif', serif",
          fontStyle: 'italic', fontSize: 18, color: cream,
        }}>WiBill</span>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10, color: '#333',
        }}>&copy; {new Date().getFullYear()} WiBill</span>
        <a href="mailto:support@wi-bill.com" style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 11, color: '#444', textDecoration: 'none',
        }}>support@wi-bill.com</a>
      </footer>

      {/* ── Mobile ── */}
      <style>{`
        @media (max-width: 900px) {
          nav { padding: 0 20px !important; }
          section { padding-left: 20px !important; padding-right: 20px !important; }
        }
        @media (max-width: 700px) {
          .steps-grid, .features-grid { grid-template-columns: 1fr !important; }
          .feature-card { grid-column: span 1 !important; }
          footer { flex-direction: column; gap: 12px; text-align: center; }
        }
      `}</style>
    </div>
  )
}
