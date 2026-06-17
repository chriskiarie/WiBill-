'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'
import { DashboardProvider } from '@/context/DashboardContext'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token, hydrated } = useAuth()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [suspended, setSuspended] = useState(false)
  const [paused, setPaused] = useState(false)
  const [overdue, setOverdue] = useState(false)

  useEffect(() => {
    if (!token && hydrated) {
      router.push('/login')
      return
    }
    if (!token) return

    const checkStatus = async () => {
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
          if (body.detail === 'account_paused') {
            setPaused(true)
            return
          }
        }
        if (r.ok) {
          const body = await r.json()
          if (body.invoice_status === 'overdue') setOverdue(true)
        }
      } catch {}
    }

    checkStatus().then(() => {
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
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#E8B84B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3D2A06" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><path d="M12 20h.01"/></svg>
          </div>
          <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 20, fontWeight: 700, color: '#EDEBE6' }}>WiBill</span>
        </div>
        <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 28, fontWeight: 700, color: '#E5707A', margin: '0 0 12px' }}>Account Suspended</h1>
        <p style={{ fontSize: 14, color: '#8C8A84', margin: '0 0 32px', maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
          Your account has been suspended by WiBill. Please contact support to resolve this.
        </p>
        <a
          href="mailto:support@honestbill.co.ke"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 8,
            border: `1px solid #E8B84B`, background: 'transparent',
            color: '#E8B84B', textDecoration: 'none',
            fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 700,
          }}
        >
          Contact Support →
        </a>
      </div>
    )
  }

  if (paused) {
    return (
      <div style={{
        minHeight: '100vh', background: '#000', color: '#EDEBE6',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, sans-serif', padding: 40,
      }}>
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#E8B84B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3D2A06" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><path d="M12 20h.01"/></svg>
          </div>
          <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 20, fontWeight: 700, color: '#EDEBE6' }}>WiBill</span>
        </div>
        <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 28, fontWeight: 700, color: '#E8B84B', margin: '0 0 12px' }}>Account Paused</h1>
        <p style={{ fontSize: 14, color: '#8C8A84', margin: '0 0 32px', maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
          Your WiBill subscription payment is required to continue using the dashboard. Please contact support to resolve this.
        </p>
        <a
          href="mailto:support@honestbill.co.ke"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 8,
            border: `1px solid #E8B84B`, background: 'transparent',
            color: '#E8B84B', textDecoration: 'none',
            fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 700,
          }}
        >
          Contact Support →
        </a>
      </div>
    )
  }

  if (!ready) return (
    <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#222' }}>Loading WiBill...</div>
    </div>
  )

  return (
    <DashboardProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#030303', position: 'relative' }}>
        {overdue && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
            background: '#E8B84B', color: '#3D2A06',
            padding: '10px 20px', textAlign: 'center',
            fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span>⚠ Your WiBill subscription payment is overdue. Your account will be paused soon.</span>
            <a href="mailto:support@honestbill.co.ke" style={{ color: '#3D2A06', textDecoration: 'underline', fontWeight: 700, marginLeft: 4 }}>Contact us →</a>
          </div>
        )}
        <Sidebar activeSessions={0} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: overdue ? 40 : 0 }}>{children}</main>
      </div>
    </DashboardProvider>
  )
}
