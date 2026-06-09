'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const C = {
  void: '#000000',
  base: '#080808',
  raised: '#0d0d0d',
  border: '#141414',
  text: '#f0f0f0',
  muted: '#444444',
  dim: '#1e1e1e',
  gold: '#E8B84B',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
};

const label = (text: string) => (
  <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: C.muted, marginBottom: 8 }}>
    {text}
  </div>
);

const StatusDot = ({ ok }: { ok: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <div style={{ width: 6, height: 6, borderRadius: '50%', background: ok ? C.green : C.red, boxShadow: `0 0 6px ${ok ? C.green : C.red}` }} />
    <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase', color: ok ? C.green : C.red }}>
      {ok ? 'OK' : 'ERR'}
    </span>
  </div>
);

interface Stats { revenue_today: number; revenue_month: number; active_sessions: number; total_isps: number; }
interface Txn { id: string; amount_ksh: number; platform_fee_ksh: number; isp_earnings_ksh: number; status: string; created_at: string; phone_number?: string; }
interface ISP { id: string; name: string; is_active: boolean; slug: string; created_at: string; }

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ revenue_today: 0, revenue_month: 0, active_sessions: 0, total_isps: 0 });
  const [txns, setTxns] = useState<Txn[]>([]);
  const [isps, setIsps] = useState<ISP[]>([]);
  const [health, setHealth] = useState<{ status: string; database: string } | null>(null);
  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('wb_token');
    if (!token) return;

    const h = { Authorization: `Bearer ${token}` };

    Promise.allSettled([
      fetch(`${API}/api/tenants/dashboard`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/transactions?limit=6`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/`, { headers: h }).then(r => r.json()),
      fetch(`${API}/health`).then(r => r.json()),
    ]).then(([dash, txnRes, ispRes, healthRes]) => {
      const d = dash.status === 'fulfilled' ? dash.value : null;
      const t = txnRes.status === 'fulfilled' ? txnRes.value : null;
      const i = ispRes.status === 'fulfilled' ? ispRes.value : null;
      const hl = healthRes.status === 'fulfilled' ? healthRes.value : null;

      const ispList: ISP[] = Array.isArray(i) ? i : Array.isArray(i?.value) ? i.value : [];

      setStats({
        revenue_today: d?.revenue_today || 0,
        revenue_month: d?.revenue_month || 0,
        active_sessions: d?.active_sessions || 0,
        total_isps: ispList.length,
      });
      setTxns((Array.isArray(t?.value) ? t.value : []).slice(0, 6));
      setIsps(ispList.slice(0, 6));
      setHealth(hl);
      setLoading(false);
    });
  }, []);

  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const card = (children: React.ReactNode, accent?: string) => (
    <div style={{
      background: C.base, border: `0.5px solid ${C.border}`,
      borderTop: accent ? `2px solid ${accent}` : undefined,
      borderRadius: 10, padding: 24,
    }}>
      {children}
    </div>
  );

  const statNum = (val: number | string, color: string) => (
    <div style={{ fontSize: 36, fontFamily: 'DM Mono, monospace', fontWeight: 500, color, letterSpacing: '-0.03em', lineHeight: 1 }}>
      {val}
    </div>
  );

  const statusBadge = (status: string) => {
    const ok = status === 'completed' || status === 'paid';
    return (
      <span style={{
        display: 'inline-block', padding: '2px 8px', borderRadius: 4,
        fontSize: 9, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase',
        background: ok ? `${C.green}15` : `${C.amber}15`,
        color: ok ? C.green : C.amber,
        border: `0.5px solid ${ok ? `${C.green}30` : `${C.amber}30`}`,
      }}>
        {status}
      </span>
    );
  };

  return (
    <div style={{ background: C.void, color: C.text, minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* TOPBAR */}
      <div style={{ height: 52, borderBottom: `0.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
        <div style={{ fontSize: 18, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
          Dashboard
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}` }} />
            <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.muted }}>LIVE</span>
          </div>
          <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.muted }}>{timeStr}</span>
        </div>
      </div>

      <div style={{ padding: 28, maxWidth: 1400, margin: '0 auto' }}>

        {/* STAT CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {card(
            <>{label('Revenue Today')}{statNum(stats.revenue_today ? `${(stats.revenue_today / 1000).toFixed(1)}K` : '--', C.gold)}<div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.muted, marginTop: 6 }}>KES</div></>,
            C.gold
          )}
          {card(
            <>{label('Monthly Revenue')}{statNum(stats.revenue_month ? `${(stats.revenue_month / 1000).toFixed(1)}K` : '--', C.blue)}<div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.muted, marginTop: 6 }}>KES</div></>,
            C.blue
          )}
          {card(
            <>{label('Active Sessions')}{statNum(stats.active_sessions || '--', C.green)}<div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.muted, marginTop: 6 }}>Online</div></>,
            C.green
          )}
          {card(
            <>{label('ISP Network')}{statNum(stats.total_isps || '--', C.amber)}<div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.muted, marginTop: 6 }}>Partners</div></>,
            C.amber
          )}
        </div>

        {/* BOTTOM GRID: ISPs + Txns + System */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 280px', gap: 16 }}>

          {/* ISP NETWORK */}
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: 24 }}>
            {label('ISP Network')}
            {loading ? (
              <div style={{ color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace', padding: '20px 0' }}>Loading...</div>
            ) : isps.length === 0 ? (
              <div style={{ color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace', padding: '20px 0' }}>No ISPs onboarded yet</div>
            ) : (
              <div>
                {isps.map((isp, i) => (
                  <div key={isp.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto',
                    gap: 16, padding: '12px 0',
                    borderBottom: i < isps.length - 1 ? `0.5px solid ${C.dim}` : 'none',
                    alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 3 }}>{isp.name}</div>
                      <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.muted }}>/{isp.slug}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: isp.is_active ? C.green : C.red, boxShadow: `0 0 6px ${isp.is_active ? C.green : C.red}` }} />
                      <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase', color: isp.is_active ? C.green : C.red }}>
                        {isp.is_active ? 'Live' : 'Off'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RECENT TRANSACTIONS */}
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: 24 }}>
            {label('Recent Transactions')}
            {loading ? (
              <div style={{ color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace', padding: '20px 0' }}>Loading...</div>
            ) : txns.length === 0 ? (
              <div style={{ color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace', padding: '20px 0' }}>No transactions yet</div>
            ) : (
              <div>
                {txns.map((txn, i) => (
                  <div key={txn.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto auto',
                    gap: 12, padding: '12px 0',
                    borderBottom: i < txns.length - 1 ? `0.5px solid ${C.dim}` : 'none',
                    alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.muted }}>{txn.id.slice(0, 8)}…</div>
                      {txn.phone_number && <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.muted, marginTop: 2 }}>{txn.phone_number}</div>}
                    </div>
                    <div style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', color: C.gold, fontWeight: 500, textAlign: 'right' }}>
                      {txn.amount_ksh.toLocaleString()}
                    </div>
                    {statusBadge(txn.status)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SYSTEM STATUS */}
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: 24, display: 'flex', flexDirection: 'column', gap: 0 }}>
            {label('System Status')}
            {[
              { name: 'API Server', ok: !!health },
              { name: 'Database', ok: health?.database === 'connected' || health?.database === 'ok' },
              { name: 'M-Pesa', ok: false },
            ].map((item, i, arr) => (
              <div key={item.name} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 0',
                borderBottom: i < arr.length - 1 ? `0.5px solid ${C.dim}` : 'none',
              }}>
                <span style={{ fontSize: 13, color: health || i === 0 ? '#888' : C.muted }}>{item.name}</span>
                <StatusDot ok={item.ok} />
              </div>
            ))}
            {health && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `0.5px solid ${C.dim}` }}>
                {label('Version')}
                <div style={{ fontSize: 14, fontFamily: 'DM Mono, monospace', color: C.gold }}>{(health as any).version || 'v1'}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
