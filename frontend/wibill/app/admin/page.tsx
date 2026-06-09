'use client';

import { useEffect, useState } from 'react';

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

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('wb_token');
    if (!token) return;

    Promise.all([
      fetch(`${API}/api/tenants/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`${API}/api/transactions?limit=6`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`${API}/api/sessions?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`${API}/api/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([dash, txnData, sessionData, ispData]) => {
        setStats({
          revenue_today: dash?.revenue_today || 0,
          revenue_month: dash?.revenue_month || 0,
          active_sessions: sessionData?.value?.length || 0,
          total_isps: ispData?.value?.length || 0,
        });
        setTxns((txnData?.value || []).slice(0, 6));
        setIsps((ispData?.value || []).slice(0, 5));

        const last7 = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return {
            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            amount: Math.random() * 5000,
          };
        });
        setTrend(last7);
      })
      .catch((e) => console.error('Dashboard load failed:', e));
  }, []);

  const timeStr = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // BATCAVE Color Palette - Locked
  const colors = {
    void: '#000000',
    base: '#0a0a0a',
    raised: '#0d0d0d',
    border: '#141414',
    textPrimary: '#f0f0f0',
    textSecondary: '#666666',
    textMuted: '#2a2a2a',
    gold: '#E8B84B',
    green: '#22c55e',
    red: '#ef4444',
    amber: '#f59e0b',
    blue: '#3b82f6',
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `KES ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `KES ${(amount / 1000).toFixed(0)}k`;
    return `KES ${amount.toFixed(0)}`;
  };

  return (
    <div style={{ background: colors.void, color: colors.textPrimary, minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* TOPBAR */}
      <div
        style={{
          height: '52px',
          borderBottom: `0.5px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 36px',
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: colors.textMuted, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Dashboard — Batcave Control Panel
          </div>
        </div>
        <div style={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', color: colors.gold, fontWeight: 600 }}>
          {timeStr}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ padding: '32px 36px', maxWidth: '1600px', margin: '0 auto' }}>
        {/* PAGE HEADER */}
        <div style={{ marginBottom: 40 }}>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 900,
              letterSpacing: '-0.025em',
              margin: '0 0 8px',
              color: colors.textPrimary,
              fontFamily: '"Space Grotesk", sans-serif',
            }}
          >
            Control Center
          </h1>
          <p style={{ fontSize: 13, color: colors.textSecondary, margin: 0 }}>
            Real-time platform metrics and operational overview
          </p>
        </div>

        {/* ROW 1: METRICS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          {[
            {
              label: 'Revenue Today',
              value: formatCurrency(stats.revenue_today),
              color: colors.gold,
              icon: '💰',
            },
            {
              label: 'Monthly Revenue',
              value: formatCurrency(stats.revenue_month),
              color: colors.blue,
              icon: '📊',
            },
            {
              label: 'Active Sessions',
              value: stats.active_sessions,
              color: colors.green,
              icon: '👥',
            },
            {
              label: 'Registered ISPs',
              value: stats.total_isps,
              color: colors.amber,
              icon: '🌐',
            },
          ].map((metric, i) => (
            <div
              key={i}
              style={{
                background: colors.base,
                border: `0.5px solid ${colors.border}`,
                borderRadius: '12px',
                padding: '20px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: metric.color,
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.textMuted }}>
                  {metric.label}
                </div>
                <span style={{ fontSize: 18 }}>{metric.icon}</span>
              </div>

              <div style={{ fontSize: 24, fontWeight: 900, color: metric.color, fontFamily: '"JetBrains Mono", monospace' }}>
                {metric.value}
              </div>
            </div>
          ))}
        </div>

        {/* ROW 2: REVENUE TREND + QUICK ACTIONS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px', marginBottom: '32px' }}>
          {/* REVENUE CHART */}
          <div
            style={{
              background: colors.base,
              border: `0.5px solid ${colors.border}`,
              borderRadius: '12px',
              padding: '24px',
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: '0 0 4px', fontFamily: '"Space Grotesk", sans-serif' }}>
                7-Day Revenue Trend
              </h3>
              <p style={{ fontSize: 11, color: colors.textMuted, margin: 0 }}>Platform fees collection</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px' }}>
              {trend.map((point, i) => {
                const maxAmount = Math.max(...trend.map((p) => p.amount || 1), 1);
                const height = Math.max((point.amount / maxAmount) * 120, 4);
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${height}px`,
                        background: colors.gold,
                        borderRadius: '3px',
                        opacity: 0.7,
                        transition: 'opacity 0.2s',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.opacity = '0.7';
                      }}
                    />
                    <div style={{ fontSize: 9, color: colors.textMuted, fontFamily: '"JetBrains Mono", monospace' }}>
                      {point.date.split(' ')[0]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div
            style={{
              background: colors.base,
              border: `0.5px solid ${colors.border}`,
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: '0 0 12px', fontFamily: '"Space Grotesk", sans-serif' }}>
              Quick Actions
            </h3>
            {['Generate Invite', 'View Analytics', 'System Health', 'Settings'].map((action, i) => (
              <button
                key={i}
                style={{
                  padding: '10px 12px',
                  background: colors.raised,
                  border: `0.5px solid ${colors.border}`,
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = colors.border;
                  (e.currentTarget as HTMLElement).style.borderColor = colors.gold;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = colors.raised;
                  (e.currentTarget as HTMLElement).style.borderColor = colors.border;
                }}
              >
                {action} →
              </button>
            ))}
          </div>
        </div>

        {/* ROW 3: ISP NETWORK */}
        <div
          style={{
            background: colors.base,
            border: `0.5px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '32px',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: '0 0 4px', fontFamily: '"Space Grotesk", sans-serif' }}>
              ISP Network Status
            </h3>
            <p style={{ fontSize: 11, color: colors.textMuted, margin: 0 }}>Top 5 registered ISP partners</p>
          </div>

          {isps.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>
              No ISPs registered yet
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              {isps.map((isp) => (
                <div
                  key={isp.id}
                  style={{
                    background: colors.raised,
                    border: `0.5px solid ${colors.border}`,
                    borderRadius: '10px',
                    padding: '14px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: colors.textPrimary,
                      marginBottom: '8px',
                      fontFamily: '"Space Grotesk", sans-serif',
                    }}
                  >
                    {isp.name.length > 20 ? isp.name.slice(0, 17) + '...' : isp.name}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '4px',
                      marginBottom: '8px',
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isp.is_active ? colors.green : colors.red,
                        boxShadow: isp.is_active ? `0 0 8px ${colors.green}` : `0 0 8px ${colors.red}`,
                        margin: '0 auto',
                      }}
                    />
                    <div style={{ fontSize: 10, fontFamily: '"JetBrains Mono", monospace', color: isp.is_active ? colors.green : colors.red, marginTop: '6px', textTransform: 'uppercase', fontWeight: 700 }}>
                      {isp.is_active ? 'Live' : 'Offline'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ROW 4: RECENT TRANSACTIONS */}
        <div
          style={{
            background: colors.base,
            border: `0.5px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: '0 0 4px', fontFamily: '"Space Grotesk", sans-serif' }}>
              Recent Transactions
            </h3>
            <p style={{ fontSize: 11, color: colors.textMuted, margin: 0 }}>Latest 6 M-Pesa payments</p>
          </div>

          {txns.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>
              No transactions yet
            </div>
          ) : (
            <div>
              {txns.map((txn, i) => (
                <div
                  key={txn.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 140px 140px 100px',
                    gap: '24px',
                    padding: '16px 0',
                    borderBottom: i < txns.length - 1 ? `0.5px solid ${colors.raised}` : 'none',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: 12, fontFamily: '"JetBrains Mono", monospace', color: colors.textPrimary, fontWeight: 500 }}>
                    {txn.id.slice(0, 12)}...
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, fontFamily: '"JetBrains Mono", monospace', color: colors.gold, fontWeight: 500 }}>
                    {txn.amount_ksh.toLocaleString()} KES
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11, fontFamily: '"JetBrains Mono", monospace', color: colors.textMuted }}>
                    <div>Fee: {txn.platform_fee_ksh} KES</div>
                    <div style={{ color: colors.green, marginTop: '2px' }}>Net: {txn.isp_earnings_ksh} KES</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '9px',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background:
                          txn.status === 'completed' ? `${colors.green}15` : `${colors.amber}15`,
                        color: txn.status === 'completed' ? colors.green : colors.amber,
                        border: `0.5px solid ${
                          txn.status === 'completed' ? `${colors.green}40` : `${colors.amber}40`
                        }`,
                      }}
                    >
                      {txn.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}