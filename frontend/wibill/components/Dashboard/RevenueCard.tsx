'use client'
import { DollarSign } from 'lucide-react'

interface RevenueCardProps {
  label: string
  value: number
  sub?: string
  trend?: 'up' | 'down' | null
  color?: string
  loading?: boolean
}

export function RevenueCard({
  label,
  value,
  sub,
  trend = null,
  color = '#3b82f6',
  loading = false,
}: RevenueCardProps) {
  const fmt = (n: number) => n.toLocaleString('en-KE')

  return (
    <div
      style={{
        background: '#080808',
        border: '0.5px solid #141414',
        borderRadius: 11,
        padding: '18px 18px',
        position: 'relative',
        overflow: 'hidden',
        borderTop: `1.5px solid ${color}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: '#2a2a2a',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <DollarSign size={12} color={color} />
        {label}
      </div>

      {loading ? (
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 24, color: '#444' }}>
          —
        </div>
      ) : (
        <>
          <div
            style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: 24,
              fontWeight: 500,
              color: '#f0f0f0',
              letterSpacing: '-0.5px',
              lineHeight: 1,
            }}
          >
            Ksh {fmt(value)}
          </div>
          <div
            style={{
              fontSize: 10,
              marginTop: 7,
              fontFamily: 'DM Mono, monospace',
              color:
                trend === 'up' ? '#22c55e' : trend === 'down' ? '#f87171' : '#2a2a2a',
            }}
          >
            {sub || '—'}
          </div>
        </>
      )}

      <DollarSign
        size={40}
        color={color}
        style={{ position: 'absolute', right: 14, top: 14, opacity: 0.04 }}
      />
    </div>
  )
}