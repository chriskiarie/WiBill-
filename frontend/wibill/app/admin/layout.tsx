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
    const timeout = setTimeout(() => controller.abort(), 6000);

    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(r => {
        clearTimeout(timeout);
        if (!r.ok) throw new Error();
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
        setUser({ role: 'platform_admin' });
        setLoading(false);
      });

    return () => clearTimeout(timeout);
  }, [path]);

  // ================= LOADING SCREEN =================
  if (loading && path !== '/admin/login') {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loadingBox}>
          <div style={styles.orb} />
          <div style={styles.loadingText}>ACCESSING BATCAVE CORE</div>
          <div style={styles.loadingSub}>Synchronizing intelligence layers...</div>
        </div>

        <style>{`
          @keyframes pulseGlow {
            0% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.08); }
            100% { opacity: 0.4; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  if (path === '/admin/login') return children;
  if (!user) return null;

  // ================= UI =================
  return (
    <div style={styles.shell}>

      {/* SIDEBAR */}
      <aside style={{
        ...styles.sidebar,
        width: sidebarOpen ? 260 : 78,
      }}>

        {/* BRAND */}
        <div style={styles.brand}>
          <div style={styles.logo}>⚡</div>

          {sidebarOpen && (
            <div>
              <div style={styles.brandTitle}>BATCAVE</div>
              <div style={styles.brandSub}>COMMAND SYSTEM</div>
            </div>
          )}
        </div>

        {/* NAV */}
        <nav style={styles.nav}>
          {NAV_ITEMS.map(item => {
            const active = item.exact ? path === item.href : path.startsWith(item.href);

            return (
              <Link key={item.href} href={item.href} style={{
                ...styles.link,
                background: active ? 'rgba(250,200,0,0.10)' : 'transparent',
                borderColor: active ? 'rgba(250,200,0,0.35)' : 'transparent',
                color: active ? '#facc15' : 'rgba(255,255,255,0.55)',
              }}>
                <i className={`ti ${item.icon}`} style={styles.icon} />
                {sidebarOpen && <span>{item.label}</span>}
                {active && <div style={styles.dot} />}
              </Link>
            );
          })}
        </nav>

        {/* FOOTER */}
        <div style={styles.footer}>
          <div style={styles.statusRow}>
            <div style={styles.statusDot} />
            {sidebarOpen && <span style={styles.statusText}>SYSTEM ONLINE</span>}
          </div>

          {sidebarOpen && (
            <button
              onClick={() => {
                localStorage.removeItem('wb_token');
                router.push('/admin/login');
              }}
              style={styles.logout}
            >
              Exit System
            </button>
          )}
        </div>

        {/* TOGGLE */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={styles.toggle}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </aside>

      {/* MAIN */}
      <main style={styles.main}>
        {children}
      </main>
    </div>
  );
}

// ================= STYLES =================
const styles: any = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: '#07070c',
    color: '#fff',
    fontFamily: 'Inter, sans-serif',
  },

  sidebar: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(180deg, #0b0b12, #07070c)',
    borderRight: '1px solid rgba(250,200,0,0.08)',
    transition: 'all 0.25s ease',
  },

  brand: {
    display: 'flex',
    gap: 12,
    padding: 18,
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },

  logo: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: 'linear-gradient(135deg,#facc15,#f59e0b)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#000',
    fontWeight: 900,
  },

  brandTitle: {
    fontWeight: 900,
    letterSpacing: '2px',
    fontSize: 14,
  },

  brandSub: {
    fontSize: 10,
    opacity: 0.4,
    letterSpacing: '1px',
  },

  nav: {
    flex: 1,
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },

  link: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid transparent',
    textDecoration: 'none',
    fontSize: 13,
    transition: '0.15s',
    position: 'relative',
  },

  icon: {
    fontSize: 16,
    opacity: 0.8,
  },

  dot: {
    marginLeft: 'auto',
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#facc15',
    boxShadow: '0 0 10px #facc15',
  },

  footer: {
    padding: 14,
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },

  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#22c55e',
    boxShadow: '0 0 10px #22c55e',
  },

  statusText: {
    fontSize: 10,
    opacity: 0.5,
  },

  logout: {
    marginTop: 10,
    width: '100%',
    padding: 8,
    fontSize: 11,
    borderRadius: 8,
    background: 'rgba(250,200,0,0.08)',
    border: '1px solid rgba(250,200,0,0.2)',
    color: '#facc15',
    cursor: 'pointer',
  },

  toggle: {
    position: 'absolute',
    right: -10,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: '#111',
    border: '1px solid rgba(250,200,0,0.3)',
    color: '#facc15',
    cursor: 'pointer',
  },

  main: {
    flex: 1,
    overflow: 'auto',
    background: '#0a0a0f',
  },

  // loading
  loadingWrap: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#050507',
  },

  loadingBox: {
    textAlign: 'center',
  },

  orb: {
    width: 60,
    height: 60,
    margin: '0 auto 20px',
    borderRadius: '50%',
    background: 'radial-gradient(circle,#facc15,transparent)',
    animation: 'pulseGlow 1.4s infinite',
  },

  loadingText: {
    fontSize: 12,
    letterSpacing: '2px',
    color: '#facc15',
  },

  loadingSub: {
    fontSize: 10,
    opacity: 0.4,
    marginTop: 6,
  },
};