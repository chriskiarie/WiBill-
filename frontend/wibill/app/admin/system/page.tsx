'use client'
import { useState, useEffect } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const C = {
  black: '#000', card: '#0D0D0B', border: '#2A2A27', line: '#1A1A18',
  text: '#EDEBE6', dim: '#8C8A84', mute: '#6B6964', faint: '#3A3A37',
  gold: '#E8B84B', green: '#6FCF73', red: '#E5707A',
}

const tabs = [
  { id: 'overview', label: 'Overview', icon: '⊞' },
  { id: 'mpesa', label: 'M-Pesa', icon: '◈' },
  { id: 'mikrotik', label: 'MikroTik', icon: '⌗' },
  { id: 'security', label: 'Security', icon: '◉' },
  { id: 'notifications', label: 'Notifications', icon: '⚙', badge: '4' },
  { id: 'email', label: 'Email / SMTP', icon: '✉' },
  { id: 'apikeys', label: 'API Keys', icon: '⚷' },
]

type TabId = (typeof tabs)[number]['id']

const qaGroups = [
  {
    label: 'Health',
    items: [
      { label: 'Refresh health check', icon: '↻', action: () => window.location.reload() },
      { label: 'View API docs', icon: '⌘', action: () => window.open(`${API}/docs`, '_blank') },
      { label: 'Download logs', icon: '☰', action: () => {} },
      { label: 'View changelog', icon: '⏱', action: () => {} },
    ],
  },
  {
    label: 'Integrations',
    items: [
      { label: 'Test M-Pesa', icon: '◈', action: () => {} },
      { label: 'Test MikroTik', icon: '⌗', action: () => {} },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Run DB migration', icon: '⛁', action: () => {} },
      { label: 'Clear cache', icon: '✕', action: () => {} },
    ],
  },
  {
    label: 'Danger',
    danger: true,
    items: [
      { label: 'Reset platform', icon: '⚠', action: () => {} },
    ],
  },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [health, setHealth] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [mpesaEnv, setMpesaEnv] = useState<'sandbox' | 'live'>('sandbox')

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/health`)
        const d = await r.json()
        setHealth({
          status: d.status || 'error',
          database: d.database || 'disconnected',
          environment: d.environment || 'production',
          version: d.version || '0.1.0',
        })
      } catch {
        setHealth({ status: 'error', database: 'disconnected', environment: 'production', version: '0.1.0' })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const statCards = [
    { label: 'Uptime', value: '99.8%', sub: '30-day rolling', highlight: true },
    { label: 'API Response', value: `45<span style="font-size:13px;color:#555">ms</span>`, sub: 'P95 latency' },
    { label: 'Active ISPs', value: '5', sub: '2 onboarding' },
    { label: 'Txn Volume', value: '2,847', sub: 'Today' },
  ]

  return (
    <div style={{ display: 'flex', height: '100%', color: C.text, fontSize: 13 }}>
      {/* Secondary Settings Nav */}
      <div style={{ width: 200, minWidth: 200, background: '#050505', borderRight: `0.5px solid ${C.line}`, padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px',
              fontSize: 12, color: activeTab === tab.id ? C.text : '#555',
              cursor: 'pointer', border: 'none', borderLeft: `2px solid ${activeTab === tab.id ? C.gold : 'transparent'}`,
              background: activeTab === tab.id ? '#111' : 'transparent',
              fontFamily: 'Inter, sans-serif', textAlign: 'left', width: '100%',
            }}
            onMouseEnter={e => { if (activeTab !== tab.id) { e.currentTarget.style.background = '#0a0a0a'; e.currentTarget.style.color = '#999' } }}
            onMouseLeave={e => { if (activeTab !== tab.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#555' } }}
          >
            <span style={{ fontSize: 15, width: 18, color: activeTab === tab.id ? C.gold : '#333' }}>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge && (
              <span style={{ marginLeft: 'auto', fontSize: 9, padding: '2px 6px', borderRadius: 3, background: '#1a0c00', color: C.gold, border: '0.5px solid #3a2000' }}>{tab.badge}</span>
            )}
          </button>
        ))}
        <div style={{ marginTop: 'auto', borderTop: `0.5px solid ${C.line}`, paddingTop: 14 }}>
          <button
            onClick={() => setActiveTab('danger')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px',
              fontSize: 12, color: activeTab === 'danger' ? C.red : '#7f1d1d',
              cursor: 'pointer', border: 'none', borderLeft: `2px solid ${activeTab === 'danger' ? C.red : 'transparent'}`,
              background: activeTab === 'danger' ? '#0f0505' : 'transparent',
              fontFamily: 'Inter, sans-serif', textAlign: 'left', width: '100%',
            }}
          >
            <span style={{ fontSize: 15, width: 18, color: '#7f1d1d' }}>⚠</span>
            <span>Danger Zone</span>
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px', background: '#030303' }}>
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
              {statCards.map(s => (
                <div key={s.label} style={{
                  flex: 1, background: '#080808', border: `0.5px solid ${C.line}`, borderRadius: 8, padding: '14px 16px',
                }}>
                  <div style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 500, color: s.highlight ? C.gold : C.text, fontFamily: '"DM Mono", monospace' }}
                    dangerouslySetInnerHTML={typeof s.value === 'string' && s.value.includes('<') ? { __html: s.value } : undefined}
                  >{typeof s.value === 'string' && !s.value.includes('<') ? s.value : undefined}</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>{s.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1, background: '#080808', border: `0.5px solid ${C.line}`, borderRadius: 10, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#ccc', marginBottom: 16 }}>System Status</div>
                <div style={{ borderTop: `0.5px solid ${C.line}` }}>
                  {[
                    { label: 'API Status', value: (health.status || 'checking').toUpperCase() },
                    { label: 'Database', value: (health.database || 'checking').toUpperCase() },
                    { label: 'Environment', value: (health.environment || 'unknown').toUpperCase() },
                    { label: 'Version', value: health.version || '—' },
                  ].map((row, i) => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 44, borderBottom: `0.5px solid ${C.line}` }}>
                      <span style={{ fontSize: 12, color: '#777' }}>{row.label}</span>
                      <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 12, color: C.text }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* M-PESA */}
        {activeTab === 'mpesa' && (
          <div style={{ background: '#080808', border: `0.5px solid ${C.line}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px 14px', borderBottom: `0.5px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#ccc' }}>M-Pesa Credentials</div>
                <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>Daraja API authentication — sandbox mode active</div>
              </div>
              <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: `0.5px solid ${C.line}` }}>
                {(['sandbox', 'live'] as const).map(env => (
                  <button
                    key={env}
                    onClick={() => setMpesaEnv(env)}
                    style={{
                      padding: '7px 16px', border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 500,
                      background: mpesaEnv === env ? '#1a1200' : 'transparent',
                      color: mpesaEnv === env ? C.gold : '#555',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    {env === 'sandbox' ? 'Sandbox' : 'Live'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Consumer Key', sub: 'Daraja API', value: '••••••••••••••••••••••••••' },
                { label: 'Consumer Secret', sub: 'Daraja API', value: '••••••••••••••••••••' },
                { label: 'Passkey', sub: 'STK Push', value: '••••••••••••••••••••' },
                { label: 'Shortcode', sub: 'Business number', value: '174379' },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 160, minWidth: 160, fontSize: 12, color: '#777' }}>
                    {f.label}
                    <span style={{ display: 'block', fontSize: 10, color: '#444', marginTop: 2 }}>{f.sub}</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="password" defaultValue={f.value} readOnly
                      style={{
                        flex: 1, background: '#0d0d0d', border: `0.5px solid #1e1e1e`, borderRadius: 6,
                        padding: '8px 12px', fontSize: 12, color: '#ccc', outline: 'none',
                        fontFamily: '"DM Mono", monospace',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 20px', borderTop: `0.5px solid ${C.line}`, background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, color: '#444' }}>
                Last saved: never · <span style={{ color: C.gold, cursor: 'pointer' }}>Test connection →</span>
              </div>
              <button style={{
                background: C.gold, color: '#000', border: 'none', borderRadius: 6,
                padding: '8px 18px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}>Save Credentials</button>
            </div>
          </div>
        )}

        {/* MIKROTIK */}
        {activeTab === 'mikrotik' && (
          <div style={{ background: '#080808', border: `0.5px solid ${C.line}`, borderRadius: 10, padding: 24, textAlign: 'center', color: '#555' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⌗</div>
            <div style={{ fontSize: 13, color: '#888' }}>MikroTik Configuration</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Configure default router connection settings.</div>
          </div>
        )}

        {/* SECURITY */}
        {activeTab === 'security' && (
          <div style={{ background: '#080808', border: `0.5px solid ${C.line}`, borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#ccc', marginBottom: 16 }}>Admin Credentials</div>
            {['Current Password', 'New Password', 'Confirm New Password'].map(label => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#777', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                <input type="password" placeholder={label} style={{
                  width: '100%', maxWidth: 400, background: '#0d0d0d', border: `0.5px solid #1e1e1e`,
                  borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#ccc', outline: 'none',
                  fontFamily: '"DM Mono", monospace',
                }} />
              </div>
            ))}
            <button style={{ marginTop: 8, background: C.gold, color: '#000', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              Update Password
            </button>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div style={{ background: '#080808', border: `0.5px solid ${C.line}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px 14px', borderBottom: `0.5px solid ${C.line}` }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#ccc' }}>Alert Notifications</div>
              <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>System events delivered to your admin email</div>
            </div>
            <div style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{ width: 160, minWidth: 160, fontSize: 12, color: '#777' }}>
                  Alert Email
                  <span style={{ display: 'block', fontSize: 10, color: '#444', marginTop: 2 }}>Primary contact</span>
                </div>
                <div style={{ flex: 1 }}>
                  <input type="email" defaultValue="admin@honestbill.co.ke" style={{
                    width: '100%', background: '#0d0d0d', border: `0.5px solid #1e1e1e`, borderRadius: 6,
                    padding: '8px 12px', fontSize: 12, color: '#ccc', outline: 'none',
                    fontFamily: '"DM Mono", monospace',
                  }} />
                </div>
              </div>
              <div style={{ borderTop: `0.5px solid #111`, paddingTop: 12 }}>
                {[
                  { label: 'ISP approval pending', desc: 'When a new ISP registers and needs review' },
                  { label: 'Payment failure rate spike', desc: 'When failed transactions exceed 10% in an hour' },
                  { label: 'MikroTik disconnect', desc: 'When an ISP router goes offline' },
                  { label: 'New ISP signup', desc: 'When a new ISP completes registration' },
                ].map((event, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 3 ? `0.5px solid #111` : 'none' }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#bbb' }}>{event.label}</div>
                      <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>{event.desc}</div>
                    </div>
                    <div style={{
                      width: 34, height: 19, borderRadius: 10, cursor: 'pointer',
                      background: C.gold, position: 'relative', flexShrink: 0,
                    }}>
                      <div style={{
                        width: 13, height: 13, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 3, right: 3,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: `0.5px solid ${C.line}`, background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, color: '#444' }}>Changes apply immediately</div>
              <button style={{
                background: C.gold, color: '#000', border: 'none', borderRadius: 6,
                padding: '8px 18px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}>Save Settings</button>
            </div>
          </div>
        )}

        {/* EMAIL / SMTP */}
        {activeTab === 'email' && (
          <div style={{ background: '#080808', border: `0.5px solid ${C.line}`, borderRadius: 10, padding: 24, textAlign: 'center', color: '#555' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✉</div>
            <div style={{ fontSize: 13, color: '#888' }}>Email / SMTP Configuration</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Configure outgoing mail server settings.</div>
          </div>
        )}

        {/* API KEYS */}
        {activeTab === 'apikeys' && (
          <div style={{ background: '#080808', border: `0.5px solid ${C.line}`, borderRadius: 10, padding: 24, textAlign: 'center', color: '#555' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚷</div>
            <div style={{ fontSize: 13, color: '#888' }}>API Keys</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Manage platform API keys for programmatic access.</div>
          </div>
        )}

        {/* DANGER ZONE */}
        {activeTab === 'danger' && (
          <div style={{ border: `1px solid rgba(229,112,122,0.3)`, borderRadius: 8, padding: 24, background: C.black }}>
            {[
              { label: 'Reset all feature flags', desc: 'Disable all premium features across all ISPs' },
              { label: 'Suspend all ISPs', desc: 'Temporarily disable all partner access' },
              { label: 'Wipe platform data', desc: 'Remove all transaction and session data' },
            ].map((action, i) => (
              <div key={action.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: i < 2 ? `0.5px solid rgba(229,112,122,0.15)` : 'none' }}>
                <div>
                  <div style={{ fontSize: 13, color: C.text }}>{action.label}</div>
                  <div style={{ fontSize: 12, color: C.red, opacity: 0.7 }}>{action.desc}</div>
                </div>
                <button style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.red}`, background: 'none', color: C.red, cursor: 'pointer', fontSize: 12 }}>
                  Reset
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions Sidebar */}
      <div style={{ width: 220, minWidth: 220, background: '#050505', borderLeft: `0.5px solid ${C.line}`, padding: '20px 0', overflowY: 'auto' }}>
        <div style={{ padding: '0 18px 14px', fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: `0.5px solid ${C.line}` }}>Quick Actions</div>
        {qaGroups.map((g, gi) => (
          <div key={gi}>
            <div style={{ padding: '14px 18px 8px', fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{g.label}</div>
            {g.items.map((item, ii) => (
              <button
                key={ii}
                onClick={item.action}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                  padding: '9px 18px', fontSize: 12, color: g.danger ? '#7f1d1d' : '#555',
                  background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#0a0a0a'; if (!g.danger) e.currentTarget.style.color = '#aaa' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; if (!g.danger) e.currentTarget.style.color = '#555' }}
              >
                <span style={{ fontSize: 14, width: 16, color: g.danger ? '#5f1d1d' : '#333' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
            {gi < qaGroups.length - 1 && <div style={{ height: '0.5px', background: C.line, margin: '8px 0' }} />}
          </div>
        ))}
      </div>
    </div>
  )
}
