'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import {
  LayoutDashboard, LineChart, Activity, Wifi, Receipt,
  Package, Router, CreditCard, Settings, Ticket, Star,
  Megaphone, Users, Bell, Palette, MessageSquare, LogOut,
} from 'lucide-react'

const tabs = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/dashboard/analytics', icon: LineChart, label: 'Analytics' },
  { href: '/dashboard/hotspots', icon: Wifi, label: 'Hotspots' },
  { href: '/dashboard/sessions', icon: Activity, label: 'Sessions' },
  { href: '/dashboard/clients', icon: Users, label: 'Clients' },
  { href: '/dashboard/transactions', icon: Receipt, label: 'Transactions' },
  { href: '/dashboard/vouchers', icon: Ticket, label: 'Vouchers' },
  { href: '/dashboard/campaigns', icon: Megaphone, label: 'Campaigns' },
  { href: '/dashboard/loyalty', icon: Star, label: 'Loyalty' },
  { href: '/dashboard/packages', icon: Package, label: 'Packages' },
  { href: '/dashboard/mikrotik', icon: Router, label: 'MikroTik' },
  { href: '/dashboard/mpesa', icon: CreditCard, label: 'M-Pesa' },
  { href: '/dashboard/comms', icon: MessageSquare, label: 'Bulk SMS' },
  { href: '/dashboard/notifications', icon: Bell, label: 'Alerts' },
  { href: '/dashboard/wizard', icon: Palette, label: 'Portal' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
]

export default function MobileTabBar() {
  const pathname = usePathname()
  const { logout } = useAuth()

  return (
    <nav className="mobile-tabs">
      <div className="mobile-tabs-inner">
        {tabs.map((tab) => {
          const active = tab.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(tab.href)

          return (
            <Link key={tab.href} href={tab.href} className={`mobile-tab${active ? ' active' : ''}`}>
              <span className="tab-icon"><tab.icon size={20} /></span>
              <span>{tab.label}</span>
            </Link>
          )
        })}
        <button onClick={logout} className="mobile-tab" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
          <span className="tab-icon"><LogOut size={20} /></span>
          <span>Logout</span>
        </button>
      </div>
    </nav>
  )
}
