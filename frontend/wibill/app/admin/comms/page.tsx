'use client';

import { useEffect, useState } from 'react';
import { Loader2, Send, Building2, Globe, CheckCircle2, AlertTriangle, Clock, MessageSquare, RefreshCw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const C = {
  bg: '#050505', panel: '#0b0b0b', panel2: '#0f0f0f', panel3: '#121212',
  border: 'rgba(255,255,255,0.07)', borderSoft: 'rgba(255,255,255,0.04)',
  text: '#f4f4f4', muted: '#8a8a8a', dim: '#5f5f5f', gold: '#E8B84B',
  green: '#22c55e', red: '#ef4444',
};

function getToken() { return localStorage.getItem('wb_token') || ''; }
function authHeaders() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }; }

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function CommsPage() {
  const [activeTab, setActiveTab] = useState<'broadcast' | 'direct'>('broadcast');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const [isps, setIsps] = useState<any[]>([]);
  const [selectedIsp, setSelectedIsp] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${API}/api/admin/tenants`, { headers: authHeaders() }),
        fetch(`${API}/api/admin/comms/history`, { headers: authHeaders() }),
      ]);
      if (r1.ok) {
        const data = await r1.json();
        setIsps(Array.isArray(data) ? data : []);
      }
      if (r2.ok) setHistory(await r2.json());
    } catch (e) { console.error(e); }
    finally { setLoadingHistory(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  async function send() {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const endpoint = activeTab === 'broadcast'
        ? `${API}/api/admin/comms/broadcast`
        : `${API}/api/admin/comms/direct`;
      const body = activeTab === 'broadcast'
        ? JSON.stringify({ title: title.trim(), message: message.trim() })
        : JSON.stringify({ tenant_id: selectedIsp, title: title.trim(), message: message.trim() });

      const r = await fetch(endpoint, { method: 'POST', headers: authHeaders(), body });
      if (r.ok) {
        setResult({ ok: true, text: activeTab === 'broadcast' ? 'Broadcast sent to all ISPs' : 'Message sent' });
        setTitle(''); setMessage('');
        const h = await fetch(`${API}/api/admin/comms/history`, { headers: authHeaders() });
        if (h.ok) setHistory(await h.json());
      } else {
        const txt = await r.text();
        setResult({ ok: false, text: txt || 'Failed to send' });
      }
    } catch (e) {
      setResult({ ok: false, text: 'Network error' });
    } finally { setSending(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1520, margin: '0 auto', padding: '0 28px 36px' }}>
        <header style={{ height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: '"Space Grotesk", Inter, sans-serif', fontSize: 18, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Comms
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: C.muted }}>Platform communications · Broadcasts & direct messages</div>
          </div>
          <button onClick={load} disabled={refreshing} title="Refresh" style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${C.border}`, background: 'transparent', cursor: refreshing ? 'not-allowed' : 'pointer', color: C.muted,
            animation: refreshing ? 'spin 1s linear infinite' : 'none',
          }}>
            <RefreshCw size={14} />
          </button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {/* Send message */}
          <div style={{ background: C.panel, border: `0.5px solid #2A2A27`, borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setActiveTab('broadcast')} style={{ flex: 1, height: 40, borderRadius: 10, border: `0.5px solid ${activeTab === 'broadcast' ? C.gold : C.border}`, background: activeTab === 'broadcast' ? `${C.gold}12` : C.panel2, color: activeTab === 'broadcast' ? C.gold : C.muted, fontFamily: '"Space Grotesk", Inter, sans-serif', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Globe size={14} /> Broadcast
              </button>
              <button onClick={() => setActiveTab('direct')} style={{ flex: 1, height: 40, borderRadius: 10, border: `0.5px solid ${activeTab === 'direct' ? C.gold : C.border}`, background: activeTab === 'direct' ? `${C.gold}12` : C.panel2, color: activeTab === 'direct' ? C.gold : C.muted, fontFamily: '"Space Grotesk", Inter, sans-serif', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Building2 size={14} /> Direct
              </button>
            </div>

            {activeTab === 'direct' && (
              <select value={selectedIsp} onChange={e => setSelectedIsp(e.target.value)} style={{ height: 44, padding: '0 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.panel2, color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
                <option value="">Select ISP...</option>
                {isps.map((isp: any) => (
                  <option key={isp.id} value={isp.id}>{isp.name} ({isp.slug})</option>
                ))}
              </select>
            )}

            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" style={{ height: 44, padding: '0 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.panel2, color: C.text, fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', outline: 'none' }} />

            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Message" rows={4} style={{ padding: 14, borderRadius: 12, border: `1px solid ${C.border}`, background: C.panel2, color: C.text, fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', outline: 'none', resize: 'vertical' }} />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={send} disabled={sending || !title.trim() || !message.trim() || (activeTab === 'direct' && !selectedIsp)} style={{ height: 40, padding: '0 20px', borderRadius: 10, border: 'none', background: C.gold, color: '#000', fontFamily: '"Space Grotesk", Inter, sans-serif', fontWeight: 800, fontSize: 12, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                {sending ? 'Sending...' : activeTab === 'broadcast' ? 'Broadcast' : 'Send Direct'}
              </button>
            </div>

            {result && (
              <div style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid ${result.ok ? C.green : C.red}33`, background: result.ok ? `${C.green}14` : `${C.red}14`, color: result.ok ? C.green : C.red, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                {result.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                {result.text}
              </div>
            )}
          </div>

          {/* History */}
          <div style={{ background: C.panel, border: `0.5px solid #2A2A27`, borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontFamily: '"Space Grotesk", Inter, sans-serif', fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>History</div>
            {loadingHistory && history.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <style>{`@keyframes skel-pulse { 0%,100% { opacity: 0.2; } 50% { opacity: 0.5; } }`}</style>
                {[1, 2, 3].map(r => (
                  <div key={r} style={{ padding: '14px 0', borderBottom: `1px solid ${C.borderSoft}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <div style={{ width: 12, height: 12, background: C.dim, borderRadius: '50%', animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${r * 0.1}s` }} />
                      <div style={{ width: '40%', height: 13, background: C.dim, borderRadius: 4, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${r * 0.1}s` }} />
                    </div>
                    <div style={{ width: '80%', height: 10, background: C.dim, borderRadius: 4, marginTop: 6, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${r * 0.12}s` }} />
                    <div style={{ width: '50%', height: 10, background: C.dim, borderRadius: 4, marginTop: 4, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${r * 0.14}s` }} />
                  </div>
                ))}
              </div>
            ) : loadingHistory ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, padding: 20 }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
              </div>
            ) : history.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: C.muted, fontSize: 13 }}>No messages sent yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto', maxHeight: 520 }}>
                {history.map((h: any) => (
                  <div key={h.id} style={{ padding: '14px 0', borderBottom: `1px solid ${C.borderSoft}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {h.type === 'broadcast' ? <Globe size={12} color={C.gold} /> : <Building2 size={12} color={C.muted} />}
                          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{h.title}</span>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{h.message}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 10, color: C.dim, fontFamily: '"DM Mono", monospace' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={10} />{formatTime(h.created_at)}</span>
                      {h.target_tenant_name && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Building2 size={10} />{h.target_tenant_name}</span>}
                      <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
