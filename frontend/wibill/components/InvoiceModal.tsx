'use client'
import { InvoiceStatus } from '@/lib/hooks/useInvoices'

interface InvoiceModalProps {
  status: InvoiceStatus | null
  onPayClick?: () => void
}

export function InvoiceModal({ status, onPayClick }: InvoiceModalProps) {
  if (!status?.is_locked) {
    return null
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderRadius: 12,
        padding: '32px',
        maxWidth: 500,
        width: '90%',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: 48,
          marginBottom: 16
        }}>
          🔒
        </div>

        <div style={{
          fontSize: 18,
          fontWeight: 700,
          color: '#ff6b6b',
          marginBottom: 8,
          textTransform: 'uppercase'
        }}>
          Account Locked
        </div>

        <div style={{
          fontSize: 14,
          color: '#9ca3af',
          marginBottom: 24
        }}>
          Your account has been locked due to overdue payment. Please make payment immediately to restore service.
        </div>

        <div style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: 8,
          padding: '16px',
          marginBottom: 24
        }}>
          <div style={{
            fontSize: 12,
            color: '#9ca3af',
            marginBottom: 8
          }}>
            Amount Due
          </div>
          <div style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: 24,
            fontWeight: 700,
            color: '#ff6b6b'
          }}>
            Ksh {status.amount_due?.toLocaleString()}
          </div>
          {status.locked_reason && (
            <div style={{
              fontSize: 11,
              color: '#666',
              marginTop: 12
            }}>
              Reason: {status.locked_reason}
            </div>
          )}
        </div>

        <button
          onClick={onPayClick}
          style={{
            width: '100%',
            padding: '12px',
            background: '#ff6b6b',
            color: '#030303',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            textTransform: 'uppercase',
            marginBottom: 12
          }}
        >
          Make Payment Now
        </button>

        <div style={{
          fontSize: 12,
          color: '#666'
        }}>
          Your service will be restored immediately after payment is confirmed
        </div>
      </div>
    </div>
  )
}