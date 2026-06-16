'use client';

import { useEffect, useState } from 'react';
import { Loader2, Search, Clock, User, Activity } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const C = {
  bg: '#050505', panel: '#0b0b0b', panel2: '#0f0f0f',
  border: 'rgba(255,255,255,0.07)', borderSoft: 'rgba(255,255,255,0.04)',
  text: '#f4f4f4', muted: '#8a8a8a', dim: '#5f5f5f', gold: '#E8B84B',
  green: '#22c55e',
};

function getToken() { return localStorage.getItem('wb_token') || ''; }
function authHeaders() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }; }

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch(`${API}/api/admin/audit-logs?limit=100`, { headers: authHeaders() });
        if (r.ok) setLogs(await r.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = search.trim()
    ? logs.filter(l =>
        l.actor_email.toLowerCase().includes(search.toLowerCase()) ||
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        (l.target_type || '').toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1520, margin: '0 auto', padding: '0 28px 36px' }}>
        <header style={{ height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: '"Space Grotesk", Inter, sans-serif', fontSize: 18, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Audit Log
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: C.muted }}>Every admin action recorded · Immutable trail</div>
          </div>
        </header>

        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.panel2, maxWidth: 360 }}>
          <Search size={14} color={C.dim} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by actor, action, or target..." style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', color: C.text, fontSize: 13, fontFamily: 'inherit' }} />
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.muted, padding: '40px 0' }}><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Loading audit log...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.muted, fontSize: 13 }}>No audit entries yet. Actions will appear here as you manage the platform.</div>
        ) : (
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderTop: `2px solid ${C.gold}`, borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 200px 140px 1fr', gap: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: C.dim, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ padding: '14px 18px' }}>Timestamp</div>
              <div style={{ padding: '14px 18px', borderLeft: `1px solid ${C.borderSoft}` }}>Actor</div>
              <div style={{ padding: '14px 18px', borderLeft: `1px solid ${C.borderSoft}` }}>Action</div>
              <div style={{ padding: '14px 18px', borderLeft: `1px solid ${C.borderSoft}` }}>Target</div>
            </div>
            {filtered.map((log, i) => (
              <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '180px 200px 140px 1fr', gap: 0, background: i % 2 === 0 ? 'transparent' : C.panel2, borderBottom: i < filtered.length - 1 ? `1px solid ${C.borderSoft}` : 'none' }}>
                <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: '"DM Mono", monospace', color: C.dim }}>
                  <Clock size={12} color={C.dim} />
                  {formatTime(log.created_at)}
                </div>
                <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, borderLeft: `1px solid ${C.borderSoft}` }}>
                  <User size={12} color={C.muted} />
                  <span style={{ color: C.text, fontFamily: '"DM Mono", monospace', fontSize: 11 }}>{log.actor_email}</span>
                </div>
                <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, borderLeft: `1px solid ${C.borderSoft}` }}>
                  <Activity size={12} color={C.gold} />
                  <span style={{ textTransform: 'capitalize' }}>{log.action.replace(/_/g, ' ')}</span>
                </div>
                <div style={{ padding: '12px 18px', fontSize: 12, color: C.muted, borderLeft: `1px solid ${C.borderSoft}` }}>
                  {log.target_type ? `${log.target_type}${log.target_id ? `: ${log.target_id.slice(0, 8)}…` : ''}` : '—'}
                </div>
              </div>
            ))}
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
