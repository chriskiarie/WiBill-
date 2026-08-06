'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, LineChart, Activity, Wifi, Receipt,
  Package, Router, CreditCard, Settings, Ticket, Star,
  Megaphone, Users, Bell, Palette, MessageSquare, LogOut,
} from 'lucide-react'

const allTabs = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home', flag: '' },
  { href: '/dashboard/analytics', icon: LineChart, label: 'Analytics', flag: '' },
  { href: '/dashboard/hotspots', icon: Wifi, label: 'Hotspots', flag: '' },
  { href: '/dashboard/network', icon: Activity, label: 'Network', flag: '' },
  { href: '/dashboard/sessions', icon: Activity, label: 'Sessions', flag: '' },
  { href: '/dashboard/clients', icon: Users, label: 'Clients', flag: 'monthly_subscribers' },
  { href: '/dashboard/transactions', icon: Receipt, label: 'Transactions', flag: '' },
  { href: '/dashboard/vouchers', icon: Ticket, label: 'Vouchers', flag: '' },
  { href: '/dashboard/campaigns', icon: Megaphone, label: 'Campaigns', flag: 'campaigns' },
  { href: '/dashboard/loyalty', icon: Star, label: 'Loyalty', flag: 'loyalty' },
  { href: '/dashboard/packages', icon: Package, label: 'Packages', flag: '' },
  { href: '/dashboard/mikrotik', icon: Router, label: 'MikroTik', flag: '' },
  { href: '/dashboard/mpesa', icon: CreditCard, label: 'M-Pesa', flag: '' },
  { href: '/dashboard/comms', icon: MessageSquare, label: 'Bulk SMS', flag: '' },
  { href: '/dashboard/notifications', icon: Bell, label: 'Alerts', flag: '' },
  { href: '/dashboard/wizard', icon: Palette, label: 'Portal', flag: '' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings', flag: '' },
]

export default function MobileTabBar() {
  const pathname = usePathname()
  const { logout } = useAuth()
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({})

  useEffect(() => {
    try { setFeatureFlags(JSON.parse(localStorage.getItem('wb_feature_flags') || '{}')) } catch {}
  }, [])

  const tabs = allTabs.filter(t => !t.flag || featureFlags[t.flag])

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
