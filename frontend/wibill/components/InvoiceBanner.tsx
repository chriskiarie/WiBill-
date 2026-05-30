'use client'
import { InvoiceStatus } from '@/lib/hooks/useInvoices'

interface InvoiceBannerProps {
  status: InvoiceStatus | null
  onPayClick?: () => void
}

export function InvoiceBanner({ status, onPayClick }: InvoiceBannerProps) {
  if (!status || status.status === 'none') {
    return null
  }

  const isLocked = status.is_locked
  const st = status.status

  // Determine banner styling
  let bannerStyle = {
    bg: '#1a1a1a',
    border: '#2a2a2a',
    textColor: '#9ca3af',
    icon: '✓',
    title: 'Account Active',
    message: 'Your account is active',
    showButton: false
  }

  if (isLocked || st === 'overdue') {
    bannerStyle = {
      bg: '#3a1a1a',
      border: '#5a2d2d',
      textColor: '#ff6b6b',
      icon: '🔴',
      title: 'ACCOUNT LOCKED',
      message: 'Payment overdue. Your account is locked.',
      showButton: true
    }
  } else if (st === 'due' && status.days_left === 0) {
    bannerStyle = {
      bg: '#3a2a1a',
      border: '#5a4d2d',
      textColor: '#f59e0b',
      icon: '⚠️',
      title: 'PAYMENT DUE TODAY',
      message: `Invoice due today - Ksh ${status.amount_due?.toLocaleString()}`,
      showButton: true
    }
  } else if (st === 'due' && status.days_left && status.days_left > 0) {
    bannerStyle = {
      bg: '#2a3a1a',
      border: '#4a5a2d',
      textColor: '#fbbf24',
      icon: '⚠️',
      title: `PAYMENT DUE IN ${status.days_left} DAY${status.days_left > 1 ? 'S' : ''}`,
      message: `Ksh ${status.amount_due?.toLocaleString()} due`,
      showButton: true
    }
  } else if (st === 'paid') {
    bannerStyle = {
      bg: '#1a3a1a',
      border: '#2d5a2d',
      textColor: '#22c55e',
      icon: '✅',
      title: 'ACCOUNT ACTIVE',
      message: 'Thank you for your payment',
      showButton: false
    }
  }

  return (
    <div style={{
      background: bannerStyle.bg,
      border: `1px solid ${bannerStyle.border}`,
      borderRadius: 8,
      padding: '12px 16px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        <div style={{ fontSize: 18 }}>{bannerStyle.icon}</div>
        <div>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: bannerStyle.textColor,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 2
          }}>
            {bannerStyle.title}
          </div>
          <div style={{
            fontSize: 11,
            color: '#9ca3af'
          }}>
            {bannerStyle.message}
          </div>
        </div>
      </div>

      {bannerStyle.showButton && onPayClick && (
        <button
          onClick={onPayClick}
          style={{
            background: bannerStyle.textColor,
            color: '#030303',
            border: 'none',
            borderRadius: 4,
            padding: '6px 12px',
            fontSize: 10,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase'
          }}
        >
          Pay Now
        </button>
      )}
    </div>
  )
}