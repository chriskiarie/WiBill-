'use client';

import { useState } from 'react';

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

export default function AdminISPNetwork() {
  const [isps, setIsps] = useState<ISPInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [newISPName, setNewISPName] = useState('');
  const [generatedLink, setGeneratedLink] = useState<ISPInvite | null>(null);
  const [showCopyMessage, setShowCopyMessage] = useState(false);

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
  };

  const generateInvite = async () => {
    if (!newISPName.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('wb_token');
      const response = await fetch(`${API}/api/admin/invites/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isp_name: newISPName,
          expires_in_days: 7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedLink(data);
        setNewISPName('');
      }
    } catch (e) {
      console.error('Failed to generate invite:', e);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setShowCopyMessage(true);
    setTimeout(() => setShowCopyMessage(false), 2000);
  };

  return (
    <div style={{ background: colors.void, color: colors.textPrimary, minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* TOPBAR */}
      <div style={{
        height: '52px',
        borderBottom: `0.5px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
      }}>
        <div style={{
          fontSize: '18px',
          fontFamily: 'Space Grotesk, sans-serif',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          textTransform: 'uppercase',
        }}>
          ISP Network
        </div>
        <div style={{
          fontSize: '12px',
          fontFamily: 'DM Mono, monospace',
          color: colors.textMuted,
        }}>
          {isps.length} Active
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: '32px', maxWidth: '1440px', margin: '0 auto' }}>
        {/* GENERATE INVITE CARD */}
        <div style={{
          background: colors.base,
          border: `0.5px solid ${colors.border}`,
          borderTop: `2px solid ${colors.gold}`,
          borderRadius: '10px',
          padding: '24px',
          marginBottom: '32px',
        }}>
          <div style={{
            fontSize: '10px',
            fontFamily: 'DM Mono, monospace',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: colors.textMuted,
            marginBottom: '20px',
          }}>
            Generate Invite Link
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px',
            gap: '12px',
            marginBottom: '16px',
          }}>
            <input
              type="text"
              placeholder="ISP name"
              value={newISPName}
              onChange={(e) => setNewISPName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && generateInvite()}
              style={{
                background: colors.raised,
                border: `0.5px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '11px 14px',
                color: colors.textPrimary,
                fontSize: '13px',
                fontFamily: 'DM Mono, monospace',
                outline: 'none',
              }}
            />
            <button
              onClick={generateInvite}
              disabled={loading || !newISPName.trim()}
              style={{
                background: colors.gold,
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                padding: '11px 20px',
                fontSize: '12px',
                fontFamily: 'Space Grotesk, sans-serif',
                fontWeight: 700,
                cursor: !loading && newISPName.trim() ? 'pointer' : 'not-allowed',
                opacity: !loading && newISPName.trim() ? 1 : 0.5,
                transition: 'opacity 0.2s',
              }}
            >
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </div>

          {generatedLink && (
            <div style={{
              background: colors.raised,
              border: `0.5px solid ${colors.green}40`,
              borderRadius: '8px',
              padding: '16px',
            }}>
              <div style={{
                fontSize: '10px',
                fontFamily: 'DM Mono, monospace',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: colors.green,
                marginBottom: '8px',
              }}>
                Invite Created
              </div>
              <div style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: '12px',
                color: colors.textPrimary,
                wordBreak: 'break-all',
                marginBottom: '12px',
                background: colors.void,
                padding: '8px 12px',
                borderRadius: '6px',
                border: `0.5px solid ${colors.border}`,
              }}>
                {generatedLink.invite_link}
              </div>
              <button
                onClick={() => copyToClipboard(generatedLink.invite_link)}
                style={{
                  background: colors.gold,
                  color: '#000',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '11px',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {showCopyMessage ? 'Copied' : 'Copy Link'}
              </button>
              <div style={{
                fontSize: '10px',
                fontFamily: 'DM Mono, monospace',
                color: colors.textMuted,
                marginTop: '8px',
              }}>
                Expires: {new Date(generatedLink.expires_at).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>

        {/* ISP LIST */}
        <div style={{
          background: colors.base,
          border: `0.5px solid ${colors.border}`,
          borderRadius: '10px',
          padding: '24px',
        }}>
          <div style={{
            fontSize: '10px',
            fontFamily: 'DM Mono, monospace',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: colors.textMuted,
            marginBottom: '20px',
          }}>
            All ISPs
          </div>

          {isps.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: colors.textMuted,
              fontSize: '13px',
            }}>
              No ISPs. Generate invite links above to onboard.
            </div>
          ) : (
            <div>
              {isps.map((isp, i) => (
                <div
                  key={isp.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px 100px',
                    gap: '24px',
                    padding: '16px 0',
                    borderBottom: i < isps.length - 1 ? `0.5px solid ${colors.raised}` : 'none',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: '13px',
                      color: colors.textPrimary,
                      fontWeight: 500,
                      marginBottom: '4px',
                    }}>
                      {isp.isp_name || 'Unnamed ISP'}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      fontFamily: 'DM Mono, monospace',
                      color: colors.textMuted,
                    }}>
                      {isp.id.slice(0, 12)}...
                    </div>
                  </div>
                  <div style={{
                    textAlign: 'right',
                  }}>
                    <div style={{
                      fontSize: '10px',
                      fontFamily: 'DM Mono, monospace',
                      color: colors.textMuted,
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}>
                      Status
                    </div>
                    <div style={{
                      fontSize: '11px',
                      fontFamily: 'DM Mono, monospace',
                      color: colors.amber,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}>
                      Pending
                    </div>
                  </div>
                  <div style={{
                    textAlign: 'center',
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: colors.amber,
                      boxShadow: `0 0 8px ${colors.amber}`,
                      margin: '0 auto',
                      marginBottom: '6px',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}