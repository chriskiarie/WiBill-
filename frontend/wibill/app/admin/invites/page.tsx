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

export default function AdminInvites() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [ispName, setIspName] = useState('');
  const [expiry, setExpiry] = useState('7');
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('wb_token');
    if (!token) return;

    fetch(`${API}/api/admin/invites`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setInvites(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
      setIspName('');
      setExpiry('7');

      // Refresh invites list
      const invitesR = await fetch(`${API}/api/admin/invites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const invitesData = await invitesR.json();
      setInvites(Array.isArray(invitesData) ? invitesData : []);

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

  // Recent activity
  const recentActivity = [
    { type: 'accepted', text: 'MetroFiber accepted invite', time: '2 hours ago' },
    { type: 'expired', text: 'SafiNet invite expired', time: '5 hours ago' },
    { type: 'generated', text: 'New invite generated', time: '1 day ago' },
  ];

  return (
    <div style={{
      padding: '32px 36px',
      maxWidth: '1800px',
      margin: '0 auto',
    }}>
      {/* HEADER */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{
          fontSize: 32,
          fontWeight: 900,
          letterSpacing: '-0.03em',
          color: '#fff',
          margin: '0 0 6px',
        }}>
          Invite Control Center
        </h1>
        <p style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.5)',
          margin: 0,
        }}>
          Manage ISP onboarding and access provisioning
        </p>
      </div>

      {/* METRICS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}>
        {[
          { label: 'Pending Invites', value: pending, color: '#fbbf24', icon: '⏳' },
          { label: 'Accepted', value: accepted, color: '#34d399', icon: '✓' },
          { label: 'Expired', value: expired, color: '#ef4444', icon: '✕' },
          { label: 'Conversion Rate', value: conversionRate + '%', color: '#4f8cff', icon: '📈' },
        ].map((metric, i) => (
          <div
            key={i}
            style={{
              background: 'linear-gradient(135deg, rgba(15,23,42,.68), rgba(20,30,55,.5))',
              backdropFilter: 'blur(18px)',
              border: '1px solid rgba(255,255,255,.05)',
              borderRadius: 14,
              padding: '20px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: metric.color,
            }} />

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 12,
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'rgba(255,255,255,0.3)',
              }}>
                {metric.label}
              </div>
              <span style={{ fontSize: 16 }}>{metric.icon}</span>
            </div>

            <div style={{
              fontSize: 28,
              fontWeight: 900,
              color: metric.color,
              fontFamily: '"JetBrains Mono", monospace',
            }}>
              {typeof metric.value === 'number' ? metric.value : metric.value}
            </div>
          </div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: 20,
        marginBottom: 32,
      }}>
        {/* GENERATE INVITE CARD */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,.68), rgba(20,30,55,.5))',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(255,255,255,.05)',
          borderRadius: 14,
          padding: '28px',
        }}>
          <h3 style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 20px',
          }}>
            Generate New Invite
          </h3>

          <div style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'flex-end',
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'rgba(255,255,255,0.3)',
                display: 'block',
                marginBottom: 8,
              }}>
                ISP Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., MetroFiber"
                value={ispName}
                onChange={e => setIspName(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: '#fff',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'rgba(255,255,255,0.3)',
                display: 'block',
                marginBottom: 8,
              }}>
                Expires In
              </label>
              <select
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: '#fff',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="7">7 Days</option>
                <option value="14">14 Days</option>
                <option value="30">30 Days</option>
              </select>
            </div>

            <button
              onClick={generateInvite}
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                border: 'none',
                borderRadius: 10,
                padding: '10px 24px',
                color: '#0a0800',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(251, 191, 36, 0.3)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              🔗 Generate Invite
            </button>
          </div>

          {/* SUCCESS MESSAGE */}
          {showSuccess && (
            <div style={{
              marginTop: 20,
              padding: '16px',
              background: 'rgba(52,211,153,0.1)',
              border: '1px solid rgba(52,211,153,0.3)',
              borderRadius: 10,
            }}>
              <div style={{
                fontSize: 12,
                color: '#34d399',
                fontWeight: 600,
                marginBottom: 8,
              }}>
                ✓ Invite Generated Successfully
              </div>
              <div style={{
                fontSize: 12,
                color: 'rgba(52,211,153,0.7)',
                marginBottom: 12,
                wordBreak: 'break-all',
              }}>
                {generatedLink}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(generatedLink)}
                style={{
                  fontSize: 11,
                  background: 'rgba(52,211,153,0.15)',
                  border: '1px solid rgba(52,211,153,0.3)',
                  borderRadius: 6,
                  padding: '6px 12px',
                  color: '#34d399',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                📋 Copy Link
              </button>
            </div>
          )}
        </div>

        {/* RECENT ACTIVITY */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,.68), rgba(20,30,55,.5))',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(255,255,255,.05)',
          borderRadius: 14,
          padding: '24px',
          height: 'fit-content',
        }}>
          <h3 style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 16px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            opacity: 0.8,
          }}>
            Recent Activity
          </h3>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            {recentActivity.map((activity, i) => (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.6)',
                  padding: '10px',
                  borderLeft: `2px solid ${
                    activity.type === 'accepted'
                      ? '#34d399'
                      : activity.type === 'expired'
                      ? '#ef4444'
                      : '#4f8cff'
                  }`,
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '0 6px 6px 0',
                }}
              >
                <div style={{ marginBottom: 4, fontWeight: 500 }}>
                  {activity.text}
                </div>
                <div style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.3)',
                }}>
                  {activity.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ACTIVE INVITES TABLE */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15,23,42,.68), rgba(20,30,55,.5))',
        backdropFilter: 'blur(18px)',
        border: '1px solid rgba(255,255,255,.05)',
        borderRadius: 14,
        padding: '28px',
      }}>
        <h3 style={{
          fontSize: 16,
          fontWeight: 700,
          color: '#fff',
          margin: '0 0 20px',
        }}>
          Active Invite Links
        </h3>

        {loading ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.2)',
          }}>
            Loading invites...
          </div>
        ) : invites.filter(i => i.status === 'pending').length === 0 ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔗</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              No active invite links yet
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            {invites
              .filter(i => i.status === 'pending')
              .map(invite => (
                <div
                  key={invite.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '200px 200px 120px 120px 100px 100px',
                    gap: 16,
                    padding: '14px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 10,
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: 4,
                    }}>
                      ISP Name
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: '#fff',
                      fontWeight: 600,
                    }}>
                      {ispName || 'Unnamed'}
                    </div>
                  </div>

                  <div>
                    <div style={{
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: 4,
                    }}>
                      Invite Code
                    </div>
                    <code style={{
                      fontSize: 11,
                      color: '#4f8cff',
                      background: 'rgba(79,140,255,0.1)',
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontFamily: '"JetBrains Mono", monospace',
                    }}>
                      {invite.token.slice(0, 12)}...
                    </code>
                  </div>

                  <div>
                    <div style={{
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: 4,
                    }}>
                      Created
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.6)',
                    }}>
                      {new Date(invite.created_at).toLocaleDateString('en-KE')}
                    </div>
                  </div>

                  <div>
                    <div style={{
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: 4,
                    }}>
                      Expires
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.6)',
                    }}>
                      {new Date(invite.expires_at).toLocaleDateString('en-KE')}
                    </div>
                  </div>

                  <div style={{
                    textAlign: 'center',
                  }}>
                    <span style={{
                      display: 'inline-block',
                      background: 'rgba(251,191,36,0.15)',
                      color: '#fbbf24',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 600,
                    }}>
                      ⏳ Pending
                    </span>
                  </div>

                  <button
                    onClick={() => navigator.clipboard.writeText(`http://localhost:3000/join?token=${invite.token}`)}
                    style={{
                      background: 'rgba(79,140,255,0.15)',
                      border: '1px solid rgba(79,140,255,0.3)',
                      borderRadius: 6,
                      padding: '6px 12px',
                      color: '#4f8cff',
                      fontSize: 11,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    📋 Copy
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}