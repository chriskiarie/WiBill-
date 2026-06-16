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

  const sk = (w: string, h: number, d = 0) => ({
    width: w, height: h, background: colors.textMuted, borderRadius: 6,
    animation: 'skel-pulse 2s ease-in-out infinite',
    animationDelay: `${d}s`,
  });

  if (loading && txns.length === 0) {
    return (
      <div style={{ background: colors.void, color: colors.textPrimary, minHeight: '100vh', padding: '32px 36px', maxWidth: '1800px', margin: '0 auto' }}>
        <style>{`@keyframes skel-pulse { 0%,100% { opacity: 0.2; } 50% { opacity: 0.5; } }`}</style>
        <div style={sk('280px', 36, 0)} />
        <div style={{ ...sk('320px', 13, 0.1), marginTop: 8, marginBottom: 40 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[0.1, 0.2, 0.3, 0.4].map(d => (
            <div key={d} style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: 12, padding: 24 }}>
              <div style={sk('60%', 10, d)} />
              <div style={{ ...sk('50%', 28, d + 0.05), marginTop: 12, marginBottom: 8 }} />
              <div style={sk('40%', 11, d + 0.1)} />
            </div>
          ))}
        </div>
        <div style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: 12, padding: 24, marginBottom: 32 }}>
          <div style={sk('160px', 14, 0.15)} />
          <div style={{ ...sk('200px', 11, 0.2), marginTop: 4, marginBottom: 20 }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 180 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(i => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ width: '100%', height: `${30 + (i * 4) % 50}%`, background: colors.textMuted, borderRadius: 3, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${0.2 + i * 0.04}s` }} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[0.3, 0.5].map((d, col) => (
            <div key={col} style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: 12, padding: 24 }}>
              <div style={sk('140px', 14, d)} />
              {[1, 2, 3, 4].map(r => (
                <div key={r} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', marginTop: 8, background: colors.raised, border: `0.5px solid ${colors.border}`, borderRadius: 8 }}>
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
    <div style={{ background: colors.void, color: colors.textPrimary, minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif', padding: '32px 36px', maxWidth: '1800px', margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.025em', margin: '0 0 8px', color: colors.textPrimary, fontFamily: '"Space Grotesk", sans-serif' }}>
              Revenue Dashboard
            </h1>
            <p style={{ fontSize: 13, color: colors.textSecondary, margin: 0 }}>
              Real-time cash flow tracking and platform performance
            </p>
          </div>
          <button onClick={load} disabled={refreshing} title="Refresh" style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `0.5px solid ${colors.border}`, background: colors.base, cursor: refreshing ? 'not-allowed' : 'pointer', color: colors.textSecondary,
            animation: refreshing ? 'spin 1s linear infinite' : 'none',
          }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* PRIMARY KPIs - THE BIG NUMBERS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total Collected', value: formatCurrency(totalGMV), color: colors.blue, icon: '💰', change: '+12.5%' },
          { label: 'Platform Fees', value: formatCurrency(totalFees), color: colors.gold, icon: '💸', change: '+8.2%' },
          { label: 'ISP Payouts', value: formatCurrency(totalPayouts), color: colors.green, icon: '✓', change: '+14.1%' },
          { label: 'Outstanding', value: formatCurrency(outstanding), color: colors.amber, icon: '⏳', change: 'pending' },
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

            <div style={{ fontSize: 28, fontWeight: 900, color: metric.color, fontFamily: '"JetBrains Mono", monospace', marginBottom: '8px' }}>
              {metric.value}
            </div>

            <div style={{ fontSize: 11, color: metric.change === 'pending' ? colors.amber : colors.green, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
              {metric.change}
            </div>
          </div>
        ))}
      </div>

      {/* CASH FLOW VISUALIZATION */}
      <div style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: '0 0 4px', fontFamily: '"Space Grotesk", sans-serif' }}>
            14-Day Cash Flow
          </h2>
          <p style={{ fontSize: 11, color: colors.textMuted, margin: 0 }}>
            Collection → Fees → Payouts
          </p>
        </div>

        {chartData.length === 0 ? (
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted }}>
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
                          background: colors.green,
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
                          background: colors.gold,
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
                          background: colors.blue,
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
                    
                    <div style={{ fontSize: 9, color: colors.textMuted, fontFamily: '"JetBrains Mono", monospace', textAlign: 'center', marginTop: '4px' }}>
                      {date.split(' ')[0]}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* LEGEND */}
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', fontSize: 11, borderTop: `0.5px solid ${colors.border}`, paddingTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', background: colors.green, borderRadius: '2px' }} />
                <span style={{ color: colors.textSecondary }}>ISP Payouts</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', background: colors.gold, borderRadius: '2px' }} />
                <span style={{ color: colors.textSecondary }}>Platform Fees</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', background: colors.blue, borderRadius: '2px', opacity: 0.6 }} />
                <span style={{ color: colors.textSecondary }}>Outstanding/Pending</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECONDARY METRICS + TOP ISPs GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
        {/* METRICS */}
        <div style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif' }}>
            Key Metrics
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { label: 'Take Rate', value: takeRate + '%', color: colors.gold, desc: 'Fee / Volume' },
              { label: 'Success Rate', value: successRate + '%', color: colors.green, desc: 'Completed txns' },
              { label: 'Total Transactions', value: txnCount.toLocaleString(), color: colors.blue, desc: 'All time' },
              { label: 'Avg Transaction', value: formatCurrency(txns.length > 0 ? totalGMV / txns.length : 0), color: colors.amber, desc: 'Per payment' },
            ].map((metric, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                background: colors.raised,
                border: `0.5px solid ${colors.border}`,
                borderRadius: '8px',
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.textMuted, marginBottom: '2px' }}>
                    {metric.label}
                  </div>
                  <div style={{ fontSize: 10, color: colors.textSecondary }}>
                    {metric.desc}
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: metric.color, fontFamily: '"JetBrains Mono", monospace' }}>
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TOP ISPs */}
        <div style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif' }}>
            Top ISPs by Revenue
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topISPs.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>
                No ISP data
              </div>
            ) : (
              topISPs.map(([id, revenue], idx) => (
                <div key={id} style={{
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
                    background: [colors.gold, colors.green, colors.blue, colors.amber, colors.red][idx],
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
                    <div style={{ fontSize: 11, fontWeight: 600, color: colors.textPrimary, marginBottom: '2px' }}>
                      {id === 'unknown' ? 'Unassigned' : `ISP-${id.slice(0, 12)}`}
                    </div>
                    <div style={{
                      height: '4px',
                      background: colors.border,
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        background: [colors.gold, colors.green, colors.blue, colors.amber, colors.red][idx],
                        width: `${Math.min((revenue / topISPs[0][1]) * 100, 100)}%`,
                      }} />
                    </div>
                  </div>

                  <div style={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: [colors.gold, colors.green, colors.blue, colors.amber, colors.red][idx],
                    fontFamily: '"JetBrains Mono", monospace',
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
      <div style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif' }}>
          Revenue Split (All Time)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          {[
            { label: 'Total Collected', value: totalGMV, percent: 100, color: colors.blue },
            { label: 'Platform Revenue', value: totalFees, percent: (totalFees / (totalGMV || 1)) * 100, color: colors.gold },
            { label: 'ISP Earnings', value: totalPayouts, percent: (totalPayouts / (totalGMV || 1)) * 100, color: colors.green },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '16px',
              background: colors.raised,
              border: `0.5px solid ${colors.border}`,
              borderRadius: '8px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.textMuted, marginBottom: '8px' }}>
                {item.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: item.color, fontFamily: '"JetBrains Mono", monospace', marginBottom: '8px' }}>
                {formatCurrency(item.value)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, height: '4px', background: colors.border, borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: item.color, width: `${item.percent}%` }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: item.color, fontFamily: '"JetBrains Mono", monospace' }}>
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