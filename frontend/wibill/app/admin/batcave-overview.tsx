'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function StatCard({ label, value, sub, color, icon }: any) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #08080f, #0d0d18)',
      border: `1px solid ${color}18`,
      borderRadius: 16, padding: '24px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div style={{ position: 'absolute', bottom: -20, right: -10, fontSize: 80, opacity: 0.04, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: `${color}90`, marginBottom: 14 }}>{label}</div>
      <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.04em', color: '#fff', fontFamily: '"DM Mono", monospace', lineHeight: 1, marginBottom: 8 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>{sub}</div>}
    </div>
  );
}

export default function BatcaveOverview() {
  const [isps, setIsps] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/api/tenants/`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/transactions/?limit=1000`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/sessions/?limit=500`, { headers: h }).then(r => r.json()),
    ]).then(([t, tx, s]) => {
      setIsps(Array.isArray(t) ? t : []);
      setTxns(Array.isArray(tx) ? tx : []);
      setSessions(Array.isArray(s) ? s : []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const gmv = txns.reduce((s, t) => s + (t.amount || t.amount_ksh || 0), 0);
  const fees = txns.reduce((s, t) => s + (t.platform_fee || t.platform_fee_ksh || 0), 0);
  const active = sessions.filter(s => s.status === 'active').length;
  const activeIsps = isps.filter(i => i.is_active).length;

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString();
  const fmtKsh = (n: number) => `Ksh ${fmt(n)}`;

  // Recent txns (last 5)
  const recentTxns = txns.slice(0, 5);

  // Day of week greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ padding: '36px 40px', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, color: 'rgba(250,200,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8, fontFamily: '"DM Mono", monospace' }}>
          {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-0.04em', color: '#fff', margin: '0 0 6px', lineHeight: 1 }}>
          {greeting}, Chris
        </h1>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>
          {activeIsps} ISP{activeIsps !== 1 ? 's' : ''} active · {active} live session{active !== 1 ? 's' : ''} right now
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 36 }}>
        <StatCard label="Total GMV" value={loading ? '...' : fmtKsh(gmv)} sub="All ISP payments" color="#fac800" icon="◆" />
        <StatCard label="Your Earnings" value={loading ? '...' : fmtKsh(fees)} sub="Platform 10% cut" color="#22c55e" icon="₿" />
        <StatCard label="Active ISPs" value={loading ? '...' : activeIsps} sub={`${isps.length} total registered`} color="#3b82f6" icon="◈" />
        <StatCard label="Transactions" value={loading ? '...' : txns.length} sub="All time total" color="#a855f7" icon="≋" />
        <StatCard label="Live Sessions" value={loading ? '...' : active} sub="Right now" color="#f97316" icon="⬡" />
      </div>

      {/* Bottom grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        {/* ISP table */}
        <div style={{ background: '#08080f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>ISP Network</div>
            <a href="/admin/isps" style={{ fontSize: 11, color: 'rgba(250,200,0,0.5)', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.1em' }}>manage all →</a>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['ISP', 'Slug', 'Status', 'Commission', 'Balance'].map(h => (
                  <th key={h} style={{ padding: '10px 24px', textAlign: 'left', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.2)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '32px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: 13 }}>Loading...</td></tr>
              ) : isps.slice(0, 6).map(isp => (
                <tr key={isp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '12px 24px', fontSize: 13, fontWeight: 600, color: '#fff' }}>{isp.name}</td>
                  <td style={{ padding: '12px 24px' }}>
                    <code style={{ fontSize: 11, color: '#fac800', background: 'rgba(250,200,0,0.08)', padding: '2px 8px', borderRadius: 4 }}>{isp.slug}</code>
                  </td>
                  <td style={{ padding: '12px 24px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: isp.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: isp.is_active ? '#22c55e' : '#ef4444', border: `1px solid ${isp.is_active ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                      {isp.is_active ? '● LIVE' : '○ OFF'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 24px', fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: '"DM Mono", monospace' }}>{((isp.commission_rate || 0.1) * 100).toFixed(0)}%</td>
                  <td style={{ padding: '12px 24px', fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: '"DM Mono", monospace' }}>Ksh {(isp.balance_ksh || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent transactions */}
        <div style={{ background: '#08080f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Recent Payments</div>
            <a href="/admin/transactions" style={{ fontSize: 11, color: 'rgba(250,200,0,0.5)', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.1em' }}>all →</a>
          </div>
          <div style={{ padding: '8px 0' }}>
            {loading ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: 13 }}>Loading...</div>
            ) : recentTxns.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: 13 }}>No transactions yet</div>
            ) : recentTxns.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div>
                  <div style={{ fontSize: 13, color: '#fff', fontFamily: '"DM Mono", monospace' }}>{t.phone_number}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                    {t.created_at ? new Date(t.created_at).toLocaleDateString('en-KE') : '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', fontFamily: '"DM Mono", monospace' }}>
                    +{(t.platform_fee || t.platform_fee_ksh || 0).toFixed(0)}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                    Ksh {(t.amount || t.amount_ksh || 0).toLocaleString()} total
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}