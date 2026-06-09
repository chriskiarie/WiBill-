'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Transaction {
  id: string;
  phone_number?: string;
  amount_ksh?: number;
  platform_fee_ksh?: number;
  isp_earnings_ksh?: number;
  mpesa_receipt?: string;
  status?: string;
  created_at?: string;
  tenant_id?: string;
}

// COLOR PALETTE - DEFINED FIRST
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

export default function AdminTransactions() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');

  useEffect(() => {
    const token = localStorage.getItem('wb_token');
    if (!token) return;

    fetch(`${API}/api/transactions?limit=500`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setTxns(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Calculate metrics
  const totalVolume = txns.reduce((s, t) => s + (t.amount_ksh || 0), 0);
  const txnCount = txns.length;
  const completedCount = txns.filter(t => !t.status || t.status === 'completed').length;
  const pendingCount = txns.filter(t => t.status === 'pending').length;
  const failedCount = txns.filter(t => t.status === 'failed').length;
  const successRate = txnCount > 0 ? ((completedCount / txnCount) * 100).toFixed(1) : '0';
  const avgTxnSize = txnCount > 0 ? totalVolume / txnCount : 0;

  // Status breakdown - NOW colors is defined
  const statusBreakdown = [
    { label: 'Completed', count: completedCount, color: colors.green, percent: txnCount > 0 ? (completedCount / txnCount) * 100 : 0 },
    { label: 'Pending', count: pendingCount, color: colors.amber, percent: txnCount > 0 ? (pendingCount / txnCount) * 100 : 0 },
    { label: 'Failed', count: failedCount, color: colors.red, percent: txnCount > 0 ? (failedCount / txnCount) * 100 : 0 },
  ];

  // Filter transactions
  const filtered = txns
    .filter(t => {
      if (search) {
        const q = search.toLowerCase();
        return (t.phone_number?.toLowerCase().includes(q) || 
                t.mpesa_receipt?.toLowerCase().includes(q));
      }
      return true;
    })
    .filter(t => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'completed') return !t.status || t.status === 'completed';
      if (statusFilter === 'pending') return t.status === 'pending';
      if (statusFilter === 'failed') return t.status === 'failed';
      return true;
    });

  // Top paying phones (anonymized)
  const phoneVolume: Record<string, number> = {};
  txns.forEach(t => {
    if (t.phone_number) {
      const key = t.phone_number.slice(-4);
      phoneVolume[key] = (phoneVolume[key] || 0) + (t.amount_ksh || 0);
    }
  });
  const topPhones = Object.entries(phoneVolume)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `KES ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `KES ${(amount / 1000).toFixed(0)}k`;
    return `KES ${amount.toFixed(0)}`;
  };

  return (
    <div style={{ background: colors.void, color: colors.textPrimary, minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif', padding: '32px 36px', maxWidth: '1800px', margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.025em', margin: '0 0 8px', color: colors.textPrimary, fontFamily: '"Space Grotesk", sans-serif' }}>
          Transactions
        </h1>
        <p style={{ fontSize: 13, color: colors.textSecondary, margin: 0 }}>
          Real-time payment monitoring and M-Pesa settlement tracking
        </p>
      </div>

      {/* PRIMARY KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total Volume', value: formatCurrency(totalVolume), color: colors.blue, icon: '💳', change: '+24.8%' },
          { label: 'Transactions', value: txnCount.toLocaleString(), color: colors.blue, icon: '↔', change: '+18.3%' },
          { label: 'Success Rate', value: successRate + '%', color: colors.green, icon: '✓', change: 'Stable' },
          { label: 'Avg Size', value: formatCurrency(avgTxnSize), color: colors.gold, icon: '📊', change: 'Per txn' },
        ].map((metric, i) => (
          <div key={i} style={{
            background: colors.base,
            border: `0.5px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: metric.color }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.textMuted }}>
                {metric.label}
              </div>
              <span style={{ fontSize: 18 }}>{metric.icon}</span>
            </div>

            <div style={{ fontSize: 24, fontWeight: 900, color: metric.color, fontFamily: '"JetBrains Mono", monospace', marginBottom: '8px' }}>
              {metric.value}
            </div>

            <div style={{ fontSize: 11, color: metric.color, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
              {metric.change}
            </div>
          </div>
        ))}
      </div>

      {/* STATUS BREAKDOWN + TOP PHONES GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
        {/* STATUS BREAKDOWN */}
        <div style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif' }}>
            Payment Status
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {statusBreakdown.map((status, i) => (
              <div key={i}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary }}>
                    {status.label}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: status.color, fontFamily: '"JetBrains Mono", monospace' }}>
                    {status.count} ({status.percent.toFixed(1)}%)
                  </div>
                </div>

                <div style={{
                  height: '8px',
                  background: colors.raised,
                  borderRadius: '4px',
                  overflow: 'hidden',
                  border: `0.5px solid ${colors.border}`,
                }}>
                  <div style={{
                    height: '100%',
                    background: status.color,
                    width: `${status.percent}%`,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* STATUS FILTER BUTTONS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px' }}>
            {(['all', 'completed', 'pending', 'failed'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                style={{
                  padding: '8px 12px',
                  background: statusFilter === filter ? colors.border : colors.raised,
                  border: `0.5px solid ${statusFilter === filter ? colors.gold : colors.border}`,
                  borderRadius: '6px',
                  color: statusFilter === filter ? colors.gold : colors.textSecondary,
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (statusFilter !== filter) {
                    (e.currentTarget as HTMLElement).style.background = colors.border;
                    (e.currentTarget as HTMLElement).style.borderColor = colors.gold;
                  }
                }}
                onMouseLeave={(e) => {
                  if (statusFilter !== filter) {
                    (e.currentTarget as HTMLElement).style.background = colors.raised;
                    (e.currentTarget as HTMLElement).style.borderColor = colors.border;
                  }
                }}
              >
                {filter === 'all' ? 'All' : filter === 'completed' ? '✓ OK' : filter === 'pending' ? '⏳ Pending' : '✕ Failed'}
              </button>
            ))}
          </div>
        </div>

        {/* TOP PAYING NUMBERS */}
        <div style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif' }}>
            Top Paying Numbers
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topPhones.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>
                No transaction data
              </div>
            ) : (
              topPhones.map(([phone, amount], idx) => {
                const colors_array = [colors.gold, colors.green, colors.blue, colors.amber, colors.red];
                return (
                  <div key={phone} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: colors.raised,
                    border: `0.5px solid ${colors.border}`,
                    borderRadius: '8px',
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: colors_array[idx],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 900,
                      color: colors.void,
                    }}>
                      #{idx + 1}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: colors.textPrimary, marginBottom: '2px', fontFamily: '"JetBrains Mono", monospace' }}>
                        *****{phone}
                      </div>
                      <div style={{
                        height: '4px',
                        background: colors.border,
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          background: colors_array[idx],
                          width: `${Math.min((amount / topPhones[0][1]) * 100, 100)}%`,
                        }} />
                      </div>
                    </div>

                    <div style={{
                      fontSize: 12,
                      fontWeight: 900,
                      color: colors_array[idx],
                      fontFamily: '"JetBrains Mono", monospace',
                      textAlign: 'right',
                      minWidth: '80px',
                    }}>
                      {formatCurrency(amount)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* SEARCH & FILTER */}
      <div style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Search by phone number or M-Pesa receipt..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: colors.raised,
              border: `0.5px solid ${colors.border}`,
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: 12,
              color: colors.textPrimary,
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: '"JetBrains Mono", monospace',
            }}
          />
        </div>

        <div style={{ fontSize: 11, color: colors.textMuted, fontFamily: '"JetBrains Mono", monospace' }}>
          Showing {filtered.length} of {txns.length} transactions
        </div>
      </div>

      {/* TRANSACTIONS TABLE */}
      <div style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '24px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif' }}>
          Transaction History
        </h2>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: colors.textMuted }}>
            Loading transactions...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: colors.textMuted }}>
            No transactions found
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 12,
              fontFamily: '"JetBrains Mono", monospace',
            }}>
              <thead>
                <tr style={{ borderBottom: `0.5px solid ${colors.border}` }}>
                  <th style={{ textAlign: 'left', padding: '12px 0', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
                    ID
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 0', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
                    Phone
                  </th>
                  <th style={{ textAlign: 'right', padding: '12px 0', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
                    Amount
                  </th>
                  <th style={{ textAlign: 'right', padding: '12px 0', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
                    Fee
                  </th>
                  <th style={{ textAlign: 'right', padding: '12px 0', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
                    ISP Earning
                  </th>
                  <th style={{ textAlign: 'center', padding: '12px 0', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
                    Status
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 0', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
                    Receipt
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 0', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((txn, idx) => {
                  const status = !txn.status || txn.status === 'completed' ? 'completed' : txn.status === 'pending' ? 'pending' : 'failed';
                  const statusColors: Record<string, { bg: string; text: string }> = {
                    completed: { bg: `${colors.green}15`, text: colors.green },
                    pending: { bg: `${colors.amber}15`, text: colors.amber },
                    failed: { bg: `${colors.red}15`, text: colors.red },
                  };

                  return (
                    <tr key={txn.id} style={{
                      borderBottom: `0.5px solid ${colors.border}`,
                      background: idx % 2 === 0 ? colors.raised : 'transparent',
                    }}>
                      <td style={{ padding: '12px 0', color: colors.textSecondary }}>
                        {txn.id.slice(0, 8)}...
                      </td>
                      <td style={{ padding: '12px 0', color: colors.textPrimary }}>
                        {txn.phone_number || '—'}
                      </td>
                      <td style={{ padding: '12px 0', color: colors.blue, textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(txn.amount_ksh || 0)}
                      </td>
                      <td style={{ padding: '12px 0', color: colors.gold, textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(txn.platform_fee_ksh || 0)}
                      </td>
                      <td style={{ padding: '12px 0', color: colors.green, textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(txn.isp_earnings_ksh || 0)}
                      </td>
                      <td style={{ padding: '12px 0', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          background: statusColors[status].bg,
                          color: statusColors[status].text,
                          border: `0.5px solid ${statusColors[status].text}40`,
                        }}>
                          {status === 'completed' ? '✓' : status === 'pending' ? '⏳' : '✕'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 0', color: colors.textSecondary, fontSize: 11 }}>
                        {txn.mpesa_receipt ? `${txn.mpesa_receipt.slice(0, 8)}...` : '—'}
                      </td>
                      <td style={{ padding: '12px 0', color: colors.textSecondary, fontSize: 11 }}>
                        {txn.created_at ? new Date(txn.created_at).toLocaleDateString('en-KE') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filtered.length > 100 && (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                color: colors.textMuted,
                fontSize: 11,
                borderTop: `0.5px solid ${colors.border}`,
                marginTop: '16px',
              }}>
                Showing 100 of {filtered.length} transactions
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}