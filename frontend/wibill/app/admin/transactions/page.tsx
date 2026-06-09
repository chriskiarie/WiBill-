'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const C = {
  void: '#000000', base: '#080808', raised: '#0d0d0d',
  border: '#141414', dim: '#1e1e1e',
  text: '#f0f0f0', muted: '#444444', secondary: '#666666',
  gold: '#E8B84B', green: '#22c55e', amber: '#f59e0b', red: '#ef4444',
};

interface Transaction {
  id: string;
  amount_ksh: number;
  platform_fee_ksh: number;
  isp_earnings_ksh: number;
  status: string;
  mpesa_receipt?: string;
  created_at: string;
  phone_number?: string;
  tenant_id?: string;
}

const lbl = (t: string) => (
  <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: C.muted, marginBottom: 12 }}>
    {t}
  </div>
);

const statusBadge = (status: string) => {
  const color = status === 'completed' ? C.green : status === 'failed' ? C.red : C.amber;
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 9, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase' as const, background: `${color}15`, color, border: `0.5px solid ${color}30` }}>
      {status}
    </span>
  );
};

export default function AdminTransactions() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [totals, setTotals] = useState({ volume: 0, fees: 0, isp: 0, count: 0 });

  useEffect(() => {
    const token = localStorage.getItem('wb_token');
    if (!token) return;

    fetch(`${API}/api/transactions?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        const list: Transaction[] = Array.isArray(data) ? data : Array.isArray(data?.value) ? data.value : [];
        setTxns(list);
        setTotals({
          volume: list.reduce((s, t) => s + (t.amount_ksh || 0), 0),
          fees: list.reduce((s, t) => s + (t.platform_fee_ksh || 0), 0),
          isp: list.reduce((s, t) => s + (t.isp_earnings_ksh || 0), 0),
          count: list.length,
        });
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? txns : txns.filter(t => t.status === filter);

  const statCard = (label: string, value: string, accent: string) => (
    <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderTop: `2px solid ${accent}`, borderRadius: 10, padding: 24 }}>
      <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: C.muted, marginBottom: 12 }}>
        {label}
      </div>
      <div style={{ fontSize: 30, fontFamily: 'DM Mono, monospace', fontWeight: 500, color: accent, letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );

  return (
    <div style={{ background: C.void, color: C.text, minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* TOPBAR */}
      <div style={{ height: 52, borderBottom: `0.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
        <div style={{ fontSize: 18, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase' as const }}>
          Transactions
        </div>
        <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.muted }}>
          {totals.count} total
        </span>
      </div>

      <div style={{ padding: 28, maxWidth: 1440, margin: '0 auto' }}>

        {/* STAT CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {statCard('Total Volume', `${(totals.volume / 1000).toFixed(1)}K KES`, C.gold)}
          {statCard('Platform Fees', `${(totals.fees / 1000).toFixed(1)}K KES`, C.red)}
          {statCard('ISP Earnings', `${(totals.isp / 1000).toFixed(1)}K KES`, C.green)}
          {statCard('Transactions', String(totals.count), C.amber)}
        </div>

        {/* TABLE */}
        <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            {lbl('All Transactions')}
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'completed', 'pending', 'failed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    background: filter === f ? `${C.gold}15` : 'none',
                    border: `0.5px solid ${filter === f ? `${C.gold}40` : C.border}`,
                    borderRadius: 6, padding: '5px 12px',
                    color: filter === f ? C.gold : C.muted,
                    fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 700,
                    textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace', padding: '40px 0', textAlign: 'center' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace', padding: '40px 0', textAlign: 'center' }}>No transactions</div>
          ) : (
            <div style={{ overflowX: 'auto' as const }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 130px 130px 130px 130px 120px 100px 110px', gap: 12, paddingBottom: 10, borderBottom: `0.5px solid ${C.dim}`, minWidth: 900 }}>
                {['ID', 'Phone', 'Amount', 'Fee', 'ISP Earnings', 'Receipt', 'Status', 'Date'].map(h => (
                  <div key={h} style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: C.muted }}>{h}</div>
                ))}
              </div>

              {filtered.map((txn, i) => (
                <div
                  key={txn.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '120px 130px 130px 130px 130px 120px 100px 110px',
                    gap: 12, padding: '13px 0',
                    borderBottom: i < filtered.length - 1 ? `0.5px solid ${C.dim}` : 'none',
                    alignItems: 'center', minWidth: 900,
                  }}
                >
                  <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.muted }}>{txn.id.slice(0, 8)}…</div>
                  <div style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: C.secondary }}>{txn.phone_number || '--'}</div>
                  <div style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', color: C.gold, fontWeight: 600 }}>
                    {(txn.amount_ksh || 0).toLocaleString()} KES
                  </div>
                  <div style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: C.red }}>
                    {(txn.platform_fee_ksh || 0).toLocaleString()} KES
                  </div>
                  <div style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: C.green }}>
                    {(txn.isp_earnings_ksh || 0).toLocaleString()} KES
                  </div>
                  <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.muted }}>
                    {txn.mpesa_receipt || '--'}
                  </div>
                  {statusBadge(txn.status)}
                  <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.secondary }}>
                    {new Date(txn.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
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
