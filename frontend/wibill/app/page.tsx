'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const green = '#00A651'
const greenBright = '#00C853'
const amber = '#E8B44F'
const cream = '#EDEBE6'
const dim = '#666'
const cardBg = 'rgba(10,10,10,0.65)'
const cardBorder = 'rgba(255,255,255,0.06)'

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [portalVisible, setPortalVisible] = useState(false)
  const [terminalLine, setTerminalLine] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Animate the captive portal popup appearing
  useEffect(() => {
    const t = setTimeout(() => setPortalVisible(true), 800)
    return () => clearTimeout(t)
  }, [])

  // Animate terminal status lines sequentially
  useEffect(() => {
    if (!portalVisible) return
    const lines = [1, 2, 3, 4, 5]
    lines.forEach((_, i) => {
      setTimeout(() => setTerminalLine(i + 1), 1600 + i * 400)
    })
  }, [portalVisible])

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

      {/* ── Nav ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 40px', height: 64,
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
            fontStyle: 'italic', fontSize: 26, color: cream,
            letterSpacing: '-0.02em',
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
            background: green, color: '#000', padding: '9px 20px',
            borderRadius: 8, fontSize: 12, fontFamily: "'Syne', sans-serif",
            fontWeight: 700, letterSpacing: '0.5px', textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >REQUEST ACCESS</Link>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* HERO — full-screen, centered wordmark + real captive portal  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', zIndex: 1,
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '100px 40px 80px',
        gap: 0,
      }}>
        {/* The wordmark — the main event */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
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
        </div>

        {/* Tagline */}
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 16,
          color: dim,
          textAlign: 'center',
          maxWidth: 400,
          lineHeight: 1.5,
          marginTop: 0,
          marginBottom: 40,
        }}>
          Hotspot billing for Kenyan ISPs.<br />
          Captive portals. M-Pesa. MikroTik. One dashboard.
        </p>

        {/* ── The real thing: iOS captive portal popup ── */}
        <div style={{
          position: 'relative',
          width: '100%', maxWidth: 380,
          transform: portalVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.96)',
          opacity: portalVisible ? 1 : 0,
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {/* iOS popup card */}
          <div style={{
            background: 'rgba(28,28,30,0.92)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderRadius: 16,
            border: '0.5px solid rgba(255,255,255,0.12)',
            overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 1px rgba(255,255,255,0.1)',
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px 12px',
              borderBottom: '0.5px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 10, fontWeight: 600, color: dim,
                textTransform: 'uppercase', letterSpacing: '0.5px',
                marginBottom: 8,
              }}>Captured Network</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 17, fontWeight: 600, color: cream,
                  }}>MTAANInet</div>
                  <div style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11, color: green, marginTop: 2,
                  }}>● secured · open</div>
                </div>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `rgba(0,166,81,0.12)`,
                  border: '0.5px solid rgba(0,166,81,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
                    <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                    <circle cx="12" cy="20" r="1"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Status lines — terminal style */}
            <div style={{ padding: '14px 20px' }}>
              {[
                { label: 'portal', value: 'wi-bill.com', delay: 1 },
                { label: 'router', value: 'MikroTik hAP ac²', delay: 2 },
                { label: 'payment', value: 'M-Pesa STK Push', delay: 3 },
                { label: 'setup', value: '< 5 min', delay: 4 },
                { label: 'status', value: 'ready', delay: 5, highlight: true },
              ].map((line) => (
                <div key={line.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '5px 0',
                  opacity: terminalLine >= line.delay ? 1 : 0,
                  transform: terminalLine >= line.delay ? 'translateX(0)' : 'translateX(-8px)',
                  transition: 'all 0.3s ease',
                }}>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11, color: '#555',
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>{line.label}</span>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 12,
                    color: line.highlight ? green : '#999',
                    fontWeight: line.highlight ? 600 : 400,
                  }}>{line.value}</span>
                </div>
              ))}
            </div>

            {/* CTA button */}
            <div style={{ padding: '0 20px 16px' }}>
              <div style={{
                background: green,
                borderRadius: 10,
                padding: '13px',
                textAlign: 'center',
                fontFamily: "'Syne', sans-serif",
                fontSize: 13, fontWeight: 700,
                color: '#000',
                letterSpacing: '0.5px',
              }}>Buy Internet · KES 20</div>
            </div>
          </div>

          {/* Glow behind */}
          <div style={{
            position: 'absolute', inset: -40,
            background: `radial-gradient(ellipse at center, rgba(0,166,81,0.06) 0%, transparent 70%)`,
            zIndex: -1, pointerEvents: 'none',
          }} />
        </div>

        {/* CTAs below */}
        <div style={{
          display: 'flex', gap: 12, marginTop: 40, alignItems: 'center',
        }}>
          <Link href="/signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: green, color: '#000',
            padding: '14px 28px', borderRadius: 10,
            fontSize: 13, fontFamily: "'Syne', sans-serif",
            fontWeight: 700, letterSpacing: '0.5px', textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >GET STARTED <ArrowRight size={16} /></Link>
          <Link href="/login" style={{
            color: dim, padding: '14px 20px', borderRadius: 10,
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

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* HOW IT WORKS — terminal output aesthetic                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '100px 40px', maxWidth: 900, margin: '0 auto',
      }}>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10, color: green, letterSpacing: '2px',
          marginBottom: 40,
        }}>$ wibill --setup</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { cmd: 'router connect', detail: 'MikroTik hAP ac² via API', result: 'connected', ip: '192.168.88.1' },
            { cmd: 'portal deploy', detail: 'Branded captive portal', result: 'live', ip: 'wi-bill.com/portal/mtaaninet' },
            { cmd: 'billing activate', detail: 'M-Pesa Daraja STK Push', result: 'ready', ip: 'KES 20 — 24Hr packages' },
          ].map((step, i) => (
            <div key={step.cmd} style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 20,
              padding: '24px 0',
              borderBottom: i < 2 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
              alignItems: 'start',
            }}>
              <div>
                <div style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 14, color: cream, fontWeight: 500,
                  marginBottom: 4,
                }}>
                  <span style={{ color: green }}>&gt;</span> {step.cmd}
                </div>
                <div style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12, color: '#555',
                }}>{step.detail}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 12, color: green, fontWeight: 500,
                }}>{step.result}</div>
                <div style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11, color: '#444', marginTop: 2,
                }}>{step.ip}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* WHAT YOU GET — specifics, not features                      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '80px 40px 100px', maxWidth: 1100, margin: '0 auto',
      }}>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10, color: green, letterSpacing: '2px',
          marginBottom: 40,
        }}>$ cat platform.spec</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            {
              title: 'Captive Portals',
              desc: 'Per-ISP branded. Your logo, your colors, your packages. Not a template — your identity.',
              tech: 'HTML5 · mobile-first · 2s load',
            },
            {
              title: 'M-Pesa Payments',
              desc: 'STK Push. User enters number, confirms on phone, internet opens. Receipts tracked automatically.',
              tech: 'Daraja API · real-time callback',
            },
            {
              title: 'MikroTik Integration',
              desc: 'One script on your router. Users appear and disappear automatically based on payment.',
              tech: 'RouterOS API · hotspot user mgmt',
            },
            {
              title: 'Voucher System',
              desc: 'Prepaid codes for walk-in customers. Print, sell, done. No phone needed.',
              tech: 'batch generate · expiry · MAC-bound',
            },
          ].map((item) => (
            <div key={item.title} style={{
              background: cardBg,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `0.5px solid ${cardBorder}`,
              borderRadius: 14,
              padding: '28px 24px',
            }}>
              <h3 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 16, fontWeight: 700,
                margin: '0 0 8px', color: cream,
              }}>{item.title}</h3>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13, color: dim, lineHeight: 1.55,
                margin: '0 0 12px',
              }}>{item.desc}</p>
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10, color: '#444',
                letterSpacing: '0.3px',
              }}>{item.tech}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* STATUS BAR — router-style indicators                       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '0 40px',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap',
          padding: '20px 0',
          borderTop: '0.5px solid rgba(255,255,255,0.04)',
          borderBottom: '0.5px solid rgba(255,255,255,0.04)',
        }}>
          {[
            { label: 'network', value: 'online', color: green },
            { label: 'uptime', value: '99.7%', color: cream },
            { label: 'isp', value: 'Kenya-wide', color: '#999' },
            { label: 'session', value: '< 5 min setup', color: '#999' },
          ].map((item) => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10, color: '#444',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>{item.label}</span>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 12, color: item.color, fontWeight: 500,
              }}>{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* PRICING — real numbers, amber accent                        */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '80px 40px', maxWidth: 800, margin: '0 auto',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10, color: green, letterSpacing: '2px',
          marginBottom: 24,
        }}>$ wibill --pricing</div>

        <h2 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em',
          margin: '0 0 8px',
        }}>
          We take <span style={{ color: amber }}>10%</span> of every transaction.
        </h2>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 14, color: dim, lineHeight: 1.6,
          maxWidth: 500, margin: '0 auto 40px',
        }}>
          You keep 90%. No monthly fees. No setup charges. We earn when you earn.
        </p>

        <div style={{
          display: 'inline-flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {[
            { amount: 'KES 50,000', period: '/month revenue', yours: 'KES 45,000', platform: 'KES 5,000' },
            { amount: 'KES 200,000', period: '/month revenue', yours: 'KES 180,000', platform: 'KES 20,000' },
            { amount: 'KES 500,000', period: '/month revenue', yours: 'KES 450,000', platform: 'KES 50,000' },
          ].map((tier) => (
            <div key={tier.amount} style={{
              background: cardBg,
              backdropFilter: 'blur(16px)',
              border: `0.5px solid ${cardBorder}`,
              borderRadius: 14,
              padding: '24px 28px',
              minWidth: 200,
              textAlign: 'left',
            }}>
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 22, color: amber, fontWeight: 500,
                marginBottom: 4,
              }}>{tier.amount}</div>
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 11, color: '#555', marginBottom: 16,
              }}>{tier.period}</div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                paddingTop: 12, borderTop: '0.5px solid rgba(255,255,255,0.06)',
              }}>
                <div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#444' }}>you keep</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: green, fontWeight: 500 }}>{tier.yours}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#444' }}>platform</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: '#666' }}>{tier.platform}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* CTA                                                         */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '80px 40px', textAlign: 'center',
      }}>
        <h2 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 28, fontWeight: 700,
          letterSpacing: '-0.02em', margin: '0 0 12px',
        }}>
          Start billing today.
        </h2>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 14, color: dim, marginBottom: 32,
          maxWidth: 400, margin: '0 auto 32px', lineHeight: 1.6,
        }}>
          Connect your MikroTik. Brand your portal. Go live in under five minutes.
        </p>
        <Link href="/signup" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: green, color: '#000',
          padding: '14px 32px', borderRadius: 10,
          fontSize: 13, fontFamily: "'Syne', sans-serif",
          fontWeight: 700, letterSpacing: '0.5px', textDecoration: 'none',
          transition: 'opacity 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >REQUEST ACCESS <ArrowRight size={16} /></Link>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* FOOTER                                                      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <footer style={{
        position: 'relative', zIndex: 1,
        borderTop: '0.5px solid rgba(255,255,255,0.06)',
        padding: '32px 40px',
        maxWidth: 1100, margin: '0 auto',
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
          transition: 'color 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = green)}
          onMouseLeave={e => (e.currentTarget.style.color = '#444')}
        >support@wi-bill.com</a>
      </footer>

      {/* ── Mobile ── */}
      <style>{`
        @media (max-width: 900px) {
          nav { padding: 0 20px !important; }
          section { padding-left: 20px !important; padding-right: 20px !important; }
        }
        @media (max-width: 700px) {
          section > div { grid-template-columns: 1fr !important; }
          footer { flex-direction: column; gap: 12px; text-align: center; }
        }
      `}</style>
    </div>
  )
}
