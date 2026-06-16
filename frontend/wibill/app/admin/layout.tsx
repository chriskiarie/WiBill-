'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const NAV_OPERATIONS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/isps', label: 'ISP Network' },
  { href: '/admin/billing', label: 'Billing' },
  { href: '/admin/transactions', label: 'Transactions' },
];

const NAV_PLATFORM = [
  { href: '/admin/feature-flags', label: 'Feature Flags' },
  { href: '/admin/comms', label: 'Comms' },
  { href: '/admin/audit-log', label: 'Audit Log' },
];

const NAV_SYSTEM = [
  { href: '/admin/system', label: 'Settings' },
];

const pageNames: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/isps': 'ISP Network',
  '/admin/billing': 'Billing',
  '/admin/transactions': 'Transactions',
  '/admin/feature-flags': 'Feature Flags',
  '/admin/comms': 'Comms',
  '/admin/audit-log': 'Audit Log',
  '/admin/system': 'Settings',
};

function renderNavItem(n: { href: string; label: string; exact?: boolean }, path: string) {
  const active = n.exact ? path === n.href : path.startsWith(n.href);
  return (
    <Link key={n.href} href={n.href} style={{
      display: 'flex', alignItems: 'center', height: 38,
      padding: '0 10px', borderRadius: 6,
      textDecoration: 'none', position: 'relative',
      fontFamily: 'Inter, sans-serif', fontSize: 13,
      color: active ? '#E8B84B' : '#8C8A84',
      background: active ? 'rgba(232,184,75,0.10)' : 'transparent',
      transition: 'background 0.12s',
    }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#111110'; e.currentTarget.style.color = '#EDEBE6'; }}}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8C8A84'; }}}
    >
      {active && <div style={{
        position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
        width: 4, height: 16, borderRadius: '0 3px 3px 0', background: '#E8B84B',
      }} />}
      {n.label}
    </Link>
  );
}

export default function BatcaveLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState('');

  const isLoginPage = path === '/admin/login';

  useEffect(() => {
    if (isLoginPage) { setLoading(false); return; }
    const token = localStorage.getItem('wb_token');
    if (!token) { router.replace('/admin/login'); return; }
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 5000);
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal })
      .then(r => { clearTimeout(tid); if (!r.ok) throw new Error(); return r.json(); })
      .then(d => {
        if (d.role !== 'platform_admin') { localStorage.removeItem('wb_token'); router.replace('/admin/login'); return; }
        setUser(d); setLoading(false);
      })
      .catch(() => { clearTimeout(tid); localStorage.removeItem('wb_token'); router.replace('/admin/login'); });
    return () => clearTimeout(tid);
  }, [path, router, isLoginPage]);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const day = days[d.getDay()];
      const date = d.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mon = months[d.getMonth()];
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      setClock(`${day} ${date} ${mon} · ${h}:${m}`);
    };
    tick(); const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  if (loading && !isLoginPage) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid rgba(232,184,75,0.3)', borderTop: '2px solid #E8B84B', margin: '0 auto 24px', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 13, color: '#6B6964', fontFamily: 'Inter, sans-serif' }}>Loading Batcave</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isLoginPage) return <>{children}</>;
  if (!user && !loading) return null;

  const currentPageName = Object.entries(pageNames).find(([href]) => href === path ? true : path.startsWith(href) && href !== '/admin')?.[1] || pageNames[path] || 'Dashboard';
  // Derive page name more carefully
  const pageName = (() => {
    if (path === '/admin') return 'Dashboard';
    for (const [href, name] of Object.entries(pageNames)) {
      if (href !== '/admin' && path.startsWith(href)) return name;
    }
    return 'Dashboard';
  })();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#000', color: '#EDEBE6' }}>
      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 220, flexShrink: 0, height: '100vh', position: 'sticky', top: 0,
        background: '#000', borderRight: '0.5px solid #2A2A27',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Brand row — 64px */}
        <div style={{
          height: 64, minHeight: 64, padding: '0 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '0.5px solid #1A1A18',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: '#E8B84B', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 700, color: '#3D2A06' }}>{'>'}_</span>
          </div>
          <div>
            <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 15, fontWeight: 700, color: '#E8B84B', lineHeight: 1.1 }}>BATCAVE</div>
            <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, fontWeight: 400, color: '#6B6964', letterSpacing: '0.15em' }}>COMMAND</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          <div style={{
            fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700,
            color: '#3A3A37', letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '0 8px', marginBottom: 4,
          }}>OPERATIONS</div>
          {NAV_OPERATIONS.map(n => renderNavItem(n, path))}
          <div style={{ height: 1, background: '#1A1A18', margin: '10px 8px' }} />
          <div style={{
            fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700,
            color: '#3A3A37', letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '0 8px', marginBottom: 4,
          }}>PLATFORM</div>
          {NAV_PLATFORM.map(n => renderNavItem(n, path))}
          <div style={{ height: 1, background: '#1A1A18', margin: '10px 8px' }} />
          <div style={{
            fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700,
            color: '#3A3A37', letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '0 8px', marginBottom: 4,
          }}>SYSTEM</div>
          {NAV_SYSTEM.map(n => renderNavItem(n, path))}
        </nav>

        {/* Bottom */}
        <div style={{ borderTop: '0.5px solid #2A2A27', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6FCF73' }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#6FCF73' }}>System operational</span>
          </div>
          <button onClick={() => { localStorage.removeItem('wb_token'); router.push('/admin/login'); }}
            style={{
              height: 32, borderRadius: 6, border: '0.5px solid #2A2A27', background: '#111110',
              color: '#8C8A84', fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
            ↩ Exit to ISP
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar — 48px */}
        <header style={{
          height: 48, minHeight: 48, background: '#000',
          borderBottom: '0.5px solid #1A1A18',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px',
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 11, fontWeight: 600, color: '#E8B84B', letterSpacing: '0.1em' }}>BATCAVE</span>
            <span style={{ color: '#3A3A37', fontSize: 12 }}>›</span>
            <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 500, color: '#EDEBE6' }}>{pageName}</span>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#3A3A37' }}>v0.1.0</span>
            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 12, color: '#6B6964' }}>{clock}</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#6FCF73' }}>● ALL SYSTEMS GO</span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#000' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
