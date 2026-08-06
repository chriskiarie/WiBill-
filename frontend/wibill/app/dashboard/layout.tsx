'use client'
import { Suspense, useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'
import MobileTabBar from '@/components/MobileTabBar'
import { DashboardProvider } from '@/context/DashboardContext'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'


function DashboardToast() {
  const searchParams = useSearchParams()
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (searchParams?.get('onboarded') === 'true') {
      setToast('Your hotspot is live')
      const url = new URL(window.location.href)
      url.searchParams.delete('onboarded')
      window.history.replaceState({}, '', url.toString())
      setTimeout(() => setToast(''), 5000)
    }
  }, [searchParams])

  if (!toast) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999, animation: 'slide-up 0.5s ease-out forwards',
      background: '#0D0D0B', border: '0.5px solid #2A2A27', borderRadius: 10, padding: '14px 20px',
      display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#EDEBE6',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
      {toast}
    </div>
  )
}

type StkState = 'idle' | 'sending' | 'sent' | 'completed' | 'failed'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token, hydrated } = useAuth()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [suspended, setSuspended] = useState(false)
  const [invoiceStatus, setInvoiceStatus] = useState<string>('active')
  const [feeDue, setFeeDue] = useState<number>(0)
  const [ispName, setIspName] = useState('')
  const [nextInvoiceDate, setNextInvoiceDate] = useState<string | null>(null)
  const [lastPaidDate, setLastPaidDate] = useState<string | null>(null)

  // Mobile state
  const isMobile = useIsMobile()

  // Paused overlay state
  const [stkState, setStkState] = useState<StkState>('idle')
  const [stkCheckoutId, setStkCheckoutId] = useState('')
  const [stkMessage, setStkMessage] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [copied, setCopied] = useState(false)
  const [showNotifyForm, setShowNotifyForm] = useState(false)
  const [notifyTxCode, setNotifyTxCode] = useState('')
  const [notifyAmount, setNotifyAmount] = useState('')
  const [notifyNotes, setNotifyNotes] = useState('')
  const [notifySubmitting, setNotifySubmitting] = useState(false)
  const [notifyDone, setNotifyDone] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [stkTimerCount, setStkTimerCount] = useState(0)

  useEffect(() => {
    if (!token && hydrated) {
      router.push('/login')
      return
    }
    if (!token) return

    const checkSuspension = async () => {
      try {
        const r = await fetch(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (r.status === 403) {
          const body = await r.json().catch(() => ({ detail: '' }))
          if (body.detail === 'account_suspended') {
            setSuspended(true)
            return
          }
        }
        if (r.ok) {
          const me = await r.json()
          localStorage.setItem('wb_user', JSON.stringify(me))
          window.dispatchEvent(new Event('storage'))
          setInvoiceStatus(me.invoice_status || 'active')
          setFeeDue(me.monthly_fee_ksh || 0)
          setIspName(me.tenant_name || '')
          setNextInvoiceDate(me.next_invoice_date || null)
          setLastPaidDate(me.last_paid_date || null)
        }
      } catch {}
    }

    checkSuspension().then(() => {
      const role = localStorage.getItem('wb_role')
      if (role === 'platform_admin') {
        router.replace('/admin')
        return
      }
      setReady(true)
    })
  }, [token, hydrated])

  // STK push polling
  useEffect(() => {
    if (stkState !== 'sent' || !stkCheckoutId) return
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/mpesa/status/${stkCheckoutId}`)
        const data = await r.json()
        if (data.status === 'success') {
          setStkState('completed')
          setStkMessage('Payment confirmed! Your account will be reactivated shortly.')
          if (pollRef.current) clearInterval(pollRef.current)
        } else if (data.status === 'failed') {
          setStkState('failed')
          setStkMessage(data.error_reason || 'Payment was not completed.')
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch {}
    }, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [stkState, stkCheckoutId])

  // STK resend timer (60s after send)
  useEffect(() => {
    if (stkState !== 'sent' && stkState !== 'failed') return
    setStkTimerCount(60)
    stkTimerRef.current = setInterval(() => {
      setStkTimerCount(prev => {
        if (prev <= 1) {
          if (stkTimerRef.current) clearInterval(stkTimerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (stkTimerRef.current) clearInterval(stkTimerRef.current) }
  }, [stkState])

  const doStkPush = async () => {
    const num = phoneNumber.trim()
    if (!num || num.length < 10) { setStkMessage('Enter a valid phone number'); return }
    setStkState('sending')
    setStkMessage('')
    try {
      const r = await fetch(`${API}/api/mpesa/pay/platform-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone_number: num, amount_ksh: feeDue }),
      })
      const data = await r.json()
      if (data.success && data.checkout_request_id) {
        setStkState('sent')
        setStkCheckoutId(data.checkout_request_id)
        setStkMessage(data.message || 'STK Push sent. Check your phone for the M-Pesa prompt.')
      } else {
        setStkState('failed')
        setStkMessage(data.message || data.detail || 'Failed to send payment request.')
      }
    } catch (e: any) {
      setStkState('failed')
      setStkMessage(e?.message || 'Network error. Try again.')
    }
  }

  const resetStk = () => {
    setStkState('idle')
    setStkCheckoutId('')
    setStkMessage('')
    if (pollRef.current) clearInterval(pollRef.current)
    if (stkTimerRef.current) clearInterval(stkTimerRef.current)
  }

  const submitNotify = async () => {
    if (!notifyTxCode.trim()) return
    setNotifySubmitting(true)
    try {
      await fetch(`${API}/api/payment-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          transaction_code: notifyTxCode.trim(),
          amount_paid: parseFloat(notifyAmount) || feeDue,
          notes: notifyNotes.trim() || undefined,
        }),
      })
      setNotifyDone(true)
    } catch {}
    setNotifySubmitting(false)
  }

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText('247247')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const formatDate = (d?: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (suspended) {
    return (
      <div style={{
        minHeight: '100vh', background: '#000', color: '#EDEBE6',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, sans-serif', padding: 40,
      }}>
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--theme-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3D2A06" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><path d="M12 20h.01"/></svg>
          </div>
          <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 20, fontWeight: 700, color: '#EDEBE6' }}>WiBill</span>
        </div>
        <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 28, fontWeight: 700, color: '#E5707A', margin: '0 0 12px' }}>Account Suspended</h1>
        <p style={{ fontSize: 14, color: '#8C8A84', margin: '0 0 32px', maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
          Your account has been suspended. Please contact support to resolve this.
        </p>
        <a href="mailto:support@honestbill.co.ke" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 8,
          border: '1px solid var(--theme-gold)', background: 'transparent', color: 'var(--theme-gold)', textDecoration: 'none',
          fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 700,
        }}>Contact Support →</a>
      </div>
    )
  }

  if (!ready) return (
    <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid color-mix(in srgb, var(--theme-gold) 15%, transparent)', borderTop: '2px solid var(--theme-gold)', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#3A3A37' }}>Loading</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )

  const sidebarWidth = 228
  const isPaused = invoiceStatus === 'paused'

  return (
    <DashboardProvider>
      <style>{`@keyframes pulse-dot { 0%,100% { opacity:1; } 50% { opacity:0.3; } } @keyframes slideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--theme-bg)' }}>
        <Sidebar activeSessions={0} />

        <main style={{
          flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto',
          paddingBottom: isMobile ? 64 : 0,
        }}>
          {children}

          {/* ── PAUSED OVERLAY — FULL-SCREEN LOCK ── */}
          {isPaused && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 10000, background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'slideUp 0.3s ease-out',
            }}>
              <div style={{
                width: '100%', maxWidth: isMobile ? '100%' : 480,
                maxHeight: '90vh', overflowY: 'auto',
                background: '#0D0D0B', border: isMobile ? 'none' : '1px solid rgba(229,112,122,0.25)',
                borderRadius: isMobile ? 0 : 14,
                padding: isMobile ? 20 : 32,
                fontFamily: 'Inter, sans-serif',
              }}>
                {/* ── Header with pulsing dot ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%', background: '#E5707A',
                    display: 'inline-block', animation: 'pulse-dot 1.5s ease-in-out infinite',
                    boxShadow: '0 0 8px rgba(229,112,122,0.5)',
                  }} />
                  <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 22, fontWeight: 700, color: '#EDEBE6' }}>Account Paused</span>
                </div>
                <div style={{ fontSize: 13, color: '#6B6964', marginBottom: 24, marginLeft: 20 }}>
                  Your subscription payment is overdue. Reactivate by paying below.
                </div>

                {/* ── Info grid ── */}
                <div style={{
                  background: '#161614', borderRadius: 10, padding: '16px 20px', marginBottom: 20,
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 0',
                }}>
                  <div><div style={{ fontSize: 10, color: '#6B6964', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Amount Due</div><div style={{ fontFamily: '"DM Mono", monospace', fontSize: 22, fontWeight: 500, color: 'var(--theme-gold)' }}>KES {feeDue.toLocaleString()}</div></div>
                   <div style={{ textAlign: 'right' }}><div style={{ fontSize: 10, color: '#6B6964', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Due Date</div><div style={{ fontFamily: '"DM Mono", monospace', fontSize: 14, color: '#EDEBE6' }}>{formatDate(nextInvoiceDate)}</div></div>
                   <div><div style={{ fontSize: 10, color: '#6B6964', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Paused Since</div><div style={{ fontFamily: '"DM Mono", monospace', fontSize: 14, color: '#EDEBE6' }}>{formatDate(lastPaidDate)}</div></div>
                </div>

                {/* ── M-Pesa Paybill card ── */}
                <div style={{ background: '#000', border: '0.5px solid #2A2A27', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#6B6964', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>M-Pesa Paybill</div>
                      <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 26, fontWeight: 600, color: '#EDEBE6', letterSpacing: 1 }}>247247</div>
                      <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 12, color: '#8C8A84', marginTop: 2 }}>Account: {ispName || '—'}</div>
                    </div>
                    <button onClick={doCopy} style={{
                      width: 40, height: 40, borderRadius: 8, border: '0.5px solid #2A2A27',
                      background: copied ? 'rgba(34,197,94,0.15)' : '#111110',
                      color: copied ? '#22c55e' : '#8C8A84', cursor: 'pointer', fontSize: 16,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}>{copied ? '✓' : '📋'}</button>
                  </div>
                </div>

                {/* ── STK Push steps ── */}
                <div style={{ fontSize: 11, color: '#6B6964', marginBottom: 16, lineHeight: 1.8, padding: '0 2px' }}>
                  <strong style={{ color: '#8C8A84' }}>To pay via M-Pesa:</strong><br />
                  1. Go to M-Pesa → Lipa na M-Pesa → Paybill<br />
                  2. Enter Business Number: <strong style={{ color: '#EDEBE6' }}>247247</strong><br />
                  3. Account: <strong style={{ color: '#EDEBE6' }}>{ispName || 'Your account'}</strong><br />
                  4. Enter amount: <strong style={{ color: 'var(--theme-gold)' }}>KES {feeDue.toLocaleString()}</strong><br />
                  5. Enter your M-Pesa PIN and confirm
                </div>

                {/* ── Pay Now section ── */}
                {stkState === 'idle' && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: '#8C8A84', marginBottom: 6 }}>Or pay directly via STK Push:</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        placeholder="M-Pesa phone number (e.g. 0712345678)"
                        style={{
                          flex: 1, height: 40, borderRadius: 8, border: '0.5px solid #2A2A27',
                          background: '#000', color: '#EDEBE6', padding: '0 12px',
                          fontFamily: '"DM Mono", monospace', fontSize: 13, outline: 'none',
                        }}
                      />
                      <button onClick={doStkPush} style={{
                        height: 40, padding: '0 20px', borderRadius: 8, border: 'none',
                        background: 'var(--theme-gold)', color: '#3D2A06', fontWeight: 700,
                        fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}>Pay Now</button>
                    </div>
                  </div>
                )}

                {stkState === 'sending' && (
                  <div style={{ textAlign: 'center', padding: '16px 0', marginBottom: 16 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid color-mix(in srgb, var(--theme-gold) 30%, transparent)', borderTop: '2px solid var(--theme-gold)', margin: '0 auto 10px', animation: 'spin 1s linear infinite' }} />
                    <div style={{ fontSize: 13, color: '#8C8A84' }}>Sending STK Push to your phone...</div>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                )}

                {(stkState === 'sent' || stkState === 'completed' || stkState === 'failed') && (
                  <div style={{
                    background: stkState === 'completed' ? 'rgba(34,197,94,0.08)' : stkState === 'failed' ? 'rgba(229,112,122,0.08)' : 'color-mix(in srgb, var(--theme-gold) 8%, transparent)',
                    borderRadius: 8, padding: '12px 16px', marginBottom: 16,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: stkState === 'completed' ? '#22c55e' : stkState === 'failed' ? '#E5707A' : 'var(--theme-gold)',
                        display: 'inline-block',
                      }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: stkState === 'completed' ? '#22c55e' : stkState === 'failed' ? '#E5707A' : 'var(--theme-gold)' }}>
                        {stkState === 'completed' ? 'Payment Confirmed' : stkState === 'failed' ? 'Payment Failed' : 'STK Push Sent'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#8C8A84' }}>{stkMessage}</div>
                    {stkState === 'sent' && (
                      <div style={{ fontSize: 11, color: '#6B6964', marginTop: 6 }}>
                        Waiting for payment confirmation{stkTimerCount > 0 && ` · Resend in ${stkTimerCount}s`}
                        {stkTimerCount === 0 && (
                          <button onClick={resetStk} style={{
                            background: 'none', border: 'none', color: 'var(--theme-gold)', cursor: 'pointer',
                            fontFamily: 'Inter, sans-serif', fontSize: 11, textDecoration: 'underline',
                            marginLeft: 8,
                          }}>Resend</button>
                        )}
                      </div>
                    )}
                    {stkState === 'failed' && (
                      <button onClick={resetStk} style={{
                        marginTop: 8, background: 'none', border: '0.5px solid #2A2A27', borderRadius: 6,
                        padding: '6px 14px', color: '#EDEBE6', cursor: 'pointer', fontSize: 12,
                        fontFamily: 'Inter, sans-serif',
                      }}>Try again</button>
                    )}
                    {stkState === 'completed' && (
                      <button onClick={() => window.location.reload()} style={{
                        marginTop: 8, background: '#22c55e', color: '#000', border: 'none', borderRadius: 6,
                        padding: '6px 14px', fontWeight: 600, cursor: 'pointer', fontSize: 12,
                        fontFamily: 'Inter, sans-serif',
                      }}>Reload dashboard</button>
                    )}
                  </div>
                )}

                {/* ── "I've paid" notify support ── */}
                {!notifyDone && (
                  <div style={{ marginBottom: 12 }}>
                    {!showNotifyForm ? (
                      <button onClick={() => setShowNotifyForm(true)} style={{
                        width: '100%', height: 38, borderRadius: 8, border: '0.5px solid #2A2A27',
                        background: '#111110', color: '#8C8A84', cursor: 'pointer', fontSize: 12,
                        fontFamily: 'Inter, sans-serif',
                      }}>I've paid, notify support</button>
                    ) : (
                      <div style={{ background: '#111110', borderRadius: 8, padding: 14 }}>
                        <div style={{ fontSize: 11, color: '#8C8A84', marginBottom: 10 }}>Notify support of your payment</div>
                        <input value={notifyTxCode} onChange={e => setNotifyTxCode(e.target.value)} placeholder="M-Pesa transaction code" style={{
                          width: '100%', height: 34, borderRadius: 6, border: '0.5px solid #2A2A27',
                          background: '#000', color: '#EDEBE6', padding: '0 10px', fontSize: 12, outline: 'none',
                          fontFamily: '"DM Mono", monospace', marginBottom: 6,
                        }} />
                        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                          <input value={notifyAmount} onChange={e => setNotifyAmount(e.target.value)} placeholder="Amount paid" style={{
                            flex: 1, height: 34, borderRadius: 6, border: '0.5px solid #2A2A27',
                            background: '#000', color: '#EDEBE6', padding: '0 10px', fontSize: 12, outline: 'none',
                            fontFamily: '"DM Mono", monospace',
                          }} />
                        </div>
                        <textarea value={notifyNotes} onChange={e => setNotifyNotes(e.target.value)} placeholder="Optional note" rows={2} style={{
                          width: '100%', borderRadius: 6, border: '0.5px solid #2A2A27',
                          background: '#000', color: '#EDEBE6', padding: '8px 10px', fontSize: 12, outline: 'none',
                          fontFamily: 'Inter, sans-serif', resize: 'none', marginBottom: 8,
                        }} />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setShowNotifyForm(false)} style={{
                            height: 32, padding: '0 12px', borderRadius: 6, border: '0.5px solid #2A2A27',
                            background: 'transparent', color: '#6B6964', cursor: 'pointer', fontSize: 12,
                            fontFamily: 'Inter, sans-serif',
                          }}>Cancel</button>
                          <button onClick={submitNotify} disabled={!notifyTxCode.trim() || notifySubmitting} style={{
                            flex: 1, height: 32, borderRadius: 6, border: 'none',
                            background: notifyTxCode.trim() && !notifySubmitting ? 'var(--theme-gold)' : '#2A2A27',
                            color: notifyTxCode.trim() && !notifySubmitting ? '#3D2A06' : '#6B6964',
                            fontWeight: 600, cursor: notifyTxCode.trim() && !notifySubmitting ? 'pointer' : 'not-allowed',
                            fontSize: 12, fontFamily: 'Inter, sans-serif',
                          }}>{notifySubmitting ? 'Sending...' : 'Submit'}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {notifyDone && (
                  <div style={{ background: 'color-mix(in srgb, var(--theme-gold) 8%, transparent)', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--theme-gold)' }}>✓ Support notified — we'll verify within a few hours.</div>
                  </div>
                )}

                {/* ── Contact support ── */}
                <a href={`mailto:support@honestbill.co.ke?subject=Account reactivation request — ${ispName}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  width: '100%', height: 40, borderRadius: 8,
                  background: 'var(--theme-gold)', color: '#3D2A06', fontWeight: 700,
                  fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, cursor: 'pointer',
                  textDecoration: 'none', border: 'none',
                }}>Contact support →</a>
              </div>
            </div>
          )}
        </main>
      </div>
      <Suspense fallback={null}>
        <DashboardToast />
      </Suspense>
      {isMobile && (
        <MobileTabBar />
      )}
    </DashboardProvider>
  )
}
