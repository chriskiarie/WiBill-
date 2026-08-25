'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import {
  LayoutDashboard, LineChart, Activity, Wifi, Receipt,
  Package, Router, CreditCard, Settings, HelpCircle, LogOut,
  Ticket, Star, Megaphone, ChevronLeft, ChevronRight, DollarSign, Users, ExternalLink, Bell, Palette, MessageSquare,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const PORTAL_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://wibill-production-2e9c.up.railway.app'

const nav = [
  { label: 'Overview', items: [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/dashboard/analytics', icon: LineChart, label: 'Analytics' },
    { href: '/dashboard/hotspots', icon: Wifi, label: 'Hotspots' },
    { href: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
    { href: '/dashboard/wizard', icon: Palette, label: 'Portal Design' },
    { href: '/dashboard/network', icon: Activity, label: 'Network' },
  ]},
  { label: 'Billing', items: [
    { href: '/dashboard/sessions', icon: Wifi, label: 'Sessions' },
    { href: '/dashboard/clients', icon: Users, label: 'Monthly Clients' },
    { href: '/dashboard/transactions', icon: Receipt, label: 'Transactions' },
    { href: '/dashboard/vouchers', icon: Ticket, label: 'Vouchers' },
    { href: '/dashboard/campaigns', icon: Megaphone, label: 'Campaigns' },
    { href: '/dashboard/loyalty', icon: Star, label: 'Loyalty' },
    { href: '/dashboard/comms', icon: MessageSquare, label: 'Bulk SMS' },
  ]},
  { label: 'Config', items: [
    { href: '/dashboard/packages', icon: Package, label: 'Packages' },
    { href: '/dashboard/mikrotik', icon: Router, label: 'MikroTik' },
    { href: '/dashboard/mpesa', icon: CreditCard, label: 'M-Pesa' },
    { href: '/dashboard/sms', icon: MessageSquare, label: 'SMS' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ]},
]

const W = 228
const W_COLLAPSED = 60

const C = {
  bg: 'var(--sidebar-bg)',
  border: 'var(--sidebar-border)',
  gold: 'var(--theme-gold)',
  text: 'var(--sidebar-text)',
  dim: 'var(--sidebar-dim)',
  green: 'var(--theme-green)',
  cardBg: 'var(--sidebar-card-bg)',
  icon: 'var(--sidebar-icon)',
  activeBg: 'var(--sidebar-active-bg)',
}

export default function Sidebar({ activeSessions: _ = 0, onTourStart }: { activeSessions?: number; onTourStart?: () => void }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const navRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [indicatorTop, setIndicatorTop] = useState(8)
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null)
  const [brandHover, setBrandHover] = useState(false)
  const [liveData, setLiveData] = useState({ revenue: 0, sessions: 0, loaded: false })
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('wb_feature_flags') || '{}') } catch { return {} }
  })
  const [unreadCount, setUnreadCount] = useState(0)

  const isAdmin = pathname.startsWith('/admin')
  const w = collapsed ? W_COLLAPSED : W

  const filteredNav = nav.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (item.href === '/dashboard/campaigns' && !featureFlags.campaigns) return false
      if (item.href === '/dashboard/loyalty' && !featureFlags.loyalty) return false
      if (item.href === '/dashboard/clients' && !featureFlags.monthly_subscribers) return false
      return true
    }),
  })).filter(section => section.items.length > 0)

  const ispName = user?.tenant_name || (user?.email?.split('@')[0] || 'My ISP')

  const activeHref = filteredNav.flatMap(s => s.items).find(i => {
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
    fetch(`${API}/api/tenants/feature-flags`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setFeatureFlags(d)
          localStorage.setItem('wb_feature_flags', JSON.stringify(d))
        }
      })
      .catch(() => {})
    fetch(`${API}/api/notifications/unread-count`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setUnreadCount(d.unread ?? 0) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('wb_token')
    if (!token) return
    fetch(`${API}/api/tenants/feature-flags`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setFeatureFlags(d)
          localStorage.setItem('wb_feature_flags', JSON.stringify(d))
        }
      })
      .catch(() => {})
  }, [pathname])

  useEffect(() => {
    if (!collapsed) setTimeout(updateIndicator, 50)
  }, [collapsed, updateIndicator])

  const allItems = filteredNav.flatMap(s => s.items)

  return (
    <aside className="desktop-sidebar" style={{
      width: w, minWidth: w, overflow: 'hidden',
      background: isAdmin ? '#030308' : C.bg,
      borderRight: isAdmin ? '1px solid rgba(250,200,0,0.12)' : `0.5px solid ${C.border}`,
      display: 'flex', flexDirection: 'column', height: '100vh',
      position: 'sticky', top: 0,
      transition: 'width 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
    }}>
      {/* ── BRAND ROW (88px) ── */}
      <div style={{
        height: 88, minHeight: 88,
        padding: collapsed ? '0' : '0 16px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '0.5px solid var(--sidebar-border)',
      }}>
        <a href={`${PORTAL_BASE}/portal/${user?.tenant_slug || ''}`} target="_blank" rel="noopener noreferrer"
          onMouseEnter={() => setBrandHover(true)} onMouseLeave={() => setBrandHover(false)}
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: collapsed ? 0 : '6px 0' }}>
          <img src="/logos/wibill-wb-monogram-512.png" alt="WiBill" style={{ width: collapsed ? 52 : 80, height: collapsed ? 52 : 80, objectFit: 'contain', flexShrink: 0, transition: 'width 0.2s, height 0.2s' }} />
          <span style={{
            position: 'absolute', bottom: -16, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--sidebar-card-bg)', borderRadius: 4,
            padding: '2px 8px', fontSize: 11, fontFamily: 'Inter, sans-serif',
            color: C.dim, whiteSpace: 'nowrap',
            opacity: brandHover ? 1 : 0,
            pointerEvents: 'none', transition: 'opacity 0.15s',
          }}>
            Open your portal <ExternalLink size={10} style={{ verticalAlign: 'middle', marginLeft: 2 }} />
          </span>
        </a>

        {!collapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              width: 22, height: 22, borderRadius: 6,
              background: 'transparent', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: C.dim,
            }}>
            <ChevronLeft size={14} />
          </button>
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
            background: isAdmin ? C.gold : C.gold,
            borderRadius: '0 3px 3px 0',
            transition: 'top 0.3s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.2s',
            opacity: 0.7,
            pointerEvents: 'none',
          }} />
        )}

        {filteredNav.map(section => (
          <div key={section.label} style={{ marginBottom: collapsed ? 12 : 20 }}>
            {!collapsed && (
              <div style={{
                fontSize: 9, color: 'var(--sidebar-dim)', textTransform: 'uppercase',
                letterSpacing: '1.2px', padding: '0 10px', marginBottom: 6, fontWeight: 700,
                fontFamily: "'Space Grotesk', sans-serif",
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
                      background: active ? 'var(--sidebar-active-bg)' : 'transparent',
                      color: active ? C.gold : 'var(--sidebar-icon)',
                      transition: 'all 0.15s',
                    }}>
                      <item.icon size={16} />
                    </div>
                  </Link>
                  {hoveredTooltip === item.label && (
                    <div style={{
                      position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)',
                      marginLeft: 8, padding: '4px 10px', borderRadius: 6,
                      background: 'var(--sidebar-card-bg)', border: '0.5px solid var(--sidebar-border)',
                      color: 'var(--sidebar-text)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
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
                    background: active ? 'var(--sidebar-active-bg)' : 'transparent',
                    color: active ? C.gold : 'var(--sidebar-icon)',
                    fontWeight: active ? 700 : 400, fontSize: 13,
                    cursor: 'pointer', position: 'relative',
                    transition: 'all 0.15s',
                  }}>
                    <item.icon size={14} color={active ? C.gold : 'var(--sidebar-icon)'} />
                    <span>{item.label}</span>

                    {item.label === 'Sessions' && liveData.sessions > 0 && (
                      <span style={{
                        marginLeft: 'auto',
                        background: 'var(--sidebar-active-bg)', color: C.gold,
                        fontSize: 9, padding: '2px 7px', borderRadius: 10,
                        fontFamily: "'DM Mono', monospace",
                      }}>
                        {liveData.sessions}
                      </span>
                    )}
                    {item.label === 'Notifications' && unreadCount > 0 && (
                      <span style={{
                        marginLeft: 'auto',
                        background: 'var(--sidebar-active-bg)', color: C.gold,
                        fontSize: 9, padding: '2px 7px', borderRadius: 10,
                        fontFamily: "'DM Mono', monospace",
                      }}>
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── TENANT STATUS CARD ── */}
      {!collapsed && liveData.loaded && (
        <div style={{
          margin: '0 8px 4px', padding: '10px 12px',
          background: C.cardBg, borderRadius: 8,
          borderTop: '0.5px solid var(--sidebar-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: 12,
              fontWeight: 500, color: C.text, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>
              {ispName}
            </span>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: 'Inter, sans-serif', fontSize: 11,
              color: C.green, marginLeft: 8, flexShrink: 0,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: C.green, display: 'inline-block',
              }} />
              LIVE
            </span>
          </div>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 11,
            color: C.dim, marginTop: 4,
          }}>
            ${liveData.revenue.toLocaleString()} · K:{liveData.sessions}
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{ padding: collapsed ? '8px 0' : '10px 10px', borderTop: '0.5px solid var(--sidebar-border)' }}>
        {collapsed ? (
          <>
            <div
              onClick={onTourStart}
              style={{ display: 'flex', justifyContent: 'center', padding: '6px 0', color: 'var(--sidebar-icon)', cursor: 'pointer' }}
            >
              <HelpCircle size={15} />
            </div>
            <div onClick={logout} style={{ display: 'flex', justifyContent: 'center', padding: '6px 0', color: 'var(--sidebar-icon)', cursor: 'pointer' }}>
              <LogOut size={15} />
            </div>
          </>
        ) : (
          <>
            <div
              className="sidebar-support-btn"
              onClick={onTourStart}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 8,
                color: 'var(--sidebar-icon)', fontSize: 12, cursor: 'pointer',
              }}
            >
              <HelpCircle size={14} />
              <span>Support</span>
            </div>
            <div onClick={logout} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 8,
              color: 'var(--sidebar-icon)', fontSize: 12, cursor: 'pointer',
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
