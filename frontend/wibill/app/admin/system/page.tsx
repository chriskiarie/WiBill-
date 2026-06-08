'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface HealthStatus {
  status: string;
  version: string;
  database: string;
  environment: string;
}

interface StatusIndicatorProps {
  status: string;
}

export default function AdminSystem() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/health`)
      .then((r) => r.json())
      .then((data) => setHealth(data))
      .catch((e) => console.error('Failed to load health:', e))
      .finally(() => setLoading(false));
  }, []);

  const colors = {
    bgVoid: '#000000',
    cardBg: '#0a0a0a',
    border: '#141414',
    textPrimary: '#f0f0f0',
    textSecondary: '#666666',
    textMuted: '#2a2a2a',
    gold: '#E8B84B',
    green: '#22c55e',
    amber: '#f59e0b',
    red: '#ef4444',
  };

  const StatusIndicator = ({ status }: StatusIndicatorProps) => {
    let color = colors.red;
    if (status === 'ok' || status === 'connected') color = colors.green;
    else if (status === 'degraded' || status === 'sandbox') color = colors.amber;

    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        borderRadius: '4px',
        background: `${color}15`,
        border: `0.5px solid ${color}30`,
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 4px ${color}`,
        }} />
        <span style={{
          fontSize: '11px',
          fontFamily: 'DM Mono, monospace',
          fontWeight: 700,
          textTransform: 'uppercase',
          color: color,
        }}>
          {status}
        </span>
      </div>
    );
  };

  return (
    <div style={{ background: colors.bgVoid, color: colors.textPrimary, minHeight: '100vh' }}>
      {/* Topbar */}
      <div style={{
        height: '52px',
        borderBottom: `0.5px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 28px',
      }}>
        <div style={{ fontSize: '20px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>
          SYSTEM
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '28px', maxWidth: '800px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ color: colors.textMuted, textAlign: 'center', padding: '60px 20px' }}>
            Loading system status...
          </div>
        ) : !health ? (
          <div style={{ color: colors.red, textAlign: 'center', padding: '60px 20px' }}>
            Failed to load system status
          </div>
        ) : (
          <div>
            {/* Health Summary */}
            <div style={{
              background: colors.cardBg,
              border: `0.5px solid ${health.status === 'ok' ? `${colors.green}30` : `${colors.amber}30`}`,
              borderTop: `2px solid ${health.status === 'ok' ? colors.green : colors.amber}`,
              borderRadius: '10px',
              padding: '20px',
              marginBottom: '28px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{
                    fontSize: '10px',
                    fontFamily: 'DM Mono, monospace',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: colors.textMuted,
                    marginBottom: '8px',
                  }}>
                    System Status
                  </div>
                  <div style={{
                    fontSize: '28px',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 700,
                    color: colors.textPrimary,
                    letterSpacing: '-0.04em',
                    textTransform: 'uppercase',
                  }}>
                    {health.status}
                  </div>
                </div>
                <StatusIndicator status={health.status} />
              </div>
            </div>

            {/* Details Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '28px',
            }}>
              {/* API Version */}
              <div style={{
                background: colors.cardBg,
                border: `0.5px solid ${colors.border}`,
                borderRadius: '10px',
                padding: '20px',
              }}>
                <div style={{
                  fontSize: '10px',
                  fontFamily: 'DM Mono, monospace',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: colors.textMuted,
                  marginBottom: '8px',
                }}>
                  API Version
                </div>
                <div style={{
                  fontSize: '18px',
                  fontFamily: 'DM Mono, monospace',
                  fontWeight: 500,
                  color: colors.gold,
                }}>
                  {health.version}
                </div>
              </div>

              {/* Environment */}
              <div style={{
                background: colors.cardBg,
                border: `0.5px solid ${colors.border}`,
                borderRadius: '10px',
                padding: '20px',
              }}>
                <div style={{
                  fontSize: '10px',
                  fontFamily: 'DM Mono, monospace',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: colors.textMuted,
                  marginBottom: '8px',
                }}>
                  Environment
                </div>
                <div style={{
                  fontSize: '16px',
                  fontFamily: 'DM Mono, monospace',
                  fontWeight: 500,
                  color: colors.textPrimary,
                  textTransform: 'uppercase',
                }}>
                  {health.environment}
                </div>
              </div>
            </div>

            {/* Database Status */}
            <div style={{
              background: colors.cardBg,
              border: `0.5px solid ${colors.border}`,
              borderRadius: '10px',
              padding: '20px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{
                    fontSize: '10px',
                    fontFamily: 'DM Mono, monospace',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: colors.textMuted,
                    marginBottom: '8px',
                  }}>
                    Database
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontFamily: 'DM Mono, monospace',
                    fontWeight: 500,
                    color: colors.textPrimary,
                    textTransform: 'capitalize',
                  }}>
                    PostgreSQL
                  </div>
                </div>
                <StatusIndicator status={health.database} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}