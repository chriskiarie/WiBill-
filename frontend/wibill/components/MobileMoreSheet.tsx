'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import {
  LayoutDashboard, LineChart, Smartphone, Activity, Wifi, Receipt,
  Package, Router, CreditCard, Settings, HelpCircle, LogOut,
  Ticket, Star, Megaphone, Bell,
} from 'lucide-react'

const nav = [
  { label: 'Overview', items: [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/dashboard/analytics', icon: LineChart, label: 'Analytics' },
    { href: '/dashboard/hotspots', icon: Wifi, label: 'Hotspots' },
    { href: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
    { href: '/dashboard/portal-preview', icon: Smartphone, label: 'Portal Preview' },
    { href: '/dashboard/network', icon: Activity, label: 'Network' },
  ]},
  { label: 'Billing', items: [
    { href: '/dashboard/sessions', icon: Wifi, label: 'Sessions' },
    { href: '/dashboard/transactions', icon: Receipt, label: 'Transactions' },
    { href: '/dashboard/vouchers', icon: Ticket, label: 'Vouchers' },
    { href: '/dashboard/campaigns', icon: Megaphone, label: 'Campaigns' },
    { href: '/dashboard/loyalty', icon: Star, label: 'Loyalty' },
  ]},
  { label: 'Config', items: [
    { href: '/dashboard/packages', icon: Package, label: 'Packages' },
    { href: '/dashboard/mikrotik', icon: Router, label: 'MikroTik' },
    { href: '/dashboard/mpesa', icon: CreditCard, label: 'M-Pesa' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ]},
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function MobileMoreSheet({ open, onClose }: Props) {
  const pathname = usePathname()
  const { logout } = useAuth()

  if (!open) return null

  return (
    <>
      <div className="mobile-sheet-overlay" onClick={onClose} />
      <div className="mobile-sheet">
        <div className="mobile-sheet-handle" />
        <div className="mobile-sheet-title">Menu</div>
        {nav.map(section => (
          <div key={section.label}>
            <div className="mobile-sheet-section">{section.label}</div>
            {section.items.map(item => {
              const active = item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`mobile-sheet-item${active ? ' active' : ''}`}
                >
                  <span className="sheet-icon-chip"><item.icon size={18} /></span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
        <div style={{ marginTop: 12, borderTop: '0.5px solid var(--sidebar-border)', paddingTop: 12 }}>
          <button onClick={() => { onClose(); logout() }} className="mobile-sheet-item" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>
            <span className="sheet-icon-chip"><LogOut size={18} /></span>
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </>
  )
}
