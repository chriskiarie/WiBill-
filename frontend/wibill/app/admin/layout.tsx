'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Radio, Receipt, ArrowRightLeft, Flag, FileText, MessageSquare, History, Settings, LogOut } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const NAV_OPERATIONS = [
  { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={16} />, exact: true },
  { href: '/admin/isps', label: 'ISP Network', icon: <Radio size={16} /> },
  { href: '/admin/billing', label: 'Billing', icon: <Receipt size={16} /> },
  { href: '/admin/transactions', label: 'Transactions', icon: <ArrowRightLeft size={16} /> },
  { href: '/admin/revenue', label: 'Revenue', icon: <Receipt size={16} /> },
];

const NAV_PLATFORM = [
  { href: '/admin/feature-flags', label: 'Feature Flags', icon: <Flag size={16} /> },
  { href: '/admin/invoices', label: 'Invoices', icon: <FileText size={16} /> },
  { href: '/admin/comms', label: 'Comms', icon: <MessageSquare size={16} /> },
  { href: '/admin/audit-log', label: 'Audit Log', icon: <History size={16} /> },
];

const NAV_SYSTEM = [
  { href: '/admin/system', label: 'Settings', icon: <Settings size={16} /> },
];

const pageNames: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/isps': 'ISP Network',
  '/admin/billing': 'Billing',
  '/admin/transactions': 'Transactions',
  '/admin/revenue': 'Revenue',
  '/admin/feature-flags': 'Feature Flags',
  '/admin/invoices': 'Invoices',
  '/admin/comms': 'Comms',
  '/admin/audit-log': 'Audit Log',
  '/admin/system': 'Settings',
};


function renderNavItem(n: { href: string; label: string; icon: React.ReactNode; exact?: boolean }, path: string) {
  const active = n.exact ? path === n.href : path.startsWith(n.href);
  return (
    <Link key={n.href} href={n.href} style={{
      display: 'flex', alignItems: 'center', height: 38, gap: 10,
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
      <span style={{ opacity: active ? 1 : 0.5, flexShrink: 0, display: 'flex' }}>{n.icon}</span>
      {active && <div style={{
        position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
        width: 4, height: 16, borderRadius: '0 3px 3px 0', background: '#E8B84B',
      }} />}
      {n.label}
    </Link>
  );
}

import { useAuth } from '@/lib/auth'

export default function MyDashLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const { logout } = useAuth();
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
        if (d.role !== 'platform_admin') { logout(); return; }
        setUser(d); setLoading(false);
      })
      .catch(() => { clearTimeout(tid); logout(); });
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
      <div style={{ minHeight: '100vh', background: '#000 url(/bg.jpg) fixed center/cover no-repeat', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative', width: 90, height: 90, margin: '0 auto 24px' }}>
            <style>{`@keyframes orb { from { transform: rotate(0deg) translateX(38px) rotate(0deg); } to { transform: rotate(360deg) translateX(38px) rotate(-360deg); } }`}</style>
            <span style={{ position: 'absolute', top: '50%', left: '50%', width: 24, height: 24, margin: -12, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 20, textAlign: 'center', lineHeight: '24px', animation: 'orb 3s linear infinite', animationDelay: '0s', color: '#E8B84B' }}>X</span>
            <span style={{ position: 'absolute', top: '50%', left: '50%', width: 24, height: 24, margin: -12, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 20, textAlign: 'center', lineHeight: '24px', animation: 'orb 3s linear infinite', animationDelay: '-1s', color: '#EDEBE6' }}>w</span>
            <span style={{ position: 'absolute', top: '50%', left: '50%', width: 24, height: 24, margin: -12, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 20, textAlign: 'center', lineHeight: '24px', animation: 'orb 3s linear infinite', animationDelay: '-2s', color: '#E8B84B' }}>B</span>
          </div>
          <div style={{ fontSize: 13, color: '#6B6964', fontFamily: 'Inter, sans-serif' }}>Loading MyDash</div>
        </div>
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
    <div style={{ display: 'flex', minHeight: '100vh', color: '#EDEBE6', background: '#000 url(/bg.jpg) fixed center/cover no-repeat' }}>
      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 220, flexShrink: 0,
        height: 'calc(100vh - 24px)', margin: '12px 0 12px 12px',
        position: 'sticky', top: 12,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Brand row — 64px */}
        <div style={{
          height: 72, minHeight: 72, padding: '0 18px',
          display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        }}>
          <img src="/logos/wibill-wb-monogram-192.png" alt="WiBill" style={{ width: 44, height: 44, objectFit: 'contain', display: 'block', flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{
              fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: 800,
              color: '#E8B84B', letterSpacing: '0.04em', lineHeight: 1,
            }}>MYDASH</span>
            <span style={{
              fontFamily: '"Space Grotesk", sans-serif', fontSize: 10, fontWeight: 600,
              color: '#8C8A84', letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '2px 8px', border: '0.5px solid #3A3A37', borderRadius: 4,
            }}>ADMIN</span>
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
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6FCF73', boxShadow: '0 0 6px rgba(111,207,115,0.4)' }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#6FCF73' }}>System operational</span>
          </div>
          <button onClick={logout}
            style={{
              height: 32, borderRadius: 6, border: '0.5px solid #2A2A27', background: 'transparent',
              color: '#6B6964', fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'color 0.12s, border-color 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#E5707A'; e.currentTarget.style.borderColor = '#E5707A'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6B6964'; e.currentTarget.style.borderColor = '#2A2A27'; }}>
            <LogOut size={12} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar — 48px */}
        <header style={{
          height: 52, minHeight: 52, background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 12, margin: '12px 12px 0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px',
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 600, color: '#E8B84B', letterSpacing: '0.05em' }}>WiBill</span>
            <span style={{ color: '#3A3A37', fontSize: 15 }}>›</span>
            <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 18, fontWeight: 600, color: '#EDEBE6' }}>{pageName}</span>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#3A3A37' }}>v0.1.0</span>
            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 12, color: '#6B6964' }}>{clock}</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#6FCF73', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6FCF73', display: 'inline-block', animation: 'pulse-dot 2s ease-in-out infinite' }} />
              ALL SYSTEMS GO
            </span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', background: 'transparent', padding: '12px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
