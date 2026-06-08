'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const NAV = [
  { href: '/admin', label: 'Command Center', icon: '⬡', exact: true },
  { href: '/admin/isps', label: 'ISP Network', icon: '◈' },
  { href: '/admin/revenue', label: 'Revenue Intel', icon: '◆' },
  { href: '/admin/transactions', label: 'Transactions', icon: '≋' },
  { href: '/admin/system', label: 'System Core', icon: '⊛' },
];

export default function BatcaveLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [user, setUser] = useState<any>(null);
  const [time, setTime] = useState('');

  useEffect(() => {
    // Strict role check — platform_admin only, no exceptions
    const token = sessionStorage.getItem('token');
    const role = sessionStorage.getItem('role');
    if (!token || role !== 'platform_admin') {
      router.replace('/admin/login');
      return;
    }
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        if (data.role !== 'platform_admin') {
          sessionStorage.clear();
          router.replace('/admin/login');
          return;
        }
        setUser(data);
      })
      .catch(() => { sessionStorage.clear(); router.replace('/admin/login'); });

    // Live clock
    const tick = () => setTime(new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: '#030308',
      color: '#e8e4d0',
      fontFamily: '"Space Grotesk", Inter, sans-serif',
    }}>
      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 240,
        background: 'linear-gradient(180deg, #08080f 0%, #050510 100%)',
        borderRight: '1px solid rgba(250,200,0,0.08)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
        flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            {/* XwB logo mark */}
            <div style={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, #fac800, #f59e0b)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 900, color: '#0a0800',
              boxShadow: '0 0 20px rgba(250,200,0,0.3)',
              letterSpacing: '-0.05em',
            }}>X</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.04em', color: '#fff', lineHeight: 1 }}>
                Xw<span style={{ color: '#fac800' }}>B</span>
              </div>
              <div style={{ fontSize: 9, color: 'rgba(250,200,0,0.5)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 2 }}>Batcave</div>
            </div>
          </div>
          {/* Live clock */}
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: 'rgba(250,200,0,0.4)', letterSpacing: '0.05em', marginTop: 8 }}>{time}</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.2)', padding: '0 10px', marginBottom: 8 }}>Operations</div>
          {NAV.map(n => {
            const active = n.exact ? path === n.href : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10,
                background: active ? 'rgba(250,200,0,0.08)' : 'transparent',
                border: `1px solid ${active ? 'rgba(250,200,0,0.2)' : 'transparent'}`,
                color: active ? '#fac800' : 'rgba(255,255,255,0.35)',
                fontSize: 13, fontWeight: active ? 600 : 400,
                textDecoration: 'none', transition: 'all 0.15s',
                letterSpacing: '-0.01em',
              }}>
                <span style={{ fontSize: 15, opacity: active ? 1 : 0.6 }}>{n.icon}</span>
                {n.label}
                {active && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: '#fac800' }} />}
              </Link>
            );
          })}
        </nav>

        {/* Platform status */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.04)', marginBottom: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>All systems operational</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(250,200,0,0.5)', marginBottom: 12, fontFamily: '"DM Mono", monospace', letterSpacing: '0.02em' }}>
            {user?.email || '...'}
          </div>
          <button
            onClick={() => { sessionStorage.clear(); router.push('/admin/login'); }}
            style={{
              width: '100%', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
              padding: '8px', color: 'rgba(255,255,255,0.3)', fontSize: 12,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
            ↗ Exit Batcave
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, overflowY: 'auto', background: '#030308' }}>
        {children}
      </main>
    </div>
  );
}