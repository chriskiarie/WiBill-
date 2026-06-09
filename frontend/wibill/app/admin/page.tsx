'use client';

import { useEffect, useMemo, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const FRONTEND = 'https://wi-bill.vercel.app';

// ── Design tokens matching the Batcave design system ──────────────────────
const C = {
  bg:      '#030303',
  card:    '#080808',
  card2:   '#0a0a0a',
  border:  '#141414',
  border2: '#0d0d0d',
  text:    '#f0f0f0',
  muted:   '#444',
  dim:     '#222',
  gold:    '#fbbf24',
  green:   '#22c55e',
  red:     '#ef4444',
  amber:   '#f59e0b',
  blue:    '#60a5fa',
};

type Tone = 'good' | 'warn' | 'bad' | 'neutral';

function tone(status?: string): Tone {
  const s = (status || '').toLowerCase();
  if (['completed', 'paid', 'active', 'success', 'ok', 'connected'].includes(s)) return 'good';
  if (['pending', 'sandbox', 'processing'].includes(s)) return 'warn';
  if (['failed', 'inactive', 'offline', 'error'].includes(s)) return 'bad';
  return 'neutral';
}

function toneColor(t: Tone) {
  if (t === 'good') return C.green;
  if (t === 'warn') return C.amber;
  if (t === 'bad')  return C.red;
  return C.blue;
}

function money(n?: number) {
  if (typeof n !== 'number' || Number.isNaN(n)) return 'KES 0';
  return `KES ${new Intl.NumberFormat('en-KE').format(Math.round(n))}`;
}

function ago(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

// ── Shared card wrapper ───────────────────────────────────────────────────
function Card({ accent = C.gold, title, subtitle, children, span = 1 }: {
  accent?: string; title: string; subtitle?: string;
  children: React.ReactNode; span?: number;
}) {
  return (
    <div style={{
      background: C.card, border: `0.5px solid ${C.border}`,
      borderTop: `2px solid ${accent}`, borderRadius: 12, padding: 24,
      gridColumn: span > 1 ? `span ${span}` : undefined,
    }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Syne, sans-serif' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: C.muted, fontFamily: 'DM Mono, monospace', marginTop: 4 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

// ── KPI metric ───────────────────────────────────────────────────────────
function KPI({ label, value, accent = C.gold }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ background: C.card2, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: '16px 20px' }}>
      <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'DM Mono, monospace', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 28, fontFamily: 'DM Mono, monospace', color: accent, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
    </div>
  );
}

// ── Status dot ───────────────────────────────────────────────────────────
function Dot({ status }: { status: string }) {
  const c = toneColor(tone(status));
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 4, background: `${c}18`, border: `0.5px solid ${c}40` }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block' }} />
      <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase', color: c }}>{status}</span>
    </span>
  );
}

interface ISP { id: string; name: string; slug: string; is_active: boolean; commission_rate: number; status: string; created_at: string; }
interface Txn { id: string; amount_ksh: number; isp_earnings_ksh: number; platform_fee_ksh: number; status: string; created_at: string; }
interface RevenuePoint { date: string; amount: number; }
interface Health { status: string; version: string; database: string; environment: string; }

export default function AdminDashboard() {
  const [isps, setIsps]   = useState<ISP[]>([]);
  const [txns, setTxns]   = useState<Txn[]>([]);
  const [trend, setTrend] = useState<RevenuePoint[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [time, setTime]   = useState(new Date());

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const token = localStorage.getItem('wb_token');
      if (!token) { setLoading(false); return; }
      const h = { Authorization: `Bearer ${token}` };
      const safe = async (url: string) => { try { const r = await fetch(url, { headers: h }); return r.ok ? r.json() : null; } catch { return null; } };

      const [ispData, txnData, healthData] = await Promise.all([
        safe(`${API}/api/`),
        safe(`${API}/api/transactions?limit=50`),
        fetch(`${API}/health`).then(r => r.json()).catch(() => null),
      ]);

      if (!mounted) return;

      const ispList: ISP[] = Array.isArray(ispData) ? ispData : Array.isArray(ispData?.value) ? ispData.value : [];
      const txnList: Txn[] = Array.isArray(txnData) ? txnData : Array.isArray(txnData?.value) ? txnData.value : [];

      setIsps(ispList);
      setTxns(txnList.slice(0, 8));
      if (healthData) setHealth(healthData);

      // Build 7-day trend from transactions
      const now = new Date();
      const byDay = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(now.getDate() - i);
        const k = d.toISOString().slice(0, 10);
        byDay.set(k, 0);
      }
      txnList.forEach(t => {
        if (!t.created_at) return;
        const k = new Date(t.created_at).toISOString().slice(0, 10);
        if (byDay.has(k)) byDay.set(k, (byDay.get(k) || 0) + (t.amount_ksh || 0));
      });
      setTrend([...byDay.entries()].map(([k, amount]) => ({
        date: new Date(`${k}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount,
      })));

      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const trendMax = useMemo(() => Math.max(...trend.map(p => p.amount), 1), [trend]);

  const totalRevenue  = txns.reduce((a, t) => a + (t.amount_ksh || 0), 0);
  const platformFees  = txns.reduce((a, t) => a + (t.platform_fee_ksh || 0), 0);
  const ispPayouts    = txns.reduce((a, t) => a + (t.isp_earnings_ksh || 0), 0);
  const activeISPs    = isps.filter(i => i.is_active).length;
  const pendingISPs   = isps.filter(i => i.status === 'pending_approval').length;
  const successTxns   = txns.filter(t => tone(t.status) === 'good').length;
  const successRate   = txns.length > 0 ? Math.round((successTxns / txns.length) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Syne, sans-serif' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px 40px' }}>

        {/* Header */}
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `0.5px solid ${C.border}`, marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>CONTROL ROOM</div>
            <div style={{ fontSize: 11, color: C.muted, fontFamily: 'DM Mono, monospace', marginTop: 2 }}>WiBill Command Center</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}` }} />
              <span style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Live</span>
            </div>
            <div style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', color: C.muted }}>{timeStr}</div>
          </div>
        </div>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
          <KPI label="Total Revenue" value={money(totalRevenue)} accent={C.blue} />
          <KPI label="Platform Fees" value={money(platformFees)} accent={C.gold} />
          <KPI label="ISP Payouts" value={money(ispPayouts)} accent={C.green} />
          <KPI label="Success Rate" value={`${successRate}%`} accent={C.amber} />
        </div>

        {/* Secondary KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <KPI label="Active ISPs" value={`${activeISPs}`} accent={C.green} />
          <KPI label="Pending Approval" value={`${pendingISPs}`} accent={C.amber} />
          <KPI label="Transactions" value={`${txns.length}`} accent={C.blue} />
          <KPI label="Total ISPs" value={`${isps.length}`} accent={C.gold} />
        </div>

        {/* Revenue Chart + System Health */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>

          {/* Revenue Contour */}
          <Card title="Revenue Contour" subtitle="7-day collection from real transaction timestamps" accent={C.gold}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, alignItems: 'end', height: 180 }}>
              {trend.length === 0 ? (
                <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace', border: `0.5px dashed ${C.border}`, borderRadius: 8 }}>
                  Awaiting transaction data
                </div>
              ) : trend.map(pt => {
                const h = Math.max((pt.amount / trendMax) * 100, 4);
                return (
                  <div key={pt.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', background: C.card2, border: `0.5px solid ${C.border}`, borderRadius: 6, padding: 6, minHeight: 140 }}>
                      <div style={{ width: '100%', height: `${h}%`, minHeight: 4, borderRadius: 4, background: C.gold }} title={`${pt.date}: ${money(pt.amount)}`} />
                    </div>
                    <div style={{ fontSize: 9, color: C.muted, fontFamily: 'DM Mono, monospace', textAlign: 'center' }}>{pt.date}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
              {[
                { label: 'Completed', val: successTxns, color: C.green },
                { label: 'Pending', val: txns.filter(t => tone(t.status) === 'warn').length, color: C.amber },
                { label: 'Failed', val: txns.filter(t => tone(t.status) === 'bad').length, color: C.red },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background: C.card2, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 20, fontFamily: 'DM Mono, monospace', color }}>{val}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* System Health */}
          <Card title="System Nodes" subtitle="Live platform health" accent={C.blue}>
            {!health ? (
              <div style={{ color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace' }}>Loading...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { label: 'API Gateway', status: health.status },
                  { label: 'Database', status: health.database },
                  { label: 'M-Pesa', status: health.environment === 'production' ? 'live' : 'sandbox' },
                  { label: 'Environment', status: health.environment },
                ].map(({ label, status }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `0.5px solid ${C.border2}` }}>
                    <div>
                      <div style={{ fontSize: 13, color: C.text }}>{label}</div>
                      <div style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Mono, monospace', marginTop: 3 }}>Core service</div>
                    </div>
                    <Dot status={status} />
                  </div>
                ))}
                <div style={{ marginTop: 16, padding: 14, background: C.card2, border: `0.5px solid ${C.border}`, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Platform</div>
                  {[
                    ['Version', health.version],
                    ['ISPs', `${isps.length} configured`],
                    ['Mode', 'Operational'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: C.muted }}>{k}</span>
                      <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: C.gold }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Recent Transactions + ISP Network */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>

          {/* Transactions */}
          <Card title="Recent Transactions" subtitle="Latest movement across the billing layer" accent={C.green}>
            {loading ? (
              <div style={{ color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace' }}>Loading...</div>
            ) : txns.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace', border: `0.5px dashed ${C.border}`, borderRadius: 8 }}>No transactions yet</div>
            ) : txns.map(t => {
              const tc = toneColor(tone(t.status));
              return (
                <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 70px', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: `0.5px solid ${C.border2}` }}>
                  <div>
                    <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.text }}>{t.id.slice(0, 14)}…</div>
                    <div style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Mono, monospace', marginTop: 3 }}>{t.created_at ? ago(t.created_at) : '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'DM Mono, monospace', fontSize: 12, color: C.gold }}>{money(t.amount_ksh)}</div>
                  <div style={{ textAlign: 'right', fontFamily: 'DM Mono, monospace', fontSize: 12, color: C.green }}>{money(t.isp_earnings_ksh)}</div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', color: tc, background: `${tc}18`, border: `0.5px solid ${tc}40`, borderRadius: 4, padding: '3px 6px' }}>{t.status}</span>
                  </div>
                </div>
              );
            })}
          </Card>

          {/* ISP Network */}
          <Card title="ISP Network" subtitle="Partner roster and commission view" accent={C.amber}>
            {loading ? (
              <div style={{ color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace' }}>Loading...</div>
            ) : isps.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace', border: `0.5px dashed ${C.border}`, borderRadius: 8 }}>No ISPs yet</div>
            ) : isps.slice(0, 8).map(isp => {
              const isPending = isp.status === 'pending_approval';
              const dotColor = isPending ? C.amber : isp.is_active ? C.green : C.red;
              return (
                <div key={isp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `0.5px solid ${C.border2}` }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor }} />
                      <span style={{ fontSize: 13, color: C.text }}>{isp.name}</span>
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Mono, monospace', marginTop: 3 }}>/{isp.slug}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {isPending ? (
                      <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: C.amber, background: `${C.amber}18`, border: `0.5px solid ${C.amber}40`, borderRadius: 4, padding: '3px 6px', textTransform: 'uppercase' }}>Pending</span>
                    ) : (
                      <div style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: C.muted }}>{isp.commission_rate}% comm.</div>
                    )}
                  </div>
                </div>
              );
            })}
            {isps.length > 8 && (
              <div style={{ paddingTop: 12, fontSize: 11, color: C.muted, fontFamily: 'DM Mono, monospace', textAlign: 'center' }}>+{isps.length - 8} more ISPs</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}