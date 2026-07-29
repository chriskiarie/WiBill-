'use client'

import { useState } from 'react'

export type CellData = {
  day: string
  hour: number
  sessions: number
  maxSessions: number
  isPeak: boolean
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

function getColor(intensity: number): string {
  if (intensity === 0) return 'rgb(18, 18, 30)'
  if (intensity <= 0.01) return 'rgb(22, 30, 22)'

  const stops: [number, number, number, number][] = [
    [0.0,  22, 30, 22],
    [0.25, 20, 60, 25],
    [0.5,  25, 100, 35],
    [0.75, 30, 150, 50],
    [1.0,  34, 197, 94],
  ]

  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, r0, g0, b0] = stops[i]
    const [t1, r1, g1, b1] = stops[i + 1]
    if (intensity <= t1) {
      const t = (intensity - t0) / (t1 - t0)
      return `rgb(${lerp(r0, r1, t)}, ${lerp(g0, g1, t)}, ${lerp(b0, b1, t)})`
    }
  }
  return 'rgb(34, 197, 94)'
}

function CellTooltip({ x, y, day, hour, sessions }: { x: number; y: number; day: string; hour: number; sessions: number }) {
  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y - 14,
        transform: 'translate(-50%, -100%)',
        pointerEvents: 'none',
        zIndex: 50,
        padding: '8px 12px',
        borderRadius: 10,
        background: 'rgba(16, 20, 32, 0.82)',
        backdropFilter: 'blur(14px) saturate(140%)',
        WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
        whiteSpace: 'nowrap',
      }}
    >
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: '#8fa3c9', marginBottom: 2 }}>
        {day} &middot; {String(hour).padStart(2, '0')}:00
      </div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 500, color: '#eaf1ff' }}>
        {sessions.toLocaleString()} <span style={{ color: '#6b7ba3', fontSize: 12, fontWeight: 400 }}>sessions</span>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: -5,
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
          width: 9,
          height: 9,
          background: 'rgba(16, 20, 32, 0.82)',
          borderRight: '1px solid rgba(255,255,255,0.09)',
          borderBottom: '1px solid rgba(255,255,255,0.09)',
        }}
      />
    </div>
  )
}

export function HeatmapCell({ data, selected, onSelect }: { data: CellData; selected: boolean; onSelect: (d: CellData) => void }) {
  const [hovered, setHovered] = useState(false)
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 })

  const intensity = data.maxSessions === 0 ? 0 : data.sessions / data.maxSessions
  const cellColor = getColor(intensity)

  const handleMouseMove = (e: React.MouseEvent) => {
    setTipPos({ x: e.clientX, y: e.clientY })
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${data.day} ${data.hour}:00, ${data.sessions} sessions`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseMove={handleMouseMove}
        onClick={() => onSelect(data)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(data)}
        className={`heat-cell${data.isPeak ? ' heat-peak' : ''}`}
        style={{
          width: '100%',
          aspectRatio: '1',
          borderRadius: 5,
          cursor: 'pointer',
          background: cellColor,
          boxShadow: [
            'inset 0 1px 0 rgba(255,255,255,0.07)',
            'inset 0 -1px 0 rgba(0,0,0,0.25)',
            data.isPeak
              ? '0 0 0 1px rgba(34,197,94,0.5), 0 0 16px 3px rgba(34,197,94,0.4)'
              : 'none',
            selected ? '0 0 0 2px rgba(34,197,94,0.9)' : 'none',
          ].join(', '),
          transform: hovered ? 'scale(1.14)' : data.isPeak ? 'scale(1.06)' : 'scale(1)',
          zIndex: hovered ? 10 : data.isPeak ? 5 : 1,
          transition: 'transform 140ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 140ms ease, background-color 0.2s ease',
          outline: 'none',
        } as React.CSSProperties}
      />
      {hovered && (
        <CellTooltip x={tipPos.x} y={tipPos.y} day={data.day} hour={data.hour} sessions={data.sessions} />
      )}
    </>
  )
}
