'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const FRONTEND = 'https://wi-bill.vercel.app';

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
}

export default function AdminInvites() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [approvedISPs, setApprovedISPs] = useState<ApprovedISP[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiry, setExpiry] = useState('7');
  const [generatedLink, setGeneratedLink] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const getToken = () => localStorage.getItem('wb_token') || '';

  useEffect(() => {
    const t = getToken();
    if (!t) return;
    Promise.all([
      fetch(`${API}/api/admin/invites`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
      fetch(`${API}/api/`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
    ]).then(([inv, isps]) => {
      setInvites(Array.isArray(inv) ? inv : []);
      const list = Array.isArray(isps) ? isps : Array.isArray(isps?.value) ? isps.value : [];
      setApprovedISPs(list.filter((i: ApprovedISP) => i.status === 'active'));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const generateInvite = async () => {
    const t = getToken();
    try {
      const r = await fetch(`${API}/api/admin/invites/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expires_in_days: parseInt(expiry) }),
      });
      if (!r.ok) throw new Error('Failed');
      const data = await r.json();
      setGeneratedLink(data.url);
      setInvites(prev => [data, ...prev]);
      showToast('Invite link generated');
    } catch { showToast('Failed to generate invite'); }
  };

  const copy = (text: string, label = 'Copied') => {
    navigator.clipboard.writeText(text);
    showToast(label);
  };

  const row = (label: string, value: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '0.5px solid #111' }}>
      <span style={{ fontSize: 11, color: '#444', width: 80, flexShrink: 0 }}>{label}</span>
      <code style={{ flex: 1, fontSize: 11, color: '#888', fontFamily: 'DM Mono, monospace', wordBreak: 'break-all' }}>{value}</code>
      <button onClick={() => copy(value)} style={{ background: '#111', border: '0.5px solid #222', borderRadius: 6, padding: '4px 10px', color: '#555', fontSize: 10, cursor: 'pointer' }}>copy</button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#030303', padding: '32px 24px', fontFamily: 'Syne, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Invites Control</h1>
        <p style={{ fontSize: 12, color: '#333', marginBottom: 32, fontFamily: 'DM Mono, monospace' }}>Generate invite links and manage approved ISP access</p>

        {/* Generate */}
        <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Generate New Invite</h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: 10, color: '#444', display: 'block', marginBottom: 4 }}>EXPIRES IN</label>
              <select value={expiry} onChange={e => setExpiry(e.target.value)} style={{ background: '#0a0a0a', border: '0.5px solid #1e1e1e', borderRadius: 8, padding: '10px 14px', color: '#f0f0f0', fontFamily: 'DM Mono, monospace', fontSize: 12 }}>
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
              </select>
            </div>
            <button onClick={generateInvite} style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', border: 'none', borderRadius: 10, padding: '11px 24px', color: '#0a0800', fontWeight: 700, cursor: 'pointer', fontSize: 13, marginTop: 16 }}>
              Generate Link
            </button>
          </div>
          {generatedLink && (
            <div style={{ marginTop: 16, background: '#0a0a0a', border: '0.5px solid #fbbf2440', borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <code style={{ flex: 1, fontSize: 11, color: '#fbbf24', fontFamily: 'DM Mono, monospace', wordBreak: 'break-all' }}>{generatedLink}</code>
                <button onClick={() => copy(generatedLink, 'Link copied!')} style={{ background: '#fbbf2420', border: '0.5px solid #fbbf2440', borderRadius: 6, padding: '6px 14px', color: '#fbbf24', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>Copy</button>
              </div>
            </div>
          )}
        </div>

        {/* Approved ISPs - Dashboard Links */}
        <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Approved ISPs — Dashboard Links</h2>
          <p style={{ fontSize: 11, color: '#333', fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>Copy and send these links to approved ISPs so they can access their dashboard</p>
          {loading ? (
            <div style={{ color: '#333', fontSize: 12 }}>Loading...</div>
          ) : approvedISPs.length === 0 ? (
            <div style={{ color: '#333', fontSize: 12, padding: '16px 0' }}>No approved ISPs yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {approvedISPs.map(isp => (
                <div key={isp.id} style={{ background: '#050505', border: '0.5px solid #1a3a1a', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{isp.name}</span>
                    <span style={{ fontSize: 10, color: '#444', fontFamily: 'DM Mono, monospace' }}>/{isp.slug}</span>
                  </div>
                  {row('Dashboard', `${FRONTEND}/login`)}
                  {row('Portal', `https://wibill-production.up.railway.app/portal/${isp.slug}`)}
                  {row('Approved', new Date(isp.created_at).toLocaleDateString('en-KE'))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invite History */}
        <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Invite History</h2>
          {loading ? <div style={{ color: '#333', fontSize: 12 }}>Loading...</div> : invites.length === 0 ? (
            <div style={{ color: '#333', fontSize: 12 }}>No invites generated yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {invites.map(inv => (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid #0d0d0d' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: inv.status === 'used' ? '#22c55e' : inv.status === 'expired' ? '#ef4444' : '#f59e0b', flexShrink: 0 }} />
                  <code style={{ flex: 1, fontSize: 10, color: '#444', fontFamily: 'DM Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.url || `${FRONTEND}/login?token=${inv.token}`}</code>
                  <span style={{ fontSize: 10, color: inv.status === 'used' ? '#22c55e' : inv.status === 'expired' ? '#ef4444' : '#f59e0b', flexShrink: 0, fontFamily: 'DM Mono, monospace' }}>{inv.status}</span>
                  <button onClick={() => copy(inv.url || `${FRONTEND}/login?token=${inv.token}`, 'Copied!')} style={{ background: '#111', border: '0.5px solid #222', borderRadius: 6, padding: '4px 10px', color: '#555', fontSize: 10, cursor: 'pointer', flexShrink: 0 }}>copy</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#22c55e', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
