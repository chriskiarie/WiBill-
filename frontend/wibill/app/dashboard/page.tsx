'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/Topbar';
import { useToast } from '@/context/ToastContext';
import { Wifi, DollarSign, Clock, AlertTriangle } from 'lucide-react';

const C = {
  void: '#000000', base: '#0a0a0a', border: '#141414',
  text: '#f0f0f0', dim: '#666666', mute: '#2a2a2a',
  gold: '#E8B84B', green: '#22c55e', red: '#ef4444', amber: '#f59e0b', blue: '#3b82f6',
};

function fmtKsh(n: number) { return `Ksh ${(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }
function fmt(n: number) { return (n || 0).toLocaleString(); }

const statusColor: Record<string, string> = {
  success: '#22c55e', failed: '#ef4444', pending: '#f59e0b', active: '#22c55e',
  disconnected: '#666', expired: '#666',
};

export default function IspDashboard() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [dash, setDash] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const [dd, ss, tt] = await Promise.all([
          api.getTenantDashboard(),
          api.getSessions({ status: 'active' }),
          api.getTransactions(0, 10),
        ]);
        setDash(dd);
        setSessions(Array.isArray(ss) ? ss : []);
        setTxns(Array.isArray(tt) ? tt : []);
      } catch (e: any) {
        showToast(e.message || 'Failed to load dashboard', { type: 'error' });
      } finally { setLoading(false); }
    };
    load();
    const poll = setInterval(load, 30000);
    return () => clearInterval(poll);
  }, [token]);

  const nw = dash?.network || {};
  const isUp = nw.status === 'up';
  const today = dash?.today || { gross_ksh: 0, platform_fee_ksh: 0, isp_earnings_ksh: 0, count: 0 };
  const month = dash?.month || { gross_ksh: 0, platform_fee_ksh: 0, isp_earnings_ksh: 0, count: 0 };
  const activeCount = dash?.active_sessions ?? sessions.length;
  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  return (
    <div style={{ background: C.void, color: C.text, minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Dashboard" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Your Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.mute }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: isUp ? C.green : C.red, boxShadow: `0 0 6px ${isUp ? C.green : C.red}` }} />
            <span style={{ color: isUp ? C.green : C.red }}>{isUp ? 'ONLINE' : nw.status === 'unknown' ? 'UNKNOWN' : 'DOWN'}</span>
            <span style={{ color: '#333' }}>{timeStr}</span>
          </div>
        </div>

        {loading && !dash ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#444', fontSize: 13 }}>Loading dashboard...</div>
        ) : (
          <>

            {/* ═══ 1. NETWORK STATUS (full-width banner) ═══ */}
            <div style={{
              background: isUp ? 'linear-gradient(135deg, #052e16, #0d3a1a)' : 'linear-gradient(135deg, #3d0a0a, #4a1010)',
              border: `0.5px solid ${isUp ? '#166534' : '#7f1d1d'}`,
              borderRadius: 11, padding: '18px 24px', marginBottom: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {isUp ? <Wifi size={20} color={C.green} /> : <AlertTriangle size={20} color={C.red} />}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: isUp ? C.green : C.red }}>
                    Network {isUp ? 'Online' : nw.status === 'unknown' ? 'Unknown' : 'Down'}
                  </div>
                  <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: isUp ? '#4ade80' : '#fca5a5', marginTop: 2 }}>
                    {isUp
                      ? `Latency: ${nw.latency_ms ?? '?'}ms · Checked: ${nw.checked_at ? new Date(nw.checked_at).toLocaleTimeString() : 'never'}`
                      : nw.outage_minutes
                        ? `Down for ${nw.outage_minutes}m · Since ${nw.checked_at ? new Date(nw.checked_at).toLocaleTimeString() : '?'}`
                        : 'No recent check'}
                  </div>
                </div>
              </div>
              <div style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 9, fontWeight: 700,
                background: isUp ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                color: isUp ? C.green : C.red, letterSpacing: '0.1em',
              }}>
                {isUp ? '✓ OPERATIONAL' : nw.status === 'unknown' ? '○ UNKNOWN' : '✗ OUTAGE'}
              </div>
            </div>

            {/* ═══ 2. REVENUE SPLIT (4 cards) ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
              {/* Today's Gross */}
              <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '18px 22px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>Collected Today</div>
                <div style={{ fontSize: 26, fontFamily: 'DM Mono, monospace', fontWeight: 500, color: C.gold, letterSpacing: '-0.02em' }}>{fmtKsh(today.gross_ksh)}</div>
                <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.dim, marginTop: 4 }}>{today.count} txns</div>
              </div>
              {/* Today's Net */}
              <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '18px 22px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>You Earn (net)</div>
                <div style={{ fontSize: 26, fontFamily: 'DM Mono, monospace', fontWeight: 500, color: C.green, letterSpacing: '-0.02em' }}>{fmtKsh(today.isp_earnings_ksh)}</div>
                <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: '#a16207', marginTop: 4 }}>Fee: {fmtKsh(today.platform_fee_ksh)}</div>
              </div>
              {/* Month Gross */}
              <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '18px 22px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>30-day Revenue</div>
                <div style={{ fontSize: 26, fontFamily: 'DM Mono, monospace', fontWeight: 500, color: C.blue, letterSpacing: '-0.02em' }}>{fmtKsh(month.gross_ksh)}</div>
                <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.dim, marginTop: 4 }}>{month.count} txns</div>
              </div>
              {/* Active Sessions */}
              <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '18px 22px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>Active Sessions</div>
                <div style={{ fontSize: 26, fontFamily: 'DM Mono, monospace', fontWeight: 500, color: C.green, letterSpacing: '-0.02em' }}>{fmt(activeCount)}</div>
                <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.dim, marginTop: 4 }}>
                  {sessions.length > 0 ? `${sessions.length} online now` : 'No active users'}
                </div>
              </div>
            </div>

            {/* ═══ 3. RECENT SESSIONS + TRANSACTIONS ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              {/* Sessions */}
              <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Active Connections</span>
                  <Wifi size={13} color={C.green} />
                </div>
                {sessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 30, color: C.mute, fontSize: 12 }}>
                    <Wifi size={24} color="#1a1a1a" style={{ marginBottom: 8 }} />
                    <div>No active sessions</div>
                    <div style={{ fontSize: 10, color: '#1a1a1a', marginTop: 4 }}>Quiet network or portal not configured</div>
                  </div>
                ) : (
                  <div>
                    {sessions.slice(0, 6).map((s: any) => (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid #0d0d0d' }}>
                        <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: '#888' }}>{s.mac_address || '—'}</div>
                        <div style={{ fontSize: 10, color: C.dim }}>{(s as any).package_name || (s as any).package || '—'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Transactions */}
              <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Recent Payments</span>
                  <DollarSign size={13} color={C.gold} />
                </div>
                {txns.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 30, color: C.mute, fontSize: 12 }}>No transactions yet</div>
                ) : (
                  <div>
                    {txns.slice(0, 6).map((t: any) => {
                      const st = (t.status || 'completed').toLowerCase();
                      const bg = st === 'success' || st === 'completed' ? '#0d2d0d'
                        : st === 'failed' ? '#2d0d0d'
                        : st === 'pending' || st === 'pending_payment' ? '#2d2d0d'
                        : '#0d0d0d';
                      const fg = statusColor[st] || '#888';
                      return (
                        <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 70px', gap: 10, padding: '8px 0', borderBottom: '0.5px solid #0d0d0d', alignItems: 'center' }}>
                          <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t.mpesa_receipt || t.id?.slice(0, 8) || '—'}
                          </div>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: C.gold, fontWeight: 500, textAlign: 'right' }}>
                            Ksh {t.amount_ksh || t.amount || 0}
                          </div>
                          <div style={{
                            padding: '2px 8px', borderRadius: 4, fontSize: 8, fontWeight: 700, textTransform: 'uppercase',
                            textAlign: 'center', background: bg, color: fg,
                          }}>
                            {st === 'success' || st === 'completed' ? 'Paid' : st === 'pending_payment' ? 'Pending' : st}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ═══ 4. MONTHLY REVENUE TREND (compact chart) ═══ */}
            <RevenueTrendChart />

          </>
        )}
      </div>
    </div>
  );
}

function RevenueTrendChart() {
  const [trend, setTrend] = useState<{ date: string; amount: number }[]>([]);
  useEffect(() => {
    api.getRevenueTrend(7).then((d: any) => {
      if (d?.trend) setTrend(d.trend.map((x: any) => ({
        date: new Date(x.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: x.total_revenue_ksh || 0,
      })));
    }).catch(() => {});
  }, []);

  if (trend.length === 0) return null;

  const max = Math.max(...trend.map(x => x.amount), 1);
  return (
    <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 20 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 20 }}>7-Day Revenue</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80, marginBottom: 10 }}>
        {trend.map((p, i) => (
          <div key={i} style={{
            flex: 1, height: `${Math.max((p.amount / max) * 100, 4)}%`,
            background: C.gold, borderRadius: '3px 3px 0 0', opacity: 0.85, position: 'relative',
            transition: 'opacity 0.2s',
          }} title={`${p.date}: ${p.amount.toFixed(0)} KES`} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, fontFamily: 'DM Mono, monospace', color: C.mute, paddingTop: 8, borderTop: `0.5px solid ${C.border}` }}>
        {trend.map((p, i) => <span key={i}>{p.date}</span>)}
      </div>
    </div>
  );
}
