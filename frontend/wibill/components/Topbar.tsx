'use client'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { usePathname } from 'next/navigation'
import { Settings, LogOut, Sun, Moon, Wifi, Router, Globe, Monitor, Satellite, Check, Pencil } from 'lucide-react'

interface Props {
  title: string
  subsection?: string
  networkUp?: boolean
}

const pageStyles: Record<string, { gradient: string; icon: string }> = {
  '/dashboard':          { gradient: 'linear-gradient(135deg, #E8B84B 0%, #f5c563 100%)', icon: '◆' },
  '/dashboard/analytics':{ gradient: 'linear-gradient(135deg, #E8B84B 0%, #22c55e 100%)', icon: '◈' },
  '/dashboard/sessions': { gradient: 'linear-gradient(135deg, #22c55e 0%, #6FCF73 100%)', icon: '●' },
  '/dashboard/transactions':{gradient:'linear-gradient(135deg, #6FCF73 0%, #E8B84B 100%)', icon: '◉'},
  '/dashboard/packages': { gradient: 'linear-gradient(135deg, #E8B84B 0%, #f5c563 100%)', icon: '◆' },
  '/dashboard/mikrotik': { gradient: 'linear-gradient(135deg, #6FCF73 0%, #22c55e 100%)', icon: '◈' },
  '/dashboard/mpesa':    { gradient: 'linear-gradient(135deg, #E8B84B 0%, #22c55e 100%)', icon: '◉' },
  '/dashboard/settings': { gradient: 'linear-gradient(135deg, #888 0%, #f0f0f0 100%)', icon: '◆' },
  '/dashboard/network':  { gradient: 'linear-gradient(135deg, #22c55e 0%, #6FCF73 100%)', icon: '●' },
  '/dashboard/vouchers': { gradient: 'linear-gradient(135deg, #E8B84B 0%, #f5c563 100%)', icon: '◆' },
  '/dashboard/campaigns':{ gradient: 'linear-gradient(135deg, #f5c563 0%, #E8B84B 100%)', icon: '★' },
  '/dashboard/loyalty':  { gradient: 'linear-gradient(135deg, #E8B84B 0%, #22c55e 100%)', icon: '◆' },
  '/dashboard/notifications':{gradient:'linear-gradient(135deg, #E8B84B 0%, #f5c563 100%)',icon:'◈'},
  '/dashboard/portal-preview':{gradient:'linear-gradient(135deg, #6FCF73 0%, #22c55e 100%)',icon:'●'},
  '/dashboard/billing':  { gradient: 'linear-gradient(135deg, #E8B84B 0%, #22c55e 100%)', icon: '◉' },
  '/dashboard/hotspots': { gradient: 'linear-gradient(135deg, #f5c563 0%, #E8B84B 100%)', icon: '◆' },
}

const avatars = [
  { icon: Wifi, label: 'Signal', color: '#E8B84B' },
  { icon: Router, label: 'Router', color: '#22c55e' },
  { icon: Globe, label: 'Global', color: '#3b82f6' },
  { icon: Monitor, label: 'Monitor', color: '#a855f7' },
  { icon: Satellite, label: 'Satellite', color: '#f59e0b' },
]

export default function Topbar({ title, subsection, networkUp = true }: Props) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [clock, setClock] = useState('')
  const [prevClock, setPrevClock] = useState('')
  const [flipping, setFlipping] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [dark, setDark] = useState(true)
  const [animToggle, setAnimToggle] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState('0')
  const [displayName, setDisplayName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('wb_theme')
    if (saved === 'light' || saved === 'dark') setDark(saved === 'dark')
    setSelectedAvatar(localStorage.getItem('wb_avatar') || '0')
    const stored = localStorage.getItem('wb_display_name')
    if (stored) setDisplayName(stored)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('wb_theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    if (!displayName && user?.tenant_name) {
      setDisplayName(user.tenant_name)
      setNameDraft(user.tenant_name)
    }
  }, [user, displayName])

  const displayLabel = displayName || user?.tenant_name || user?.email?.split('@')[0] || 'ISP'
  const initials = displayLabel.split(/\s+/).map((s: string) => s[0]).join('').slice(0, 2).toUpperCase()

  const avatarIdx = Math.min(Math.max(parseInt(selectedAvatar) || 0, 0), avatars.length - 1)
  const AvatarIcon = avatars[avatarIdx].icon
  const avatarColor = avatars[avatarIdx].color

  const pad = (n: number) => String(n).padStart(2, '0')

  useEffect(() => {
    const tick = () => {
      const d = new Date()
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const t = `${pad(d.getHours())}:${pad(d.getMinutes())}`
      setClock(prev => {
        if (prev && prev !== t) {
          setPrevClock(prev)
          setFlipping(true)
          setTimeout(() => setFlipping(false), 400)
        }
        return t
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [pad])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
        setEditingName(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (editingName && nameInputRef.current) nameInputRef.current.focus()
  }, [editingName])

  const handleThemeToggle = () => {
    setAnimToggle(true)
    setDark(!dark)
    setTimeout(() => setAnimToggle(false), 400)
  }

  const currentPage = Object.keys(pageStyles).find(p => pathname.startsWith(p)) || '/dashboard'
  const style = pageStyles[currentPage]

  const saveName = () => {
    const trimmed = nameDraft.trim()
    if (trimmed) {
      setDisplayName(trimmed)
      localStorage.setItem('wb_display_name', trimmed)
    }
    setEditingName(false)
  }

  return (
    <header
      className="topbar"
      style={{
        height: 56, minHeight: 56,
        borderBottom: '1px solid var(--topbar-border)',
        display: 'flex', alignItems: 'center', padding: '0 24px',
        position: 'sticky', top: 0, zIndex: 10,
      }}
    >
      {/* ── Title zone (absolutely centered via left-offset) ── */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <h1
          className="page-title"
          style={{
            fontFamily: "'Syne', sans-serif", fontSize: 25, fontWeight: 700,
            background: style.gradient, WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            margin: 0, letterSpacing: '-0.4px',
          }}
        >
          {title}
        </h1>
        {subsection && (
          <span style={{
            fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 400,
            color: 'var(--topbar-dim)', marginLeft: 10, opacity: 0.6,
          }}>
            {subsection}
          </span>
        )}
      </div>

      {/* ── Right zone ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Flip clock */}
        <div className={`flip-clock${flipping ? ' flip' : ''}`} style={{
          fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 500,
          color: 'var(--topbar-text)', letterSpacing: '0.04em',
          padding: '4px 10px', border: '1px solid var(--theme-border)',
          borderRadius: 6, background: 'var(--topbar-pill-bg)',
          perspective: 400, transformStyle: 'preserve-3d',
          transition: 'transform 0.25s ease',
        }}>
          {clock || '--:--'}
        </div>

        <div className="topbar-divider" />

        {/* Network status pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--topbar-pill-bg)', borderRadius: 6, padding: '5px 10px',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: networkUp ? '#22c55e' : '#ef4444',
            display: 'inline-block',
          }} />
          <span style={{
            fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 400,
            color: networkUp ? '#22c55e' : '#ef4444',
          }}>
            {networkUp ? 'Live' : 'Offline'}
          </span>
        </div>

        <div className="topbar-divider" />

        {/* Theme toggle */}
        <button
          onClick={handleThemeToggle}
          title={dark ? 'Light mode' : 'Dark mode'}
          className={`theme-toggle${animToggle ? ' toggle-anim' : ''}`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 6,
            border: 'none', background: 'transparent',
            color: 'var(--topbar-dim)', cursor: 'pointer',
          }}
        >
          {dark ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <div className="topbar-divider" />

        {/* Profile avatar + dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div
            onClick={() => setShowDropdown(!showDropdown)}
            className="topbar-avatar"
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: avatarColor, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer',
              userSelect: 'none',
            }}>
            <AvatarIcon size={16} color="#000" />
          </div>

          {showDropdown && (
            <div className="profile-dropdown">
              {/* Avatar selection */}
              <div style={{
                padding: '14px 16px 10px', borderBottom: '1px solid var(--topbar-border)',
              }}>
                <div style={{
                  fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: 'var(--topbar-dim)', marginBottom: 10,
                }}>Avatar</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {avatars.map((a, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setSelectedAvatar(String(i))
                        localStorage.setItem('wb_avatar', String(i))
                      }}
                      style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: a.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', opacity: selectedAvatar === String(i) ? 1 : 0.35,
                        outline: selectedAvatar === String(i) ? `2px solid ${a.color}` : 'none',
                        outlineOffset: 2,
                        transition: 'opacity 0.15s, outline 0.15s',
                      }}
                      title={a.label}
                    >
                      <a.icon size={16} color="#000" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Display name */}
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--topbar-border)' }}>
                <div style={{
                  fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: 'var(--topbar-dim)', marginBottom: 6,
                }}>Display name</div>
                {editingName ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      ref={nameInputRef}
                      value={nameDraft}
                      onChange={e => setNameDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                      style={{
                        flex: 1, height: 30, borderRadius: 6,
                        border: '1px solid var(--topbar-border)',
                        background: 'var(--topbar-bg)', color: 'var(--topbar-text)',
                        padding: '0 8px', fontSize: 12, outline: 'none',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    />
                    <button onClick={saveName} style={{
                      height: 30, width: 30, borderRadius: 6, border: 'none',
                      background: '#E8B84B', color: '#000', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={12} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontFamily: 'Inter, sans-serif', fontSize: 13,
                      fontWeight: 500, color: 'var(--topbar-text)',
                    }}>
                      {displayLabel}
                    </span>
                    <button onClick={() => { setNameDraft(displayLabel); setEditingName(true) }} style={{
                      background: 'none', border: 'none', color: 'var(--topbar-dim)',
                      cursor: 'pointer', padding: 2, display: 'flex',
                    }}>
                      <Pencil size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Menu items */}
              <div
                onClick={() => { window.location.href = '/dashboard/settings' }}
                className="dropdown-item"
              >
                <Settings size={14} />
                Settings
              </div>
              <div
                onClick={() => { logout() }}
                className="dropdown-item"
                style={{ color: '#ef4444' }}
              >
                <LogOut size={14} />
                Sign out
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
