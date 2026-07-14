'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Search, RefreshCw, Lock } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const C = {
  black: '#000', card: '#0D0D0B', border: '#2A2A27', line: '#1A1A18',
  text: '#EDEBE6', dim: '#8C8A84', mute: '#6B6964', faint: '#3A3A37',
  gold: '#E8B84B', green: '#6FCF73', red: '#E5707A',
};

const FEATURES = ['vouchers', 'campaigns', 'loyalty', 'mikrotik', 'portal_customization'];
const PREMIUM_FEATURES = ['campaigns', 'loyalty'];

const FEATURE_LABELS: Record<string, string> = {
  vouchers: 'Vouchers',
  campaigns: 'Campaigns',
  loyalty: 'Loyalty',
  mikrotik: 'MikroTik',
  portal_customization: 'Portal',
};

function getToken() { return localStorage.getItem('wb_token') || ''; }
function authHeaders() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }; }

export default function FeatureFlagsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<Record<string, boolean>>({});
  const [tierToggling, setTierToggling] = useState<Record<string, boolean>>({});

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
        body: JSON.stringify({ [feature]: !current }),
      });
      setData(prev => prev.map(t =>
        t.tenant_id === tenantId
          ? { ...t, flags: { ...t.flags, [feature]: !current } }
          : t
      ));
    } finally { setToggling(p => ({ ...p, [key]: false })); }
  }

  async function toggleTier(tenantId: string, currentTier: string) {
    const newTier = currentTier === 'premium' ? 'free' : 'premium';
    setTierToggling(p => ({ ...p, [tenantId]: true }));
    try {
      await fetch(`${API}/api/admin/feature-flags/${tenantId}/tier`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ tier: newTier }),
      });
      setData(prev => prev.map(t =>
        t.tenant_id === tenantId
          ? {
              ...t,
              tier: newTier,
              flags: {
                ...t.flags,
                campaigns: newTier === 'premium' ? true : false,
                loyalty: newTier === 'premium' ? true : false,
              },
            }
          : t
      ));
    } finally { setTierToggling(p => ({ ...p, [tenantId]: false })); }
  }

  const filtered = data.filter(t =>
    t.tenant_name.toLowerCase().includes(search.toLowerCase()) ||
    t.tenant_slug.toLowerCase().includes(search.toLowerCase())
  );

  function statusInfo(tenant: any) {
    if (!tenant.is_active) return { label: 'PENDING', color: C.gold };
    if (tenant.is_active) return { label: 'ACTIVE', color: C.green };
    return { label: 'SUSPENDED', color: C.red };
  }

  return (
    <div style={{ background: C.black, color: C.text, fontFamily: 'Inter, system-ui, sans-serif', padding: 'var(--space-lg)', width: '100%', minHeight: '100%' }}>
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: C.text }}>
          Feature Flags
        </h1>
      </div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.line, maxWidth: 360 }}>
        <Search size={14} color={C.mute} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter ISPs..." style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', color: C.text, fontSize: 13, fontFamily: 'inherit' }} />
        <button onClick={load} disabled={refreshing} title="Refresh" style={{
          width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${C.border}`, background: 'transparent', cursor: refreshing ? 'not-allowed' : 'pointer', color: C.dim,
          animation: refreshing ? 'spin 1s linear infinite' : 'none', flexShrink: 0,
        }}>
          <RefreshCw size={14} />
        </button>
      </div>

        {loading && data.length === 0 ? (
          <div>
            <style>{`@keyframes skel-pulse { 0%,100% { opacity: 0.2; } 50% { opacity: 0.5; } }`}</style>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `160px 80px 80px repeat(${FEATURES.length}, 1fr)`, gap: 0 }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: '60%', height: 10, background: C.mute, borderRadius: 4, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: '0.1s' }} />
                </div>
                {['Tier', 'Fee', ...FEATURES].map((f, i) => (
                  <div key={f} style={{ padding: '14px 10px', textAlign: 'center', borderBottom: `1px solid ${C.border}`, borderLeft: `1px solid ${C.line}` }}>
                    <div style={{ width: '60%', height: 10, margin: '0 auto', background: C.mute, borderRadius: 4, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${0.1 + i * 0.05}s` }} />
                  </div>
                ))}
                {[1, 2, 3, 4, 5].map(r => (
                  <React.Fragment key={r}>
                    <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${C.line}`, background: r % 2 === 0 ? C.line : 'transparent' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.mute, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${0.2 + r * 0.04}s` }} />
                      <div style={{ flex: 1, height: 13, background: C.mute, borderRadius: 4, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${0.2 + r * 0.04}s` }} />
                    </div>
                    {[1, 2, 3, 4, 5, 6, 7].map(i => (
                      <div key={i} style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${C.line}`, borderLeft: `1px solid ${C.line}`, background: r % 2 === 0 ? C.line : 'transparent' }}>
                        <div style={{ width: 22, height: 22, background: C.mute, borderRadius: 4, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${0.2 + r * 0.04 + i * 0.03}s` }} />
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `160px 70px 70px 70px repeat(${FEATURES.length}, 1fr)`, gap: 0 }}>
              {/* Header */}
              <div style={{ padding: '14px 18px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: C.mute, borderBottom: `1px solid ${C.border}` }}>ISP</div>
              <div style={{ padding: '14px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mute, textAlign: 'center', borderBottom: `1px solid ${C.border}`, borderLeft: `1px solid ${C.line}` }}>Status</div>
              <div style={{ padding: '14px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mute, textAlign: 'center', borderBottom: `1px solid ${C.border}`, borderLeft: `1px solid ${C.line}` }}>Tier</div>
              <div style={{ padding: '14px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mute, textAlign: 'center', borderBottom: `1px solid ${C.border}`, borderLeft: `1px solid ${C.line}` }}>Fee</div>
              {FEATURES.map(f => (
                <div key={f} style={{ padding: '14px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mute, textAlign: 'center', borderBottom: `1px solid ${C.border}`, borderLeft: `1px solid ${C.line}` }}>
                  {FEATURE_LABELS[f]}
                </div>
              ))}
              {/* Rows */}
              {filtered.map((tenant, i) => {
                const isPremium = tenant.tier === 'premium';
                const st = statusInfo(tenant);
                return (
                  <React.Fragment key={tenant.tenant_id}>
                    <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: i < filtered.length - 1 ? `1px solid ${C.line}` : 'none', background: i % 2 === 0 ? 'transparent' : C.line }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{tenant.tenant_name}</span>
                      <span style={{ fontSize: 9, color: C.mute, fontFamily: '"DM Mono", monospace' }}>/{tenant.tenant_slug}</span>
                    </div>
                    <div style={{ padding: '8px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: i < filtered.length - 1 ? `1px solid ${C.line}` : 'none', borderLeft: `1px solid ${C.line}`, background: i % 2 === 0 ? 'transparent' : C.line }}>
                      <span style={{ fontSize: 9, fontWeight: 700, fontFamily: '"DM Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.06em', color: st.color }}>{st.label}</span>
                    </div>
                    <div style={{ padding: '8px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: i < filtered.length - 1 ? `1px solid ${C.line}` : 'none', borderLeft: `1px solid ${C.line}`, background: i % 2 === 0 ? 'transparent' : C.line }}>
                      <button
                        onClick={() => toggleTier(tenant.tenant_id, tenant.tier)}
                        disabled={tierToggling[tenant.tenant_id]}
                        style={{
                          padding: '4px 12px', borderRadius: 20, cursor: tierToggling[tenant.tenant_id] ? 'not-allowed' : 'pointer',
                          fontFamily: '"DM Mono", monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                          background: isPremium ? 'rgba(232,184,75,0.15)' : C.line,
                          color: isPremium ? C.gold : C.dim,
                          border: isPremium ? `0.5px solid ${C.gold}` : `0.5px solid ${C.border}`,
                          opacity: tierToggling[tenant.tenant_id] ? 0.5 : 1,
                        }}
                      >
                        {tierToggling[tenant.tenant_id] ? '...' : isPremium ? 'Premium' : 'Free'}
                      </button>
                    </div>
                    <div style={{ padding: '8px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: i < filtered.length - 1 ? `1px solid ${C.line}` : 'none', borderLeft: `1px solid ${C.line}`, background: i % 2 === 0 ? 'transparent' : C.line }}>
                      <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 12, color: isPremium ? C.gold : C.mute }}>{isPremium ? 'KES 0' : '—'}</span>
                    </div>
                    {FEATURES.map(f => {
                      const enabled = tenant.flags[f];
                      const isPremiumOnly = PREMIUM_FEATURES.includes(f);
                      const locked = !isPremium && isPremiumOnly;
                      const key = `${tenant.tenant_id}-${f}`;
                      return (
                        <div key={key} style={{ padding: '8px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: i < filtered.length - 1 ? `1px solid ${C.line}` : 'none', borderLeft: `1px solid ${C.line}`, background: i % 2 === 0 ? 'transparent' : C.line }}>
                          {locked ? (
                            <span title="Upgrade to Premium to enable" style={{ color: C.faint, display: 'flex', alignItems: 'center' }}>
                              <Lock size={14} />
                            </span>
                          ) : (
                            <button
                              onClick={() => toggleFlag(tenant.tenant_id, f, enabled)}
                              disabled={toggling[key]}
                              style={{
                                width: 36, height: 22, borderRadius: 11, cursor: toggling[key] ? 'not-allowed' : 'pointer',
                                background: enabled ? C.gold : C.border,
                                border: 'none', position: 'relative', transition: 'background 0.2s',
                                opacity: toggling[key] ? 0.5 : 1,
                              }}
                            >
                              <div style={{
                                width: 16, height: 16, borderRadius: '50%',
                                background: '#fff',
                                position: 'absolute', top: 3,
                                left: enabled ? 18 : 3,
                                transition: 'left 0.2s',
                              }} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
            {filtered.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: C.dim, fontSize: 13 }}>No ISPs match this search.</div>
            )}
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
