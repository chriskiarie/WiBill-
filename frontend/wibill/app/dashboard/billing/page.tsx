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
  const [paying, setPaying] = useState(false)
  const [paymentPhone, setPaymentPhone] = useState('')
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const BANNER_DISMISS_KEY = 'wb_billing_banner_dismissed'
  
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

  useEffect(() => {
    try {
      const val = localStorage.getItem(BANNER_DISMISS_KEY)
      if (val) {
        const ts = parseInt(val, 10)
        if (Date.now() - ts < 86400000) setBannerDismissed(true)
        else localStorage.removeItem(BANNER_DISMISS_KEY)
      }
    } catch {}
  }, [])
  
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
        {!loading && invoice && banner && !bannerDismissed && (
          <div style={{
            background: banner.bg,
            border: `1px solid ${banner.border}`,
            borderRadius: 12,
            padding: '24px',
            marginBottom: 24,
            textAlign: 'center',
            position: 'relative',
          }}>
            {invoice.status !== 'paid' && invoice.status !== 'none' && (
              <button
                onClick={() => { localStorage.setItem(BANNER_DISMISS_KEY, String(Date.now())); setBannerDismissed(true) }}
                style={{ position: 'absolute', top: 10, right: 14, background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
              >✕</button>
            )}
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
                  background: '#E8B84B',
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
                  color: '#E8B84B'
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
                  color: invoice.status === 'paid' ? '#22c55e' : invoice.status === 'overdue' ? '#ef4444' : '#E8B84B',
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
                color: '#E8B84B',
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
                background: '#E8B84B',
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

        {/* Dismissed banner reminder */}
        {!loading && bannerDismissed && invoice && invoice.status !== 'none' && invoice.status !== 'paid' && (
          <div style={{
            textAlign: 'center', padding: '20px', marginBottom: 16,
            background: '#0a0a0a', border: '0.5px solid #1a1a1a', borderRadius: 8,
          }}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
              Invoice reminder dismissed. You can view it in Notifications.
            </div>
            <button
              onClick={() => window.location.href = '/dashboard/notifications'}
              style={{
                background: 'none', border: '0.5px solid #E8B84B', borderRadius: 6,
                padding: '6px 14px', color: '#E8B84B', fontSize: 11, cursor: 'pointer',
              }}
            >
              View Notifications →
            </button>
          </div>
        )}
      </div>
      
       {/* Payment Dialog - Real STK Push */}
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
               <div style={{ fontSize: 14, fontWeight: 700, color: '#E8B84B' }}>Make Payment</div>
               <button
                 onClick={() => { setShowPaymentDialog(false); setPaymentPhone(''); }}
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
               <div>Invoice: <strong>{invoice?.invoice_number}</strong></div>
               <div style={{ marginTop: 4 }}>Amount: <strong>Ksh {invoice?.amount_due?.toLocaleString()}</strong></div>
               <div style={{ marginTop: 4 }}>Enter your M-Pesa phone number to receive STK push</div>
             </div>

             <div style={{ marginBottom: 16 }}>
               <label style={{ display: 'block', fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>
                 Phone Number (2547XXXXXXXX)
               </label>
               <input
                 type="tel"
                 value={paymentPhone}
                 onChange={(e) => setPaymentPhone(e.target.value)}
                 placeholder="254712345678"
                 disabled={paying}
                 style={{
                   width: '100%', padding: '10px 12px', background: '#080808',
                   border: '0.5px solid #1e1e1e', borderRadius: 7, color: '#e0e0e0',
                   fontSize: 12, fontFamily: 'DM Mono, monospace', boxSizing: 'border-box', outline: 'none'
                 }}
               />
             </div>

             {paying && (
               <div style={{ padding: '12px', background: '#0a1628', border: '0.5px solid #1a3a5a', borderRadius: 7, marginBottom: 12, fontSize: 11, color: '#5a9fd4' }}>
                 ⏳ STK Push sent! Check your phone and enter M-Pesa PIN.
               </div>
             )}

             <div style={{ display: 'flex', gap: 8 }}>
               <button
                 onClick={async () => {
                   if (!paymentPhone) { showToast('Enter phone number', { type: 'error' }); return; }
                   if (!token) return;
                   setPaying(true);
                   try {
                     const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/mpesa/pay/invoice`, {
                       method: 'POST',
                       headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                       body: JSON.stringify({ invoice_id: invoice.invoice_id || invoice.id, phone_number: paymentPhone }),
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        showToast('STK Push sent! Check your phone.', { type: 'success' });
                        setPaymentPhone('');
                      } else {
                        const msg = data.message || data.detail || 'Payment failed. Make sure M-Pesa is configured in Settings.';
                        showToast(msg, { type: 'error' });
                      }
                   } catch (e: any) {
                     showToast(e.message || 'Error', { type: 'error' });
                   } finally {
                     setPaying(false);
                   }
                 }}
                 disabled={paying || !paymentPhone}
                 style={{
                    flex: 1, padding: '11px', background: paying ? '#444' : '#E8B84B', border: 'none',
                    borderRadius: 6, color: '#030303', fontSize: 11, fontWeight: 700,
                   cursor: paying || !paymentPhone ? 'not-allowed' : 'pointer', opacity: paying ? 0.7 : 1
                 }}
               >
                 {paying ? 'Sending…' : 'Pay with M-Pesa'}
               </button>
               <button
                 onClick={() => { setShowPaymentDialog(false); setPaymentPhone(''); }}
                 style={{
                   flex: 1, padding: '11px', background: '#1a1a1a', border: '0.5px solid #2a2a2a',
                   borderRadius: 6, color: '#9ca3af', fontSize: 11, fontWeight: 700, cursor: 'pointer'
                 }}
               >
                 Close
               </button>
             </div>
           </div>
         </div>
       )}
    </div>
  )
}