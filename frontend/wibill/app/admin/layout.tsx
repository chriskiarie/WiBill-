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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((r) => {
        clearTimeout(timeout);
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (data.role !== 'platform_admin') {
          localStorage.removeItem('wb_token');
          router.replace('/admin/login');
          return;
        }

        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        clearTimeout(timeout);

        if (token) {
          setUser({ role: 'platform_admin' });
          setLoading(false);
        } else {
          localStorage.removeItem('wb_token');
          router.replace('/admin/login');
        }
      });

    return () => clearTimeout(timeout);
  }, [path, router]);

  if (path === '/admin/login') return children;

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a12',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        fontFamily: 'DM Mono, monospace',
      }}>
        Entering Batcave...
      </div>
    );
  }

  if (!user && !loading) return null;

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#0a0a12',
      color: '#e8e8e8',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>

      {/* SIDEBAR */}
      <aside style={{
        width: sidebarOpen ? 260 : 78,
        background: 'linear-gradient(180deg, #0c0c14 0%, #0a0a12 100%)',
        borderRight: '1px solid rgba(255, 200, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        transition: 'width 0.25s ease',
      }}>

        {/* HEADER */}
        <div style={{
          padding: 20,
          borderBottom: '1px solid rgba(255, 200, 0, 0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          justifyContent: sidebarOpen ? 'flex-start' : 'center',
        }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            color: '#0a0a12',
            boxShadow: '0 0 18px rgba(251, 191, 36, 0.35)',
          }}>
            ⚡
          </div>

          {sidebarOpen && (
            <div>
              <div style={{
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#fbbf24',
              }}>
                BATCAVE
              </div>
              <div style={{
                fontSize: 10,
                color: 'rgba(251, 191, 36, 0.45)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}>
                Control Core
              </div>
            </div>
          )}
        </div>

        {/* NAV */}
        <nav style={{
          flex: 1,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          {sidebarOpen && (
            <div style={{
              fontSize: 10,
              letterSpacing: '0.15em',
              color: 'rgba(255,255,255,0.25)',
              padding: '8px 10px',
            }}>
              OPERATIONS
            </div>
          )}

          {NAV_ITEMS.map(item => {
            const active = item.exact
              ? path === item.href
              : path.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#fbbf24' : 'rgba(255,255,255,0.45)',
                  background: active ? 'rgba(251,191,36,0.08)' : 'transparent',
                  border: active
                    ? '1px solid rgba(251,191,36,0.25)'
                    : '1px solid transparent',
                }}
              >
                <i className={`ti ${item.icon}`} style={{ fontSize: 16 }} />
                {sidebarOpen && item.label}
              </Link>
            );
          })}
        </nav>

        {/* FOOTER */}
        <div style={{
          padding: 14,
          borderTop: '1px solid rgba(255, 200, 0, 0.06)',
        }}>
          {sidebarOpen && (
            <div style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
              marginBottom: 10,
            }}>
              System: ONLINE
            </div>
          )}

          <button
            onClick={() => {
              localStorage.removeItem('wb_token');
              router.push('/admin/login');
            }}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              background: 'rgba(255,200,0,0.06)',
              border: '1px solid rgba(255,200,0,0.15)',
              color: '#fbbf24',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Exit
          </button>
        </div>

        {/* TOGGLE */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: 'absolute',
            right: -10,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#0a0a12',
            border: '1px solid rgba(251,191,36,0.3)',
            color: '#fbbf24',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          {sidebarOpen ? '‹' : '›'}
        </button>
      </aside>

      {/* MAIN */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        background: '#0a0a12',
      }}>
        {children}
      </main>
    </div>
  );
}