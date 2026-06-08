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
        setTotal(invoiceList.reduce((s, i) => s + (i.amount_ksh || 0), 0));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const isAdminView = true;

  const colors = {
    bg: '#000000',
    panel: '#0a0a0a',
    border: '#141414',
    text: '#f5f5f5',
    muted: '#6b6b6b',
    gold: '#E8B84B',
    green: '#22c55e',
    amber: '#f59e0b',
  };

  return (
    <div style={{ background: colors.bg, color: colors.text, minHeight: '100vh' }}>

      {/* TOP BAR */}
      <div style={{
        height: 56,
        borderBottom: `0.5px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        background: 'linear-gradient(180deg, #0a0a0a, #000)'
      }}>
        <div style={{
          fontSize: 14,
          letterSpacing: '0.2em',
          fontWeight: 700,
          fontFamily: 'DM Mono, monospace',
          color: colors.gold
        }}>
          REVENUE INTELLIGENCE
        </div>

        <div style={{
          fontSize: 10,
          fontFamily: 'DM Mono, monospace',
          color: colors.muted
        }}>
          LIVE LEDGER STREAM
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: 28, maxWidth: 1200, margin: '0 auto' }}>

        {/* TOTAL CARD */}
        <div style={{
          background: colors.panel,
          border: `0.5px solid ${colors.border}`,
          borderTop: `2px solid ${colors.gold}`,
          borderRadius: 12,
          padding: 22,
          marginBottom: 26,
          boxShadow: '0 0 30px rgba(232,184,75,0.06)'
        }}>
          <div style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            fontFamily: 'DM Mono, monospace',
            color: colors.muted,
            marginBottom: 10
          }}>
            TOTAL REVENUE
          </div>

          <div style={{
            fontSize: 44,
            fontFamily: 'DM Mono, monospace',
            fontWeight: 600,
            color: colors.gold,
            letterSpacing: '-0.03em'
          }}>
            {total.toLocaleString()} <span style={{ fontSize: 14, color: colors.muted }}>KES</span>
          </div>
        </div>

        {/* TABLE WRAPPER */}
        <div style={{
          background: colors.panel,
          border: `0.5px solid ${colors.border}`,
          borderRadius: 12,
          overflow: 'hidden'
        }}>

          {/* HEADER */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr',
            padding: '14px 18px',
            borderBottom: `0.5px solid ${colors.border}`,
            fontSize: 10,
            fontFamily: 'DM Mono, monospace',
            letterSpacing: '0.16em',
            color: colors.muted
          }}>
            <div>INVOICE</div>
            <div>AMOUNT</div>
            <div>DUE</div>
            <div>STATUS</div>
          </div>

          {/* BODY */}
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: colors.muted }}>
              Loading ledger...
            </div>
          ) : invoices.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: colors.muted }}>
              No revenue records found
            </div>
          ) : (
            invoices.map((inv, i) => {
              const isPaid = inv.status === 'paid';

              return (
                <div
                  key={inv.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr',
                    padding: '14px 18px',
                    borderBottom: i === invoices.length - 1 ? 'none' : `0.5px solid ${colors.border}`,
                    alignItems: 'center',
                    transition: '0.2s',
                  }}
                >

                  <div style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 12,
                    color: colors.text
                  }}>
                    #{inv.id.slice(0, 8)}
                  </div>

                  <div style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 12,
                    color: isPaid ? colors.green : colors.gold,
                    fontWeight: 600
                  }}>
                    {inv.amount_ksh.toLocaleString()} KES
                  </div>

                  <div style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 11,
                    color: colors.muted
                  }}>
                    {new Date(inv.due_date).toLocaleDateString()}
                  </div>

                  <div>
                    <span style={{
                      fontSize: 10,
                      fontFamily: 'DM Mono, monospace',
                      letterSpacing: '0.12em',
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: `0.5px solid ${isPaid ? colors.green : colors.amber}`,
                      color: isPaid ? colors.green : colors.amber,
                      background: isPaid ? `${colors.green}12` : `${colors.amber}12`,
                      textTransform: 'uppercase'
                    }}>
                      {inv.status}
                    </span>
                  </div>

                </div>
              );
            })
          )}

        </div>
      </div>
    </div>
  );
}