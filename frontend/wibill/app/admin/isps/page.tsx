'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Circle,
  ClipboardCopy,
  Loader2,
  Link2,
  RefreshCw,
  ShieldCheck,
  Clock3,
  Users,
  Server,
  AlertTriangle,
  CheckCircle2,
  Search,
  Sparkles,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ISPInvite {
  id: string;
  token: string;
  invite_link: string;
  expires_at: string;
  created_at: string;
  status: string;
  isp_name?: string;
}

type Tone = 'good' | 'warn' | 'bad' | 'neutral';

const COLORS = {
  bg: '#050505',
  panel: '#0b0b0b',
  panel2: '#0f0f0f',
  border: 'rgba(255,255,255,0.07)',
  borderSoft: 'rgba(255,255,255,0.04)',
  text: '#f4f4f4',
  muted: '#8a8a8a',
  dim: '#5f5f5f',
  gold: '#E8B84B',
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
  blue: '#60a5fa',
};

function toneColor(tone: Tone) {
  switch (tone) {
    case 'good':
      return COLORS.green;
    case 'warn':
      return COLORS.amber;
    case 'bad':
      return COLORS.red;
    default:
      return COLORS.blue;
  }
}

function toneBg(tone: Tone) {
  return `${toneColor(tone)}14`;
}

function toneBorder(tone: Tone) {
  return `${toneColor(tone)}33`;
}

function shortId(id: string, len = 10) {
  return id.length > len ? `${id.slice(0, len)}…` : id;
}

function Panel({
  title,
  subtitle,
  accent = COLORS.gold,
  children,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        background: COLORS.panel,
        border: `1px solid ${COLORS.border}`,
        borderTop: `2px solid ${accent}`,
        borderRadius: 18,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '18px 20px 0' }}>
        <div
          style={{
            fontFamily: '"Space Grotesk", Inter, sans-serif',
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div style={{ marginTop: 6, fontSize: 12, color: COLORS.muted, lineHeight: 1.4 }}>{subtitle}</div>
        ) : null}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </section>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub: string;
  tone?: Tone;
}) {
  const c = toneColor(tone);
  return (
    <div
      style={{
        background: COLORS.panel2,
        border: `1px solid ${toneBorder(tone)}`,
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: COLORS.muted }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 14,
          fontFamily: '"DM Mono", monospace',
          fontSize: 28,
          lineHeight: 1,
          color: c,
        }}
      >
        {value}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: COLORS.dim }}>{sub}</div>
    </div>
  );
}

export default function AdminISPNetwork() {
  const [isps, setIsps] = useState<ISPInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [newISPName, setNewISPName] = useState('');
  const [generatedLink, setGeneratedLink] = useState<ISPInvite | null>(null);
  const [showCopyMessage, setShowCopyMessage] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingList, setLoadingList] = useState(true);

// Load invites on mount
// Load invites on mount with robust token verification and path fallback
useEffect(() => {
  let mounted = true;

  async function loadInvites() {
    try {
      const token =
        localStorage.getItem('wb_token') ||
        localStorage.getItem('wibill_token');

      if (!token) {
        if (mounted) {
          setStatusMessage(
            'Authentication token missing. Please sign in again.'
          );
          setLoadingList(false);
        }
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      };

      let response = await fetch(`${API}/api/admin/invites`, {
        headers,
      });

      if (response.status === 404) {
        response = await fetch(`${API}/api/invites`, {
          headers,
        });
      }

      if (response.ok) {
        const data = await response.json();

        const list = Array.isArray(data?.value)
          ? data.value
          : Array.isArray(data)
          ? data
          : [];

        if (mounted) {
          setIsps(list as ISPInvite[]);
        }
      } else if (response.status === 401) {
        if (mounted) {
          setStatusMessage('Session expired. Please log back in.');
        }
      }
    } catch (e) {
      console.error('Invite list retrieval failed:', e);
    } finally {
      if (mounted) {
        setLoadingList(false);
      }
    }
  }

  loadInvites();

  return () => {
    mounted = false;
  };
}, []);

const generateInvite = async () => {
  if (!newISPName.trim()) {
    setStatusMessage('Please enter a valid ISP name.');
    return;
  }

  setLoading(true);
  setStatusMessage('');

  try {
    const token =
      localStorage.getItem('wb_token') ||
      localStorage.getItem('wibill_token');

    if (!token) {
      setStatusMessage('Authentication signature required.');
      setLoading(false);
      return;
    }

    const payload = {
      isp_name: newISPName.trim(),
      expires_in_days: 7,
    };

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    let response = await fetch(
      `${API}/api/admin/invites/generate`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }
    );

    if (response.status === 404) {
      response = await fetch(
        `${API}/api/invites/generate`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        }
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        text || `Server responded with status code ${response.status}`
      );
    }

    const data = (await response.json()) as ISPInvite;

    setGeneratedLink(data);
    setIsps((prev) => [data, ...prev]);
    setNewISPName('');
    setStatusMessage(
      'Invite token issued and saved successfully.'
    );
  } catch (e) {
    console.error('Invite generation transaction failed:', e);

    setStatusMessage(
      e instanceof Error
        ? e.message
        : 'Unknown routing error encountered'
    );
  } finally {
    setLoading(false);
  }
};

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShowCopyMessage(true);
      setTimeout(() => setShowCopyMessage(false), 1800);
    } catch (e) {
      console.error('Copy failed:', e);
      setStatusMessage('Failed to copy to clipboard.');
    }
  };

  const visibleInvites = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return isps;
    return isps.filter((item) => {
      return (
        item.id.toLowerCase().includes(q) ||
        (item.isp_name || '').toLowerCase().includes(q) ||
        (item.status || '').toLowerCase().includes(q)
      );
    });
  }, [isps, searchTerm]);

  const pendingCount = isps.filter((item) => (item.status || '').toLowerCase() === 'pending').length;
  const activeCount = isps.filter((item) => (item.status || '').toLowerCase() === 'active').length;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1520, margin: '0 auto', padding: '0 28px 36px' }}>
        <header
          style={{
            height: 68,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${COLORS.border}`,
            marginBottom: 24,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: '"Space Grotesk", Inter, sans-serif',
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              BATCAVE
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: COLORS.muted }}>ISP Network</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: COLORS.muted, fontSize: 12 }}>
            <Circle size={8} fill={COLORS.green} color={COLORS.green} />
            <span style={{ letterSpacing: '0.14em', textTransform: 'uppercase' }}>Invite operations</span>
          </div>
        </header>

        <main style={{ display: 'grid', gap: 18 }}>
          <section
            style={{
              background: `linear-gradient(180deg, #0b0b0b 0%, #080808 100%)`,
              border: `1px solid ${COLORS.border}`,
              borderTop: `2px solid ${COLORS.gold}`,
              borderRadius: 22,
              padding: 22,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-end', marginBottom: 20 }}>
              <div>
                <div
                  style={{
                    fontFamily: '"Space Grotesk", Inter, sans-serif',
                    fontSize: 34,
                    lineHeight: 1,
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  ISP Network
                </div>
                <div style={{ marginTop: 10, color: COLORS.muted, maxWidth: 720, lineHeight: 1.6 }}>
                  Generate onboarding links, inspect invite flow, and track partner status inside the same control room.
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: COLORS.panel2,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <Server size={14} color={COLORS.gold} />
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: COLORS.muted }}>
                    Network state
                  </div>
                  <div style={{ marginTop: 4, fontFamily: '"DM Mono", monospace', fontSize: 13 }}>
                    {loadingList ? '...' : `${activeCount} active / ${isps.length} total`}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
              <StatCard
                label="Total invites"
                value={loadingList ? '...' : `${isps.length}`}
                sub="all invite records currently known to the system"
                tone="neutral"
              />
              <StatCard
                label="Pending"
                value={loadingList ? '...' : `${pendingCount}`}
                sub="awaiting ISP completion or review"
                tone="warn"
              />
              <StatCard
                label="Live partners"
                value={loadingList ? '...' : `${activeCount}`}
                sub="already active on the platform"
                tone="good"
              />
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(340px, 0.9fr)', gap: 18 }}>
            <Panel
              title="Generate invite"
              subtitle="Create a new ISP onboarding link in one move."
              accent={COLORS.gold}
            >
              <div style={{ display: 'grid', gap: 14 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: 12,
                  }}
                >
                  <input
                    type="text"
                    placeholder="ISP name"
                    value={newISPName}
                    onChange={(e) => setNewISPName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') generateInvite();
                    }}
                    disabled={loading}
                    style={{
                      height: 48,
                      padding: '0 14px',
                      borderRadius: 14,
                      border: `1px solid ${COLORS.border}`,
                      background: COLORS.panel2,
                      color: COLORS.text,
                      outline: 'none',
                      fontSize: 14,
                      fontFamily: 'Inter, system-ui, sans-serif',
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? 'not-allowed' : 'text',
                    }}
                  />
                  <button
                    onClick={generateInvite}
                    disabled={loading || !newISPName.trim()}
                    style={{
                      height: 48,
                      padding: '0 18px',
                      borderRadius: 14,
                      border: 'none',
                      background: COLORS.gold,
                      color: '#000',
                      fontFamily: '"Space Grotesk", Inter, sans-serif',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      cursor: loading || !newISPName.trim() ? 'not-allowed' : 'pointer',
                      opacity: loading || !newISPName.trim() ? 0.6 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Link2 size={16} />}
                    {loading ? 'Creating' : 'Generate'}
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: 12,
                    padding: 16,
                    borderRadius: 16,
                    border: `1px solid ${COLORS.border}`,
                    background: COLORS.panel2,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={14} color={COLORS.gold} />
                    <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: COLORS.muted }}>
                      Invite protocol
                    </div>
                  </div>
                  <div style={{ color: COLORS.muted, lineHeight: 1.6 }}>
                    Enter an ISP name. The system generates a tokenized onboarding URL and attaches a 7-day expiry.
                  </div>
                </div>

                {statusMessage ? (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: `1px solid ${statusMessage.includes('Error') || statusMessage.includes('failed') ? toneBorder('bad') : toneBorder('good')}`,
                      background: statusMessage.includes('Error') || statusMessage.includes('failed') ? toneBg('bad') : toneBg('good'),
                      color: statusMessage.includes('Error') || statusMessage.includes('failed') ? COLORS.red : COLORS.green,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {statusMessage.includes('Error') || statusMessage.includes('failed') ? (
                      <AlertTriangle size={14} />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    <span style={{ fontSize: 12 }}>{statusMessage}</span>
                  </div>
                ) : null}

                {generatedLink ? (
                  <div
                    style={{
                      display: 'grid',
                      gap: 12,
                      padding: 16,
                      borderRadius: 16,
                      border: `1px solid ${toneBorder('good')}`,
                      background: COLORS.panel2,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: COLORS.green }}>
                        Invite created
                      </div>
                      <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: COLORS.dim }}>
                        {generatedLink.expires_at ? `Expires ${new Date(generatedLink.expires_at).toLocaleDateString()}` : 'Expiry unknown'}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: 14,
                        borderRadius: 14,
                        border: `1px solid ${COLORS.border}`,
                        background: COLORS.bg,
                        wordBreak: 'break-all',
                        fontFamily: '"DM Mono", monospace',
                        fontSize: 12,
                        lineHeight: 1.6,
                        color: COLORS.text,
                      }}
                    >
                      {generatedLink.invite_link}
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => copyToClipboard(generatedLink.invite_link)}
                        style={{
                          height: 42,
                          padding: '0 14px',
                          borderRadius: 12,
                          border: `1px solid ${COLORS.border}`,
                          background: COLORS.bg,
                          color: COLORS.text,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          fontFamily: '"Space Grotesk", Inter, sans-serif',
                          fontWeight: 700,
                          transition: 'background 0.2s',
                        }}
                        onMouseOver={(e) => {
                          (e.target as HTMLElement).style.background = COLORS.panel2;
                        }}
                        onMouseOut={(e) => {
                          (e.target as HTMLElement).style.background = COLORS.bg;
                        }}
                      >
                        <ClipboardCopy size={15} />
                        {showCopyMessage ? 'Copied' : 'Copy link'}
                      </button>
                      <div
                        style={{
                          height: 42,
                          padding: '0 14px',
                          borderRadius: 12,
                          border: `1px solid ${COLORS.border}`,
                          background: toneBg('good'),
                          color: COLORS.green,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 12,
                        }}
                      >
                        <Clock3 size={14} />
                        {generatedLink.status || 'pending'}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </Panel>

            <Panel
              title="Invite intelligence"
              subtitle="A compact operational view of the onboarding queue."
              accent={COLORS.blue}
            >
              <div style={{ display: 'grid', gap: 12 }}>
                <div
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    border: `1px solid ${COLORS.border}`,
                    background: COLORS.panel2,
                  }}
                >
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: COLORS.muted }}>
                    Search
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Search size={15} color={COLORS.dim} />
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Filter by ISP name, status, or ID"
                      style={{
                        width: '100%',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        color: COLORS.text,
                        fontSize: 13,
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  {loadingList ? (
                    <div
                      style={{
                        minHeight: 220,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px dashed ${COLORS.border}`,
                        borderRadius: 16,
                        background: COLORS.panel2,
                        color: COLORS.muted,
                        gap: 10,
                      }}
                    >
                      <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                      <div>Loading invites...</div>
                    </div>
                  ) : visibleInvites.length === 0 ? (
                    <div
                      style={{
                        minHeight: 220,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px dashed ${COLORS.border}`,
                        borderRadius: 16,
                        background: COLORS.panel2,
                        color: COLORS.muted,
                        gap: 10,
                        textAlign: 'center',
                        padding: 20,
                      }}
                    >
                      <Users size={20} color={COLORS.dim} />
                      <div>No invite records match this view.</div>
                    </div>
                  ) : (
                    visibleInvites.slice(0, 6).map((invite) => {
                      const status = (invite.status || '').toLowerCase();
                      const tone: Tone = status === 'active' ? 'good' : status === 'pending' ? 'warn' : 'bad';
                      return (
                        <div
                          key={invite.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            gap: 12,
                            alignItems: 'center',
                            padding: '14px 0',
                            borderBottom: `1px solid ${COLORS.borderSoft}`,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 13, color: COLORS.text }}>
                              {invite.isp_name || 'Unnamed ISP'}
                            </div>
                            <div style={{ marginTop: 5, fontSize: 11, color: COLORS.muted, fontFamily: '"DM Mono", monospace' }}>
                              {shortId(invite.id, 14)}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: 86,
                                padding: '6px 10px',
                                borderRadius: 999,
                                border: `1px solid ${toneBorder(tone)}`,
                                background: toneBg(tone),
                                color: toneColor(tone),
                                fontSize: 10,
                                letterSpacing: '0.16em',
                                textTransform: 'uppercase',
                                fontFamily: '"DM Mono", monospace',
                              }}
                            >
                              {invite.status || 'pending'}
                            </div>
                            <div style={{ marginTop: 8, fontSize: 11, color: COLORS.dim, fontFamily: '"DM Mono", monospace' }}>
                              {invite.expires_at ? new Date(invite.expires_at).toLocaleDateString() : 'No expiry'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </Panel>
          </div>
        </main>
      </div>
    </div>
  );
}