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
  '/admin': ['Morning briefing', 'Revenue summary', 'Any issues?', 'Active ISPs'],
  '/admin/isps': ['Pending approvals', 'Who to approve?', 'Suspended ISPs', 'Recent signups'],
  '/admin/billing': ['Top earner', 'Overdue invoices', 'Monthly take rate', 'Commission summary'],
  '/admin/feature-flags': ['Premium ISPs', 'Upgrade candidates', 'Feature breakdown'],
  '/admin/invoices': ['Who is overdue?', 'Payment patterns', 'Pause recommendations'],
  '/admin/transactions': ['Failed transactions', 'Success rate', 'Unusual patterns'],
  '/admin/audit-log': ['Recent actions', 'Anything suspicious?', 'Admin activity'],
  '/admin/system': ['System health', 'M-Pesa status', 'Any misconfigs?'],
  '/admin/comms': ['Recent broadcasts', 'Delivery rates'],
}

const ORB_SIZE = 72

function findPageKey(path: string): string {
  return Object.keys(PAGE_LABELS).find(k => path.startsWith(k)) || '/admin'
}

function msgHasContent(m: Message) {
  const c = m.content.toLowerCase()
  return !c.includes('give me a one-sentence briefing') && !c.includes('alfred is not configured')
}

export default function Alfred() {
  const pathname = usePathname()
  const { token } = useAuth()
  const pageKey = findPageKey(pathname)

  const [mode, setMode] = useState<Mode>('orb')
  const [pos, setPos] = useState(() => {
    try {
      const s = typeof window !== 'undefined' ? localStorage.getItem('alfred-orb-position') : null
      if (s) return JSON.parse(s)
    } catch {}
    return { x: typeof window !== 'undefined' ? window.innerWidth - ORB_SIZE - 32 : 1100, y: typeof window !== 'undefined' ? window.innerHeight - ORB_SIZE - 32 : 700 }
  })
  const [size, setSize] = useState<{ w: number; h: number }>(() => {
    try {
      const s = typeof window !== 'undefined' ? localStorage.getItem('alfred-size') : null
      if (s) return JSON.parse(s)
    } catch {}
    return { w: 420, h: 600 }
  })
  const [context, setContext] = useState<any>(null)
  const [msgs, setMsgs] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [alerts, setAlerts] = useState<{ id: string; type: 'warning' | 'info'; text: string }[]>([])
  const [briefingDone, setBriefingDone] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const [pulseAlfred, setPulseAlfred] = useState(false)
  const [errorPlaceholder, setErrorPlaceholder] = useState(false)
  const [hDismiss, setHDismiss] = useState<string | null>(null)

  const dragOff = useRef({ x: 0, y: 0 })
  const sizeStart = useRef({ w: 0, h: 0, x: 0, y: 0 })
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const lastPage = useRef(pathname)

  const isOverdue = context?.platform?.isps?.overdue?.length > 0

  // ── Context fetch ──
  const fetchContext = useCallback(async () => {
    if (!token) return
    try {
      const r = await fetch(`${API}/api/admin/alfred/context`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await r.json()
      setContext(d)
      const al: typeof alerts = []
      const overdue = d.platform?.isps?.overdue || []
      overdue.forEach((o: any) => al.push({ id: `ov-${o.name}`, type: 'warning' as const, text: `${o.name} ${o.status}` }))
      if (d.platform?.isps?.pending > 0) al.push({ id: 'pending', type: 'info' as const, text: `${d.platform.isps.pending} awaiting approval` })
      if (d.platform?.sessions?.active_now === 0 && d.platform?.isps?.active > 0) al.push({ id: 'no-sess', type: 'info' as const, text: 'No active sessions' })
      setAlerts(al)
      if (al.length > 0 && mode === 'orb') {
        setPulseAlfred(true)
        setTimeout(() => setPulseAlfred(false), 4000)
      }
    } catch {}
  }, [token, mode])

  // ── Chat send ──
  const send = async (content: string) => {
    if (!context || !content.trim() || loading) return
    const ts = new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
    const userMsg: Message = { role: 'user', content, ts }
    const next = [...msgs, userMsg]
    setMsgs(next)
    setInput('')
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/admin/alfred/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, context, page: pathname }),
      })
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

  // ── Initial fetch + poll ──
  useEffect(() => {
    fetchContext()
    const i = setInterval(fetchContext, 120000)
    return () => clearInterval(i)
  }, [fetchContext])

  // ── Auto-briefing on route change ──
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
      send('Give me a one-sentence briefing for this page based on the current data.')
      setBriefingDone(true)
    }, 2500)
    return () => clearTimeout(t)
  }, [context, pathname, mode, briefingDone, token])

  // ── Persist position ──
  useEffect(() => {
    localStorage.setItem('alfred-orb-position', JSON.stringify(pos))
  }, [pos])
  useEffect(() => {
    if (mode === 'expanded') localStorage.setItem('alfred-size', JSON.stringify(size))
  }, [size, mode])

  // ── ESC to collapse ──
  useEffect(() => {
    if (mode === 'orb') return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setMode('orb') }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [mode])

  // ── Click outside to collapse ──
  useEffect(() => {
    if (mode === 'orb') return
    const h = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) setMode('orb')
    }
    setTimeout(() => window.addEventListener('pointerdown', h), 0)
    return () => window.removeEventListener('pointerdown', h)
  }, [mode])

  // ── Drag handlers ──
  const orbDragStart = (e: React.PointerEvent) => {
    e.preventDefault()
    dragOff.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    setDragging(true)
    const move = (ev: PointerEvent) => {
      setPos({
        x: Math.max(0, Math.min(ev.clientX - dragOff.current.x, window.innerWidth - ORB_SIZE)),
        y: Math.max(0, Math.min(ev.clientY - dragOff.current.y, window.innerHeight - ORB_SIZE)),
      })
    }
    const up = () => {
      setDragging(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const cardDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.alf-no-drag')) return
    e.preventDefault()
    const cw = mode === 'compact' ? 380 : size.w
    const ch = mode === 'compact' ? Math.min(440, Math.max(200, msgs.length * 50 + 120)) : size.h
    dragOff.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    setDragging(true)
    const move = (ev: PointerEvent) => {
      setPos({
        x: Math.max(0, Math.min(ev.clientX - dragOff.current.x, window.innerWidth - cw)),
        y: Math.max(0, Math.min(ev.clientY - dragOff.current.y, window.innerHeight - ch)),
      })
    }
    const up = () => { setDragging(false); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const resizeStart = (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation()
    sizeStart.current = { w: size.w, h: size.h, x: e.clientX, y: e.clientY }
    setResizing(true)
    const move = (ev: PointerEvent) => {
      setSize({
        w: Math.max(320, Math.min(560, sizeStart.current.w + (ev.clientX - sizeStart.current.x))),
        h: Math.max(400, Math.min(800, sizeStart.current.h + (ev.clientY - sizeStart.current.y))),
      })
    }
    const up = () => { setResizing(false); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const ctxAge = context ? (Date.now() - new Date(context.timestamp).getTime()) / 60000 : 999
  const syncStatus = ctxAge < 2 ? '#6FCF73' : '#E8B84B'

  // Find last assistant msg
  const lastAlfred = [...msgs].reverse().find(m => m.role === 'assistant' && msgHasContent(m))

  return (
    <>
      {/* ── ORB ── */}
      {mode === 'orb' && (
        <div
          onPointerDown={orbDragStart}
          onClick={() => setMode('compact')}
          onDoubleClick={() => setMode('expanded')}
          style={{
            position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
            width: ORB_SIZE, height: ORB_SIZE, borderRadius: '50%',
            background: 'rgba(15, 14, 10, 0.55)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid rgba(232,184,75,0.4)',
            boxShadow: `0 0 0 1px rgba(232,184,75,0.1), 0 12px 48px rgba(0,0,0,0.6), 0 0 30px rgba(232,184,75,0.08) inset`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none',
            transition: dragging ? 'none' : 'box-shadow 0.3s, transform 0.2s',
            animation: pulseAlfred ? 'alfredPulse 2s ease-in-out 2' : 'orbIdle 4s ease-in-out infinite',
          }}
          onMouseEnter={e => { if (!dragging) { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 1px rgba(232,184,75,0.2), 0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(232,184,75,0.12) inset'; (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.08)' } }}
          onMouseLeave={e => { if (!dragging) { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 1px rgba(232,184,75,0.1), 0 12px 48px rgba(0,0,0,0.6), 0 0 30px rgba(232,184,75,0.08) inset'; (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)' } }}
        >
          <span style={{ fontSize: 14, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, lineHeight: 1 }}>
            <span style={{ color: '#E8B84B' }}>X</span>
            <span style={{ color: '#D4D2CC', fontWeight: 300 }}>w</span>
            <span style={{ color: '#E8B84B' }}>B</span>
          </span>
          {alerts.length > 0 && (
            <div style={{
              position: 'absolute', top: -6, right: -6,
              width: 20, height: 20, borderRadius: '50%',
              background: '#C0392B',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, color: '#fff', fontFamily: '"DM Mono", monospace', fontWeight: 600,
              boxShadow: '0 0 0 2px #000',
            }}>
              {alerts.length}
            </div>
          )}
        </div>
      )}

      {/* ── COMPACT CARD ── */}
      {mode === 'compact' && (
        <div
          ref={cardRef}
          onPointerDown={cardDragStart}
          style={{
            position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
            width: 380, minHeight: 200, height: 'auto', maxHeight: 440,
            background: 'rgba(10, 9, 8, 0.82)',
            backdropFilter: 'blur(28px) saturate(160%)',
            WebkitBackdropFilter: 'blur(28px) saturate(160%)',
            borderTop: '0.5px solid rgba(232,184,75,0.18)',
            borderLeft: '0.5px solid rgba(232,184,75,0.12)',
            borderBottom: '0.5px solid rgba(0,0,0,0.4)',
            borderRight: '0.5px solid rgba(0,0,0,0.4)',
            borderRadius: 18,
            boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.03) inset',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            cursor: dragging ? 'grabbing' : 'grab',
            transition: dragging || resizing ? 'none' : 'all 0.38s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transformOrigin: `${ORB_SIZE / 2}px ${ORB_SIZE / 2}px`,
            padding: 16,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {/* ZONE 1 — Alfred message */}
          {lastAlfred ? (
            <div style={{
              paddingLeft: 12, borderLeft: '1.5px solid rgba(232,184,75,0.5)',
              fontSize: 13, lineHeight: 1.65, color: '#D4D2CC', fontStyle: 'italic',
              maxHeight: 78, overflow: 'hidden',
              maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
            }}>
              {lastAlfred.content}
            </div>
          ) : !loading ? (
            <div style={{ flex: 1 }} />
          ) : null}

          {/* ZONE 2 — Alert pills */}
          {alerts.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}
              className="alf-no-drag"
              onPointerDown={e => e.stopPropagation()}
            >
              {alerts.slice(0, 3).map(a => (
                <div key={a.id}
                  onMouseEnter={() => setHDismiss(a.id)}
                  onMouseLeave={() => setHDismiss(null)}
                  style={{
                    borderRadius: 100, padding: '4px 10px',
                    background: a.type === 'warning' ? 'rgba(192,57,43,0.06)' : 'rgba(232,184,75,0.06)',
                    border: `0.5px solid ${a.type === 'warning' ? 'rgba(192,57,43,0.2)' : 'rgba(232,184,75,0.2)'}`,
                    color: a.type === 'warning' ? '#E5707A' : '#E8B84B',
                    fontSize: 10, display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1,
                    transition: 'all 0.15s',
                    fontFamily: 'Inter, sans-serif',
                  }}>
                  <span>{a.text}</span>
                  <span style={{
                    opacity: hDismiss === a.id ? 1 : 0,
                    transition: 'opacity 0.15s', cursor: 'pointer', fontSize: 11, marginLeft: 2,
                  }}
                    onClick={() => setAlerts(prev => prev.filter(x => x.id !== a.id))}
                  >×</span>
                </div>
              ))}
            </div>
          )}

          {/* ZONE 3 — Input */}
          <div className="alf-no-drag" style={{ marginTop: 14 }}
            onPointerDown={e => e.stopPropagation()}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input ref={inputRef} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send(input)}
                placeholder={errorPlaceholder ? 'Connection error — try again' : 'Ask Alfred...'}
                disabled={loading}
                style={{
                  flex: 1, background: 'transparent', border: 'none', borderBottom: errorPlaceholder ? '0.5px solid rgba(229,112,122,0.5)' : '0.5px solid transparent',
                  outline: 'none', color: '#EDEBE6', fontSize: 11,
                  fontFamily: '"DM Mono", monospace', padding: '4px 0',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderBottomColor = 'rgba(232,184,75,0.5)'}
                onBlur={e => { if (!errorPlaceholder) e.target.style.borderBottomColor = 'transparent' }}
              />
              <button onClick={() => send(input)} disabled={loading || !input.trim()}
                style={{
                  background: 'none', border: 'none', color: '#E8B84B',
                  fontSize: 16, cursor: input.trim() && !loading ? 'pointer' : 'default',
                  padding: '2px 2px 2px 8px', fontFamily: 'Inter, sans-serif',
                  opacity: input.trim() && !loading ? 1 : 0,
                  transition: 'opacity 0.2s',
                  lineHeight: 1,
                }}
              >↑</button>
            </div>
          </div>
        </div>
      )}

      {/* ── EXPANDED CARD ── */}
      {mode === 'expanded' && (
        <div
          ref={cardRef}
          onPointerDown={cardDragStart}
          style={{
            position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
            width: size.w, height: size.h,
            background: 'rgba(10, 9, 8, 0.82)',
            backdropFilter: 'blur(28px) saturate(160%)',
            WebkitBackdropFilter: 'blur(28px) saturate(160%)',
            borderTop: '0.5px solid rgba(232,184,75,0.18)',
            borderLeft: '0.5px solid rgba(232,184,75,0.12)',
            borderBottom: '0.5px solid rgba(0,0,0,0.4)',
            borderRight: '0.5px solid rgba(0,0,0,0.4)',
            borderRadius: 18,
            boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.03) inset',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            cursor: dragging ? 'grabbing' : 'grab',
            transition: dragging || resizing ? 'none' : 'all 0.38s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transformOrigin: `${ORB_SIZE / 2}px ${ORB_SIZE / 2}px`,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {/* ── HEADER (36px) ── */}
          <div className="alf-no-drag" style={{
            height: 36, minHeight: 36, padding: '0 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }} onPointerDown={e => e.stopPropagation()}>
            <span style={{
              fontSize: 9, color: '#252520', textTransform: 'uppercase',
              letterSpacing: '0.12em', fontWeight: 600, fontFamily: 'Inter, sans-serif',
            }}>
              {PAGE_LABELS[pageKey] || 'Dashboard'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%', background: syncStatus,
                display: 'inline-block', flexShrink: 0,
              }} />
              <span style={{ fontSize: 9, color: '#252520', fontFamily: '"DM Mono", monospace' }}>
                {context ? new Date(context.timestamp).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
              <button onClick={fetchContext} style={{
                background: 'none', border: 'none', color: '#252520', cursor: 'pointer',
                fontSize: 11, padding: 0, lineHeight: 1,
              }}>↺</button>
            </div>
          </div>

          {/* ── MESSAGE AREA ── */}
          <div className="alf-no-drag" style={{
            flex: 1, overflowY: 'auto', padding: '0 14px',
            scrollbarWidth: 'none',
          }} onPointerDown={e => e.stopPropagation()}>
            {msgs.length === 0 && !loading && (
              <div style={{ padding: '40px 0', textAlign: 'center', fontStyle: 'italic', fontSize: 12, color: '#3A3A37' }}>
                Ask Alfred something.
              </div>
            )}
            {msgs.map((m, i) => {
              const prevRole = i > 0 ? msgs[i - 1].role : null
              const showDivider = m.role === 'user' && prevRole === 'assistant'
              return (
                <div key={i}>
                  {showDivider && <div style={{ height: '0.5px', background: '#0D0D0C', margin: '4px 0' }} />}
                  {m.role === 'assistant' ? (
                    <div style={{
                      padding: '10px 0 10px 12px',
                      borderLeft: '1.5px solid rgba(232,184,75,0.35)',
                      fontSize: 13, color: '#D4D2CC', fontStyle: 'italic',
                      lineHeight: 1.65,
                    }}>
                      <div>{m.content}</div>
                      {m.ts && <div style={{ fontSize: 9, color: '#1E1E1C', fontStyle: 'normal', textAlign: 'right', marginTop: 4, fontFamily: '"DM Mono", monospace' }}>{m.ts}</div>}
                    </div>
                  ) : (
                    <div style={{
                      padding: '8px 4px 8px 0', textAlign: 'right',
                    }}>
                      <div style={{
                        fontSize: 12, color: 'rgba(232,184,75,0.75)',
                        fontFamily: '"DM Mono", monospace',
                      }}>
                        <span style={{ color: '#E8B84B' }}>› </span>{m.content}
                      </div>
                      {m.ts && <div style={{ fontSize: 9, color: '#1E1E1C', fontFamily: '"DM Mono", monospace', textAlign: 'left', marginTop: 2 }}>{m.ts}</div>}
                    </div>
                  )}
                </div>
              )
            })}
            {loading && (
              <div style={{
                padding: '10px 0 10px 12px',
                borderLeft: '1.5px solid rgba(232,184,75,0.35)',
                display: 'flex', gap: 3, alignItems: 'flex-end', height: 16,
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 1.5, background: '#E8B84B', opacity: 0.6, borderRadius: 1,
                    animation: 'barPulse 0.9s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── QUICK PROMPTS ── */}
          <div className="alf-no-drag" style={{
            padding: '6px 14px 0', overflowX: 'auto',
            scrollbarWidth: 'none',
            display: 'flex', gap: 4,
          }} onPointerDown={e => e.stopPropagation()}>
            {(QUICK_PROMPTS[pageKey] || ['Ask me anything']).map(p => (
              <button key={p} onClick={() => send(p)} disabled={loading} style={{
                background: '#1A1A18', border: '0.5px solid #252520', borderRadius: 100,
                padding: '4px 10px', fontSize: 11, color: '#6B6964', cursor: 'pointer',
                whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif', flexShrink: 0,
                transition: 'border-color 0.15s, color 0.15s',
                lineHeight: 1,
              }}
                onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = 'rgba(232,184,75,0.3)'; (e.target as HTMLButtonElement).style.color = '#E8B84B' }}
                onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = '#252520'; (e.target as HTMLButtonElement).style.color = '#6B6964' }}
              >{p}</button>
            ))}
          </div>

          {/* ── INPUT AREA ── */}
          <div className="alf-no-drag" style={{
            height: 48, minHeight: 48, padding: '0 14px',
            borderTop: '0.5px solid #0D0D0C',
            display: 'flex', alignItems: 'center', gap: 8,
          }} onPointerDown={e => e.stopPropagation()}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input ref={inputRef} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send(input)}
                placeholder={errorPlaceholder ? 'Connection error — try again' : 'Ask Alfred...'}
                disabled={loading}
                style={{
                  width: '100%', background: 'transparent', border: 'none', borderBottom: errorPlaceholder ? '0.5px solid rgba(229,112,122,0.5)' : '0.5px solid transparent',
                  outline: 'none', color: '#EDEBE6', fontSize: 12,
                  fontFamily: '"DM Mono", monospace', padding: '6px 0',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderBottomColor = 'rgba(232,184,75,0.5)'}
                onBlur={e => { if (!errorPlaceholder) e.target.style.borderBottomColor = 'transparent' }}
              />
            </div>
            <button onClick={() => send(input)} disabled={loading || !input.trim()}
              style={{
                background: 'none', border: 'none', color: '#E8B84B',
                fontSize: 16, cursor: input.trim() && !loading ? 'pointer' : 'default',
                padding: '2px', lineHeight: 1, flexShrink: 0,
                opacity: input.trim() && !loading ? 1 : 0.3,
                transition: 'opacity 0.2s',
              }}
            >↑</button>
          </div>

          {/* ── RESIZE HANDLE ── */}
          <div
            onPointerDown={resizeStart}
            style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 20, height: 20,
              background: 'linear-gradient(135deg, transparent 50%, rgba(232,184,75,0.2) 50%)',
              borderBottomRightRadius: 18,
              cursor: 'nwse-resize',
              transition: 'background 0.15s',
              zIndex: 1,
            }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'linear-gradient(135deg, transparent 50%, rgba(232,184,75,0.5) 50%)'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'linear-gradient(135deg, transparent 50%, rgba(232,184,75,0.2) 50%)'}
          />
        </div>
      )}

      <style>{`
        @keyframes alfredPulse {
          0% { box-shadow: 0 0 0 1px rgba(232,184,75,0.08), 0 12px 40px rgba(0,0,0,0.8), 0 0 20px rgba(232,184,75,0.06) inset; }
          50% { box-shadow: 0 0 0 1px rgba(232,184,75,0.5), 0 12px 40px rgba(0,0,0,0.8), 0 0 24px rgba(232,184,75,0.2); }
          100% { box-shadow: 0 0 0 1px rgba(232,184,75,0.08), 0 12px 40px rgba(0,0,0,0.8), 0 0 20px rgba(232,184,75,0.06) inset; }
        }
        @keyframes barPulse {
          0%, 80%, 100% { height: 3px; }
          40% { height: 10px; }
        }
        @keyframes orbIdle {
          0%, 100% { box-shadow: 0 0 0 1px rgba(232,184,75,0.1), 0 12px 48px rgba(0,0,0,0.6), 0 0 30px rgba(232,184,75,0.08) inset; }
          50% { box-shadow: 0 0 0 1px rgba(232,184,75,0.15), 0 14px 52px rgba(0,0,0,0.65), 0 0 35px rgba(232,184,75,0.1) inset; }
        }
        ::-webkit-scrollbar { width: 0; }
      `}</style>
    </>
  )
}
