import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'

interface OutageBannerProps {
  status: string
  description?: string
  zone?: string
  eta?: string
  startedAt: string
  source: string
  onResolve?: () => void
}

const C = {
  red: 'var(--theme-red)', green: 'var(--theme-green)', gold: 'var(--theme-gold)',
  dim: 'var(--theme-dim)', text: 'var(--theme-text)',
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function OutageBanner({ status, description, zone, eta, startedAt, source, onResolve }: OutageBannerProps) {
  const isResolved = status === 'resolved'
  const statusLabel = status === 'investigating' ? 'Investigating'
    : status === 'confirmed_down' ? 'Outage Confirmed'
    : status === 'degraded' ? 'Degraded'
    : status

  return (
    <div style={{
      padding: '14px 18px', borderRadius: 9,
      background: isResolved ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
      border: `1px solid ${isResolved ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', marginTop: 3, flexShrink: 0,
            background: isResolved ? C.green : C.red,
          }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: isResolved ? C.green : C.red }}>
                {isResolved ? 'Resolved' : statusLabel}
              </span>
              {zone && (
                <span style={{
                  fontSize: 9, padding: '2px 6px', borderRadius: 4,
                  background: isResolved ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  color: isResolved ? C.green : C.red,
                  fontFamily: 'DM Mono, monospace',
                }}>
                  {zone}
                </span>
              )}
            </div>
            {description && (
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 4 }}>{description}</div>
            )}
            <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--theme-faint)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={10} />
                {isResolved ? `Resolved ${formatRelative(startedAt)}` : `Since ${formatRelative(startedAt)}`}
              </span>
              <span>·</span>
              <span>{source === 'auto' ? 'Auto-detected' : 'Declared by staff'}</span>
              {eta && (
                <>
                  <span>·</span>
                  <span>ETA: {new Date(eta).toLocaleTimeString()}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {!isResolved && onResolve && (
          <button onClick={onResolve} style={{
            padding: '5px 12px', borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: 'pointer',
            background: 'rgba(34,197,94,0.1)', border: '0.5px solid rgba(34,197,94,0.2)', color: C.green,
            display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
          }}>
            <CheckCircle size={11} /> Resolve
          </button>
        )}
      </div>
    </div>
  )
}
