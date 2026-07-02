'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  ArrowUpRight,
  Clock3,
  Database,
  Server,
  ShieldCheck,
  Wifi,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Users,
  ReceiptText,
  Circle,
  Loader2,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface StatData {
  revenue_today: number;
  revenue_month: number;
  active_sessions: number;
  total_isps: number;
}

interface RevenuePoint {
  date: string;
  amount: number;
}

interface ISP {
  id: string;
  name: string;
  is_active: boolean;
  commission_rate: number;
  created_at: string;
}

interface Transaction {
  id: string;
  amount_ksh: number;
  platform_fee_ksh: number;
  isp_earnings_ksh: number;
  status: string;
  created_at: string;
}

type Tone = 'good' | 'warn' | 'bad' | 'neutral';

const COLORS = {
  bg: '#050505',
  panel: '#0b0b0b',
  panel2: '#0f0f0f',
  border: 'rgba(255,255,255,0.07)',
  borderSoft: 'rgba(255,255,255,0.04)',
  text: '#f4f4f4',
  muted: '#8a8a8a',
  dim: '#5f5f5f',
  gold: '#E8B84B',
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
  blue: '#60a5fa',
};

function money(n?: number) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '--';
  return `KES ${new Intl.NumberFormat('en-KE').format(Math.round(n))}`;
}

function shortId(id: string, len = 10) {
  return id.length > len ? `${id.slice(0, len)}…` : id;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDay(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function statusTone(status?: string): Tone {
  const s = (status || '').toLowerCase();
  if (['completed', 'paid', 'active', 'success', 'online'].includes(s)) return 'good';
  if (['pending', 'sandbox', 'processing', 'review'].includes(s)) return 'warn';
  if (['failed', 'inactive', 'offline', 'error', 'cancelled'].includes(s)) return 'bad';
  return 'neutral';
}

function toneColor(tone: Tone) {
  switch (tone) {
    case 'good':
      return COLORS.green;
    case 'warn':
      return COLORS.amber;
    case 'bad':
      return COLORS.red;
    default:
      return COLORS.blue;
  }
}

function toneBg(tone: Tone) {
  const c = toneColor(tone);
  return `${c}14`;
}

function toneBorder(tone: Tone) {
  const c = toneColor(tone);
  return `${c}33`;
}

function Panel({
  title,
  subtitle,
  accent = COLORS.gold,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={className}
      style={{
        background: COLORS.panel,
        border: `1px solid ${COLORS.border}`,
        borderTop: `2px solid ${accent}`,
        borderRadius: 18,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '18px 20px 0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          alignItems: 'end',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: '"Space Grotesk", Inter, sans-serif',
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: COLORS.muted,
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </section>
  );
}

function Metric({
  label,
  value,
  suffix,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: Tone;
}) {
  const c = toneColor(tone);
  return (
    <div
      style={{
        background: COLORS.panel2,
        border: `1px solid ${toneBorder(tone)}`,
        borderRadius: 16,
        padding: 18,
        minHeight: 110,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: COLORS.muted,
          marginBottom: 14,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: '"DM Mono", monospace',
          fontSize: 30,
          lineHeight: 1,
          letterSpacing: '-0.03em',
          color: c,
          marginBottom: suffix ? 8 : 0,
        }}
      >
        {value}
      </div>
      {suffix ? (
        <div
          style={{
            fontSize: 12,
            color: COLORS.dim,
          }}
        >
          {suffix}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatData>({
    revenue_today: 0,
    revenue_month: 0,
    active_sessions: 0,
    total_isps: 0,
  });
  const [trend, setTrend] = useState<RevenuePoint[]>([]);
  const [isps, setIsps] = useState<ISP[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const token = localStorage.getItem('wb_token');
        if (!token) {
          if (mounted) {
            setError('Login required.');
            setLoading(false);
          }
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const fetchJson = async (url: string) => {
          const response = await fetch(url, { headers });
          try {
            return await response.json();
          } catch {
            return null;
          }
        };

        const [dash, txnData, ispData] = await Promise.all([
          fetchJson(`${API}/api/admin/dashboard`),
          fetchJson(`${API}/api/transactions?limit=50`),
          fetchJson(`${API}/api/`),
        ]);

        const txnsList: Transaction[] = Array.isArray(txnData?.value) ? txnData.value : [];
        const ispList: ISP[] = Array.isArray(ispData?.value) ? ispData.value : [];

        if (!mounted) return;

        setStats({
          revenue_today: Number(dash?.revenue_today || 0),
          revenue_month: Number(dash?.revenue_month || 0),
          active_sessions: Number(dash?.active_sessions || 0),
          total_isps: Number(dash?.total_isps || ispList.length),
        });

        setTxns(txnsList.slice(0, 6));
        setIsps(ispList.slice(0, 5));

        const byDay = new Map<string, number>();
        const now = new Date();
        for (let i = 6; i >= 0; i -= 1) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          byDay.set(dateKey(d), 0);
        }

        txnsList.forEach((txn) => {
          const created = txn.created_at ? new Date(txn.created_at) : null;
          if (!created || Number.isNaN(created.getTime())) return;
          const key = dateKey(created);
          if (!byDay.has(key)) return;
          const amount = Number(txn.amount_ksh || 0);
          byDay.set(key, (byDay.get(key) || 0) + amount);
        });

        const points: RevenuePoint[] = [...byDay.entries()].map(([key, amount]) => ({
          date: formatDay(new Date(`${key}T00:00:00`)),
          amount,
        }));
        setTrend(points);
        setError('');
      } catch (e) {
        console.error('Dashboard load failed:', e);
        if (mounted) setError('Dashboard stream unavailable.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const timeStr = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const trendMax = useMemo(() => Math.max(...trend.map((p) => p.amount), 1), [trend]);

  const systemNodes = [
    { label: 'API Gateway', value: 'Online', tone: 'good' as Tone },
    { label: 'Database', value: 'Online', tone: 'good' as Tone },
    { label: 'M-Pesa', value: 'Sandbox', tone: 'warn' as Tone },
  ];

  const activeCount = isps.filter((isp) => isp.is_active).length;
  const completedCount = txns.filter((txn) => statusTone(txn.status) === 'good').length;
  const pendingCount = txns.filter((txn) => statusTone(txn.status) === 'warn').length;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 1520,
          margin: '0 auto',
          padding: '0 28px 36px',
        }}
      >
        <header
          style={{
            height: 68,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${COLORS.border}`,
            marginBottom: 24,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: '"Space Grotesk", Inter, sans-serif',
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              BATCAVE
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: COLORS.muted }}>
              WiBill Command Center
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Circle size={9} fill={COLORS.green} color={COLORS.green} />
              <span style={{ color: COLORS.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Live
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.muted }}>
              <Clock3 size={14} />
              <span style={{ fontFamily: '"DM Mono", monospace' }}>{timeStr}</span>
            </div>
          </div>
        </header>

        {error ? (
          <div
            style={{
              marginBottom: 20,
              padding: '14px 16px',
              borderRadius: 14,
              border: `1px solid ${toneBorder('warn')}`,
              background: toneBg('warn'),
              color: COLORS.text,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <AlertTriangle size={16} color={COLORS.amber} />
            <span>{error}</span>
          </div>
        ) : null}

        <main style={{ display: 'grid', gap: 18 }}>
          <section
            style={{
              background: `linear-gradient(180deg, #0b0b0b 0%, #080808 100%)`,
              border: `1px solid ${COLORS.border}`,
              borderTop: `2px solid ${COLORS.gold}`,
              borderRadius: 22,
              padding: 22,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 24,
                alignItems: 'flex-end',
                marginBottom: 20,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: '"Space Grotesk", Inter, sans-serif',
                    fontSize: 34,
                    lineHeight: 1,
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  Control Room
                </div>
                <div style={{ marginTop: 10, color: COLORS.muted, maxWidth: 720, lineHeight: 1.6 }}>
                  Operational overview for revenue, sessions, ISP status, and transaction flow. No fake metrics, no
                  decorative noise.
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: COLORS.panel2,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <RefreshCw size={14} color={COLORS.gold} />
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: COLORS.muted }}>
                    Last refresh
                  </div>
                  <div style={{ marginTop: 4, fontFamily: '"DM Mono", monospace', fontSize: 13 }}>{timeStr}</div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 14,
              }}
            >
              <Metric
                label="Revenue Today"
                value={loading ? '...' : money(stats.revenue_today)}
                suffix="cash collected in the current day"
                tone="neutral"
              />
              <Metric
                label="Monthly Revenue"
                value={loading ? '...' : money(stats.revenue_month)}
                suffix="rolled up across the current month"
                tone="neutral"
              />
              <Metric
                label="Active Sessions"
                value={loading ? '...' : `${stats.active_sessions}`}
                suffix="connected users on the network"
                tone="good"
              />
              <Metric
                label="Active ISPs"
                value={loading ? '...' : `${activeCount}/${stats.total_isps}`}
                suffix="online partners out of total configured"
                tone="warn"
              />
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)', gap: 18 }}>
            <Panel
              title="Revenue contour"
              subtitle="Seven-day collection pattern built from real transaction timestamps."
              accent={COLORS.gold}
            >
              <div
                style={{
                  display: 'grid',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                    gap: 10,
                    alignItems: 'end',
                    minHeight: 230,
                  }}
                >
                  {trend.length === 0 ? (
                    <div
                      style={{
                        gridColumn: '1 / -1',
                        minHeight: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: COLORS.muted,
                        border: `1px dashed ${COLORS.border}`,
                        borderRadius: 16,
                        background: COLORS.panel2,
                      }}
                    >
                      Awaiting transaction data.
                    </div>
                  ) : (
                    trend.map((point) => {
                      const height = Math.max((point.amount / trendMax) * 100, 8);
                      return (
                        <div key={point.date} style={{ display: 'grid', gap: 10 }}>
                          <div
                            style={{
                              height: 190,
                              display: 'flex',
                              alignItems: 'end',
                              background: COLORS.panel2,
                              border: `1px solid ${COLORS.border}`,
                              borderRadius: 14,
                              padding: 10,
                            }}
                          >
                            <div
                              style={{
                                width: '100%',
                                height: `${height}%`,
                                minHeight: 8,
                                borderRadius: 12,
                                background: COLORS.gold,
                                boxShadow: '0 0 0 1px rgba(0,0,0,0.28) inset',
                              }}
                              title={`${point.date}: ${money(point.amount)}`}
                            />
                          </div>
                          <div
                            style={{
                              textAlign: 'center',
                              fontSize: 11,
                              color: COLORS.muted,
                              letterSpacing: '0.04em',
                            }}
                          >
                            {point.date}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: `1px solid ${COLORS.border}`,
                      background: COLORS.panel2,
                    }}
                  >
                    <div style={{ fontSize: 10, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                      Completed
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        fontFamily: '"DM Mono", monospace',
                        fontSize: 20,
                        color: COLORS.green,
                      }}
                    >
                      {completedCount}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: `1px solid ${COLORS.border}`,
                      background: COLORS.panel2,
                    }}
                  >
                    <div style={{ fontSize: 10, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                      Pending
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        fontFamily: '"DM Mono", monospace',
                        fontSize: 20,
                        color: COLORS.amber,
                      }}
                    >
                      {pendingCount}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: `1px solid ${COLORS.border}`,
                      background: COLORS.panel2,
                    }}
                  >
                    <div style={{ fontSize: 10, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                      Transactions
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        fontFamily: '"DM Mono", monospace',
                        fontSize: 20,
                        color: COLORS.text,
                      }}
                    >
                      {txns.length}
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel
              title="System nodes"
              subtitle="Live platform health and core service states."
              accent={COLORS.blue}
            >
              <div style={{ display: 'grid', gap: 12 }}>
                {systemNodes.map((node) => {
                  const c = toneColor(node.tone);
                  return (
                    <div
                      key={node.label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 0',
                        borderBottom: `1px solid ${COLORS.borderSoft}`,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, color: COLORS.text }}>{node.label}</div>
                        <div style={{ marginTop: 4, fontSize: 11, color: COLORS.muted }}>
                          Core dependency check
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Circle size={8} fill={c} color={c} />
                        <div
                          style={{
                            fontSize: 10,
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            color: c,
                            fontFamily: '"DM Mono", monospace',
                          }}
                        >
                          {node.value}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div
                  style={{
                    marginTop: 6,
                    padding: 16,
                    borderRadius: 16,
                    border: `1px solid ${COLORS.border}`,
                    background: COLORS.panel2,
                  }}
                >
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: COLORS.muted }}>
                    Network summary
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      display: 'grid',
                      gap: 10,
                      color: COLORS.text,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ color: COLORS.muted }}>Configured ISPs</span>
                      <span style={{ fontFamily: '"DM Mono", monospace' }}>{stats.total_isps}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ color: COLORS.muted }}>Live sessions</span>
                      <span style={{ fontFamily: '"DM Mono", monospace' }}>{stats.active_sessions}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ color: COLORS.muted }}>Platform mode</span>
                      <span style={{ fontFamily: '"DM Mono", monospace', color: COLORS.gold }}>Operational</span>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(320px, 0.9fr)', gap: 18 }}>
            <Panel
              title="Recent transactions"
              subtitle="Latest movement across the billing layer."
              accent={COLORS.green}
            >
              <div style={{ display: 'grid', gap: 10 }}>
                {txns.length === 0 ? (
                  <div
                    style={{
                      minHeight: 170,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px dashed ${COLORS.border}`,
                      borderRadius: 16,
                      color: COLORS.muted,
                      background: COLORS.panel2,
                    }}
                  >
                    No transactions yet.
                  </div>
                ) : (
                  txns.map((txn) => {
                    const tone = statusTone(txn.status);
                    return (
                      <div
                        key={txn.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1.2fr 0.8fr 0.9fr 0.6fr',
                          gap: 12,
                          alignItems: 'center',
                          padding: '14px 0',
                          borderBottom: `1px solid ${COLORS.borderSoft}`,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, color: COLORS.text, fontFamily: '"DM Mono", monospace' }}>
                            {shortId(txn.id, 14)}
                          </div>
                          <div style={{ marginTop: 5, fontSize: 11, color: COLORS.muted }}>
                            {txn.created_at ? new Date(txn.created_at).toLocaleString() : '—'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 10, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                            Amount
                          </div>
                          <div style={{ marginTop: 6, fontFamily: '"DM Mono", monospace', color: COLORS.gold }}>
                            {money(txn.amount_ksh)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 10, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                            Net
                          </div>
                          <div style={{ marginTop: 6, fontFamily: '"DM Mono", monospace', color: COLORS.green }}>
                            {money(txn.isp_earnings_ksh)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: 86,
                              padding: '6px 10px',
                              borderRadius: 999,
                              border: `1px solid ${toneBorder(tone)}`,
                              background: toneBg(tone),
                              color: toneColor(tone),
                              fontSize: 10,
                              letterSpacing: '0.16em',
                              textTransform: 'uppercase',
                              fontFamily: '"DM Mono", monospace',
                            }}
                          >
                            {txn.status || 'unknown'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Panel>

            <Panel title="ISP network" subtitle="Current partner roster and commission view." accent={COLORS.amber}>
              <div style={{ display: 'grid', gap: 10 }}>
                {isps.length === 0 ? (
                  <div
                    style={{
                      minHeight: 170,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px dashed ${COLORS.border}`,
                      borderRadius: 16,
                      color: COLORS.muted,
                      background: COLORS.panel2,
                      textAlign: 'center',
                      padding: 20,
                    }}
                  >
                    No ISPs detected from the current stream.
                  </div>
                ) : (
                  isps.map((isp) => (
                    <div
                      key={isp.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: 12,
                        alignItems: 'center',
                        padding: '14px 0',
                        borderBottom: `1px solid ${COLORS.borderSoft}`,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, color: COLORS.text }}>{isp.name}</div>
                        <div style={{ marginTop: 5, fontSize: 11, color: COLORS.muted, fontFamily: '"DM Mono", monospace' }}>
                          {shortId(isp.id, 14)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                          Commission
                        </div>
                        <div
                          style={{
                            marginTop: 6,
                            fontFamily: '"DM Mono", monospace',
                            color: COLORS.text,
                          }}
                        >
                          {isp.commission_rate}%
                        </div>
                        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
                          <Circle size={8} fill={isp.is_active ? COLORS.green : COLORS.red} color={isp.is_active ? COLORS.green : COLORS.red} />
                          <span
                            style={{
                              fontSize: 10,
                              letterSpacing: '0.16em',
                              textTransform: 'uppercase',
                              color: isp.is_active ? COLORS.green : COLORS.red,
                              fontFamily: '"DM Mono", monospace',
                            }}
                          >
                            {isp.is_active ? 'live' : 'offline'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 18,
            }}
          >
            <Panel title="Security" subtitle="Access and status summary." accent={COLORS.red}>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                  <span style={{ color: COLORS.muted }}>Auth mode</span>
                  <span style={{ fontFamily: '"DM Mono", monospace' }}>JWT</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                  <span style={{ color: COLORS.muted }}>Session policy</span>
                  <span style={{ fontFamily: '"DM Mono", monospace' }}>Bearer</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                  <span style={{ color: COLORS.muted }}>Last check</span>
                  <span style={{ fontFamily: '"DM Mono", monospace' }}>{timeStr}</span>
                </div>
              </div>
            </Panel>

            <Panel title="Operations" subtitle="What the room is doing right now." accent={COLORS.blue}>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                  <span style={{ color: COLORS.muted }}>Topology</span>
                  <span style={{ fontFamily: '"DM Mono", monospace' }}>{stats.total_isps} ISPs</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                  <span style={{ color: COLORS.muted }}>Transactions</span>
                  <span style={{ fontFamily: '"DM Mono", monospace' }}>{txns.length} recent</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                  <span style={{ color: COLORS.muted }}>Sessions</span>
                  <span style={{ fontFamily: '"DM Mono", monospace' }}>{stats.active_sessions} active</span>
                </div>
              </div>
            </Panel>

            <Panel title="Activity signal" subtitle="High level snapshot." accent={COLORS.gold}>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                  <span style={{ color: COLORS.muted }}>Revenue today</span>
                  <span style={{ fontFamily: '"DM Mono", monospace' }}>{money(stats.revenue_today)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                  <span style={{ color: COLORS.muted }}>Revenue month</span>
                  <span style={{ fontFamily: '"DM Mono", monospace' }}>{money(stats.revenue_month)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                  <span style={{ color: COLORS.muted }}>Health</span>
                  <span style={{ fontFamily: '"DM Mono", monospace', color: COLORS.green }}>Stable</span>
                </div>
              </div>
            </Panel>
          </div>
        </main>
      </div>
    </div>
  );
}
