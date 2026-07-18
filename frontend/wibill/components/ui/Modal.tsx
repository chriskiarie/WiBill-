'use client'
import { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  title: string
  children: ReactNode
  onClose: () => void
  actions?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'danger' | 'ghost'
  }[]
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 400,
  md: 500,
  lg: 700,
}

export function Modal({
  isOpen,
  title,
  children,
  onClose,
  actions = [],
  size = 'md',
}: ModalProps) {
  if (!isOpen) return null

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease',
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: sizeMap[size],
          maxHeight: '90vh',
          background: '#080808',
          border: '1px solid #1a1a1a',
          borderRadius: 12,
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.3s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid #0d0d0d',
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#fff' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#555',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            color: '#ccc',
            fontSize: 14,
          }}
        >
          {children}
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: '12px 16px',
              borderTop: '1px solid #0d0d0d',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: '#0d0d0d',
                color: '#ccc',
                border: '1px solid #1a1a1a',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            {actions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                style={{
                  padding: '8px 16px',
                  background:
                    action.variant === 'danger'
                      ? '#f87171'
                      : action.variant === 'ghost'
                      ? '#0d0d0d'
                      : '#3b82f6',
                  color:
                    action.variant === 'danger' || action.variant === 'primary'
                      ? '#fff'
                      : '#ccc',
                  border:
                    action.variant === 'ghost' ? '1px solid #1a1a1a' : 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            transform: translate(-50%, -45%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, -50%);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}