'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const C = {
  black: '#000', card: '#0D0D0B', border: '#2A2A27', line: '#1A1A18',
  text: '#EDEBE6', dim: '#8C8A84', mute: '#6B6964', faint: '#3A3A37',
  gold: '#E8B84B', green: '#6FCF73', red: '#E5707A',
};

function money(n?: number) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '--';
  return `KES ${new Intl.NumberFormat('en-KE').format(Math.round(n))}`;
}

function shortId(id: string, len = 10) {
  return id && id.length > len ? `${id.slice(0, len)}…` : id || '—';
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDayAbbr(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function statusTone(status?: string) {
  const s = (status || '').toLowerCase();
  if (['completed', 'paid', 'success', 'active'].includes(s)) return 'good';
  if (['pending', 'processing', 'sandbox'].includes(s)) return 'warn';
  if (['failed', 'cancelled', 'error', 'expired'].includes(s)) return 'bad';
  return 'neutral';
}

export default function AdminDashboard() {
  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ revenue_today: 0, revenue_month: 0, active_sessions: 0, total_isps: 0 });
  const [trend, setTrend] = useState<{ date: string; amount: number }[]>([]);
  const [isps, setIsps] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [syncedAt, setSyncedAt] = useState('');

  useEffect(() => {
    const tick = () => setTime(new Date());
    tick(); const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    const token = localStorage.getItem('wb_token');
    if (!token) { setError('Login required.'); setLoading(false); setRefreshing(false); return; }
    setRefreshing(true);
    try {
      const h = { Authorization: `Bearer ${token}` };
      const f = async (url: string) => { const r = await fetch(url, { headers: h }); try { return await r.json(); } catch { return null; } };

      const [dash, txnData, sessionData, ispData] = await Promise.all([
        f(`${API}/api/tenants/dashboard`),
        f(`${API}/api/mpesa/admin/transactions?limit=50`),
        f(`${API}/api/sessions?limit=100`),
        f(`${API}/api/admin/tenants`),
      ]);

      const now = new Date();
      const txnsList = Array.isArray(txnData?.value) ? txnData.value : Array.isArray(txnData) ? txnData : [];
      const sessionsList = Array.isArray(sessionData?.value) ? sessionData.value : Array.isArray(sessionData) ? sessionData : [];
      const ispList = Array.isArray(ispData?.value) ? ispData.value : Array.isArray(ispData) ? ispData : [];

      setStats({
        revenue_today: Number(dash?.revenue_today || 0),
        revenue_month: Number(dash?.revenue_month || 0),
        active_sessions: sessionsList.filter((s: any) => s.status === 'active').length,
        total_isps: ispList.length,
      });

      setTxns(txnsList.slice(0, 5));
      setIsps(ispList);
      setSyncedAt(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));

      const byDay = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(now.getDate() - i);
        byDay.set(dateKey(d), 0);
      }
      txnsList.forEach((txn: any) => {
        const created = txn.created_at ? new Date(txn.created_at) : null;
        if (!created || Number.isNaN(created.getTime())) return;
        const key = dateKey(created);
        if (!byDay.has(key)) return;
        byDay.set(key, (byDay.get(key) || 0) + Number(txn.amount_ksh || 0));
      });
      setTrend([...byDay.entries()].map(([key, amount]) => ({ date: formatDayAbbr(new Date(`${key}T00:00:00`)), amount })));
      setError('');
    } catch { setError('Dashboard stream unavailable.'); } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const trendMax = useMemo(() => Math.max(...trend.map(p => p.amount), 1), [trend]);
  const activeCount = isps.filter(i => i.is_active).length;
  const pendingCount = isps.filter(i => !i.is_active).length;
  const completedCount = txns.filter(t => statusTone(t.status) === 'good').length;
  const pendingTxns = txns.filter(t => statusTone(t.status) === 'warn').length;
  const failedCount = txns.filter(t => statusTone(t.status) === 'bad').length;

  // Daily delta
  const yesterdayRev = 0; // No baseline yet
  const deltaClass = yesterdayRev > 0 ? (stats.revenue_today >= yesterdayRev ? 'up' : 'down') : 'flat';
  const deltaText = yesterdayRev > 0 ? `${deltaClass === 'up' ? '↑' : '↓'} KES ${Math.abs(stats.revenue_today - yesterdayRev).toLocaleString()}` : 'No baseline yet';

  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const dateStr = time.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const systemNodes = [
    { label: 'API Gateway', value: 'ONLINE', tone: 'good' },
    { label: 'Database', value: 'ONLINE', tone: 'good' },
    { label: 'M-Pesa', value: 'SANDBOX', tone: 'warn' },
    { label: 'MikroTik', value: 'NOT CONFIGURED', tone: 'neutral' },
  ];

  const toneColor: Record<string, string> = { good: C.green, warn: C.gold, bad: C.red, neutral: C.faint };

  const skel = (w: string, h: number, d = 0, r = 6) => ({
    width: w, height: h, background: C.faint, borderRadius: r,
    animation: 'skel-pulse 2s ease-in-out infinite',
    animationDelay: `${d}s`,
  });

  if (loading && !stats.revenue_today && !txns.length) {
    return (
      <div style={{ padding: '28px 32px', maxWidth: 1440, minHeight: '100%' }}>
        <style>{`@keyframes skel-pulse { 0%,100% { opacity: 0.2; } 50% { opacity: 0.5; } }`}</style>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={skel('200px', 28, 0)} />
            <div style={{ ...skel('140px', 13, 0.1), marginTop: 4 }} />
          </div>
          <div style={skel('100px', 13, 0.15)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[0.1, 0.2, 0.3, 0.4].map(d => (
            <div key={d} style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
              <div style={skel('60%', 11, d)} />
              <div style={{ ...skel('50%', 32, d + 0.05), marginTop: 8, marginBottom: 4 }} />
              <div style={skel('70%', 12, d + 0.1)} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
            <div style={skel('140px', 11, 0.1)} />
            <div style={{ ...skel('200px', 12, 0.15), marginTop: 2, marginBottom: 16 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, alignItems: 'end', height: 180 }}>
              {[30, 50, 20, 60, 40, 70, 35].map((h, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{ width: '100%', maxWidth: 32, height: `${h}%`, minHeight: 6, background: C.faint, borderRadius: 4, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${0.1 + i * 0.08}s` }} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
            <div style={skel('100px', 11, 0.2)} />
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < 4 ? `0.5px solid ${C.line}` : 'none' }}>
                <div style={skel('100px', 13, 0.2 + i * 0.05)} />
                <div style={skel('60px', 11, 0.2 + i * 0.08)} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[[0.3, 0.4], [0.5, 0.6]].map((ds, col) => (
            <div key={col} style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
              <div style={skel('130px', 11, ds[0])} />
              {[1, 2, 3, 4].map(row => (
                <div key={row} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: row < 4 ? `0.5px solid ${C.line}` : 'none' }}>
                  <div style={skel('120px', 11, ds[0] + row * 0.05)} />
                  <div style={skel('50px', 12, ds[1] + row * 0.05)} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1440, minHeight: '100%' }}>
      {/* Page title section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: '"Space Grotesk", sans-serif', fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>CONTROL ROOM</h1>
          <p style={{ margin: '4px 0 0', fontFamily: 'Inter, sans-serif', fontSize: 13, color: C.mute }}>{dateStr}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: C.faint }}>Last synced {syncedAt}</span>
          <button onClick={load} disabled={refreshing} style={{ background: 'none', border: 'none', cursor: refreshing ? 'not-allowed' : 'pointer', color: C.faint, padding: 0, display: 'flex', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ marginBottom: 20, padding: '10px 14px', borderRadius: 8, border: `0.5px solid ${C.red}`, background: `${C.red}10`, color: C.red, fontFamily: 'Inter, sans-serif', fontSize: 12 }}>{error}</div>
      )}

      {/* ── STAT CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {/* KES Collected Today */}
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>KES Collected Today</div>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 32, fontWeight: 500, color: C.gold, marginBottom: 4 }}>
            {loading ? '...' : money(stats.revenue_today)}
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.mute }}>
            {deltaClass === 'up' ? <span style={{ color: C.green }}>{deltaText}</span> : deltaClass === 'down' ? <span style={{ color: C.red }}>{deltaText}</span> : deltaText}
          </div>
        </div>
        {/* Monthly Revenue */}
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Monthly Revenue</div>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 28, fontWeight: 500, color: C.text, marginBottom: 4 }}>
            {loading ? '...' : money(stats.revenue_month)}
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.mute }}>across {isps.length} ISP partner{isps.length !== 1 ? 's' : ''}</div>
        </div>
        {/* Active Sessions */}
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Active Sessions</div>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 32, fontWeight: 500, color: C.text, marginBottom: 4 }}>
            {loading ? '...' : stats.active_sessions}
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.mute }}>across {activeCount} ISP{activeCount !== 1 ? 's' : ''} right now</div>
        </div>
        {/* Active ISPs */}
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Active ISPs</div>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 28, fontWeight: 500, color: C.text, marginBottom: 4 }}>
            <span>{activeCount}</span><span style={{ color: C.faint }}> / </span><span>{stats.total_isps}</span>
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.mute }}>{pendingCount} pending approval</div>
        </div>
      </div>

      {/* ── SECOND ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12, marginBottom: 20 }}>
        {/* Revenue Contour */}
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Revenue Contour</div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.mute, marginBottom: 16 }}>7-day collection from real transactions</div>

          {/* Bar chart */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, alignItems: 'end', minHeight: 180, marginBottom: 16 }}>
            {trend.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 160, border: `0.5px dashed ${C.faint}`, borderRadius: 6, color: C.faint, fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                Awaiting transaction data.
              </div>
            ) : (
              trend.map((point, i) => {
                const isToday = i === trend.length - 1;
                const height = Math.max((point.amount / trendMax) * 100, 6);
                return (
                  <div key={point.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: '100%', height: 150, display: 'flex', alignItems: 'end', justifyContent: 'center' }}>
                      <div style={{
                        width: '100%', maxWidth: 32, height: `${height}%`, minHeight: 6,
                        borderRadius: 4, background: isToday ? C.gold : C.faint,
                      }} />
                    </div>
                    <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: C.mute }}>{point.date}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Completed / Pending / Failed */}
          <div style={{ display: 'flex', gap: 16, fontFamily: '"DM Mono", monospace', fontSize: 12 }}>
            <span>Completed: <span style={{ color: C.green }}>{completedCount}</span></span>
            <span style={{ color: C.faint }}>·</span>
            <span>Pending: <span style={{ color: C.gold }}>{pendingTxns}</span></span>
            <span style={{ color: C.faint }}>·</span>
            <span>Failed: <span style={{ color: C.red }}>{failedCount}</span></span>
          </div>
        </div>

        {/* System Nodes */}
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>System Nodes</div>

          {systemNodes.map((node, i) => (
            <div key={node.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              height: 36, borderBottom: i < systemNodes.length - 1 ? `0.5px solid ${C.line}` : 'none',
            }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: C.text }}>{node.label}</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: toneColor[node.tone] }}>
                {node.value}
              </span>
            </div>
          ))}

          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `0.5px solid ${C.line}` }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Network Summary</div>
            {[
              { label: 'Configured ISPs', value: String(stats.total_isps) },
              { label: 'Live Sessions', value: String(stats.active_sessions) },
              { label: 'Platform Mode', value: 'Operational', valueColor: C.gold },
            ].map((row, i) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 28, fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                <span style={{ color: C.mute }}>{row.label}</span>
                <span style={{ fontFamily: '"DM Mono", monospace', color: (row as any).valueColor || C.dim }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── THIRD ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Recent Transactions */}
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Recent Transactions</span>
            <Link href="/admin/transactions" style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.gold, textDecoration: 'none' }}>View all →</Link>
          </div>

          {txns.length === 0 ? (
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: C.faint, textAlign: 'center', padding: '32px 0' }}>No transactions recorded yet</div>
          ) : (
            <div>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr', gap: 12, padding: '0 0 8px', borderBottom: `0.5px solid ${C.line}` }}>
                {['RECEIPT', 'AMOUNT', 'STATUS'].map(h => (
                  <div key={h} style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 700, color: C.faint, letterSpacing: '0.1em' }}>{h}</div>
                ))}
              </div>
              {txns.map((txn, i) => {
                const tone = statusTone(txn.status);
                return (
                  <div key={txn.id} style={{
                    display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr', gap: 12, alignItems: 'center',
                    height: 32, borderBottom: i < txns.length - 1 ? `0.5px solid ${C.line}` : 'none',
                  }}>
                    <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: C.dim }}>{shortId(txn.id, 10)}</span>
                    <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 12, color: C.text }}>{money(txn.amount_ksh)}</span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600, color: toneColor[tone] }}>
                      {(txn.status || 'unknown').toUpperCase()}
                    </span>
                  </div>
                );
              })}
              <div style={{ marginTop: 8 }}>
                <Link href="/admin/transactions" style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.gold, textDecoration: 'none' }}>View all in Transactions →</Link>
              </div>
            </div>
          )}
        </div>

        {/* ISP Network Snapshot */}
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>ISP Network Snapshot</span>
            <Link href="/admin/isps" style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.gold, textDecoration: 'none' }}>View all →</Link>
          </div>

          {isps.length === 0 ? (
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: C.faint, textAlign: 'center', padding: '32px 0' }}>No ISPs registered yet</div>
          ) : (
            isps.slice(0, 5).map((isp, i) => (
              <div key={isp.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                height: 36, borderBottom: i < Math.min(isps.length, 5) - 1 ? `0.5px solid ${C.line}` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: C.text }}>{isp.name}</span>
                  {!isp.is_active && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 600, color: C.dim, letterSpacing: '0.06em' }}>PENDING</span>}
                </div>
                {isp.is_active ? (
                  <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 12, color: C.gold }}>
                    {isp.active_sessions || 0} session{(isp.active_sessions || 0) !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600, color: C.dim }}>PENDING</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
