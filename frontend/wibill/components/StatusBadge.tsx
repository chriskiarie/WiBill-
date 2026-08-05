interface StatusBadgeProps {
  status: 'operational' | 'degraded' | 'outage'
  label?: string
}

const C = {
  green: 'var(--theme-green)', gold: 'var(--theme-gold)', red: 'var(--theme-red)',
  dim: 'var(--theme-dim)',
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = {
    operational: { color: C.green, text: label || 'Operational', pulse: true },
    degraded: { color: C.gold, text: label || 'Degraded', pulse: true },
    outage: { color: C.red, text: label || 'Outage', pulse: true },
  }[status]

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 5,
      background: `${config.color}10`, border: `0.5px solid ${config.color}30`,
      fontSize: 10, fontWeight: 600, color: config.color,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: config.color,
      }} />
      {config.text}
    </span>
  )
}
