'use client'
import { useAuth } from '@/lib/auth'
import { useCallback, useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/context/ToastContext'
import { api } from '@/lib/api'

const C = {
  void: 'var(--theme-bg)', base: 'var(--theme-card-base)', surface: 'var(--theme-surface)',
  border: 'var(--theme-border)', border2: 'var(--theme-border2)',
  text: 'var(--theme-text)', dim: 'var(--theme-dim)', mute: 'var(--theme-mute)', faint: 'var(--theme-faint)',
  gold: 'var(--theme-gold)', green: 'var(--theme-green)', red: 'var(--theme-red)',
}

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
        bg: 'rgba(239,68,68,0.08)',
        border: 'rgba(239,68,68,0.2)',
        textColor: C.red,
        icon: '🔴',
        title: 'ACCOUNT LOCKED',
        message: 'Payment overdue. Account is locked. Please pay immediately to restore service.',
        buttonText: 'Pay Now',
        buttonColor: C.red
      }
    }
    
    if (status === 'due' && invoice.days_left === 1) {
      return {
        bg: 'rgba(232,184,75,0.08)',
        border: 'rgba(232,184,75,0.2)',
        textColor: C.gold,
        icon: '⚠️',
        title: 'PAYMENT DUE TODAY',
        message: `Invoice is due today. Amount: Ksh ${invoice.amount_due?.toLocaleString()}`,
        buttonText: 'Pay Now',
        buttonColor: C.gold
      }
    }
    
    if (status === 'due') {
      return {
        bg: 'rgba(232,184,75,0.08)',
        border: 'rgba(232,184,75,0.2)',
        textColor: C.gold,
        icon: '⚠️',
        title: `PAYMENT DUE IN ${invoice.days_left} DAY${invoice.days_left > 1 ? 'S' : ''}`,
        message: `Invoice ${invoice.invoice_number} due on ${new Date(invoice.due_date).toLocaleDateString()}`,
        buttonText: 'Pay Now',
        buttonColor: C.gold
      }
    }
    
    if (status === 'paid') {
      return {
        bg: 'rgba(34,197,94,0.08)',
        border: 'rgba(34,197,94,0.2)',
        textColor: C.green,
        icon: '✅',
        title: 'ACCOUNT ACTIVE',
        message: `Last payment: ${invoice.paid_date ? new Date(invoice.paid_date).toLocaleDateString() : 'N/A'}`,
        buttonText: null,
        buttonColor: C.green
      }
    }
    
    if (status === 'none') {
      return {
        bg: 'var(--theme-surface)',
        border: C.border2,
        textColor: C.dim,
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
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: C.void }}>
        
        {/* Loading State */}
        {loading && (
          <LoadingSpinner size="md" label="Loading invoice..." />
        )}
        
        {/* Error State */}
        {error && !loading && (
          <div style={{
            padding: 16,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 8,
            color: C.red,
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
                color: C.red,
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
                style={{ position: 'absolute', top: 10, right: 14, background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
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
              color: C.dim,
              marginBottom: 16
            }}>
              {banner.message}
            </div>

            {banner.buttonText && (
              <button
                onClick={() => setShowPaymentDialog(true)}
                style={{
                  background: C.gold,
                  color: '#000',
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
            background: C.surface,
            border: `0.5px solid ${C.border}`,
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
                  color: C.mute,
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
                  color: C.text,
                  fontWeight: 500
                }}>
                  {invoice.invoice_number || 'N/A'}
                </div>
              </div>
              
              {/* Due Date */}
              <div>
                <div style={{
                  fontSize: 10,
                  color: C.mute,
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
                  color: C.text,
                  fontWeight: 500
                }}>
                  {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              
              {/* Amount Due */}
              <div>
                <div style={{
                  fontSize: 10,
                  color: C.mute,
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
                  color: C.gold
                }}>
                  Ksh {invoice.amount_due?.toLocaleString() || '0'}
                </div>
              </div>
              
              {/* Status */}
              <div>
                <div style={{
                  fontSize: 10,
                  color: C.mute,
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
                  color: invoice.status === 'paid' ? C.green : invoice.status === 'overdue' ? C.red : C.gold,
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
                background: C.base,
                border: `0.5px solid ${C.border2}`,
                borderRadius: 7,
                color: C.gold,
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
                background: C.gold,
                border: 'none',
                borderRadius: 7,
                color: '#000',
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
            color: C.dim
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
            <div style={{ fontSize: 14, marginBottom: 8 }}>No Active Invoice</div>
            <div style={{ fontSize: 12, color: C.dim }}>
              Invoices are created monthly on the 26th
            </div>
          </div>
        )}

        {/* Dismissed banner reminder */}
        {!loading && bannerDismissed && invoice && invoice.status !== 'none' && invoice.status !== 'paid' && (
          <div style={{
            textAlign: 'center', padding: '20px', marginBottom: 16,
            background: C.base, border: `0.5px solid ${C.border2}`, borderRadius: 8,
          }}>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 8 }}>
              Invoice reminder dismissed. You can view it in Notifications.
            </div>
            <button
              onClick={() => window.location.href = '/dashboard/notifications'}
              style={{
                background: 'none', border: `0.5px solid ${C.gold}`, borderRadius: 6,
                padding: '6px 14px', color: C.gold, fontSize: 11, cursor: 'pointer',
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
            background: C.base,
            border: `0.5px solid ${C.border}`,
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
              <div style={{ fontSize: 14, fontWeight: 700, color: C.gold }}>Make Payment</div>
              <button
                onClick={() => { setShowPaymentDialog(false); setPaymentPhone(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  color: C.dim,
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{
              padding: '16px',
              background: C.surface,
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 12,
              color: C.dim
             }}>
               <div>Invoice: <strong>{invoice?.invoice_number}</strong></div>
               <div style={{ marginTop: 4 }}>Amount: <strong>Ksh {invoice?.amount_due?.toLocaleString()}</strong></div>
               <div style={{ marginTop: 4 }}>Enter your M-Pesa phone number to receive STK push</div>
             </div>

             <div style={{ marginBottom: 16 }}>
               <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>
                 Phone Number (2547XXXXXXXX)
               </label>
               <input
                 type="tel"
                 value={paymentPhone}
                 onChange={(e) => setPaymentPhone(e.target.value)}
                 placeholder="254712345678"
                 disabled={paying}
                 style={{
                    width: '100%', padding: '10px 12px', background: C.surface,
                    border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text,
                   fontSize: 12, fontFamily: 'DM Mono, monospace', boxSizing: 'border-box', outline: 'none'
                 }}
               />
             </div>

             {paying && (
               <div style={{ padding: '12px', background: 'var(--theme-surface)', border: `0.5px solid ${C.border}`, borderRadius: 7, marginBottom: 12, fontSize: 11, color: C.dim }}>
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
                     flex: 1, padding: '11px', background: paying ? C.faint : C.gold, border: 'none',
                     borderRadius: 6, color: '#000', fontSize: 11, fontWeight: 700,
                   cursor: paying || !paymentPhone ? 'not-allowed' : 'pointer', opacity: paying ? 0.7 : 1
                 }}
               >
                 {paying ? 'Sending…' : 'Pay with M-Pesa'}
               </button>
               <button
                 onClick={() => { setShowPaymentDialog(false); setPaymentPhone(''); }}
                 style={{
                    flex: 1, padding: '11px', background: C.surface, border: `0.5px solid ${C.border2}`,
                    borderRadius: 6, color: C.dim, fontSize: 11, fontWeight: 700, cursor: 'pointer'
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