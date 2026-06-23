'use client';
import { useEffect, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const C = {
  black: '#000', card: '#0D0D0B', border: '#2A2A27', line: '#1A1A18',
  text: '#EDEBE6', dim: '#8C8A84', mute: '#6B6964', faint: '#3A3A37',
  gold: '#E8B84B', green: '#6FCF73', red: '#E5707A',
};

function money(n?: number) {
  if (typeof n !== 'number' || Number.isNaN(n)) return 'KES 0';
  return `KES ${new Intl.NumberFormat('en-KE').format(Math.round(n))}`;
}

function healthTone(s?: string) {
  const v = (s || '').toUpperCase();
  if (v === 'OK' || v === 'UP' || v === 'ONLINE' || v === 'ACTIVE') return 'good';
  if (v === 'DEGRADED' || v === 'BACKLOGGED' || v === 'DELAYED') return 'warn';
  if (v === 'DOWN' || v === 'FAILING' || v === 'BLIND' || v === 'FAILED') return 'bad';
  return 'neutral';
}

const toneColor: Record<string, string> = { good: C.green, warn: C.gold, bad: C.red, neutral: C.faint };

export default function ExecutiveDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const token = localStorage.getItem('wb_token');
    if (!token) { setError('Login required.'); return; }
    setRefreshing(true);
    try {
      const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const [summaryRes, alertsRes] = await Promise.all([
        fetch(`${API}/api/admin/executive-summary`, { headers: h }),
        fetch(`${API}/api/admin/alerts?limit=20`, { headers: h }),
      ]);
      if (summaryRes.ok) {
        const d = await summaryRes.json();
        setData(d);
      }
      if (alertsRes.ok) {
        const a = await alertsRes.json();
        setAlerts(Array.isArray(a) ? a : []);
      }
      setError('');
    } catch { setError('Failed to load Batcave data'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  if (loading && !data) {
    return (
      <div style={{ padding: '28px 32px', maxWidth: 1440 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ height: 90, background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8 }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ height: 100, background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8 }} />
          ))}
        </div>
      </div>
    );
  }

  const h = data?.system_health || {};
  const healthItems = [
    { label: 'Payment System', value: h.payment_system || 'OK' },
    { label: 'Router System', value: h.router_system || 'OK' },
    { label: 'M-Pesa Callbacks', value: h.mpesa_callback_system || 'OK' },
    { label: 'Session Provisioning', value: h.session_provisioning || 'OK' },
    { label: 'Network Monitoring', value: h.network_monitoring || 'OK' },
  ];

  const moneyLayer = data?.money_layer || {};
  const opLayer = data?.operation_layer || {};
  const ispLayer = data?.isp_layer || {};
  const netLayer = data?.network_layer || {};

  const severityColor: Record<string, string> = {
    CRITICAL: C.red, HIGH: '#E8B84B', MEDIUM: C.gold, LOW: C.mute,
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1440, minHeight: '100%', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: '"Space Grotesk", sans-serif', fontSize: 22, fontWeight: 700, color: C.text }}>
          System Health Cockpit
        </h1>
        <button onClick={load} disabled={refreshing} style={{
          height: 32, padding: '0 12px', borderRadius: 6, border: `0.5px solid ${C.border}`,
          background: C.card, color: C.mute, fontFamily: 'Inter, sans-serif', fontSize: 11, cursor: 'pointer',
        }}>
          {refreshing ? 'REFRESHING...' : 'REFRESH'}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, border: `0.5px solid ${C.red}`, background: `${C.red}10`, color: C.red, fontSize: 12 }}>{error}</div>
      )}

      {/* A. System Health Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
        {healthItems.map(item => {
          const tone = healthTone(item.value);
          return (
            <div key={item.label} style={{
              background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '12px 14px',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: toneColor[tone] }} />
                <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 13, fontWeight: 600, color: toneColor[tone] }}>{item.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* B. 15 KPI Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        {/* Money Layer */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Money Layer</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {[
              { label: 'Revenue Today', value: money(moneyLayer.revenue_today_ksh), color: C.gold },
              { label: 'Revenue Month', value: money(moneyLayer.revenue_month_ksh), color: C.text },
              { label: 'Platform Fees Today', value: money(moneyLayer.platform_fees_today_ksh), color: C.gold },
              { label: 'Failed Payments Today', value: String(moneyLayer.failed_payments_today ?? 0), color: C.red },
              { label: 'Pending Payments', value: String(moneyLayer.pending_payments ?? 0), color: C.gold },
            ].map(c => (
              <div key={c.label} style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 18, fontWeight: 500, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Operation Layer */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Operation Layer</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: 'Active Sessions', value: String(opLayer.active_sessions ?? 0), color: C.green },
              { label: 'Pending Provisioning', value: String(opLayer.pending_provisioning ?? 0), color: C.gold },
              { label: 'Failed Provisioning Today', value: String(opLayer.failed_provisioning_today ?? 0), color: C.red },
              { label: 'Expired Sessions', value: String(opLayer.expired_sessions ?? 0), color: C.mute },
            ].map(c => (
              <div key={c.label} style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 18, fontWeight: 500, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ISP Layer */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>ISP Layer</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: 'Total ISPs', value: String(ispLayer.total_isps ?? 0), color: C.text },
              { label: 'Active ISPs', value: String(ispLayer.active_isps ?? 0), color: C.green },
              { label: 'Locked ISPs', value: String(ispLayer.locked_isps ?? 0), color: C.red },
              { label: 'Pending Approvals', value: String(ispLayer.pending_approval_isps ?? 0), color: C.gold },
            ].map(c => (
              <div key={c.label} style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 18, fontWeight: 500, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Network Layer */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Network Layer</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { label: 'Online ISPs', value: String(netLayer.online_isps ?? 0), color: C.green },
              { label: 'Offline ISPs', value: String(netLayer.offline_isps ?? 0), color: C.red },
              { label: 'Avg Uptime (24h)', value: `${netLayer.avg_uptime_pct ?? 0}%`, color: C.gold },
            ].map(c => (
              <div key={c.label} style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 18, fontWeight: 500, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* C. Critical Alerts Feed */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.red, fontFamily: '"Space Grotesk", sans-serif' }}>Critical Alerts</span>
          <span style={{ fontSize: 10, color: C.mute, fontFamily: '"DM Mono", monospace' }}>LIVE</span>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.red, animation: 'pulse 2s infinite' }} />
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>

        {alerts.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: C.mute, fontSize: 12, border: `0.5px dashed ${C.faint}`, borderRadius: 8 }}>
            No critical alerts — system nominal
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 140px', gap: 12, padding: '6px 12px', fontSize: 9, fontWeight: 700, color: C.faint, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <span>TYPE</span><span>MESSAGE</span><span>TENANT / TIME</span>
            </div>
            {alerts.slice(0, 15).map((a, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '100px 1fr 140px', gap: 12, alignItems: 'center',
                padding: '9px 12px', borderRadius: 6,
                background: a.severity === 'CRITICAL' ? `${C.red}08` : 'transparent',
                borderBottom: `0.5px solid ${C.line}`,
              }}>
                <span style={{
                  fontFamily: '"DM Mono", monospace', fontSize: 9, fontWeight: 700,
                  color: severityColor[a.severity] || C.mute,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  {a.type?.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: 11, color: C.text, lineHeight: 1.3 }}>{a.message}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: '"DM Mono", monospace' }}>{a.tenant_name}</div>
                  <div style={{ fontSize: 9, color: C.faint, fontFamily: '"DM Mono", monospace' }}>
                    {a.created_at ? new Date(a.created_at).toLocaleString('en-KE', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
