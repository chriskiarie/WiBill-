'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Transaction {
  id: string;
  phone_number?: string;
  amount_ksh?: number;
  amount?: number;
  platform_fee_ksh?: number;
  platform_fee?: number;
  isp_earnings_ksh?: number;
  isp_earnings?: number;
  mpesa_receipt?: string;
  status?: string;
  created_at?: string;
  tenant_id?: string;
}

export default function AdminTransactions() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'custom'>('today');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'pending' | 'failed'>('all');
  const [expandedTxn, setExpandedTxn] = useState<string | null>(null);

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
  const totalVolume = txns.reduce((s, t) => s + (t.amount_ksh || t.amount || 0), 0);
  const txnCount = txns.length;
  const successCount = txns.filter(t => t.status === 'completed' || !t.status).length;
  const failedCount = txns.filter(t => t.status === 'failed').length;
  const successRate = txnCount > 0 ? ((successCount / txnCount) * 100).toFixed(1) : '0';

  // Filter transactions
  const filtered = txns.filter(t => {
    if (search && !t.phone_number?.includes(search) && !t.mpesa_receipt?.includes(search)) {
      return false;
    }
    if (statusFilter === 'success' && t.status !== 'completed' && t.status !== undefined) return false;
    if (statusFilter === 'pending' && t.status !== 'pending') return false;
    if (statusFilter === 'failed' && t.status !== 'failed') return false;
    return true;
  });

  // Recent alerts
  const alerts = [
    { type: 'failed', count: failedCount, label: 'failed payments' },
    { type: 'delayed', count: 1, label: 'settlement delayed' },
    { type: 'duplicate', count: 0, label: 'duplicate receipts' },
  ];

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `KES ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `KES ${(amount / 1000).toFixed(0)}k`;
    return `KES ${amount.toFixed(0)}`;
  };

  const getStatusColor = (status?: string) => {
    if (status === 'failed') return { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', label: '✕ Failed' };
    if (status === 'pending') return { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24', label: '⏳ Pending' };
    return { bg: 'rgba(52,211,153,0.12)', text: '#34d399', label: '✓ Completed' };
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
          Transaction Intelligence
        </h1>
        <p style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.5)',
          margin: 0,
        }}>
          Track payment flow, platform fees and settlements
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
            label: 'Total Volume',
            value: formatCurrency(totalVolume),
            trend: '+18%',
            sub: 'Today',
            color: '#4f8cff',
            icon: '📊',
          },
          {
            label: 'Transaction Count',
            value: txnCount.toString(),
            trend: '+12%',
            sub: 'Payments processed',
            color: '#8b5cf6',
            icon: '↔',
          },
          {
            label: 'Success Rate',
            value: successRate + '%',
            trend: 'Healthy',
            sub: 'API stable',
            color: '#34d399',
            icon: '✓',
          },
          {
            label: 'Failed Payments',
            value: failedCount.toString(),
            trend: ((failedCount / txnCount) * 100).toFixed(1) + '%',
            sub: 'Review required',
            color: '#fbbf24',
            icon: '⚠',
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
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.1)';
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
              <span style={{ fontSize: 16 }}>{kpi.icon}</span>
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

      {/* SEARCH & FILTERS */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 28,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <input
          type="text"
          placeholder="Search phone or receipt..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 250,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: '10px 16px',
            fontSize: 13,
            color: '#fff',
            outline: 'none',
            transition: 'all 0.2s',
          }}
          onFocus={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
          }}
          onBlur={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
          }}
        />

        <select
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value as any)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 12,
            color: '#fff',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="today">Today</option>
          <option value="7days">7 Days</option>
          <option value="30days">30 Days</option>
          <option value="custom">Custom</option>
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 12,
            color: '#fff',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Status</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>

        <button
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: '10px 16px',
            fontSize: 12,
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
          }}
        >
          📥 Export CSV
        </button>
      </div>

      {/* MAIN GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: 20,
        marginBottom: 32,
      }}>
        {/* TRANSACTIONS TABLE */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,.68), rgba(20,30,55,.5))',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(255,255,255,.05)',
          borderRadius: 14,
          overflow: 'hidden',
        }}>
          <div style={{
            maxHeight: '600px',
            overflowY: 'auto',
          }}>
            {loading ? (
              <div style={{
                padding: '60px 20px',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.2)',
              }}>
                Loading transactions...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{
                padding: '60px 20px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🧾</div>
                <div style={{ color: '#fff', fontSize: 14, marginBottom: 6 }}>
                  No transactions found
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                  Payments processed by ISPs will appear here automatically.
                </div>
              </div>
            ) : (
              filtered.map(txn => {
                const status = getStatusColor(txn.status);
                const isExpanded = expandedTxn === txn.id;

                return (
                  <div key={txn.id}>
                    <div
                      onClick={() => setExpandedTxn(isExpanded ? null : txn.id)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '60px 1fr 120px 120px 120px 100px',
                        gap: 12,
                        padding: '16px 20px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        alignItems: 'center',
                        cursor: 'pointer',
                        background: isExpanded ? 'rgba(79,140,255,0.08)' : 'transparent',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(79,140,255,0.05)';
                        (e.currentTarget as HTMLElement).style.transform = 'scale(1.002)';
                      }}
                      onMouseLeave={e => {
                        if (!isExpanded) {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }
                        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                      }}
                    >
                      {/* Status */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <span style={{
                          display: 'inline-block',
                          background: status.bg,
                          color: status.text,
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                        }}>
                          {status.label}
                        </span>
                      </div>

                      {/* Phone */}
                      <div>
                        <div style={{
                          fontSize: 13,
                          color: '#fff',
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 500,
                          marginBottom: 3,
                        }}>
                          {txn.phone_number || '—'}
                        </div>
                        <div style={{
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.3)',
                        }}>
                          ISP-{txn.tenant_id?.slice(0, 8) || 'unknown'}
                        </div>
                      </div>

                      {/* Amount */}
                      <div style={{
                        textAlign: 'right',
                      }}>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#34d399',
                          fontFamily: '"JetBrains Mono", monospace',
                        }}>
                          {formatCurrency(txn.amount_ksh || txn.amount || 0)}
                        </div>
                      </div>

                      {/* Fee */}
                      <div style={{
                        textAlign: 'right',
                      }}>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#8b5cf6',
                          fontFamily: '"JetBrains Mono", monospace',
                        }}>
                          {formatCurrency(txn.platform_fee_ksh || txn.platform_fee || 0)}
                        </div>
                      </div>

                      {/* ISP Earnings */}
                      <div style={{
                        textAlign: 'right',
                      }}>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#4f8cff',
                          fontFamily: '"JetBrains Mono", monospace',
                        }}>
                          {formatCurrency(txn.isp_earnings_ksh || txn.isp_earnings || 0)}
                        </div>
                      </div>

                      {/* Time */}
                      <div style={{
                        textAlign: 'right',
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.4)',
                        fontFamily: '"JetBrains Mono", monospace',
                      }}>
                        {txn.created_at
                          ? new Date(txn.created_at).toLocaleTimeString('en-KE', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </div>
                    </div>

                    {/* EXPANDED ROW */}
                    {isExpanded && (
                      <div style={{
                        background: 'rgba(79,140,255,0.05)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        padding: '20px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 24,
                      }}>
                        {[
                          { label: 'Customer Phone', value: txn.phone_number || '—' },
                          { label: 'ISP', value: `ISP-${txn.tenant_id?.slice(0, 8) || 'unknown'}` },
                          { label: 'Gross Payment', value: formatCurrency(txn.amount_ksh || txn.amount || 0) },
                          { label: 'Platform Fee', value: formatCurrency(txn.platform_fee_ksh || txn.platform_fee || 0) },
                          { label: 'ISP Settlement', value: formatCurrency(txn.isp_earnings_ksh || txn.isp_earnings || 0) },
                          { label: 'Settlement Status', value: 'Processed' },
                          { label: 'API Response Time', value: '140ms' },
                          { label: 'M-PESA Receipt', value: txn.mpesa_receipt || '—' },
                        ].map((field, i) => (
                          <div key={i}>
                            <div style={{
                              fontSize: 10,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              color: 'rgba(255,255,255,0.3)',
                              marginBottom: 6,
                            }}>
                              {field.label}
                            </div>
                            <div style={{
                              fontSize: 13,
                              color: '#fff',
                              fontFamily: '"JetBrains Mono", monospace',
                              fontWeight: 500,
                            }}>
                              {field.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ALERTS PANEL */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,.68), rgba(20,30,55,.5))',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(255,255,255,.05)',
          borderRadius: 14,
          padding: '24px',
          height: 'fit-content',
        }}>
          <h3 style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 18px',
          }}>
            Alerts
          </h3>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            {alerts
              .filter(a => a.count > 0)
              .map((alert, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(251,191,36,0.1)',
                    border: '1px solid rgba(251,191,36,0.2)',
                    borderRadius: 10,
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#fbbf24',
                    flexShrink: 0,
                  }} />
                  <div style={{
                    flex: 1,
                  }}>
                    <div style={{
                      fontSize: 12,
                      color: '#fbbf24',
                      fontWeight: 600,
                    }}>
                      {alert.count} {alert.label}
                    </div>
                  </div>
                </div>
              ))}

            {alerts.filter(a => a.count > 0).length === 0 && (
              <div style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.3)',
                padding: '12px',
                textAlign: 'center',
              }}>
                No alerts
              </div>
            )}
          </div>

          {/* TRANSACTION TIMELINE */}
          <div style={{
            marginTop: 28,
            paddingTop: 20,
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}>
            <h4 style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
              margin: '0 0 14px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              opacity: 0.6,
            }}>
              Recent Activity
            </h4>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              {filtered.slice(0, 3).map((txn, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 0',
                    borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}
                >
                  <div style={{
                    fontSize: 10,
                    fontFamily: '"JetBrains Mono", monospace',
                    color: 'rgba(255,255,255,0.3)',
                    minWidth: 30,
                  }}>
                    {txn.created_at
                      ? new Date(txn.created_at).toLocaleTimeString('en-KE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </div>
                  <div style={{
                    flex: 1,
                    minWidth: 0,
                  }}>
                    <div style={{
                      fontSize: 11,
                      color: '#fff',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {formatCurrency(txn.amount_ksh || txn.amount || 0)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: getStatusColor(txn.status).bg,
                    color: getStatusColor(txn.status).text,
                    fontWeight: 600,
                  }}>
                    {getStatusColor(txn.status).label.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}