'use client';

import { useEffect, useState } from 'react';
import { Loader2, Search, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const C = {
  bg: '#050505', panel: '#0b0b0b', panel2: '#0f0f0f',
  border: 'rgba(255,255,255,0.07)', borderSoft: 'rgba(255,255,255,0.04)',
  text: '#f4f4f4', muted: '#8a8a8a', dim: '#5f5f5f', gold: '#E8B84B',
  green: '#22c55e',
};

const FEATURES = ['vouchers', 'campaigns', 'loyalty', 'mikrotik', 'portal_customization'];

const FEATURE_LABELS: Record<string, string> = {
  vouchers: 'Vouchers',
  campaigns: 'Campaigns',
  loyalty: 'Loyalty',
  mikrotik: 'MikroTik',
  portal_customization: 'Portal Customization',
};

function getToken() { return localStorage.getItem('wb_token') || ''; }

function authHeaders() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }; }

export default function FeatureFlagsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<Record<string, boolean>>({});

  async function load() {
    setRefreshing(true);
    try {
      const r = await fetch(`${API}/api/admin/feature-flags`, { headers: authHeaders() });
      if (r.ok) setData(await r.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  async function toggleFlag(tenantId: string, feature: string, current: boolean) {
    const key = `${tenantId}-${feature}`;
    setToggling(p => ({ ...p, [key]: true }));
    try {
      await fetch(`${API}/api/admin/feature-flags/${tenantId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify([{ feature_key: feature, is_enabled: !current }]),
      });
      setData(prev => prev.map(t =>
        t.tenant_id === tenantId
          ? { ...t, flags: { ...t.flags, [feature]: !current } }
          : t
      ));
    } finally { setToggling(p => ({ ...p, [key]: false })); }
  }

  const filtered = data.filter(t =>
    t.tenant_name.toLowerCase().includes(search.toLowerCase()) ||
    t.tenant_slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1520, margin: '0 auto', padding: '0 28px 36px' }}>
        <header style={{ height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: '"Space Grotesk", Inter, sans-serif', fontSize: 18, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Feature Flags
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: C.muted }}>Per-ISP feature toggles · Monetization control</div>
          </div>
          <button onClick={load} disabled={refreshing} title="Refresh" style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${C.border}`, background: 'transparent', cursor: refreshing ? 'not-allowed' : 'pointer', color: C.muted,
            animation: refreshing ? 'spin 1s linear infinite' : 'none',
          }}>
            <RefreshCw size={14} />
          </button>
        </header>

        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.panel2, maxWidth: 360 }}>
          <Search size={14} color={C.dim} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter ISPs..." style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', color: C.text, fontSize: 13, fontFamily: 'inherit' }} />
        </div>

        {loading && data.length === 0 ? (
          <div>
            <style>{`@keyframes skel-pulse { 0%,100% { opacity: 0.2; } 50% { opacity: 0.5; } }`}</style>
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderTop: `2px solid ${C.gold}`, borderRadius: 18, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `200px repeat(${FEATURES.length}, 1fr)`, gap: 0 }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: '60%', height: 10, background: C.dim, borderRadius: 4, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: '0.1s' }} />
                </div>
                {FEATURES.map((f, i) => (
                  <div key={f} style={{ padding: '14px 10px', textAlign: 'center', borderBottom: `1px solid ${C.border}`, borderLeft: `1px solid ${C.borderSoft}` }}>
                    <div style={{ width: '80%', height: 10, margin: '0 auto', background: C.dim, borderRadius: 4, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${0.1 + i * 0.05}s` }} />
                  </div>
                ))}
                {[1, 2, 3, 4, 5].map(r => (
                  <>
                    <div key={`row-${r}-name`} style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${C.borderSoft}`, background: r % 2 === 0 ? C.panel2 : 'transparent' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.dim, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${0.2 + r * 0.04}s` }} />
                      <div style={{ flex: 1, height: 13, background: C.dim, borderRadius: 4, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${0.2 + r * 0.04}s` }} />
                    </div>
                    {FEATURES.map((f, i) => (
                      <div key={`row-${r}-${f}`} style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${C.borderSoft}`, borderLeft: `1px solid ${C.borderSoft}`, background: r % 2 === 0 ? C.panel2 : 'transparent' }}>
                        <div style={{ width: 22, height: 22, background: C.dim, borderRadius: 4, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${0.2 + r * 0.04 + i * 0.03}s` }} />
                      </div>
                    ))}
                  </>
                ))}
              </div>
            </div>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.muted, padding: '40px 0' }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            Loading feature flags...
          </div>
        ) : (
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderTop: `2px solid ${C.gold}`, borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `200px repeat(${FEATURES.length}, 1fr)`, gap: 0 }}>
              <div style={{ padding: '14px 18px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: C.dim, borderBottom: `1px solid ${C.border}` }}>ISP</div>
              {FEATURES.map(f => (
                <div key={f} style={{ padding: '14px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.dim, textAlign: 'center', borderBottom: `1px solid ${C.border}`, borderLeft: `1px solid ${C.borderSoft}` }}>
                  {FEATURE_LABELS[f]}
                </div>
              ))}
              {filtered.map((tenant, i) => (
                <>
                  <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: i < filtered.length - 1 ? `1px solid ${C.borderSoft}` : 'none', background: i % 2 === 0 ? 'transparent' : C.panel2 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{tenant.tenant_name}</span>
                    <span style={{ fontSize: 9, color: C.dim, fontFamily: '"DM Mono", monospace' }}>/{tenant.tenant_slug}</span>
                  </div>
                  {FEATURES.map(f => {
                    const enabled = tenant.flags[f];
                    const key = `${tenant.tenant_id}-${f}`;
                    return (
                      <div key={key} style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: i < filtered.length - 1 ? `1px solid ${C.borderSoft}` : 'none', borderLeft: `1px solid ${C.borderSoft}`, background: i % 2 === 0 ? 'transparent' : C.panel2 }}>
                        <button
                          onClick={() => toggleFlag(tenant.tenant_id, f, enabled)}
                          disabled={toggling[key]}
                          style={{ background: 'none', border: 'none', cursor: toggling[key] ? 'not-allowed' : 'pointer', padding: 4, color: enabled ? C.gold : C.dim, opacity: toggling[key] ? 0.5 : 1 }}
                          title={enabled ? 'Disable' : 'Enable'}
                        >
                          {toggling[key] ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                        </button>
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
            {filtered.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: C.muted, fontSize: 13 }}>No ISPs match this search.</div>
            )}
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
