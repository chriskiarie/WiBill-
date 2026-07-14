'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const POLL_MS = 8000;

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

const C = {
  black: '#000', card: '#0D0D0B', line: '#1A1A18', border: '#2A2A27',
  text: '#EDEBE6', dim: '#8C8A84', mute: '#6B6964', faint: '#3A3A37',
  gold: '#E8B84B', green: '#6FCF73', red: '#E5707A',
};

const fmt = (n: number) => {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}k`;
  return `KES ${n.toFixed(0)}`;
};

const timeAgo = (dateStr: string) => {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const sec = Math.floor((now - then) / 1000);
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
};

export default function AdminTransactions() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [liveSince, setLiveSince] = useState(Date.now());
  const [todayCount, setTodayCount] = useState(0);
  const [todayVolume, setTodayVolume] = useState(0);
  const prevTotalRef = useRef(0);
  const [animatingTotal, setAnimatingTotal] = useState(0);

  const fetchTxns = useCallback(async () => {
    const token = localStorage.getItem('wb_token');
    if (!token) return;
    setRefreshing(true);
    try {
      const res = await fetch(`${API}/api/mpesa/admin/transactions?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list: Transaction[] = Array.isArray(data) ? data : [];
      setTxns(prev => {
        if (prev.length > 0) {
          const existingIds = new Set(prev.map(t => t.id));
          const arrived: string[] = [];
          for (const t of list) {
            if (!existingIds.has(t.id)) arrived.push(t.id);
          }
          if (arrived.length > 0) {
            setNewIds(new Set(arrived));
            setTimeout(() => setNewIds(new Set()), 3000);
          }
        }
        return list;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchTxns(); const iv = setInterval(fetchTxns, POLL_MS); return () => clearInterval(iv); }, [fetchTxns]);

  // Animate total volume
  const totalVolume = txns.reduce((s, t) => s + (t.amount_ksh || 0), 0);
  useEffect(() => {
    const start = prevTotalRef.current;
    const end = totalVolume;
    if (start === end) return;
    const dur = 600;
    const t0 = performance.now();
    const tick = () => {
      const pct = Math.min((performance.now() - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - pct, 3);
      setAnimatingTotal(start + (end - start) * eased);
      if (pct < 1) requestAnimationFrame(tick);
    };
    prevTotalRef.current = end;
    requestAnimationFrame(tick);
  }, [totalVolume]);

  // Today's stats
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTxns = txns.filter(t => t.created_at && new Date(t.created_at) >= today);
    setTodayCount(todayTxns.length);
    setTodayVolume(todayTxns.reduce((s, t) => s + (t.amount_ksh || 0), 0));
  }, [txns]);

  const txnCount = txns.length;
  const completedCount = txns.filter(t => !t.status || t.status === 'completed').length;
  const pendingCount = txns.filter(t => t.status === 'pending').length;
  const failedCount = txns.filter(t => t.status === 'failed').length;
  const successRate = txnCount > 0 ? ((completedCount / txnCount) * 100).toFixed(1) : '0';
  const avgTxnSize = txnCount > 0 ? totalVolume / txnCount : 0;

  const statusBreakdown = [
    { label: 'Completed', count: completedCount, color: C.green, percent: txnCount > 0 ? (completedCount / txnCount) * 100 : 0 },
    { label: 'Pending', count: pendingCount, color: C.gold, percent: txnCount > 0 ? (pendingCount / txnCount) * 100 : 0 },
    { label: 'Failed', count: failedCount, color: C.red, percent: txnCount > 0 ? (failedCount / txnCount) * 100 : 0 },
  ];

  const filtered = txns
    .filter(t => {
      if (!search) return true;
      const q = search.toLowerCase();
      return t.phone_number?.toLowerCase().includes(q) || t.mpesa_receipt?.toLowerCase().includes(q);
    })
    .filter(t => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'completed') return !t.status || t.status === 'completed';
      if (statusFilter === 'pending') return t.status === 'pending';
      if (statusFilter === 'failed') return t.status === 'failed';
      return true;
    });

  const skel = (w: string, h: number, d = 0, r = 6) => ({
    width: w, height: h, background: C.mute, borderRadius: r,
    animation: 'skel-pulse 2s ease-in-out infinite',
    animationDelay: `${d}s`,
  });

  if (loading && txns.length === 0) {
    return (
      <div style={{ background: C.black, color: C.text, padding: 'var(--space-lg)', width: '100%', minHeight: '100%' }}>
        <style>{`@keyframes skel-pulse { 0%,100% { opacity: 0.2; } 50% { opacity: 0.5; } }`}</style>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: C.text }}>
            Transactions
          </h1>
        </div>
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 16, padding: 28, marginBottom: 24 }}>
          <div style={skel('100px', 10, 0.1)} />
          <div style={{ ...skel('200px', 48, 0.15), marginTop: 8, marginBottom: 8 }} />
          <div style={skel('140px', 12, 0.2)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[0.1, 0.2, 0.3, 0.4].map(d => (
            <div key={d} style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={skel('60%', 10, d)} />
              <div style={{ ...skel('40%', 28, d + 0.05), marginTop: 8, marginBottom: 4 }} />
              <div style={skel('50%', 11, d + 0.1)} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[0.2, 0.4].map((d, col) => (
            <div key={col} style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={skel('120px', 14, d)} />
              {[1, 2, 3].map(r => (
                <div key={r} style={{ marginTop: r === 1 ? 16 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid #0d0d0d' }}>
                    <div style={skel('100px', 12, d + r * 0.05)} />
                    <div style={skel('60px', 12, d + r * 0.08)} />
                  </div>
                  <div style={{ ...skel('140px', 6, d + r * 0.1, 4), marginTop: 6 }} />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={skel('160px', 14, 0.3, 6)} />
          <div style={{ ...skel('260px', 12, 0.35, 6), marginTop: 16, marginBottom: 16 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8, padding: '12px 0', borderBottom: `0.5px solid ${C.border}` }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} style={skel('100%', 10, 0.3 + i * 0.03)} />)}
          </div>
          {[1, 2, 3, 4, 5].map(r => (
            <div key={r} style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8, padding: '10px 0', borderBottom: `0.5px solid ${C.border}` }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} style={skel('100%', 10, 0.3 + r * 0.04 + i * 0.02)} />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.black, color: C.text, fontFamily: 'Inter, -apple-system, sans-serif', padding: 'var(--space-lg)', width: '100%', minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
        <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: C.text }}>
          Transactions
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={fetchTxns} disabled={refreshing} title="Refresh transactions" style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `0.5px solid ${C.border}`, background: C.card, cursor: refreshing ? 'not-allowed' : 'pointer', color: C.dim,
            animation: refreshing ? 'spin 1s linear infinite' : 'none',
          }}>
            <RefreshCw size={13} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 20, padding: '6px 14px 6px 10px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}`, animation: 'pulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 11, fontFamily: '"DM Mono", monospace', color: C.green, fontWeight: 600 }}>LIVE</span>
            <span style={{ fontSize: 10, color: C.dim, fontFamily: '"DM Mono", monospace' }}>
              every {POLL_MS / 1000}s
            </span>
          </div>
        </div>
      </div>

      {/* HERO: TODAY'S VOLUME */}
      <div style={{
        background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 16, padding: 28, marginBottom: 24,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.gold }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mute, marginBottom: 8 }}>
              Today's Volume
            </div>
            <div style={{ fontSize: 48, fontWeight: 500, color: C.gold, fontFamily: '"DM Mono", monospace', lineHeight: 1 }}>
              {fmt(todayVolume)}
            </div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 8, fontFamily: '"DM Mono", monospace' }}>
              {todayCount} transactions today
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mute, marginBottom: 8 }}>
              All-Time Volume
            </div>
            <div style={{ fontSize: 40, fontWeight: 500, color: C.text, fontFamily: '"DM Mono", monospace', lineHeight: 1 }}>
              {fmt(animatingTotal)}
            </div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 8, fontFamily: '"DM Mono", monospace' }}>
              {txnCount} total transactions
            </div>
          </div>
        </div>
      </div>

      {/* STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Transactions', value: txnCount.toLocaleString(), sub: 'all time', accent: C.text },
          { label: 'Success Rate', value: `${successRate}%`, sub: `${completedCount} completed`, accent: C.green },
          { label: 'Pending', value: pendingCount.toString(), sub: 'awaiting confirmation', accent: C.gold },
          { label: 'Avg Size', value: fmt(avgTxnSize), sub: 'per transaction', accent: C.gold },
        ].map((card, i) => (
          <div key={i} style={{
            background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 20, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: card.accent }} />
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mute, marginBottom: 8 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 500, color: card.accent, fontFamily: '"DM Mono", monospace', marginBottom: 4 }}>
              {card.value}
            </div>
            <div style={{ fontSize: 11, color: C.dim, fontFamily: '"DM Mono", monospace' }}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* STATUS + TOP PHONES + LIVE FEED */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        {/* STATUS BREAKDOWN */}
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif' }}>
            Payment Status
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {statusBreakdown.map((s, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.dim }}>{s.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: s.color, fontFamily: '"DM Mono", monospace' }}>
                    {s.count} ({s.percent.toFixed(1)}%)
                  </div>
                </div>
                <div style={{ height: 8, background: C.line, borderRadius: 4, overflow: 'hidden', border: `0.5px solid ${C.border}` }}>
                  <div style={{ height: '100%', background: s.color, width: `${s.percent}%`, transition: 'width 0.3s ease' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
            {(['all', 'completed', 'pending', 'failed'] as const).map(f => (
              <button key={f} onClick={() => setStatusFilter(f)} style={{
                padding: '8px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
                background: statusFilter === f ? C.border : C.line,
                border: `0.5px solid ${statusFilter === f ? C.gold : C.border}`,
                color: statusFilter === f ? C.gold : C.dim,
                fontFamily: 'inherit', transition: 'all 0.2s',
              }}>
                {f === 'all' ? 'All' : f === 'completed' ? 'Completed' : f === 'pending' ? 'Pending' : 'Failed'}
              </button>
            ))}
          </div>
        </div>

        {/* LIVE FEED */}
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 20, position: 'relative' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif' }}>
            Recent Activity
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
            {txns.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: C.mute, fontSize: 12 }}>
                No transactions yet
              </div>
            ) : (
              txns.slice(0, 15).map((t, i) => {
                const isNew = newIds.has(t.id);
                const st = !t.status || t.status === 'completed' ? 'completed' : t.status === 'pending' ? 'pending' : 'failed';
                const sc = st === 'completed' ? C.green : st === 'pending' ? C.gold : C.red;
                return (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8,
                    background: isNew ? `${C.gold}10` : i % 2 === 0 ? C.line : 'transparent',
                    border: `0.5px solid ${isNew ? `${C.gold}30` : 'transparent'}`,
                    transition: 'all 0.3s',
                    animation: isNew ? 'slideIn 0.3s ease-out' : 'none',
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: '"DM Mono", monospace' }}>
                          {fmt(t.amount_ksh || 0)}
                        </span>
                        <span style={{ fontSize: 10, color: sc, fontFamily: '"DM Mono", monospace', fontWeight: 700 }}>
                          {st === 'completed' ? '✓' : st === 'pending' ? '⏳' : '✕'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                        <span style={{ fontSize: 10, color: C.dim, fontFamily: '"DM Mono", monospace' }}>
                          {t.phone_number ? `***${t.phone_number.slice(-4)}` : '—'}
                        </span>
                        <span style={{ fontSize: 10, color: C.mute, fontFamily: '"DM Mono", monospace' }}>
                          {t.created_at ? timeAgo(t.created_at) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <input type="text" placeholder="Search by phone number or M-Pesa receipt..." value={search} onChange={e => setSearch(e.target.value)} style={{
          width: '100%', background: C.line, border: `0.5px solid ${C.border}`, borderRadius: 8,
          padding: '10px 14px', fontSize: 12, color: C.text, outline: 'none', boxSizing: 'border-box',
          fontFamily: '"DM Mono", monospace',
        }} />
        <div style={{ fontSize: 11, color: C.mute, fontFamily: '"DM Mono", monospace', marginTop: 8 }}>
          Showing {filtered.length} of {txns.length} transactions
        </div>
      </div>

      {/* TRANSACTIONS TABLE */}
      <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif' }}>
          Transaction History
        </h2>

        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.mute, fontSize: 12 }}>
            No transactions found
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: '"DM Mono", monospace' }}>
              <thead>
                <tr style={{ borderBottom: `0.5px solid ${C.border}` }}>
                  <th style={{ textAlign: 'left', padding: '12px 0', color: C.mute, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '12px 0', color: C.mute, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>Phone</th>
                  <th style={{ textAlign: 'right', padding: '12px 0', color: C.mute, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>Amount</th>
                  <th style={{ textAlign: 'right', padding: '12px 0', color: C.mute, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>Fee</th>
                  <th style={{ textAlign: 'right', padding: '12px 0', color: C.mute, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>ISP</th>
                  <th style={{ textAlign: 'center', padding: '12px 0', color: C.mute, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '12px 0', color: C.mute, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>Receipt</th>
                  <th style={{ textAlign: 'left', padding: '12px 0', color: C.mute, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((txn, idx) => {
                  const isNew = newIds.has(txn.id);
                  const st = !txn.status || txn.status === 'completed' ? 'completed' : txn.status === 'pending' ? 'pending' : 'failed';
                  const sc = st === 'completed' ? C.green : st === 'pending' ? C.gold : C.red;
                  return (
                    <tr key={txn.id} style={{
                      borderBottom: `0.5px solid ${C.border}`,
                      background: isNew ? `${C.gold}08` : idx % 2 === 0 ? C.line : 'transparent',
                      animation: isNew ? 'slideIn 0.3s ease-out' : 'none',
                    }}>
                      <td style={{ padding: '12px 0', color: C.dim }}>{txn.id.slice(0, 8)}...</td>
                      <td style={{ padding: '12px 0', color: C.text }}>{txn.phone_number || '—'}</td>
                      <td style={{ padding: '12px 0', color: C.gold, textAlign: 'right', fontWeight: 600 }}>{fmt(txn.amount_ksh || 0)}</td>
                      <td style={{ padding: '12px 0', color: C.dim, textAlign: 'right' }}>{fmt(txn.platform_fee_ksh || 0)}</td>
                      <td style={{ padding: '12px 0', color: C.green, textAlign: 'right', fontWeight: 600 }}>{fmt(txn.isp_earnings_ksh || 0)}</td>
                      <td style={{ padding: '12px 0', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: `${sc}15`, color: sc, border: `0.5px solid ${sc}40` }}>
                          {st === 'completed' ? '✓' : st === 'pending' ? '⏳' : '✕'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 0', color: C.dim, fontSize: 11 }}>{txn.mpesa_receipt ? `${txn.mpesa_receipt.slice(0, 8)}...` : '—'}</td>
                      <td style={{ padding: '12px 0', color: C.dim, fontSize: 11 }}>
                        {txn.created_at ? new Date(txn.created_at).toLocaleDateString('en-KE') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <div style={{ padding: 16, textAlign: 'center', color: C.mute, fontSize: 11, borderTop: `0.5px solid ${C.border}`, marginTop: 16 }}>
                Showing 100 of {filtered.length} transactions
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
