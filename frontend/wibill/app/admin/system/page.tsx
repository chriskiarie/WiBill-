'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const C = {
  black: '#000000', card: '#0D0D0B', border: '#2A2A27', line: '#1A1A18',
  text: '#EDEBE6', dim: '#8C8A84', mute: '#6B6964', faint: '#3A3A37',
  gold: '#E8B84B', green: '#6FCF73', red: '#E5707A',
};

const tabDefs = [
  { id: 'overview' as const, label: 'Overview' },
  { id: 'mpesa' as const, label: 'M-Pesa' },
  { id: 'security' as const, label: 'Security' },
  { id: 'notifications' as const, label: 'Notifications' },
  { id: 'danger' as const, label: 'Danger Zone', danger: true },
];
type TabId = (typeof tabDefs)[number]['id'];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [health, setHealth] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [mpesaEnv, setMpesaEnv] = useState<'sandbox' | 'live'>('sandbox');
  const [testMpesaResult, setTestMpesaResult] = useState<string | null>(null);
  const [testMpesaRunning, setTestMpesaRunning] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/health`);
        const d = await r.json();
        setHealth({
          status: d.status || 'error',
          database: d.database || 'disconnected',
          environment: d.environment || 'production',
          version: d.version || '0.1.0',
        });
      } catch {
        setHealth({ status: 'error', database: 'disconnected', environment: 'production', version: '0.1.0' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const runMpesaTest = async () => {
    setTestMpesaRunning(true);
    setTestMpesaResult(null);
    try {
      const token = localStorage.getItem('wb_token');
      const r = await fetch(`${API}/api/mpesa/test`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setTestMpesaResult('success');
      else setTestMpesaResult(`Failed: ${r.status} ${r.statusText}`);
    } catch {
      setTestMpesaResult('Failed: Network error');
    } finally {
      setTestMpesaRunning(false);
    }
  };

  const statusItems = [
    { label: 'API', value: (health.status || 'checking').toUpperCase(), color: health.status === 'ok' ? C.green : C.red },
    { label: 'DATABASE', value: (health.database || 'checking').toUpperCase(), color: health.database === 'connected' ? C.green : C.red },
    { label: 'ENVIRONMENT', value: (health.environment || 'unknown').toUpperCase(), color: C.gold },
    { label: 'VERSION', value: health.version || '—', color: C.text },
  ];

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1440 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontFamily: '"Space Grotesk", sans-serif', fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: '0.05em' }}>SETTINGS</h1>
        <p style={{ margin: '4px 0 0', fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.mute }}>
          System configuration · v0.1.0 · Production
        </p>
      </div>

      {/* Status strip */}
      <div style={{ height: 40, background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '0 20px', display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        {statusItems.map((item, i) => (
          <div key={item.label} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, height: '100%', borderRight: i < statusItems.length - 1 ? `1px solid ${C.line}` : 'none' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.mute }}>{item.label}</span>
            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 12, color: item.color }}>{loading ? '...' : item.value}</span>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Left: Vertical tabs */}
        <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {tabDefs.map(tab => {
            const isActive = activeTab === tab.id;
            const isDanger = tab.id === 'danger';
            const activeBorderColor = isDanger ? C.red : C.gold;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  height: 36, padding: '0 12px', border: 'none', borderRadius: 0, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: 13, textAlign: 'left',
                  display: 'flex', alignItems: 'center',
                  background: isActive
                    ? `rgba(232,184,75,${isDanger ? '0' : '0.06'})`
                    : 'transparent',
                  color: isDanger ? (isActive ? C.red : C.red) : (isActive ? C.gold : C.dim),
                  borderLeft: isActive ? `2px solid ${activeBorderColor}` : '2px solid transparent',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#111110';
                    if (!isDanger) e.currentTarget.style.color = C.text;
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    if (!isDanger) e.currentTarget.style.color = C.dim;
                  }
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right: Tab content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 24 }}>
              {/* System Stats */}
              <div>
                <h2 style={{ margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif', fontSize: 16, fontWeight: 700, color: C.text }}>System Stats</h2>
                <div style={{ borderTop: `0.5px solid ${C.line}` }}>
                  {[
                    { label: 'Uptime', value: '99.8%' },
                    { label: 'API Response Time', value: '45ms' },
                    { label: 'Transaction Volume', value: '2,847 (today)' },
                    { label: 'Active ISPs', value: '5' },
                    { label: 'Platform Mode', value: (health.environment || 'production').toUpperCase() },
                  ].map((row, i) => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 44, borderBottom: `0.5px solid ${C.line}` }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: C.dim }}>{row.label}</span>
                      <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 13, color: C.text }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h2 style={{ margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif', fontSize: 16, fontWeight: 700, color: C.text }}>Quick Actions</h2>
                <div style={{ borderTop: `0.5px solid ${C.line}` }}>
                  {[
                    { label: 'Refresh Health Check', action: () => window.location.reload() },
                    { label: 'View API Docs', action: () => window.open(`${API}/docs`, '_blank') },
                    { label: 'Download Logs', action: () => {} },
                    { label: 'Test M-Pesa Connection', action: runMpesaTest },
                  ].map((item, i) => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        height: 40, border: 'none', borderBottom: `0.5px solid ${C.line}`,
                        background: 'transparent', cursor: 'pointer', width: '100%', padding: '0',
                        fontFamily: 'Inter, sans-serif', fontSize: 13, color: C.text, textAlign: 'left',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = C.card; e.currentTarget.querySelector('.chev') && ((e.currentTarget.querySelector('.chev') as HTMLElement).style.color = C.gold); }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.querySelector('.chev') && ((e.currentTarget.querySelector('.chev') as HTMLElement).style.color = C.faint); }}
                    >
                      <span>{item.label}</span>
                      <span className="chev" style={{ color: C.faint, fontSize: 16, fontFamily: 'Inter, sans-serif' }}>›</span>
                    </button>
                  ))}
                </div>
                {testMpesaResult && (
                  <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, border: `0.5px solid ${testMpesaResult === 'success' ? C.green : C.red}`, background: testMpesaResult === 'success' ? `${C.green}10` : `${C.red}10`, fontFamily: '"DM Mono", monospace', fontSize: 11, color: testMpesaResult === 'success' ? C.green : C.red }}>
                    {testMpesaResult === 'success' ? '● Connection successful' : `● ${testMpesaResult}`}
                  </div>
                )}
                {testMpesaRunning && (
                  <div style={{ marginTop: 12, padding: '8px 12px', fontFamily: '"DM Mono", monospace', fontSize: 11, color: C.mute }}>
                    Testing connection...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* M-PESA */}
          {activeTab === 'mpesa' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {/* Environment Toggle */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: C.text }}>M-Pesa Environment</span>
                  <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: `0.5px solid ${C.border}` }}>
                    {(['sandbox', 'live'] as const).map(env => (
                      <button
                        key={env}
                        onClick={() => setMpesaEnv(env)}
                        style={{
                          padding: '6px 16px', border: 'none', cursor: 'pointer',
                          fontFamily: '"DM Mono", monospace', fontSize: 11, fontWeight: 700,
                          background: mpesaEnv === env ? C.gold : C.card,
                          color: mpesaEnv === env ? '#3D2A06' : C.mute,
                          letterSpacing: '0.06em',
                        }}
                      >
                        {env === 'sandbox' ? 'SANDBOX' : 'LIVE'}
                      </button>
                    ))}
                  </div>
                </div>
                <p style={{ margin: 0, fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.dim }}>
                  Currently in {mpesaEnv} mode. Transactions are {mpesaEnv === 'sandbox' ? 'simulated' : 'live'}.
                </p>
              </div>

              {/* Credentials */}
              <div>
                <h3 style={{ margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 700, color: C.text }}>Credentials</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Consumer Key', value: 'jd7...8hK' },
                    { label: 'Consumer Secret', value: 'aB9...xR2' },
                    { label: 'Passkey', value: '••••••••' },
                    { label: 'Shortcode', value: '174379' },
                  ].map(field => (
                    <div key={field.label}>
                      <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.dim, marginBottom: 6 }}>{field.label}</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="password"
                          defaultValue={field.value}
                          style={{
                            flex: 1, height: 40, padding: '0 12px', borderRadius: 6,
                            border: `0.5px solid ${C.border}`, background: C.black, color: C.text,
                            fontFamily: '"DM Mono", monospace', fontSize: 13, outline: 'none',
                          }}
                        />
                        <button
                          onClick={() => {
                            const input = document.activeElement as HTMLInputElement;
                            if (input) input.type = input.type === 'password' ? 'text' : 'password';
                          }}
                          style={{
                            height: 40, padding: '0 12px', borderRadius: 6,
                            border: `0.5px solid ${C.border}`, background: C.card, color: C.dim,
                            cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11,
                          }}
                        >
                          Show
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  style={{
                    marginTop: 16, height: 36, padding: '0 20px', borderRadius: 6,
                    border: `0.5px solid ${C.border}`, background: C.card, color: C.text,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12,
                  }}
                >
                  Save Credentials
                </button>
              </div>

              {/* Connection Test */}
              <div>
                <button
                  onClick={runMpesaTest}
                  disabled={testMpesaRunning}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    height: 40, padding: '0', border: 'none', borderBottom: `0.5px solid ${C.line}`,
                    background: 'transparent', cursor: testMpesaRunning ? 'not-allowed' : 'pointer', width: '100%',
                    fontFamily: 'Inter, sans-serif', fontSize: 13, color: C.text,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.gold; }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.text; }}
                >
                  <span>{testMpesaRunning ? 'Testing...' : 'Test M-Pesa Connection →'}</span>
                </button>
                {testMpesaResult && (
                  <div style={{ marginTop: 8, fontFamily: '"DM Mono", monospace', fontSize: 11, color: testMpesaResult === 'success' ? C.green : C.red }}>
                    {testMpesaResult === 'success' ? '● Connection successful' : `● ${testMpesaResult}`}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECURITY */}
          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div>
                <h3 style={{ margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 700, color: C.text }}>Admin Credentials</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Current Password', placeholder: 'Enter current password' },
                    { label: 'New Password', placeholder: 'Enter new password' },
                    { label: 'Confirm New Password', placeholder: 'Confirm new password' },
                  ].map(field => (
                    <div key={field.label}>
                      <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.dim, marginBottom: 6 }}>{field.label}</label>
                      <input type="password" placeholder={field.placeholder} style={{ width: '100%', maxWidth: 400, height: 40, padding: '0 12px', borderRadius: 6, border: `0.5px solid ${C.border}`, background: C.black, color: C.text, fontFamily: '"DM Mono", monospace', fontSize: 13, outline: 'none' }} />
                    </div>
                  ))}
                </div>
                <button style={{ marginTop: 16, height: 36, padding: '0 20px', borderRadius: 6, border: `0.5px solid ${C.border}`, background: C.card, color: C.text, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                  Update Password
                </button>
              </div>

              <div>
                <div style={{ borderTop: `0.5px solid ${C.line}`, paddingTop: 24 }}>
                  <h3 style={{ margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 700, color: C.text }}>API Keys</h3>
                  <p style={{ margin: '0 0 12px', fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.dim }}>Manage your platform API keys for programmatic access.</p>
                  <button style={{ height: 36, padding: '0 20px', borderRadius: 6, border: `0.5px solid ${C.border}`, background: C.card, color: C.text, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                    Generate New Key
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div>
              <h3 style={{ margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 700, color: C.text }}>Alert Email</h3>
              <input type="email" placeholder="admin@honestbill.co.ke" style={{ width: '100%', maxWidth: 400, height: 40, padding: '0 12px', borderRadius: 6, border: `0.5px solid ${C.border}`, background: C.black, color: C.text, fontFamily: '"DM Mono", monospace', fontSize: 13, outline: 'none', marginBottom: 24 }} />

              <div style={{ borderTop: `0.5px solid ${C.line}`, paddingTop: 24 }}>
                <h3 style={{ margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 700, color: C.text }}>Event Toggles</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[
                    { label: 'ISP approval pending', desc: 'When a new ISP registers and needs review' },
                    { label: 'Payment failure rate spike', desc: 'When failed transactions exceed 10% in an hour' },
                    { label: 'MikroTik disconnect', desc: 'When an ISP router goes offline' },
                    { label: 'New ISP signup', desc: 'When a new ISP completes registration' },
                  ].map((event, i) => (
                    <div key={event.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `0.5px solid ${C.line}` }}>
                      <div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: C.text }}>{event.label}</div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.mute }}>{event.desc}</div>
                      </div>
                      <div style={{
                        width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
                        background: C.gold, position: 'relative', transition: 'background 0.2s',
                      }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: '50%', background: '#fff',
                          position: 'absolute', top: 2, right: 2, transition: 'right 0.2s',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DANGER ZONE */}
          {activeTab === 'danger' && (
            <div style={{ border: `1px solid rgba(229,112,122,0.3)`, borderRadius: 8, padding: 24, background: C.black }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { label: 'Reset all feature flags', desc: 'Disable all premium features across all ISPs' },
                  { label: 'Suspend all ISPs', desc: 'Temporarily disable all partner access' },
                  { label: 'Wipe platform data', desc: 'Remove all transaction and session data' },
                ].map((action, i) => (
                  <div key={action.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: i < 2 ? `0.5px solid rgba(229,112,122,0.15)` : 'none' }}>
                    <div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: C.text }}>{action.label}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.red, opacity: 0.7 }}>{action.desc}</div>
                    </div>
                    <button
                      style={{
                        padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.red}`,
                        background: 'none', color: C.red, cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif', fontSize: 12,
                      }}
                    >
                      Reset
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
