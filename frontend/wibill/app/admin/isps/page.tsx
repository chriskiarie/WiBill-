'use client';
import { useEffect, useMemo, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const C = {
  bg: '#050505', panel: '#0b0b0b', panel2: '#0f0f0f',
  border: 'rgba(255,255,255,0.07)', borderSoft: 'rgba(255,255,255,0.04)',
  text: '#f4f4f4', muted: '#8a8a8a', dim: '#5f5f5f',
  gold: '#E8B84B', green: '#22c55e', red: '#ef4444',
};

function getToken() { return localStorage.getItem('wb_token') || ''; }
function auth() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }; }

type ISP = { id: string; name: string; slug: string; email: string; is_active: boolean; is_locked: boolean; created_at: string; };

export default function ISPCommandCenter() {
  const [isps, setIsps] = useState<ISP[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<Record<string, any>>({});
  const [events, setEvents] = useState<Record<string, any[]>>({});
  const [loadingDrawer, setLoadingDrawer] = useState(false);

  useEffect(() => { loadISPs(); }, []);

  async function loadISPs() {
    const t = getToken(); if (!t) return;
    try {
      const r = await fetch(`${API}/api/admin/tenants`, { headers: auth() });
      if (r.ok) {
        const d = await r.json();
        setIsps(Array.isArray(d) ? d : Array.isArray(d?.value) ? d.value : []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function toggleExpand(isp: ISP) {
    if (expandedId === isp.id) { setExpandedId(null); return; }
    setExpandedId(isp.id);
    setLoadingDrawer(true);
    try {
      const [rRes, eRes] = await Promise.all([
        fetch(`${API}/api/admin/isp/${isp.id}/readiness`, { headers: auth() }),
        fetch(`${API}/api/admin/isp/${isp.id}/events?limit=10`, { headers: auth() }),
      ]);
      if (rRes.ok) {
        const rd = await rRes.json();
        setReadiness(prev => ({ ...prev, [isp.id]: rd }));
      }
      if (eRes.ok) {
        const ed = await eRes.json();
        setEvents(prev => ({ ...prev, [isp.id]: Array.isArray(ed) ? ed : [] }));
      }
    } catch (e) { console.error(e); }
    finally { setLoadingDrawer(false); }
  }

  async function suspendISP(isp: ISP) {
    try {
      await fetch(`${API}/api/admin/tenants/${isp.id}/suspend`, { method: 'PATCH', headers: auth() });
      await loadISPs();
    } catch (e) { console.error(e); }
  }

  async function unsuspendISP(isp: ISP) {
    try {
      await fetch(`${API}/api/admin/tenants/${isp.id}/unsuspend`, { method: 'PATCH', headers: auth() });
      await loadISPs();
    } catch (e) { console.error(e); }
  }

  if (loading) {
    return <div style={{ padding: 28, color: C.muted }}>Loading ISP data...</div>;
  }

  const active = isps.filter(i => i.is_active);
  const pending = isps.filter(i => !i.is_active && !i.is_locked);
  const locked = isps.filter(i => i.is_locked);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1440, fontFamily: 'Inter, sans-serif', color: C.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: '"Space Grotesk", sans-serif', fontSize: 22, fontWeight: 700, color: C.text }}>
          ISP Command Center
        </h1>
        <span style={{ fontSize: 11, color: C.muted, fontFamily: '"DM Mono", monospace' }}>
          {isps.length} ISP{(isps.length !== 1 ? 's' : '')}
        </span>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
        {[
          { label: 'Active', value: active.length, color: C.green },
          { label: 'Pending Approval', value: pending.length, color: C.gold },
          { label: 'Locked', value: locked.length, color: C.red },
          { label: 'Total', value: isps.length, color: C.text },
        ].map(s => (
          <div key={s.label} style={{ background: '#0D0D0B', border: '0.5px solid #2A2A27', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6B6964', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 22, fontWeight: 500, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ISP table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {isps.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.dim, border: '0.5px dashed #2A2A27', borderRadius: 8, fontSize: 12 }}>No ISPs registered yet</div>
        ) : (
          isps.map((isp) => {
            const isExpanded = expandedId === isp.id;
            const rd = readiness[isp.id];
            const evts = events[isp.id] || [];
            return (
              <div key={isp.id}>
                {/* Main row */}
                <div
                  onClick={() => toggleExpand(isp)}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 120px 80px 40px', gap: 12, alignItems: 'center',
                    padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                    background: isExpanded ? '#111110' : 'transparent',
                    borderBottom: '0.5px solid #1A1A18',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: isp.is_locked ? C.red : isp.is_active ? C.green : C.gold }} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{isp.name}</span>
                    <span style={{ fontSize: 10, fontFamily: '"DM Mono", monospace', color: C.dim }}>/{isp.slug}</span>
                  </div>
                  <div style={{ fontSize: 11, fontFamily: '"DM Mono", monospace', color: C.muted }}>{isp.email || '\u2014'}</div>
                  <div style={{
                    fontSize: 9, fontFamily: '"DM Mono", monospace', fontWeight: 700, textTransform: 'uppercase',
                    color: isp.is_locked ? C.red : isp.is_active ? C.green : C.gold,
                  }}>
                    {isp.is_locked ? 'Locked' : isp.is_active ? 'Active' : 'Pending'}
                  </div>
                  <div style={{ color: C.dim, fontSize: 14, textAlign: 'center' }}>{isExpanded ? '\u25B2' : '\u25BC'}</div>
                </div>

                {/* Expanded drawer */}
                {isExpanded && (
                  <div style={{
                    background: '#080808', border: '0.5px solid #1A1A18', borderRadius: 8,
                    margin: '2px 0 8px', padding: 20,
                  }}>
                    {loadingDrawer ? (
                      <div style={{ textAlign: 'center', padding: 20, color: C.dim, fontSize: 12 }}>Loading diagnostic data...</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Readiness Engine */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: '"Space Grotesk", sans-serif' }}>Readiness Score</span>
                            {rd && (
                              <span style={{
                                fontFamily: '"DM Mono", monospace', fontSize: 22, fontWeight: 500,
                                color: rd.score >= 80 ? C.green : rd.score >= 50 ? C.gold : C.red,
                              }}>
                                {rd.score}%
                              </span>
                            )}
                          </div>
                          {rd?.checks && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                              {Object.entries(rd.checks).map(([key, chk]: [string, any]) => (
                                <div key={key} style={{
                                  padding: '8px 10px', borderRadius: 6,
                                  background: chk.pass ? `${C.green}10` : `${C.red}08`,
                                  border: `0.5px solid ${chk.pass ? C.green : C.red}30`,
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted }}>{key.replace(/_/g, ' ')}</span>
                                    <span style={{ fontSize: 9, fontFamily: '"DM Mono", monospace', color: C.dim }}>+{chk.weight}</span>
                                  </div>
                                  <div style={{ fontSize: 10, color: chk.pass ? C.green : C.red }}>
                                    {chk.pass ? 'PASS' : chk.reason || 'FAIL'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Live Status Block */}
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: '"Space Grotesk", sans-serif', marginBottom: 8 }}>Live Status</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                            {[
                              { label: 'Router', value: rd?.checks?.mikrotik_reachable?.pass ? 'ONLINE' : rd?.checks?.mikrotik_reachable?.reason?.includes('Not configured') ? 'NOT CONFIGURED' : 'OFFLINE' },
                              { label: 'Payments', value: rd?.checks?.mpesa_verified?.pass ? 'FLOWING' : 'BLOCKED' },
                              { label: 'Provisioning', value: rd?.checks?.sessions_working?.pass ? 'HEALTHY' : 'NO DATA' },
                              { label: 'Network', value: rd?.checks?.network_ok?.pass ? 'UP' : (rd?.checks?.network_ok?.reason === 'No data' ? 'NO DATA' : 'DOWN') },
                            ].map(s => {
                              const tone = s.value === 'ONLINE' || s.value === 'FLOWING' || s.value === 'HEALTHY' || s.value === 'UP' ? C.green
                                : s.value === 'NOT CONFIGURED' || s.value === 'NO DATA' ? C.dim : C.red;
                              return (
                                <div key={s.label} style={{ padding: '10px 12px', background: '#0D0D0B', borderRadius: 6, border: '0.5px solid #1A1A18' }}>
                                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B6964', marginBottom: 4 }}>{s.label}</div>
                                  <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 12, fontWeight: 600, color: tone }}>{s.value}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Last 10 Events */}
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: '"Space Grotesk", sans-serif', marginBottom: 8 }}>Last Events</div>
                          {evts.length === 0 ? (
                            <div style={{ color: C.dim, fontSize: 11, padding: '8px 0' }}>No events recorded</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {evts.slice(0, 10).map((e, i) => (
                                <div key={i} style={{
                                  display: 'grid', gridTemplateColumns: '60px 1fr 120px', gap: 8,
                                  padding: '6px 8px', borderRadius: 4, fontSize: 11,
                                  background: i % 2 === 0 ? 'transparent' : '#0A0A0A',
                                }}>
                                  <span style={{
                                    fontFamily: '"DM Mono", monospace', fontSize: 8, fontWeight: 700,
                                    textTransform: 'uppercase', letterSpacing: '0.06em',
                                    color: e.type === 'NETWORK' ? C.gold : C.muted,
                                  }}>{e.type}</span>
                                  <span style={{ color: C.text }}>{e.action}</span>
                                  <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: C.dim }}>
                                    {e.created_at ? new Date(e.created_at).toLocaleString('en-KE', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action Panel */}
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: '"Space Grotesk", sans-serif', marginBottom: 8 }}>Actions</div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {isp.is_active ? (
                              <button onClick={() => suspendISP(isp)} style={{
                                height: 32, padding: '0 14px', borderRadius: 6, cursor: 'pointer',
                                background: `${C.red}15`, border: `0.5px solid ${C.red}40`, color: C.red,
                                fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                              }}>Suspend ISP</button>
                            ) : (
                              <button onClick={() => unsuspendISP(isp)} style={{
                                height: 32, padding: '0 14px', borderRadius: 6, cursor: 'pointer',
                                background: `${C.green}15`, border: `0.5px solid ${C.green}40`, color: C.green,
                                fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                              }}>Reactivate ISP</button>
                            )}
                            <button style={{
                              height: 32, padding: '0 14px', borderRadius: 6, cursor: 'pointer',
                              background: `${C.gold}10`, border: `0.5px solid ${C.gold}30`, color: C.gold,
                              fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                            }}>Regenerate Router Config</button>
                            <button style={{
                              height: 32, padding: '0 14px', borderRadius: 6, cursor: 'pointer',
                              background: '#0D0D0B', border: '0.5px solid #2A2A27', color: C.muted,
                              fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                            }}>Reset Provisioning Queue</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
