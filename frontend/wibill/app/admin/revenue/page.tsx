'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const C = {
  void: '#000000', base: '#080808', raised: '#0d0d0d',
  border: '#141414', dim: '#1e1e1e',
  text: '#f0f0f0', muted: '#444444', secondary: '#666666',
  gold: '#E8B84B', green: '#22c55e', amber: '#f59e0b', red: '#ef4444', blue: '#3b82f6',
};

interface Invoice {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  amount_ksh: number;
  platform_fee_ksh?: number;
  status: string;
  due_date: string;
  created_at: string;
}

interface BillingReport {
  total_revenue: number;
  total_platform_fees: number;
  total_isp_earnings: number;
  paid_count: number;
  pending_count: number;
  overdue_count: number;
}

const lbl = (t: string) => (
  <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: C.muted, marginBottom: 12 }}>
    {t}
  </div>
);

const fmtKES = (n: number) => `${n.toLocaleString()} KES`;

const statusBadge = (status: string) => {
  const map: Record<string, string> = { paid: C.green, pending: C.amber, overdue: C.red };
  const color = map[status] || C.muted;
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 9, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase' as const, background: `${color}15`, color, border: `0.5px solid ${color}30` }}>
      {status}
    </span>
  );
};

export default function AdminRevenue() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [report, setReport] = useState<BillingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');

  useEffect(() => {
    const token = localStorage.getItem('wb_token');
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };

    Promise.allSettled([
      fetch(`${API}/api/invoices?limit=100`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/invoices/admin/billing-report`, { headers: h }).then(r => r.json()),
    ]).then(([invRes, repRes]) => {
      if (invRes.status === 'fulfilled') {
        const list = Array.isArray(invRes.value) ? invRes.value : Array.isArray(invRes.value?.value) ? invRes.value.value : [];
        setInvoices(list);
        // Derive report from invoices if endpoint not available
        if (repRes.status !== 'fulfilled' || !repRes.value?.total_revenue) {
          const paid = list.filter((i: Invoice) => i.status === 'paid');
          const pending = list.filter((i: Invoice) => i.status === 'pending');
          const overdue = list.filter((i: Invoice) => i.status === 'overdue');
          setReport({
            total_revenue: list.reduce((s: number, i: Invoice) => s + (i.amount_ksh || 0), 0),
            total_platform_fees: list.reduce((s: number, i: Invoice) => s + (i.platform_fee_ksh || 0), 0),
            total_isp_earnings: 0,
            paid_count: paid.length,
            pending_count: pending.length,
            overdue_count: overdue.length,
          });
        }
      }
      if (repRes.status === 'fulfilled' && repRes.value?.total_revenue) {
        setReport(repRes.value);
      }
      setLoading(false);
    });
  }, []);

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter);

  const statCard = (label: string, value: string, accent: string, sub?: string) => (
    <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderTop: `2px solid ${accent}`, borderRadius: 10, padding: 24 }}>
      <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: C.muted, marginBottom: 12 }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontFamily: 'DM Mono, monospace', fontWeight: 500, color: accent, letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.muted, marginTop: 6 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ background: C.void, color: C.text, minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* TOPBAR */}
      <div style={{ height: 52, borderBottom: `0.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
        <div style={{ fontSize: 18, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase' as const }}>
          Revenue
        </div>
        <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.muted }}>
          {invoices.length} invoices total
        </span>
      </div>

      <div style={{ padding: 28, maxWidth: 1400, margin: '0 auto' }}>

        {/* STAT CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {statCard('Total Revenue', report ? fmtKES(report.total_revenue) : '--', C.gold)}
          {statCard('Platform Fees', report ? fmtKES(report.total_platform_fees) : '--', C.blue)}
          {statCard('Paid Invoices', report ? String(report.paid_count) : '--', C.green, 'invoices')}
          {statCard('Pending / Overdue', report ? `${report.pending_count} / ${report.overdue_count}` : '--', C.amber, 'invoices')}
        </div>

        {/* INVOICES TABLE */}
        <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            {lbl('All Invoices')}
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'paid', 'pending', 'overdue'] as const).map(f => (
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
            <div style={{ color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace', padding: '40px 0', textAlign: 'center' }}>No invoices</div>
          ) : (
            <div>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 140px 140px 100px', gap: 16, paddingBottom: 10, borderBottom: `0.5px solid ${C.dim}` }}>
                {['Invoice ID', 'Tenant', 'Amount', 'Due Date', 'Status'].map(h => (
                  <div key={h} style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: C.muted }}>{h}</div>
                ))}
              </div>
              {filtered.map((inv, i) => (
                <div
                  key={inv.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '140px 1fr 140px 140px 100px',
                    gap: 16, padding: '14px 0',
                    borderBottom: i < filtered.length - 1 ? `0.5px solid ${C.dim}` : 'none',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.muted }}>{inv.id.slice(0, 8)}…</div>
                  <div style={{ fontSize: 13, color: C.text }}>{inv.tenant_name || inv.tenant_id?.slice(0, 12) + '…' || '--'}</div>
                  <div style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', color: C.gold, fontWeight: 500 }}>{fmtKES(inv.amount_ksh || 0)}</div>
                  <div style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: C.secondary }}>
                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: '2-digit' }) : '--'}
                  </div>
                  {statusBadge(inv.status)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
