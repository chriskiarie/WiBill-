'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ClipboardCopy,
  Loader2,
  Link2,
  Clock3,
  Users,
  Server,
  AlertTriangle,
  CheckCircle2,
  Search,
  Sparkles,
  ShieldCheck,
  ShieldX,
  Building2,
  X,
  RefreshCw,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Invite {
  id: string;
  token: string;
  url?: string;
  invite_link?: string;
  expires_at: string;
  created_at: string;
  status: string;
  isp_name?: string | null;
  used_by_tenant_name?: string | null;
  used_at?: string | null;
}

interface ISP {
  id: string;
  name: string;
  slug: string;
  email: string;
  is_active: boolean;
  is_locked: boolean;
  commission_rate: number;
  created_at: string;
}

type Tone = 'good' | 'warn' | 'bad' | 'neutral';

// ── Design tokens ──────────────────────────────────────────────────────────────

const C = {
  bg:         '#050505',
  panel:      '#0b0b0b',
  panel2:     '#0f0f0f',
  border:     'rgba(255,255,255,0.07)',
  borderSoft: 'rgba(255,255,255,0.04)',
  text:       '#f4f4f4',
  muted:      '#8a8a8a',
  dim:        '#5f5f5f',
  gold:       '#E8B84B',
  green:      '#22c55e',
  red:        '#ef4444',
  amber:      '#f59e0b',
  blue:       '#60a5fa',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toneColor(t: Tone) {
  return t === 'good' ? C.green : t === 'warn' ? C.amber : t === 'bad' ? C.red : '#EDEBE6';
}
function toneBg(t: Tone)     { return `${toneColor(t)}14`; }
function toneBorder(t: Tone) { return `${toneColor(t)}33`; }
function shortId(id: string, len = 10) { return id.length > len ? `${id.slice(0, len)}…` : id; }

// resolve whichever field the backend returns
function inviteUrl(inv: Invite): string {
  return inv.invite_link || inv.url || '';
}

function getToken(): string {
  return localStorage.getItem('wb_token') || localStorage.getItem('wibill_token') || '';
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json', Accept: 'application/json' };
}

// ── Shared UI components ──────────────────────────────────────────────────────

function Panel({ title, subtitle, accent = C.gold, children }: { title: string; subtitle?: string; accent?: string; children: ReactNode }) {
  return (
    <section style={{ background: C.panel, border: `1px solid ${C.border}`, borderTop: `2px solid ${accent}`, borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ fontFamily: '"Space Grotesk", Inter, sans-serif', fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
          {title}
        </div>
        {subtitle && <div style={{ marginTop: 6, fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{subtitle}</div>}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </section>
  );
}

function StatCard({ label, value, sub, tone = 'neutral' }: { label: string; value: string; sub: string; tone?: Tone }) {
  const c = toneColor(tone);
  return (
    <div style={{ background: C.panel2, border: `1px solid ${toneBorder(tone)}`, borderRadius: 16, padding: 18 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: C.muted }}>{label}</div>
      <div style={{ marginTop: 14, fontFamily: '"DM Mono", monospace', fontSize: 28, lineHeight: 1, color: c }}>{value}</div>
      <div style={{ marginTop: 8, fontSize: 12, color: C.dim }}>{sub}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminISPNetwork() {
  // Invite state
  const [invites, setInvites]           = useState<Invite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [generating, setGenerating]     = useState(false);
  const [newISPName, setNewISPName]     = useState('');
  const [generatedLink, setGeneratedLink] = useState<Invite | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [statusMsg, setStatusMsg]       = useState('');
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [searchTerm, setSearchTerm]     = useState('');

  // ISP state
  const [isps, setIsps]                 = useState<ISP[]>([]);
  const [loadingISPs, setLoadingISPs]   = useState(true);
  const [approvingId, setApprovingId]   = useState<string | null>(null);
  const [rejectingId, setRejectingId]   = useState<string | null>(null);
  const [ispMsg, setIspMsg]             = useState('');

  // ── Data loaders ────────────────────────────────────────────────────────────

  async function loadInvites() {
    if (!getToken()) {
      setStatusMsg('Authentication token missing. Please sign in again.');
      setLoadingInvites(false);
      return;
    }
    try {
      let r = await fetch(`${API}/api/admin/invites`, { headers: authHeaders() });
      if (r.status === 404) r = await fetch(`${API}/api/invites`, { headers: authHeaders() });
      if (r.ok) {
        const data = await r.json();
        const list = Array.isArray(data?.value) ? data.value : Array.isArray(data) ? data : [];
        setInvites(list);
      } else if (r.status === 401) {
        setStatusMsg('Session expired. Please log back in.');
      }
    } catch (e) {
      console.error('Failed to load invites:', e);
    } finally {
      setLoadingInvites(false);
    }
  }

  async function loadISPs() {
    if (!getToken()) { setLoadingISPs(false); return; }
    try {
      const r = await fetch(`${API}/api/admin/tenants`, { headers: authHeaders() });
      if (r.ok) {
        const data = await r.json();
        const list: ISP[] = Array.isArray(data) ? data : Array.isArray(data?.value) ? data.value : [];
        setIsps(list);
      }
    } catch (e) {
      console.error('Failed to load ISPs:', e);
    } finally {
      setLoadingISPs(false);
    }
  }

  async function refreshAll() {
    setRefreshing(true);
    setLoadingInvites(true);
    setLoadingISPs(true);
    await Promise.all([loadInvites(), loadISPs()]);
    setRefreshing(false);
  }

  useEffect(() => { loadInvites(); loadISPs(); }, []);

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function generateInvite() {
    if (!newISPName.trim()) { setStatusMsg('Please enter a valid ISP name.'); return; }
    setGenerating(true);
    setStatusMsg('');
    try {
      const body = JSON.stringify({ isp_name: newISPName.trim(), expires_in_days: 7 });
      let r = await fetch(`${API}/api/admin/invites/generate`, { method: 'POST', headers: authHeaders(), body });
      if (r.status === 404) r = await fetch(`${API}/api/invites/generate`, { method: 'POST', headers: authHeaders(), body });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(txt || `Server error ${r.status}`);
      }
      const data: Invite = await r.json();
      setGeneratedLink(data);
      setInvites(prev => [data, ...prev]);
      setNewISPName('');
      setStatusMsg('Invite token issued successfully.');
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : 'Failed to generate invite.');
    } finally {
      setGenerating(false);
    }
  }

  async function approveISP(isp: ISP) {
    setApprovingId(isp.id);
    setIspMsg('');
    try {
      const r = await fetch(`${API}/api/admin/tenants/${isp.id}/approve`, { method: 'PATCH', headers: authHeaders() });
      if (!r.ok) throw new Error(`Approval failed: ${r.status}`);
      setIspMsg(`${isp.name} approved successfully.`);
      await loadISPs();
    } catch (e) {
      setIspMsg(e instanceof Error ? e.message : 'Approval failed.');
    } finally {
      setApprovingId(null);
    }
  }

  async function rejectISP(isp: ISP) {
    if (!confirm(`Reject ${isp.name}? This cannot be undone.`)) return;
    setRejectingId(isp.id);
    setIspMsg('');
    try {
      const r = await fetch(`${API}/api/admin/tenants/${isp.id}/reject`, { method: 'PATCH', headers: authHeaders() });
      if (!r.ok) throw new Error(`Rejection failed: ${r.status}`);
      setIspMsg(`${isp.name} rejected.`);
      await loadISPs();
    } catch (e) {
      setIspMsg(e instanceof Error ? e.message : 'Rejection failed.');
    } finally {
      setRejectingId(null);
    }
  }

  async function suspendISP(isp: ISP) {
    setApprovingId(isp.id);
    setIspMsg('');
    try {
      const r = await fetch(`${API}/api/admin/tenants/${isp.id}/suspend`, { method: 'PATCH', headers: authHeaders() });
      if (!r.ok) throw new Error(`Suspend failed: ${r.status}`);
      setIspMsg(`${isp.name} suspended.`);
      await loadISPs();
    } catch (e) {
      setIspMsg(e instanceof Error ? e.message : 'Suspend failed.');
    } finally {
      setApprovingId(null);
    }
  }

  async function unsuspendISP(isp: ISP) {
    setApprovingId(isp.id);
    setIspMsg('');
    try {
      const r = await fetch(`${API}/api/admin/tenants/${isp.id}/unsuspend`, { method: 'PATCH', headers: authHeaders() });
      if (!r.ok) throw new Error(`Unsuspend failed: ${r.status}`);
      setIspMsg(`${isp.name} reactivated.`);
      await loadISPs();
    } catch (e) {
      setIspMsg(e instanceof Error ? e.message : 'Unsuspend failed.');
    } finally {
      setApprovingId(null);
    }
  }

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(id);
      setTimeout(() => setCopied(null), 1800);
    }
  }

  // ── Derived state ────────────────────────────────────────────────────────────

  const visibleInvites = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return invites;
    return invites.filter(i =>
      i.id.toLowerCase().includes(q) ||
      (i.isp_name || '').toLowerCase().includes(q) ||
      (i.status || '').toLowerCase().includes(q)
    );
  }, [invites, searchTerm]);

  const activeISPs   = isps.filter(i => i.is_active);
  const pendingISPs  = isps.filter(i => !i.is_active && !i.is_locked);
  const pendingCount = invites.filter(i => (i.status || '').toLowerCase() === 'pending').length;
  const usedCount    = invites.filter(i => (i.status || '').toLowerCase() === 'used').length;

  const isError = (msg: string) => msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error') || msg.toLowerCase().includes('expired');

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1520, margin: '0 auto', padding: '0 28px 36px' }}>

        {/* ── Header ── */}
        <header style={{ height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: '"Space Grotesk", Inter, sans-serif', fontSize: 18, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              ISP Network
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: C.muted }}>Onboarding · Approvals · Invite management</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={refreshAll} disabled={refreshing} title="Refresh" style={{
              width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${C.border}`, background: 'transparent', cursor: refreshing ? 'not-allowed' : 'pointer', color: C.muted,
              animation: refreshing ? 'spin 1s linear infinite' : 'none',
            }}>
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => setShowInvitePanel(true)}
              style={{ height: 36, padding: '0 16px', borderRadius: 10, border: `1px solid rgba(232,184,75,0.3)`, background: 'rgba(232,184,75,0.08)', color: C.gold, fontFamily: '"Space Grotesk", Inter, sans-serif', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,184,75,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(232,184,75,0.08)'}
            >
              <Link2 size={14} />
              Generate Invite
            </button>
          </div>
        </header>

        {(loadingInvites && loadingISPs && invites.length === 0 && isps.length === 0) ? (
          <div>
            <style>{`@keyframes skel-pulse { 0%,100% { opacity: 0.2; } 50% { opacity: 0.5; } }`}</style>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 18 }}>
              {[0.1, 0.2, 0.3, 0.4].map(d => (
                <div key={d} style={{ background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
                  <div style={{ width: '60%', height: 10, background: C.dim, borderRadius: 4, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${d}s` }} />
                  <div style={{ width: '40%', height: 28, background: C.dim, borderRadius: 4, marginTop: 14, marginBottom: 8, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${d + 0.05}s` }} />
                  <div style={{ width: '50%', height: 12, background: C.dim, borderRadius: 4, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${d + 0.1}s` }} />
                </div>
              ))}
            </div>
            {[1, 2, 3].map(p => (
              <div key={p} style={{ background: C.panel, border: `1px solid ${C.border}`, borderTop: '2px solid #333', borderRadius: 18, overflow: 'hidden', marginBottom: 18 }}>
                <div style={{ padding: '18px 20px 8px' }}>
                  <div style={{ width: '180px', height: 15, background: C.dim, borderRadius: 4, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${0.1 + p * 0.1}s` }} />
                  <div style={{ width: '260px', height: 12, background: C.dim, borderRadius: 4, marginTop: 6, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${0.15 + p * 0.1}s` }} />
                </div>
                <div style={{ padding: 20 }}>
                  {[1, 2, 3].map(r => (
                    <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: r < 3 ? `1px solid ${C.borderSoft}` : 'none' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.dim, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${0.2 + p * 0.1 + r * 0.05}s` }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ width: '40%', height: 13, background: C.dim, borderRadius: 4, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${0.2 + p * 0.1 + r * 0.05}s` }} />
                        <div style={{ width: '60%', height: 10, background: C.dim, borderRadius: 4, marginTop: 4, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${0.25 + p * 0.1 + r * 0.05}s` }} />
                      </div>
                      <div style={{ width: 60, height: 20, background: C.dim, borderRadius: 6, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${0.3 + p * 0.1 + r * 0.05}s` }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
        <main style={{ display: 'grid', gap: 18 }}>

          {/* ── Stat cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
            <StatCard label="Total ISPs"     value={loadingISPs    ? '…' : `${isps.length}`}    sub="all registered partners"             tone="neutral" />
            <StatCard label="Active"         value={loadingISPs    ? '…' : `${activeISPs.length}`}  sub="live on the platform"            tone="good"    />
            <StatCard label="Pending approval" value={loadingISPs  ? '…' : `${pendingISPs.length}`} sub="awaiting your review"            tone="warn"    />
            <StatCard label="Invites sent"   value={loadingInvites ? '…' : `${invites.length}`} sub={`${usedCount} used · ${pendingCount} pending`} tone="neutral" />
          </div>

          {/* ── Pending approvals (only shown when there are pending ISPs) ── */}
          {(loadingISPs || pendingISPs.length > 0) && (
            <Panel title="Pending Approvals" subtitle="ISPs who have registered and are waiting for your approval to go live." accent={C.amber}>
              {ispMsg && (
                <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 12, background: isError(ispMsg) ? toneBg('bad') : toneBg('good'), border: `1px solid ${isError(ispMsg) ? toneBorder('bad') : toneBorder('good')}`, color: isError(ispMsg) ? C.red : C.green, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  {isError(ispMsg) ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                  {ispMsg}
                </div>
              )}
              {loadingISPs ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.muted, padding: '20px 0' }}>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Loading ISPs...
                </div>
              ) : pendingISPs.length === 0 ? (
                <div style={{ color: C.muted, fontSize: 13, padding: '12px 0' }}>No pending approvals.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {pendingISPs.map(isp => (
                    <div key={isp.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center', padding: '16px 18px', borderRadius: 14, background: C.panel2, border: `1px solid ${C.border}` }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Building2 size={14} color={C.amber} />
                          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{isp.name}</span>
                          <span style={{ fontSize: 10, fontFamily: '"DM Mono", monospace', color: C.muted }}>/{isp.slug}</span>
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', gap: 16, fontSize: 11, fontFamily: '"DM Mono", monospace', color: C.dim }}>
                          {isp.email && <span>{isp.email}</span>}
                          <span>Registered {new Date(isp.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                          {isp.commission_rate != null && <span>Commission: {isp.commission_rate}%</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => approveISP(isp)}
                          disabled={approvingId === isp.id || rejectingId === isp.id}
                          style={{ height: 38, padding: '0 16px', borderRadius: 10, border: `1px solid ${toneBorder('good')}`, background: toneBg('good'), color: C.green, fontFamily: '"Space Grotesk", Inter, sans-serif', fontWeight: 700, fontSize: 12, cursor: approvingId === isp.id ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: approvingId === isp.id ? 0.6 : 1 }}
                        >
                          {approvingId === isp.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={13} />}
                          {approvingId === isp.id ? 'Approving…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => rejectISP(isp)}
                          disabled={approvingId === isp.id || rejectingId === isp.id}
                          style={{ height: 38, padding: '0 16px', borderRadius: 10, border: `1px solid ${toneBorder('bad')}`, background: toneBg('bad'), color: C.red, fontFamily: '"Space Grotesk", Inter, sans-serif', fontWeight: 700, fontSize: 12, cursor: rejectingId === isp.id ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: rejectingId === isp.id ? 0.6 : 1 }}
                        >
                          {rejectingId === isp.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldX size={13} />}
                          {rejectingId === isp.id ? 'Rejecting…' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}

        {/* ── Active ISPs ── */}
        <Panel title="Active Partners" subtitle="ISPs currently live on the platform." accent={C.green}>
          {loadingISPs ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.muted, padding: '20px 0' }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Loading ISPs...
            </div>
          ) : activeISPs.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13, padding: '12px 0' }}>No active ISPs yet. Approve a pending registration or send an invite link.</div>
          ) : (
            <div style={{ display: 'grid', gap: 2 }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 120px 140px', gap: 16, padding: '8px 18px', fontSize: 9, fontFamily: '"DM Mono", monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: C.dim }}>
                <span>ISP</span><span>Email</span><span>Commission</span><span style={{ textAlign: 'right' }}>Actions</span>
              </div>
              {activeISPs.map((isp, i) => (
                <div key={isp.id} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 120px 140px', gap: 16, alignItems: 'center', padding: '13px 18px', borderRadius: 12, background: i % 2 === 0 ? 'transparent' : `${C.border}`, borderBottom: `1px solid ${C.borderSoft}` }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}`, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{isp.name}</span>
                      <span style={{ fontSize: 10, fontFamily: '"DM Mono", monospace', color: C.dim }}>/{isp.slug}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontFamily: '"DM Mono", monospace', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isp.email || '—'}</div>
                  <div style={{ fontSize: 13, fontFamily: '"DM Mono", monospace', color: C.gold }}>{isp.commission_rate != null ? `${isp.commission_rate}%` : '—'}</div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => suspendISP(isp)}
                      disabled={approvingId === isp.id}
                      style={{ height: 36, padding: '0 14px', borderRadius: 8, border: `1px solid ${toneBorder('warn')}`, background: toneBg('warn'), color: C.amber, fontFamily: '"Space Grotesk", Inter, sans-serif', fontWeight: 700, fontSize: 11, cursor: approvingId === isp.id ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, opacity: approvingId === isp.id ? 0.6 : 1 }}
                    >
                      {approvingId === isp.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : 'Suspend'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

          {/* ── Invite History ── */}
          <Panel title="Invite History" subtitle="All ISP onboarding tokens issued by the platform." accent={C.gold}>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.panel2 }}>
                <Search size={14} color={C.dim} />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Filter by ISP name, status, or ID"
                  style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', color: C.text, fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif' }}
                />
              </div>
              <div style={{ display: 'grid', gap: 0 }}>
                {loadingInvites ? (
                  <div style={{ minHeight: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `1px dashed ${C.borderSoft}`, borderRadius: 12, color: C.muted, gap: 8 }}>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <div style={{ fontSize: 12 }}>Loading invites...</div>
                  </div>
                ) : visibleInvites.length === 0 ? (
                  <div style={{ minHeight: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `1px dashed ${C.borderSoft}`, borderRadius: 12, color: C.muted, gap: 8 }}>
                    <Users size={18} color={C.dim} />
                    <div style={{ fontSize: 12 }}>No invite records yet.</div>
                  </div>
                ) : (
                  <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 80px 28px', gap: 12, padding: '8px 14px', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.dim, borderBottom: `1px solid ${C.borderSoft}` }}>
                    <span>ISP</span><span>Created</span><span>Expires</span><span>Status</span><span></span>
                  </div>
                  {visibleInvites.slice(0, 20).map((invite, i) => {
                    const status = (invite.status || '').toLowerCase();
                    const tone: Tone = status === 'used' ? 'good' : status === 'expired' ? 'bad' : 'warn';
                    const link = inviteUrl(invite);
                    const displayName = invite.used_by_tenant_name || invite.isp_name || '—';
                    return (
                      <div key={invite.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 80px 28px', gap: 12, alignItems: 'center', padding: '10px 14px', borderBottom: i < Math.min(visibleInvites.length, 20) - 1 ? `1px solid ${C.borderSoft}` : 'none', fontSize: 11 }}>
                        <div>
                          <div style={{ fontWeight: 600, color: C.text, fontSize: 12 }}>{displayName}</div>
                          <div style={{ marginTop: 2, fontSize: 9, color: C.dim, fontFamily: '"DM Mono", monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {invite.id.slice(0, 8)}…
                          </div>
                        </div>
                        <div style={{ fontFamily: '"DM Mono", monospace', color: C.dim, fontSize: 9 }}>
                          {invite.created_at ? new Date(invite.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '—'}
                        </div>
                        <div style={{ fontFamily: '"DM Mono", monospace', color: C.dim, fontSize: 9 }}>
                          {invite.expires_at ? new Date(invite.expires_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '—'}
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '3px 8px', borderRadius: 999, border: `1px solid ${toneBorder(tone)}`, background: toneBg(tone), color: toneColor(tone), fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: '"DM Mono", monospace', fontWeight: 700 }}>
                          {invite.status || 'pending'}
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {link && status === 'pending' && (
                            <button onClick={() => copyToClipboard(link, invite.id)} title={copied === invite.id ? 'Copied!' : 'Copy invite link'} style={{ background: 'none', border: 'none', color: copied === invite.id ? C.green : C.dim, cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
                              <ClipboardCopy size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </>
                )}
              </div>
            </div>
          </Panel>

        </main>
        )}

        {/* ── Generate Invite slide-in panel ── */}
        {showInvitePanel && (
          <>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999 }} onClick={() => setShowInvitePanel(false)} />
            <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, background: C.panel, borderLeft: `1px solid ${C.border}`, zIndex: 1000, padding: 28, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: '"Space Grotesk", Inter, sans-serif', fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Generate Invite</div>
                <button onClick={() => setShowInvitePanel(false)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.muted }}>ISP Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Zuku Nairobi"
                    value={newISPName}
                    onChange={e => setNewISPName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') generateInvite(); }}
                    disabled={generating}
                    style={{ height: 48, padding: '0 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.panel2, color: C.text, outline: 'none', fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif' }}
                  />
                </div>

                <button
                  onClick={generateInvite}
                  disabled={generating || !newISPName.trim()}
                  style={{ height: 48, borderRadius: 12, border: 'none', background: C.gold, color: '#000', fontFamily: '"Space Grotesk", Inter, sans-serif', fontWeight: 800, fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: generating || !newISPName.trim() ? 'not-allowed' : 'pointer', opacity: generating || !newISPName.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {generating ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Link2 size={16} />}
                  {generating ? 'Generating…' : 'Generate Invite Link'}
                </button>

                <div style={{ padding: 14, borderRadius: 12, border: `1px solid ${C.borderSoft}`, background: C.panel2, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Sparkles size={14} color={C.gold} style={{ marginTop: 1, flexShrink: 0 }} />
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>The system issues a tokenised onboarding URL with a 7-day expiry. Share it with the ISP — they register, you approve.</div>
                </div>

                {statusMsg && (
                  <div style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid ${isError(statusMsg) ? toneBorder('bad') : toneBorder('good')}`, background: isError(statusMsg) ? toneBg('bad') : toneBg('good'), color: isError(statusMsg) ? C.red : C.green, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    {isError(statusMsg) ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                    {statusMsg}
                  </div>
                )}

                {generatedLink && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 12, border: `1px solid ${toneBorder('good')}`, background: C.panel2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.green }}>Invite created</span>
                      <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: C.dim }}>{generatedLink.expires_at ? `Expires ${new Date(generatedLink.expires_at).toLocaleDateString()}` : ''}</span>
                    </div>
                    <div style={{ padding: 12, borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, wordBreak: 'break-all', fontFamily: '"DM Mono", monospace', fontSize: 11, lineHeight: 1.6, color: C.text }}>
                      {inviteUrl(generatedLink)}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => copyToClipboard(inviteUrl(generatedLink), 'generated')} style={{ height: 38, padding: '0 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: '"Space Grotesk", Inter, sans-serif', fontWeight: 700, fontSize: 12 }}>
                        <ClipboardCopy size={14} />
                        {copied === 'generated' ? 'Copied!' : 'Copy Link'}
                      </button>
                      <div style={{ height: 38, padding: '0 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: toneBg('good'), color: C.green, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: '"DM Mono", monospace' }}>
                        <Clock3 size={13} />
                        {generatedLink.status || 'pending'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}