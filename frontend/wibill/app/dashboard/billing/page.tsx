'use client'
import { useAuth } from '@/lib/auth'
import { useCallback, useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/context/ToastContext'
import { api } from '@/lib/api'

export default function BillingPage() {
  const { token } = useAuth()
  const { showToast } = useToast()
  
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  
  // Fetch current invoice status
  const fetchInvoiceStatus = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
       const data = await api.getInvoiceStatus()
      setInvoice(data)
      
      // Show warning if overdue
      if (data.status === 'overdue') {
        showToast('⚠️ Your account is locked due to overdue payment', {
          type: 'error',
          duration: 10000
        })
      } else if (data.status === 'due') {
        showToast(`Invoice due in ${data.days_left} day(s)`, {
          type: 'warning'
        })
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice')
      showToast('Failed to load invoice status', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [token])
  
  useEffect(() => {
    fetchInvoiceStatus()
  }, [fetchInvoiceStatus])
  
  // Determine status banner styling
  const getStatusBanner = () => {
    if (!invoice) return null
    
    const isLocked = invoice.is_locked
    const status = invoice.status
    
    if (isLocked || status === 'overdue') {
      return {
        bg: '#3a1a1a',
        border: '#5a2d2d',
        textColor: '#ff6b6b',
        icon: '🔴',
        title: 'ACCOUNT LOCKED',
        message: 'Payment overdue. Account is locked. Please pay immediately to restore service.',
        buttonText: 'Pay Now',
        buttonColor: '#ff6b6b'
      }
    }
    
    if (status === 'due' && invoice.days_left === 1) {
      return {
        bg: '#3a2a1a',
        border: '#5a4d2d',
        textColor: '#f59e0b',
        icon: '⚠️',
        title: 'PAYMENT DUE TODAY',
        message: `Invoice is due today. Amount: Ksh ${invoice.amount_due?.toLocaleString()}`,
        buttonText: 'Pay Now',
        buttonColor: '#f59e0b'
      }
    }
    
    if (status === 'due') {
      return {
        bg: '#2a3a1a',
        border: '#4a5a2d',
        textColor: '#fbbf24',
        icon: '⚠️',
        title: `PAYMENT DUE IN ${invoice.days_left} DAY${invoice.days_left > 1 ? 'S' : ''}`,
        message: `Invoice ${invoice.invoice_number} due on ${new Date(invoice.due_date).toLocaleDateString()}`,
        buttonText: 'Pay Now',
        buttonColor: '#fbbf24'
      }
    }
    
    if (status === 'paid') {
      return {
        bg: '#1a3a1a',
        border: '#2d5a2d',
        textColor: '#22c55e',
        icon: '✅',
        title: 'ACCOUNT ACTIVE',
        message: `Last payment: ${invoice.paid_date ? new Date(invoice.paid_date).toLocaleDateString() : 'N/A'}`,
        buttonText: null,
        buttonColor: '#22c55e'
      }
    }
    
    if (status === 'none') {
      return {
        bg: '#1a1a2a',
        border: '#2a2a4a',
        textColor: '#6b7280',
        icon: '✓',
        title: 'NO ACTIVE INVOICE',
        message: 'Invoices are created monthly on the 26th',
        buttonText: null,
        buttonColor: null
      }
    }
    
    return null
  }
  
  const banner = getStatusBanner()
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Billing" />
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: '#030303' }}>
        
        {/* Loading State */}
        {loading && (
          <LoadingSpinner size="md" label="Loading invoice..." />
        )}
        
        {/* Error State */}
        {error && !loading && (
          <div style={{
            padding: 16,
            background: '#3a1a1a',
            border: '1px solid #5a2d2d',
            borderRadius: 8,
            color: '#ff6b6b',
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{error}</span>
            <button
              onClick={fetchInvoiceStatus}
              style={{
                background: 'none',
                border: 'none',
                color: '#ff8787',
                cursor: 'pointer',
                padding: '4px 12px'
              }}
            >
              Retry
            </button>
          </div>
        )}
        
        {/* Main Banner */}
        {!loading && invoice && banner && (
          <div style={{
            background: banner.bg,
            border: `1px solid ${banner.border}`,
            borderRadius: 12,
            padding: '24px',
            marginBottom: 24,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{banner.icon}</div>
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              color: banner.textColor,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: 8
            }}>
              {banner.title}
            </div>
            <div style={{
              fontSize: 13,
              color: '#9ca3af',
              marginBottom: 16
            }}>
              {banner.message}
            </div>
            
            {banner.buttonText && (
              <button
                onClick={() => setShowPaymentDialog(true)}
                style={{
                  background: banner.buttonColor,
                  color: '#030303',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 24px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {banner.buttonText}
              </button>
            )}
          </div>
        )}
        
        {/* Invoice Details Card */}
        {!loading && invoice && invoice.status !== 'none' && (
          <div style={{
            background: '#080808',
            border: '0.5px solid #141414',
            borderRadius: 11,
            padding: '18px',
            marginBottom: 16
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginBottom: 16
            }}>
              {/* Invoice Number */}
              <div>
                <div style={{
                  fontSize: 10,
                  color: '#2a2a2a',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 6
                }}>
                  Invoice
                </div>
                <div style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 14,
                  color: '#f0f0f0',
                  fontWeight: 500
                }}>
                  {invoice.invoice_number || 'N/A'}
                </div>
              </div>
              
              {/* Due Date */}
              <div>
                <div style={{
                  fontSize: 10,
                  color: '#2a2a2a',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 6
                }}>
                  Due Date
                </div>
                <div style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 14,
                  color: '#f0f0f0',
                  fontWeight: 500
                }}>
                  {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              
              {/* Amount Due */}
              <div>
                <div style={{
                  fontSize: 10,
                  color: '#2a2a2a',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 6
                }}>
                  Amount Due
                </div>
                <div style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#3b82f6'
                }}>
                  Ksh {invoice.amount_due?.toLocaleString() || '0'}
                </div>
              </div>
              
              {/* Status */}
              <div>
                <div style={{
                  fontSize: 10,
                  color: '#2a2a2a',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 6
                }}>
                  Status
                </div>
                <div style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 12,
                  color: '#22c55e',
                  textTransform: 'uppercase',
                  fontWeight: 500
                }}>
                  {invoice.status}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Actions */}
        {!loading && invoice && invoice.status !== 'none' && (
          <div style={{
            display: 'flex',
            gap: 12
          }}>
            <button
              onClick={() => window.location.href = `/dashboard/billing/invoices`}
              style={{
                flex: 1,
                padding: '11px',
                background: '#0a0a0a',
                border: '0.5px solid #1a1a1a',
                borderRadius: 7,
                color: '#3b82f6',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              View All Invoices
            </button>
            
            <button
              onClick={() => setShowPaymentDialog(true)}
              style={{
                flex: 1,
                padding: '11px',
                background: '#3b82f6',
                border: 'none',
                borderRadius: 7,
                color: '#030303',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              {invoice.status === 'paid' ? 'Pay Next Invoice' : 'Make Payment'}
            </button>
          </div>
        )}
        
        {/* Empty State */}
        {!loading && (!invoice || invoice.status === 'none') && !error && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#444'
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
            <div style={{ fontSize: 14, marginBottom: 8 }}>No Active Invoice</div>
            <div style={{ fontSize: 12, color: '#666' }}>
              Invoices are created monthly on the 26th
            </div>
          </div>
        )}
      </div>
      
      {/* TODO: Payment Dialog (implement in next step) */}
      {showPaymentDialog && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#0a0a0a',
            border: '0.5px solid #141414',
            borderRadius: 11,
            padding: '28px',
            maxWidth: 400,
            width: '90%'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Make Payment</div>
              <button
                onClick={() => setShowPaymentDialog(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  color: '#666',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{
              padding: '16px',
              background: '#080808',
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 12,
              color: '#999'
            }}>
              Payment integration coming soon. Use M-Pesa to pay to account.
              {invoice?.invoice_number && (
                <div style={{ marginTop: 8, color: '#3b82f6' }}>
                  Reference: {invoice.invoice_number}
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowPaymentDialog(false)}
              style={{
                width: '100%',
                padding: '11px',
                background: '#1a1a1a',
                border: '0.5px solid #2a2a2a',
                borderRadius: 6,
                color: '#9ca3af',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}