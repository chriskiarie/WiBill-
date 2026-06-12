'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import {
  LayoutDashboard, LineChart, Activity, Wifi, Receipt, Ticket,
  Coins, Package, Router, CreditCard, Settings, HelpCircle, LogOut
} from 'lucide-react'

const nav = [
  { label: 'Overview', items: [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/dashboard/analytics', icon: LineChart, label: 'Analytics' },
    { href: '/dashboard/network', icon: Activity, label: 'Network' },
  ]},
  { label: 'Billing', items: [
    { href: '/dashboard/sessions', icon: Wifi, label: 'Sessions', badge: true },
    { href: '/dashboard/transactions', icon: Receipt, label: 'Transactions' },
    { href: '/dashboard/vouchers', icon: Ticket, label: 'Vouchers' },
    { href: '/dashboard/loyalty', icon: Coins, label: 'Loyalty Points' },
  ]},
  { label: 'Config', items: [
    { href: '/dashboard/packages', icon: Package, label: 'Packages' },
    { href: '/dashboard/mikrotik', icon: Router, label: 'MikroTik' },
    { href: '/dashboard/mpesa', icon: CreditCard, label: 'M-Pesa' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ]},
]

export default function Sidebar({ activeSessions = 0 }: { activeSessions?: number }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const isAdmin = pathname.startsWith('/admin')

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'IS'
  const ispName = user?.isp_name || (user?.email?.split('@')[0] || 'My ISP')

  return (
    <aside style={{
      width: 228,
      minWidth: 228,
      background: isAdmin ? '#030308' : '#050505',
      borderRight: isAdmin ? '1px solid rgba(250,200,0,0.12)' : '0.5px solid #131313',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
    }}>

      {/* HEADER */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '0.5px solid #0f0f0f' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: '-0.5px',
            color: isAdmin ? '#fac800' : '#fff'
          }}>
            WiBill
          </span>

          <span style={{
            fontFamily: 'Instrument Serif, serif',
            fontStyle: 'italic',
            fontSize: 14,
            color: isAdmin ? '#fac800' : '#2a2a2a'
          }}>
            XwB
          </span>
        </div>

        <div style={{
          fontSize: 9,
          color: isAdmin ? '#fac800' : '#222',
          marginTop: 3,
          letterSpacing: '0.6px',
          fontWeight: 700
        }}>
          {isAdmin ? 'BATCAVE COMMAND SYSTEM' : 'ISP MANAGEMENT PORTAL'}
        </div>
      </div>

      {/* USER */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '0.5px solid #0d0d0d',
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: isAdmin ? 'rgba(250,200,0,0.08)' : '#06132a',
          border: isAdmin ? '1px solid rgba(250,200,0,0.2)' : '0.5px solid #1a3a6e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'DM Mono, monospace',
          fontSize: 12,
          fontWeight: 500,
          color: isAdmin ? '#fac800' : '#3b82f6'
        }}>
          {initials}
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#ddd' }}>
            {ispName}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <span style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: isAdmin ? '#fac800' : '#22c55e',
              display: 'inline-block',
              boxShadow: isAdmin ? '0 0 6px #fac800' : '0 0 6px #22c55e'
            }} />

            <span style={{
              fontSize: 9,
              color: isAdmin ? '#fac800' : '#22c55e',
              fontFamily: 'DM Mono, monospace',
              fontWeight: 500
            }}>
              {isAdmin ? 'BATCAVE ACTIVE' : 'LIVE'}
            </span>
          </div>
        </div>
      </div>

      {/* NAV */}
      <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto' }}>
        {nav.map(section => (
          <div key={section.label} style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 9,
              color: isAdmin ? '#333' : '#1e1e1e',
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              padding: '0 10px',
              marginBottom: 8,
              fontWeight: 700
            }}>
              {section.label}
            </div>

            {section.items.map(item => {
              const active = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))

              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 10px',
                    borderRadius: 8,
                    marginBottom: 1,
                    background: active
                      ? (isAdmin ? 'rgba(250,200,0,0.08)' : '#0a1628')
                      : 'transparent',
                    color: active
                      ? (isAdmin ? '#fac800' : '#fff')
                      : '#2e2e2e',
                    fontWeight: active ? 700 : 400,
                    fontSize: 12,
                    cursor: 'pointer',
                    position: 'relative'
                  }}>

                    {active && (
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 2,
                        height: 16,
                        background: isAdmin ? '#fac800' : '#3b82f6',
                        borderRadius: '0 2px 2px 0'
                      }} />
                    )}

                    <item.icon size={14} color={active ? (isAdmin ? '#fac800' : '#3b82f6') : '#252525'} />

                    <span>{item.label}</span>

                    {'badge' in item && item.badge && activeSessions > 0 && (
                      <span style={{
                        marginLeft: 'auto',
                        background: isAdmin ? 'rgba(250,200,0,0.08)' : '#06132a',
                        color: isAdmin ? '#fac800' : '#3b82f6',
                        fontSize: 9,
                        padding: '2px 7px',
                        borderRadius: 10,
                        fontFamily: 'DM Mono, monospace'
                      }}>
                        {activeSessions}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* FOOTER */}
      <div style={{ padding: '10px 10px', borderTop: '0.5px solid #0d0d0d' }}>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 10px',
          borderRadius: 8,
          color: '#1e1e1e',
          fontSize: 12,
          cursor: 'pointer'
        }}>
          <HelpCircle size={14} />
          <span>Support</span>
        </div>

        <div onClick={logout} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 10px',
          borderRadius: 8,
          color: '#1e1e1e',
          fontSize: 12,
          cursor: 'pointer'
        }}>
          <LogOut size={14} />
          <span>Sign out</span>
        </div>

      </div>
    </aside>
  )
}