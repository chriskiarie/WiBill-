'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Invite {
  id: string;
  token: string;
  status: 'pending' | 'used' | 'expired';
  created_at: string;
  expires_at: string;
  used_at?: string;
  created_by?: string;
}

// COLOR PALETTE - DEFINED FIRST
const colors = {
  void: '#000000',
  base: '#0a0a0a',
  raised: '#0d0d0d',
  border: '#141414',
  textPrimary: '#f0f0f0',
  textSecondary: '#666666',
  textMuted: '#2a2a2a',
  gold: '#E8B84B',
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
  blue: '#3b82f6',
};

export default function AdminInvites() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiry, setExpiry] = useState('7');
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'used' | 'expired'>('all');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<'delete' | 'extend' | null>(null);
  const [selectedInvites, setSelectedInvites] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    const token = localStorage.getItem('wb_token');
    if (!token) return;

    try {
      const r = await fetch(`${API}/api/admin/invites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      setInvites(Array.isArray(d) ? d : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateInvite = async () => {
    const token = localStorage.getItem('wb_token');
    if (!token) return;

    try {
      const r = await fetch(`${API}/api/admin/invites/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!r.ok) throw new Error('Failed to generate invite');

      const data = await r.json();
      setGeneratedLink(data.url);
      setShowSuccess(true);
      setExpiry('7');

      await loadInvites();
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate metrics
  const pending = invites.filter(i => i.status === 'pending').length;
  const accepted = invites.filter(i => i.status === 'used').length;
  const expired = invites.filter(i => i.status === 'expired').length;
  const total = pending + accepted + expired;
  const conversionRate = total > 0 ? ((accepted / total) * 100).toFixed(0) : '0';

  // Filter invites
  const filtered = invites.filter(invite => {
    if (selectedFilter !== 'all' && invite.status !== selectedFilter) return false;
    if (search) {
      return invite.token.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  // Real activity log
  const activityLog = invites
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(invite => ({
      type: invite.status as 'pending' | 'used' | 'expired',
      text: invite.status === 'pending' 
        ? 'Invite generated' 
        : invite.status === 'used'
        ? 'Invite accepted'
        : 'Invite expired',
      time: new Date(invite.created_at),
      id: invite.id,
    }));

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSelectInvite = (id: string) => {
    const newSet = new Set(selectedInvites);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedInvites(newSet);
  };

  return (
    <div style={{ background: colors.void, color: colors.textPrimary, minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif', padding: '32px 36px', maxWidth: '1800px', margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.025em', margin: '0 0 8px', color: colors.textPrimary, fontFamily: '"Space Grotesk", sans-serif' }}>
          Invite Management
        </h1>
        <p style={{ fontSize: 13, color: colors.textSecondary, margin: 0 }}>
          Generate, track, and manage ISP onboarding invites with real-time conversion metrics
        </p>
      </div>

      {/* PRIMARY KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Pending Invites', value: pending, color: colors.amber, icon: '⏳', change: 'Waiting' },
          { label: 'Accepted', value: accepted, color: colors.green, icon: '✓', change: 'Onboarded' },
          { label: 'Expired', value: expired, color: colors.red, icon: '✕', change: 'Invalid' },
          { label: 'Conversion Rate', value: conversionRate + '%', color: colors.blue, icon: '📊', change: 'Success' },
        ].map((metric, i) => (
          <div key={i} style={{
            background: colors.base,
            border: `0.5px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: metric.color }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.textMuted }}>
                {metric.label}
              </div>
              <span style={{ fontSize: 18 }}>{metric.icon}</span>
            </div>

            <div style={{ fontSize: 28, fontWeight: 900, color: metric.color, fontFamily: '"JetBrains Mono", monospace', marginBottom: '8px' }}>
              {metric.value}
            </div>

            <div style={{ fontSize: 11, color: metric.color, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
              {metric.change}
            </div>
          </div>
        ))}
      </div>

      {/* GENERATOR + ACTIVITY GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '32px' }}>
        {/* GENERATE INVITE */}
        <div style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif' }}>
            Generate New Invite
          </h2>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.textMuted, display: 'block', marginBottom: '6px' }}>
                Expires In
              </label>
              <select
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
                style={{
                  width: '100%',
                  background: colors.raised,
                  border: `0.5px solid ${colors.border}`,
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: colors.textPrimary,
                  fontSize: 12,
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              >
                <option value="1">1 Day</option>
                <option value="7">7 Days</option>
                <option value="14">14 Days</option>
                <option value="30">30 Days</option>
              </select>
            </div>

            <button
              onClick={generateInvite}
              style={{
                padding: '10px 16px',
                background: colors.gold,
                border: 'none',
                borderRadius: '8px',
                color: colors.void,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.opacity = '1';
              }}
            >
              🔗 Generate
            </button>
          </div>

          {showSuccess && (
            <div style={{
              background: `${colors.green}15`,
              border: `0.5px solid ${colors.green}40`,
              borderRadius: '8px',
              padding: '12px',
              color: colors.green,
              fontSize: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>✓ Invite generated successfully</div>
              <button
                onClick={() => copyToClipboard(generatedLink, 'latest')}
                style={{
                  background: `${colors.green}20`,
                  border: `0.5px solid ${colors.green}40`,
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: colors.green,
                  fontSize: 10,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {copiedId === 'latest' ? '✓ Copied' : 'Copy Link'}
              </button>
            </div>
          )}
        </div>

        {/* ACTIVITY FEED */}
        <div style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif' }}>
            Activity Feed
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activityLog.length === 0 ? (
              <div style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                No activity yet
              </div>
            ) : (
              activityLog.map((activity, i) => (
                <div
                  key={activity.id}
                  style={{
                    padding: '10px 12px',
                    background: colors.raised,
                    borderLeft: `3px solid ${
                      activity.type === 'used' ? colors.green :
                      activity.type === 'expired' ? colors.red :
                      colors.amber
                    }`,
                    borderRadius: '4px 6px 6px 4px',
                    fontSize: 11,
                  }}
                >
                  <div style={{ color: colors.textPrimary, fontWeight: 600, marginBottom: '2px' }}>
                    {activity.text}
                  </div>
                  <div style={{ color: colors.textMuted, fontSize: 10 }}>
                    {getTimeAgo(activity.time)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* FILTER + SEARCH */}
      <div style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '12px' }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.textMuted, display: 'block', marginBottom: '6px' }}>
              Search Invites
            </label>
            <input
              type="text"
              placeholder="Search by token..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: colors.raised,
                border: `0.5px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '10px 12px',
                color: colors.textPrimary,
                fontSize: 12,
                outline: 'none',
                fontFamily: '"JetBrains Mono", monospace',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.textMuted, display: 'block', marginBottom: '6px' }}>
              Filter
            </label>
            <select
              value={selectedFilter}
              onChange={e => setSelectedFilter(e.target.value as any)}
              style={{
                width: '100%',
                background: colors.raised,
                border: `0.5px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '10px 12px',
                color: colors.textPrimary,
                fontSize: 12,
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            >
              <option value="all">All ({invites.length})</option>
              <option value="pending">Pending ({pending})</option>
              <option value="used">Used ({accepted})</option>
              <option value="expired">Expired ({expired})</option>
            </select>
          </div>
        </div>
      </div>

      {/* INVITES TABLE */}
      <div style={{ background: colors.base, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '24px', overflowX: 'auto' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: '0 0 16px', fontFamily: '"Space Grotesk", sans-serif' }}>
          All Invites ({filtered.length})
        </h2>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: colors.textMuted }}>
            Loading invites...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: colors.textMuted }}>
            No invites found
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: '"JetBrains Mono", monospace' }}>
            <thead>
              <tr style={{ borderBottom: `0.5px solid ${colors.border}` }}>
                <th style={{ textAlign: 'left', padding: '12px 0', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
                  Token
                </th>
                <th style={{ textAlign: 'left', padding: '12px 0', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
                  Created
                </th>
                <th style={{ textAlign: 'left', padding: '12px 0', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
                  Expires
                </th>
                <th style={{ textAlign: 'center', padding: '12px 0', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
                  Status
                </th>
                <th style={{ textAlign: 'center', padding: '12px 0', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((invite, idx) => {
                const statusColor = {
                  pending: colors.amber,
                  used: colors.green,
                  expired: colors.red,
                }[invite.status];

                return (
                  <tr key={invite.id} style={{ borderBottom: `0.5px solid ${colors.border}`, background: idx % 2 === 0 ? colors.raised : 'transparent' }}>
                    <td style={{ padding: '12px 0', color: colors.blue }}>
                      {invite.token.slice(0, 16)}...
                    </td>
                    <td style={{ padding: '12px 0', color: colors.textSecondary }}>
                      {new Date(invite.created_at).toLocaleDateString('en-KE')}
                    </td>
                    <td style={{ padding: '12px 0', color: colors.textSecondary }}>
                      {new Date(invite.expires_at).toLocaleDateString('en-KE')}
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        background: `${statusColor}15`,
                        color: statusColor,
                        border: `0.5px solid ${statusColor}40`,
                      }}>
                        {invite.status === 'pending' ? '⏳' : invite.status === 'used' ? '✓' : '✕'} {invite.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'center' }}>
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/join?token=${invite.token}`, invite.id)}
                        style={{
                          background: colors.raised,
                          border: `0.5px solid ${colors.border}`,
                          borderRadius: '4px',
                          padding: '4px 8px',
                          color: colors.gold,
                          fontSize: 10,
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = colors.border;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = colors.raised;
                        }}
                      >
                        {copiedId === invite.id ? '✓' : '📋'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {filtered.length > 50 && (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: colors.textMuted,
            fontSize: 11,
            borderTop: `0.5px solid ${colors.border}`,
            marginTop: '16px',
          }}>
            Showing 50 of {filtered.length} invites
          </div>
        )}
      </div>
    </div>
  );
}