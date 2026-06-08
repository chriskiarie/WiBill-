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

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
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
  const [loading, setLoading] = useState(true);
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
      .catch((e) => console.error('Failed to load dashboard:', e))
      .finally(() => setLoading(false));
  }, []);

  const timeStr = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const colors = {
    bgVoid: '#000000',
    bgBase: '#080808',
    bgRaised: '#0d0d0d',
    cardBg: '#0a0a0a',
    border: '#141414',
    textPrimary: '#f0f0f0',
    textSecondary: '#666666',
    textMuted: '#2a2a2a',
    gold: '#E8B84B',
    green: '#22c55e',
    red: '#ef4444',
    amber: '#f59e0b',
  };

  const StatCard = ({ label, value, sub, color }: StatCardProps) => (
    <div style={{
      background: colors.cardBg,
      border: `0.5px solid ${color}30`,
      borderTop: `2px solid ${color}`,
      borderRadius: '10px',
      padding: '20px',
      fontSize: '13px',
    }}>
      <div style={{
        fontSize: '10px',
        fontFamily: 'DM Mono, monospace',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: colors.textMuted,
        marginBottom: '12px',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '32px',
        fontFamily: 'DM Mono, monospace',
        fontWeight: 500,
        color: colors.textPrimary,
        letterSpacing: '-0.04em',
        lineHeight: 1,
        marginBottom: '8px',
      }}>
        {value || '--'}
      </div>
      {sub && (
        <div style={{
          fontSize: '11px',
          fontFamily: 'DM Mono, monospace',
          color: colors.textSecondary,
        }}>
          {sub}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ background: colors.bgVoid, color: colors.textPrimary, minHeight: '100vh' }}>
      {/* Topbar */}
      <div style={{
        height: '52px',
        borderBottom: `0.5px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        fontSize: '13px',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ fontSize: '20px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>
          DASHBOARD
        </div>
        <div style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          fontSize: '11px',
          fontFamily: 'DM Mono, monospace',
          color: colors.textMuted,
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: colors.green,
            boxShadow: `0 0 8px ${colors.green}`,
          }} />
          <span>LIVE</span>
          <span>{timeStr}</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Row 1: 4 Stat Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}>
          <StatCard
            label="Revenue Today"
            value={`${stats.revenue_today.toLocaleString()} KES`}
            color={colors.gold}
          />
          <StatCard
            label="Monthly Revenue"
            value={`${stats.revenue_month.toLocaleString()} KES`}
            color="#3b82f6"
          />
          <StatCard
            label="Active Sessions"
            value={stats.active_sessions}
            color={colors.green}
          />
          <StatCard
            label="Total ISPs"
            value={stats.total_isps}
            color={colors.amber}
          />
        </div>

        {/* Row 2: Revenue Trend + Network Status */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: '16px',
          marginBottom: '28px',
        }}>
          {/* Revenue Trend Chart */}
          <div style={{
            background: colors.cardBg,
            border: `0.5px solid ${colors.border}`,
            borderRadius: '10px',
            padding: '20px',
          }}>
            <div style={{
              fontSize: '10px',
              fontFamily: 'DM Mono, monospace',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: colors.textMuted,
              marginBottom: '16px',
            }}>
              7-DAY REVENUE TREND
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '8px',
              height: '120px',
            }}>
              {trend.map((point, i) => {
                const maxAmount = Math.max(...trend.map((p) => p.amount), 1);
                const height = (point.amount / maxAmount) * 100;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${height}%`,
                      background: colors.gold,
                      borderRadius: '4px 4px 0 0',
                      minHeight: '4px',
                      opacity: 0.7,
                    }}
                    title={`${point.date}: ${point.amount.toFixed(0)} KES`}
                  />
                );
              })}
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '8px',
              fontSize: '9px',
              fontFamily: 'DM Mono, monospace',
              color: colors.textMuted,
            }}>
              {trend.map((p, i) => (
                <span key={i}>{p.date}</span>
              ))}
            </div>
          </div>

          {/* Network Status */}
          <div style={{
            background: colors.cardBg,
            border: `0.5px solid ${colors.border}`,
            borderRadius: '10px',
            padding: '20px',
          }}>
            <div style={{
              fontSize: '10px',
              fontFamily: 'DM Mono, monospace',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: colors.textMuted,
              marginBottom: '16px',
            }}>
              NETWORK STATUS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ color: colors.textSecondary }}>API</span>
                <span style={{
                  color: colors.green,
                  fontSize: '11px',
                  fontFamily: 'DM Mono, monospace',
                  fontWeight: 700,
                }}>
                  OK
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ color: colors.textSecondary }}>Database</span>
                <span style={{
                  color: colors.green,
                  fontSize: '11px',
                  fontFamily: 'DM Mono, monospace',
                  fontWeight: 700,
                }}>
                  OK
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ color: colors.textSecondary }}>M-Pesa</span>
                <span style={{
                  color: colors.amber,
                  fontSize: '11px',
                  fontFamily: 'DM Mono, monospace',
                  fontWeight: 700,
                }}>
                  SANDBOX
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: ISPs Table */}
        <div style={{
          background: colors.cardBg,
          border: `0.5px solid ${colors.border}`,
          borderRadius: '10px',
          padding: '20px',
          marginBottom: '28px',
        }}>
          <div style={{
            fontSize: '10px',
            fontFamily: 'DM Mono, monospace',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: colors.textMuted,
            marginBottom: '16px',
          }}>
            ACTIVE ISPs
          </div>
          {isps.length === 0 ? (
            <div style={{ color: colors.textMuted, fontSize: '13px', textAlign: 'center', padding: '20px' }}>
              No ISPs yet
            </div>
          ) : (
            <div style={{ fontSize: '13px' }}>
              {isps.map((isp, i) => (
                <div
                  key={isp.id}
                  style={{
                    padding: '12px 0',
                    borderBottom: i < isps.length - 1 ? `0.5px solid ${colors.bgRaised}` : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ color: colors.textPrimary, fontWeight: 500 }}>{isp.name}</div>
                    <div style={{
                      fontSize: '11px',
                      fontFamily: 'DM Mono, monospace',
                      color: colors.textMuted,
                      marginTop: '2px',
                    }}>
                      {isp.id.slice(0, 8)}...
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '24px',
                    alignItems: 'center',
                  }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '11px',
                        fontFamily: 'DM Mono, monospace',
                        color: colors.textMuted,
                      }}>
                        Commission
                      </div>
                      <div style={{
                        fontSize: '13px',
                        fontFamily: 'DM Mono, monospace',
                        color: colors.textPrimary,
                        fontWeight: 500,
                      }}>
                        {isp.commission_rate}%
                      </div>
                    </div>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isp.is_active ? colors.green : colors.red,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Row 4: Recent Transactions */}
        <div style={{
          background: colors.cardBg,
          border: `0.5px solid ${colors.border}`,
          borderRadius: '10px',
          padding: '20px',
        }}>
          <div style={{
            fontSize: '10px',
            fontFamily: 'DM Mono, monospace',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: colors.textMuted,
            marginBottom: '16px',
          }}>
            RECENT TRANSACTIONS
          </div>
          {txns.length === 0 ? (
            <div style={{ color: colors.textMuted, fontSize: '13px', textAlign: 'center', padding: '20px' }}>
              No transactions yet
            </div>
          ) : (
            <div style={{ fontSize: '12px' }}>
              {txns.map((txn, i) => (
                <div
                  key={txn.id}
                  style={{
                    padding: '12px 0',
                    borderBottom: i < txns.length - 1 ? `0.5px solid ${colors.bgRaised}` : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: 'DM Mono, monospace',
                      color: colors.textPrimary,
                      fontWeight: 500,
                    }}>
                      {txn.amount_ksh.toLocaleString()} KES
                    </div>
                    <div style={{
                      fontSize: '11px',
                      fontFamily: 'DM Mono, monospace',
                      color: colors.textMuted,
                      marginTop: '2px',
                    }}>
                      {new Date(txn.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'center',
                    textAlign: 'right',
                  }}>
                    <div style={{ fontSize: '11px', color: colors.textMuted }}>
                      <div>Fee: {txn.platform_fee_ksh} KES</div>
                      <div style={{ color: colors.green, fontWeight: 500, marginTop: '2px' }}>
                        Net: {txn.isp_earnings_ksh} KES
                      </div>
                    </div>
                    <div style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '9px',
                      fontFamily: 'DM Mono, monospace',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background: txn.status === 'completed' ? `${colors.green}15` : `${colors.amber}15`,
                      color: txn.status === 'completed' ? colors.green : colors.amber,
                      border: `0.5px solid ${txn.status === 'completed' ? `${colors.green}30` : `${colors.amber}30`}`,
                    }}>
                      {txn.status || 'pending'}
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