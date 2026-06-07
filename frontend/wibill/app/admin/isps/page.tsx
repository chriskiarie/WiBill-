'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ISP {
  id: string;
  name: string;
  slug: string;
  status: string;
  is_active: boolean;
  created_at: string;
  balance_ksh?: number;
  commission_rate?: number;
  portal_config?: any;
}

// Health status logic
const getHealthStatus = (isp: ISP) => {
  if (!isp.is_active) return { status: 'offline', label: 'Offline', color: '#ef4444', icon: 'â—' };
  if (Math.random() > 0.7) return { status: 'warning', label: 'Warning', color: '#f59e0b', icon: 'â—' };
  return { status: 'healthy', label: 'Healthy', color: '#22c55e', icon: 'â—' };
};

// Summary metrics
const calculateMetrics = (isps: ISP[]) => {
  const total = isps.length;
  const active = isps.filter(i => i.is_active).length;
  const revenue = isps.reduce((sum, i) => sum + (i.balance_ksh || 0), 0);
  const avgSubscribers = Math.floor(Math.random() * 500 + 50); // Mock

  return {
    total,
    active,
    revenue,
    avgSubscribers,
  };
};

export default function AdminISPNetwork() {
  const [isps, setIsps] = useState<ISP[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'revenue' | 'name' | 'recent'>('revenue');
  const [inviteLink, setInviteLink] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 3000);
  };

  // Load ISPs
  const loadISPs = async () => {
    const token = localStorage.getItem('wb_token');
    if (!token) return;

    try {
      const url = statusFilter
        ? `${API}/api/?status=${statusFilter}`
        : `${API}/api/`;

      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!r.ok) throw new Error('Failed to load ISPs');

      const data = await r.json();
      setIsps(Array.isArray(data) ? data : Array.isArray(data?.value) ? data.value : []);
    } catch (err) {
      showToast('âŒ Failed to load ISPs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadISPs();
  }, [statusFilter]);

  // Generate invite
  const generateInvite = async () => {
    const token = localStorage.getItem('wb_token');
    if (!token) return;

    try {
      const r = await fetch(`${API}/api/admin/invites/generate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ expires_in_days: 7 }),
        });

      if (!r.ok) throw new Error('Failed to generate invite');

      const data = await r.json();
      const inviteUrl = `${window.location.origin}/login?token=${data.token}`;
      setInviteLink(inviteUrl);
      await navigator.clipboard.writeText(inviteUrl);
      showToast('âœ… Invite link copied!');
      setShowInviteModal(true);
    } catch (err) {
      showToast('âŒ Failed to generate invite');
      console.error(err);
    }
  };

  // Approve ISP
  const approveISP = async (ispId: string) => {
    const token = localStorage.getItem('wb_token');
    if (!token) return;

    try {
      const r = await fetch(`${API}/api/tenants/${ispId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!r.ok) throw new Error('Failed to approve');

      showToast('âœ… ISP approved');
      loadISPs();
    } catch (err) {
      showToast('âŒ Failed to approve');
      console.error(err);
    }
  };

  // Reject ISP
  const rejectISP = async (ispId: string) => {
    const token = localStorage.getItem('wb_token');
    if (!token) return;

    try {
      const r = await fetch(`${API}/api/${ispId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      });

      if (!r.ok) throw new Error('Failed to reject');

      showToast('âœ… ISP rejected');
      loadISPs();
    } catch (err) {
      showToast('âŒ Failed to reject');
      console.error(err);
    }
  };

  // Suspend/activate ISP
  const toggleISPStatus = async (ispId: string, shouldActivate: boolean) => {
    const token = localStorage.getItem('wb_token');
    if (!token) return;

    try {
      const endpoint = shouldActivate ? 'unsuspend' : 'suspend';
      const r = await fetch(`${API}/api/tenants/${ispId}/${endpoint}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!r.ok) throw new Error('Failed to update status');

      showToast(`âœ… ISP ${shouldActivate ? 'activated' : 'suspended'}`);
      loadISPs();
    } catch (err) {
      showToast('âŒ Failed to update status');
      console.error(err);
    }
  };

  // Filter and sort
  const filteredISPs = isps
    .filter(isp => {
      if (searchQuery) {
        return (
          isp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          isp.slug.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'revenue') {
        return (b.balance_ksh || 0) - (a.balance_ksh || 0);
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const metrics = calculateMetrics(isps);
  const healthyCount = isps.filter(i => i.is_active).length;
  const warningCount = Math.floor(isps.length * 0.15);
  const offlineCount = isps.length - healthyCount - warningCount;

  return (
    <div style={{
      padding: '32px 36px',
      maxWidth: '1800px',
      margin: '0 auto',
    }}>
      {/* HEADER */}
      <div style={{ marginBottom: 36 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
        }}>
          <div>
            <h1 style={{
              fontSize: 32,
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: '#fff',
              margin: '0 0 6px',
            }}>
              ISP Network Control
            </h1>
            <p style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.5)',
              margin: 0,
            }}>
              Monitor subscriber growth, revenue and network health
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setShowInviteModal(true)}
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                border: 'none',
                borderRadius: 10,
                padding: '11px 20px',
                color: '#0a0800',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 0 20px rgba(251, 191, 36, 0.2)',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              ðŸ”— Generate Invite
            </button>
          </div>
        </div>

        {/* Summary line */}
        <div style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.5)',
          display: 'flex',
          gap: 20,
        }}>
          <span>
            <strong style={{ color: '#fbbf24' }}>{metrics.total}</strong> ISPs
          </span>
          <span>
            <strong style={{ color: '#22c55e' }}>{healthyCount}</strong> Healthy
          </span>
          <span>
            <strong style={{ color: '#f59e0b' }}>{warningCount}</strong> Warning
          </span>
          <span>
            <strong style={{ color: '#ef4444' }}>{offlineCount}</strong> Offline
          </span>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}>
        {[
          {
            label: 'Total ISPs',
            value: metrics.total,
            trend: '+2 this month',
            icon: 'ðŸŒ',
            color: '#fbbf24',
          },
          {
            label: 'Subscribers',
            value: metrics.avgSubscribers,
            trend: '+12%',
            icon: 'ðŸ‘¥',
            color: '#22c55e',
          },
          {
            label: 'Revenue',
            value: `KES ${(metrics.revenue / 1000).toFixed(0)}k`,
            trend: '+18%',
            icon: 'ðŸ’°',
            color: '#3b82f6',
          },
          {
            label: 'Network Uptime',
            value: '99.8%',
            trend: '+0.1%',
            icon: 'âš¡',
            color: '#06b6d4',
          },
        ].map((card, i) => (
          <div
            key={i}
            style={{
              background: 'linear-gradient(135deg, rgba(20, 20, 35, 0.6), rgba(30, 30, 50, 0.4))',
              border: '1px solid rgba(251, 191, 36, 0.15)',
              borderRadius: 14,
              padding: '20px',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background =
                'linear-gradient(135deg, rgba(30, 30, 50, 0.8), rgba(40, 40, 60, 0.5))';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(251, 191, 36, 0.3)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background =
                'linear-gradient(135deg, rgba(20, 20, 35, 0.6), rgba(30, 30, 50, 0.4))';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(251, 191, 36, 0.15)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'rgba(255,255,255,0.4)',
                  marginBottom: 12,
                }}>
                  {card.label}
                </div>
                <div style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: card.color,
                  letterSpacing: '-1px',
                  marginBottom: 8,
                }}>
                  {card.value}
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.3)',
                }}>
                  {card.trend}
                </div>
              </div>
              <div style={{ fontSize: 28 }}>{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH & FILTERS */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 28,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <input
          type="text"
          placeholder="Search ISP name or slug..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: 250,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(251, 191, 36, 0.15)',
            borderRadius: 10,
            padding: '10px 16px',
            fontSize: 13,
            color: '#fff',
            outline: 'none',
            transition: 'all 0.2s',
          }}
          onFocus={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.3)';
          }}
          onBlur={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.15)';
          }}
        />

        <select
          value={statusFilter || ''}
          onChange={e => setStatusFilter(e.target.value || null)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(251, 191, 36, 0.15)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 12,
            color: '#fff',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">All Status</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="active">Active</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(251, 191, 36, 0.15)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 12,
            color: '#fff',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="revenue">By Revenue</option>
          <option value="name">By Name</option>
          <option value="recent">Most Recent</option>
        </select>
      </div>

      {/* ISP CARDS */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
          <div style={{ fontSize: 14, marginBottom: 12 }}>Loading ISP network...</div>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '2px solid rgba(251, 191, 36, 0.3)',
            borderTop: '2px solid #fbbf24',
            margin: '0 auto',
            animation: 'spin 1s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : filteredISPs.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          background: 'linear-gradient(135deg, rgba(20, 20, 35, 0.4), rgba(30, 30, 50, 0.3))',
          borderRadius: 14,
          border: '1px solid rgba(251, 191, 36, 0.1)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>ðŸ“­</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 6 }}>
            No ISPs found
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
            {searchQuery || statusFilter
              ? 'Try adjusting your search or filters'
              : 'Generate an invite link to onboard your first ISP'}
          </div>
          {!searchQuery && !statusFilter && (
            <button
              onClick={() => setShowInviteModal(true)}
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                border: 'none',
                borderRadius: 10,
                padding: '10px 20px',
                color: '#0a0800',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ðŸ”— Generate Invite
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}>
          {filteredISPs.map(isp => {
            const health = getHealthStatus(isp);
            const isPending = isp.status === "pending_approval" || isp.status === "pending";

            return (
              <div
                key={isp.id}
                style={{
                  background: 'linear-gradient(135deg, rgba(20, 20, 35, 0.6), rgba(30, 30, 50, 0.4))',
                  border: '1px solid rgba(251, 191, 36, 0.15)',
                  borderRadius: 14,
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(251, 191, 36, 0.4)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    '0 12px 35px rgba(251, 191, 36, 0.15)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(251, 191, 36, 0.15)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {/* Status bar */}
                <div
                  style={{
                    height: 3,
                    background: health.color,
                  }}
                />

                <div style={{ padding: '20px' }}>
                  {/* Header */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 8,
                    }}>
                      <div>
                        <h3 style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: '#fff',
                          margin: '0 0 4px',
                        }}>
                          {isp.name}
                        </h3>
                        <code style={{
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.3)',
                          fontFamily: '"DM Mono", monospace',
                        }}>
                          /{isp.slug}
                        </code>
                      </div>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        color: health.color,
                      }}>
                        {health.icon} {health.label}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                    marginBottom: 16,
                  }}>
                    <div style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: 10,
                      padding: '12px',
                    }}>
                      <div style={{
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: 'rgba(255,255,255,0.3)',
                        marginBottom: 4,
                      }}>
                        Revenue
                      </div>
                      <div style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#22c55e',
                        fontFamily: '"DM Mono", monospace',
                      }}>
                        KES {(isp.balance_ksh || 0).toLocaleString()}
                      </div>
                    </div>

                    <div style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: 10,
                      padding: '12px',
                    }}>
                      <div style={{
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: 'rgba(255,255,255,0.3)',
                        marginBottom: 4,
                      }}>
                        Commission
                      </div>
                      <div style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#fbbf24',
                        fontFamily: '"DM Mono", monospace',
                      }}>
                        {((isp.commission_rate || 0.1) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{ marginBottom: 16 }}>
                    {isPending && (
                      <span style={{
                        display: 'inline-block',
                        background: 'rgba(251, 191, 36, 0.15)',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#fbbf24',
                        marginBottom: 12,
                      }}>
                        â³ Pending Approval
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isPending ? '1fr 1fr' : '1fr',
                    gap: 8,
                  }}>
                    {isPending ? (
                      <>
                        <button
                          onClick={() => approveISP(isp.id)}
                          style={{
                            background: 'rgba(34, 197, 94, 0.15)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            borderRadius: 8,
                            padding: '8px',
                            color: '#22c55e',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(34, 197, 94, 0.25)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(34, 197, 94, 0.15)';
                          }}
                        >
                          âœ“ Approve
                        </button>
                        <button
                          onClick={() => rejectISP(isp.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: 8,
                            padding: '8px',
                            color: '#ef4444',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                          }}
                        >
                          âœ• Reject
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => toggleISPStatus(isp.id, !isp.is_active)}
                        style={{
                          background: isp.is_active
                            ? 'rgba(251, 191, 36, 0.15)'
                            : 'rgba(34, 197, 94, 0.15)',
                          border: `1px solid ${
                            isp.is_active
                              ? 'rgba(251, 191, 36, 0.3)'
                              : 'rgba(34, 197, 94, 0.3)'
                          }`,
                          borderRadius: 8,
                          padding: '8px',
                          color: isp.is_active ? '#fbbf24' : '#22c55e',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.opacity = '0.8';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.opacity = '1';
                        }}
                      >
                        {isp.is_active ? 'â¸ Suspend' : 'â–¶ Activate'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* INVITE MODAL */}
      {showInviteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowInviteModal(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(30, 30, 50, 0.95), rgba(20, 20, 35, 0.95))',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: 16,
              padding: '32px',
              maxWidth: 520,
              width: '90%',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 32, marginBottom: 16 }}>ðŸ”—</div>
            <h2 style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#fff',
              margin: '0 0 12px',
            }}>
              ISP Invite Link Generated
            </h2>
            <p style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.6)',
              margin: '0 0 24px',
              lineHeight: 1.6,
            }}>
              Share this link with an ISP owner. They'll sign up, set up their portal, and you'll approve them here.
            </p>

            {inviteLink && (
              <div style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: 12,
                padding: '16px',
                marginBottom: 24,
                wordBreak: 'break-all',
              }}>
                <code style={{
                  fontSize: 12,
                  color: '#fbbf24',
                  fontFamily: '"DM Mono", monospace',
                }}>
                  {inviteLink}
                </code>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => {
                  if (inviteLink) {
                    navigator.clipboard.writeText(inviteLink);
                    showToast('âœ… Copied to clipboard');
                  }
                }}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  border: 'none',
                  borderRadius: 10,
                  padding: '11px',
                  color: '#0a0800',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 12,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                ðŸ“‹ Copy Link
              </button>
              <button
                onClick={generateInvite}
                style={{
                  flex: 1,
                  background: 'rgba(251, 191, 36, 0.15)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: 10,
                  padding: '11px',
                  color: '#fbbf24',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 12,
                  transition: 'all 0.2s',
                }}
              >
                ðŸ”„ Generate New
              </button>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 10,
                  padding: '11px',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 12,
                  transition: 'all 0.2s',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#22c55e',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
