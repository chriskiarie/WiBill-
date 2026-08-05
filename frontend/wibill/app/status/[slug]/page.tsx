'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AlertTriangle, CheckCircle, Wifi, Activity, Clock, Shield } from 'lucide-react'

const C = {
  void: '#000000', base: '#0a0a0a', border: '#141414',
  text: '#f0f0f0', dim: '#666666', mute: '#2a2a2a',
  gold: '#E8B84B', green: '#22c55e', red: '#ef4444',
}

interface PortalStatus {
  overall_status: string
  manual_outage: any | null
  auto_outage: any | null
  last_auto_check: string | null
  portal_name: string
  is_portal_active: boolean
  has_router: boolean
}

export default function StatusPage() {
  const params = useParams()
  const slug = params.slug as string
  const [status, setStatus] = useState<PortalStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/portal/${slug}/status`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch status')
        return res.json()
      })
      .then(data => setStatus(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [slug])

  const activeOutage = status?.manual_outage || status?.auto_outage
  const statusLevel = activeOutage
    ? (activeOutage.status === 'degraded' ? 'degraded' : 'outage')
    : 'operational'

  const statusConfig = {
    operational: { color: C.green, label: 'All Systems Operational', icon: CheckCircle },
    degraded: { color: C.gold, label: 'Partial System Outage', icon: AlertTriangle },
    outage: { color: C.red, label: 'Major System Outage', icon: AlertTriangle },
  }[statusLevel]

  return (
    <div style={{
      minHeight: '100vh', background: C.void, color: C.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {/* Header */}
      <div style={{
        width: '100%', padding: '32px 24px', textAlign: 'center',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.dim, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          {status?.portal_name || slug}
        </div>
        <div style={{ fontSize: 10, color: C.dim }}>System Status</div>
      </div>

      {/* Content */}
      <div style={{ width: '100%', maxWidth: 520, padding: '40px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ color: C.dim, fontSize: 13 }}>Loading status...</div>
          </div>
        ) : error ? (
          <div style={{
            textAlign: 'center', padding: '40px 24px', background: C.base,
            borderRadius: 12, border: `1px solid ${C.border}`,
          }}>
            <Shield size={32} color={C.red} style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8 }}>Unable to Load Status</div>
            <div style={{ fontSize: 12, color: C.dim }}>{error}</div>
          </div>
        ) : (
          <>
            {/* Status Indicator */}
            <div style={{
              textAlign: 'center', padding: '32px 24px', background: C.base,
              borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 24,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: `${statusConfig.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <statusConfig.icon size={24} color={statusConfig.color} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: statusConfig.color, marginBottom: 4 }}>
                {statusConfig.label}
              </div>
              {activeOutage && (
                <div style={{ fontSize: 12, color: C.dim, marginTop: 8 }}>
                  {activeOutage.description || 'We are investigating the issue.'}
                </div>
              )}
            </div>

            {/* Outage Details */}
            {activeOutage && (
              <div style={{
                padding: '16px 20px', background: C.base,
                borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 24,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                  Incident Details
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: C.dim }}>Status</span>
                    <span style={{ color: statusConfig.color, fontWeight: 600 }}>
                      {activeOutage.status === 'investigating' ? 'Investigating' : activeOutage.status}
                    </span>
                  </div>
                  {activeOutage.zone && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: C.dim }}>Affected Area</span>
                      <span style={{ color: C.text }}>{activeOutage.zone}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: C.dim }}>Started</span>
                    <span style={{ color: C.text, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} />
                      {new Date(activeOutage.started_at).toLocaleString()}
                    </span>
                  </div>
                  {activeOutage.eta && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: C.dim }}>Estimated Resolution</span>
                      <span style={{ color: C.gold }}>{new Date(activeOutage.eta).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Service Status */}
            <div style={{
              padding: '16px 20px', background: C.base,
              borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 24,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Services
              </div>
              {[
                { name: 'WiFi Service', status: statusLevel === 'operational' ? 'operational' : 'degraded' },
                { name: 'Billing Portal', status: status?.is_portal_active ? 'operational' : 'degraded' },
                { name: 'Network', status: status?.has_router ? (statusLevel === 'operational' ? 'operational' : 'degraded') : 'unknown' },
              ].map((svc, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: i < 2 ? `1px solid ${C.border}` : 'none',
                }}>
                  <span style={{ fontSize: 12, color: C.text }}>{svc.name}</span>
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600,
                    color: svc.status === 'operational' ? C.green : svc.status === 'degraded' ? C.gold : C.dim,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: svc.status === 'operational' ? C.green : svc.status === 'degraded' ? C.gold : C.dim }} />
                    {svc.status === 'operational' ? 'Operational' : svc.status === 'degraded' ? 'Degraded' : 'Unknown'}
                  </span>
                </div>
              ))}
            </div>

            {/* Last Check */}
            {status?.last_auto_check && (
              <div style={{ textAlign: 'center', fontSize: 10, color: C.dim }}>
                Last checked: {new Date(status.last_auto_check).toLocaleString()}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 'auto', padding: '24px', textAlign: 'center',
        borderTop: `1px solid ${C.border}`, width: '100%',
      }}>
        <div style={{ fontSize: 10, color: C.dim }}>
          Powered by <span style={{ color: C.gold, fontWeight: 600 }}>WiBill</span>
        </div>
      </div>
    </div>
  )
}
