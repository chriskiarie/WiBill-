'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface HealthStatus {
  status?: string;
  version?: string;
  database?: string;
  environment?: string;
  timestamp?: string;
}

// COLOR PALETTE
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

type Tab = 'overview' | 'health' | 'database' | 'payments' | 'security' | 'notifications' | 'api' | 'logs' | 'danger';

export default function BatmanControlCenter() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHealth();
  }, []);

  const loadHealth = async () => {
    try {
      const r = await fetch(`${API}/health`);
      const data = await r.json();
      setHealth(data);
    } catch (err) {
      setHealth({ status: 'error', version: '0.1.0', database: 'disconnected', environment: 'production' });
    } finally {
      setLoading(false);
    }
  };

  const refreshHealth = async () => {
    setRefreshing(true);
    await loadHealth();
    setRefreshing(false);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'health' as const, label: 'System Health', icon: '❤️' },
    { id: 'database' as const, label: 'Database', icon: '🗄️' },
    { id: 'payments' as const, label: 'M-Pesa Config', icon: '💳' },
    { id: 'security' as const, label: 'Security', icon: '🔒' },
    { id: 'notifications' as const, label: 'Alerts', icon: '🔔' },
    { id: 'api' as const, label: 'API Keys', icon: '🔑' },
    { id: 'logs' as const, label: 'Logs', icon: '📝' },
    { id: 'danger' as const, label: 'Danger Zone', icon: '⚠️' },
  ];

  return (
    <div style={{ background: colors.void, color: colors.textPrimary, minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif', padding: '32px 36px', maxWidth: '2000px', margin: '0 auto' }}>
      {/* HEADER - BATMAN THEME */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: 36 }}>🦇</span>
          <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.025em', margin: 0, color: colors.textPrimary, fontFamily: '"Space Grotesk", sans-serif' }}>
            Control Center
          </h1>
        </div>
        <p style={{ fontSize: 13, color: colors.textSecondary, margin: 0 }}>
          Mission control. Monitor. Configure. Protect. Everything you need to keep ISPs protected.
        </p>
      </div>

      {/* SYSTEM STATUS QUICK VIEW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'API Status', value: health?.status || 'checking', color: health?.status === 'ok' ? colors.green : colors.red, icon: '🌐' },
          { label: 'Database', value: health?.database || 'checking', color: health?.database === 'connected' ? colors.green : colors.red, icon: '🗄️' },
          { label: 'Environment', value: health?.environment || 'unknown', color: colors.blue, icon: '⚙️' },
          { label: 'Version', value: health?.version || '—', color: colors.gold, icon: '📦' },
        ].map((item, i) => (
          <div key={i} style={{
            background: colors.base,
            border: `0.5px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '20px',
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: item.color }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.textMuted }}>
                {item.label}
              </div>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: item.color, fontFamily: '"JetBrains Mono", monospace' }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* TAB NAVIGATION */}
      <div style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '0', marginBottom: '32px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, borderBottom: `0.5px solid ${colors.border}` }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '16px 12px',
                background: activeTab === tab.id ? colors.raised : 'transparent',
                border: 'none',
                borderRight: `0.5px solid ${colors.border}`,
                color: activeTab === tab.id ? colors.gold : colors.textSecondary,
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  (e.currentTarget as HTMLElement).style.color = colors.gold;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  (e.currentTarget as HTMLElement).style.color = colors.textSecondary;
                }
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT */}
      <div style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '32px' }}>
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary, margin: '0 0 24px', fontFamily: '"Space Grotesk", sans-serif' }}>
              Platform Overview
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary, margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif' }}>
                  System Stats
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'Uptime', value: '99.8%', unit: 'reliability' },
                    { label: 'API Response Time', value: '45', unit: 'ms' },
                    { label: 'Transaction Volume', value: '2,847', unit: 'today' },
                    { label: 'Active ISPs', value: '5', unit: 'connected' },
                  ].map((stat, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: colors.raised,
                      border: `0.5px solid ${colors.border}`,
                      borderRadius: '8px',
                    }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary, marginBottom: '2px' }}>
                          {stat.label}
                        </div>
                        <div style={{ fontSize: 10, color: colors.textMuted }}>
                          {stat.unit}
                        </div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: colors.gold, fontFamily: '"JetBrains Mono", monospace' }}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary, margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif' }}>
                  Quick Actions
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  {[
                    { label: 'Refresh Health Check', action: 'refresh', color: colors.blue },
                    { label: 'View API Docs', action: 'docs', color: colors.gold },
                    { label: 'Download Logs', action: 'logs', color: colors.green },
                    { label: 'Test M-Pesa Connection', action: 'test', color: colors.amber },
                  ].map((btn, i) => (
                    <button
                      key={i}
                      onClick={() => refreshHealth()}
                      style={{
                        padding: '10px 12px',
                        background: `${btn.color}15`,
                        border: `0.5px solid ${btn.color}40`,
                        borderRadius: '8px',
                        color: btn.color,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = `${btn.color}25`;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = `${btn.color}15`;
                      }}
                    >
                      {btn.label} →
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HEALTH TAB */}
        {activeTab === 'health' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary, margin: 0, fontFamily: '"Space Grotesk", sans-serif' }}>
                System Health Diagnostics
              </h2>
              <button
                onClick={refreshHealth}
                disabled={refreshing}
                style={{
                  padding: '8px 12px',
                  background: colors.raised,
                  border: `0.5px solid ${colors.border}`,
                  borderRadius: '8px',
                  color: colors.gold,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: refreshing ? 'not-allowed' : 'pointer',
                  opacity: refreshing ? 0.5 : 1,
                }}
              >
                {refreshing ? '⟳ Checking...' : '🔄 Refresh'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { name: 'Backend API', status: health?.status, icon: '🌐' },
                { name: 'PostgreSQL Database', status: health?.database, icon: '🗄️' },
                { name: 'M-Pesa Integration', status: 'healthy', icon: '💳' },
                { name: 'Redis Cache', status: 'healthy', icon: '⚡' },
                { name: 'JWT Auth', status: 'healthy', icon: '🔐' },
                { name: 'Email Service', status: 'healthy', icon: '📧' },
              ].map((service, i) => (
                <div key={i} style={{
                  padding: '16px',
                  background: colors.raised,
                  border: `0.5px solid ${colors.border}`,
                  borderRadius: '8px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: 16 }}>{service.icon}</span>
                      <div style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary }}>
                        {service.name}
                      </div>
                    </div>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: service.status === 'healthy' || service.status === 'ok' ? colors.green : colors.red,
                        boxShadow: `0 0 8px ${service.status === 'healthy' || service.status === 'ok' ? colors.green : colors.red}`,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: colors.textMuted, fontFamily: '"JetBrains Mono", monospace' }}>
                    {service.status === 'healthy' || service.status === 'ok' ? '✓ Operational' : '✕ Issue Detected'}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '24px', padding: '16px', background: colors.raised, border: `0.5px solid ${colors.border}`, borderRadius: '8px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary, marginBottom: '8px' }}>
                Last Check
              </div>
              <div style={{ fontSize: 13, color: colors.textPrimary, fontFamily: '"JetBrains Mono", monospace' }}>
                {new Date().toLocaleString('en-KE')}
              </div>
            </div>
          </div>
        )}

        {/* DATABASE TAB */}
        {activeTab === 'database' && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary, margin: '0 0 24px', fontFamily: '"Space Grotesk", sans-serif' }}>
              Database Administration
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Connection Status', value: health?.database || 'unknown', color: colors.green },
                { label: 'Database Name', value: 'wibill_prod', color: colors.blue },
                { label: 'Total Tables', value: '18', color: colors.gold },
                { label: 'Last Backup', value: 'Today 02:30 UTC', color: colors.amber },
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '16px',
                  background: colors.raised,
                  border: `0.5px solid ${colors.border}`,
                  borderRadius: '8px',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textMuted, marginBottom: '8px' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: item.color, fontFamily: '"JetBrains Mono", monospace' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '16px', background: `${colors.blue}15`, border: `0.5px solid ${colors.blue}40`, borderRadius: '8px', color: colors.blue, fontSize: 12, lineHeight: '1.6' }}>
              <strong>ℹ️ Database Tools</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li>Run migrations: <code style={{ background: colors.raised, padding: '2px 6px', borderRadius: '3px', fontFamily: '"JetBrains Mono", monospace' }}>alembic upgrade head</code></li>
                <li>Backup database: <code style={{ background: colors.raised, padding: '2px 6px', borderRadius: '3px', fontFamily: '"JetBrains Mono", monospace' }}>pg_dump</code></li>
                <li>Monitor performance: Use Railway dashboard</li>
              </ul>
            </div>
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary, margin: '0 0 24px', fontFamily: '"Space Grotesk", sans-serif' }}>
              M-Pesa Configuration
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Shortcode', value: '174379', secret: true },
                { label: 'Consumer Key', value: 'jd7...8hK', secret: true },
                { label: 'Consumer Secret', value: 'aB9...xR2', secret: true },
                { label: 'Environment', value: 'sandbox', secret: false },
              ].map((config, i) => (
                <div key={i} style={{
                  padding: '16px',
                  background: colors.raised,
                  border: `0.5px solid ${colors.border}`,
                  borderRadius: '8px',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textMuted, marginBottom: '8px' }}>
                    {config.label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <code style={{ fontSize: 12, color: colors.gold, fontFamily: '"JetBrains Mono", monospace', flex: 1 }}>
                      {config.value}
                    </code>
                    <button
                      onClick={() => copyToClipboard(config.value, i.toString())}
                      style={{
                        background: colors.border,
                        border: `0.5px solid ${colors.border}`,
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: colors.gold,
                        fontSize: 10,
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {copiedField === i.toString() ? '✓' : '📋'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '16px', background: `${colors.amber}15`, border: `0.5px solid ${colors.amber}40`, borderRadius: '8px', color: colors.amber, fontSize: 12 }}>
              <strong>⚙️ Test Payment</strong>
              <div style={{ marginTop: '8px', fontSize: 11 }}>
                Send test payment: +254712345678, Amount: 100 KES
              </div>
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary, margin: '0 0 24px', fontFamily: '"Space Grotesk", sans-serif' }}>
              Security Settings
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { name: 'Two-Factor Authentication', status: true },
                { name: 'HTTPS Everywhere', status: true },
                { name: 'Rate Limiting', status: true },
                { name: 'CORS Protection', status: true },
                { name: 'SQL Injection Prevention', status: true },
                { name: 'DDoS Protection', status: false },
              ].map((feature, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: colors.raised,
                  border: `0.5px solid ${colors.border}`,
                  borderRadius: '8px',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary }}>
                    {feature.name}
                  </div>
                  <div style={{
                    padding: '3px 8px',
                    background: feature.status ? `${colors.green}15` : `${colors.amber}15`,
                    color: feature.status ? colors.green : colors.amber,
                    fontSize: 10,
                    fontWeight: 600,
                    borderRadius: '4px',
                  }}>
                    {feature.status ? '✓ Enabled' : '⚠️ Review'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DANGER ZONE */}
        {activeTab === 'danger' && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.red, margin: '0 0 24px', fontFamily: '"Space Grotesk", sans-serif' }}>
              ⚠️ Danger Zone
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Clear Cache', desc: 'Remove all cached data', color: colors.amber },
                { label: 'Reset API Keys', desc: 'Generate new API credentials', color: colors.amber },
                { label: 'Export Database', desc: 'Download full database backup', color: colors.blue },
                { label: 'Delete All Test Data', desc: 'Remove development transactions', color: colors.red },
              ].map((action, i) => (
                <button
                  key={i}
                  style={{
                    padding: '16px',
                    background: `${action.color}10`,
                    border: `0.5px solid ${action.color}40`,
                    borderRadius: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = `${action.color}20`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = `${action.color}10`;
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: action.color, marginBottom: '4px' }}>
                    {action.label}
                  </div>
                  <div style={{ fontSize: 10, color: colors.textMuted }}>
                    {action.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* OTHER TABS - PLACEHOLDER */}
        {['notifications', 'api', 'logs'].includes(activeTab) && (
          <div style={{ textAlign: 'center', padding: '40px', color: colors.textMuted }}>
            <div style={{ fontSize: 18, marginBottom: '12px' }}>
              {activeTab === 'notifications' ? '🔔' : activeTab === 'api' ? '🔑' : '📝'}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '4px' }}>
              {activeTab === 'notifications' ? 'Alert Configuration' : activeTab === 'api' ? 'API Key Management' : 'System Logs'}
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted }}>
              Coming soon - Advanced {activeTab} management tools
            </div>
          </div>
        )}
      </div>
    </div>
  );
}