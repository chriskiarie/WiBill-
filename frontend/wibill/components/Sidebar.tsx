'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import {
  LayoutDashboard, LineChart, Smartphone, Activity, Wifi, Receipt,
  Package, Router, CreditCard, Settings, HelpCircle, LogOut,
  Ticket, Star, ChevronLeft, ChevronRight, DollarSign, Users,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const nav = [
  { label: 'Overview', items: [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/dashboard/analytics', icon: LineChart, label: 'Analytics' },
    { href: '/dashboard/portal-preview', icon: Smartphone, label: 'Portal Preview' },
    { href: '/dashboard/network', icon: Activity, label: 'Network' },
  ]},
  { label: 'Billing', items: [
    { href: '/dashboard/sessions', icon: Wifi, label: 'Sessions' },
    { href: '/dashboard/transactions', icon: Receipt, label: 'Transactions' },
    { href: '/dashboard/vouchers', icon: Ticket, label: 'Vouchers' },
    { href: '/dashboard/loyalty', icon: Star, label: 'Loyalty' },
  ]},
  { label: 'Config', items: [
    { href: '/dashboard/packages', icon: Package, label: 'Packages' },
    { href: '/dashboard/mikrotik', icon: Router, label: 'MikroTik' },
    { href: '/dashboard/mpesa', icon: CreditCard, label: 'M-Pesa' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ]},
]

const W = 228
const W_COLLAPSED = 60

export default function Sidebar({ activeSessions: _ = 0 }: { activeSessions?: number }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const navRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [indicatorTop, setIndicatorTop] = useState(8)
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null)
  const [liveData, setLiveData] = useState({ revenue: 0, sessions: 0, loaded: false })

  const isAdmin = pathname.startsWith('/admin')
  const w = collapsed ? W_COLLAPSED : W

  const initials = user?.tenant_name ? user.tenant_name.slice(0, 2).toUpperCase() : user?.email?.slice(0, 2).toUpperCase() || 'IS'
  const ispName = user?.tenant_name || (user?.email?.split('@')[0] || 'My ISP')

  const activeHref = nav.flatMap(s => s.items).find(i => {
    if (i.href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(i.href)
  })?.href || '/dashboard'

  const updateIndicator = useCallback(() => {
    if (!navRef.current || collapsed) return
    const activeEl = navRef.current.querySelector(`[data-nav="${activeHref}"]`) as HTMLElement | null
    if (activeEl) {
      const parent = navRef.current
      const parentRect = parent.getBoundingClientRect()
      const elRect = activeEl.getBoundingClientRect()
      setIndicatorTop(elRect.top - parentRect.top + parent.scrollTop)
    }
  }, [activeHref, collapsed])

  useEffect(() => { updateIndicator() }, [updateIndicator])

  useEffect(() => {
    const token = localStorage.getItem('wb_token')
    if (!token) return
    fetch(`${API}/api/tenants/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setLiveData({ revenue: d?.today?.gross_ksh || 0, sessions: d?.active_sessions || 0, loaded: true }))
      .catch(() => setLiveData(p => ({ ...p, loaded: true })))
  }, [])

  useEffect(() => {
    if (!collapsed) setTimeout(updateIndicator, 50)
  }, [collapsed, updateIndicator])

  const allItems = nav.flatMap(s => s.items)

  return (
    <aside style={{
      width: w, minWidth: w, overflow: 'hidden',
      background: isAdmin ? '#030308' : '#050505',
      borderRight: isAdmin ? '1px solid rgba(250,200,0,0.12)' : '0.5px solid #131313',
      display: 'flex', flexDirection: 'column', height: '100vh',
      position: 'sticky', top: 0,
      transition: 'width 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
    }}>
      {/* ── HEADER ── */}
      <div style={{
        padding: collapsed ? '16px 0' : '22px 20px 18px',
        borderBottom: '0.5px solid #0f0f0f',
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
        flexDirection: collapsed ? 'column' : 'row',
        gap: collapsed ? 8 : 0,
      }}>
        {!collapsed && (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{
                fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800,
                letterSpacing: '-0.5px', color: isAdmin ? '#fac800' : '#fff',
              }}>
                WiBill
              </span>
              <span style={{
                fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 700,
                color: isAdmin ? '#fac800' : '#E8B84B', letterSpacing: '0.05em',
              }}>
                ISP
              </span>
            </div>
            <div style={{ fontSize: 9, color: isAdmin ? '#fac800' : '#222', letterSpacing: '0.6px', fontWeight: 700, marginTop: 3 }}>
              {isAdmin ? 'BATCAVE COMMAND SYSTEM' : 'ISP MANAGEMENT PORTAL'}
            </div>
          </>
        )}
        {collapsed && (
          <span style={{
            fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800,
            color: isAdmin ? '#fac800' : '#E8B84B', lineHeight: 1,
          }}>
            W
          </span>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            marginTop: collapsed ? 6 : 0,
            width: 22, height: 22, borderRadius: 6,
            background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#333',
            transition: 'all 0.2s',
          }}>
          {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
        </button>
      </div>

      {/* ── USER / LIVE CONTEXT ── */}
      <div style={{
        padding: collapsed ? '10px 0' : '12px 16px',
        borderBottom: '0.5px solid #0d0d0d',
        display: 'flex',
        flexDirection: collapsed ? 'column' : 'row',
        alignItems: collapsed ? 'center' : 'center',
        gap: collapsed ? 6 : 10,
      }}>
        <div style={{
          width: collapsed ? 28 : 34,
          height: collapsed ? 28 : 34,
          borderRadius: 9,
          background: isAdmin ? 'rgba(250,200,0,0.08)' : '#06132a',
          border: isAdmin ? '1px solid rgba(250,200,0,0.2)' : '0.5px solid #1a3a6e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'DM Mono, monospace', fontSize: collapsed ? 9 : 12,
          fontWeight: 500, color: isAdmin ? '#fac800' : '#3b82f6',
          flexShrink: 0,
        }}>
          {initials}
        </div>

        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ispName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: isAdmin ? '#fac800' : '#22c55e', display: 'inline-block' }} />
              <span style={{ fontSize: 9, color: isAdmin ? '#fac800' : '#22c55e', fontFamily: 'DM Mono, monospace', fontWeight: 500 }}>
                {isAdmin ? 'BATCAVE ACTIVE' : 'LIVE'}
              </span>
            </div>

            {liveData.loaded && (
              <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  padding: '2px 6px', borderRadius: 4,
                  background: 'rgba(232,184,75,0.06)', border: '0.5px solid rgba(232,184,75,0.08)',
                }}>
                  <DollarSign size={8} color="#E8B84B" />
                  <span style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', color: '#E8B84B', fontWeight: 600 }}>
                    {liveData.revenue.toLocaleString()}
                  </span>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  padding: '2px 6px', borderRadius: 4,
                  background: 'rgba(34,197,94,0.06)', border: '0.5px solid rgba(34,197,94,0.08)',
                }}>
                  <Users size={8} color="#22c55e" />
                  <span style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', color: '#22c55e', fontWeight: 600 }}>
                    {liveData.sessions}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── NAV ── */}
      <nav ref={navRef} style={{
        flex: 1, padding: collapsed ? '12px 4px' : '14px 10px',
        overflowY: 'auto', position: 'relative',
      }}>
        {!collapsed && (
          <div style={{
            position: 'absolute', left: 0, width: 2,
            top: indicatorTop, height: 32,
            background: isAdmin ? '#fac800' : '#E8B84B',
            borderRadius: '0 3px 3px 0',
            transition: 'top 0.3s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.2s',
            opacity: 0.7,
            pointerEvents: 'none',
          }} />
        )}

        {nav.map(section => (
          <div key={section.label} style={{ marginBottom: collapsed ? 12 : 20 }}>
            {!collapsed && (
              <div style={{
                fontSize: 9, color: '#1e1e1e', textTransform: 'uppercase',
                letterSpacing: '1.2px', padding: '0 10px', marginBottom: 6, fontWeight: 700,
                fontFamily: '"Space Grotesk", sans-serif',
              }}>
                {section.label}
              </div>
            )}

            {section.items.map(item => {
              const active = item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)

              return collapsed ? (
                <div
                  key={item.href}
                  data-nav={item.href}
                  onMouseEnter={() => setHoveredTooltip(item.label)}
                  onMouseLeave={() => setHoveredTooltip(null)}
                  style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}
                >
                  <Link href={item.href} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 36, height: 36, borderRadius: 8,
                      background: active ? 'rgba(232,184,75,0.08)' : 'transparent',
                      color: active ? '#E8B84B' : '#252525',
                      transition: 'all 0.15s',
                    }}>
                      <item.icon size={16} />
                    </div>
                  </Link>
                  {hoveredTooltip === item.label && (
                    <div style={{
                      position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)',
                      marginLeft: 8, padding: '4px 10px', borderRadius: 6,
                      background: '#111', border: '0.5px solid #222',
                      color: '#ccc', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                      fontFamily: 'Inter, sans-serif', zIndex: 20,
                      pointerEvents: 'none',
                    }}>
                      {item.label}
                    </div>
                  )}
                </div>
              ) : (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }} data-nav={item.href}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 10px', borderRadius: 8, marginBottom: 1,
                    background: active ? 'rgba(232,184,75,0.06)' : 'transparent',
                    color: active ? '#E8B84B' : '#2e2e2e',
                    fontWeight: active ? 700 : 400, fontSize: 12,
                    cursor: 'pointer', position: 'relative',
                    transition: 'all 0.15s',
                  }}>
                    <item.icon size={14} color={active ? '#E8B84B' : '#252525'} />
                    <span>{item.label}</span>

                    {item.label === 'Sessions' && liveData.sessions > 0 && (
                      <span style={{
                        marginLeft: 'auto',
                        background: 'rgba(232,184,75,0.08)', color: '#E8B84B',
                        fontSize: 9, padding: '2px 7px', borderRadius: 10,
                        fontFamily: 'DM Mono, monospace',
                      }}>
                        {liveData.sessions}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── FOOTER ── */}
      <div style={{ padding: collapsed ? '8px 0' : '10px 10px', borderTop: '0.5px solid #0d0d0d' }}>
        {collapsed ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0', color: '#1e1e1e', cursor: 'pointer' }}>
              <HelpCircle size={15} />
            </div>
            <div onClick={logout} style={{ display: 'flex', justifyContent: 'center', padding: '6px 0', color: '#1e1e1e', cursor: 'pointer' }}>
              <LogOut size={15} />
            </div>
          </>
        ) : (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 8,
              color: '#1e1e1e', fontSize: 12, cursor: 'pointer',
            }}>
              <HelpCircle size={14} />
              <span>Support</span>
            </div>
            <div onClick={logout} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 8,
              color: '#1e1e1e', fontSize: 12, cursor: 'pointer',
            }}>
              <LogOut size={14} />
              <span>Sign out</span>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}