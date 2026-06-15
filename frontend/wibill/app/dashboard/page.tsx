'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, maskPhone, formatKsh } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/Topbar';
import { useToast } from '@/context/ToastContext';
import { Wifi, DollarSign, Clock, AlertTriangle, XCircle, Package, Router, CreditCard, Link as LinkIcon, Printer, ChevronRight } from 'lucide-react';

const C = {
  void: '#000000', base: '#0a0a0a', border: '#141414',
  text: '#f0f0f0', dim: '#666666', mute: '#2a2a2a',
  gold: '#E8B84B', green: '#22c55e', red: '#ef4444', amber: '#f59e0b', blue: '#3b82f6',
};

function fmtKsh(n: number) { return `Ksh ${(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }
function fmt(n: number) { return (n || 0).toLocaleString(); }

export default function IspDashboard() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [dash, setDash] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [invoice, setInvoice] = useState<any>(null);
  const [yesterday, setYesterday] = useState<number>(0);
  const [failedToday, setFailedToday] = useState<number>(0);
  const [configs, setConfigs] = useState({ mpesa: false, mikrotik: false, packages: 0 });
  const [loading, setLoading] = useState(true);
  const [kicking, setKicking] = useState<Set<string>>(new Set());
  const [time, setTime] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [dd, ss, tt, trend, inv, mpesaCfg, mkCfg, pkgs] = await Promise.all([
        api.getTenantDashboard(),
        api.getSessions({ status: 'active' }),
        api.getTransactions(0, 10),
        api.getRevenueTrend(2).catch(() => null),
        api.getInvoiceStatus().catch(() => null),
        api.getMpesaConfig().catch(() => null),
        api.getMikrotikConfig().catch(() => null),
        api.getPackages().catch(() => []),
      ]);

      setDash(dd);
      setSessions(Array.isArray(ss) ? ss : []);
      setTxns(Array.isArray(tt) ? tt : []);
      setInvoice(inv);

      if (trend?.trend && trend.trend.length >= 2) {
        const yesterdayData = trend.trend[trend.trend.length - 2];
        setYesterday(yesterdayData?.isp_earnings_ksh || 0);
      } else if (trend?.trend && trend.trend.length === 1) {
        setYesterday(0);
      } else {
        setYesterday(0);
      }

      const failed = Array.isArray(tt) ? tt.filter((t: any) => {
        const st = (t.status || '').toLowerCase();
        return st === 'failed';
      }).length : 0;
      setFailedToday(failed);

      setConfigs({
        mpesa: mpesaCfg?.configured === true,
        mikrotik: mkCfg?.router_ip ? true : false,
        packages: Array.isArray(pkgs) ? pkgs.length : 0,
      });
    } catch (e: any) {
      showToast(e.message || 'Failed to load dashboard', { type: 'error' });
    } finally { setLoading(false); }
  }, [token, showToast]);

  useEffect(() => {
    load();
    const poll = setInterval(load, 30000);
    return () => clearInterval(poll);
  }, [load]);

  const handleKick = async (id: string) => {
    setKicking(prev => new Set(prev).add(id));
    try {
      await api.kickSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      showToast('Session disconnected', { type: 'success' });
    } catch (e: any) {
      showToast(e.message || 'Failed to disconnect', { type: 'error' });
    } finally {
      setKicking(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const nw = dash?.network || {};
  const isUp = (nw.status || 'unknown') === 'up';
  const nwStatus = nw.status || 'unknown';

  const today = dash?.today || { gross_ksh: 0, platform_fee_ksh: 0, isp_earnings_ksh: 0, count: 0 };
  const month = dash?.month || { gross_ksh: 0, platform_fee_ksh: 0, isp_earnings_ksh: 0, count: 0 };
  const activeCount = dash?.active_sessions ?? sessions.length;
  const nwLatency = nw.latency_ms;
  const nwOutage = nw.outage_minutes;
  const nwChecked = nw.checked_at;

  const invStatus = invoice?.status || 'none';

  const needsAttention = !configs.mpesa || !configs.mikrotik || configs.packages === 0 || nwStatus !== 'up';
  const canTakePayments = configs.mpesa && configs.mikrotik && configs.packages > 0;

  let statusColor = C.green;
  let statusIcon = <Wifi size={16} color={C.green} />;
  let statusLabel = 'All systems operational';
  let statusDetail = 'Portal live, ready to accept payments';

  if (!canTakePayments) {
    statusColor = C.amber;
    statusIcon = <AlertTriangle size={16} color={C.amber} />;
    const missing: string[] = [];
    if (!configs.mpesa) missing.push('M-Pesa');
    if (!configs.mikrotik) missing.push('MikroTik');
    if (configs.packages === 0) missing.push('packages');
    statusLabel = `${missing.join(', ')} not configured`;
    statusDetail = 'Payments will not process until setup is complete';
  }

  if (nwStatus !== 'up') {
    statusColor = nwStatus === 'unknown' ? C.amber : C.red;
    statusIcon = nwStatus === 'unknown' ? <AlertTriangle size={16} color={C.amber} /> : <XCircle size={16} color={C.red} />;
    statusLabel = `Network ${nwStatus === 'unknown' ? 'status unknown' : 'offline'}`;
    statusDetail = nwOutage ? `Down for ${nwOutage}m` : 'No recent connectivity check';
  }

  const cards = [
    { label: "Yesterday's Earnings", value: fmtKsh(yesterday), sub: 'Net after fee', color: C.blue },
    { label: 'Today', value: fmtKsh(today.isp_earnings_ksh), sub: `Net · ${today.count} txns`, color: C.gold },
    { label: 'This Month', value: fmtKsh(month.isp_earnings_ksh), sub: `${month.count} txns · Fee: ${fmtKsh(month.platform_fee_ksh)}`, color: C.green },
    { label: 'Active Sessions', value: fmt(activeCount), sub: sessions.length > 0 ? `${sessions.length} online now` : 'No one connected', color: C.blue },
    { label: 'Failed Today', value: fmt(failedToday), sub: failedToday > 0 ? 'Needs attention' : 'All payments successful', color: failedToday > 0 ? C.red : C.dim },
  ];

  const quickActions = [
    { label: 'Share Portal Link', icon: LinkIcon, href: '/dashboard/portal-preview', always: true },
    { label: 'Print QR Code', icon: Printer, href: '/dashboard/portal-preview', always: true },
  ];
  if (!configs.mikrotik) quickActions.push({ label: 'Configure MikroTik', icon: Router, href: '/dashboard/mikrotik', always: false });
  if (!configs.mpesa) quickActions.push({ label: 'Set up M-Pesa', icon: CreditCard, href: '/dashboard/mpesa', always: false });
  if (configs.packages === 0) quickActions.push({ label: 'Add Packages', icon: Package, href: '/dashboard/packages', always: false });

  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const dateStr = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div style={{ background: C.void, color: C.text, minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Dashboard" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>

        {/* ── INVOICE BANNER ── */}
        {invStatus === 'overdue' && invoice && (
          <div style={{
            background: 'linear-gradient(135deg, #3d0a0a, #4a1010)',
            border: '0.5px solid #7f1d1d', borderRadius: 11,
            padding: '14px 20px', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <XCircle size={18} color={C.red} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.red }}>
                  Account overdue — {invoice.amount_due ? fmtKsh(invoice.amount_due) : ''} due
                </div>
                <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: '#fca5a5', marginTop: 2 }}>
                  {invoice.days_overdue || invoice.days_left || '?'} days overdue
                  {invoice.is_locked ? ' · Portal suspended' : ''}
                </div>
              </div>
            </div>
            <a href="/dashboard/billing" style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: 'rgba(239,68,68,0.15)', color: C.red,
              textDecoration: 'none', letterSpacing: '0.05em',
            }}>
              Pay Now →
            </a>
          </div>
        )}

        {invStatus === 'due' && invoice && (
          <div style={{
            background: 'linear-gradient(135deg, #3d2d0a, #4a3810)',
            border: '0.5px solid #7f6d1d', borderRadius: 11,
            padding: '14px 20px', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <AlertTriangle size={18} color={C.amber} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.amber }}>
                  Invoice due in {invoice.days_left || '?'} days
                </div>
                <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: '#fcd34d', marginTop: 2 }}>
                  {invoice.amount_due ? fmtKsh(invoice.amount_due) : ''} — pay before {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '?'}
                </div>
              </div>
            </div>
            <a href="/dashboard/billing" style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: 'rgba(245,158,11,0.15)', color: C.amber,
              textDecoration: 'none', letterSpacing: '0.05em',
            }}>
              Pay Now →
            </a>
          </div>
        )}

        {/* ── STATUS BAR (single source of truth) ── */}
        <div style={{
          background: statusColor === C.green ? 'linear-gradient(135deg, #052e16, #0d3a1a)' :
                       statusColor === C.amber ? 'linear-gradient(135deg, #2d250a, #3d3010)' :
                       'linear-gradient(135deg, #3d0a0a, #4a1010)',
          border: `0.5px solid ${statusColor === C.green ? '#166534' : statusColor === C.amber ? '#7f6d1d' : '#7f1d1d'}`,
          borderRadius: 11, padding: '16px 22px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {statusIcon}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: statusColor }}>
                {statusLabel}
              </div>
              <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: statusColor === C.green ? '#4ade80' : statusColor === C.amber ? '#fcd34d' : '#fca5a5', marginTop: 2 }}>
                {statusDetail}
                {nwStatus === 'up' && nwLatency ? ` · ${nwLatency}ms latency` : ''}
                {nwChecked ? ` · Checked ${new Date(nwChecked).toLocaleTimeString()}` : ''}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: '#444', textAlign: 'right' }}>
              <div>{dateStr}</div>
              <div style={{ color: statusColor }}>{timeStr}</div>
            </div>
            <div style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 9, fontWeight: 700,
              background: `${statusColor}22`, color: statusColor, letterSpacing: '0.1em',
            }}>
              {statusColor === C.green ? '✓ OPERATIONAL' : statusColor === C.amber ? '○ ATTENTION' : '✗ ISSUE'}
            </div>
          </div>
        </div>

        {loading && !dash ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#444', fontSize: 13 }}>Loading dashboard...</div>
        ) : (
          <>
            {/* ═══ FIVE METRIC CARDS ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
              {cards.map((c, i) => (
                <div key={i} style={{
                  background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11,
                  padding: '14px 16px', position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: 26, fontFamily: 'DM Mono, monospace', fontWeight: 500, color: c.color, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                    {c.value}
                  </div>
                  <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.dim, marginTop: 4 }}>
                    {c.sub}
                  </div>
                  <div style={{
                    position: 'absolute', top: 0, right: 0, width: 60, height: 60,
                    background: `radial-gradient(circle, ${c.color}08 0%, transparent 70%)`,
                    borderRadius: '50%', transform: 'translate(20px, -20px)',
                  }} />
                </div>
              ))}
            </div>

            {/* ═══ LIVE SESSIONS + RECENT PAYMENTS ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              {/* Live Sessions */}
              <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Live Sessions
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 700,
                    background: sessions.length > 0 ? 'rgba(34,197,94,0.15)' : '#0d0d0d',
                    color: sessions.length > 0 ? C.green : '#333',
                    fontFamily: 'DM Mono, monospace',
                  }}>
                    {sessions.length} online
                  </span>
                </div>
                {sessions.length === 0 ? (
                  <div style={{ border: '1px dashed #1a1a1a', borderRadius: 8, textAlign: 'center', padding: '24px 16px' }}>
                    <Wifi size={22} color="#1a1a1a" style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: 12, color: '#333', fontWeight: 600 }}>No one connected yet</div>
                    <div style={{ fontSize: 10, color: '#1a1a1a', marginTop: 4 }}>
                      Share your portal link to get started
                    </div>
                    <a href="/dashboard/portal-preview" style={{
                      display: 'inline-block', marginTop: 12, padding: '6px 14px', borderRadius: 8,
                      fontSize: 10, fontWeight: 700, color: C.blue, border: `0.5px solid ${C.blue}33`,
                      textDecoration: 'none',
                    }}>
                      View Portal Preview →
                    </a>
                  </div>
                ) : (
                  <div>
                    {sessions.slice(0, 8).map((s: any) => {
                      const remaining = s.expires_at ? Math.max(0, Math.floor((new Date(s.expires_at).getTime() - Date.now()) / 1000)) : 0;
                      const hrs = Math.floor(remaining / 3600);
                      const mins = Math.floor((remaining % 3600) / 60);
                      const secs = remaining % 60;
                      const timeLeft = remaining > 0 ? `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : 'Expired';
                      const isKicking = kicking.has(s.id);
                      return (
                        <div key={s.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 0', borderBottom: '0.5px solid #0d0d0d',
                        }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: remaining > 0 ? C.green : C.red,
                            boxShadow: remaining > 0 ? `0 0 6px ${C.green}` : 'none',
                            flexShrink: 0,
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#888' }}>
                              {maskPhone(s.phone_number || s.mac_address || '—')}
                            </div>
                            <div style={{ fontSize: 10, color: C.dim, marginTop: 1 }}>
                              {s.package_name || 'Unknown'} · {timeLeft}
                            </div>
                          </div>
                          <button onClick={() => handleKick(s.id)} disabled={isKicking} style={{
                            padding: '4px 10px', borderRadius: 6, fontSize: 9, fontWeight: 600,
                            background: isKicking ? '#0d0d0d' : 'rgba(239,68,68,0.1)',
                            color: isKicking ? '#333' : C.red, border: `0.5px solid ${isKicking ? '#1a1a1a' : 'rgba(239,68,68,0.2)'}`,
                            cursor: isKicking ? 'not-allowed' : 'pointer', fontFamily: 'DM Mono, monospace',
                          }}>
                            {isKicking ? '...' : 'Kick'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Payments */}
              <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Recent Payments
                  </span>
                  <DollarSign size={14} color={C.gold} />
                </div>
                {txns.length === 0 ? (
                  <div style={{ border: '1px dashed #1a1a1a', borderRadius: 8, textAlign: 'center', padding: '24px 16px' }}>
                    <DollarSign size={22} color="#1a1a1a" style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: 12, color: '#333', fontWeight: 600 }}>No payments yet</div>
                    <div style={{ fontSize: 10, color: '#1a1a1a', marginTop: 4 }}>
                      Your portal is ready to accept payments
                    </div>
                    <a href="/dashboard/portal-preview" style={{
                      display: 'inline-block', marginTop: 12, padding: '6px 14px', borderRadius: 8,
                      fontSize: 10, fontWeight: 700, color: C.blue, border: `0.5px solid ${C.blue}33`,
                      textDecoration: 'none',
                    }}>
                      View Portal Preview →
                    </a>
                  </div>
                ) : (
                  <div>
                    {txns.slice(0, 8).map((t: any) => {
                      const st = (t.status || '').toLowerCase();
                      const bg = st === 'success' || st === 'completed' ? 'rgba(34,197,94,0.1)'
                        : st === 'failed' ? 'rgba(239,68,68,0.1)'
                        : 'rgba(245,158,11,0.1)';
                      const fg = st === 'success' || st === 'completed' ? C.green
                        : st === 'failed' ? C.red
                        : C.amber;
                      const label = st === 'success' || st === 'completed' ? 'Paid'
                        : st === 'failed' ? 'Failed'
                        : 'Pending';
                      return (
                        <div key={t.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 0', borderBottom: '0.5px solid #0d0d0d',
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#888' }}>
                              {maskPhone(t.phone_number || '—')}
                            </div>
                            <div style={{ fontSize: 10, color: C.dim, marginTop: 1 }}>
                              {t.package_name || t.mpesa_receipt || t.id?.slice(0, 8) || '—'}
                              {t.created_at ? ` · ${new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                            </div>
                          </div>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: C.gold, fontWeight: 500 }}>
                            {fmtKsh(t.amount_ksh || t.amount || 0)}
                          </div>
                          <div style={{
                            padding: '2px 8px', borderRadius: 4, fontSize: 8, fontWeight: 700,
                            textTransform: 'uppercase', background: bg, color: fg,
                          }}>
                            {label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ═══ QUICK ACTIONS ═══ */}
            {quickActions.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  Quick Actions
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {quickActions.map((a, i) => (
                    <a key={i} href={a.href} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                      background: a.always ? C.base : 'rgba(59,130,246,0.06)',
                      border: `0.5px solid ${a.always ? C.border : 'rgba(59,130,246,0.15)'}`,
                      color: a.always ? C.dim : C.blue,
                      textDecoration: 'none', transition: 'all 0.15s',
                    }}>
                      <a.icon size={14} color={a.always ? C.dim : C.blue} />
                      <span>{a.label}</span>
                      <ChevronRight size={12} color={a.always ? '#1a1a1a' : `${C.blue}55`} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}