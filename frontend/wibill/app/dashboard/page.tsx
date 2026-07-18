'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { api, maskPhone } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/Topbar';
import { useToast } from '@/context/ToastContext';
import { Wifi, DollarSign, AlertTriangle, XCircle, Package, Router, CreditCard, Link, Printer, ChevronRight, Check, Smartphone, Receipt, TrendingUp, X, Settings, RefreshCw, Users, Download } from 'lucide-react';

const C = {
  void: 'var(--theme-bg)', base: 'var(--theme-card-base)', border: 'var(--theme-border)', border2: 'var(--theme-border2)',
  text: 'var(--theme-text)', dim: 'var(--theme-dim)', mute: 'var(--theme-mute)',
  gold: 'var(--theme-gold)', green: 'var(--theme-green)', red: 'var(--theme-red)',
};

// Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48
// All card internal padding: 16px, hero card: 20px
// Grid gaps between cards: 12px
// Section bottom margins: 20px
// Typography: headers Space Grotesk, numeric DM Mono, labels/body Inter

function ksh(n: number) {
  return `Ksh ${(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmt(n: number) {
  return (n || 0).toLocaleString();
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const steps = [
  { key: 'mikrotik', label: 'Connect your MikroTik router', desc: 'Link your router to manage sessions', href: '/dashboard/mikrotik', icon: Router },
  { key: 'mpesa', label: 'Set up M-Pesa payments', desc: 'Configure your Till or Paybill to accept payments', href: '/dashboard/mpesa', icon: CreditCard },
  { key: 'packages', label: 'Create internet packages', desc: 'Define speeds, data limits, and pricing', href: '/dashboard/packages', icon: Package },
  { key: 'portal', label: 'Customize your portal', desc: 'Set your brand name, colors, and template', href: '/dashboard/settings', icon: Smartphone },
  { key: 'share', label: 'Share your portal link', desc: 'Start accepting customers', href: '/dashboard/portal-preview', icon: Link },
];

function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
  return (
    <>
      {open && <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
        width: '100%', maxWidth: isMobile ? '100%' : 420,
        background: C.base,
        borderLeft: isMobile ? 'none' : '0.5px solid rgba(232,184,75,0.08)',
        boxShadow: isMobile ? 'none' : '-10px 0 40px rgba(0,0,0,0.4)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 0' }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 18, right: 18,
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: C.dim, zIndex: 2,
          }}>
            <X size={14} />
          </button>
          {children}
        </div>
      </div>
    </>
  );
}

export default function IspDashboard() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const overlayRef = useRef<HTMLDivElement>(null);

  const [dash, setDash] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [invoice, setInvoice] = useState<any>(null);
  const [yesterday, setYesterday] = useState<number>(0);
  const [failedToday, setFailedToday] = useState<number>(0);
  const [weekly, setWeekly] = useState<number[]>([]);
  const [configs, setConfigs] = useState({ mpesa: false, mikrotik: false, packages: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kicking, setKicking] = useState<Set<string>>(new Set());
  const [time, setTime] = useState(new Date());
  const [showSetup, setShowSetup] = useState(false);
  const [showMikrotikDrawer, setShowMikrotikDrawer] = useState(false);
  const [showMpesaDrawer, setShowMpesaDrawer] = useState(false);
  const [showRouterDrawer, setShowRouterDrawer] = useState(false);
  const [routerHealth, setRouterHealth] = useState<any>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncAge, setSyncAge] = useState(0);
  const [mkForm, setMkForm] = useState({ router_ip: '', api_port: 8728, api_username: '', api_password: '' });
  const [mkTesting, setMkTesting] = useState(false);
  const [mkSaving, setMkSaving] = useState(false);
  const [mkStatus, setMkStatus] = useState<{ connected?: boolean; error?: string; router_identity?: string }>({});
  const [mpForm, setMpForm] = useState({ consumer_key: '', consumer_secret: '', shortcode: '', passkey: '', account_reference: '', payout_phone: '', payout_account_name: '' });
  const [mpTesting, setMpTesting] = useState(false);
  const [mpSaving, setMpSaving] = useState(false);
  const [mpStatus, setMpStatus] = useState<{ ok?: boolean; message?: string }>({});

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!lastSync) return;
    const t = setInterval(() => setSyncAge(Math.floor((Date.now() - lastSync.getTime()) / 1000)), 1000);
    return () => clearInterval(t);
  }, [lastSync]);

  const load = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      const [dd, ss, tt, trend7, inv, mpesaCfg, mkCfg, pkgs] = await Promise.all([
        api.getTenantDashboard(),
        api.getSessions({ status: 'active' }),
        api.getTransactions(0, 10),
        api.getRevenueTrend(7).catch(() => null),
        api.getInvoiceStatus().catch(() => null),
        api.getMpesaConfig().catch(() => null),
        api.getMikrotikConfig().catch(() => null),
        api.getPackages().catch(() => []),
      ]);

      setDash(dd);
      setSessions(Array.isArray(ss) ? ss : []);
      setTxns(Array.isArray(tt) ? tt : []);
      setInvoice(inv);

      if (trend7?.trend && trend7.trend.length >= 2) {
        setYesterday(trend7.trend[trend7.trend.length - 2]?.isp_earnings_ksh || 0);
      } else {
        setYesterday(0);
      }

      if (trend7?.trend) {
        const vals = trend7.trend.slice(-7).map((d: any) => d.isp_earnings_ksh || 0);
        setWeekly(vals);
      } else {
        setWeekly([]);
      }

      const failed = Array.isArray(tt) ? tt.filter((t: any) => (t.status || '').toLowerCase() === 'failed').length : 0;
      setFailedToday(failed);

      setConfigs({
        mpesa: mpesaCfg?.configured === true,
        mikrotik: mkCfg?.router_ip ? true : false,
        packages: Array.isArray(pkgs) ? pkgs.length : 0,
      });
    } catch (e: any) {
      showToast(e.message || 'Failed to load dashboard', { type: 'error' });
    } finally { setLoading(false); setRefreshing(false); setLastSync(new Date()); }
  }, [token, showToast]);

  useEffect(() => {
    load();
    const poll = setInterval(load, 30000);
    return () => clearInterval(poll);
  }, [load]);

  useEffect(() => {
    if (showSetup || showMikrotikDrawer || showMpesaDrawer) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showSetup, showMikrotikDrawer, showMpesaDrawer]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMikrotikDrawer) setShowMikrotikDrawer(false);
        else if (showMpesaDrawer) setShowMpesaDrawer(false);
        else setShowSetup(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showMikrotikDrawer, showMpesaDrawer]);

  useEffect(() => {
    if (!token) return;
    if (!api.getMikrotikHealth) return;
    const ping = async () => {
      try {
        const h = await api.getMikrotikHealth();
        setRouterHealth(h);
      } catch {
        setRouterHealth(null);
      }
    };
    ping();
    const t = setInterval(ping, 30000);
    return () => clearInterval(t);
  }, [token]);

  useEffect(() => {
    if (!showMikrotikDrawer) return;
    (async () => {
      try {
        const cfg = await api.getMikrotikConfig();
        if (cfg?.router_ip) {
          setMkForm({ router_ip: cfg.router_ip || '', api_port: cfg.api_port || 8728, api_username: cfg.api_username || '', api_password: '' });
        }
      } catch { /* no existing config */ }
    })();
  }, [showMikrotikDrawer]);

  useEffect(() => {
    if (!showMpesaDrawer) return;
    (async () => {
      try {
        const cfg = await api.getMpesaConfig();
        if (cfg?.consumer_key_enc || cfg?.shortcode) {
          setMpForm((p) => ({ ...p, shortcode: cfg.shortcode || '', account_reference: cfg.account_reference || '' }));
        }
      } catch { /* no existing config */ }
    })();
  }, [showMpesaDrawer]);

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
  const nwStatus = nw.status || 'unknown';
  const isNetworkUp = nwStatus === 'up';

  const today = dash?.today || { gross_ksh: 0, platform_fee_ksh: 0, isp_earnings_ksh: 0, count: 0 };
  const month = dash?.month || { gross_ksh: 0, platform_fee_ksh: 0, isp_earnings_ksh: 0, count: 0 };
  const activeCount = dash?.active_sessions ?? sessions.length;
  const invStatus = invoice?.status || 'none';

  const stepStatus = {
    mikrotik: configs.mikrotik,
    mpesa: configs.mpesa,
    packages: configs.packages > 0,
    portal: true,
    share: true,
  };

  const doneCount = Object.values(stepStatus).filter(Boolean).length;
  const totalSteps = steps.length;
  const allDone = doneCount === totalSteps;
  const barPercent = (doneCount / totalSteps) * 100;
  const nextStep = steps.find(s => !stepStatus[s.key as keyof typeof stepStatus]);

  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const vsYesterday = yesterday > 0 && today.isp_earnings_ksh > 0
    ? ((today.isp_earnings_ksh - yesterday) / yesterday * 100).toFixed(1)
    : null;

  const todayIdx = new Date().getDay();
  const weekStart = todayIdx === 0 ? 6 : todayIdx - 1;
  const weeklyDays = DAYS;

  const maxWeekly = Math.max(...weekly, 1);

  const ispName = user?.tenant_name || user?.isp_name || 'ISP';
  const timeOfDay = time.getHours();
  const greeting = timeOfDay < 12 ? 'Good morning' : timeOfDay < 18 ? 'Good afternoon' : timeOfDay < 21 ? 'Good evening' : 'Good night';
  const statusClause = activeCount > 0 ? ` · ${activeCount} session${activeCount !== 1 ? 's' : ''} active` : '';

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) setShowSetup(false);
  };

  const handleTestMikrotik = useCallback(async () => {
    setMkTesting(true);
    setMkStatus({});
    try {
      const res = await api.testMikrotikConnection();
      setMkStatus(res);
    } catch (e: any) {
      setMkStatus({ connected: false, error: e?.detail || 'Could not reach router' });
    } finally {
      setMkTesting(false);
    }
  }, []);

  const handleSaveMikrotik = useCallback(async () => {
    setMkSaving(true);
    try {
      try {
        await api.saveMikrotikConfig(mkForm);
      } catch {
        await api.updateMikrotikConfig(mkForm);
      }
      setShowMikrotikDrawer(false);
      setConfigs((p) => ({ ...p, mikrotik: true }));
      showToast('Router connected', { type: 'success' });
    } catch {
      showToast('Failed to save config', { type: 'error' });
    } finally {
      setMkSaving(false);
    }
  }, [mkForm, showToast]);

  const handleTestMpesa = useCallback(async () => {
    setMpTesting(true);
    setMpStatus({});
    try {
      await api.saveMpesaConfig(mpForm);
      const res = await api.testMpesaConnection();
      setMpStatus({ ok: res.status || false, message: res.message || (res.status ? 'Credentials verified' : 'Validation failed') });
    } catch {
      setMpStatus({ ok: false, message: 'Credential validation failed' });
    } finally {
      setMpTesting(false);
    }
  }, [mpForm]);

  const handleSaveMpesa = useCallback(async () => {
    setMpSaving(true);
    try {
      await api.saveMpesaConfig(mpForm);
      setShowMpesaDrawer(false);
      setConfigs((p) => ({ ...p, mpesa: true }));
      showToast('M-Pesa enabled', { type: 'success' });
    } catch {
      showToast('Failed to save config', { type: 'error' });
    } finally {
      setMpSaving(false);
    }
  }, [mpForm, showToast]);

  const skeletonBar = (h: number, delay: number) => ({
    width: '100%', height: `${h}%`,
    background: C.mute, borderRadius: '2px 2px 0 0',
    minHeight: 6,
    animation: `skel-pulse 2s ease-in-out infinite`,
    animationDelay: `${delay}s`,
  });

  const skeletonBlock = (w: string, h: number, r = 4, d = 0) => ({
    width: w, height: h, background: C.mute, borderRadius: r,
    animation: 'skel-pulse 2s ease-in-out infinite',
    animationDelay: `${d}s`,
  });

  if (loading && !dash) {
    const skelOuter: React.CSSProperties = {
      background: C.void, color: C.dim, minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
    };
    const skelPage: React.CSSProperties = {
      flex: 1, overflowY: 'auto', padding: '28px 32px',
      maxWidth: 1240, margin: '0 auto', width: '100%',
    };
    const skelCard: React.CSSProperties = {
      background: C.base, border: `0.5px solid ${C.border}`,
      borderRadius: 11, padding: 16,
    };
    return (
      <div style={skelOuter}>
        <style>{`@keyframes skel-pulse { 0%,100% { opacity: 0.25; } 50% { opacity: 0.55; } }`}</style>
        <Topbar title="Dashboard" />
        <div className="dashboard-content" style={skelPage}>
          {/* header skeleton */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <div style={skeletonBlock('160px', 22, 4, 0)} />
              <div style={{ ...skeletonBlock('120px', 14, 4, 0.15), marginTop: 8 }} />
            </div>
            <div style={skeletonBlock('80px', 26, 13, 0.3)} />
          </div>
          {/* hero card skeleton */}
          <div style={{ ...skelCard, padding: 20, marginBottom: 20 }}>
            <div style={skeletonBlock('120px', 11, 4, 0.1)} />
            <div style={{ ...skeletonBlock('200px', 40, 4, 0.2), marginTop: 12, marginBottom: 10 }} />
            <div style={skeletonBlock('300px', 11, 4, 0.3)} />
          </div>
          {/* bar chart skeleton */}
          <div style={{ ...skelCard, marginBottom: 20 }}>
            <div style={skeletonBlock('140px', 11, 4, 0.15)} />
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 40, marginTop: 12 }}>
              {[30, 50, 20, 60, 40, 70, 35].map((h, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={skeletonBar(h, i * 0.1)} />
                </div>
              ))}
            </div>
          </div>
          {/* 4-card row skeleton */}
          <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[0.1, 0.2, 0.3, 0.4].map((d, i) => (
              <div key={i} style={skelCard}>
                <div style={skeletonBlock('60%', 11, 4, d)} />
                <div style={{ ...skeletonBlock('40%', 22, 4, d + 0.05), marginTop: 8, marginBottom: 4 }} />
                <div style={skeletonBlock('70%', 11, 4, d + 0.1)} />
              </div>
            ))}
          </div>
          {/* 2-column panels skeleton */}
          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[[0.1, 0.2], [0.3, 0.4]].map((delays, col) => (
              <div key={col} style={skelCard}>
                <div style={skeletonBlock('50%', 11, 4, delays[0])} />
                {[1, 2, 3].map((row) => (
                  <div key={row} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: `0.5px solid ${C.border}` }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.mute, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${delays[0] + row * 0.1}s` }} />
                    <div style={{ flex: 1 }}>
                      <div style={skeletonBlock('40%', 11, 4, delays[0] + row * 0.1)} />
                      <div style={{ ...skeletonBlock('60%', 11, 4, delays[1] + row * 0.1), marginTop: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: C.void, color: C.text, minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, sans-serif',
      display: 'flex', flexDirection: 'column', flex: 1,
      position: 'relative',
    }}>
      <Topbar title="Dashboard" />

      <div className="dashboard-content" style={{
        flex: 1, overflowY: 'auto', padding: '28px 32px',
        maxWidth: 1240, margin: '0 auto', width: '100%',
      }}>

        {invStatus === 'overdue' && invoice && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.12))',
            border: '0.5px solid rgba(239,68,68,0.2)', borderRadius: 11,
            padding: '14px 20px', marginBottom: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <XCircle size={18} color={C.red} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.red }}>
                  Account overdue — {invoice.amount_due ? ksh(invoice.amount_due) : ''} due
                </div>
                <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.red, marginTop: 2 }}>
                  {invoice.days_overdue || invoice.days_left || '?'} days overdue
                  {invoice.is_locked ? ' · Portal suspended' : ''}
                </div>
              </div>
            </div>
            <a href="/dashboard/billing" style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: 'rgba(239,68,68,0.15)', color: C.red,
              textDecoration: 'none', letterSpacing: '0.05em',
            }}>Pay Now →</a>
          </div>
        )}

        {/* ── STATUS PILL + SETUP BUTTON ── */}
        <div className="flex-row-desktop dashboard-status-row" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 28, gap: 12,
        }}>
          <div>
            <div style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: '-0.02em',
            }}>
              {greeting}, {ispName}
            </div>
            <div style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: C.dim, marginTop: 2 }}>
              {dateStr} · {timeStr}{statusClause}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={load} disabled={refreshing} title="Refresh dashboard" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 26, height: 26, borderRadius: '50%',
              border: `0.5px solid ${C.border}`,
              background: 'transparent',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              color: C.dim, padding: 0,
              animation: refreshing ? 'spin 1s linear infinite' : 'none',
            }}>
              <RefreshCw size={12} />
            </button>
            {!isNetworkUp && (
              <button onClick={() => configs.mikrotik && setShowRouterDrawer(true)} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 20,
                background: configs.mikrotik ? 'rgba(239,68,68,0.08)' : 'var(--theme-surface)',
                border: `0.5px solid ${configs.mikrotik ? 'rgba(239,68,68,0.2)' : C.border}`,
                fontSize: 10, fontFamily: 'DM Mono, monospace',
                fontWeight: 600, color: configs.mikrotik ? C.red : C.dim,
                cursor: configs.mikrotik ? 'pointer' : 'default',
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: configs.mikrotik ? C.red : C.dim, display: 'inline-block',
                }} />
                {configs.mikrotik ? 'Router unreachable' : 'Router not connected'}
              </button>
            )}
            {isNetworkUp && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 20,
                background: 'rgba(34,197,94,0.06)',
                border: '0.5px solid rgba(34,197,94,0.2)',
                fontSize: 10, fontFamily: 'DM Mono, monospace',
                fontWeight: 600, color: C.green,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.green, display: 'inline-block' }} />
                Connected{nw.latency_ms ? ` · ${nw.latency_ms}ms` : ''}
              </div>
            )}

            {!allDone && (
              <button onClick={() => setShowSetup(true)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 14px 5px 12px', borderRadius: 20,
                background: 'rgba(232,184,75,0.1)', border: '0.5px solid rgba(232,184,75,0.2)',
                fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 700,
                color: C.gold, cursor: 'pointer',
              }}>
                <Settings size={11} />
                Complete Setup
                <span style={{
                  padding: '1px 5px', borderRadius: 6,
                  background: C.gold, color: C.void, fontSize: 8,
                  fontFamily: 'DM Mono, monospace', fontWeight: 800,
                }}>
                  {doneCount}/{totalSteps}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ═══ TODAY'S REVENUE (hero) ═══ */}
        <div style={{
          background: 'var(--theme-card-base)',
          border: '0.5px solid var(--theme-border)',
          borderRadius: 11, padding: 20,
          marginBottom: 20,
          borderTop: '2px solid var(--theme-gold)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 11, fontWeight: 700, color: C.dim,
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
              }}>
                Today's Revenue
              </div>
              <div className="hero-value" style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: 40, fontWeight: 500, color: C.gold,
                letterSpacing: '-0.04em', lineHeight: 1,
              }}>
                {ksh(today.gross_ksh)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: C.dim }}>
                  Net: <span style={{ color: C.green, fontFamily: 'DM Mono, monospace' }}>{ksh(today.isp_earnings_ksh)}</span>
                </span>
                <span style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: C.dim }}>
                  Fee: <span style={{ color: C.dim, fontFamily: 'DM Mono, monospace' }}>{ksh(today.platform_fee_ksh)}</span>
                </span>
                <span style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: C.dim }}>
                  {today.count} transaction{today.count !== 1 ? 's' : ''}
                </span>
                {vsYesterday && (
                  <span style={{
                    fontSize: 10, fontFamily: 'DM Mono, monospace',
                    color: Number(vsYesterday) >= 0 ? C.green : C.red,
                    padding: '2px 8px', borderRadius: 4,
                    background: Number(vsYesterday) >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  }}>
                    {Number(vsYesterday) >= 0 ? '+' : ''}{vsYesterday}% vs yesterday
                  </span>
                )}
              </div>
            </div>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(232,184,75,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TrendingUp size={18} color={C.gold} />
            </div>
          </div>
        </div>

        {/* ═══ CASH FLOW THIS WEEK (slim bars) ═══ */}
        <div style={{
          background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11,
          padding: 16, marginBottom: 20,
        }}>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 11, fontWeight: 700, color: C.dim,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
          }}>
            Cash Flow This Week
          </div>
          {weekly.length === 0 || weekly.every(v => v === 0) ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <TrendingUp size={16} color={C.mute} style={{ marginBottom: 6 }} />
              <div style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: C.dim, fontWeight: 600 }}>No data this week</div>
              <div style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', color: C.mute, marginTop: 2 }}>
                Revenue data will appear here once payments start flowing
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 40 }}>
              {weeklyDays.map((day, i) => {
                const val = weekly[i] || 0;
                const pct = (val / maxWeekly) * 100;
                const isToday = i === weekStart;
                return (
                  <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{
                      width: '100%', height: `${Math.max(pct, 6)}%`,
                      background: isToday ? C.gold : C.mute,
                      borderRadius: '2px 2px 0 0',
                      minHeight: 6,
                      opacity: isToday ? 1 : 0.4,
                      transition: 'height 0.3s ease',
                      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                    }}>
                      {val > 0 && (
                        <span style={{
                          fontSize: 6, fontFamily: 'DM Mono, monospace',
                          color: isToday ? C.void : C.dim,
                          fontWeight: 700, marginBottom: 1,
                        }}>
                          {ksh(val)}
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontSize: 8, fontFamily: 'DM Mono, monospace',
                      color: isToday ? C.gold : C.mute,
                      fontWeight: isToday ? 700 : 500,
                    }}>
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══ SUPPORTING CARDS ═══ */}
        <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Yesterday', value: ksh(yesterday), sub: 'Net earnings', color: C.dim },
            { label: 'This Month', value: ksh(month.isp_earnings_ksh), sub: `${month.count} transactions`, color: C.gold },
            { label: 'Active Sessions', value: fmt(activeCount), sub: sessions.length > 0 ? `${sessions.length} online now` : 'No active sessions', color: C.green },
            { label: 'Failed Today', value: fmt(failedToday), sub: failedToday > 0 ? `${failedToday} payment${failedToday > 1 ? 's' : ''} failed` : 'All payments successful', color: failedToday > 0 ? C.red : C.dim },
          ].map((c, i) => (
            <div key={i} style={{
              background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11,
              padding: 16, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: C.dim,
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
                fontFamily: 'Inter, sans-serif',
              }}>
                {c.label}
              </div>
              <div style={{
                fontSize: 22, fontFamily: 'DM Mono, monospace', fontWeight: 500,
                color: c.color, letterSpacing: '-0.03em', lineHeight: 1.1,
              }}>
                {c.value}
              </div>
              <div style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: C.dim, marginTop: 4 }}>
                {c.sub}
              </div>
            </div>
          ))}
        </div>

        {/* ═══ LIVE SESSIONS + RECENT PAYMENTS ═══ */}
        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, color: C.dim,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                fontFamily: 'Inter, sans-serif',
              }}>
                Live Sessions
              </span>
              <span style={{
                padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 700,
                background: sessions.length > 0 ? 'rgba(34,197,94,0.1)' : 'var(--theme-surface)',
                color: sessions.length > 0 ? C.green : C.dim,
                fontFamily: 'DM Mono, monospace',
              }}>
                {sessions.length} online
              </span>
            </div>
            {sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <Wifi size={18} color={C.mute} style={{ marginBottom: 6 }} />
                <div style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: C.dim, fontWeight: 600 }}>No one connected</div>
                <div style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: C.mute, marginTop: 2 }}>
                  Sessions will appear here when customers connect
                </div>
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
                      padding: '6px 0', borderBottom: `0.5px solid ${C.border}`,
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: remaining > 0 ? C.green : C.red, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#888' }}>
                          {maskPhone(s.phone_number || s.mac_address || '—')}
                        </div>
                        <div style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: C.dim, marginTop: 1 }}>
                          {s.package_name || 'Unknown'} · {timeLeft}
                        </div>
                      </div>
                      <button onClick={() => handleKick(s.id)} disabled={isKicking} style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 9, fontWeight: 600,
                        background: isKicking ? 'var(--theme-surface)' : 'rgba(239,68,68,0.06)',
                        color: isKicking ? C.dim : C.red,
                        border: isKicking ? `0.5px solid ${C.border}` : '0.5px solid rgba(239,68,68,0.12)',
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

          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, color: C.dim,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                fontFamily: 'Inter, sans-serif',
              }}>
                Recent Payments
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {txns.length > 0 && (
                  <button onClick={() => {}} title="Export CSV" style={{
                    width: 22, height: 22, borderRadius: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'transparent', border: 'none', color: C.dim, cursor: 'pointer', padding: 0,
                  }}>
                    <Download size={12} />
                  </button>
                )}
                <Receipt size={13} color={C.dim} />
              </div>
            </div>
            {txns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <DollarSign size={18} color={C.mute} style={{ marginBottom: 6 }} />
                <div style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: C.dim, fontWeight: 600 }}>No payments yet</div>
                <div style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: C.mute, marginTop: 2 }}>
                  Payments will appear here when customers connect
                </div>
              </div>
            ) : (
              <div>
                {txns.slice(0, 8).map((t: any) => {
                  const st = (t.status || '').toLowerCase();
                  const success = st === 'success' || st === 'completed';
                  const failed = st === 'failed';
                  return (
                    <div key={t.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '6px 0', borderBottom: `0.5px solid ${C.border}`,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#888' }}>
                          {maskPhone(t.phone_number || '—')}
                        </div>
                        <div style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: C.dim, marginTop: 1 }}>
                          {t.package_name || t.mpesa_receipt || t.id?.slice(0, 8) || '—'}
                          {t.created_at ? ` · ${new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: C.text, fontWeight: 500 }}>
                        {ksh(t.amount_ksh || t.amount || 0)}
                      </div>
                      <div style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 8, fontWeight: 700,
                        textTransform: 'uppercase',
                        background: success ? 'rgba(34,197,94,0.1)' : failed ? 'rgba(239,68,68,0.08)' : 'rgba(232,184,75,0.08)',
                        color: success ? C.green : failed ? C.red : C.gold,
                      }}>
                        {success ? 'Paid' : failed ? 'Failed' : 'Pending'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ═══ QUICK ACTIONS ═══ */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.dim,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
            fontFamily: 'Inter, sans-serif',
          }}>
            Quick Actions
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
            <a href="/dashboard/portal-preview" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: C.base, border: `0.5px solid ${C.border}`,
              color: C.dim, textDecoration: 'none',
            }}>
              <Link size={13} color={C.dim} /> Share Link <ChevronRight size={11} color={C.mute} />
            </a>
            {!configs.mikrotik && (
              <button onClick={() => setShowMikrotikDrawer(true)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                background: 'rgba(232,184,75,0.04)', border: '0.5px solid rgba(232,184,75,0.12)',
                color: C.gold, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>
                <Router size={13} /> Connect MikroTik <ChevronRight size={11} color={C.gold} />
              </button>
            )}
            {!configs.mpesa && (
              <button onClick={() => setShowMpesaDrawer(true)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                background: 'rgba(232,184,75,0.04)', border: '0.5px solid rgba(232,184,75,0.12)',
                color: C.gold, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>
                <CreditCard size={13} /> Set up M-Pesa <ChevronRight size={11} color={C.gold} />
              </button>
            )}
            {configs.mpesa && (
              <button onClick={() => {}} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                background: C.base, border: `0.5px solid ${C.border}`,
                color: C.dim, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>
                <Users size={13} color={C.dim} /> Invite Staff <ChevronRight size={11} color={C.mute} />
              </button>
            )}
            {configs.mpesa && (
              <button onClick={() => {}} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                background: C.base, border: `0.5px solid ${C.border}`,
                color: C.dim, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>
                <Download size={13} color={C.dim} /> Export Report <ChevronRight size={11} color={C.mute} />
              </button>
            )}
            {configs.packages === 0 && (
              <a href="/dashboard/packages" style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                background: 'rgba(232,184,75,0.04)', border: '0.5px solid rgba(232,184,75,0.12)',
                color: C.gold, textDecoration: 'none',
              }}>
                <Package size={13} /> Add Packages <ChevronRight size={11} color={C.gold} />
              </a>
            )}
          </div>
        </div>

        {lastSync && (
          <div style={{ textAlign: 'right', marginTop: 12, fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.mute }}>
            Synced {syncAge}s ago
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* GLASS OVERLAY — Complete Setup              */}
      {/* ════════════════════════════════════════════ */}
      {showSetup && (
        <div ref={overlayRef} onClick={handleOverlayClick} style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: 24,
        }}>
          <div style={{
            width: '100%', maxWidth: 560,
            background: 'rgba(10,10,10,0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '0.5px solid rgba(232,184,75,0.15)',
            borderRadius: 16,
            padding: '24px 20px 20px',
            boxShadow: '0 0 60px rgba(232,184,75,0.04), 0 0 0 1px rgba(232,184,75,0.03) inset',
            position: 'relative',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <button onClick={() => setShowSetup(false)} style={{
              position: 'absolute', top: 14, right: 14,
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: C.dim,
            }}>
              <X size={14} />
            </button>

            <div style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: 18, fontWeight: 700, color: C.text,
              marginBottom: 4,
            }}>
              Complete Setup
            </div>
            <div style={{ fontSize: 12, color: C.dim, marginBottom: 20, fontFamily: 'Inter, sans-serif' }}>
              {doneCount} of {totalSteps} steps done — finish these to start earning
            </div>

            <div style={{
              height: 3, background: C.mute, borderRadius: 2,
              marginBottom: 20, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${barPercent}%`,
                background: C.gold, borderRadius: 2,
                transition: 'width 0.4s ease',
              }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {steps.map((s) => {
                const done = stepStatus[s.key as keyof typeof stepStatus];
                const isCurrent = !done && s.key === nextStep?.key;
                return (
                  <div key={s.key} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px', borderRadius: 10,
                    background: isCurrent ? 'rgba(232,184,75,0.04)' : 'transparent',
                    border: isCurrent ? '0.5px solid rgba(232,184,75,0.15)' : '0.5px solid transparent',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: done ? C.gold : isCurrent ? 'rgba(232,184,75,0.1)' : C.mute,
                      flexShrink: 0,
                    }}>
                      {done ? <Check size={14} color={C.void} /> : isCurrent ? (
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: C.gold }} />
                      ) : (
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: C.mute }} />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: done ? C.dim : C.text, textDecoration: done ? 'line-through' : 'none' }}>
                        {s.label}
                      </div>
                      <div style={{ fontSize: 10, color: C.dim, marginTop: 1 }}>{s.desc}</div>
                    </div>

                    {!done && (
                      <a href={s.href} onClick={() => setShowSetup(false)} style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                        background: isCurrent ? C.gold : 'rgba(232,184,75,0.06)',
                        color: isCurrent ? C.void : C.gold,
                        textDecoration: 'none', whiteSpace: 'nowrap',
                        border: isCurrent ? 'none' : '0.5px solid rgba(232,184,75,0.15)',
                      }}>
                        {isCurrent ? 'Set up' : 'Configure'}
                      </a>
                    )}
                    {done && <div style={{ fontSize: 10, color: C.dim, fontFamily: 'DM Mono, monospace' }}>Done</div>}
                  </div>
                );
              })}
            </div>

            {allDone && (
              <div style={{
                marginTop: 20, textAlign: 'center', padding: '16px', borderRadius: 10,
                background: 'rgba(232,184,75,0.04)', border: '0.5px solid rgba(232,184,75,0.1)',
              }}>
                <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 15, fontWeight: 700, color: C.gold }}>
                  All set — your first customer is waiting
                </div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>
                  Share your portal link to start accepting payments
                </div>
                <a href="/dashboard/portal-preview" onClick={() => setShowSetup(false)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  marginTop: 12, padding: '8px 18px', borderRadius: 8,
                  background: C.gold, color: C.void, fontSize: 12, fontWeight: 700,
                  textDecoration: 'none',
                }}>
                  <Link size={13} /> Share your link
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* ROUTER STATUS DRAWER                        */}
      {/* ════════════════════════════════════════════ */}
      <Drawer open={showRouterDrawer} onClose={() => setShowRouterDrawer(false)}>
        <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          <Router size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} color={C.red} />
          Router Status
        </div>
        <div style={{ fontSize: 12, color: C.dim, marginBottom: 20, fontFamily: 'Inter, sans-serif' }}>
          Your MikroTik router is currently unreachable
        </div>

        <div style={{ background: 'var(--theme-surface)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: C.dim, fontFamily: 'Inter, sans-serif' }}>Status</span>
            <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.red, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.red, display: 'inline-block' }} />
              Unreachable
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: C.dim, fontFamily: 'Inter, sans-serif' }}>Router Identity</span>
            <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: routerHealth?.router_identity || C.dim }}>
              {routerHealth?.router_identity || '\u2014'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: C.dim, fontFamily: 'Inter, sans-serif' }}>Bridge Tunnel</span>
            <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: routerHealth?.bridge_uptime ? C.green : C.dim }}>
              {routerHealth?.bridge_uptime || 'Unavailable'}
            </span>
          </div>
        </div>

        {lastSync && (
          <div style={{ fontSize: 10, color: C.dim, fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>
            Last reachable: {lastSync.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setShowRouterDrawer(false); setShowMikrotikDrawer(true) }} style={{
            flex: 1, padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: C.gold, border: 'none', color: C.void, fontFamily: 'Inter, sans-serif',
          }}>
            Reconnect Router
          </button>
          <button onClick={() => { setShowRouterDrawer(false) }} style={{
            flex: 1, padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: 'rgba(232,184,75,0.06)', border: '0.5px solid rgba(232,184,75,0.15)',
            color: C.gold, fontFamily: 'Inter, sans-serif',
          }}>
            Dismiss
          </button>
        </div>
      </Drawer>

      {/* ════════════════════════════════════════════ */}
      {/* MIKROTIK CONNECTION DRAWER                  */}
      {/* ════════════════════════════════════════════ */}
      <Drawer open={showMikrotikDrawer} onClose={() => setShowMikrotikDrawer(false)}>
        <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          <Router size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} color={C.gold} />
          Connect MikroTik
        </div>
        <div style={{ fontSize: 12, color: C.dim, marginBottom: 20, fontFamily: 'Inter, sans-serif' }}>
          Enter your MikroTik RouterOS credentials to link your router
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Router IP Address</div>
            <input value={mkForm.router_ip} onChange={(e) => setMkForm({ ...mkForm, router_ip: e.target.value })}
              placeholder="192.168.88.1"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: C.void, border: `0.5px solid ${C.border}`, color: C.text, fontSize: 13, fontFamily: 'DM Mono, monospace', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>API Port</div>
            <input value={mkForm.api_port} onChange={(e) => setMkForm({ ...mkForm, api_port: Number(e.target.value) })}
              placeholder="8728"
              type="number" min={1} max={65535}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: C.void, border: `0.5px solid ${C.border}`, color: C.text, fontSize: 13, fontFamily: 'DM Mono, monospace', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Username</div>
            <input value={mkForm.api_username} onChange={(e) => setMkForm({ ...mkForm, api_username: e.target.value })}
              placeholder="admin"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: C.void, border: `0.5px solid ${C.border}`, color: C.text, fontSize: 13, fontFamily: 'DM Mono, monospace', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Password</div>
            <input value={mkForm.api_password} onChange={(e) => setMkForm({ ...mkForm, api_password: e.target.value })}
              placeholder="••••••••"
              type="password"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: C.void, border: `0.5px solid ${C.border}`, color: C.text, fontSize: 13, fontFamily: 'DM Mono, monospace', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {(mkStatus.connected || mkStatus.error) && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 11, fontFamily: 'Inter, sans-serif',
            background: mkStatus.connected ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `0.5px solid ${mkStatus.connected ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            color: mkStatus.connected ? C.green : C.red,
          }}>
            {mkStatus.connected ? '✓ ' + (mkStatus.router_identity || 'Connected') : '✕ ' + (mkStatus.error || 'Failed')}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleTestMikrotik} disabled={mkTesting}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: 'rgba(232,184,75,0.06)', border: '0.5px solid rgba(232,184,75,0.15)',
              color: C.gold, fontFamily: 'Inter, sans-serif',
            }}>
            {mkTesting ? 'Testing...' : 'Test Connection'}
          </button>
          <button onClick={handleSaveMikrotik} disabled={mkSaving || !mkStatus.connected}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: C.gold, border: 'none', color: C.void, fontFamily: 'Inter, sans-serif',
              opacity: mkSaving || !mkStatus.connected ? 0.5 : 1,
            }}>
            {mkSaving ? 'Saving...' : 'Save & Connect'}
          </button>
        </div>
      </Drawer>

      {/* ════════════════════════════════════════════ */}
      {/* M-PESA SETUP DRAWER                         */}
      {/* ════════════════════════════════════════════ */}
      <Drawer open={showMpesaDrawer} onClose={() => setShowMpesaDrawer(false)}>
        <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          <CreditCard size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} color={C.gold} />
          Set Up M-Pesa
        </div>
        <div style={{ fontSize: 12, color: C.dim, marginBottom: 20, fontFamily: 'Inter, sans-serif' }}>
          Enter your Safaricom API credentials to accept STK Push payments
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Consumer Key</div>
            <input value={mpForm.consumer_key} onChange={(e) => setMpForm({ ...mpForm, consumer_key: e.target.value })}
              placeholder="••••••••••••••••"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: C.void, border: `0.5px solid ${C.border}`, color: C.text, fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Consumer Secret</div>
            <input value={mpForm.consumer_secret} onChange={(e) => setMpForm({ ...mpForm, consumer_secret: e.target.value })}
              placeholder="••••••••••••••••"
              type="password"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: C.void, border: `0.5px solid ${C.border}`, color: C.text, fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Shortcode</div>
              <input value={mpForm.shortcode} onChange={(e) => setMpForm({ ...mpForm, shortcode: e.target.value })}
                placeholder="174379"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: C.void, border: `0.5px solid ${C.border}`, color: C.text, fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Passkey</div>
              <input value={mpForm.passkey} onChange={(e) => setMpForm({ ...mpForm, passkey: e.target.value })}
                placeholder="••••••••••••••••"
                type="password"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: C.void, border: `0.5px solid ${C.border}`, color: C.text, fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Account Reference (appears on customer statement)</div>
            <input value={mpForm.account_reference} onChange={(e) => setMpForm({ ...mpForm, account_reference: e.target.value })}
              placeholder="WiBill"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: C.void, border: `0.5px solid ${C.border}`, color: C.text, fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {mpStatus.message && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 11, fontFamily: 'Inter, sans-serif',
            background: mpStatus.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `0.5px solid ${mpStatus.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            color: mpStatus.ok ? C.green : C.red,
          }}>
            {mpStatus.ok ? '✓ ' : '✕ '}{mpStatus.message}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleTestMpesa} disabled={mpTesting || !mpForm.consumer_key || !mpForm.shortcode}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: 'rgba(232,184,75,0.06)', border: '0.5px solid rgba(232,184,75,0.15)',
              color: C.gold, fontFamily: 'Inter, sans-serif',
            }}>
            {mpTesting ? 'Validating...' : 'Test Credentials'}
          </button>
          <button onClick={handleSaveMpesa} disabled={mpSaving || !mpStatus.ok}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: C.gold, border: 'none', color: C.void, fontFamily: 'Inter, sans-serif',
              opacity: mpSaving || !mpStatus.ok ? 0.5 : 1,
            }}>
            {mpSaving ? 'Saving...' : 'Save & Enable'}
          </button>
        </div>
      </Drawer>
    </div>
  );
}