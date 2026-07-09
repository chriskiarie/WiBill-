'use client'

import { useState } from 'react'

export type CellData = {
  day: string
  hour: number
  sessions: number
  maxSessions: number
  isPeak: boolean
}

function intensityColor(t: number): { from: string; to: string } {
  const stops = [
    { t: 0.0, from: '#0d1420', to: '#111a2c' },
    { t: 0.3, from: '#16203a', to: '#1c2a4a' },
    { t: 0.55, from: '#1f4f7a', to: '#2a6b9e' },
    { t: 0.8, from: '#b8862e', to: '#d9a441' },
    { t: 1.0, from: '#d9a441', to: '#f5c563' },
  ]
  let lo = stops[0], hi = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) {
      lo = stops[i]
      hi = stops[i + 1]
      break
    }
  }
  return { from: lerpHex(lo.from, hi.from, norm(t, lo.t, hi.t)), to: lerpHex(lo.to, hi.to, norm(t, lo.t, hi.t)) }
}

function norm(t: number, a: number, b: number) {
  return b === a ? 0 : (t - a) / (b - a)
}

function lerpHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255
  const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`
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

  const t = data.maxSessions === 0 ? 0 : data.sessions / data.maxSessions
  const { from, to } = intensityColor(t)

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
        style={{
          position: 'relative',
          aspectRatio: '1',
          borderRadius: 5,
          cursor: 'pointer',
          background: `linear-gradient(135deg, ${from}, ${to})`,
          boxShadow: [
            'inset 0 1px 0 rgba(255,255,255,0.07)',
            'inset 0 -1px 0 rgba(0,0,0,0.25)',
            data.isPeak
              ? '0 0 0 1px rgba(245,197,99,0.5), 0 0 16px 3px rgba(245,197,99,0.45)'
              : 'none',
            selected ? '0 0 0 2px rgba(250,193,7,0.9)' : 'none',
          ].join(', '),
          transform: hovered ? 'scale(1.14)' : data.isPeak ? 'scale(1.06)' : 'scale(1)',
          zIndex: hovered ? 10 : data.isPeak ? 5 : 1,
          transition: 'transform 140ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 140ms ease',
          outline: 'none',
        }}
      />
      {hovered && (
        <CellTooltip x={tipPos.x} y={tipPos.y} day={data.day} hour={data.hour} sessions={data.sessions} />
      )}
    </>
  )
}
