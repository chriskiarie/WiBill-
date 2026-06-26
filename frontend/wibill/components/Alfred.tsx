'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Message { role: 'user' | 'assistant'; content: string; ts?: string }
type Mode = 'orb' | 'compact' | 'expanded'

const PAGE_LABELS: Record<string, string> = {
  '/admin': 'Dashboard', '/admin/isps': 'ISP Network', '/admin/billing': 'Billing',
  '/admin/feature-flags': 'Feature Flags', '/admin/invoices': 'Invoices',
  '/admin/transactions': 'Transactions', '/admin/audit-log': 'Audit Log',
  '/admin/system': 'Settings', '/admin/comms': 'Comms',
}

const QUICK_PROMPTS: Record<string, string[]> = {
  '/admin':      ['Morning briefing', 'Revenue summary', 'Any issues?', 'Who to approve?', 'M-Pesa status'],
  '/admin/isps': ['Pending approvals', 'Who to approve?', 'Suspended ISPs', 'Recent signups'],
  '/admin/billing': ['Top earner', 'Overdue invoices', 'Monthly take rate', 'Commission breakdown'],
  '/admin/feature-flags': ['Premium ISPs', 'Upgrade candidates', 'Feature breakdown'],
  '/admin/invoices': ['Who is overdue?', 'Payment patterns', 'Pause recommendations'],
  '/admin/transactions': ['Failed transactions', 'Success rate', 'Unusual patterns'],
  '/admin/audit-log': ['Recent actions', 'Anything suspicious?', 'Admin activity'],
  '/admin/system': ['System health', 'M-Pesa status', 'Any misconfigs?'],
}

const CARD_W_COMPACT = 320
const CARD_W_EXPANDED = 360
const CARD_H_EXPANDED = 480

function findPageKey(path: string): string {
  return Object.keys(PAGE_LABELS).find(k => path.startsWith(k)) || '/admin'
}

function msgHasContent(m: Message) {
  const c = m.content.toLowerCase()
  return !c.includes('give me a one-sentence briefing')
}

export default function Alfred() {
  const pathname = usePathname()
  const { token } = useAuth()
  const pageKey = findPageKey(pathname)

  const [mode, setMode] = useState<Mode>('orb')
  const [pos, setPos] = useState(() => {
    try {
      const s = typeof window !== 'undefined' ? localStorage.getItem('alfred-position') : null
      if (s) return JSON.parse(s)
    } catch {}
    return { x: typeof window !== 'undefined' ? window.innerWidth - 56 - 28 : 1100, y: typeof window !== 'undefined' ? window.innerHeight - 56 - 32 : 700 }
  })
  const [cardSize, setCardSize] = useState<{ w: number; h: number }>({ w: CARD_W_EXPANDED, h: CARD_H_EXPANDED })
  const [context, setContext] = useState<any>(null)
  const [msgs, setMsgs] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [alerts, setAlerts] = useState<{ id: string; type: 'warning' | 'info'; text: string }[]>([])
  const [briefingDone, setBriefingDone] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const [errorPlaceholder, setErrorPlaceholder] = useState(false)
  const [hDismiss, setHDismiss] = useState<string | null>(null)

  const dragOff = useRef({ x: 0, y: 0 })
  const sizeStart = useRef({ w: 0, h: 0, x: 0, y: 0 })
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const lastPage = useRef(pathname)

  const isExpanded = mode === 'expanded'
  const cw = mode === 'compact' ? CARD_W_COMPACT : cardSize.w
  const ch = mode === 'compact' ? 0 : cardSize.h

  const positionCard = () => {
    const orbX = pos.x, orbY = pos.y
    return { left: Math.max(0, orbX + 28 - cw + 28), top: Math.max(0, orbY - ch - 12) }
  }

  const authToken = () => typeof window !== 'undefined' ? localStorage.getItem('wb_token') : null

  const handleAuthFail = useCallback(() => {
    localStorage.removeItem('wb_token')
    localStorage.removeItem('wb_user')
    localStorage.removeItem('wb_role')
    window.location.href = '/admin/login'
  }, [])

  const fetchContext = useCallback(async () => {
    const t = token || authToken()
    if (!t) return
    try {
      const r = await fetch(`${API}/api/admin/alfred/context`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (r.status === 401) { handleAuthFail(); return }
      const d = await r.json()
      setContext(d)
      const al: typeof alerts = []
      const overdue = d.platform?.isps?.overdue || []
      overdue.forEach((o: any) => al.push({ id: `ov-${o.name}`, type: 'warning' as const, text: `${o.name} ${o.status}` }))
      if (d.platform?.isps?.pending > 0) al.push({ id: 'pending', type: 'info' as const, text: `${d.platform.isps.pending} awaiting approval` })
      if (d.platform?.sessions?.active_now === 0 && d.platform?.isps?.active > 0) al.push({ id: 'no-sess', type: 'info' as const, text: 'No active sessions' })
      setAlerts(al)
    } catch {}
  }, [token, handleAuthFail])

  const send = async (content: string) => {
    const t = token || authToken()
    if (!context || !content.trim() || loading || !t) return
    const ts = new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
    const userMsg: Message = { role: 'user', content, ts }
    const next = [...msgs, userMsg]
    setMsgs(next)
    setInput('')
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/admin/alfred/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, context, page: pathname }),
      })
      if (r.status === 401) { handleAuthFail(); return }
      const d = await r.json()
      if (!r.ok) {
        setErrorPlaceholder(true)
        setTimeout(() => setErrorPlaceholder(false), 3000)
        setMsgs(prev => prev.filter(m => m !== userMsg))
      } else {
        const replyTs = new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
        setMsgs(p => [...p, { role: 'assistant', content: d.reply || 'Hmm.', ts: replyTs }])
      }
    } catch {
      setErrorPlaceholder(true)
      setTimeout(() => setErrorPlaceholder(false), 3000)
      setMsgs(prev => prev.filter(m => m !== userMsg))
    } finally {
      setLoading(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  useEffect(() => {
    fetchContext()
    const i = setInterval(fetchContext, 120000)
    return () => clearInterval(i)
  }, [fetchContext])

  // Auto-briefing on route change
  useEffect(() => {
    if (!context || !token) return
    if (lastPage.current !== pathname) {
      setMsgs([])
      setBriefingDone(false)
      lastPage.current = pathname
      setMode('compact')
    }
  }, [pathname, context, token])

  useEffect(() => {
    if (!context || !token || briefingDone || mode === 'orb') return
    const t = setTimeout(() => {
      send('Give me a one-sentence briefing for this page.')
      setBriefingDone(true)
    }, 2500)
    return () => clearTimeout(t)
  }, [context, pathname, mode, briefingDone, token])

  // Persist position
  useEffect(() => {
    if (!dragging) localStorage.setItem('alfred-position', JSON.stringify(pos))
  }, [pos, dragging])

  // ESC to collapse
  useEffect(() => {
    if (mode === 'orb') return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setMode('orb') }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [mode])

  // Click outside
  useEffect(() => {
    if (mode === 'orb') return
    const h = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) setMode('orb')
    }
    setTimeout(() => window.addEventListener('pointerdown', h), 0)
    return () => window.removeEventListener('pointerdown', h)
  }, [mode])

  // Orb drag
  const orbDragStart = (e: React.PointerEvent) => {
    e.preventDefault()
    dragOff.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    setDragging(true)
    const move = (ev: PointerEvent) => {
      setPos({
        x: Math.max(0, Math.min(ev.clientX - dragOff.current.x, window.innerWidth - 56)),
        y: Math.max(0, Math.min(ev.clientY - dragOff.current.y, window.innerHeight - 56)),
      })
    }
    const up = () => { setDragging(false); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // Card drag
  const cardDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.alf-no-drag')) return
    e.preventDefault()
    dragOff.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    setDragging(true)
    const move = (ev: PointerEvent) => {
      setPos({
        x: Math.max(0, Math.min(ev.clientX - dragOff.current.x, window.innerWidth - cw)),
        y: Math.max(0, Math.min(ev.clientY - dragOff.current.y, window.innerHeight - (ch || 200))),
      })
    }
    const up = () => { setDragging(false); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // Resize
  const resizeStart = (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation()
    sizeStart.current = { w: cardSize.w, h: cardSize.h, x: e.clientX, y: e.clientY }
    setResizing(true)
    const move = (ev: PointerEvent) => {
      setCardSize({
        w: Math.max(280, Math.min(500, sizeStart.current.w + (ev.clientX - sizeStart.current.x))),
        h: Math.max(300, Math.min(680, sizeStart.current.h + (ev.clientY - sizeStart.current.y))),
      })
    }
    const up = () => { setResizing(false); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const cardPos = positionCard()
  const lastAlfred = [...msgs].reverse().find(m => m.role === 'assistant' && msgHasContent(m))

  return (
    <>
      {/* ── ORB ── */}
      <div
        onPointerDown={orbDragStart}
        onClick={() => setMode(m => m === 'orb' ? 'compact' : 'orb')}
        onDoubleClick={() => setMode('expanded')}
        style={{
          position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
          width: 56, height: 56, borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 32%, rgba(30,24,4,0.95), rgba(4,4,3,0.98))',
          border: '1px solid rgba(232,184,75,0.38)',
          boxShadow: '0 0 0 1px rgba(232,184,75,0.06), 0 8px 32px rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'default', userSelect: 'none',
          transition: dragging ? 'none' : 'box-shadow 0.2s',
          animation: 'alfredOrbPulse 2.2s ease-in-out 2',
        }}
        onMouseEnter={e => { if (!dragging) { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 1px rgba(232,184,75,0.12), 0 12px 40px rgba(0,0,0,0.85)'; (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.06)' } }}
        onMouseLeave={e => { if (!dragging) { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 1px rgba(232,184,75,0.06), 0 8px 32px rgba(0,0,0,0.8)'; (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)' } }}
      >
        <span style={{ fontSize: 13, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, lineHeight: 1 }}>
          <span style={{ color: '#E8B84B' }}>X</span>
          <span style={{ color: '#C8C6C0', fontWeight: 300 }}>w</span>
          <span style={{ color: '#E8B84B' }}>B</span>
        </span>
        {alerts.length > 0 && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            width: 18, height: 18, borderRadius: '50%',
            background: '#C0392B',
            border: '1.5px solid #000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, color: '#fff', fontFamily: '"DM Mono", monospace', fontWeight: 600,
            animation: 'alertScale 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            {alerts.length}
          </div>
        )}
      </div>

      {/* ── CARD (compact / expanded) ── */}
      <div
        ref={cardRef}
        onPointerDown={cardDragStart}
        style={{
          position: 'fixed',
          left: cardPos.left,
          top: cardPos.top,
          zIndex: 9998,
          width: isExpanded ? cardSize.w : CARD_W_COMPACT,
          height: isExpanded ? cardSize.h : 'auto',
          minHeight: isExpanded ? 300 : 0,
          background: 'rgba(9,8,7,0.82)',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          borderRadius: 18,
          boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.025) inset',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          cursor: 'default',
          transform: mode === 'orb' ? 'scale(0.05)' : 'scale(1)',
          opacity: mode === 'orb' ? 0 : 1,
          pointerEvents: mode === 'orb' ? 'none' : 'all',
          transformOrigin: 'bottom right',
          transition: dragging || resizing ? 'none' : 'transform 0.38s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease, width 0.3s ease, height 0.3s ease',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Glass border overlay */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 18, pointerEvents: 'none', zIndex: 2,
          borderTop: '0.5px solid rgba(232,184,75,0.2)',
          borderLeft: '0.5px solid rgba(255,255,255,0.06)',
          borderBottom: '0.5px solid rgba(0,0,0,0.6)',
          borderRight: '0.5px solid rgba(0,0,0,0.4)',
        }} />

        {/* ── EXPANDED HEADER ── */}
        {isExpanded && (
          <div className="alf-no-drag" style={{
            height: 36, minHeight: 36, padding: '0 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 3,
            position: 'relative',
          }} onPointerDown={e => e.stopPropagation()}>
            <span style={{
              fontSize: 8, color: '#252520', textTransform: 'uppercase',
              letterSpacing: '0.12em', fontWeight: 600, fontFamily: 'Inter, sans-serif',
            }}>
              {PAGE_LABELS[pageKey] || 'Dashboard'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: context && (Date.now() - new Date(context.timestamp).getTime()) / 60000 < 2 ? '#6FCF73' : '#E8B84B',
                display: 'inline-block', flexShrink: 0,
              }} />
              <span style={{ fontSize: 8, color: '#252520', fontFamily: '"DM Mono", monospace' }}>
                {context ? new Date(context.timestamp).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
              <button onClick={fetchContext} style={{
                background: 'none', border: 'none', color: '#252520', cursor: 'pointer',
                fontSize: 10, padding: 0, lineHeight: 1,
              }}>↺</button>
            </div>
          </div>
        )}

        {/* ── COMPACT ZONE 1 — Alfred message ── */}
        {!isExpanded && (
          <div style={{ padding: '14px 16px 0', zIndex: 3, position: 'relative' }}>
            {lastAlfred ? (
              <div style={{
                borderLeft: '1.5px solid rgba(232,184,75,0.45)',
                paddingLeft: 11,
                fontSize: 12, lineHeight: 1.65, color: '#D4D4CC', fontStyle: 'italic',
                maxHeight: 60, overflow: 'hidden',
                maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
              }}>
                {lastAlfred.content}
              </div>
            ) : !isExpanded && <div style={{ height: 1 }} />}
          </div>
        )}

        {/* ── EXPANDED MESSAGE AREA ── */}
        {isExpanded && (
          <div className="alf-no-drag" style={{
            flex: 1, overflowY: 'auto', padding: '8px 14px',
            scrollbarWidth: 'none', zIndex: 3, position: 'relative',
          }} onPointerDown={e => e.stopPropagation()}>
            {msgs.length === 0 && !loading && (
              <div style={{ padding: '30px 0', textAlign: 'center', fontSize: 11, color: '#3A3A37', fontStyle: 'italic' }}>
                Ask Alfred something.
              </div>
            )}
            {msgs.map((m, i) => {
              const prevRole = i > 0 ? msgs[i - 1].role : null
              const showDivider = m.role === 'user' && prevRole === 'assistant'
              const isNew = i >= msgs.length - 2 && i === msgs.length - 1 && m.role === 'assistant'
              return (
                <div key={i}
                  style={{
                    animation: isNew && m.role === 'assistant' ? 'alfredSlideUp 0.4s ease-out' : 'none',
                  }}
                >
                  {showDivider && <div style={{ height: '0.5px', background: '#0E0E0C', margin: '3px 0' }} />}
                  {m.role === 'assistant' ? (
                    <div style={{
                      padding: '8px 0 8px 11px',
                      borderLeft: '1.5px solid rgba(232,184,75,0.4)',
                      fontSize: 12, color: '#D4D4CC', fontStyle: 'italic', lineHeight: 1.65,
                    }}>
                      <div>{m.content}</div>
                      {m.ts && <div style={{ fontSize: 8, color: '#1E1E1C', fontStyle: 'normal', textAlign: 'right', marginTop: 3, fontFamily: '"DM Mono", monospace' }}>{m.ts}</div>}
                    </div>
                  ) : (
                    <div style={{ padding: '6px 0', textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'rgba(232,184,75,0.75)', fontFamily: '"DM Mono", monospace' }}>
                        <span style={{ color: '#E8B84B' }}>› </span>{m.content}
                      </div>
                      {m.ts && <div style={{ fontSize: 8, color: '#1E1E1C', fontFamily: '"DM Mono", monospace', textAlign: 'left', marginTop: 2 }}>{m.ts}</div>}
                    </div>
                  )}
                </div>
              )
            })}
            {loading && (
              <div style={{
                padding: '8px 0 8px 11px',
                borderLeft: '1.5px solid rgba(232,184,75,0.4)',
                display: 'flex', gap: 3, alignItems: 'flex-end', height: 14,
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 1.5, background: 'rgba(232,184,75,0.6)', borderRadius: 1,
                    animation: 'alfredBar 0.9s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* ── EXPANDED QUICK PROMPTS ── */}
        {isExpanded && (
          <div className="alf-no-drag" style={{
            padding: '4px 14px 0', overflowX: 'auto', scrollbarWidth: 'none', zIndex: 3, position: 'relative',
            display: 'flex', gap: 4,
          }} onPointerDown={e => e.stopPropagation()}>
            {(QUICK_PROMPTS[pageKey] || ['Ask me anything']).map(p => (
              <button key={p} onClick={() => send(p)} disabled={loading} style={{
                background: '#121210', border: '0.5px solid #1C1C18', borderRadius: 100,
                padding: '4px 9px', fontSize: 10, color: '#484842', cursor: 'pointer',
                whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif', flexShrink: 0, lineHeight: 1,
                transition: 'border-color 0.15s, color 0.15s',
              }}
                onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = 'rgba(232,184,75,0.3)'; (e.target as HTMLButtonElement).style.color = '#E8B84B' }}
                onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = '#1C1C18'; (e.target as HTMLButtonElement).style.color = '#484842' }}
              >{p}</button>
            ))}
          </div>
        )}

        {/* ── COMPACT ZONE 2 — Alert pills ── */}
        {!isExpanded && alerts.length > 0 && (
          <div className="alf-no-drag" style={{
            marginTop: 12, padding: '0 16px',
            display: 'flex', flexWrap: 'wrap', gap: 5, zIndex: 3, position: 'relative',
          }} onPointerDown={e => e.stopPropagation()}>
            {alerts.slice(0, 3).map(a => (
              <div key={a.id}
                onMouseEnter={() => setHDismiss(a.id)}
                onMouseLeave={() => setHDismiss(null)}
                style={{
                  borderRadius: 100, padding: '4px 9px',
                  fontSize: 10, fontFamily: 'Inter, sans-serif', lineHeight: 1,
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: a.type === 'warning' ? 'rgba(192,57,43,0.06)' : 'rgba(232,184,75,0.06)',
                  border: `0.5px solid ${a.type === 'warning' ? 'rgba(192,57,43,0.2)' : 'rgba(232,184,75,0.22)'}`,
                  color: a.type === 'warning' ? '#D45A4A' : '#E8B84B',
                  transition: 'all 0.15s',
                }}>
                <span>{a.text}</span>
                <span style={{
                  opacity: hDismiss === a.id ? 1 : 0,
                  transition: 'opacity 0.15s', cursor: 'pointer', fontSize: 11,
                }}
                  onClick={() => setAlerts(prev => prev.filter(x => x.id !== a.id))}
                >×</span>
              </div>
            ))}
          </div>
        )}

        {/* ── INPUT AREA ── */}
        <div className="alf-no-drag" style={{
          padding: isExpanded ? '8px 14px 12px' : '10px 14px 14px',
          marginTop: isExpanded ? 0 : 14,
          borderTop: `0.5px solid #0E0E0C`,
          zIndex: 3, position: 'relative',
        }} onPointerDown={e => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input ref={inputRef} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send(input)}
                placeholder={errorPlaceholder ? 'Connection error — try again' : 'Ask Alfred...'}
                disabled={loading}
                style={{
                  width: '100%', background: 'transparent',
                  border: 'none', borderBottom: errorPlaceholder ? '0.5px solid rgba(229,112,122,0.5)' : '0.5px solid transparent',
                  outline: 'none', color: '#EDEBE6', fontSize: 12,
                  fontFamily: '"DM Mono", monospace', padding: '5px 0',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderBottomColor = 'rgba(232,184,75,0.4)'}
                onBlur={e => { if (!errorPlaceholder) e.target.style.borderBottomColor = 'transparent' }}
              />
            </div>
            <button onClick={() => send(input)} disabled={loading || !input.trim()}
              style={{
                width: 24, height: 24, borderRadius: 6, lineHeight: 1,
                background: input.trim() && !loading ? 'rgba(232,184,75,0.12)' : 'transparent',
                border: input.trim() && !loading ? '0.5px solid rgba(232,184,75,0.2)' : 'none',
                color: input.trim() && !loading ? '#E8B84B' : '#282824',
                fontSize: 14, cursor: input.trim() && !loading ? 'pointer' : 'default',
                padding: 0, flexShrink: 0,
                opacity: input.trim() && !loading ? 1 : 0,
                transition: 'opacity 0.2s, background 0.15s',
              }}
            >↑</button>
          </div>
        </div>

        {/* ── RESIZE HANDLE (expanded only) ── */}
        {isExpanded && (
          <div
            onPointerDown={resizeStart}
            style={{
              position: 'absolute', bottom: 0, right: 0, zIndex: 4,
              width: 18, height: 18,
              background: 'linear-gradient(135deg, transparent 50%, rgba(232,184,75,0.18) 50%)',
              borderBottomRightRadius: 18,
              cursor: 'nwse-resize',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'linear-gradient(135deg, transparent 50%, rgba(232,184,75,0.45) 50%)'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'linear-gradient(135deg, transparent 50%, rgba(232,184,75,0.18) 50%)'}
          />
        )}
      </div>

      <style>{`
        @keyframes alfredOrbPulse {
          0% { box-shadow: 0 0 0 1px rgba(232,184,75,0.06), 0 8px 32px rgba(0,0,0,0.8); }
          50% { box-shadow: 0 0 0 1px rgba(232,184,75,0.55), 0 8px 32px rgba(0,0,0,0.8); }
          100% { box-shadow: 0 0 0 1px rgba(232,184,75,0.06), 0 8px 32px rgba(0,0,0,0.8); }
        }
        @keyframes alertScale {
          0% { transform: scale(0); }
          100% { transform: scale(1); }
        }
        @keyframes alfredBar {
          0%, 80%, 100% { height: 3px; }
          40% { height: 10px; }
        }
        @keyframes alfredSlideUp {
          0% { transform: translateY(10px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        ::-webkit-scrollbar { width: 0; }
      `}</style>
    </>
  )
}
