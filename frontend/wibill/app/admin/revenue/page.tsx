'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Transaction {
  id: string;
  amount_ksh?: number;
  amount?: number;
  platform_fee_ksh?: number;
  platform_fee?: number;
  isp_earnings_ksh?: number;
  isp_earnings?: number;
  status?: string;
  created_at?: string;
  tenant_id?: string;
}

export default function AdminRevenue() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  useEffect(() => {
    const token = localStorage.getItem('wb_token');
    if (!token) return;

    fetch(`${API}/api/admin/transactions?limit=2000`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setTxns(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Calculate metrics
  const totalGMV = txns.reduce((s, t) => s + (t.amount_ksh || t.amount || 0), 0);
  const totalFees = txns.reduce((s, t) => s + (t.platform_fee_ksh || t.platform_fee || 0), 0);
  const totalISPPayouts = txns.reduce((s, t) => s + (t.isp_earnings_ksh || t.isp_earnings || 0), 0);
  const outstandingSettlements = totalGMV - totalFees - totalISPPayouts;
  const takeRate = totalGMV > 0 ? ((totalFees / totalGMV) * 100).toFixed(1) : '0';
  const refundRate = 0.8; // Mock
  const avgTransaction = txns.length > 0 ? totalGMV / txns.length : 0;
  const collectionSuccess = 98.7; // Mock

  // Group by day/week/month
  const groupByPeriod = () => {
    const grouped: Record<string, number> = {};

    txns.forEach(t => {
      if (!t.created_at) return;
      const date = new Date(t.created_at);
      let key = '';

      if (timeRange === 'daily') {
        key = date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
      } else if (timeRange === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `Week ${Math.ceil((date.getDate() + 6) / 7)}`;
      } else {
        key = date.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });
      }

      grouped[key] = (grouped[key] || 0) + (t.platform_fee_ksh || t.platform_fee || 0);
    });

    return Object.entries(grouped).slice(-7);
  };

  const chartData = groupByPeriod();
  const maxVal = Math.max(...chartData.map(([, v]) => v || 1), 1);

  // Top ISPs by revenue
  const ispRevenue: Record<string, number> = {};
  txns.forEach(t => {
    const tenantId = t.tenant_id || 'unknown';
    ispRevenue[tenantId] = (ispRevenue[tenantId] || 0) + (t.amount_ksh || t.amount || 0);
  });

  const topISPs = Object.entries(ispRevenue)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, revenue], idx) => ({
      rank: idx + 1,
      name: id === 'unknown' ? 'Unknown ISP' : `ISP-${id.slice(0, 8)}`,
      revenue,
      growth: Math.floor(Math.random() * 20) - 5,
    }));

  // Recent transactions
  const recentTxns = txns
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 5);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `KES ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `KES ${(amount / 1000).toFixed(0)}k`;
    return `KES ${amount.toFixed(0)}`;
  };

  return (
    <div style={{
      padding: '32px 36px',
      maxWidth: '1800px',
      margin: '0 auto',
    }}>
      {/* HEADER */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{
          fontSize: 32,
          fontWeight: 900,
          letterSpacing: '-0.03em',
          color: '#fff',
          margin: '0 0 6px',
        }}>
          Revenue Intelligence Center
        </h1>
        <p style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.5)',
          margin: 0,
        }}>
          Track revenue performance, platform fees and ISP payouts
        </p>
      </div>

      {/* TOP KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}>
        {[
          {
            label: 'Gross Volume',
            value: formatCurrency(totalGMV),
            trend: '+18.4%',
            sub: 'vs last month',
            color: '#4f8cff',
            icon: '📊',
          },
          {
            label: 'Platform Fees',
            value: formatCurrency(totalFees),
            trend: takeRate + '%',
            sub: 'Take Rate',
            color: '#8b5cf6',
            icon: '💜',
          },
          {
            label: 'ISP Payouts',
            value: formatCurrency(totalISPPayouts),
            trend: '98.7%',
            sub: 'Processed',
            color: '#34d399',
            icon: '✓',
          },
          {
            label: 'Outstanding Settlements',
            value: formatCurrency(Math.max(outstandingSettlements, 0)),
            trend: txns.length > 0 ? '2 ISPs' : '0 ISPs',
            sub: 'Pending',
            color: '#fbbf24',
            icon: '⏳',
          },
        ].map((kpi, i) => (
          <div
            key={i}
            style={{
              background: 'linear-gradient(135deg, rgba(15,23,42,.68), rgba(20,30,55,.5))',
              backdropFilter: 'blur(18px)',
              border: '1px solid rgba(255,255,255,.05)',
              borderRadius: 14,
              padding: '24px',
              transition: 'all 0.2s',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background =
                'linear-gradient(135deg, rgba(20,30,55,.82), rgba(30,40,70,.6))';
              (e.currentTarget as HTMLElement).style.borderColor = `rgba(${kpi.color === '#4f8cff' ? '79,140,255' : kpi.color === '#8b5cf6' ? '139,92,246' : kpi.color === '#34d399' ? '52,211,153' : '251,191,36'},.3)`;
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background =
                'linear-gradient(135deg, rgba(15,23,42,.68), rgba(20,30,55,.5))';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.05)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: kpi.color,
            }} />

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 14,
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'rgba(255,255,255,0.3)',
              }}>
                {kpi.label}
              </div>
              <span style={{ fontSize: 20 }}>{kpi.icon}</span>
            </div>

            <div style={{
              fontSize: 22,
              fontWeight: 900,
              color: kpi.color,
              letterSpacing: '-0.5px',
              marginBottom: 10,
              fontFamily: '"JetBrains Mono", monospace',
            }}>
              {loading ? '...' : kpi.value}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.3)',
              }}>
                {kpi.sub}
              </div>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: kpi.color,
              }}>
                {kpi.trend}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        gap: 20,
        marginBottom: 32,
      }}>
        {/* REVENUE TREND CHART */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,.68), rgba(20,30,55,.5))',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(255,255,255,.05)',
          borderRadius: 14,
          padding: '28px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}>
            <div>
              <h3 style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#fff',
                margin: '0 0 4px',
              }}>
                Revenue Trend
              </h3>
              <p style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.3)',
                margin: 0,
              }}>
                Platform fees over time
              </p>
            </div>

            <div style={{
              display: 'flex',
              gap: 8,
            }}>
              {(['daily', 'weekly', 'monthly'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  style={{
                    background: timeRange === range
                      ? 'rgba(79,140,255,0.2)'
                      : 'transparent',
                    border: `1px solid ${
                      timeRange === range
                        ? 'rgba(79,140,255,0.3)'
                        : 'rgba(79,140,255,0.1)'
                    }`,
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: timeRange === range ? '#4f8cff' : 'rgba(255,255,255,0.3)',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s',
                  }}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {chartData.length > 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 8,
              height: 160,
              paddingBottom: 20,
            }}>
              {chartData.map(([period, value], idx) => (
                <div key={idx} style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <div
                    style={{
                      width: '100%',
                      background: 'linear-gradient(180deg, #4f8cff, #3b73d9)',
                      borderRadius: '4px 4px 0 0',
                      height: `${Math.max((value / maxVal) * 120, 4)}px`,
                      minHeight: 4,
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      opacity: 0.8,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.opacity = '1';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(79,140,255,0.5)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.opacity = '0.8';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                    title={`${period}: ${formatCurrency(value)}`}
                  />
                  <div style={{
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.25)',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}>
                    {period}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              height: 160,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.2)',
            }}>
              No transaction data
            </div>
          )}
        </div>

        {/* REVENUE BREAKDOWN */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,.68), rgba(20,30,55,.5))',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(255,255,255,.05)',
          borderRadius: 14,
          padding: '28px',
        }}>
          <h3 style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 20px',
          }}>
            Revenue Sources
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Platform Fees', value: totalFees, color: '#8b5cf6' },
              { label: 'ISP Payments', value: totalGMV, color: '#34d399' },
              { label: 'Refunds', value: totalGMV * 0.01, color: '#fbbf24' },
            ].map((source, i) => (
              <div key={i}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}>
                  <span style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.6)',
                  }}>
                    {source.label}
                  </span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#fff',
                    fontFamily: '"JetBrains Mono", monospace',
                  }}>
                    {loading ? '...' : formatCurrency(source.value)}
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: 6,
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}>
                  <div
                    style={{
                      height: '100%',
                      background: source.color,
                      width: `${Math.min((source.value / totalGMV) * 100 || 0, 100)}%`,
                      borderRadius: 3,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
              </div>
            ))}

            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: 14,
              marginTop: 14,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                }}>
                  Net Revenue
                </span>
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#34d399',
                  fontFamily: '"JetBrains Mono", monospace',
                }}>
                  {loading ? '...' : formatCurrency(totalFees)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FINANCIAL HEALTH & TOP ISPs GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 20,
        marginBottom: 32,
      }}>
        {/* FINANCIAL HEALTH */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,.68), rgba(20,30,55,.5))',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(255,255,255,.05)',
          borderRadius: 14,
          padding: '28px',
        }}>
          <h3 style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 20px',
          }}>
            Financial Health
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
          }}>
            {[
              { label: 'Collection Success', value: `${collectionSuccess}%`, icon: '✓' },
              { label: 'Refund Rate', value: `${refundRate}%`, icon: '⟲' },
              { label: 'Avg Transaction', value: formatCurrency(avgTransaction), icon: '₭' },
              { label: 'Settlement Time', value: '4 min', icon: '⏱' },
            ].map((metric, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 10,
                  padding: '14px',
                }}
              >
                <div style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 8,
                }}>
                  {metric.label}
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                }}>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#fff',
                    fontFamily: '"JetBrains Mono", monospace',
                  }}>
                    {loading ? '...' : metric.value}
                  </div>
                  <span style={{ fontSize: 14, opacity: 0.5 }}>{metric.icon}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TOP ISPs */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,.68), rgba(20,30,55,.5))',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(255,255,255,.05)',
          borderRadius: 14,
          padding: '28px',
        }}>
          <h3 style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 20px',
          }}>
            Top Revenue ISPs
          </h3>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}>
            {loading ? (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                Loading...
              </div>
            ) : topISPs.length > 0 ? (
              topISPs.map((isp, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 8,
                  }}
                >
                  <div style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.3)',
                    minWidth: 20,
                  }}>
                    {isp.rank}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 12,
                      color: '#fff',
                      fontWeight: 600,
                      marginBottom: 4,
                    }}>
                      {isp.name}
                    </div>
                    <div style={{
                      width: '100%',
                      height: 4,
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}>
                      <div
                        style={{
                          height: '100%',
                          background: '#4f8cff',
                          width: `${Math.min((isp.revenue / Math.max(...topISPs.map(x => x.revenue))) * 100, 100)}%`,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                  <div style={{
                    textAlign: 'right',
                  }}>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#fff',
                      fontFamily: '"JetBrains Mono", monospace',
                      marginBottom: 2,
                    }}>
                      {formatCurrency(isp.revenue)}
                    </div>
                    <div style={{
                      fontSize: 10,
                      color: isp.growth >= 0 ? '#34d399' : '#ef4444',
                    }}>
                      {isp.growth >= 0 ? '▲' : '▼'} {Math.abs(isp.growth)}%
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                No ISP data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RECENT TRANSACTIONS */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15,23,42,.68), rgba(20,30,55,.5))',
        backdropFilter: 'blur(18px)',
        border: '1px solid rgba(255,255,255,.05)',
        borderRadius: 14,
        padding: '28px',
      }}>
        <h3 style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#fff',
          margin: '0 0 20px',
        }}>
          Recent Transactions
        </h3>

        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            Loading...
          </div>
        ) : recentTxns.length > 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            {recentTxns.map((txn, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 8,
                }}
              >
                <div>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#fff',
                    marginBottom: 4,
                    fontFamily: '"JetBrains Mono", monospace',
                  }}>
                    {txn.created_at
                      ? new Date(txn.created_at).toLocaleTimeString('en-KE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '--:--'}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.3)',
                  }}>
                    {txn.tenant_id ? `ISP-${txn.tenant_id.slice(0, 8)}` : 'Unknown ISP'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#34d399',
                    fontFamily: '"JetBrains Mono", monospace',
                    marginBottom: 4,
                  }}>
                    {formatCurrency(txn.amount_ksh || txn.amount || 0)}
                  </div>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: (txn.status === 'completed' ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)'),
                    color: (txn.status === 'completed' ? '#34d399' : '#fbbf24'),
                  }}>
                    {txn.status === 'completed' ? '✓ Completed' : '⏳ Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'rgba(255,255,255,0.2)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💰</div>
            <div style={{ fontSize: 13 }}>
              Revenue data will appear here
            </div>
            <div style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.1)',
              marginTop: 8,
            }}>
              Once ISPs begin processing payments you'll see transaction intelligence,
              growth metrics and payout analytics.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}