'use client'
import { ReactNode, useEffect } from 'react'
import { Check, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  onClose: (id: string) => void
  action?: {
    label: string
    onClick: () => void
  }
}

const iconMap = {
  success: Check,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colorMap = {
  success: { bg: '#1a3a1a', border: '#2d5a2d', text: '#4ade80', icon: '#22c55e' },
  error: { bg: '#3a1a1a', border: '#5a2d2d', text: '#ff6b6b', icon: '#f87171' },
  warning: { bg: '#3a2f1a', border: '#5a4a2d', text: '#fbbf24', icon: '#f59e0b' },
  info: { bg: '#1a2a3a', border: '#2d4a5a', text: '#60a5fa', icon: '#3b82f6' },
}

export function Toast({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
  action,
}: ToastProps) {
  const Icon = iconMap[type]
  const colors = colorMap[type]

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose(id), duration)
      return () => clearTimeout(timer)
    }
  }, [id, duration, onClose])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: 12,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        marginBottom: 8,
        animation: 'slideIn 0.3s ease',
      }}
    >
      <Icon size={18} color={colors.icon} style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
          {title}
        </div>
        {message && (
          <div style={{ fontSize: 12, color: colors.text, opacity: 0.8, marginTop: 2 }}>
            {message}
          </div>
        )}
        {action && (
          <button
            onClick={action.onClick}
            style={{
              marginTop: 8,
              padding: '4px 8px',
              background: colors.icon,
              color: '#000',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        style={{
          background: 'none',
          border: 'none',
          color: colors.text,
          cursor: 'pointer',
          padding: 0,
          opacity: 0.6,
          flexShrink: 0,
        }}
      >
        <X size={16} />
      </button>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastProps[]
  onClose: (id: string) => void
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9999,
        maxWidth: 400,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  )
}