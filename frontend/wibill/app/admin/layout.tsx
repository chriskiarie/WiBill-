'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: 'ti-layout-dashboard', exact: true },
  { href: '/admin/isps', label: 'ISP Network', icon: 'ti-network' },
  { href: '/admin/revenue', label: 'Revenue', icon: 'ti-chart-bar' },
  { href: '/admin/transactions', label: 'Transactions', icon: 'ti-receipt' },
  { href: '/admin/invites', label: 'Invites', icon: 'ti-link' },
  { href: '/admin/system', label: 'Settings', icon: 'ti-settings' },
];

export default function BatcaveLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (path === '/admin/login') {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('wb_token');

    if (!token) {
      router.replace('/admin/login');
      return;
    }

    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        router.replace('/admin/login');
      });
  }, [path, router]);

  if (path === '/admin/login') return children;

  if (loading) {
    return (
      <div style={{ color: '#999', padding: 40 }}>
        Loading BATCAVE TEST...
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#000',
      color: '#fff',
    }}>

      {/* SIDEBAR (RED TEST MODE) */}
      <aside style={{
        width: sidebarOpen ? 260 : 80,
        background: '#ff0000', // 🔥 TEST CHANGE (VERY VISIBLE)
        transition: 'width 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
      }}>

        {/* HEADER */}
        <div style={{
          padding: 20,
          borderBottom: '1px solid rgba(255,255,255,0.2)',
        }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>
            BATCAVE LIVE TEST
          </div>
        </div>

        {/* NAV */}
        <div style={{ padding: 10, flex: 1 }}>
          {NAV_ITEMS.map(item => {
            const active = path === item.href || path.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: 10,
                  color: active ? '#00ffff' : '#fff',
                  background: active ? 'rgba(0,255,255,0.2)' : 'transparent',
                  textDecoration: 'none',
                  marginBottom: 6,
                  borderRadius: 6,
                }}
              >
                <i className={`ti ${item.icon}`} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* TOGGLE */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            padding: 10,
            background: '#111',
            color: '#fff',
            border: 'none',
          }}
        >
          Toggle
        </button>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, padding: 20 }}>
        {children}
      </main>
    </div>
  );
}