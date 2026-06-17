'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'
import { DashboardProvider } from '@/context/DashboardContext'

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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token, hydrated } = useAuth()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [suspended, setSuspended] = useState(false)
  const [invoiceStatus, setInvoiceStatus] = useState<string>('active')
  const [feeDue, setFeeDue] = useState<number>(0)
  const [ispName, setIspName] = useState('')

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

  if (suspended) {
    return (
      <div style={{
        minHeight: '100vh', background: '#000', color: '#EDEBE6',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, sans-serif', padding: 40,
      }}>
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 26, fontWeight: 700 }}>
            <span style={{ color: '#E8B84B' }}>X</span>
            <span style={{ color: '#EDEBE6' }}>w</span>
            <span style={{ color: '#E8B84B' }}>B</span>
          </span>
        </div>
        <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 28, fontWeight: 700, color: '#E5707A', margin: '0 0 12px' }}>Account Suspended</h1>
        <p style={{ fontSize: 14, color: '#8C8A84', margin: '0 0 32px', maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
          Your account has been suspended. Please contact support to resolve this.
        </p>
        <a href="mailto:support@honestbill.co.ke" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 8,
          border: '1px solid #E8B84B', background: 'transparent', color: '#E8B84B', textDecoration: 'none',
          fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 700,
        }}>Contact Support →</a>
      </div>
    )
  }

  if (!ready) return (
    <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 90, height: 90, margin: '0 auto 24px' }}>
          <style>{`@keyframes orb { from { transform: rotate(0deg) translateX(38px) rotate(0deg); } to { transform: rotate(360deg) translateX(38px) rotate(-360deg); } }`}</style>
          <span style={{ position: 'absolute', top: '50%', left: '50%', width: 24, height: 24, margin: -12, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 20, textAlign: 'center', lineHeight: '24px', animation: 'orb 3s linear infinite', animationDelay: '0s', color: '#E8B84B' }}>X</span>
          <span style={{ position: 'absolute', top: '50%', left: '50%', width: 24, height: 24, margin: -12, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 20, textAlign: 'center', lineHeight: '24px', animation: 'orb 3s linear infinite', animationDelay: '-1s', color: '#EDEBE6' }}>w</span>
          <span style={{ position: 'absolute', top: '50%', left: '50%', width: 24, height: 24, margin: -12, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 20, textAlign: 'center', lineHeight: '24px', animation: 'orb 3s linear infinite', animationDelay: '-2s', color: '#E8B84B' }}>B</span>
        </div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#6B6964' }}>Preparing your space</div>
      </div>
    </div>
  )

  const sidebarWidth = 228
  const isPaused = invoiceStatus === 'paused'
  const isOverdue = invoiceStatus === 'overdue'

  return (
    <DashboardProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#030303' }}>
        <Sidebar activeSessions={0} />

        <main style={{
          flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          paddingTop: isOverdue ? 48 : 0,
        }}>
          {/* ── OVERDUE BANNER ── */}
          {isOverdue && (
            <div style={{
              position: 'fixed', top: 0, left: sidebarWidth, right: 0, zIndex: 9999,
              height: 48, background: 'rgba(232,184,75,0.08)',
              borderBottom: '1px solid rgba(232,184,75,0.25)',
              display: 'flex', alignItems: 'center', padding: '0 24px', gap: 6,
              fontFamily: 'Inter, sans-serif',
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#E8B84B' }}>⚠ Invoice overdue</span>
              <span style={{ fontSize: 12, color: '#6B6964' }}>
                · Payment of KES {feeDue.toLocaleString()} was due · 
              </span>
              <button onClick={() => { /* future: open payment modal */ }} style={{
                background: '#E8B84B', color: '#3D2A06', border: 'none', borderRadius: 6,
                padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>Pay now →</button>
              <a href="mailto:support@honestbill.co.ke" style={{
                fontSize: 11, color: '#6B6964', textDecoration: 'none', marginLeft: 8,
              }} onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                 onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>Contact support</a>
            </div>
          )}

          {children}

          {/* ── PAUSED OVERLAY ── */}
          {isPaused && (
            <div style={{
              position: 'fixed', top: 48, left: sidebarWidth, right: 0, bottom: 0,
              zIndex: 9990, background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 440, background: '#0D0D0B',
                border: '1px solid rgba(229,112,122,0.3)', borderRadius: 12, padding: 32,
                fontFamily: 'Inter, sans-serif',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E5707A', display: 'inline-block' }} />
                  <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 20, fontWeight: 600, color: '#EDEBE6' }}>Account Paused</span>
                </div>
                <div style={{ fontSize: 13, color: '#6B6964', marginBottom: 16 }}>Your subscription payment is overdue.</div>

                <div style={{ background: '#161614', borderRadius: 8, padding: '14px 16px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div><div style={{ fontSize: 12, color: '#8C8A84' }}>Amount due</div><div style={{ fontFamily: '"DM Mono", monospace', fontSize: 20, fontWeight: 500, color: '#E5707A' }}>KES {feeDue.toLocaleString()}</div></div>
                    <div style={{ textAlign: 'right' }}><div style={{ fontSize: 12, color: '#8C8A84' }}>Due date</div><div style={{ fontFamily: '"DM Mono", monospace', fontSize: 13, color: '#EDEBE6' }}>{new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div><div style={{ fontSize: 12, color: '#8C8A84' }}>Days overdue</div><div style={{ fontFamily: '"DM Mono", monospace', fontSize: 13, color: '#E5707A' }}>—</div></div>
                    <div style={{ textAlign: 'right' }}><div style={{ fontSize: 12, color: '#8C8A84' }}>Paused since</div><div style={{ fontFamily: '"DM Mono", monospace', fontSize: 13, color: '#EDEBE6' }}>{new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div>
                  </div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, color: '#6B6964', marginBottom: 8 }}>To reactivate your account, send payment to:</div>
                  <div style={{ background: '#000', border: '0.5px solid #2A2A27', borderRadius: 8, padding: '12px 16px' }}>
                    <div style={{ fontSize: 11, color: '#6B6964', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>M-Pesa Paybill</div>
                    <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 18, fontWeight: 500, color: '#EDEBE6' }}>247247</div>
                    <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 12, color: '#8C8A84', marginTop: 4 }}>Account: {ispName || '—'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                  <button onClick={() => { /* notify support */ }} style={{
                    flex: 1, background: 'none', border: '1px solid #2A2A27', color: '#8C8A84',
                    borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                  }}>I've paid, notify support</button>
                  <a href={`mailto:support@honestbill.co.ke?subject=Account reactivation request — ${ispName}`} style={{
                    flex: 1, background: '#E8B84B', color: '#3D2A06', border: 'none', borderRadius: 8,
                    padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Inter, sans-serif',
                  }}>Contact support</a>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <Suspense fallback={null}>
        <DashboardToast />
      </Suspense>
    </DashboardProvider>
  )
}
