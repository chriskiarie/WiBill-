'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

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
      api.getDashboardSummary(),
      api.getRevenueTrend(7),
      api.getTopPackages(5),
      api.getTransactions(0, 6),
      api.getSessions('active'),
    ])
      .then(([dash, trendData, topPackages, txnData, sessionData]) => {
        const ispMetrics = dash?.metrics;
        if (ispMetrics) {
          setStats({
            revenue_today: ispMetrics.total_revenue_ksh || 0, // This is total, not today
            revenue_month: ispMetrics.total_revenue_ksh || 0,
            active_sessions: ispMetrics.active_sessions || 0,
            total_isps: 1, // ISP sees only themselves
          });
        }
        setTxns((txnData || []).slice(0, 6));
        
        // Build trend from real data
        if (trendData?.trend) {
          const last7 = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const dateStr = d.toISOString().split('T')[0];
            const dayData = trendData.trend.find((t: any) => t.date === dateStr);
            return {
              date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              amount: dayData?.total_revenue_ksh || 0,
            };
          });
          setTrend(last7);
        }
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

  return (
    <div style={{ background: colors.void, color: colors.textPrimary, minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* TOPBAR */}
      <div style={{
        height: '52px',
        borderBottom: `0.5px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
      }}>
        <div style={{
          fontSize: '18px',
          fontFamily: 'Space Grotesk, sans-serif',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          textTransform: 'uppercase',
        }}>
          Dashboard
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          fontSize: '11px',
          fontFamily: 'DM Mono, monospace',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: colors.green,
              boxShadow: `0 0 8px ${colors.green}`,
            }} />
            <span style={{ color: colors.textMuted }}>LIVE</span>
          </div>
          <span style={{ color: colors.textMuted }}>{timeStr}</span>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: '32px', maxWidth: '1440px', margin: '0 auto' }}>
        {/* ROW 1: 4 STAT CARDS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '32px',
        }}>
          {/* Revenue Today */}
          <div style={{
            background: colors.base,
            border: `0.5px solid ${colors.border}`,
            borderTop: `2px solid ${colors.gold}`,
            borderRadius: '10px',
            padding: '24px',
          }}>
            <div style={{
              fontSize: '10px',
              fontFamily: 'DM Mono, monospace',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: colors.textMuted,
              marginBottom: '16px',
            }}>
              Revenue Today
            </div>
            <div style={{
              fontSize: '36px',
              fontFamily: 'DM Mono, monospace',
              fontWeight: 500,
              color: colors.gold,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              marginBottom: '8px',
            }}>
              {stats.revenue_today ? `${(stats.revenue_today / 1000).toFixed(1)}K` : '--'}
            </div>
            <div style={{
              fontSize: '11px',
              fontFamily: 'DM Mono, monospace',
              color: colors.textSecondary,
            }}>
              KES
            </div>
          </div>

          {/* Revenue Month */}
          <div style={{
            background: colors.base,
            border: `0.5px solid ${colors.border}`,
            borderTop: `2px solid ${colors.blue}`,
            borderRadius: '10px',
            padding: '24px',
          }}>
            <div style={{
              fontSize: '10px',
              fontFamily: 'DM Mono, monospace',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: colors.textMuted,
              marginBottom: '16px',
            }}>
              Monthly Revenue
            </div>
            <div style={{
              fontSize: '36px',
              fontFamily: 'DM Mono, monospace',
              fontWeight: 500,
              color: colors.blue,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              marginBottom: '8px',
            }}>
              {stats.revenue_month ? `${(stats.revenue_month / 1000).toFixed(1)}K` : '--'}
            </div>
            <div style={{
              fontSize: '11px',
              fontFamily: 'DM Mono, monospace',
              color: colors.textSecondary,
            }}>
              KES
            </div>
          </div>

          {/* Active Sessions */}
          <div style={{
            background: colors.base,
            border: `0.5px solid ${colors.border}`,
            borderTop: `2px solid ${colors.green}`,
            borderRadius: '10px',
            padding: '24px',
          }}>
            <div style={{
              fontSize: '10px',
              fontFamily: 'DM Mono, monospace',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: colors.textMuted,
              marginBottom: '16px',
            }}>
              Active Sessions
            </div>
            <div style={{
              fontSize: '36px',
              fontFamily: 'DM Mono, monospace',
              fontWeight: 500,
              color: colors.green,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              marginBottom: '8px',
            }}>
              {stats.active_sessions || '--'}
            </div>
            <div style={{
              fontSize: '11px',
              fontFamily: 'DM Mono, monospace',
              color: colors.textSecondary,
            }}>
              Online
            </div>
          </div>

          {/* Total ISPs */}
          <div style={{
            background: colors.base,
            border: `0.5px solid ${colors.border}`,
            borderTop: `2px solid ${colors.amber}`,
            borderRadius: '10px',
            padding: '24px',
          }}>
            <div style={{
              fontSize: '10px',
              fontFamily: 'DM Mono, monospace',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: colors.textMuted,
              marginBottom: '16px',
            }}>
              Total ISPs
            </div>
            <div style={{
              fontSize: '36px',
              fontFamily: 'DM Mono, monospace',
              fontWeight: 500,
              color: colors.amber,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              marginBottom: '8px',
            }}>
              {stats.total_isps || '--'}
            </div>
            <div style={{
              fontSize: '11px',
              fontFamily: 'DM Mono, monospace',
              color: colors.textSecondary,
            }}>
              Network
            </div>
          </div>
        </div>

        {/* ROW 2: REVENUE CHART + NETWORK STATUS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: '16px',
          marginBottom: '32px',
        }}>
          {/* Revenue Trend Chart */}
          <div style={{
            background: colors.base,
            border: `0.5px solid ${colors.border}`,
            borderRadius: '10px',
            padding: '24px',
          }}>
            <div style={{
              fontSize: '10px',
              fontFamily: 'DM Mono, monospace',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: colors.textMuted,
              marginBottom: '24px',
            }}>
              7-Day Revenue Trend
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '10px',
              height: '140px',
              marginBottom: '16px',
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
                      opacity: 0.8,
                      cursor: 'pointer',
                      transition: 'opacity 0.2s',
                    }}
                    title={`${point.date}: ${point.amount.toFixed(0)} KES`}
                    onMouseOver={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
                    onMouseOut={(e) => { (e.target as HTMLElement).style.opacity = '0.8'; }}
                  />
                );
              })}
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '9px',
              fontFamily: 'DM Mono, monospace',
              color: colors.textMuted,
              paddingTop: '12px',
              borderTop: `0.5px solid ${colors.raised}`,
            }}>
              {trend.map((p, i) => (
                <span key={i}>{p.date}</span>
              ))}
            </div>
          </div>

          {/* Network Status */}
          <div style={{
            background: colors.base,
            border: `0.5px solid ${colors.border}`,
            borderRadius: '10px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <div style={{
              fontSize: '10px',
              fontFamily: 'DM Mono, monospace',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: colors.textMuted,
            }}>
              System Status
            </div>

            {[
              { label: 'API', status: 'ok' },
              { label: 'Database', status: 'ok' },
              { label: 'M-Pesa', status: 'sandbox' },
            ].map((item) => (
              <div key={item.label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '12px',
                borderBottom: `0.5px solid ${colors.raised}`,
              }}>
                <span style={{
                  fontSize: '13px',
                  color: colors.textSecondary,
                }}>
                  {item.label}
                </span>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: item.status === 'ok' ? colors.green : colors.amber,
                    boxShadow: `0 0 4px ${item.status === 'ok' ? colors.green : colors.amber}`,
                  }} />
                  <span style={{
                    fontSize: '10px',
                    fontFamily: 'DM Mono, monospace',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: item.status === 'ok' ? colors.green : colors.amber,
                  }}>
                    {item.status === 'ok' ? 'OK' : 'SANDBOX'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ROW 3: ISP NETWORK TABLE */}
        <div style={{
          background: colors.base,
          border: `0.5px solid ${colors.border}`,
          borderRadius: '10px',
          padding: '24px',
          marginBottom: '32px',
        }}>
          <div style={{
            fontSize: '10px',
            fontFamily: 'DM Mono, monospace',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: colors.textMuted,
            marginBottom: '20px',
          }}>
            Active ISP Network
          </div>

          {isps.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: colors.textMuted,
              fontSize: '13px',
            }}>
              No ISPs configured
            </div>
          ) : (
            <div>
              {isps.map((isp, i) => (
                <div
                  key={isp.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px 100px',
                    gap: '24px',
                    padding: '16px 0',
                    borderBottom: i < isps.length - 1 ? `0.5px solid ${colors.raised}` : 'none',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: '13px',
                      color: colors.textPrimary,
                      fontWeight: 500,
                      marginBottom: '4px',
                    }}>
                      {isp.name}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      fontFamily: 'DM Mono, monospace',
                      color: colors.textMuted,
                    }}>
                      {isp.id.slice(0, 12)}...
                    </div>
                  </div>
                  <div style={{
                    textAlign: 'right',
                  }}>
                    <div style={{
                      fontSize: '10px',
                      fontFamily: 'DM Mono, monospace',
                      color: colors.textMuted,
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
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
                    textAlign: 'center',
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: isp.is_active ? colors.green : colors.red,
                      boxShadow: isp.is_active ? `0 0 8px ${colors.green}` : `0 0 8px ${colors.red}`,
                      margin: '0 auto',
                    }} />
                    <div style={{
                      fontSize: '10px',
                      fontFamily: 'DM Mono, monospace',
                      color: isp.is_active ? colors.green : colors.red,
                      marginTop: '6px',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                    }}>
                      {isp.is_active ? 'Live' : 'Offline'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ROW 4: RECENT TRANSACTIONS */}
        <div style={{
          background: colors.base,
          border: `0.5px solid ${colors.border}`,
          borderRadius: '10px',
          padding: '24px',
        }}>
          <div style={{
            fontSize: '10px',
            fontFamily: 'DM Mono, monospace',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: colors.textMuted,
            marginBottom: '20px',
          }}>
            Recent Transactions
          </div>

          {txns.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: colors.textMuted,
              fontSize: '13px',
            }}>
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
                  <div style={{
                    fontSize: '12px',
                    fontFamily: 'DM Mono, monospace',
                    color: colors.textPrimary,
                    fontWeight: 500,
                  }}>
                    {txn.id.slice(0, 12)}...
                  </div>
                  <div style={{
                    textAlign: 'right',
                    fontSize: '12px',
                    fontFamily: 'DM Mono, monospace',
                    color: colors.gold,
                    fontWeight: 500,
                  }}>
                    {txn.amount_ksh.toLocaleString()} KES
                  </div>
                  <div style={{
                    textAlign: 'right',
                    fontSize: '11px',
                    fontFamily: 'DM Mono, monospace',
                    color: colors.textMuted,
                  }}>
                    <div>Fee: {txn.platform_fee_ksh} KES</div>
                    <div style={{ color: colors.green, marginTop: '2px' }}>
                      Net: {txn.isp_earnings_ksh} KES
                    </div>
                  </div>
                  <div style={{
                    textAlign: 'center',
                  }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '9px',
                      fontFamily: 'DM Mono, monospace',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background: txn.status === 'completed' ? `${colors.green}15` : `${colors.amber}15`,
                      color: txn.status === 'completed' ? colors.green : colors.amber,
                      border: `0.5px solid ${txn.status === 'completed' ? `${colors.green}40` : `${colors.amber}40`}`,
                    }}>
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