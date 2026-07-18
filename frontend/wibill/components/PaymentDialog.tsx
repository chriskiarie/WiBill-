'use client'
import { useState, useEffect, useRef } from 'react'
import { useToast } from '@/context/ToastContext'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface PaymentDialogProps {
  invoiceId: string | null
  amount: number
  onClose: () => void
  onSuccess?: () => void
  token: string
}

type Step = 'confirm' | 'phone' | 'waiting' | 'success' | 'failed'

export function PaymentDialog({ invoiceId, amount, onClose, onSuccess, token }: PaymentDialogProps) {
  const { showToast } = useToast()
  const [step, setStep] = useState<Step>('confirm')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkoutId, setCheckoutId] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)
  const [dots, setDots] = useState('')
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const dotsRef = useRef<NodeJS.Timeout | null>(null)

  // Animate waiting dots
  useEffect(() => {
    if (step === 'waiting') {
      dotsRef.current = setInterval(() => {
        setDots(d => d.length >= 3 ? '' : d + '.')
      }, 500)
    }
    return () => { if (dotsRef.current) clearInterval(dotsRef.current) }
  }, [step])

  // Poll for payment status
  useEffect(() => {
    if (step !== 'waiting' || !checkoutId) return

    pollRef.current = setInterval(async () => {
      setPollCount(c => c + 1)
      try {
        const res = await fetch(`${BASE}/api/mpesa/status/${checkoutId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()

        if (data.status === 'success') {
          clearInterval(pollRef.current!)
          setReceipt(data.mpesa_receipt)
          setStep('success')
          showToast('Payment confirmed!', { type: 'success' })
          setTimeout(() => { onSuccess?.(); onClose() }, 3000)
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          clearInterval(pollRef.current!)
          setStep('failed')
        }
      } catch {}
    }, 2000)

    // Timeout after 90 seconds
    const timeout = setTimeout(() => {
      clearInterval(pollRef.current!)
      if (step === 'waiting') setStep('failed')
    }, 90000)

    return () => {
      clearInterval(pollRef.current!)
      clearTimeout(timeout)
    }
  }, [step, checkoutId, token])

  const handleInitiate = async () => {
    const cleaned = phone.replace(/\s+/g, '').replace(/^0/, '254')
    if (!/^254[17]\d{8}$/.test(cleaned)) {
      showToast('Enter a valid Safaricom number (07XX or 01XX)', { type: 'error' })
      return
    }
    if (!invoiceId) return

    setLoading(true)
    try {
      const res = await fetch(`${BASE}/api/mpesa/pay/invoice`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId, phone_number: cleaned })
      })
      const data = await res.json()

      if (data.success && data.checkout_request_id) {
        setCheckoutId(data.checkout_request_id)
        setStep('waiting')
        setPollCount(0)
      } else {
        showToast(data.message || 'Failed to initiate payment', { type: 'error' })
      }
    } catch (err: any) {
      showToast('Network error — try again', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const stopAndClose = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    onClose()
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    backdropFilter: 'blur(4px)'
  }
  const card: React.CSSProperties = {
    background: '#0a0a0a', border: '0.5px solid #1a1a1a', borderRadius: 14,
    padding: 28, maxWidth: 420, width: '92%', position: 'relative'
  }
  const btn = (color: string, text: string): React.CSSProperties => ({
    width: '100%', padding: '12px', background: color, color: color === '#1a1a1a' ? '#9ca3af' : '#030303',
    border: color === '#1a1a1a' ? '0.5px solid #2a2a2a' : 'none',
    borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8
  })

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) stopAndClose() }}>
      <div style={card}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f0' }}>Pay via M-Pesa</span>
          <button onClick={stopAndClose} disabled={step === 'waiting'}
            style={{ background: 'none', border: 'none', fontSize: 18, color: '#444', cursor: step === 'waiting' ? 'not-allowed' : 'pointer' }}>
            ×
          </button>
        </div>

        {/* Amount */}
        <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 8, padding: '14px 16px', marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Amount Due</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 30, fontWeight: 700, color: '#3b82f6' }}>
            Ksh {amount.toLocaleString()}
          </div>
        </div>

        {/* STEP: confirm */}
        {step === 'confirm' && (
          <>
            <div style={{ fontSize: 12, color: '#666', lineHeight: 1.7, marginBottom: 20 }}>
              An M-Pesa STK push will be sent to your phone. Enter your PIN to complete payment. Your account unlocks automatically on success.
            </div>
            <button style={btn('#3b82f6', '')} onClick={() => setStep('phone')}>
              Continue
            </button>
            <button style={btn('#1a1a1a', '')} onClick={stopAndClose}>Cancel</button>
          </>
        )}

        {/* STEP: phone */}
        {step === 'phone' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#666', fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                M-Pesa Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0712 345 678"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && !loading && handleInitiate()}
                style={{
                  width: '100%', padding: '11px 12px', background: '#080808',
                  border: '0.5px solid #2a2a2a', borderRadius: 7, color: '#f0f0f0',
                  fontFamily: 'DM Mono, monospace', fontSize: 14, boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
              <div style={{ fontSize: 10, color: '#444', marginTop: 6 }}>
                Safaricom number only — 07XX or 01XX
              </div>
            </div>
            <button
              style={{ ...btn('#22c55e', ''), opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
              onClick={handleInitiate}
              disabled={loading}
            >
              {loading ? 'Sending prompt…' : 'Send M-Pesa Prompt'}
            </button>
            <button style={btn('#1a1a1a', '')} onClick={() => setStep('confirm')} disabled={loading}>Back</button>
          </>
        )}

        {/* STEP: waiting */}
        {step === 'waiting' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            {/* Pulse ring */}
            <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 20px' }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: '2px solid #22c55e', opacity: 0.3,
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
              <div style={{
                position: 'absolute', inset: 8, borderRadius: '50%',
                border: '2px solid #22c55e', opacity: 0.6,
                animation: 'pulse 1.5s ease-in-out infinite 0.3s'
              }} />
              <div style={{
                position: 'absolute', inset: 16, borderRadius: '50%',
                background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20
              }}>📱</div>
            </div>
            <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:0.3} 50%{transform:scale(1.15);opacity:0.8} }`}</style>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0', marginBottom: 8 }}>
              Waiting for payment{dots}
            </div>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 20, lineHeight: 1.6 }}>
              Check your phone and enter your M-Pesa PIN.<br />
              Do not close this window.
            </div>
            <div style={{ fontSize: 10, color: '#333', fontFamily: 'DM Mono, monospace' }}>
              {Math.ceil((90 - pollCount * 2))}s remaining
            </div>
            <button
              onClick={stopAndClose}
              style={{ marginTop: 16, background: 'none', border: '0.5px solid #2a2a2a', borderRadius: 6, color: '#555', fontSize: 11, padding: '8px 20px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* STEP: success */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#22c55e', marginBottom: 8 }}>Payment Confirmed!</div>
            {receipt && (
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#3b82f6', background: '#0a1628', padding: '8px 14px', borderRadius: 6, display: 'inline-block', marginBottom: 12 }}>
                {receipt}
              </div>
            )}
            <div style={{ fontSize: 11, color: '#555' }}>Your account is now active. Redirecting…</div>
          </div>
        )}

        {/* STEP: failed */}
        {step === 'failed' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>❌</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#ff6b6b', marginBottom: 8 }}>Payment Failed</div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 20 }}>
              The payment was not completed. You may have cancelled or the session timed out.
            </div>
            <button style={btn('#3b82f6', '')} onClick={() => { setStep('phone'); setCheckoutId(null) }}>
              Try Again
            </button>
            <button style={btn('#1a1a1a', '')} onClick={stopAndClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  )
}