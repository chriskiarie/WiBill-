'use client'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { Settings, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  title: string
  subsection?: string
  networkUp?: boolean
}

const C = {
  bg: '#0B0B0A',
  border: '#1E1E1B',
  text: '#EDEBE6',
  dim: '#6B6964',
  divider: '#1E1E1B',
  green: '#6FCF73',
  red: '#E5707A',
  gold: '#E8B84B',
  goldText: '#3D2A06',
}

export default function Topbar({ title, subsection, networkUp = true }: Props) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [clock, setClock] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const initials = user?.tenant_name
    ? user.tenant_name.split(/\s+/).map((s: string) => s[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || 'IS'

  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, '0')
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const tick = () => {
      const d = new Date()
      setClock(`${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`)
    }
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header style={{
      height: 56, minHeight: 56, background: C.bg,
      borderBottom: `0.5px solid ${C.border}`,
      display: 'flex', alignItems: 'center', padding: '0 24px',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      {/* Left zone */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif", fontSize: 20,
          fontWeight: 600, color: C.text, letterSpacing: '-0.3px',
        }}>
          {title}
        </span>
        {subsection && (
          <>
            <span style={{ color: C.dim, fontFamily: 'Inter, sans-serif', fontSize: 13 }}>·</span>
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: 13,
              fontWeight: 400, color: C.dim,
            }}>
              {subsection}
            </span>
          </>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Right zone */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* Clock */}
        <div style={{
          padding: '0 16px',
          fontFamily: "'DM Mono', monospace", fontSize: 12,
          color: C.dim, whiteSpace: 'nowrap',
        }}>
          {clock}
        </div>

        <div style={{ width: 1, height: 24, background: C.divider }} />

        {/* Network status pill */}
        <div style={{
          padding: '0 16px', display: 'flex', alignItems: 'center',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#161614', borderRadius: 6, padding: '5px 10px',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: networkUp ? C.green : C.red,
              boxShadow: networkUp ? '0 0 6px rgba(111,207,115,0.5)' : 'none',
              display: 'inline-block',
            }} />
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: 11,
              fontWeight: 400, color: networkUp ? C.green : C.red,
            }}>
              {networkUp ? 'Network UP' : 'Router offline'}
            </span>
          </div>
        </div>

        <div style={{ width: 1, height: 24, background: C.divider }} />

        {/* Tenant avatar */}
        <div ref={dropdownRef} style={{ position: 'relative', padding: '0 16px' }}>
          <div
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: C.gold, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer',
              fontFamily: "'DM Mono', monospace", fontSize: 13,
              fontWeight: 500, color: C.goldText,
              userSelect: 'none',
            }}>
            {initials}
          </div>

          {showDropdown && (
            <div style={{
              position: 'absolute', top: 40, right: 16, minWidth: 150,
              background: '#111110', border: '0.5px solid #1E1E1B',
              borderRadius: 8, overflow: 'hidden', zIndex: 20,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              <div
                onClick={() => { router.push('/dashboard/settings'); setShowDropdown(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', cursor: 'pointer', fontSize: 12,
                  color: C.text, fontFamily: 'Inter, sans-serif',
                  borderBottom: '0.5px solid #1E1E1B',
                }}>
                <Settings size={14} color={C.dim} />
                Settings
              </div>
              <div
                onClick={() => { logout(); setShowDropdown(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', cursor: 'pointer', fontSize: 12,
                  color: '#E5707A', fontFamily: 'Inter, sans-serif',
                }}>
                <LogOut size={14} color="#E5707A" />
                Sign out
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
