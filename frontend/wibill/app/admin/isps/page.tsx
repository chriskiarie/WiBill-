'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const C = {
  void: '#000000', base: '#080808', raised: '#0d0d0d',
  border: '#141414', dim: '#1e1e1e',
  text: '#f0f0f0', muted: '#444444',
  gold: '#E8B84B', green: '#22c55e', amber: '#f59e0b', red: '#ef4444',
};

interface ISP {
  id: string; name: string; slug: string; email: string;
  is_active: boolean; commission_rate: number; created_at: string;
}

interface Invite {
  id: string; token: string; status: string; created_at: string; expires_at: string; url: string;
}

const lbl = (t: string) => (
  <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: C.muted, marginBottom: 12 }}>{t}</div>
);

const badge = (status: string) => {
  const color = status === 'active' || status === 'used' ? C.green : status === 'inactive' || status === 'expired' ? C.red : C.amber;
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 9, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase' as const, background: `${color}15`, color, border: `0.5px solid ${color}30` }}>
      {status}
    </span>
  );
};

export default function AdminISPs() {
  const [isps, setIsps] = useState<ISP[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiry, setExpiry] = useState('7');
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [toast, setToast] = useState('');

  const token = () => localStorage.getItem('wb_token') || '';
  const h = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });

  const showToast = (msg: string, dur = 3000) => {
    setToast(msg);
    setTimeout(() => setToast(''), dur);
  };

  const load = () => {
    const t = token();
    if (!t) return;
    Promise.allSettled([
      fetch(`${API}/api/`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
      fetch(`${API}/api/admin/invites`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
    ]).then(([ispRes, invRes]) => {
      const ispList = ispRes.status === 'fulfilled'
        ? (Array.isArray(ispRes.value) ? ispRes.value : Array.isArray(ispRes.value?.value) ? ispRes.value.value : [])
        : [];
      const invList = invRes.status === 'fulfilled'
        ? (Array.isArray(invRes.value) ? invRes.value : Array.isArray(invRes.value?.value) ? invRes.value.value : [])
        : [];
      setIsps(ispList);
      setInvites(invList);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const generateInvite = async () => {
    setGenerating(true);
    try {
      const r = await fetch(`${API}/api/admin/invites/generate`, {
        method: 'POST', headers: h(),
        body: JSON.stringify({ expires_in_days: parseInt(expiry) }),
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setGeneratedLink(data.url || data.invite_link || '');
      setInvites(prev => [data, ...prev]);
      showToast('Invite generated');
    } catch { showToast('Failed to generate'); }
    finally { setGenerating(false); }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard');
  };

  const activeISPs = isps.filter(i => i.is_active);
  const pendingISPs = isps.filter(i => !i.is_active);

  return (
    <div style={{ background: C.void, color: C.text, minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* TOPBAR */}
      <div style={{ height: 52, borderBottom: `0.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
        <div style={{ fontSize: 18, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
          ISP Network
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.muted }}>
            {activeISPs.length} active · {pendingISPs.length} pending
          </span>
        </div>
      </div>

      <div style={{ padding: 28, maxWidth: 1200, margin: '0 auto' }}>

        {/* GENERATE INVITE */}
        <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderTop: `2px solid ${C.gold}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
          {lbl('Generate Invite Link')}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' as const }}>
            <div>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Mono, monospace', marginBottom: 6 }}>EXPIRES IN</div>
              <select
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
                style={{ background: C.raised, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.text, fontFamily: 'DM Mono, monospace', fontSize: 12, outline: 'none' }}
              >
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
              </select>
            </div>
            <button
              onClick={generateInvite}
              disabled={generating}
              style={{ background: C.gold, border: 'none', borderRadius: 8, padding: '10px 24px', color: '#000', fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', fontSize: 13, cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1, marginTop: 22 }}
            >
              {generating ? 'Generating...' : 'Generate Link'}
            </button>
          </div>

          {generatedLink && (
            <div style={{ marginTop: 16, background: C.raised, border: `0.5px solid ${C.gold}30`, borderRadius: 8, padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
              <code style={{ flex: 1, fontSize: 11, color: C.gold, fontFamily: 'DM Mono, monospace', wordBreak: 'break-all' as const }}>{generatedLink}</code>
              <button
                onClick={() => copy(generatedLink)}
                style={{ background: `${C.gold}20`, border: `0.5px solid ${C.gold}40`, borderRadius: 6, padding: '6px 14px', color: C.gold, fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
              >
                Copy
              </button>
            </div>
          )}
        </div>

        {/* ACTIVE ISPs */}
        <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
          {lbl(`Active ISPs (${activeISPs.length})`)}
          {loading ? (
            <div style={{ color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace' }}>Loading...</div>
          ) : activeISPs.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace', padding: '16px 0' }}>No active ISPs</div>
          ) : (
            <div>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px 100px 80px', gap: 16, paddingBottom: 10, borderBottom: `0.5px solid ${C.dim}`, marginBottom: 4 }}>
                {['ISP', 'Email', 'Commission', 'Since', 'Status'].map(h => (
                  <div key={h} style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: C.muted }}>{h}</div>
                ))}
              </div>
              {activeISPs.map((isp, i) => (
                <div key={isp.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 160px 120px 100px 80px',
                  gap: 16, padding: '14px 0',
                  borderBottom: i < activeISPs.length - 1 ? `0.5px solid ${C.dim}` : 'none',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 3 }}>{isp.name}</div>
                    <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.muted }}>/{isp.slug}</div>
                  </div>
                  <div style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#666' }}>{isp.email || '--'}</div>
                  <div style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', color: C.gold }}>{isp.commission_rate ?? '--'}%</div>
                  <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.muted }}>
                    {new Date(isp.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </div>
                  {badge('active')}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PENDING ISPs */}
        {(loading || pendingISPs.length > 0) && (
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderTop: `2px solid ${C.amber}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
            {lbl(`Pending Approval (${pendingISPs.length})`)}
            {loading ? (
              <div style={{ color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace' }}>Loading...</div>
            ) : pendingISPs.length === 0 ? (
              <div style={{ color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace', padding: '8px 0' }}>No pending ISPs</div>
            ) : (
              <div>
                {pendingISPs.map((isp, i) => (
                  <div key={isp.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr 160px 120px',
                    gap: 16, padding: '14px 0',
                    borderBottom: i < pendingISPs.length - 1 ? `0.5px solid ${C.dim}` : 'none',
                    alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 3 }}>{isp.name}</div>
                      <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.muted }}>
                        {isp.email || isp.id.slice(0, 12) + '…'} · Registered {new Date(isp.created_at).toLocaleDateString('en-KE')}
                      </div>
                    </div>
                    {badge('pending')}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={async () => {
                          try {
                            const r = await fetch(`${API}/api/admin/isps/${isp.id}/approve`, { method: 'POST', headers: h() });
                            if (!r.ok) throw new Error();
                            showToast(`${isp.name} approved`);
                            load();
                          } catch { showToast('Approval failed'); }
                        }}
                        style={{ background: `${C.green}15`, border: `0.5px solid ${C.green}30`, borderRadius: 6, padding: '6px 14px', color: C.green, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Reject ${isp.name}?`)) return;
                          try {
                            const r = await fetch(`${API}/api/admin/isps/${isp.id}/reject`, { method: 'POST', headers: h() });
                            if (!r.ok) throw new Error();
                            showToast(`${isp.name} rejected`);
                            load();
                          } catch { showToast('Action failed'); }
                        }}
                        style={{ background: `${C.red}15`, border: `0.5px solid ${C.red}30`, borderRadius: 6, padding: '6px 14px', color: C.red, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* INVITE HISTORY */}
        <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: 24 }}>
          {lbl('Invite History')}
          {loading ? (
            <div style={{ color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace' }}>Loading...</div>
          ) : invites.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace', padding: '8px 0' }}>No invites generated yet</div>
          ) : (
            <div>
              {invites.map((inv, i) => (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < invites.length - 1 ? `0.5px solid ${C.dim}` : 'none' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: inv.status === 'used' ? C.green : inv.status === 'expired' ? C.red : C.amber, flexShrink: 0 }} />
                  <code style={{ flex: 1, fontSize: 10, color: C.muted, fontFamily: 'DM Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {inv.url || `...token=${inv.token?.slice(0, 16)}...`}
                  </code>
                  <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', fontWeight: 700, color: inv.status === 'used' ? C.green : inv.status === 'expired' ? C.red : C.amber, textTransform: 'uppercase' as const, flexShrink: 0 }}>
                    {inv.status}
                  </span>
                  <button
                    onClick={() => copy(inv.url || `${inv.token}`)}
                    style={{ background: C.raised, border: `0.5px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', color: C.muted, fontSize: 10, cursor: 'pointer', flexShrink: 0 }}
                  >
                    copy
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: C.base, border: `0.5px solid ${C.green}40`, color: C.green, padding: '12px 20px', borderRadius: 10, fontSize: 12, fontFamily: 'DM Mono, monospace', fontWeight: 700, zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
