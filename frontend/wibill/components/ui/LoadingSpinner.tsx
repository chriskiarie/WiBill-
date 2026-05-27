'use client'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  label?: string
}

export function LoadingSpinner({
  size = 'md',
  color = '#3b82f6',
  label = 'Loading...',
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: { container: 24, spinner: 16 },
    md: { container: 40, spinner: 28 },
    lg: { container: 60, spinner: 44 },
  }

  const { container, spinner } = sizeMap[size]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '20px',
      }}
    >
      <svg
        width={container}
        height={container}
        viewBox={`0 0 ${container} ${container}`}
        style={{
          animation: 'spin 1s linear infinite',
        }}
      >
        <circle
          cx={container / 2}
          cy={container / 2}
          r={spinner / 2}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={`${(spinner / 2) * Math.PI * 0.75} ${(spinner / 2) * Math.PI * 0.25}`}
          strokeLinecap="round"
        />
      </svg>
      {label && (
        <span
          style={{
            fontSize: 12,
            color: '#666',
            fontFamily: 'DM Mono, monospace',
          }}
        >
          {label}
        </span>
      )}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}