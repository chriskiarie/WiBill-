'use client';
import { useEffect, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const C = {
  black: '#000', card: '#0D0D0B', border: '#2A2A27', line: '#1A1A18',
  text: '#EDEBE6', dim: '#8C8A84', mute: '#6B6964', faint: '#3A3A37',
  gold: '#E8B84B', green: '#6FCF73', red: '#E5707A',
};

function statusTone(s?: string): 'good' | 'warn' | 'bad' | 'neutral' {
  const v = (s || '').toUpperCase();
  if (['SUCCESS', 'ACTIVE', 'PAID', 'PROVISIONED', 'COMPLETED', 'ONLINE', 'UP', 'FLOWING', 'HEALTHY', 'PROCESSED'].includes(v)) return 'good';
  if (['PENDING', 'PROCESSING', 'PROVISIONING', 'WAITING', 'BACKLOGGED', 'DEGRADED'].includes(v)) return 'warn';
  if (['FAILED', 'STUCK', 'DOWN', 'OFFLINE', 'BLOCKED', 'ACTIVE_NO_USER', 'UNKNOWN'].includes(v)) return 'bad';
  return 'neutral';
}

const toneMap: Record<string, string> = { good: C.green, warn: C.gold, bad: C.red, neutral: C.mute };

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: '"Space Grotesk", sans-serif', color: C.text }}>{title}</span>
      {count !== undefined && <span style={{ fontSize: 10, fontFamily: '"DM Mono", monospace', color: C.faint }}>({count})</span>}
    </div>
  );
}

export default function OperationsCenter() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const t = localStorage.getItem('wb_token');
    if (!t) return;
    try {
      const r = await fetch(`${API}/api/admin/operations`, { headers: { Authorization: `Bearer ${t}` } });
      if (r.ok) {
        const d = await r.json();
        setData(d);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  if (loading && !data) {
    return <div style={{ padding: 28, color: C.mute }}>Loading Operations Center...</div>;
  }

  const pq = data?.payments_queue || [];
  const prvq = data?.provisioning_queue || [];
  const sq = data?.session_queue || [];
  const rh = data?.router_health || [];
  const nh = data?.network_health || [];

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1440, fontFamily: 'Inter, sans-serif', color: C.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: '"Space Grotesk", sans-serif', fontSize: 22, fontWeight: 700 }}>Operations Center</h1>
        <button onClick={load} style={{
          height: 32, padding: '0 12px', borderRadius: 6, border: `0.5px solid ${C.border}`,
          background: C.card, color: C.mute, fontSize: 11, cursor: 'pointer',
        }}>REFRESH</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* A. Payments Queue */}
        <div>
          <SectionHeader title="Payments Queue" count={pq.length} />
          {pq.length === 0 ? (
            <EmptyState msg="No payments in last 24h" />
          ) : (
            <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
              <TableHeader cols={['PHONE', 'AMOUNT', 'ISP', 'STATUS', 'CALLBACK', 'SESSION']} />
              {pq.map((p: any, i: number) => (
                <TableRow key={p.id} i={i} cols={[
                  <span key="p" style={{ fontFamily: '"DM Mono", monospace', fontSize: 11 }}>{p.phone}</span>,
                  <span key="a" style={{ fontFamily: '"DM Mono", monospace', fontSize: 11 }}>KES {p.amount_ksh?.toLocaleString()}</span>,
                  <span key="t" style={{ fontSize: 11 }}>{p.tenant_name}</span>,
                  <Badge key="s" value={p.status} />,
                  <Badge key="c" value={p.has_callback ? 'PROCESSED' : 'PENDING'} />,
                  <span key="ss" style={{ fontSize: 10, color: toneMap[statusTone(p.session_status)] }}>{p.session_status || '\u2014'}</span>,
                ]} />
              ))}
            </div>
          )}
        </div>

        {/* B. Provisioning Queue */}
        <div>
          <SectionHeader title="Provisioning Queue" count={prvq.length} />
          {prvq.length === 0 ? (
            <EmptyState msg="No sessions awaiting provisioning" />
          ) : (
            <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
              <TableHeader cols={['SESSION', 'ISP', 'MAC', 'PHONE', 'STATUS', 'PROVISIONING', 'ROUTER USER']} />
              {prvq.map((p: any, i: number) => (
                <TableRow key={p.session_id} i={i} cols={[
                  <span key="s" style={{ fontFamily: '"DM Mono", monospace', fontSize: 9 }}>{p.session_id?.slice(0, 8)}</span>,
                  <span key="t" style={{ fontSize: 11 }}>{p.tenant_name}</span>,
                  <span key="m" style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: C.dim }}>{p.mac_address}</span>,
                  <span key="p" style={{ fontSize: 10 }}>{p.phone || '\u2014'}</span>,
                  <Badge key="st" value={p.status} />,
                  <Badge key="pr" value={p.provisioning_status} />,
                  <span key="ru" style={{ fontSize: 10, color: p.has_router_user ? C.green : C.dim }}>{p.has_router_user ? 'YES' : 'NO'}</span>,
                ]} />
              ))}
            </div>
          )}
        </div>

        {/* C. Session Queue */}
        <div>
          <SectionHeader title="Session Queue" count={sq.length} />
          {sq.length === 0 ? (
            <EmptyState msg="No sessions" />
          ) : (
            <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
              <TableHeader cols={['SESSION', 'ISP', 'MAC', 'PHONE', 'STATUS', 'CREATED', 'EXPIRES']} />
              {sq.slice(0, 25).map((s: any, i: number) => (
                <TableRow key={s.session_id} i={i} cols={[
                  <span key="sid" style={{ fontFamily: '"DM Mono", monospace', fontSize: 9 }}>{s.session_id?.slice(0, 8)}</span>,
                  <span key="tn" style={{ fontSize: 11 }}>{s.tenant_name}</span>,
                  <span key="mac" style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: C.dim }}>{s.mac_address}</span>,
                  <span key="ph" style={{ fontSize: 10 }}>{s.phone || '\u2014'}</span>,
                  <Badge key="st" value={s.status} />,
                  <span key="ca" style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: C.dim }}>
                    {s.created_at ? new Date(s.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>,
                  <span key="ea" style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: C.dim }}>
                    {s.expires_at ? new Date(s.expires_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>,
                ]} />
              ))}
            </div>
          )}
        </div>

        {/* D. Router Health */}
        <div>
          <SectionHeader title="Router Health" count={rh.length} />
          {rh.length === 0 ? (
            <EmptyState msg="No routers configured" />
          ) : (
            <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
              <TableHeader cols={['ISP', 'ROUTER IP', 'STATUS', 'NETWORK', 'LAST ERROR']} />
              {rh.map((r: any, i: number) => (
                <TableRow key={r.tenant_id} i={i} cols={[
                  <span key="tn" style={{ fontSize: 11 }}>{r.tenant_name}</span>,
                  <span key="ip" style={{ fontFamily: '"DM Mono", monospace', fontSize: 10 }}>{r.router_ip}</span>,
                  <Badge key="st" value={r.status} />,
                  <Badge key="ns" value={r.latest_network_status} />,
                  <span key="er" style={{ fontSize: 10, color: r.last_error ? C.red : C.dim }}>{r.last_error || '\u2014'}</span>,
                ]} />
              ))}
            </div>
          )}
        </div>

        {/* E. Network Health */}
        <div>
          <SectionHeader title="Network Health" count={nh.length} />
          {nh.length === 0 ? (
            <EmptyState msg="No network data available" />
          ) : (
            <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
              <TableHeader cols={['ISP', 'STATUS', 'LAST CHECKED', 'RECENT DOWNS (5M)']} />
              {nh.map((n: any, i: number) => (
                <TableRow key={n.tenant_id} i={i} cols={[
                  <span key="tn" style={{ fontSize: 11 }}>{n.tenant_name}</span>,
                  <Badge key="st" value={n.status} />,
                  <span key="lc" style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: C.dim }}>
                    {n.last_checked ? new Date(n.last_checked).toLocaleString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '\u2014'}
                  </span>,
                  <span key="rd" style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: (n.recent_downs_5min || 0) > 0 ? C.red : C.green }}>
                    {n.recent_downs_5min || 0}
                  </span>,
                ]} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function TableHeader({ cols }: { cols: string[] }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${cols.length}, 1fr)`, gap: 8,
      padding: '8px 12px', borderBottom: `0.5px solid ${C.line}`,
      fontSize: 9, fontWeight: 700, color: C.faint, letterSpacing: '0.08em', textTransform: 'uppercase',
    }}>
      {cols.map(c => <span key={c}>{c}</span>)}
    </div>
  );
}

function TableRow({ cols, i }: { cols: any[]; i: number }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${cols.length}, 1fr)`, gap: 8,
      padding: '9px 12px', alignItems: 'center',
      background: i % 2 === 0 ? 'transparent' : '#0A0A0A',
      borderBottom: `0.5px solid ${C.line}`,
    }}>
      {cols.map((c, idx) => <div key={idx}>{c}</div>)}
    </div>
  );
}

function Badge({ value }: { value?: string }) {
  const tone = statusTone(value);
  return (
    <span style={{
      display: 'inline-block', padding: '2px 6px', borderRadius: 4,
      fontSize: 8, fontWeight: 700, fontFamily: '"DM Mono", monospace',
      textTransform: 'uppercase', letterSpacing: '0.04em',
      background: `${toneMap[tone]}15`, color: toneMap[tone],
    }}>
      {value || 'N/A'}
    </span>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div style={{
      padding: '24px 0', textAlign: 'center', color: C.mute, fontSize: 12,
      border: `0.5px dashed ${C.faint}`, borderRadius: 8,
    }}>{msg}</div>
  );
}
