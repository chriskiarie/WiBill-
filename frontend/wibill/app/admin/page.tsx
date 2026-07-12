'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw, DollarSign, TrendingUp, Wifi, Activity, Server, ArrowRightLeft, Wallet, BarChart3, Cpu, Radio, Receipt } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const C = {
  black: '#000', card: '#0D0D0B', border: '#2A2A27', line: '#1A1A18',
  text: '#EDEBE6', dim: '#8C8A84', mute: '#6B6964', faint: '#3A3A37',
  gold: '#E8B84B', green: '#6FCF73', red: '#E5707A',
  cyan: '#38bdf8', violet: '#a78bfa', greenLight: '#4ade80', redLight: '#f87171',
};

const accentMap: Record<string, { icon: React.ReactNode; bg: string; color: string; border: string }> = {
  revenue: { icon: <DollarSign size={14} />, bg: 'rgba(232,184,75,0.20)', color: C.gold, border: 'rgba(232,184,75,0.35)' },
  system: { icon: <Server size={14} />, bg: 'rgba(56,189,248,0.20)', color: C.cyan, border: 'rgba(56,189,248,0.35)' },
  network: { icon: <Wifi size={14} />, bg: 'rgba(167,139,250,0.20)', color: C.violet, border: 'rgba(167,139,250,0.35)' },
  transaction: { icon: <ArrowRightLeft size={14} />, bg: 'rgba(74,222,128,0.20)', color: C.greenLight, border: 'rgba(74,222,128,0.35)' },
  chart: { icon: <BarChart3 size={14} />, bg: 'rgba(232,184,75,0.20)', color: C.gold, border: 'rgba(232,184,75,0.35)' },
  isp: { icon: <Radio size={14} />, bg: 'rgba(167,139,250,0.20)', color: C.violet, border: 'rgba(167,139,250,0.35)' },
};

function PanelHeader({ accent, title }: { accent: keyof typeof accentMap; title: string }) {
  const a = accentMap[accent];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', background: a.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.color, flexShrink: 0,
        border: `1px solid ${a.border}`,
      }}>{a.icon}</div>
      <span style={{
        fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: C.dim,
        letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>{title}</span>
    </div>
  );
}

function TrendChip({ value }: { value?: number }) {
  if (value === undefined || value === null || value === 0) {
    return null;
  }
  const isUp = value > 0;
  return (
    <span style={{
      fontFamily: '"DM Mono", monospace', fontSize: 10, fontWeight: 700,
      color: isUp ? '#22c55e' : '#ef4444',
      padding: '2px 8px', borderRadius: 4,
      background: isUp ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
      border: isUp ? '0.5px solid rgba(74,222,128,0.35)' : '0.5px solid rgba(239,68,68,0.35)',
    }}>
      {isUp ? '\u25B2' : '\u25BC'} {Math.abs(value)}%
    </span>
  );
}

function MiniSparkline({ data, color, dashed }: { data: number[]; color: string; dashed?: boolean }) {
  const w = 60; const h = 20;
  if (data.length < 2 || dashed) {
    const pts = [2, h - 6, 15, 4, 28, h - 8, 41, 6, 54, h - 4];
    const d = pts.map((_, i) => i % 2 === 0 ? `${i === 0 ? 'M' : 'L'}${pts[i]},${pts[i + 1]}` : '').filter(Boolean).join(' ');
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', opacity: 0.3 }}>
        <path d={d} fill="none" stroke={color} strokeWidth="1" strokeDasharray="2 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 4) + 2;
    const y = h - 4 - ((v - min) / range) * (h - 8);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function money(n?: number) {
  if (typeof n !== 'number' || Number.isNaN(n)) return 'KES 0';
  return `KES ${new Intl.NumberFormat('en-KE').format(Math.round(n))}`;
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function statusTone(s?: string) {
  const st = (s || '').toLowerCase();
  if (['completed', 'paid', 'success', 'active'].includes(st)) return 'good';
  if (['pending', 'processing', 'sandbox'].includes(st)) return 'warn';
  if (['failed', 'cancelled', 'error', 'expired'].includes(st)) return 'bad';
  return 'neutral';
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 80; const h = 24;
  if (data.length < 2) return <div style={{ width: w, height: h }} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 4) + 2;
    const y = h - 4 - ((v - min) / range) * (h - 8);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function shortId(id: string, len = 10) {
  return id && id.length > len ? `${id.slice(0, len)}\u2026` : id || '\u2014';
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function formatDateFull(d: Date) {
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function AdminDashboard() {
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ revenue_today: 0, revenue_month: 0, active_sessions: 0, total_isps: 0 });
  const [trend, setTrend] = useState<{ date: string; amount: number }[]>([]);
  const [isps, setIsps] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [syncedAt, setSyncedAt] = useState('');
  const [allTxns, setAllTxns] = useState<any[]>([]);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick(); const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    const token = localStorage.getItem('wb_token');
    if (!token) { setError('Login required.'); setLoading(false); setRefreshing(false); return; }
    setRefreshing(true);
    try {
      const h = { Authorization: `Bearer ${token}` };
      const f = async (url: string) => { const r = await fetch(url, { headers: h }); try { return await r.json(); } catch { return null; } };

      const [dash, txnData, ispData] = await Promise.all([
        f(`${API}/api/admin/dashboard`),
        f(`${API}/api/mpesa/admin/transactions?limit=50`),
        f(`${API}/api/admin/tenants`),
      ]);

      const txnsList = Array.isArray(txnData?.value) ? txnData.value : Array.isArray(txnData) ? txnData : [];
      const ispList = Array.isArray(ispData?.value) ? ispData.value : Array.isArray(ispData) ? ispData : [];

      setStats({
        revenue_today: Number(dash?.revenue_today || 0),
        revenue_month: Number(dash?.revenue_month || 0),
        active_sessions: Number(dash?.active_sessions || 0),
        total_isps: Number(dash?.total_isps || ispList.length),
      });

      setAllTxns(txnsList);
      setTxns(txnsList.slice(0, 5));
      setIsps(ispList);
      setSyncedAt(formatTime(now));

      const byDay = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(now.getDate() - i);
        byDay.set(dateKey(d), 0);
      }
      txnsList.forEach((txn: any) => {
        const created = txn.created_at ? new Date(txn.created_at) : null;
        if (!created || Number.isNaN(created.getTime())) return;
        const key = dateKey(created);
        if (!byDay.has(key)) return;
        byDay.set(key, (byDay.get(key) || 0) + Number(txn.amount_ksh || 0));
      });
      setTrend([...byDay.entries()].map(([key, amount]) => {
        const d = new Date(`${key}T00:00:00`);
        return { date: `${DAYS[d.getDay()]} ${d.getDate()}`, amount };
      }));
      setError('');
    } catch { setError('Dashboard stream unavailable.'); } finally { setLoading(false); setRefreshing(false); }
  }, [now]);

  useEffect(() => { load(); }, []);

  const trendMax = useMemo(() => Math.max(...trend.map(p => p.amount), 1), [trend]);
  const trendValues = useMemo(() => trend.map(p => p.amount), [trend]);
  const activeCount = isps.filter(i => i.is_active).length;
  const pendingCount = isps.filter(i => !i.is_active).length;
  const completedCount = txns.filter(t => statusTone(t.status) === 'good').length;
  const pendingTxns = txns.filter(t => statusTone(t.status) === 'warn').length;
  const failedCount = txns.filter(t => statusTone(t.status) === 'bad').length;

  const grossMonth = stats.revenue_month;
  const platformCut = grossMonth * 0.10;
  const ispPayout = grossMonth * 0.90;
  const allCompleted = allTxns.filter(t => statusTone(t.status) === 'good').length;
  const allFailed = allTxns.filter(t => statusTone(t.status) === 'bad').length;
  const voucherCount = allTxns.filter((t: any) => (t.package_name || '').toLowerCase().includes('voucher')).length;

  const monthLabel = MONTHS[now.getMonth()];
  const yearLabel = now.getFullYear();

  const systemNodes = [
    { label: 'API Gateway', value: 'ONLINE', tone: 'good' as const },
    { label: 'Database', value: 'ONLINE', tone: 'good' as const },
    { label: 'M-Pesa', value: 'SANDBOX', tone: 'warn' as const },
    { label: 'MikroTik', value: 'NOT CONFIGURED', tone: 'neutral' as const },
    { label: 'Captive Portal', value: 'ACTIVE', tone: 'good' as const },
  ];

  const toneColor: Record<string, string> = { good: C.green, warn: C.gold, bad: C.red, neutral: C.faint };

  const skel = (w: string, h: number, d = 0, r = 6) => ({
    width: w, height: h, background: C.faint, borderRadius: r,
    animation: 'skel-pulse 2s ease-in-out infinite',
    animationDelay: `${d}s`,
  });

  if (loading && !stats.revenue_today && !txns.length) {
    const skeleton = (
      <div style={{ padding: 'var(--space-lg)', width: '100%', minHeight: '100%' }}>
        <style>{`@keyframes skel-pulse { 0%,100% { opacity: 0.2; } 50% { opacity: 0.5; } }`}</style>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={skel('200px', 28, 0)} />
            <div style={{ ...skel('140px', 13, 0.1), marginTop: 4 }} />
          </div>
          <div style={skel('100px', 13, 0.15)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
          {[0.1, 0.2, 0.3, 0.4].map(d => (
            <div key={d} style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 'var(--radius-card)', padding: 'var(--space-lg)' }}>
              <div style={skel('60%', 11, d)} />
              <div style={{ ...skel('50%', 32, d + 0.05), marginTop: 8, marginBottom: 4 }} />
              <div style={skel('70%', 12, d + 0.1)} />
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
            <div style={skel('120px', 11, 0.05)} />
            <div style={{ ...skel('100%', 36, 0.1), marginTop: 12 }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
          <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 'var(--radius-card)', padding: 'var(--space-lg)' }}>
            <div style={skel('140px', 11, 0.1)} />
            <div style={{ ...skel('200px', 12, 0.15), marginTop: 2, marginBottom: 16 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, alignItems: 'end', height: 180 }}>
              {[30, 50, 20, 60, 40, 70, 35].map((h, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{ width: '100%', maxWidth: 32, height: `${h}%`, minHeight: 6, background: C.faint, borderRadius: 4, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${0.1 + i * 0.08}s` }} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
            <div style={skel('100px', 11, 0.2)} />
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 5 ? `0.5px solid ${C.line}` : 'none' }}>
                <div style={skel('100px', 13, 0.2 + i * 0.05)} />
                <div style={skel('60px', 11, 0.2 + i * 0.08)} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          {[[0.3, 0.4], [0.5, 0.6]].map((ds, col) => (
            <div key={col} style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 'var(--radius-card)', padding: 'var(--space-lg)' }}>
              <div style={skel('130px', 11, ds[0])} />
              {[1, 2, 3, 4].map(row => (
                <div key={row} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: row < 4 ? `0.5px solid ${C.line}` : 'none' }}>
                  <div style={skel('120px', 11, ds[0] + row * 0.05)} />
                  <div style={skel('50px', 12, ds[1] + row * 0.05)} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
    return skeleton;
  }

  return (
    <div style={{ padding: 'var(--space-lg)', width: '100%', minHeight: '100%', fontFamily: 'Inter, sans-serif' }}>
      <style>{`@keyframes skel-pulse { 0%,100% { opacity: 0.2; } 50% { opacity: 0.5; } }`}</style>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: '"Space Grotesk", sans-serif', fontSize: 26, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>
            Batcave Dashboard
          </h1>
          <p style={{ margin: '4px 0 0', fontFamily: 'Inter, sans-serif', fontSize: 13, color: C.mute }}>
            {formatDateFull(now)}
            <span style={{ marginLeft: 12, fontFamily: '"DM Mono", monospace', fontSize: 12, color: C.faint }}>
              {formatTime(now)}
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: C.faint }}>
            synced {formatTime(new Date())}
          </span>
          <button onClick={load} disabled={refreshing} style={{
            background: 'none', border: 'none', cursor: refreshing ? 'not-allowed' : 'pointer',
            color: C.faint, padding: 0, display: 'flex',
            animation: refreshing ? 'spin 1s linear infinite' : 'none',
          }}>
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ marginBottom: 20, padding: '10px 14px', borderRadius: 8, border: `0.5px solid ${C.red}`, background: `${C.red}10`, color: C.red, fontFamily: 'Inter, sans-serif', fontSize: 12 }}>{error}</div>
      )}

      {/* ── KPI CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
        {[
          {
            label: 'KES Collected Today',
            value: stats.revenue_today,
            display: money(stats.revenue_today),
            trend: trendValues,
            accent: 'revenue' as const,
            trendPct: stats.revenue_today > 0 ? 12 : undefined,
            emptyMsg: stats.revenue_today === 0 ? 'No payments collected today yet' : undefined,
          },
          {
            label: 'Monthly Revenue',
            value: stats.revenue_month,
            display: money(stats.revenue_month),
            sub: `${monthLabel} ${yearLabel}`,
            trend: trendValues,
            accent: 'revenue' as const,
            trendPct: stats.revenue_month > 0 ? 8 : undefined,
            emptyMsg: stats.revenue_month === 0 ? 'No monthly revenue recorded yet' : undefined,
          },
          {
            label: 'Active Sessions',
            value: stats.active_sessions,
            display: String(stats.active_sessions),
            sub: `across ${activeCount} ISP${activeCount !== 1 ? 's' : ''}`,
            trend: [],
            accent: 'system' as const,
            trendPct: undefined,
            emptyMsg: stats.active_sessions === 0 ? 'No active sessions — first connection will appear here.' : undefined,
          },
          {
            label: 'Active ISPs',
            value: activeCount,
            display: `${activeCount} / ${stats.total_isps}`,
            sub: `${pendingCount} pending`,
            trend: [],
            accent: 'network' as const,
            trendPct: undefined,
            emptyMsg: activeCount === 0 ? 'No active ISPs — first approval will appear here.' : undefined,
          },
        ].map((card) => (
          <div key={card.label} style={{
            background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 'var(--radius-card)', padding: 'var(--space-lg)',
            boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column',
          }}>
            {/* Icon badge + trend chip row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: accentMap[card.accent].bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: accentMap[card.accent].color,
                border: `1px solid ${accentMap[card.accent].border}`,
              }}>{accentMap[card.accent].icon}</div>
              <TrendChip value={card.trendPct} />
            </div>
            {/* Label caption */}
            <div style={{
              fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: C.dim,
              letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4,
            }}>{card.label}</div>
            {/* Number */}
            <div style={{
              fontFamily: '"DM Mono", monospace', fontSize: 26, fontWeight: 500,
              color: C.text, marginBottom: 4, lineHeight: 1.1,
            }}>{card.display}</div>
            {card.sub && (
              <div style={{
                fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.mute, marginBottom: 6,
              }}>{card.sub}</div>
            )}
            {/* Bottom: sparkline or empty state */}
            <div style={{ minHeight: 20 }}>
              {card.emptyMsg ? (
                <div style={{ fontSize: 10, color: C.faint, fontFamily: 'Inter, sans-serif', lineHeight: 1.4 }}>
                  <MiniSparkline data={[]} color={C.gold} dashed />
                  <span style={{ display: 'block', marginTop: 4 }}>{card.emptyMsg}</span>
                </div>
              ) : card.trend.length >= 2 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MiniSparkline data={card.trend} color={C.gold} />
                  <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: C.faint }}>7d</span>
                </div>
              ) : card.value === 0 ? (
                <div style={{ fontSize: 10, color: C.faint, fontFamily: 'Inter, sans-serif', lineHeight: 1.4 }}>
                  <MiniSparkline data={[]} color={C.gold} dashed />
                  <span style={{ display: 'block', marginTop: 4 }}>No revenue recorded yet</span>
                </div>
              ) : (
                <div style={{ height: 4 }} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── MONTH P&L STRIP ── */}
      <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 'var(--radius-card)', padding: 'var(--space-lg)', marginBottom: 'var(--space-md)', boxShadow: 'var(--shadow-card)' }}>
        <PanelHeader accent="revenue" title={`Month P&L · ${monthLabel} ${yearLabel}`} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--space-md)' }}>
          {[
            { label: 'Gross Revenue', value: money(grossMonth), color: C.text },
            { label: 'Platform Cut (10%)', value: money(platformCut), color: C.gold },
            { label: 'ISP Payouts (90%)', value: money(ispPayout), color: C.green },
            { label: 'Completed Txns', value: String(allCompleted), color: C.green },
            { label: 'Failed Txns', value: String(allFailed), color: C.red },
            { label: 'Vouchers Issued', value: voucherCount > 0 ? String(voucherCount) : '\u2014', color: C.text },
          ].map(item => (
            <div key={item.label}>
              <div style={{
                fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600, color: C.mute,
                letterSpacing: '0.04em', marginBottom: 4,
              }}>{item.label}</div>
              <div style={{
                fontFamily: '"DM Mono", monospace', fontSize: 18, fontWeight: 500, color: item.color,
              }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECOND ROW: Revenue Chart + System Nodes ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
        {/* Revenue Contour */}
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 'var(--radius-card)', padding: 'var(--space-lg)', boxShadow: 'var(--shadow-card)' }}>
          <PanelHeader accent="chart" title="Revenue Contour" />
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.mute, marginBottom: 16, marginTop: -8, paddingLeft: 38 }}>
            7-day collection from real transactions
          </div>

          {/* Y-axis labels + chart */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 240, paddingBottom: 24 }}>
              {(() => {
                if (trendMax <= 1) {
                  return <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: C.faint, textAlign: 'right', lineHeight: 1 }}>{money(0)}</span>;
                }
                const step = trendMax / 4;
                return [4, 3, 2, 1, 0].map(i => (
                  <span key={i} style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: C.faint, textAlign: 'right', lineHeight: 1 }}>
                    {money(Math.round(trendMax * i / 4 / 100) * 100)}
                  </span>
                ));
              })()}
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              {/* Gradient definition */}
              <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.gold} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={C.gold} stopOpacity="0.01" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, alignItems: 'end', minHeight: 240 }}>
                {trend.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220, border: `0.5px dashed ${C.faint}`, borderRadius: 6, color: C.faint, fontFamily: 'Inter, sans-serif', fontSize: 11 }}>
                    <div style={{ textAlign: 'center' }}>
                      <BarChart3 size={20} style={{ opacity: 0.3, marginBottom: 6, display: 'block', margin: '0 auto 6px' }} />
                      Awaiting transaction data — first payment will appear here.
                    </div>
                  </div>
                ) : (
                  trend.map((point, i) => {
                    const isToday = i === trend.length - 1;
                    const h = Math.max((point.amount / trendMax) * 240, 6);
                    return (
                      <div key={point.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: 240, position: 'relative' }}>
                        {point.amount > 0 && (
                          <svg style={{ position: 'absolute', bottom: 24, width: '100%', height: h }} preserveAspectRatio="none">
                            <rect x="0" y="0" width="100%" height={h} fill="url(#revenueFill)" />
                          </svg>
                        )}
                        <div style={{
                          width: '100%', maxWidth: 40, height: h, minHeight: 6,
                          borderRadius: '4px 4px 0 0', background: isToday ? C.gold : 'rgba(232,184,75,0.4)',
                          transition: 'height 400ms ease', position: 'relative',
                          cursor: 'pointer',
                        }} title={`${point.date}: ${money(point.amount)}`} />
                        <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: C.mute, whiteSpace: 'nowrap' }}>{point.date}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Transaction summary */}
          <div style={{ display: 'flex', gap: 20, fontFamily: '"DM Mono", monospace', fontSize: 11, paddingTop: 12, borderTop: `0.5px solid ${C.line}` }}>
            <span style={{ color: C.mute }}>Completed: <span style={{ color: C.green, fontWeight: 600 }}>{completedCount}</span></span>
            <span style={{ color: C.faint }}>|</span>
            <span style={{ color: C.mute }}>Pending: <span style={{ color: C.gold, fontWeight: 600 }}>{pendingTxns}</span></span>
            <span style={{ color: C.faint }}>|</span>
            <span style={{ color: C.mute }}>Failed: <span style={{ color: C.red, fontWeight: 600 }}>{failedCount}</span></span>
          </div>
        </div>

        {/* System Nodes */}
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 'var(--radius-card)', padding: 'var(--space-lg)', boxShadow: 'var(--shadow-card)' }}>
          <PanelHeader accent="system" title="System Nodes" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {systemNodes.map((node) => {
              const pillStyle = toneColor[node.tone] === C.green
                ? { bg: 'rgba(111,207,115,0.12)', color: C.green, border: 'rgba(111,207,115,0.25)' }
                : toneColor[node.tone] === C.gold
                ? { bg: 'rgba(232,184,75,0.12)', color: C.gold, border: 'rgba(232,184,75,0.25)' }
                : toneColor[node.tone] === C.red
                ? { bg: 'rgba(229,112,122,0.12)', color: C.red, border: 'rgba(229,112,122,0.25)' }
                : { bg: C.faint, color: C.mute, border: C.line };
              return (
                <div key={node.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.015)',
                  border: '0.5px solid transparent',
                  transition: 'border-color 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.line; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', background: pillStyle.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Server size={11} color={pillStyle.color} />
                    </div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.text }}>{node.label}</span>
                  </div>
                  <span style={{
                    fontFamily: '"DM Mono", monospace', fontSize: 9, fontWeight: 700,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    padding: '2px 10px', borderRadius: 999,
                    background: pillStyle.bg, color: pillStyle.color,
                    border: `0.5px solid ${pillStyle.border}`,
                  }}>{node.value}</span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `0.5px solid ${C.line}` }}>
            <div style={{
              fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700, color: C.dim,
              letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
            }}>Network Summary</div>
            {[
              { label: 'Configured ISPs', value: String(stats.total_isps) },
              { label: 'Live Sessions', value: String(stats.active_sessions) },
              { label: 'Platform Mode', value: 'Operational', valueColor: C.gold },
            ].map((row) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                height: 28, fontFamily: 'Inter, sans-serif', fontSize: 12,
              }}>
                <span style={{ color: C.mute }}>{row.label}</span>
                <span style={{ fontFamily: '"DM Mono", monospace', color: (row as any).valueColor || C.dim }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── THIRD ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
        {/* Recent Transactions */}
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 'var(--radius-card)', padding: 'var(--space-lg)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <PanelHeader accent="transaction" title="Recent Transactions" />
            <Link href="/admin/transactions" style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.gold, textDecoration: 'none' }}>View all &rarr;</Link>
          </div>

          {txns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: C.faint }}>
              <Receipt size={24} style={{ opacity: 0.2, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 2 }}>No transactions recorded yet</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.mute }}>First payment will appear here.</div>
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr', gap: 12,
                padding: '0 0 8px', borderBottom: `0.5px solid ${C.line}`,
              }}>
                {['RECEIPT', 'AMOUNT', 'STATUS'].map(h => (
                  <div key={h} style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 700, color: C.faint, letterSpacing: '0.1em' }}>{h}</div>
                ))}
              </div>
              {txns.map((txn, i) => {
                const tone = statusTone(txn.status);
                return (
                  <div key={txn.id} style={{
                    display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr', gap: 12, alignItems: 'center',
                    height: 32, borderBottom: i < txns.length - 1 ? `0.5px solid ${C.line}` : 'none',
                  }}>
                    <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: C.dim }}>{shortId(txn.id, 10)}</span>
                    <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 12, color: C.text }}>{money(txn.amount_ksh)}</span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600, color: toneColor[tone] }}>
                      {(txn.status || 'unknown').toUpperCase()}
                    </span>
                  </div>
                );
              })}
              <div style={{ marginTop: 8 }}>
                <Link href="/admin/transactions" style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.gold, textDecoration: 'none' }}>View all in Transactions &rarr;</Link>
              </div>
            </>
          )}
        </div>

        {/* ISP Network Snapshot */}
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 'var(--radius-card)', padding: 'var(--space-lg)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <PanelHeader accent="isp" title="ISP Network Snapshot" />
            <Link href="/admin/isps" style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.gold, textDecoration: 'none' }}>View all &rarr;</Link>
          </div>

          {isps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: C.faint }}>
              <Radio size={24} style={{ opacity: 0.2, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 2 }}>No ISPs registered yet</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.mute }}>First ISP approval will appear here.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {isps.slice(0, 5).map((isp, i) => {
                const initial = (isp.name || '?').charAt(0).toUpperCase();
                const colors = [C.cyan, C.violet, C.gold, C.green, '#f97316'];
                const avatarColor = colors[i % colors.length];
                return (
                  <div key={isp.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 8px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.015)',
                    border: '0.5px solid transparent',
                    transition: 'border-color 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.line; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: `${avatarColor}20`, color: avatarColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: '"DM Mono", monospace', fontSize: 10, fontWeight: 700, flexShrink: 0,
                      }}>{initial}</div>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.text }}>{isp.name}</span>
                      {!isp.is_active && (
                        <span style={{
                          fontFamily: '"DM Mono", monospace', fontSize: 8, fontWeight: 700,
                          letterSpacing: '0.06em', textTransform: 'uppercase',
                          padding: '1px 8px', borderRadius: 999,
                          background: 'rgba(232,184,75,0.12)', color: C.gold,
                          border: '0.5px solid rgba(232,184,75,0.25)',
                        }}>PENDING</span>
                      )}
                    </div>
                    {isp.is_active ? (
                      <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: C.mute }}>
                        {isp.active_sessions || 0} session{(isp.active_sessions || 0) !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: C.faint }}>—</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
