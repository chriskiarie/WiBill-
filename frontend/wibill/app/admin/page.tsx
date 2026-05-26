'use client';

import { useEffect, useState } from 'react';

export default function PremiumISPDashboard() {
  const [time, setTime] = useState(new Date());
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => {
      clearInterval(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const timeString = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dateString = time.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Premium color palette
  const colors = {
    bgPrimary: '#050816',
    bgSecondary: '#0B1120',
    cardBg: 'rgba(15, 23, 42, 0.65)',
    cardBorder: 'rgba(255, 255, 255, 0.06)',
    accentBlue: '#4F8CFF',
    accentPurple: '#7C5CFC',
    accentGreen: '#34D399',
    accentWarning: '#FBBF24',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
  };

  const metrics = [
    { id: 'revenue', label: 'Monthly Revenue', value: '245', unit: 'K KES', change: '+23%', icon: '💰', accent: colors.accentBlue },
    { id: 'online', label: 'Subscribers Online', value: '847', unit: '', change: '+12%', icon: '👥', accent: colors.accentPurple },
    { id: 'uptime', label: 'Network Uptime', value: '99.8%', unit: '', change: '+0.2%', icon: '📡', accent: colors.accentGreen },
    { id: 'tickets', label: 'Pending Tickets', value: '12', unit: '', change: '-5%', icon: '🎟️', accent: colors.accentWarning },
  ];

  const revenueData = [
    { month: 'Jan', value: 45 },
    { month: 'Feb', value: 52 },
    { month: 'Mar', value: 38 },
    { month: 'Apr', value: 61 },
    { month: 'May', value: 55 },
    { month: 'Jun', value: 72 },
  ];

  const systemOps = [
    { label: 'API Health', value: '98ms', status: 'healthy' },
    { label: 'Database', value: 'Connected', status: 'healthy' },
    { label: 'RADIUS Server', value: 'Online', status: 'healthy' },
    { label: 'MikroTik Sync', value: '2m ago', status: 'healthy' },
  ];

  const activityLog = [
    { time: '09:15', event: 'Payment processed', type: 'success' },
    { time: '08:42', event: 'ISP node offline', type: 'alert' },
    { time: '08:38', event: 'New customer added', type: 'info' },
    { time: '08:22', event: 'Invoice generated', type: 'success' },
    { time: '08:15', event: 'Portal access granted', type: 'info' },
  ];

  const maxRevenue = Math.max(...revenueData.map(d => d.value));

  return (
    <div style={{
      background: colors.bgPrimary,
      color: colors.textPrimary,
      minHeight: '100vh',
      fontFamily: '"Inter", -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Premium Gradient Background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(
            circle at top right,
            rgba(79, 140, 255, 0.12) 0%,
            transparent 40%
          ),
          linear-gradient(
            180deg,
            ${colors.bgPrimary} 0%,
            #091225 100%
          )
        `,
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{
          padding: '32px 48px',
          borderBottom: `1px solid ${colors.cardBorder}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backdropFilter: 'blur(8px)',
        }}>
          <div>
            <h1 style={{
              fontSize: 36,
              fontWeight: 700,
              margin: 0,
              letterSpacing: '-0.02em',
              color: colors.textPrimary,
              fontFamily: '"Sora", -apple-system, sans-serif',
            }}>
              BATCAVE
            </h1>
            <p style={{
              fontSize: 11,
              color: colors.textMuted,
              margin: '6px 0 0',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: 500,
            }}>
              Network Operations Center
            </p>
          </div>

          <div style={{
            display: 'flex',
            gap: 32,
            alignItems: 'center',
          }}>
            {/* System Status Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              background: 'rgba(52, 211, 153, 0.08)',
              border: `1px solid rgba(52, 211, 153, 0.2)`,
              borderRadius: 8,
            }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: colors.accentGreen,
                boxShadow: `0 0 8px ${colors.accentGreen}`,
              }} />
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                color: colors.accentGreen,
                textTransform: 'uppercase',
              }}>
                Live
              </span>
            </div>

            {/* Clock */}
            <div style={{
              textAlign: 'right',
              borderLeft: `1px solid ${colors.cardBorder}`,
              paddingLeft: 32,
            }}>
              <div style={{
                fontSize: 32,
                fontWeight: 700,
                fontFamily: '"JetBrains Mono", monospace',
                color: colors.accentBlue,
                letterSpacing: '1px',
                lineHeight: 1,
              }}>
                {timeString}
              </div>
              <div style={{
                fontSize: 10,
                color: colors.textMuted,
                marginTop: 4,
                fontWeight: 500,
              }}>
                {dateString}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ padding: '32px 48px' }}>
          {/* Top 4 KPIs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            marginBottom: 32,
          }}>
            {metrics.map((metric) => (
              <div
                key={metric.id}
                onMouseEnter={() => setHoveredCard(metric.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  background: colors.cardBg,
                  backdropFilter: 'blur(18px)',
                  border: `1px solid ${hoveredCard === metric.id ? metric.accent + '5A' : colors.cardBorder}`,
                  borderRadius: 20,
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.33, 0.66, 0.66, 1)',
                  transform: hoveredCard === metric.id ? 'translateY(-3px)' : 'translateY(0)',
                  boxShadow: hoveredCard === metric.id ? `0 12px 40px ${metric.accent}1F` : '0 8px 32px rgba(0, 0, 0, 0.35)',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 16,
                }}>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}>
                    {metric.label}
                  </div>
                  <div style={{ fontSize: 18 }}>{metric.icon}</div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 6,
                  marginBottom: 12,
                }}>
                  <div style={{
                    fontSize: 32,
                    fontWeight: 700,
                    fontFamily: '"JetBrains Mono", monospace',
                    color: metric.accent,
                    letterSpacing: '-0.01em',
                  }}>
                    {metric.value}
                  </div>
                  {metric.unit && (
                    <span style={{
                      fontSize: 11,
                      color: colors.textMuted,
                      fontWeight: 500,
                    }}>
                      {metric.unit}
                    </span>
                  )}
                </div>

                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: metric.change.includes('-') ? colors.accentWarning : colors.accentGreen,
                }}>
                  {metric.change} vs last month
                </div>
              </div>
            ))}
          </div>

          {/* Two Column - Analytics + Operations */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: 16,
            marginBottom: 20,
          }}>
            {/* Revenue Analytics */}
            <div style={{
              background: colors.cardBg,
              backdropFilter: 'blur(18px)',
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 20,
              padding: '28px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={() => setHoveredCard('chart')}
            onMouseLeave={() => setHoveredCard(null)}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 28,
              }}>
                <div>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 6,
                  }}>
                    Revenue Trend
                  </div>
                  <div style={{
                    fontSize: 28,
                    fontWeight: 700,
                    fontFamily: '"JetBrains Mono", monospace',
                    color: colors.accentBlue,
                  }}>
                    361K KES
                  </div>
                </div>
                <div style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: colors.accentGreen,
                }}>
                  ↑ 60% YoY
                </div>
              </div>

              {/* Mini Chart */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-around',
                height: 100,
                gap: 8,
                marginBottom: 20,
              }}>
                {revenueData.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${(item.value / maxRevenue) * 100}%`,
                        background: `linear-gradient(180deg, ${colors.accentBlue}, ${colors.accentBlue}40)`,
                        borderRadius: '4px 4px 0 0',
                        boxShadow: `0 0 8px ${colors.accentBlue}40`,
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.boxShadow = `0 0 16px ${colors.accentBlue}60`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.boxShadow = `0 0 8px ${colors.accentBlue}40`;
                      }}
                    />
                    <div style={{
                      fontSize: 9,
                      color: colors.textMuted,
                      fontWeight: 600,
                    }}>
                      {item.month}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                paddingTop: 16,
                borderTop: `1px solid ${colors.cardBorder}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 11,
              }}>
                <span style={{ color: colors.textMuted }}>6-month trend</span>
                <span style={{ color: colors.accentGreen, fontWeight: 700 }}>Healthy growth</span>
              </div>
            </div>

            {/* Operations Status */}
            <div style={{
              background: colors.cardBg,
              backdropFilter: 'blur(18px)',
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 20,
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                color: colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}>
                Operations Status
              </div>

              {systemOps.map((op, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 14px',
                    background: `rgba(79, 140, 255, 0.06)`,
                    border: `1px solid rgba(79, 140, 255, 0.12)`,
                    borderRadius: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `rgba(79, 140, 255, 0.1)`;
                    e.currentTarget.style.borderColor = `rgba(79, 140, 255, 0.25)`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = `rgba(79, 140, 255, 0.06)`;
                    e.currentTarget.style.borderColor = `rgba(79, 140, 255, 0.12)`;
                  }}
                >
                  <span style={{
                    fontSize: 11,
                    color: colors.textSecondary,
                    fontWeight: 500,
                  }}>
                    {op.label}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: op.status === 'healthy' ? colors.accentGreen : colors.accentWarning,
                    fontFamily: '"JetBrains Mono", monospace',
                  }}>
                    {op.value}
                  </span>
                </div>
              ))}

              <button
                style={{
                  marginTop: 'auto',
                  padding: '11px 16px',
                  background: colors.accentWarning,
                  border: 'none',
                  borderRadius: 10,
                  color: '#0a0800',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  transition: 'all 0.2s ease',
                  boxShadow: `0 4px 12px ${colors.accentWarning}40`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = `0 8px 20px ${colors.accentWarning}60`;
                  e.currentTarget.style.transform = 'translateY(-1px) scale(1.01)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = `0 4px 12px ${colors.accentWarning}40`;
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                }}
              >
                + Generate Portal
              </button>
            </div>
          </div>

          {/* Activity Feed & Quick Actions */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
          }}>
            {/* Activity Feed */}
            <div style={{
              background: colors.cardBg,
              backdropFilter: 'blur(18px)',
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 20,
              padding: '28px',
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                color: colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 20,
              }}>
                Activity Feed
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>
                {activityLog.map((activity, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '12px 14px',
                      background: `rgba(79, 140, 255, 0.04)`,
                      border: `1px solid ${colors.cardBorder}`,
                      borderRadius: 10,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderLeft: `3px solid ${
                        activity.type === 'success' ? colors.accentGreen :
                        activity.type === 'alert' ? colors.accentWarning :
                        colors.accentBlue
                      }`,
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = `rgba(79, 140, 255, 0.08)`;
                      e.currentTarget.style.transform = 'translateX(2px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = `rgba(79, 140, 255, 0.04)`;
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div>
                      <div style={{
                        fontSize: 11,
                        color: colors.textPrimary,
                        fontWeight: 500,
                      }}>
                        {activity.event}
                      </div>
                      <div style={{
                        fontSize: 9,
                        color: colors.textMuted,
                        marginTop: 2,
                      }}>
                        {activity.time}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: activity.type === 'success' ? colors.accentGreen :
                        activity.type === 'alert' ? colors.accentWarning :
                        colors.accentBlue,
                    }}>
                      {activity.type}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
            }}>
              {[
                { label: 'Add ISP', icon: '➕', accent: colors.accentBlue },
                { label: 'Send Invite', icon: '📬', accent: colors.accentPurple },
                { label: 'Create Invoice', icon: '💳', accent: colors.accentGreen },
                { label: 'View Reports', icon: '📊', accent: colors.accentWarning },
              ].map((action, i) => (
                <div
                  key={i}
                  style={{
                    background: colors.cardBg,
                    backdropFilter: 'blur(18px)',
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: 16,
                    padding: '20px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                    textAlign: 'center',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = action.accent + '5A';
                    e.currentTarget.style.background = `rgba(79, 140, 255, 0.08)`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = colors.cardBorder;
                    e.currentTarget.style.background = colors.cardBg;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: 24 }}>{action.icon}</div>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: colors.textSecondary,
                  }}>
                    {action.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }
        
        ::-webkit-scrollbar {
          width: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(79, 140, 255, 0.15);
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(79, 140, 255, 0.3);
        }
      `}</style>
    </div>
  );
}