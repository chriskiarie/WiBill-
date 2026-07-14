'use client';

import { useEffect, useState } from 'react';
import { Loader2, Search, Clock, User, Activity, RefreshCw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const C = {
  black: '#000',   card: 'rgba(13,13,11,0.55)', line: '#1A1A18', border: '#2A2A27',
  text: '#EDEBE6', dim: '#8C8A84', mute: '#6B6964', faint: '#3A3A37',
  gold: '#E8B84B', green: '#6FCF73',
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
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    setRefreshing(true);
    try {
      const r = await fetch(`${API}/api/admin/audit-logs?limit=100`, { headers: authHeaders() });
      if (r.ok) setLogs(await r.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = search.trim()
    ? logs.filter(l =>
        l.actor_email.toLowerCase().includes(search.toLowerCase()) ||
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        (l.target_type || '').toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div style={{ background: 'transparent', color: C.text, fontFamily: 'Inter, system-ui, sans-serif', padding: 'var(--space-lg)', width: '100%', minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
        <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: C.text }}>
          Audit Log
        </h1>
        <button onClick={load} disabled={refreshing} title="Refresh" style={{
          width: 36, height: 36, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${C.border}`, background: 'transparent', cursor: refreshing ? 'not-allowed' : 'pointer', color: C.dim,
          animation: refreshing ? 'spin 1s linear infinite' : 'none',
        }}>
          <RefreshCw size={14} />
        </button>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.line, maxWidth: 360 }}>
        <Search size={14} color={C.mute} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by actor, action, or target..." style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', color: C.text, fontSize: 13, fontFamily: 'inherit' }} />
      </div>

        {loading && logs.length === 0 ? (
          <div>
            <style>{`@keyframes skel-pulse { 0%,100% { opacity: 0.2; } 50% { opacity: 0.5; } }`}</style>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderTop: `2px solid ${C.gold}`, borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '180px 200px 140px 1fr', gap: 0 }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, borderLeft: i > 0 ? `1px solid ${C.line}` : 'none' }}>
                    <div style={{ width: '60%', height: 10, background: C.mute, borderRadius: 4, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${i * 0.05}s` }} />
                  </div>
                ))}
              </div>
              {[1, 2, 3, 4, 5, 6].map(r => (
                <div key={r} style={{ display: 'grid', gridTemplateColumns: '180px 200px 140px 1fr', gap: 0, background: r % 2 === 0 ? C.line : 'transparent', borderBottom: r < 6 ? `1px solid ${C.line}` : 'none' }}>
                  {[0.1, 0.15, 0.2, 0.25].map((d, i) => (
                    <div key={i} style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 6, borderLeft: i > 0 ? `1px solid ${C.line}` : 'none' }}>
                      <div style={{ flex: 1, height: 11, background: C.mute, borderRadius: 4, animation: 'skel-pulse 2s ease-in-out infinite', animationDelay: `${d + r * 0.03}s` }} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.dim, padding: '40px 0' }}><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Loading audit log...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.dim, fontSize: 13 }}>No audit entries yet. Actions will appear here as you manage the platform.</div>
        ) : (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderTop: `2px solid ${C.gold}`, borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 200px 140px 1fr', gap: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: C.mute, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ padding: '14px 18px' }}>Timestamp</div>
              <div style={{ padding: '14px 18px', borderLeft: `1px solid ${C.line}` }}>Actor</div>
              <div style={{ padding: '14px 18px', borderLeft: `1px solid ${C.line}` }}>Action</div>
              <div style={{ padding: '14px 18px', borderLeft: `1px solid ${C.line}` }}>Target</div>
            </div>
            {filtered.map((log, i) => (
              <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '180px 200px 140px 1fr', gap: 0, background: i % 2 === 0 ? 'transparent' : C.line, borderBottom: i < filtered.length - 1 ? `1px solid ${C.line}` : 'none' }}>
                <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: '"DM Mono", monospace', color: C.mute }}>
                  <Clock size={12} color={C.mute} />
                  {formatTime(log.created_at)}
                </div>
                <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, borderLeft: `1px solid ${C.line}` }}>
                  <User size={12} color={C.dim} />
                  <span style={{ color: C.text, fontFamily: '"DM Mono", monospace', fontSize: 11 }}>{log.actor_email}</span>
                </div>
                <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, borderLeft: `1px solid ${C.line}` }}>
                  <Activity size={12} color={C.gold} />
                  <span style={{ textTransform: 'capitalize' }}>{log.action.replace(/_/g, ' ')}</span>
                </div>
                <div style={{ padding: '12px 18px', fontSize: 12, color: C.dim, borderLeft: `1px solid ${C.line}` }}>
                  {log.target_type ? `${log.target_type}${log.target_id ? `: ${log.target_id.slice(0, 8)}…` : ''}` : '—'}
                </div>
              </div>
            ))}
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
