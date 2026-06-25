'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const GOLD = '#E8B84B'
const MUTED = '#6B6964'
const TEXT = '#EDEBE6'
const DIM = '#3A3A37'

interface Message { role: 'user' | 'assistant'; content: string }
interface Alert { id: string; type: 'warning' | 'info' | 'success'; text: string }

type Mode = 'orb' | 'compact' | 'expanded'

const PAGE_LABELS: Record<string, string> = {
  '/admin': 'Dashboard', '/admin/isps': 'ISP Network', '/admin/billing': 'Billing',
  '/admin/feature-flags': 'Feature Flags', '/admin/invoices': 'Invoices',
  '/admin/transactions': 'Transactions', '/admin/audit-log': 'Audit Log',
  '/admin/system': 'Settings', '/admin/comms': 'Comms',
}

const PAGE_CONTEXTS: Record<string, string> = {
  '/admin': "User is on the Batcave Dashboard. Lead with revenue and session health.",
  '/admin/isps': "User is on ISP Network. Focus on pending approvals, active vs suspended counts, recent signups.",
  '/admin/billing': "User is on Billing. Focus on per-ISP revenue, commission earned, outstanding invoices.",
  '/admin/feature-flags': "User is on Feature Flags. Help identify which ISPs should be upgraded to premium.",
  '/admin/invoices': "User is on Invoices. Surface overdue accounts, days late, payment patterns.",
  '/admin/transactions': "User is on Transactions. Highlight failed transactions, success rate, unusual patterns.",
  '/admin/audit-log': "User is on Audit Log. Summarize recent admin actions, flag anything unusual.",
  '/admin/system': "User is on Settings. Note M-Pesa sandbox status, system health, any misconfigurations.",
  '/admin/comms': "User is on Comms. Focus on notification delivery, broadcast history.",
}

function buildBriefing(page: string, ctx: any): string {
  const plat = ctx?.platform || {}
  const isps = plat.isps || {}
  const rev = plat.revenue || {}
  const sess = plat.sessions || {}
  const overdue = isps.overdue || []
  const pageKey = Object.keys(PAGE_CONTEXTS).find(k => page.startsWith(k)) || '/admin'
  const pageNote = PAGE_CONTEXTS[pageKey as keyof typeof PAGE_CONTEXTS] || ''

  const parts: string[] = []
  if (pageKey === '/admin/isps' && isps.pending > 0) {
    parts.push(`${isps.pending} ISP${isps.pending > 1 ? 's' : ''} pending approval.`)
  }
  if (overdue.length > 0) {
    parts.push(`${overdue.length} account${overdue.length > 1 ? 's' : ''} overdue: ${overdue.map((o: any) => `${o.name} (KES ${o.fee})`).join(', ')}.`)
  }
  if (pageKey === '/admin' || pageKey === '/admin/invoices') {
    if (rev.today_ksh > 0) parts.push(`Revenue today: KES ${rev.today_ksh}. Month: KES ${rev.month_ksh}.`)
    if (sess.active_now > 0) parts.push(`${sess.active_now} active sessions.`)
  }
  if (pageKey === '/admin/feature-flags') {
    parts.push(`${isps.total} ISPs total, ${isps.active} active.`)
  }
  if (pageKey === '/admin/transactions' && plat.recent_transactions?.length > 0) {
    const failed = plat.recent_transactions.filter((t: any) => t.status === 'failed').length
    if (failed > 0) parts.push(`${failed} of last 5 transactions failed.`)
  }
  if (parts.length === 0) parts.push(`All quiet. ${isps.total} ISPs, ${isps.active} active.`)
  return `${pageNote} ${parts.join(' ')}`
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
    return { w: 340, h: 500 }
  })
  const [context, setContext] = useState<any>(null)
  const [msgs, setMsgs] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [briefingSent, setBriefingSent] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)

  const dragOff = useRef({ x: 0, y: 0 })
  const sizeStart = useRef({ w: 0, h: 0, x: 0, y: 0 })
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const lastPage = useRef(pathname)

  const isOverdue = context?.platform?.isps?.overdue?.length > 0

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
    } catch {}
  }, [token])

  const send = async (content: string) => {
    if (!context || !content.trim() || loading) return
    const userMsg: Message = { role: 'user', content }
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
        setMsgs(p => [...p, { role: 'assistant', content: d.detail || `Error ${r.status}` }])
      } else {
        setMsgs(p => [...p, { role: 'assistant', content: d.reply || 'No response.' }])
      }
    } catch {
      setMsgs(p => [...p, { role: 'assistant', content: 'Connection issue.' }])
    } finally {
      setLoading(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  // Initial fetch + poll
  useEffect(() => { fetchContext(); const i = setInterval(fetchContext, 120000); return () => clearInterval(i) }, [fetchContext])

  // Auto-briefing on route change
  useEffect(() => {
    if (!context || !token) return
    if (lastPage.current !== pathname) {
      setMsgs([])
      setBriefingSent(false)
      lastPage.current = pathname
      setMode('compact')
    }
    if (!briefingSent && context && mode !== 'orb') {
      const t = setTimeout(() => {
        const brief = buildBriefing(pathname, context)
        send(brief)
        setBriefingSent(true)
      }, 2000)
      return () => clearTimeout(t)
    }
  }, [context, pathname, mode, briefingSent, token])

  // Persist position
  useEffect(() => { localStorage.setItem('alfred-pos', JSON.stringify(pos)) }, [pos])
  useEffect(() => { localStorage.setItem('alfred-size', JSON.stringify(size)) }, [size])

  // ESC to collapse
  useEffect(() => {
    if (mode === 'orb') return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMode('orb') }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mode])

  // Click outside
  useEffect(() => {
    if (mode === 'orb') return
    const handler = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) setMode('orb')
    }
    setTimeout(() => window.addEventListener('pointerdown', handler), 0)
    return () => window.removeEventListener('pointerdown', handler)
  }, [mode])

  // ── Drag ──
  const onDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.alfred-input')) return
    e.preventDefault()
    dragOff.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    setDragging(true)
    const move = (ev: PointerEvent) => {
      const cw = mode === 'compact' ? 300 : size.w
      const ch = mode === 'compact' ? Math.min(220, Math.max(140, msgs.length * 40 + 80)) : size.h
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

  // click handlers
  const onOrbClick = () => setMode(mode === 'orb' ? 'compact' : 'expanded')
  const onOrbDblClick = () => setMode('expanded')

  const orbSize = 56
  const isExpanded = mode === 'expanded'

  return (
    <>
      {/* ── ORB ── */}
      {mode === 'orb' && (
        <div
          onPointerDown={onDragStart}
          onClick={onOrbClick}
          onDoubleClick={onOrbDblClick}
          style={{
            position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
            width: orbSize, height: orbSize, borderRadius: '50%',
            background: 'rgba(11,11,10,0.85)',
            border: '1px solid rgba(232,184,75,0.3)',
            boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,184,75,0.1)`,
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'grab', userSelect: 'none',
            transition: dragging ? 'none' : 'box-shadow 0.3s',
            animation: isOverdue ? 'orbPulse 2s ease-in-out infinite' : 'none',
          }}
        >
          <span style={{ fontSize: 13, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, lineHeight: 1 }}>
            <span style={{ color: GOLD }}>X</span><span style={{ color: TEXT }}>w</span><span style={{ color: GOLD }}>B</span>
          </span>
          {alerts.length > 0 && (
            <div style={{
              position: 'absolute', top: -4, right: -4,
              width: 18, height: 18, borderRadius: '50%', background: '#E5707A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, color: '#fff', fontFamily: '"DM Mono", monospace', fontWeight: 600,
              animation: 'alertBounce 0.3s ease-out',
            }}>
              {alerts.length}
            </div>
          )}
        </div>
      )}

      {/* ── COMPACT + EXPANDED ── */}
      {mode !== 'orb' && (
        <div
          ref={cardRef}
          onPointerDown={onDragStart}
          style={{
            position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
            width: isExpanded ? size.w : 300,
            height: isExpanded ? size.h : 'auto',
            minHeight: isExpanded ? 300 : 140,
            maxHeight: isExpanded ? 700 : 220,
            background: 'rgba(8,8,7,0.82)',
            border: '0.5px solid rgba(232,184,75,0.18)',
            borderRadius: 14,
            boxShadow: `0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)`,
            backdropFilter: 'blur(24px) saturate(200%)',
            WebkitBackdropFilter: 'blur(24px) saturate(200%)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            cursor: dragging ? 'grabbing' : 'grab',
            transition: dragging || resizing ? 'none' : 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transformOrigin: 'bottom right',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {/* ── Status strip (expanded only) ── */}
          {isExpanded && (
            <div style={{
              height: 32, minHeight: 32, padding: '0 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'default',
            }}>
              <span style={{ fontSize: 10, color: DIM, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                {PAGE_LABELS[pathname as keyof typeof PAGE_LABELS] || 'Dashboard'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: DIM, fontFamily: '"DM Mono", monospace' }}>
                  {context ? formatTime(context.timestamp) : ''}
                </span>
                <button onClick={fetchContext} style={{ background: 'none', border: 'none', color: DIM, cursor: 'pointer', fontSize: 12, padding: 0 }} title="Refresh">↺</button>
              </div>
            </div>
          )}

          {/* ── Message area ── */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: isExpanded ? '4px 14px 8px' : '10px 14px 4px',
            display: 'flex', flexDirection: 'column', gap: 2,
            cursor: 'default',
          }}>
            {msgs.length === 0 && !loading && (
              <div style={{ fontSize: 12, color: MUTED, padding: '12px 0', textAlign: 'center' }}>
                Ask Alfred...
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} style={{
                fontSize: m.role === 'user' ? 11 : 12,
                fontFamily: m.role === 'user' ? '"DM Mono", monospace' : 'Inter, sans-serif',
                color: m.role === 'user' ? 'rgba(232,184,75,0.8)' : TEXT,
                textAlign: m.role === 'user' ? 'right' : 'left',
                padding: '6px 0',
                borderBottom: m.role === 'assistant' && i < msgs.length - 1 ? '0.5px solid rgba(26,26,24,0.6)' : 'none',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}>
                {m.role === 'user' && <span style={{ color: GOLD }}>› </span>}
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ padding: '6px 0', display: 'flex', gap: 4, alignItems: 'flex-end', height: 16 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 1, height: 8,
                    background: GOLD, borderRadius: 1,
                    animation: 'barBounce 0.9s ease-in-out infinite',
                    animationDelay: `${i * 0.15}s`,
                  }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Alerts (compact) ── */}
          {!isExpanded && alerts.length > 0 && (
            <div style={{ padding: '0 14px 4px', display: 'flex', flexDirection: 'column', gap: 3, cursor: 'default' }}>
              {alerts.slice(0, 2).map(a => (
                <div key={a.id} style={{
                  fontSize: 10, color: a.type === 'warning' ? '#E5707A' : GOLD,
                  padding: '3px 8px', borderRadius: 4,
                  background: a.type === 'warning' ? 'rgba(229,112,122,0.08)' : 'rgba(232,184,75,0.06)',
                  border: `0.5px solid ${a.type === 'warning' ? 'rgba(229,112,122,0.2)' : 'rgba(232,184,75,0.15)'}`,
                }}>{a.text}</div>
              ))}
            </div>
          )}

          {/* ── Input ── */}
          <div className="alfred-input" style={{
            borderTop: `0.5px solid #1A1A18`,
            padding: isExpanded ? '6px 10px 10px' : '6px 10px 8px',
            cursor: 'default',
          }}>
            {isExpanded && (
              <div style={{ display: 'flex', gap: 4, marginBottom: 6, overflowX: 'auto', paddingBottom: 2 }}>
                {['Briefing', 'Revenue', 'Issues?', 'Pending'].map(p => (
                  <button key={p} onClick={() => send(p)} disabled={loading} style={{
                    background: 'none', border: '0.5px solid #1A1A18', borderRadius: 12,
                    padding: '2px 8px', fontSize: 10, color: MUTED, cursor: 'pointer',
                    whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif',
                    transition: 'border-color 0.15s',
                  }}
                    onMouseEnter={e => (e.target as HTMLButtonElement).style.borderColor = GOLD}
                    onMouseLeave={e => (e.target as HTMLButtonElement).style.borderColor = '#1A1A18'}
                  >{p}</button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input ref={inputRef} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send(input)}
                placeholder="Ask Alfred..."
                disabled={loading}
                onClick={e => e.stopPropagation()}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: TEXT, fontSize: isExpanded ? 12 : 11,
                  fontFamily: '"DM Mono", monospace',
                  padding: '4px 0',
                }}
              />
              <button onClick={() => send(input)} disabled={loading || !input.trim()}
                onClickCapture={e => e.stopPropagation()}
                style={{
                  background: 'none', border: 'none', color: input.trim() ? GOLD : DIM,
                  fontSize: 14, cursor: input.trim() && !loading ? 'pointer' : 'default',
                  padding: '2px 4px',
                  fontFamily: 'Inter, sans-serif',
                }}
              >↑</button>
            </div>
          </div>

          {/* ── Resize handle (expanded only) ── */}
          {isExpanded && (
            <div
              onPointerDown={onResizeStart}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 16, height: 16, cursor: 'nwse-resize',
                borderRight: '2px solid rgba(232,184,75,0.2)',
                borderBottom: '2px solid rgba(232,184,75,0.2)',
                borderBottomRightRadius: 14,
                opacity: resizing ? 0.5 : 0.3,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '0.5'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = '0.3'}
            />
          )}
        </div>
      )}

      <style>{`
        @keyframes orbPulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,184,75,0.1); }
          50% { box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 2px rgba(232,184,75,0.4); }
        }
        @keyframes alertBounce {
          0% { transform: scale(0); }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes barBounce {
          0%, 80%, 100% { height: 3px; }
          40% { height: 8px; }
        }
        ::-webkit-scrollbar { width: 0; }
      `}</style>
    </>
  )
}
