'use client'
import { TransactionData } from '@/lib/hooks/useTransactions'
import { formatDate, maskPhone, formatKsh } from '@/lib/api'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface TransactionListProps {
  transactions: TransactionData[]
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
  maxItems?: number
}

export function TransactionList({
  transactions,
  loading = false,
  error = null,
  onRefresh,
  maxItems = 10,
}: TransactionListProps) {
  const displayedTransactions = transactions.slice(0, maxItems)

  return (
    <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 18 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#aaa',
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
          }}
        >
          Recent Transactions ({transactions.length})
        </span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            style={{
              fontSize: 10,
              color: '#3b82f6',
              fontFamily: 'DM Mono, monospace',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              padding: 0,
            }}
          >
            refresh →
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            background: '#3a1a1a',
            border: '1px solid #5a2d2d',
            borderRadius: 6,
            color: '#ff6b6b',
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {loading && displayedTransactions.length === 0 ? (
        <LoadingSpinner size="sm" label="Loading transactions..." />
      ) : displayedTransactions.length === 0 ? (
        <div style={{ color: '#444', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>
          No transactions yet
        </div>
      ) : (
        <div>
          {displayedTransactions.map((t, i) => (
            <div
              key={t.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 0',
                borderBottom:
                  i < displayedTransactions.length - 1 ? '0.5px solid #0d0d0d' : 'none',
              }}
            >
              <span
                style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 10,
                  color: '#333',
                  flex: 1,
                }}
              >
                {maskPhone(t.phone)}
              </span>
              <span style={{ fontSize: 10, color: '#222' }}>{t.package}</span>
              <span
                style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#e0e0e0',
                }}
              >
                {formatKsh(t.amount_ksh)}
              </span>
              <span
                style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 9,
                  color: '#1e1e1e',
                }}
              >
                −{formatKsh(t.platform_fee_ksh)} fee
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}