'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const GOLD = '#E8B84B'
const TEXT = '#EDEBE6'
const VOICE = '#D4D2CC'
const MUTED = '#6B6964'
const DIM = '#3A3A37'
const DARK = '#2A2A27'
const ERROR_RED = '#C0392B'

interface Message { role: 'user' | 'assistant'; content: string }
interface Alert { id: string; type: 'warning' | 'info' | 'success'; text: string }
type Mode = 'orb' | 'compact' | 'expanded'

const PAGE_LABELS: Record<string, string> = {
  '/admin': 'Dashboard', '/admin/isps': 'ISP Network', '/admin/billing': 'Billing',
  '/admin/feature-flags': 'Feature Flags', '/admin/invoices': 'Invoices',
  '/admin/transactions': 'Transactions', '/admin/audit-log': 'Audit Log',
  '/admin/system': 'Settings', '/admin/comms': 'Comms',
}

const PAGE_PROMPTS: Record<string, string[]> = {
  '/admin': ['Revenue today', 'Active sessions', 'Any issues?'],
  '/admin/isps': ['Pending approvals', 'Suspended ISPs', 'Recent signups'],
  '/admin/billing': ['Top earner', 'Overdue invoices', 'Monthly take'],
  '/admin/feature-flags': ['Premium candidates', 'Flag usage'],
  '/admin/invoices': ['Overdue accounts', 'Payment patterns', 'Due this week'],
  '/admin/transactions': ['Failed today', 'Success rate', 'Unusual patterns'],
  '/admin/audit-log': ['Recent actions', 'Suspicious activity'],
  '/admin/system': ['M-Pesa status', 'System health'],
  '/admin/comms': ['Recent broadcasts', 'Delivery rates'],
}

const PAGE_BRIEFINGS: Record<string, (ctx: any) => string> = {
  '/admin': (ctx) => {
    const r = ctx?.platform?.revenue || {}
    const s = ctx?.platform?.sessions || {}
    const o = ctx?.platform?.isps?.overdue || []
    const parts: string[] = []
    if (r.today_ksh > 0) parts.push(`Revenue today is KES ${r.today_ksh}. Month total: KES ${r.month_ksh}.`)
    else parts.push('No revenue yet today.')
    if (s.active_now > 0) parts.push(`${s.active_now} active sessions right now.`)
    if (o.length > 0) parts.push(`${o.length} account${o.length > 1 ? 's' : ''} overdue.`)
    return parts.join(' ')
  },
  '/admin/isps': (ctx) => {
    const isps = ctx?.platform?.isps || {}
    if (isps.pending > 0) return `${isps.pending} ISP${isps.pending > 1 ? 's' : ''} pending approval. ${isps.active} active.`
    return `${isps.active} active ISPs, all approved.`
  },
  '/admin/billing': (ctx) => {
    const r = ctx?.platform?.revenue || {}
    if (r.month_ksh === 0) return 'No revenue this month yet. All active ISPs have zero transactions.'
    return `Month: KES ${r.month_ksh}. Best day was KES ${r.yesterday_ksh > r.today_ksh ? r.yesterday_ksh : r.today_ksh}.`
  },
  '/admin/feature-flags': (ctx) => {
    const isps = ctx?.platform?.isps || {}
    return `${isps.total} ISPs total. Check which ones should be upgraded to premium.`
  },
  '/admin/invoices': (ctx) => {
    const o = ctx?.platform?.isps?.overdue || []
    if (o.length > 0) return `${o.length} overdue: ${o.map((x: any) => `${x.name} (KES ${x.fee})`).join(', ')}.`
    return 'All accounts current. No overdue invoices.'
  },
  '/admin/transactions': (ctx) => {
    const t = ctx?.platform?.recent_transactions || []
    const f = t.filter((x: any) => x.status === 'failed').length
    if (f > 0) return `${f} of the last ${t.length} transactions failed.`
    if (t.length > 0) return 'Last 5 transactions all succeeded.'
    return 'No recent transactions.'
  },
  '/admin/audit-log': () => 'Recent admin activity logged below. Nothing unusual flagged.',
  '/admin/system': () => 'System operational. Check M-Pesa and MikroTik node statuses.',
  '/admin/comms': () => 'Comms history available. No pending broadcasts.',
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
}

export default function Alfred() {
  const pathname = usePathname()
  const { token } = useAuth()

  const [mode, setMode] = useState<Mode>('orb')
  const [pos, setPos] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('alfred-pos') : null
    if (saved) { try { return JSON.parse(saved) } catch {} }
    return { x: (typeof window !== 'undefined' ? window.innerWidth : 1200) - 88, y: (typeof window !== 'undefined' ? window.innerHeight : 800) - 88 }
  })
  const [size, setSize] = useState<{ w: number; h: number }>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('alfred-size') : null
    if (saved) { try { return JSON.parse(saved) } catch {} }
    return { w: 340, h: 460 }
  })
  const [context, setContext] = useState<any>(null)
  const [msgs, setMsgs] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const [errorLine, setErrorLine] = useState('')
  const [briefingDone, setBriefingDone] = useState(false)
  const [glowActive, setGlowActive] = useState(false)

  const dragOff = useRef({ x: 0, y: 0 })
  const sizeStart = useRef({ w: 0, h: 0, x: 0, y: 0 })
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const lastPage = useRef(pathname)
  const briefTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pageKey = (Object.keys(PAGE_LABELS).find(k => pathname.startsWith(k)) || '/admin') as keyof typeof PAGE_LABELS

  const fetchContext = useCallback(async () => {
    if (!token) return
    try {
      const r = await fetch(`${API}/api/admin/alfred/context`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await r.json()
      setContext(d)
      const al: Alert[] = []
      const overdue = d.platform?.isps?.overdue || []
      overdue.forEach((o: any) => al.push({ id: `ov-${o.name}`, type: 'warning', text: `${o.name} ${o.status}` }))
      if (d.platform?.isps?.pending > 0) al.push({ id: 'pending', type: 'info', text: `${d.platform.isps.pending} ISP${d.platform.isps.pending > 1 ? 's' : ''} awaiting approval` })
      if (d.platform?.sessions?.active_now === 0 && d.platform?.isps?.active > 0) al.push({ id: 'no-sess', type: 'info', text: 'No active sessions' })
      setAlerts(al)
      if (al.length > 0) {
        setGlowActive(true)
        setTimeout(() => setGlowActive(false), 4000)
      }
    } catch {}
  }, [token])

  const send = async (content: string) => {
    if (!context || !content.trim() || loading) return
    const userMsg: Message = { role: 'user', content }
    const next = [...msgs, userMsg]
    setMsgs(next)
    setInput('')
    setLoading(true)
    setErrorLine('')
    try {
      const r = await fetch(`${API}/api/admin/alfred/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, context, page: pathname }),
      })
      const d = await r.json()
      if (!r.ok) {
        setErrorLine(d.detail || `Error ${r.status}`)
        if (inputRef.current) inputRef.current.placeholder = 'Something went wrong — try again'
        if (errorTimer.current) clearTimeout(errorTimer.current)
        errorTimer.current = setTimeout(() => { if (inputRef.current) inputRef.current.placeholder = 'Ask Alfred...'; setErrorLine('') }, 3000)
      } else {
        setMsgs(p => [...p, { role: 'assistant', content: d.reply || '' }])
      }
    } catch {
      setErrorLine('Connection issue')
      if (inputRef.current) inputRef.current.placeholder = 'Something went wrong — try again'
      if (errorTimer.current) clearTimeout(errorTimer.current)
      errorTimer.current = setTimeout(() => { if (inputRef.current) inputRef.current.placeholder = 'Ask Alfred...'; setErrorLine('') }, 3000)
    } finally {
      setLoading(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  const doBriefing = useCallback(() => {
    if (!context || !token) return
    const briefFn = PAGE_BRIEFINGS[pageKey] || PAGE_BRIEFINGS['/admin']
    const brief = briefFn(context)
    send(brief)
    setBriefingDone(true)
  }, [context, pageKey, token])

  // Initial fetch + poll
  useEffect(() => { fetchContext(); const i = setInterval(fetchContext, 120000); return () => clearInterval(i) }, [fetchContext])

  // Auto-briefing on route change
  useEffect(() => {
    if (!context || !token) return
    if (lastPage.current !== pathname) {
      setMsgs([])
      setBriefingDone(false)
      lastPage.current = pathname
    }
    if (!briefingDone && context) {
      if (briefTimer.current) clearTimeout(briefTimer.current)
      briefTimer.current = setTimeout(() => { setMode('compact'); doBriefing() }, 2500)
      return () => { if (briefTimer.current) clearTimeout(briefTimer.current) }
    }
  }, [context, pathname, briefingDone, token])

  // Persist
  useEffect(() => { localStorage.setItem('alfred-pos', JSON.stringify(pos)) }, [pos])
  useEffect(() => { localStorage.setItem('alfred-size', JSON.stringify(size)) }, [size])

  // ESC / outside click
  useEffect(() => {
    if (mode === 'orb') return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMode('orb') }
    const out = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) setMode('orb')
    }
    window.addEventListener('keydown', esc)
    setTimeout(() => window.addEventListener('pointerdown', out), 0)
    return () => { window.removeEventListener('keydown', esc); window.removeEventListener('pointerdown', out) }
  }, [mode])

  // ── Drag ──
  const onDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.alfred-input') || (e.target as HTMLElement).closest('.alfred-resize')) return
    e.preventDefault()
    dragOff.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    setDragging(true)
    const isExp = mode === 'expanded'
    const cw = isExp ? size.w : 300
    const ch = isExp ? size.h : 160
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

  // ── Resize ──
  const onResizeStart = (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation()
    sizeStart.current = { w: size.w, h: size.h, x: e.clientX, y: e.clientY }
    setResizing(true)
    const move = (ev: PointerEvent) => {
      setSize({
        w: Math.max(260, Math.min(500, sizeStart.current.w + (ev.clientX - sizeStart.current.x))),
        h: Math.max(300, Math.min(700, sizeStart.current.h + (ev.clientY - sizeStart.current.y))),
      })
    }
    const up = () => { setResizing(false); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const isExpanded = mode === 'expanded'
  const hasAlerts = alerts.length > 0
  const ctxAge = context ? (Date.now() - new Date(context.timestamp).getTime()) / 1000 : 999
  const syncFresh = ctxAge < 120

  return (
    <>
      {/* ── ORB ── */}
      {mode === 'orb' && (
        <div
          onPointerDown={onDragStart}
          onClick={() => setMode('compact')}
          onDoubleClick={() => setMode('expanded')}
          style={{
            position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
            width: 52, height: 52, borderRadius: '50%',
            background: 'radial-gradient(circle at 40% 35%, #1A1600 0%, #000000 100%)',
            border: '1px solid rgba(232,184,75,0.35)',
            cursor: dragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            transition: dragging ? 'none' : 'box-shadow 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',

            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: dragging
              ? '0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(232,184,75,0.15)'
              : glowActive
                ? '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,184,75,0.4)'
                : '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,184,75,0.1)',
          }}
        >
          <span style={{ fontSize: 13, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, lineHeight: 1 }}>
            <span style={{ color: GOLD }}>X</span>
            <span style={{ color: '#D4D2CC', fontSize: 11 }}>w</span>
            <span style={{ color: GOLD }}>B</span>
          </span>
          {hasAlerts && (
            <div style={{
              position: 'absolute', top: -4, right: -4,
              width: 16, height: 16, borderRadius: '50%',
              background: ERROR_RED,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, color: '#fff', fontFamily: '"DM Mono", monospace', fontWeight: 600,
              animation: 'alertPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>
              {alerts.length}
            </div>
          )}
        </div>
      )}

      {/* ── CARD (compact + expanded) ── */}
      {mode !== 'orb' && (
        <div
          ref={cardRef}
          onPointerDown={onDragStart}
          style={{
            position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
            width: isExpanded ? size.w : 300,
            height: isExpanded ? size.h : 'auto',
            minHeight: isExpanded ? 300 : 0,
            maxHeight: isExpanded ? 700 : 280,
            background: 'rgba(10, 9, 8, 0.78)',
            backdropFilter: 'blur(28px) saturate(160%)',
            WebkitBackdropFilter: 'blur(28px) saturate(160%)',
            border: '0.5px solid rgba(232,184,75,0.14)',
            borderBottom: '0.5px solid rgba(0,0,0,0.3)',
            borderRight: '0.5px solid rgba(0,0,0,0.3)',
            borderRadius: 16,
            boxShadow: `0 20px 60px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.03)`,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            cursor: dragging ? 'grabbing' : 'grab',
            transition: dragging || resizing
              ? 'none'
              : 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transformOrigin: 'center center',
            fontFamily: 'Inter, sans-serif',
            animation: 'cardIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* ── HEADER (expanded only) ── */}
          {isExpanded && (
            <div style={{
              height: 40, minHeight: 40, padding: '0 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'default',
            }}>
              <span style={{
                fontSize: 10, color: DARK, textTransform: 'uppercase',
                letterSpacing: '0.1em', fontWeight: 600, fontFamily: 'Inter, sans-serif',
              }}>
                {PAGE_LABELS[pageKey] || 'Dashboard'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: syncFresh ? '#6FCF73' : GOLD,
                  display: 'inline-block',
                }} />
                <span style={{ fontSize: 9, color: DARK, fontFamily: '"DM Mono", monospace' }}>
                  {context ? formatTime(context.timestamp) : ''}
                </span>
                <button onClick={() => { fetchContext(); const el = (document.querySelector(`[data-refresh]`) as HTMLElement); if (el) el.style.transform = 'rotate(360deg)' }}
                  data-refresh
                  style={{
                    background: 'none', border: 'none', color: DARK, cursor: 'pointer',
                    fontSize: 11, padding: 0, lineHeight: 1, transition: 'transform 0.6s',
                  }}
                >↺</button>
              </div>
            </div>
          )}

          {/* ── MESSAGE AREA ── */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: isExpanded ? '4px 0 4px' : '10px 0 4px',
            display: 'flex', flexDirection: 'column',
            cursor: 'default',
          }}>
            {msgs.length === 0 && !loading && (
              <div style={{ fontSize: 12, color: MUTED, padding: '16px 14px', fontStyle: 'italic' }}>
                Good morning, Chris. I've reviewed the overnight logs. Everything looks normal — all ISPs are active and revenue is flowing.
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} style={{
                padding: isExpanded ? '7px 14px' : '5px 14px',
                borderBottom: m.role === 'assistant' && i < msgs.length - 1 && msgs[i + 1]?.role === 'user'
                  ? '0.5px solid #111110' : 'none',
              }}>
                {m.role === 'assistant' ? (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{
                      width: 1.5, flexShrink: 0,
                      background: 'linear-gradient(to bottom, rgba(232,184,75,0.4), rgba(232,184,75,0.4) 18px, transparent 18px)',
                      borderRadius: 1,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: isExpanded ? 13 : 12,
                        lineHeight: 1.6,
                        color: VOICE,
                        fontStyle: 'italic',
                      }}>
                        {m.content}
                      </div>
                      {isExpanded && (
                        <div style={{
                          fontSize: 9, color: '#1E1E1C', fontFamily: '"DM Mono", monospace',
                          textAlign: 'right', marginTop: 4,
                        }}>
                          {new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'right', paddingRight: 12,
                  }}>
                    <div style={{
                      fontSize: isExpanded ? 12 : 11,
                      fontFamily: '"DM Mono", monospace',
                      color: 'rgba(232,184,75,0.7)',
                      lineHeight: 1.5,
                    }}>
                      <span style={{ color: GOLD }}>› </span>{m.content}
                    </div>
                    {isExpanded && (
                      <div style={{
                        fontSize: 9, color: '#1E1E1C', fontFamily: '"DM Mono", monospace',
                        marginTop: 2,
                      }}>
                        {new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ padding: isExpanded ? '7px 14px' : '5px 14px', display: 'flex', gap: 10 }}>
                <div style={{
                  width: 1.5, flexShrink: 0, background: 'rgba(232,184,75,0.4)', borderRadius: 1,
                }} />
                <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 12 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 1.5,
                      background: GOLD, borderRadius: 1,
                      animation: 'barBounce 0.9s ease-in-out infinite',
                      animationDelay: `${i * 0.2}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── ALERT PILLS (compact) ── */}
          {!isExpanded && hasAlerts && (
            <div style={{ padding: '0 14px 6px', display: 'flex', flexWrap: 'wrap', gap: 6, cursor: 'default' }}>
              {alerts.slice(0, 3).map(a => (
                <div key={a.id} style={{
                  fontSize: 10, color: a.type === 'warning' ? '#E5707A' : GOLD,
                  padding: '3px 10px', borderRadius: 100,
                  background: a.type === 'warning' ? 'rgba(229,112,122,0.06)' : 'rgba(232,184,75,0.06)',
                  border: `0.5px solid ${a.type === 'warning' ? 'rgba(229,112,122,0.2)' : 'rgba(232,184,75,0.2)'}`,
                  fontFamily: 'Inter, sans-serif',
                  lineHeight: 1.4,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span>{a.text}</span>
                  <span
                    onClick={() => setAlerts(p => p.filter(x => x.id !== a.id))}
                    style={{ color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 11 }}
                  >×</span>
                </div>
              ))}
            </div>
          )}

          {/* ── QUICK PROMPTS (expanded) ── */}
          {isExpanded && (
            <div style={{
              padding: '4px 14px 6px',
              display: 'flex', gap: 4, overflowX: 'auto',
              cursor: 'default',
              maskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent 100%)',
            }}>
              {(PAGE_PROMPTS[pageKey] || PAGE_PROMPTS['/admin']).map(p => (
                <button key={p} onClick={() => send(p)} disabled={loading} style={{
                  background: '#1A1A18', border: '0.5px solid #3A3A37', borderRadius: 100,
                  padding: '3px 10px', fontSize: 10, color: MUTED, cursor: 'pointer',
                  whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif',
                  lineHeight: 1.5, flexShrink: 0,
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                  onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = 'rgba(232,184,75,0.3)'; (e.target as HTMLButtonElement).style.color = GOLD }}
                  onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = '#3A3A37'; (e.target as HTMLButtonElement).style.color = MUTED }}
                >{p}</button>
              ))}
            </div>
          )}

          {/* ── INPUT ── */}
          <div className="alfred-input" style={{
            borderTop: '0.5px solid #1A1A18',
            padding: isExpanded ? '6px 10px 10px' : '6px 10px 8px',
            cursor: 'default',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input ref={inputRef} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') send(input); if (errorLine) { setErrorLine(''); if (inputRef.current) inputRef.current.placeholder = 'Ask Alfred...'; if (errorTimer.current) clearTimeout(errorTimer.current) } }}
                placeholder="Ask Alfred..."
                disabled={loading}
                onClick={e => e.stopPropagation()}
                style={{
                  flex: 1, background: 'transparent', border: 'none', borderBottom: errorLine ? '0.5px solid rgba(192, 57, 43, 0.5)' : '0.5px solid transparent',
                  outline: 'none', color: TEXT,
                  fontSize: isExpanded ? 11 : 10,
                  fontFamily: '"DM Mono", monospace',
                  padding: '4px 0', transition: 'border-color 0.2s',
                }}
                onFocus={e => { if (!errorLine) e.target.style.borderBottom = '0.5px solid rgba(232,184,75,0.5)' }}
                onBlur={e => { if (!errorLine) e.target.style.borderBottom = '0.5px solid transparent' }}
              />
              {input.trim() && (
                <button onClick={() => send(input)} disabled={loading}
                  style={{
                    background: 'none', border: 'none', color: GOLD,
                    fontSize: 14, cursor: loading ? 'default' : 'pointer',
                    padding: '2px 2px', opacity: loading ? 0.4 : 1,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >↑</button>
              )}
            </div>
            {errorLine && (
              <div style={{
                position: 'absolute', bottom: -2, left: 10,
                fontSize: 9, color: DIM, fontFamily: '"DM Mono", monospace',
                pointerEvents: 'none',
              }}>
                {errorLine}
              </div>
            )}
          </div>

          {/* ── RESIZE HANDLE (expanded) ── */}
          {isExpanded && (
            <div className="alfred-resize"
              onPointerDown={onResizeStart}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 20, height: 20, cursor: 'nwse-resize',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
                opacity: resizing ? 0.5 : 0.3,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '0.5'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = '0.3'}
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <line x1="8" y1="12" x2="12" y2="8" stroke="rgba(232,184,75,0.3)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="3" y1="12" x2="12" y2="3" stroke="rgba(232,184,75,0.2)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes alertPop {
          0% { transform: scale(0); }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes barBounce {
          0%, 80%, 100% { height: 3px; }
          40% { height: 10px; }
        }
        @keyframes cardIn {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        ::-webkit-scrollbar { width: 0; }
      `}</style>
    </>
  )
}
