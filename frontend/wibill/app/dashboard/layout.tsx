'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'
import { DashboardProvider } from '@/context/DashboardContext'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!token) router.push('/login')
    else setReady(true)
  }, [token])

  if (!ready) return (
    <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#222' }}>Loading WiBill...</div>
    </div>
  )

  return (
    <DashboardProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#030303' }}>
        <Sidebar activeSessions={0} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>{children}</main>
      </div>
    </DashboardProvider>
  )
}