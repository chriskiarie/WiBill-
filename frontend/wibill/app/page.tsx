'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Wifi, CreditCard, LayoutTemplate, Radio, Paintbrush,
  ChevronRight, ArrowRight, Zap, Globe, Shield
} from 'lucide-react'

const gold = '#E8B84B'
const green = '#22c55e'
const text = '#f0f0f0'
const dim = '#777'
const faint = '#333'
const border = '#1a1a1a'
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
      color: text,
      fontFamily: "'Space Grotesk', sans-serif",
      overflowX: 'hidden',
    }}>
      {/* ── Background texture ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'url(/landing-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.25,
      }} />

      {/* ── Nav ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 40px',
        height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(0,0,0,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px) saturate(160%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px) saturate(160%)' : 'none',
        borderBottom: scrolled ? '0.5px solid rgba(255,255,255,0.06)' : '0.5px solid transparent',
        transition: 'background 0.3s, border-color 0.3s, backdrop-filter 0.3s',
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
          <span style={{
            fontFamily: "'Instrument Serif', serif",
            fontStyle: 'italic',
            fontSize: 28,
            color: '#EDEBE6',
            letterSpacing: '-0.02em',
          }}>Wi</span>
          <span style={{
            fontFamily: "'Instrument Serif', serif",
            fontStyle: 'italic',
            fontSize: 28,
            color: gold,
            letterSpacing: '-0.02em',
          }}>Bill</span>
        </Link>

        {/* Right links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/login" style={{
            color: dim,
            fontSize: 13,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = text)}
            onMouseLeave={e => (e.currentTarget.style.color = dim)}
          >Login</Link>
          <Link href="/signup" style={{
            background: gold,
            color: '#000',
            padding: '9px 20px',
            borderRadius: 8,
            fontSize: 12,
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            letterSpacing: '0.5px',
            textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >REQUEST ACCESS</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        position: 'relative', zIndex: 1,
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '100px 40px 80px',
      }}>
        <div style={{
          maxWidth: 1200,
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 60,
          alignItems: 'center',
        }}>
          {/* Left — Copy */}
          <div>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(232,184,75,0.08)',
              border: '0.5px solid rgba(232,184,75,0.2)',
              borderRadius: 20,
              padding: '6px 14px',
              marginBottom: 24,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: green }} />
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: gold,
                letterSpacing: '0.8px',
                fontWeight: 500,
              }}>NOW ONBOARDING ISPs</span>
            </div>

            <h1 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1.08,
              margin: 0,
              letterSpacing: '-0.03em',
              color: text,
            }}>
              Hotspot billing<br />
              for ISPs,{' '}
              <span style={{ color: gold }}>done right.</span>
            </h1>

            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 16,
              color: dim,
              lineHeight: 1.6,
              marginTop: 20,
              maxWidth: 420,
            }}>
              Branded captive portals, M-Pesa payments, and automated session management — built for independent ISPs in Kenya. Honest billing, beautiful portals, zero hassle.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 12, marginTop: 36, alignItems: 'center' }}>
              <Link href="/signup" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: gold,
                color: '#000',
                padding: '14px 28px',
                borderRadius: 10,
                fontSize: 13,
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                letterSpacing: '0.5px',
                textDecoration: 'none',
                transition: 'opacity 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >REQUEST ACCESS <ArrowRight size={16} /></Link>

              <Link href="/login" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                color: dim,
                padding: '14px 20px',
                borderRadius: 10,
                fontSize: 13,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                textDecoration: 'none',
                border: '0.5px solid rgba(255,255,255,0.08)',
                transition: 'color 0.2s, border-color 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.color = text; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
                onMouseLeave={e => { e.currentTarget.style.color = dim; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
              >Log in</Link>
            </div>

            {/* Trust strip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 24,
              marginTop: 48,
              paddingTop: 24,
              borderTop: '0.5px solid rgba(255,255,255,0.06)',
            }}>
              {[
                { n: 'M-Pesa Built In', icon: CreditCard },
                { n: 'No Lock-in', icon: Shield },
                { n: 'Live in Minutes', icon: Zap },
              ].map((item) => (
                <div key={item.n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <item.icon size={14} color={gold} strokeWidth={2} />
                  <span style={{ fontSize: 11, color: dim, fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{item.n}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Phone frame mockup */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: 300,
              borderRadius: 32,
              border: '2px solid rgba(255,255,255,0.08)',
              background: '#0a0a0a',
              overflow: 'hidden',
              boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(232,184,75,0.06)',
              position: 'relative',
            }}>
              {/* Notch */}
              <div style={{
                width: 120, height: 28, background: '#000',
                borderRadius: '0 0 16px 16px',
                margin: '0 auto',
                position: 'relative', zIndex: 2,
              }} />

              {/* Screen */}
              <div style={{ padding: 0, position: 'relative' }}>
                <img
                  src="/login-bg.jpg"
                  alt="WiBill portal preview"
                  style={{
                    width: '100%',
                    height: 460,
                    objectFit: 'cover',
                    display: 'block',
                    filter: 'brightness(0.7) saturate(1.1)',
                  }}
                />
                {/* Overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                  padding: '24px 20px',
                }}>
                  <div style={{
                    fontFamily: "'Instrument Serif', serif",
                    fontStyle: 'italic',
                    fontSize: 28,
                    color: '#EDEBE6',
                    lineHeight: 1,
                  }}>Premium Hotel</div>
                  <div style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 9,
                    color: gold,
                    marginTop: 4,
                    letterSpacing: '1.5px',
                  }}>CONNECTED • 50 USERS ONLINE</div>
                  {/* Fake package cards */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    {['1Hr — KSh 20', '24Hr — KSh 100'].map((p) => (
                      <div key={p} style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.08)',
                        border: '0.5px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        padding: '10px 8px',
                        textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 10, color: '#EDEBE6', fontWeight: 600 }}>{p}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile responsive override */}
        <style>{`
          @media (max-width: 900px) {
            section > div:first-child {
              grid-template-columns: 1fr !important;
              text-align: center;
            }
          }
        `}</style>
      </section>

      {/* ── How It Works ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '100px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            color: gold,
            letterSpacing: '2px',
            fontWeight: 500,
            marginBottom: 12,
          }}>HOW IT WORKS</div>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: 0,
          }}>Three steps to go live.</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
          {[
            {
              num: '01',
              icon: Wifi,
              title: 'Connect your MikroTik',
              desc: 'One script. No manual config. Your router talks to WiBill automatically.',
            },
            {
              num: '02',
              icon: LayoutTemplate,
              title: 'Design your portal',
              desc: 'Pick a template, brand it with your logo and colors. Done in minutes.',
            },
            {
              num: '03',
              icon: CreditCard,
              title: 'Go live and get paid',
              desc: 'M-Pesa built in, voucher codes, live session tracking. Start earning today.',
            },
          ].map((step) => (
            <div key={step.num} style={{
              background: cardBg,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `0.5px solid ${cardBorder}`,
              borderRadius: 16,
              padding: '36px 28px',
              position: 'relative',
            }}>
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 40,
                fontWeight: 500,
                color: 'rgba(232,184,75,0.12)',
                lineHeight: 1,
                marginBottom: 16,
              }}>{step.num}</div>
              <div style={{
                width: 44, height: 44,
                borderRadius: 12,
                background: 'rgba(232,184,75,0.08)',
                border: '0.5px solid rgba(232,184,75,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
              }}>
                <step.icon size={20} color={gold} strokeWidth={1.8} />
              </div>
              <h3 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 18,
                fontWeight: 700,
                margin: '0 0 10px',
              }}>{step.title}</h3>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                color: dim,
                lineHeight: 1.6,
                margin: 0,
              }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 40px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            color: gold,
            letterSpacing: '2px',
            fontWeight: 500,
            marginBottom: 12,
          }}>BUILT FOR ISPs</div>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: 0,
          }}>Everything you need. Nothing you don't.</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            {
              icon: Paintbrush,
              title: 'Branded Captive Portals',
              desc: 'Your brand, your portal. Custom logos, colors, and layouts — no design skills needed.',
              wide: true,
            },
            {
              icon: CreditCard,
              title: 'M-Pesa + Voucher Codes',
              desc: 'STK Push payments and prepaid vouchers. Zero manual reconciliation.',
            },
            {
              icon: Radio,
              title: 'Live Session Monitoring',
              desc: 'Watch sessions in real time. Know who is online, when they expire.',
            },
            {
              icon: Globe,
              title: 'Multi-Router Support',
              desc: 'Manage multiple MikroTik routers from one dashboard. Scale without limits.',
            },
            {
              icon: Zap,
              title: 'Automated Billing',
              desc: 'Sessions start on payment, expire on time. No manual intervention. No disputes.',
            },
          ].map((feat) => (
            <div key={feat.title} style={{
              background: cardBg,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `0.5px solid ${cardBorder}`,
              borderRadius: 14,
              padding: '28px 24px',
              display: 'flex', gap: 16, alignItems: 'flex-start',
              gridColumn: feat.wide ? 'span 2' : undefined,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(232,184,75,0.08)',
                border: '0.5px solid rgba(232,184,75,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <feat.icon size={18} color={gold} strokeWidth={1.8} />
              </div>
              <div>
                <h3 style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  margin: '0 0 6px',
                }}>{feat.title}</h3>
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  color: dim,
                  lineHeight: 1.55,
                  margin: 0,
                }}>{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '60px 40px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 12,
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(255,255,255,0.06)',
          borderRadius: 12,
          padding: '14px 28px',
        }}>
          <div style={{ display: 'flex', gap: -4 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: '50%',
                background: `rgba(232,184,75,${0.15 + i * 0.05})`,
                border: '1.5px solid #000',
                marginLeft: i > 0 ? -8 : 0,
              }} />
            ))}
          </div>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: dim,
          }}>
            Currently onboarding ISPs across{' '}
            <span style={{ color: gold, fontWeight: 600 }}>Kenya</span>
          </span>
        </div>
      </section>

      {/* ── Final CTA Band ── */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '80px 40px',
      }}>
        <div style={{
          maxWidth: 800,
          margin: '0 auto',
          textAlign: 'center',
          background: cardBg,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `0.5px solid ${cardBorder}`,
          borderRadius: 20,
          padding: '56px 40px',
        }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: '0 0 12px',
          }}>
            Ready to{' '}
            <span style={{ color: gold }}>transform</span>{' '}
            your hotspot?
          </h2>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            color: dim,
            marginBottom: 32,
            maxWidth: 460,
            margin: '0 auto 32px',
            lineHeight: 1.6,
          }}>
            Join ISPs across Kenya using WiBill to bill fairly, brand beautifully, and grow their WiFi business.
          </p>
          <Link href="/signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: gold,
            color: '#000',
            padding: '14px 32px',
            borderRadius: 10,
            fontSize: 13,
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            letterSpacing: '0.5px',
            textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >REQUEST ACCESS <ArrowRight size={16} /></Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        position: 'relative', zIndex: 1,
        borderTop: '0.5px solid rgba(255,255,255,0.06)',
        padding: '32px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: 1100,
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontFamily: "'Instrument Serif', serif",
            fontStyle: 'italic',
            fontSize: 18,
            color: '#EDEBE6',
          }}>Wi</span>
          <span style={{
            fontFamily: "'Instrument Serif', serif",
            fontStyle: 'italic',
            fontSize: 18,
            color: gold,
          }}>Bill</span>
        </div>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          color: '#444',
        }}>
          &copy; {new Date().getFullYear()} WiBill. All rights reserved.
        </span>
        <a href="mailto:support@wi-bill.com" style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          color: '#555',
          textDecoration: 'none',
          transition: 'color 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = gold)}
          onMouseLeave={e => (e.currentTarget.style.color = '#555')}
        >support@wi-bill.com</a>
      </footer>

      {/* ── Mobile responsive ── */}
      <style>{`
        @media (max-width: 900px) {
          nav { padding: 0 20px !important; }
          section { padding-left: 20px !important; padding-right: 20px !important; }
        }
        @media (max-width: 700px) {
          section > div { grid-template-columns: 1fr !important; }
          section h1 { font-size: 34px !important; }
          section h2 { font-size: 26px !important; }
          footer { flex-direction: column; gap: 12px; text-align: center; }
        }
      `}</style>
    </div>
  )
}
