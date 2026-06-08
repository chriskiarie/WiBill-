'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Invoice {
  id: string;
  tenant_id: string;
  amount_ksh: number;
  status: string;
  due_date: string;
  created_at: string;
}

export default function AdminRevenue() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('wb_token');
    if (!token) return;

    fetch(`${API}/api/invoices?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: { value?: Invoice[] }) => {
        const invoiceList = (data.value || []).slice(0, 20);
        setInvoices(invoiceList);
        setTotal(invoiceList.reduce((sum, inv) => sum + (inv.amount_ksh || 0), 0));
      })
      .catch((e: Error) => console.error('Failed to load invoices:', e))
      .finally(() => setLoading(false));
  }, []);

  const colors = {
    bgVoid: '#000000',
    cardBg: '#0a0a0a',
    border: '#141414',
    textPrimary: '#f0f0f0',
    textSecondary: '#666666',
    textMuted: '#2a2a2a',
    gold: '#E8B84B',
    green: '#22c55e',
    amber: '#f59e0b',
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
          REVENUE
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Summary Card */}
        <div style={{
          background: colors.cardBg,
          border: `0.5px solid ${colors.border}`,
          borderTop: `2px solid ${colors.gold}`,
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
            marginBottom: '12px',
          }}>
            Total Revenue
          </div>
          <div style={{
            fontSize: '40px',
            fontFamily: 'DM Mono, monospace',
            fontWeight: 500,
            color: colors.textPrimary,
            letterSpacing: '-0.04em',
          }}>
            {total.toLocaleString()} KES
          </div>
        </div>

        {/* Invoices Table */}
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
            All Invoices
          </div>

          {loading ? (
            <div style={{ color: colors.textMuted, textAlign: 'center', padding: '40px' }}>
              Loading...
            </div>
          ) : invoices.length === 0 ? (
            <div style={{ color: colors.textMuted, textAlign: 'center', padding: '40px' }}>
              No invoices yet
            </div>
          ) : (
            <div style={{ fontSize: '13px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 120px 120px 100px',
                gap: '16px',
                padding: '12px 0',
                borderBottom: `0.5px solid #0d0d0d`,
                marginBottom: '8px',
              }}>
                <div style={{
                  fontSize: '10px',
                  fontFamily: 'DM Mono, monospace',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: colors.textMuted,
                }}>
                  Invoice ID
                </div>
                <div style={{
                  fontSize: '10px',
                  fontFamily: 'DM Mono, monospace',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: colors.textMuted,
                }}>
                  Amount
                </div>
                <div style={{
                  fontSize: '10px',
                  fontFamily: 'DM Mono, monospace',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: colors.textMuted,
                }}>
                  Due Date
                </div>
                <div style={{
                  fontSize: '10px',
                  fontFamily: 'DM Mono, monospace',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: colors.textMuted,
                }}>
                  Status
                </div>
              </div>

              {invoices.map((inv, i) => (
                <div
                  key={inv.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px 120px 100px',
                    gap: '16px',
                    padding: '12px 0',
                    borderBottom: i < invoices.length - 1 ? `0.5px solid #0d0d0d` : 'none',
                    alignItems: 'center',
                  }}
                >
                  <div style={{
                    fontFamily: 'DM Mono, monospace',
                    color: colors.textPrimary,
                    fontSize: '12px',
                  }}>
                    {inv.id.slice(0, 8)}...
                  </div>
                  <div style={{
                    fontFamily: 'DM Mono, monospace',
                    color: colors.textPrimary,
                    fontSize: '12px',
                    fontWeight: 500,
                  }}>
                    {inv.amount_ksh?.toLocaleString() || '--'} KES
                  </div>
                  <div style={{
                    fontFamily: 'DM Mono, monospace',
                    color: colors.textSecondary,
                    fontSize: '12px',
                  }}>
                    {new Date(inv.due_date).toLocaleDateString()}
                  </div>
                  <div style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '9px',
                    fontFamily: 'DM Mono, monospace',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: inv.status === 'paid' ? `${colors.green}15` : `${colors.amber}15`,
                    color: inv.status === 'paid' ? colors.green : colors.amber,
                    border: `0.5px solid ${inv.status === 'paid' ? `${colors.green}30` : `${colors.amber}30`}`,
                    width: 'fit-content',
                  }}>
                    {inv.status}
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