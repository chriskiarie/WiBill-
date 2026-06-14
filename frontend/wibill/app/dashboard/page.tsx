'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/Topbar';
import { useToast } from '@/context/ToastContext';
import { Wifi, DollarSign, TrendingUp, Activity, Users, Zap, Clock } from 'lucide-react';

export default function IspDashboard() {
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const [stats, setStats] = useState({
    revenue_today: 0, revenue_month: 0, active_sessions: 0, active_subscribers: 0,
  });
  const [trend, setTrend] = useState<{ date: string; amount: number }[]>([]);
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [topPackages, setTopPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  const fetchDashboard = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [dash, tenantDash, trendData, pkgs, txnData, sessionData] = await Promise.all([
        api.getDashboardSummary(),
        api.getTenantDashboard(),
        api.getRevenueTrend(7),
        api.getTopPackages(5),
        api.getTransactions(0, 10),
        api.getSessions({ status: 'active' }),
      ]);

      const rev = tenantDash?.revenue || {};
      const metrics = dash?.metrics || {};
      setStats({
        revenue_today: rev.revenue_today || 0,
        revenue_month: rev.revenue_month || rev.gross_ksh || 0,
        active_sessions: metrics.active_sessions || sessionData?.length || 0,
        active_subscribers: metrics.active_subscribers || sessionData?.length || 0,
      });

      setRecentTxns(Array.isArray(txnData) ? txnData.slice(0, 10) : []);
      setActiveSessions(Array.isArray(sessionData) ? sessionData.slice(0, 5) : []);
      setTopPackages(Array.isArray(pkgs) ? pkgs.slice(0, 5) : pkgs?.packages?.slice(0, 5) || []);

      if (trendData?.trend) {
        setTrend(trendData.trend.map((d: any) => ({
          date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          amount: d.total_revenue_ksh || 0,
        })));
      }
    } catch (e: any) {
      showToast('Failed to load dashboard data', { type: 'error' });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchDashboard(); const t = setInterval(fetchDashboard, 60000); return () => clearInterval(t); }, [token]);

  const fmtKsh = (n: number) => n ? `Ksh ${(n / 1000).toFixed(1)}K` : 'Ksh 0';
  const fmt = (n: number) => n?.toLocaleString() ?? '0';
  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const colors = {
    void: '#000000', base: '#0a0a0a', border: '#141414',
    textPrimary: '#f0f0f0', textSecondary: '#666666', textMuted: '#2a2a2a',
    gold: '#E8B84B', green: '#22c55e', red: '#ef4444', amber: '#f59e0b', blue: '#3b82f6',
  };

  const KpiCard = ({ label, value, sub, color, icon }: any) => (
    <div style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderTop: `2px solid ${color}`, borderRadius: 11, padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{label}</div>
        {icon}
      </div>
      <div style={{ fontSize: 28, fontFamily: 'DM Mono, monospace', fontWeight: 500, color, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: colors.textSecondary }}>{sub}</div>
    </div>
  );

  const SystemStatus = ({ label, ok }: { label: string; ok: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid #0d0d0d' }}>
      <span style={{ fontSize: 12, color: colors.textSecondary }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: ok ? colors.green : colors.amber, boxShadow: `0 0 4px ${ok ? colors.green : colors.amber}` }} />
        <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', fontWeight: 700, color: ok ? colors.green : colors.amber }}>{ok ? 'OK' : 'SANDBOX'}</span>
      </div>
    </div>
  );

  return (
    <div style={{ background: colors.void, color: colors.textPrimary, minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Dashboard" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        {/* Topbar with time */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Command Overview</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, fontFamily: 'DM Mono, monospace', color: colors.textMuted }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: colors.green, boxShadow: `0 0 6px ${colors.green}` }} />
            LIVE
            <span style={{ color: '#333' }}>{timeStr}</span>
          </div>
        </div>

        {loading && stats.revenue_today === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#444', fontSize: 13 }}>Loading dashboard...</div>
        ) : (
          <>
            {/* Row 1: KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              <KpiCard label="Revenue Today" value={fmtKsh(stats.revenue_today)} sub="KES" color={colors.gold} icon={<DollarSign size={14} color={colors.gold} />} />
              <KpiCard label="Monthly Revenue" value={fmtKsh(stats.revenue_month)} sub="KES" color={colors.blue} icon={<TrendingUp size={14} color={colors.blue} />} />
              <KpiCard label="Active Sessions" value={fmt(stats.active_sessions)} sub="Online" color={colors.green} icon={<Wifi size={14} color={colors.green} />} />
              <KpiCard label="Active Subscribers" value={fmt(stats.active_subscribers)} sub="Unique" color={colors.amber} icon={<Users size={14} color={colors.amber} />} />
            </div>

            {/* Row 2: Revenue Chart + System Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, marginBottom: 24 }}>
              {/* Revenue Chart */}
              <div style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: 11, padding: 20 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 20 }}>7-Day Revenue Trend</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, marginBottom: 12 }}>
                  {trend.map((p, i) => {
                    const max = Math.max(...trend.map(x => x.amount), 1);
                    const h = (p.amount / max) * 100;
                    return (
                      <div key={i} style={{ flex: 1, height: `${Math.max(h, 4)}%`, background: colors.gold, borderRadius: '4px 4px 0 0', opacity: 0.85, cursor: 'pointer', transition: 'opacity 0.2s', position: 'relative' }}
                        title={`${p.date}: ${p.amount.toFixed(0)} KES`} onMouseOver={e => (e.target as HTMLElement).style.opacity = '1'} onMouseOut={e => (e.target as HTMLElement).style.opacity = '0.85'} />
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, fontFamily: 'DM Mono, monospace', color: colors.textMuted, paddingTop: 10, borderTop: `0.5px solid ${colors.border}` }}>
                  {trend.map((p, i) => <span key={i}>{p.date}</span>)}
                </div>
              </div>

              {/* System Status */}
              <div style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: 11, padding: 20 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>System Status</div>
                <SystemStatus label="API" ok={true} />
                <SystemStatus label="Database" ok={true} />
                <SystemStatus label="M-Pesa" ok={false} />
                <SystemStatus label="MikroTik" ok={false} />
              </div>
            </div>

            {/* Row 3: Top Packages + Active Sessions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
              {/* Top Packages */}
              <div style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: 11, padding: 20 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>Top Packages Today</div>
                {topPackages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 30, color: colors.textMuted, fontSize: 12 }}>No package sales data</div>
                ) : (
                  <div>
                    {topPackages.slice(0, 5).map((p: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < Math.min(topPackages.length, 5) - 1 ? `0.5px solid ${colors.border}` : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 10, color: colors.textMuted, fontFamily: 'DM Mono, monospace' }}>#{i + 1}</span>
                          <span style={{ fontSize: 12, color: colors.textPrimary, fontWeight: 500 }}>{p.name || `Package ${i + 1}`}</span>
                        </div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: colors.gold }}>{fmtKsh(p.total_revenue_ksh || p.price_ksh || 0)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Sessions Feed */}
              <div style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: 11, padding: 20 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>Active Sessions (Recent)</div>
                {activeSessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 30, color: colors.textMuted, fontSize: 12 }}>No active sessions</div>
                ) : (
                  <div>
                    {activeSessions.map((s: any, i: number) => (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < activeSessions.length - 1 ? `0.5px solid ${colors.border}` : 'none' }}>
                        <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: '#888' }}>{s.mac || s.mac_address || '—'}</div>
                        <div style={{ fontSize: 10, color: colors.textMuted }}>{s.package || '—'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row 4: Recent Transactions */}
            <div style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: 11, padding: 20 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>Recent Transactions</div>
              {recentTxns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: colors.textMuted, fontSize: 12 }}>No transactions yet</div>
              ) : (
                <div>
                  {recentTxns.map((t, i) => (
                    <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.8fr 0.8fr 0.6fr', gap: 12, padding: '10px 0', borderBottom: i < recentTxns.length - 1 ? `0.5px solid ${colors.border}` : 'none', alignItems: 'center' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#888' }}>{t.mpesa_receipt || t.id?.slice(0, 12) || '—'}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#555' }}>{t.phone_number?.replace(/(\d{3})\d{4}(\d{3})/, '$1••••$2') || '—'}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: colors.gold, fontWeight: 500 }}>Ksh {t.amount_ksh || t.amount || 0}</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <span style={{ fontSize: 10, color: '#f59e0b' }}>−{t.platform_fee_ksh || t.platform_fee || 0}</span>
                        <span style={{ fontSize: 10, color: colors.green }}>+{t.isp_earnings_ksh || t.isp_earnings || 0}</span>
                      </div>
                      <div style={{ padding: '2px 8px', borderRadius: 4, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', background: '#1a3a1a', color: colors.green, textAlign: 'center' }}>
                        {t.status || 'completed'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
