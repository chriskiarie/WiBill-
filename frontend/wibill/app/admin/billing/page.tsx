'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Partner {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  is_locked: boolean;
  commission_rate: number;
  total_revenue: number;
  platform_earnings: number;
  isp_earnings: number;
  transaction_count: number;
}

const C = {
  void: '#000000',
  base: '#0a0a0a',
  raised: '#0d0d0d',
  border: '#141414',
  text: '#f0f0f0',
  dim: '#666666',
  mute: '#2a2a2a',
  gold: '#E8B84B',
  green: '#22c55e',
  red: '#ef4444',
};

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const fetchPartners = useCallback(async () => {
    const token = localStorage.getItem('wb_token');
    if (!token) return;
    setRefreshing(true);
    try {
      const res = await fetch(`${API}/api/admin/partners/revenue`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPartners(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  const totalPartners = partners.length;
  const premiumPartners = partners.filter(p => p.commission_rate < 10).length;
  const totalPlatformEarnings = partners.reduce((s, p) => s + p.platform_earnings, 0);
  const totalRevenue = partners.reduce((s, p) => s + p.total_revenue, 0);
  const avgCommission = totalPartners > 0
    ? (partners.reduce((s, p) => s + p.commission_rate, 0) / totalPartners)
    : 0;

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}k`;
    return `KES ${n.toFixed(0)}`;
  };

  const startEdit = (p: Partner) => {
    setEditingId(p.id);
    setEditRate(p.commission_rate);
  };

  const saveRate = async (id: string) => {
    const token = localStorage.getItem('wb_token');
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/tenants/${id}/commission`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ commission_rate: editRate }),
      });
      if (res.ok) {
        setPartners(prev => prev.map(p => p.id === id ? { ...p, commission_rate: editRate } : p));
      }
    } finally {
      setSaving(false);
      setEditingId(null);
    }
  };

  const cancelEdit = () => setEditingId(null);

  const skel = (w: string, h: number, d = 0) => ({
    width: w, height: h, background: C.mute, borderRadius: 6,
    animation: 'skel-pulse 2s ease-in-out infinite',
    animationDelay: `${d}s`,
  });

  if (loading && partners.length === 0) {
    return (
      <div style={{ background: C.void, color: C.text, minHeight: '100vh', padding: '32px 36px', maxWidth: '1600px', margin: '0 auto' }}>
        <style>{`@keyframes skel-pulse { 0%,100% { opacity: 0.2; } 50% { opacity: 0.5; } }`}</style>
        <div style={skel('240px', 36, 0)} />
        <div style={{ ...skel('300px', 13, 0.1), marginTop: 8, marginBottom: 32 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
          {[0.1, 0.2, 0.3, 0.4].map(d => (
            <div key={d} style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={skel('60%', 10, d)} />
              <div style={{ ...skel('50%', 28, d + 0.05), marginTop: 8, marginBottom: 4 }} />
              <div style={skel('50%', 11, d + 0.1)} />
            </div>
          ))}
        </div>
        <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={skel('160px', 14, 0.2)} />
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1.5fr 1.5fr 1fr 80px', gap: 8, padding: '12px 0', borderBottom: `0.5px solid ${C.border}` }}>
            {[1, 2, 3, 4, 5, 6, 7].map(i => <div key={i} style={skel('100%', 10, 0.2 + i * 0.03)} />)}
          </div>
          {[1, 2, 3, 4, 5].map(r => (
            <div key={r} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1.5fr 1.5fr 1fr 80px', gap: 8, padding: '14px 0', borderBottom: `0.5px solid ${C.border}` }}>
              {[1, 2, 3, 4, 5, 6, 7].map(i => <div key={i} style={skel('100%', 13, 0.2 + r * 0.04 + i * 0.02)} />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.void, color: C.text, minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif', padding: '32px 36px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.025em', margin: '0 0 8px', color: C.text, fontFamily: '"Space Grotesk", sans-serif' }}>
              Partner Network
            </h1>
            <p style={{ fontSize: 13, color: C.dim, margin: 0 }}>
              Every ISP on the platform — their terms, their revenue, your earnings
            </p>
          </div>
          <button onClick={fetchPartners} disabled={refreshing} title="Refresh" style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `0.5px solid ${C.border}`, background: C.base, cursor: refreshing ? 'not-allowed' : 'pointer', color: C.dim,
            animation: refreshing ? 'spin 1s linear infinite' : 'none',
          }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Total Partners', value: totalPartners.toString(), sub: `${premiumPartners} premium`, accent: C.text },
          { label: 'Platform Earnings', value: fmt(totalPlatformEarnings), sub: `from ${totalRevenue > 0 ? ((totalPlatformEarnings / totalRevenue) * 100).toFixed(1) : 0}% take rate`, accent: C.gold },
          { label: 'Total Revenue', value: fmt(totalRevenue), sub: 'across all partners', accent: C.green },
          { label: 'Avg Commission', value: `${avgCommission.toFixed(1)}%`, sub: 'per partner', accent: C.gold },
        ].map((card, i) => (
          <div key={i} style={{
            background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 20, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: card.accent }} />
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mute, marginBottom: 8 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 500, color: card.accent, fontFamily: '"DM Mono", monospace', marginBottom: 4 }}>
              {card.value}
            </div>
            <div style={{ fontSize: 11, color: C.dim, fontFamily: '"DM Mono", monospace' }}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* PARTNER TABLE */}
      <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {/* HEADER ROW */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1.5fr 1.5fr 1fr 80px',
          gap: 8, padding: '12px 20px', borderBottom: `0.5px solid ${C.border}`,
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mute,
        }}>
          <div>Partner</div>
          <div>Tier</div>
          <div>Commission</div>
          <div>Total Revenue</div>
          <div>You Earned</div>
          <div>Txns</div>
          <div></div>
        </div>

        {partners.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: C.mute, fontSize: 12 }}>
            No partners yet
          </div>
        ) : (
          partners.map((p, idx) => {
            const isPremium = p.commission_rate < 10;
            return (
              <div key={p.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1.5fr 1.5fr 1fr 80px',
                gap: 8, padding: '14px 20px',
                background: idx % 2 === 0 ? 'transparent' : C.raised,
                borderBottom: `0.5px solid ${C.border}`,
                alignItems: 'center',
                fontSize: 13,
                opacity: p.is_locked ? 0.4 : 1,
              }}>
                {/* NAME */}
                <div>
                  <div style={{ fontWeight: 600, color: C.text, marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: C.mute, fontFamily: '"DM Mono", monospace' }}>{p.slug}</div>
                </div>

                {/* TIER */}
                <div>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                    fontSize: 9, fontWeight: 700, textTransform: 'uppercase', fontFamily: '"DM Mono", monospace',
                    background: isPremium ? 'rgba(232, 184, 75, 0.12)' : C.raised,
                    color: isPremium ? C.gold : C.dim,
                    border: `0.5px solid ${isPremium ? C.gold : C.border}`,
                  }}>
                    {isPremium ? 'Premium' : 'Standard'}
                  </span>
                </div>

                {/* COMMISSION - EDITABLE INLINE */}
                <div>
                  {editingId === p.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="number"
                        value={editRate}
                        onChange={e => setEditRate(parseFloat(e.target.value) || 0)}
                        min={0}
                        max={100}
                        step={0.5}
                        style={{
                          width: 56, padding: '4px 8px', borderRadius: 6, border: `0.5px solid ${C.gold}`,
                          background: C.void, color: C.text, fontSize: 13, fontFamily: '"DM Mono", monospace',
                          outline: 'none',
                        }}
                        onKeyDown={e => e.key === 'Enter' && saveRate(p.id)}
                        autoFocus
                      />
                      <span style={{ fontSize: 10, color: C.dim, fontFamily: '"DM Mono", monospace' }}>%</span>
                      <button onClick={() => saveRate(p.id)} disabled={saving} style={{
                        background: C.gold, color: C.void, border: 'none', borderRadius: 4,
                        padding: '4px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                        fontFamily: '"DM Mono", monospace', opacity: saving ? 0.5 : 1,
                      }}>
                        {saving ? '...' : 'Save'}
                      </button>
                      <button onClick={cancelEdit} style={{
                        background: 'transparent', color: C.dim, border: `0.5px solid ${C.border}`, borderRadius: 4,
                        padding: '4px 8px', fontSize: 10, cursor: 'pointer', fontFamily: '"DM Mono", monospace',
                      }}>
                        X
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: C.gold, fontWeight: 700, fontFamily: '"DM Mono", monospace' }}>
                        {p.commission_rate}%
                      </span>
                    </div>
                  )}
                </div>

                {/* TOTAL REVENUE */}
                <div style={{ fontFamily: '"DM Mono", monospace', fontWeight: 500 }}>
                  {fmt(p.total_revenue)}
                </div>

                {/* PLATFORM EARNINGS */}
                <div style={{ fontFamily: '"DM Mono", monospace', fontWeight: 700, color: C.gold }}>
                  {fmt(p.platform_earnings)}
                </div>

                {/* TXN COUNT */}
                <div style={{ fontFamily: '"DM Mono", monospace', color: C.dim }}>
                  {p.transaction_count}
                </div>

                {/* EDIT BUTTON */}
                <div>
                  {editingId !== p.id && (
                    <button onClick={() => startEdit(p)} style={{
                      background: 'transparent', border: `0.5px solid ${C.border}`, borderRadius: 6,
                      padding: '6px 12px', fontSize: 10, fontWeight: 600, color: C.dim, cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif',
                    }}>
                      Edit
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
