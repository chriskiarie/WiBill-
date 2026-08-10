'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Rocket, Wifi, Smartphone, ChevronRight } from 'lucide-react'

const gold = '#E8B84B'
const cream = '#EDEBE6'
const dim = '#777'

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <a href="#features" style={{
            color: dim, fontSize: 13, fontFamily: "'Inter', sans-serif",
            fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = cream)}
            onMouseLeave={e => (e.currentTarget.style.color = dim)}
          >Features</a>
          <a href="#pricing" style={{
            color: dim, fontSize: 13, fontFamily: "'Inter', sans-serif",
            fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = cream)}
            onMouseLeave={e => (e.currentTarget.style.color = dim)}
          >Pricing</a>
          <Link href="/signup" style={{
            background: gold, color: '#000', padding: '9px 16px',
            borderRadius: 10, fontSize: 12, fontFamily: "'Syne', sans-serif",
            fontWeight: 700, letterSpacing: '0.5px', textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >Get started</Link>
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
          fontSize: 'clamp(36px, 5vw, 48px)',
          fontWeight: 400,
          color: cream,
          letterSpacing: '-0.02em',
          lineHeight: 1.15,
          maxWidth: 600,
          margin: '0 auto 20px',
        }}>Billing your customers trust, live in one afternoon.</h1>

        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 15,
          color: dim,
          maxWidth: 440,
          lineHeight: 1.6,
          margin: '0 auto 36px',
        }}>
          Self-serve MikroTik billing for Kenyan ISPs. No sales call — sign up, connect your router, take your first M-Pesa payment today.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: gold, color: '#000',
            padding: '13px 28px', borderRadius: 10,
            fontSize: 13, fontFamily: "'Syne', sans-serif",
            fontWeight: 700, letterSpacing: '0.5px', textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >Get started <ArrowRight size={15} /></Link>
          <a href="#how-it-works" style={{
            color: dim, padding: '13px 20px', borderRadius: 10,
            fontSize: 13, fontFamily: "'Inter', sans-serif",
            fontWeight: 500, textDecoration: 'none',
            border: '0.5px solid rgba(255,255,255,0.08)',
            transition: 'color 0.2s, border-color 0.2s',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
            onMouseEnter={e => { e.currentTarget.style.color = cream; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.color = dim; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
          >See how it works <ChevronRight size={14} /></a>
        </div>
      </section>

      {/* ═══════ DASHBOARD PREVIEW ═══════ */}
      <section id="how-it-works" style={{
        position: 'relative', zIndex: 1,
        padding: '0 40px 80px', maxWidth: 800, margin: '0 auto',
      }}>
        {/* Browser chrome */}
        <div style={{
          borderRadius: 14,
          border: '1px solid #262420',
          boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          background: '#0c0b0a',
        }}>
          {/* Title bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 16px',
            background: '#141311',
            borderBottom: '1px solid #1c1b18',
          }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4a4844' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4a4844' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4a4844' }} />
            </div>
            <div style={{
              flex: 1, textAlign: 'center',
              fontFamily: "'DM Mono', monospace",
              fontSize: 11, color: '#555',
            }}>wi-bill.com/dashboard</div>
          </div>

          {/* Dashboard content */}
          <div style={{ padding: '24px 28px 0' }}>
            {/* Header row */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Wifi size={16} color={gold} />
                <span style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 14, fontWeight: 600, color: cream,
                }}>Good morning, Nuru Net</span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px',
                background: 'rgba(34,197,94,0.08)',
                border: '0.5px solid rgba(34,197,94,0.15)',
                borderRadius: 6,
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} />
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 10, color: '#22c55e',
                }}>Network operational</span>
              </div>
            </div>

            {/* Stat tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
              {[
                { label: "Today's revenue", value: 'Ksh 14,200', color: gold },
                { label: 'Active sessions', value: '86', color: cream },
                { label: 'Failed today', value: '0', color: '#22c55e' },
              ].map((stat) => (
                <div key={stat.label} style={{
                  padding: '16px 18px',
                  background: '#141311',
                  border: '0.5px solid #1c1b18',
                  borderRadius: 10,
                }}>
                  <div style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 11, color: '#555',
                    marginBottom: 6,
                  }}>{stat.label}</div>
                  <div style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 22, fontWeight: 500,
                    color: stat.color,
                  }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Fade to black — implies more content */}
            <div style={{
              height: 64,
              background: 'linear-gradient(to bottom, transparent, #0c0b0a)',
            }} />
          </div>
        </div>
      </section>

      {/* ═══════ FEATURES STRIP ═══════ */}
      <section id="features" style={{
        position: 'relative', zIndex: 1,
        padding: '0 40px 80px', maxWidth: 1000, margin: '0 auto',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1,
          background: '#1c1b18',
          borderRadius: 14,
          overflow: 'hidden',
        }}>
          {[
            {
              icon: Rocket,
              title: 'Self-serve setup',
              desc: "No quote request, no sales call. You're billing customers the same day.",
            },
            {
              icon: Wifi,
              title: 'Outage transparency',
              desc: 'Customers see network status before they pay — not after.',
            },
            {
              icon: Smartphone,
              title: 'Instant reconnect',
              desc: 'Returning devices skip login entirely — recognized by MAC, not memory.',
            },
          ].map((item) => (
            <div key={item.title} style={{
              padding: '28px 24px',
              background: '#050505',
              cursor: 'default',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(232,184,75,0.08)',
                border: '0.5px solid rgba(232,184,75,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              }}>
                <item.icon size={18} color={gold} strokeWidth={1.8} />
              </div>
              <h3 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 15, fontWeight: 700, margin: '0 0 8px', color: cream,
              }}>{item.title}</h3>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12, color: dim, lineHeight: 1.55, margin: 0,
              }}>{item.desc}</p>
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
          transition: 'opacity 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >Get started <ArrowRight size={15} /></Link>
      </section>

      {/* ═══════ PRICING (placeholder anchor) ═══════ */}
      <section id="pricing" style={{
        position: 'relative', zIndex: 1,
        padding: '0 40px 80px', maxWidth: 1000, margin: '0 auto',
        textAlign: 'center',
      }}>
        <p style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11, color: '#333',
          letterSpacing: '1px',
        }}>PRICING — COMING SOON</p>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/login" style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11, color: '#555', textDecoration: 'none',
            transition: 'color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = cream)}
            onMouseLeave={e => (e.currentTarget.style.color = '#555')}
          >Login</Link>
          <a href="mailto:support@wi-bill.com" style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11, color: '#444', textDecoration: 'none',
          }}>support@wi-bill.com</a>
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10, color: '#333',
          }}>&copy; {new Date().getFullYear()} WiBill</span>
        </div>
      </footer>

      {/* ── Mobile ── */}
      <style>{`
        @media (max-width: 900px) {
          nav { padding: 0 20px !important; }
          section { padding-left: 20px !important; padding-right: 20px !important; }
        }
        @media (max-width: 700px) {
          #features > div { grid-template-columns: 1fr !important; }
          footer { flex-direction: column; gap: 12px; text-align: center; }
          footer > div { flex-direction: column; gap: 8px; }
        }
      `}</style>
    </div>
  )
}
