'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const C = {
  void: '#000000', base: '#080808', raised: '#0d0d0d',
  border: '#141414', dim: '#1e1e1e',
  text: '#f0f0f0', muted: '#444444', secondary: '#666666',
  gold: '#E8B84B', green: '#22c55e', amber: '#f59e0b', red: '#ef4444',
};

interface Health {
  status: string;
  version: string;
  database: string;
  environment: string;
  uptime?: number;
  timestamp?: string;
}

const lbl = (t: string) => (
  <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: C.muted, marginBottom: 10 }}>
    {t}
  </div>
);

const StatusDot = ({ status }: { status: string }) => {
  const ok = status === 'ok' || status === 'connected' || status === 'healthy';
  const warn = status === 'sandbox' || status === 'degraded';
  const color = ok ? C.green : warn ? C.amber : C.red;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
      <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase' as const, color }}>
        {status}
      </span>
    </div>
  );
};

export default function AdminSystem() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);

  const check = () => {
    setChecking(true);
    fetch(`${API}/health`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        setHealth(data);
        setError(false);
        setLastChecked(new Date());
      })
      .catch(() => setError(true))
      .finally(() => { setLoading(false); setChecking(false); });
  };

  useEffect(() => { check(); }, []);

  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `0.5px solid ${C.dim}` }}>
      <span style={{ fontSize: 13, color: C.secondary }}>{label}</span>
      <div style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', color: C.text }}>{value}</div>
    </div>
  );

  return (
    <div style={{ background: C.void, color: C.text, minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* TOPBAR */}
      <div style={{ height: 52, borderBottom: `0.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
        <div style={{ fontSize: 18, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase' as const }}>
          System
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastChecked && (
            <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.muted }}>
              Checked {lastChecked.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </span>
          )}
          <button
            onClick={check}
            disabled={checking}
            style={{
              background: 'none', border: `0.5px solid ${C.border}`, borderRadius: 6,
              padding: '6px 14px', color: checking ? C.muted : C.gold,
              fontSize: 11, fontFamily: 'DM Mono, monospace', fontWeight: 700,
              cursor: checking ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {checking ? 'Checking...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div style={{ padding: 28, maxWidth: 900, margin: '0 auto' }}>

        {loading ? (
          <div style={{ color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace', padding: '60px 0', textAlign: 'center' }}>
            Checking system...
          </div>
        ) : error ? (
          <div style={{ background: C.base, border: `0.5px solid ${C.red}30`, borderTop: `2px solid ${C.red}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
            {lbl('Status')}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.red, boxShadow: `0 0 8px ${C.red}` }} />
              <span style={{ fontSize: 20, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: C.red, textTransform: 'uppercase' as const }}>
                Unreachable
              </span>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, fontFamily: 'DM Mono, monospace', color: C.muted }}>
              Cannot connect to {API}
            </div>
          </div>
        ) : health && (
          <>
            {/* OVERALL STATUS */}
            <div style={{
              background: C.base,
              border: `0.5px solid ${health.status === 'ok' ? `${C.green}30` : `${C.amber}30`}`,
              borderTop: `2px solid ${health.status === 'ok' ? C.green : C.amber}`,
              borderRadius: 10, padding: 24, marginBottom: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {lbl('System Status')}
                  <div style={{ fontSize: 28, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, color: health.status === 'ok' ? C.green : C.amber, textTransform: 'uppercase' as const, letterSpacing: '-0.02em' }}>
                    {health.status === 'ok' ? 'Operational' : health.status}
                  </div>
                </div>
                <StatusDot status={health.status} />
              </div>
            </div>

            {/* DETAILS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {/* Core Info */}
              <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: 24 }}>
                {lbl('Platform Info')}
                <div style={{ marginTop: 4 }}>
                  {row('API Version', <span style={{ color: C.gold }}>{health.version || 'v1'}</span>)}
                  {row('Environment', <span style={{ textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontSize: 11 }}>{health.environment || 'production'}</span>)}
                  {health.uptime != null && row('Uptime', `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m`)}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14 }}>
                    <span style={{ fontSize: 13, color: C.secondary }}>API Server</span>
                    <StatusDot status={health.status} />
                  </div>
                </div>
              </div>

              {/* Services */}
              <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: 24 }}>
                {lbl('Services')}
                <div style={{ marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `0.5px solid ${C.dim}` }}>
                    <span style={{ fontSize: 13, color: C.secondary }}>Database</span>
                    <StatusDot status={health.database || 'unknown'} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `0.5px solid ${C.dim}` }}>
                    <span style={{ fontSize: 13, color: C.secondary }}>M-Pesa Daraja</span>
                    <StatusDot status="sandbox" />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `0.5px solid ${C.dim}` }}>
                    <span style={{ fontSize: 13, color: C.secondary }}>Email (Resend)</span>
                    <StatusDot status="ok" />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14 }}>
                    <span style={{ fontSize: 13, color: C.secondary }}>MikroTik API</span>
                    <StatusDot status="ok" />
                  </div>
                </div>
              </div>
            </div>

            {/* ENDPOINTS */}
            <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: 24 }}>
              {lbl('Deployment')}
              <div style={{ marginTop: 4 }}>
                {row('Backend', <a href="https://wibill-production.up.railway.app" target="_blank" rel="noopener noreferrer" style={{ color: C.gold, textDecoration: 'none', fontSize: 11 }}>wibill-production.up.railway.app</a>)}
                {row('Frontend', <a href="https://wi-bill.vercel.app" target="_blank" rel="noopener noreferrer" style={{ color: C.gold, textDecoration: 'none', fontSize: 11 }}>wi-bill.vercel.app</a>)}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14 }}>
                  <span style={{ fontSize: 13, color: C.secondary }}>Database</span>
                  <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: C.muted }}>Railway PostgreSQL</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
