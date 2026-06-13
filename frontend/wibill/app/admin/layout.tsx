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
    // Check if this is a login page - don't guard it
    if (path === '/admin/login') {
      setLoading(false);
      return;
    }

    // ===== AUTH GUARD =====
    // 1. Check localStorage for JWT token
    const token = localStorage.getItem('wb_token');
    
    if (!token) {
      // No token → redirect to login
      router.replace('/admin/login');
      return;
    }

    // 2. Verify with backend (optional - for validation)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(r => {
        clearTimeout(timeoutId);
        if (!r.ok) throw new Error('Unauthorized');
        return r.json();
      })
      .then(data => {
        // Check if user is platform admin
        if (data.role !== 'platform_admin') {
          localStorage.removeItem('wb_token');
          router.replace('/admin/login');
          return;
        }
        setUser(data);
        setLoading(false);
      })
      .catch(err => {
        clearTimeout(timeoutId);
        // If backend unreachable, DO NOT grant access - redirect to login
        // Never grant platform_admin access based on token alone without backend verification
        localStorage.removeItem('wb_token');
        router.replace('/admin/login');
      });

    return () => clearTimeout(timeoutId);
  }, [path, router]);

  // Loading state
  if (loading && path !== '/admin/login') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          textAlign: 'center',
          color: '#e8e8e8',
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '2px solid rgba(139, 92, 246, 0.3)',
            borderTop: '2px solid #8b5cf6',
            margin: '0 auto 24px',
            animation: 'spin 1s linear infinite',
          }} />
          <div style={{ fontSize: 14, color: 'rgba(232, 232, 232, 0.6)' }}>Entering Batcave...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Login page - no sidebar
  if (path === '/admin/login') {
    return children;
  }

  // Not authenticated and not loading - will redirect (don't render)
  if (!user && !loading) {
    return null;
  }

  // Authenticated - show sidebar + content
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%)',
      color: '#e8e8e8',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 260 : 80,
        background: 'linear-gradient(180deg, rgba(10, 10, 20, 0.95) 0%, rgba(20, 20, 35, 0.8) 100%)',
        backdropFilter: 'blur(10px)',
        borderRight: '1px solid rgba(139, 92, 246, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        transition: 'width 0.3s ease',
        zIndex: 1000,
      }}>
        {/* Logo */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          justifyContent: sidebarOpen ? 'flex-start' : 'center',
        }}>
          <div style={{
            width: 40,
            height: 40,
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 900,
            color: '#0f0f1e',
            boxShadow: '0 0 20px rgba(251, 191, 36, 0.4)',
            flexShrink: 0,
          }}>
            ⚡
          </div>
          {sidebarOpen && (
            <div>
              <div style={{
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: '-0.5px',
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                BATCAVE
              </div>
              <div style={{
                fontSize: 10,
                color: 'rgba(251, 191, 36, 0.5)',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}>
                Command
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{
          flex: 1,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          overflowY: 'auto',
        }}>
          {sidebarOpen && (
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: 'rgba(232, 232, 232, 0.2)',
              padding: '0 12px',
              marginBottom: 8,
            }}>
              Operations
            </div>
          )}
          {NAV_ITEMS.map(item => {
            const active = item.exact ? path === item.href : path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px',
                  borderRadius: 10,
                  background: active
                    ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.1))'
                    : 'transparent',
                  border: `1px solid ${
                    active ? 'rgba(251, 191, 36, 0.3)' : 'rgba(251, 191, 36, 0.1)'
                  }`,
                  color: active ? '#fcd34d' : 'rgba(232, 232, 232, 0.5)',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(251, 191, 36, 0.08)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(251, 191, 36, 0.2)';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(251, 191, 36, 0.1)';
                  }
                }}
              >
                <i className={`ti ${item.icon}`} style={{
                  fontSize: 18,
                  opacity: active ? 1 : 0.6,
                  flexShrink: 0,
                }} aria-hidden="true" />
                {sidebarOpen && item.label}
                {active && (
                  <div style={{
                    marginLeft: 'auto',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: '#fbbf24',
                    boxShadow: '0 0 8px rgba(251, 191, 36, 0.6)',
                  }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid rgba(251, 191, 36, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '0 12px',
          }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)',
            }} />
            {sidebarOpen && (
              <span style={{
                fontSize: 11,
                color: 'rgba(232, 232, 232, 0.4)',
              }}>
                System operational
              </span>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={() => {
                localStorage.removeItem('wb_token');
                router.push('/admin/login');
              }}
              style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.2)',
                borderRadius: 8,
                padding: '8px 12px',
                color: 'rgba(252, 211, 77, 0.7)',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: 500,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(251, 191, 36, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.2)';
              }}
            >
              ⤴ Exit
            </button>
          )}
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: 'absolute',
            right: -12,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'rgba(251, 191, 36, 0.2)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            color: '#fbbf24',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(251, 191, 36, 0.3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(251, 191, 36, 0.2)';
          }}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        background: 'linear-gradient(180deg, #0f0f1e 0%, #1a1a2e 100%)',
      }}>
        {children}
      </main>

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(251, 191, 36, 0.05);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(251, 191, 36, 0.2);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(251, 191, 36, 0.3);
        }
      `}</style>
    </div>
  );
}