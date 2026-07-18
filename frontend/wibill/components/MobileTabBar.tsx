'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Wifi, Receipt, Package, Settings, MoreHorizontal,
} from 'lucide-react'

const tabs = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/dashboard/sessions', icon: Wifi, label: 'Sessions' },
  { href: '/dashboard/transactions', icon: Receipt, label: 'Pay' },
  { href: '/dashboard/packages', icon: Package, label: 'Packages' },
  { href: '/dashboard/settings', icon: Settings, label: 'More' },
]

export default function MobileTabBar({ onMoreClick }: { onMoreClick: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="mobile-tabs">
      <div className="mobile-tabs-inner">
        {tabs.map((tab) => {
          const isMore = tab.label === 'More'
          const active = isMore
            ? false
            : tab.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(tab.href)

          if (isMore) {
            return (
              <button key={tab.href} onClick={onMoreClick} className="mobile-tab" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <span className="tab-icon"><MoreHorizontal size={20} /></span>
                <span>More</span>
              </button>
            )
          }

          return (
            <Link key={tab.href} href={tab.href} className={`mobile-tab${active ? ' active' : ''}`}>
              <span className="tab-icon"><tab.icon size={20} /></span>
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
