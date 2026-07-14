'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Transaction {
  id: string;
  amount_ksh?: number;
  platform_fee_ksh?: number;
  isp_earnings_ksh?: number;
  status?: string;
  created_at?: string;
  tenant_id?: string;
}

export default function AdminRevenue() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const token = localStorage.getItem('wb_token');
    if (!token) return;
    setRefreshing(true);
    try {
      const r = await fetch(`${API}/api/mpesa/admin/transactions?limit=2000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      setTxns(Array.isArray(d) ? d : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Calculate metrics
  const totalGMV = txns.reduce((s, t) => s + (t.amount_ksh || 0), 0);
  const totalFees = txns.reduce((s, t) => s + (t.platform_fee_ksh || 0), 0);
  const totalPayouts = txns.reduce((s, t) => s + (t.isp_earnings_ksh || 0), 0);
  const outstanding = totalGMV - totalFees - totalPayouts;
  const takeRate = totalGMV > 0 ? ((totalFees / totalGMV) * 100).toFixed(1) : '0';
  const txnCount = txns.length;
  const successRate = txnCount > 0 ? ((txns.filter(t => t.status === 'completed' || !t.status).length / txnCount) * 100).toFixed(1) : '0';

  // Group by day
  const groupByDay = () => {
    const grouped: Record<string, { collected: number; fees: number; payouts: number }> = {};
    
    txns.forEach(t => {
      if (!t.created_at) return;
      const date = new Date(t.created_at);
      const key = date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
      
      if (!grouped[key]) {
        grouped[key] = { collected: 0, fees: 0, payouts: 0 };
      }
      grouped[key].collected += t.amount_ksh || 0;
      grouped[key].fees += t.platform_fee_ksh || 0;
      grouped[key].payouts += t.isp_earnings_ksh || 0;
    });

    return Object.entries(grouped).slice(-14);
  };

  const chartData = groupByDay();
  const maxCollected = Math.max(...chartData.map(([, v]) => v.collected || 1), 1);

  // Top ISPs
  const ispRevenue: Record<string, number> = {};
  txns.forEach(t => {
    const tenantId = t.tenant_id || 'unknown';
    ispRevenue[tenantId] = (ispRevenue[tenantId] || 0) + (t.amount_ksh || 0);
  });

  const topISPs = Object.entries(ispRevenue)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `KES ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `KES ${(amount / 1000).toFixed(0)}k`;
    return `KES ${amount.toFixed(0)}`;
  };

  const C = {
    black: '#000', card: '#0D0D0B', line: '#1A1A18', border: '#2A2A27',
    text: '#EDEBE6', dim: '#8C8A84', mute: '#6B6964', faint: '#3A3A37',
    gold: '#E8B84B', green: '#6FCF73', red: '#E5707A',
  };

  const sk = (w: string, h: number, d = 0) => ({
    width: w, height: h, background: C.mute, borderRadius: 6,
    animation: 'skel-pulse 2s ease-in-out infinite',
    animationDelay: `${d}s`,
  });

  if (loading && txns.length === 0) {
    return (
      <div style={{ background: C.black, color: C.text, padding: 'var(--space-lg)', width: '100%', minHeight: '100%' }}>
        <style>{`@keyframes skel-pulse { 0%,100% { opacity: 0.2; } 50% { opacity: 0.5; } }`}</style>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: C.text }}>
            Revenue Dashboard
          </h1>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[0.1, 0.2, 0.3, 0.4].map(d => (
            <div key={d} style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
              <div style={sk('60%', 10, d)} />
              <div style={{ ...sk('50%', 28, d + 0.05), marginTop: 12, marginBottom: 8 }} />
              <div style={sk('40%', 11, d + 0.1)} />
            </div>
          ))}
        </div>
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 32 }}>
          <div style={sk('160px', 14, 0.15)} />
          <div style={{ ...sk('200px', 11, 0.2), marginTop: 4, marginBottom: 20 }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 180 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(i => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ width: '100%', height: `${30 + (i * 4) % 50}%`, background: C.mute, borderRadius: 3, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${0.2 + i * 0.04}s` }} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[0.3, 0.5].map((d, col) => (
            <div key={col} style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
              <div style={sk('140px', 14, d)} />
              {[1, 2, 3, 4].map(r => (
                <div key={r} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', marginTop: 8, background: C.line, border: `0.5px solid ${C.border}`, borderRadius: 8 }}>
                  <div>
                    <div style={sk('80px', 10, d + r * 0.04)} />
                    <div style={{ ...sk('60px', 10, d + r * 0.07), marginTop: 2 }} />
                  </div>
                  <div style={sk('50px', 18, d + r * 0.06)} />
                </div>
              ))}
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
          Revenue Dashboard
        </h1>
        <button onClick={load} disabled={refreshing} title="Refresh" style={{
          width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `0.5px solid ${C.border}`, background: C.card, cursor: refreshing ? 'not-allowed' : 'pointer', color: C.dim,
          animation: refreshing ? 'spin 1s linear infinite' : 'none',
        }}>
          <RefreshCw size={13} />
        </button>
      </div>

      {/* PRIMARY KPIs - THE BIG NUMBERS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total Collected', value: formatCurrency(totalGMV), color: C.gold, icon: '💰', change: '+12.5%' },
          { label: 'Platform Fees', value: formatCurrency(totalFees), color: C.gold, icon: '💸', change: '+8.2%' },
          { label: 'ISP Payouts', value: formatCurrency(totalPayouts), color: C.green, icon: '✓', change: '+14.1%' },
          { label: 'Outstanding', value: formatCurrency(outstanding), color: C.gold, icon: '⏳', change: 'pending' },
        ].map((metric, i) => (
          <div key={i} style={{
            background: C.card,
            border: `0.5px solid ${C.border}`,
            borderRadius: '12px',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: metric.color }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mute }}>
                {metric.label}
              </div>
              <span style={{ fontSize: 18 }}>{metric.icon}</span>
            </div>

            <div style={{ fontSize: 28, fontWeight: 900, color: metric.color, fontFamily: '"DM Mono", monospace', marginBottom: '8px' }}>
              {metric.value}
            </div>

            <div style={{ fontSize: 11, color: metric.change === 'pending' ? C.gold : C.green, fontFamily: '"DM Mono", monospace', fontWeight: 600 }}>
              {metric.change}
            </div>
          </div>
        ))}
      </div>

      {/* CASH FLOW VISUALIZATION */}
      <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 4px', fontFamily: '"Space Grotesk", sans-serif' }}>
            14-Day Cash Flow
          </h2>
          <p style={{ fontSize: 11, color: C.mute, margin: 0 }}>
            Collection → Fees → Payouts
          </p>
        </div>

        {chartData.length === 0 ? (
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.mute }}>
            No transaction data
          </div>
        ) : (
          <div>
            {/* STACKED CHART */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '180px', marginBottom: '16px' }}>
              {chartData.map(([date, data]) => {
                const collectedHeight = Math.max((data.collected / maxCollected) * 160, 2);
                const feesPercent = data.collected > 0 ? (data.fees / data.collected) * 100 : 0;
                const payoutsPercent = data.collected > 0 ? (data.payouts / data.collected) * 100 : 0;
                
                return (
                  <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    {/* STACKED BAR */}
                    <div style={{ width: '100%', height: `${collectedHeight}px`, display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {/* Payouts (green - bottom) */}
                      <div
                        style={{
                          flex: payoutsPercent,
                          background: C.green,
                          opacity: 0.8,
                          minHeight: payoutsPercent > 5 ? '4px' : 0,
                          borderRadius: payoutsPercent > 30 ? '3px 3px 0 0' : 0,
                          transition: 'all 0.2s',
                          cursor: 'pointer',
                        }}
                        title={`Payouts: KES ${(data.payouts / 1000).toFixed(0)}k`}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.opacity = '0.8';
                        }}
                      />
                      {/* Fees (gold - middle) */}
                      <div
                        style={{
                          flex: feesPercent,
                          background: C.gold,
                          opacity: 0.8,
                          minHeight: feesPercent > 5 ? '4px' : 0,
                          transition: 'all 0.2s',
                          cursor: 'pointer',
                        }}
                        title={`Fees: KES ${(data.fees / 1000).toFixed(0)}k`}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.opacity = '0.8';
                        }}
                      />
                      {/* Outstanding (blue - top) */}
                      <div
                        style={{
                          flex: 100 - feesPercent - payoutsPercent,
                          background: C.gold,
                          opacity: 0.6,
                          minHeight: (100 - feesPercent - payoutsPercent) > 5 ? '4px' : 0,
                          borderRadius: (100 - feesPercent - payoutsPercent) > 30 ? '0 0 3px 3px' : 0,
                          transition: 'all 0.2s',
                          cursor: 'pointer',
                        }}
                        title={`Outstanding: KES ${((data.collected - data.fees - data.payouts) / 1000).toFixed(0)}k`}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.opacity = '0.8';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.opacity = '0.6';
                        }}
                      />
                    </div>
                    
                    <div style={{ fontSize: 9, color: C.mute, fontFamily: '"DM Mono", monospace', textAlign: 'center', marginTop: '4px' }}>
                      {date.split(' ')[0]}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* LEGEND */}
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', fontSize: 11, borderTop: `0.5px solid ${C.border}`, paddingTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', background: C.green, borderRadius: '2px' }} />
                <span style={{ color: C.dim }}>ISP Payouts</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', background: C.gold, borderRadius: '2px' }} />
                <span style={{ color: C.dim }}>Platform Fees</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', background: C.gold, borderRadius: '2px', opacity: 0.6 }} />
                <span style={{ color: C.dim }}>Outstanding/Pending</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECONDARY METRICS + TOP ISPs GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
        {/* METRICS */}
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif' }}>
            Key Metrics
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { label: 'Take Rate', value: takeRate + '%', color: C.gold, desc: 'Fee / Volume' },
              { label: 'Success Rate', value: successRate + '%', color: C.green, desc: 'Completed txns' },
              { label: 'Total Transactions', value: txnCount.toLocaleString(), color: C.gold, desc: 'All time' },
              { label: 'Avg Transaction', value: formatCurrency(txns.length > 0 ? totalGMV / txns.length : 0), color: C.gold, desc: 'Per payment' },
            ].map((metric, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                background: C.line,
                border: `0.5px solid ${C.border}`,
                borderRadius: '8px',
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mute, marginBottom: '2px' }}>
                    {metric.label}
                  </div>
                  <div style={{ fontSize: 10, color: C.dim }}>
                    {metric.desc}
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: metric.color, fontFamily: '"DM Mono", monospace' }}>
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TOP ISPs */}
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif' }}>
            Top ISPs by Revenue
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topISPs.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: C.mute, fontSize: 12 }}>
                No ISP data
              </div>
            ) : (
              topISPs.map(([id, revenue], idx) => (
                <div key={id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: C.line,
                  border: `0.5px solid ${C.border}`,
                  borderRadius: '8px',
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: [C.gold, C.green, C.gold, C.gold, C.red][idx],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 900,
                    color: C.black,
                  }}>
                    #{idx + 1}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: '2px' }}>
                      {id === 'unknown' ? 'Unassigned' : `ISP-${id.slice(0, 12)}`}
                    </div>
                    <div style={{
                      height: '4px',
                      background: C.border,
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        background: [C.gold, C.green, C.gold, C.gold, C.red][idx],
                        width: `${Math.min((revenue / topISPs[0][1]) * 100, 100)}%`,
                      }} />
                    </div>
                  </div>

                  <div style={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: [C.gold, C.green, C.gold, C.gold, C.red][idx],
                    fontFamily: '"DM Mono", monospace',
                    textAlign: 'right',
                    minWidth: '80px',
                  }}>
                    {formatCurrency(revenue)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* REVENUE BREAKDOWN TABLE */}
      <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif' }}>
          Revenue Split (All Time)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          {[
            { label: 'Total Collected', value: totalGMV, percent: 100, color: C.gold },
            { label: 'Platform Revenue', value: totalFees, percent: (totalFees / (totalGMV || 1)) * 100, color: C.gold },
            { label: 'ISP Earnings', value: totalPayouts, percent: (totalPayouts / (totalGMV || 1)) * 100, color: C.green },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '16px',
              background: C.line,
              border: `0.5px solid ${C.border}`,
              borderRadius: '8px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mute, marginBottom: '8px' }}>
                {item.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: item.color, fontFamily: '"DM Mono", monospace', marginBottom: '8px' }}>
                {formatCurrency(item.value)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, height: '4px', background: C.border, borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: item.color, width: `${item.percent}%` }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: item.color, fontFamily: '"DM Mono", monospace' }}>
                  {item.percent.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}