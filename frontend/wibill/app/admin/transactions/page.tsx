'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Transaction {
  id: string;
  amount_ksh: number;
  platform_fee_ksh: number;
  isp_earnings_ksh: number;
  status: string;
  mpesa_receipt?: string;
  created_at: string;
  phone_number?: string;
}

export default function AdminTransactions() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('wb_token');
    if (!token) return;

    fetch(`${API}/api/transactions?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setTxns(data.value || []))
      .catch((e) => console.error('Failed to load transactions:', e))
      .finally(() => setLoading(false));
  }, []);

  const colors = {
    bgVoid: '#000000',
    cardBg: '#0a0a0a',
    border: '#141414',
    bgRaised: '#0d0d0d',
    textPrimary: '#f0f0f0',
    textSecondary: '#666666',
    textMuted: '#2a2a2a',
    gold: '#E8B84B',
    green: '#22c55e',
    amber: '#f59e0b',
    red: '#ef4444',
  };

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
      }}>
        <div style={{ fontSize: '20px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>
          TRANSACTIONS
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
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
            All Transactions ({txns.length})
          </div>

          {loading ? (
            <div style={{ color: colors.textMuted, textAlign: 'center', padding: '40px' }}>
              Loading...
            </div>
          ) : txns.length === 0 ? (
            <div style={{ color: colors.textMuted, textAlign: 'center', padding: '40px' }}>
              No transactions yet
            </div>
          ) : (
            <div style={{ fontSize: '12px', overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: 'DM Mono, monospace',
              }}>
                <thead>
                  <tr style={{
                    borderBottom: `0.5px solid ${colors.bgRaised}`,
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: colors.textMuted,
                  }}>
                    <th style={{ textAlign: 'left', padding: '8px 0', paddingRight: '16px' }}>ID</th>
                    <th style={{ textAlign: 'left', padding: '8px 0', paddingRight: '16px' }}>Phone</th>
                    <th style={{ textAlign: 'right', padding: '8px 0', paddingRight: '16px' }}>Amount</th>
                    <th style={{ textAlign: 'right', padding: '8px 0', paddingRight: '16px' }}>Fee</th>
                    <th style={{ textAlign: 'right', padding: '8px 0', paddingRight: '16px' }}>ISP Earnings</th>
                    <th style={{ textAlign: 'left', padding: '8px 0', paddingRight: '16px' }}>Receipt</th>
                    <th style={{ textAlign: 'center', padding: '8px 0' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '8px 0' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((txn, i) => (
                    <tr
                      key={txn.id}
                      style={{
                        borderBottom: `0.5px solid ${colors.bgRaised}`,
                        fontSize: '12px',
                      }}
                    >
                      <td style={{
                        padding: '10px 0',
                        paddingRight: '16px',
                        color: colors.textPrimary,
                      }}>
                        {txn.id.slice(0, 8)}...
                      </td>
                      <td style={{
                        padding: '10px 0',
                        paddingRight: '16px',
                        color: colors.textSecondary,
                      }}>
                        {txn.phone_number || '--'}
                      </td>
                      <td style={{
                        padding: '10px 0',
                        paddingRight: '16px',
                        textAlign: 'right',
                        color: colors.gold,
                        fontWeight: 500,
                      }}>
                        {txn.amount_ksh.toLocaleString()} KES
                      </td>
                      <td style={{
                        padding: '10px 0',
                        paddingRight: '16px',
                        textAlign: 'right',
                        color: colors.red,
                      }}>
                        {txn.platform_fee_ksh.toLocaleString()} KES
                      </td>
                      <td style={{
                        padding: '10px 0',
                        paddingRight: '16px',
                        textAlign: 'right',
                        color: colors.green,
                        fontWeight: 500,
                      }}>
                        {txn.isp_earnings_ksh.toLocaleString()} KES
                      </td>
                      <td style={{
                        padding: '10px 0',
                        paddingRight: '16px',
                        color: colors.textMuted,
                        fontSize: '11px',
                      }}>
                        {txn.mpesa_receipt?.slice(0, 6) || '--'}
                      </td>
                      <td style={{
                        padding: '10px 0',
                        paddingRight: '16px',
                        textAlign: 'center',
                      }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '9px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: txn.status === 'completed' ? `${colors.green}15` : `${colors.amber}15`,
                          color: txn.status === 'completed' ? colors.green : colors.amber,
                          border: `0.5px solid ${txn.status === 'completed' ? `${colors.green}30` : `${colors.amber}30`}`,
                        }}>
                          {txn.status}
                        </div>
                      </td>
                      <td style={{
                        padding: '10px 0',
                        color: colors.textSecondary,
                        fontSize: '11px',
                      }}>
                        {new Date(txn.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}