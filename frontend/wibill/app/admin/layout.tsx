'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/isps', label: 'ISP Network' },
  { href: '/admin/revenue', label: 'Revenue' },
  { href: '/admin/transactions', label: 'Transactions' },
  { href: '/admin/invites', label: 'Invites' },
  { href: '/admin/system', label: 'System' },
];

const C = {
  void: '#000000',
  base: '#080808',
  raised: '#0d0d0d',
  border: '#141414',
  borderHover: '#222222',
  text: '#f0f0f0',
  muted: '#444444',
  dim: '#222222',
  gold: '#E8B84B',
  green: '#22c55e',
  red: '#ef4444',
};

export default function BatcaveLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

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
      .then(r => {
        clearTimeout(timeout);
        if (!r.ok) throw new Error('Unauthorized');
        return r.json();
      })
      .then(data => {
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
        const t = localStorage.getItem('wb_token');
        if (t) {
          setUser({ role: 'platform_admin', email: 'admin' });
          setLoading(false);
        } else {
          router.replace('/admin/login');
        }
      });

    return () => clearTimeout(timeout);
  }, [path, router]);

  if (path === '/admin/login') return <>{children}</>;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.void, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 32, height: 32, border: `1px solid ${C.border}`,
            borderTop: `1px solid ${C.gold}`, borderRadius: '50%',
            margin: '0 auto 16px', animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Entering Batcave
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user && !loading) return null;

  const sidebarW = collapsed ? 56 : 220;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.void, color: C.text, fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* SIDEBAR */}
      <aside style={{
        width: sidebarW,
        flexShrink: 0,
        background: C.base,
        borderRight: `0.5px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        zIndex: 100,
      }}>
        {/* Logo row */}
        <div style={{
          height: 52,
          borderBottom: `0.5px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: collapsed ? '0 16px' : '0 20px',
          flexShrink: 0,
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 22, height: 22,
                background: C.gold,
                borderRadius: 4,
                flexShrink: 0,
              }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.gold, letterSpacing: '0.05em', fontFamily: 'Space Grotesk, sans-serif' }}>
                  BATCAVE
                </div>
                <div style={{ fontSize: 9, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace' }}>
                  Platform Admin
                </div>
              </div>
            </div>
          )}
          {collapsed && (
            <div style={{ width: 22, height: 22, background: C.gold, borderRadius: 4, margin: '0 auto' }} />
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4, display: 'flex', lineHeight: 1 }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {!collapsed && (
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.dim, padding: '4px 12px 8px' }}>
              Operations
            </div>
          )}
          {NAV_ITEMS.map(item => {
            const active = item.exact ? path === item.href : path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: collapsed ? '10px 0' : '9px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 7,
                  background: active ? `${C.gold}12` : 'transparent',
                  border: `0.5px solid ${active ? `${C.gold}30` : 'transparent'}`,
                  color: active ? C.gold : C.muted,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = `${C.gold}08`;
                    (e.currentTarget as HTMLElement).style.color = '#888';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = C.muted;
                  }
                }}
              >
                {active && (
                  <div style={{ width: 3, height: 14, borderRadius: 2, background: C.gold, flexShrink: 0 }} />
                )}
                {!active && !collapsed && (
                  <div style={{ width: 3, height: 14, flexShrink: 0 }} />
                )}
                {!collapsed && item.label}
                {collapsed && (
                  <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'inherit' }}>
                    {item.label.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 8px', borderTop: `0.5px solid ${C.border}`, flexShrink: 0 }}>
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '8px 0', background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          {!collapsed && (
            <div style={{ padding: '0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
                <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.muted }}>
                  {user?.email || 'admin'}
                </span>
              </div>
              <button
                onClick={() => { localStorage.removeItem('wb_token'); router.push('/admin/login'); }}
                style={{
                  width: '100%', background: 'none',
                  border: `0.5px solid ${C.border}`,
                  borderRadius: 6, padding: '7px 12px',
                  color: C.muted, fontSize: 11,
                  fontFamily: 'DM Mono, monospace',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.color = '#888'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflowY: 'auto', minWidth: 0, background: C.void }}>
        {children}
      </main>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #222; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
