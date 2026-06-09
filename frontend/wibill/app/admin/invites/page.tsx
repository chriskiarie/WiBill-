'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const FRONTEND = 'https://wi-bill.vercel.app';

const C = {
  void: '#000000', base: '#080808', raised: '#0d0d0d',
  border: '#141414', dim: '#1e1e1e',
  text: '#f0f0f0', muted: '#444444', secondary: '#666666',
  gold: '#E8B84B', green: '#22c55e', amber: '#f59e0b', red: '#ef4444',
};

interface Invite {
  id: string;
  token: string;
  status: 'pending' | 'used' | 'expired';
  created_at: string;
  expires_at: string;
  url: string;
}

interface ApprovedISP {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  is_active: boolean;
}

const lbl = (t: string) => (
  <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: C.muted, marginBottom: 12 }}>
    {t}
  </div>
);

export default function AdminInvites() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [approvedISPs, setApprovedISPs] = useState<ApprovedISP[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiry, setExpiry] = useState('7');
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const token = () => localStorage.getItem('wb_token') || '';
  const h = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });

  useEffect(() => {
    const t = token();
    if (!t) return;
    Promise.allSettled([
      fetch(`${API}/api/admin/invites`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
      fetch(`${API}/api/`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
    ]).then(([invRes, ispRes]) => {
      if (invRes.status === 'fulfilled') {
        const v = invRes.value;
        setInvites(Array.isArray(v) ? v : Array.isArray(v?.value) ? v.value : []);
      }
      if (ispRes.status === 'fulfilled') {
        const v = ispRes.value;
        const list: ApprovedISP[] = Array.isArray(v) ? v : Array.isArray(v?.value) ? v.value : [];
        setApprovedISPs(list.filter(i => i.is_active === true));
      }
      setLoading(false);
    });
  }, []);

  const generateInvite = async () => {
    setGenerating(true);
    try {
      const r = await fetch(`${API}/api/admin/invites/generate`, {
        method: 'POST', headers: h(),
        body: JSON.stringify({ expires_in_days: parseInt(expiry) }),
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      const link = data.url || data.invite_link || '';
      setGeneratedLink(link);
      setInvites(prev => [data, ...prev]);
      showToast('Invite link generated');
    } catch { showToast('Failed to generate invite'); }
    finally { setGenerating(false); }
  };

  const copy = (text: string, msg = 'Copied!') => {
    navigator.clipboard.writeText(text);
    showToast(msg);
  };

  const copyRow = (label: string, value: string) => (
    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `0.5px solid ${C.dim}` }}>
      <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.muted, width: 72, flexShrink: 0 }}>{label}</span>
      <code style={{ flex: 1, fontSize: 11, color: C.secondary, fontFamily: 'DM Mono, monospace', wordBreak: 'break-all' as const }}>{value}</code>
      <button
        onClick={() => copy(value)}
        style={{ background: C.raised, border: `0.5px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', color: C.muted, fontSize: 10, cursor: 'pointer', flexShrink: 0, fontFamily: 'DM Mono, monospace' }}
      >
        copy
      </button>
    </div>
  );

  const statusColor = (s: string) => s === 'used' ? C.green : s === 'expired' ? C.red : C.amber;

  return (
    <div style={{ background: C.void, color: C.text, minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* TOPBAR */}
      <div style={{ height: 52, borderBottom: `0.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
        <div style={{ fontSize: 18, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase' as const }}>
          Invites
        </div>
        <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.muted }}>
          {invites.length} generated · {approvedISPs.length} active ISPs
        </span>
      </div>

      <div style={{ padding: 28, maxWidth: 960, margin: '0 auto' }}>

        {/* GENERATE */}
        <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderTop: `2px solid ${C.gold}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
          {lbl('Generate New Invite')}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' as const }}>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.muted, marginBottom: 6 }}>EXPIRES IN</div>
              <select
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
                style={{ background: C.raised, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.text, fontFamily: 'DM Mono, monospace', fontSize: 12, outline: 'none', cursor: 'pointer' }}
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
              style={{ background: C.gold, border: 'none', borderRadius: 8, padding: '10px 24px', color: '#000', fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', fontSize: 13, cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1 }}
            >
              {generating ? 'Generating...' : 'Generate Link'}
            </button>
          </div>

          {generatedLink && (
            <div style={{ marginTop: 16, background: C.raised, border: `0.5px solid ${C.gold}30`, borderRadius: 8, padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
              <code style={{ flex: 1, fontSize: 11, color: C.gold, fontFamily: 'DM Mono, monospace', wordBreak: 'break-all' as const }}>{generatedLink}</code>
              <button
                onClick={() => copy(generatedLink, 'Link copied!')}
                style={{ background: `${C.gold}20`, border: `0.5px solid ${C.gold}40`, borderRadius: 6, padding: '6px 14px', color: C.gold, fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'DM Mono, monospace' }}
              >
                Copy
              </button>
            </div>
          )}
        </div>

        {/* APPROVED ISPs — DASHBOARD LINKS */}
        <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
          {lbl('Approved ISPs — Dashboard Links')}
          <p style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.muted, marginBottom: 16 }}>
            Copy and send to approved ISPs to access their dashboard
          </p>
          {loading ? (
            <div style={{ color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace' }}>Loading...</div>
          ) : approvedISPs.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 12, fontFamily: 'DM Mono, monospace', padding: '8px 0' }}>No approved ISPs yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {approvedISPs.map(isp => (
                <div key={isp.id} style={{ background: C.raised, border: `0.5px solid ${C.green}20`, borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: 'Space Grotesk, sans-serif' }}>{isp.name}</span>
                    <span style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Mono, monospace' }}>/{isp.slug}</span>
                  </div>
                  {copyRow('Dashboard', `${FRONTEND}/login`)}
                  {copyRow('Portal', `https://wibill-production.up.railway.app/portal/${isp.slug}`)}
                  {copyRow('Approved', new Date(isp.created_at).toLocaleDateString('en-KE'))}
                </div>
              ))}
            </div>
          )}
        </div>

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
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor(inv.status), flexShrink: 0 }} />
                  <code style={{ flex: 1, fontSize: 10, color: C.muted, fontFamily: 'DM Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {inv.url || `${FRONTEND}/login?token=${inv.token}`}
                  </code>
                  <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase' as const, color: statusColor(inv.status), flexShrink: 0 }}>
                    {inv.status}
                  </span>
                  <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.muted, flexShrink: 0 }}>
                    {new Date(inv.expires_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                  </span>
                  <button
                    onClick={() => copy(inv.url || `${FRONTEND}/login?token=${inv.token}`, 'Copied!')}
                    style={{ background: C.raised, border: `0.5px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', color: C.muted, fontSize: 10, cursor: 'pointer', flexShrink: 0, fontFamily: 'DM Mono, monospace' }}
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
