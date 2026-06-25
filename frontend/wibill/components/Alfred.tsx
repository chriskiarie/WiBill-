'use client'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const GOLD = '#E8B84B'
const BG = '#000000'
const CARD = '#0D0D0B'
const BORDER = '#1A1A18'
const TEXT = '#EDEBE6'
const MUTED = '#6B6964'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Alert {
  id: string
  type: 'warning' | 'info' | 'success'
  text: string
}

const systemPrompt = (ctx: any) => `You are Alfred, the AI operations officer for WiBill ISP platform. You serve the platform owner. Keep every response to 1-3 short sentences. Be direct and precise.

Current platform state:
- ${ctx.platform.isps.total} ISPs (${ctx.platform.isps.active} active, ${ctx.platform.isps.pending} pending)
- ${ctx.platform.isps.overdue.length > 0 ? 'Overdue: ' + ctx.platform.isps.overdue.map((o: any) => o.name).join(', ') : 'No overdue invoices'}
- Revenue today: KES ${ctx.platform.revenue.today_ksh} | Month: KES ${ctx.platform.revenue.month_ksh}
- ${ctx.platform.sessions.active_now} active sessions
- ${ctx.platform.recent_audit.length} recent admin actions`

export default function Alfred() {
  const { token } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [context, setContext] = useState<any>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [briefingDone, setBriefingDone] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchContext = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API}/api/admin/alfred/context`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setContext(data)
      generateAlerts(data)
    } catch {}
  }

  const generateAlerts = (ctx: any) => {
    const newAlerts: Alert[] = []
    if (ctx.platform.isps.overdue.length > 0) {
      ctx.platform.isps.overdue.forEach((o: any) => {
        newAlerts.push({ id: `overdue-${o.name}`, type: 'warning', text: `${o.name} invoice is ${o.status}` })
      })
    }
    if (ctx.platform.isps.pending > 0) {
      newAlerts.push({ id: 'pending', type: 'info', text: `${ctx.platform.isps.pending} ISP${ctx.platform.isps.pending > 1 ? 's' : ''} awaiting approval` })
    }
    if (ctx.platform.sessions.active_now === 0 && ctx.platform.isps.active > 0) {
      newAlerts.push({ id: 'no-sessions', type: 'info', text: 'No active sessions — network may be idle' })
    }
    setAlerts(newAlerts)
  }

  const sendMessage = async (content: string) => {
    if (!context || !content.trim()) return
    setLoading(true)

    const userMsg: Message = { role: 'user', content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')

    try {
      const res = await fetch(`${API}/api/admin/alfred/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          system: systemPrompt(context),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.detail || `Error ${res.status}` }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response || 'No response.' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection issue. Check backend logs.' }])
    } finally {
      setLoading(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  useEffect(() => {
    if (open && context && !briefingDone && messages.length === 0) {
      setBriefingDone(true)
      sendMessage('Good morning. Give me my briefing.')
    }
  }, [open, context])

  useEffect(() => {
    fetchContext()
    const interval = setInterval(fetchContext, 120000)
    return () => clearInterval(interval)
  }, [token])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  const alertColors: Record<string, { bg: string; border: string; text: string }> = {
    warning: { bg: 'rgba(229,112,122,0.08)', border: 'rgba(229,112,122,0.25)', text: '#E5707A' },
    info: { bg: 'rgba(232,184,75,0.06)', border: 'rgba(232,184,75,0.2)', text: GOLD },
    success: { bg: 'rgba(111,207,115,0.06)', border: 'rgba(111,207,115,0.2)', text: '#6FCF73' },
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed',
          right: open ? 360 : 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 200,
          background: CARD,
          border: `0.5px solid ${BORDER}`,
          borderRight: 'none',
          borderRadius: '8px 0 0 8px',
          padding: '12px 6px',
          cursor: 'pointer',
          transition: 'right 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
        title={open ? 'Close Alfred' : 'Open Alfred'}
      >
        <div style={{ fontSize: 13, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, lineHeight: 1 }}>
          <span style={{ color: GOLD }}>X</span>
          <span style={{ color: TEXT }}>w</span>
          <span style={{ color: GOLD }}>B</span>
        </div>
        {alerts.length > 0 && !open && (
          <div style={{
            width: 16, height: 16, borderRadius: '50%',
            background: '#E5707A',
            fontSize: 9, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"DM Mono", monospace', fontWeight: 600,
          }}>
            {alerts.length}
          </div>
        )}
        <div style={{
          writingMode: 'vertical-rl',
          fontSize: 9, color: MUTED,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.1em',
          marginTop: 4,
        }}>
          ALFRED
        </div>
      </button>

      <div style={{
        position: 'fixed',
        right: open ? 0 : -360,
        top: 0, bottom: 0,
        width: 360,
        background: BG,
        borderLeft: `0.5px solid ${BORDER}`,
        zIndex: 199,
        display: 'flex',
        flexDirection: 'column',
        transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: `0.5px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, fontFamily: '"Space Grotesk", sans-serif' }}>
              <span style={{ color: GOLD }}>X</span>
              <span>w</span>
              <span style={{ color: GOLD }}>B</span>
              <span style={{ color: MUTED, fontWeight: 400, marginLeft: 8 }}>/ Alfred</span>
            </div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 2, fontFamily: '"DM Mono", monospace' }}>
              {context ? `synced ${new Date(context.timestamp).toLocaleTimeString()}` : 'connecting...'}
            </div>
          </div>
          <button onClick={fetchContext} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 16 }} title="Refresh context">↺</button>
        </div>

        {alerts.length > 0 && (
          <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {alerts.map(alert => (
              <div key={alert.id} style={{
                background: alertColors[alert.type].bg,
                border: `0.5px solid ${alertColors[alert.type].border}`,
                borderRadius: 6,
                padding: '7px 10px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 11,
              }}>
                <span style={{ color: alertColors[alert.type].text }}>{alert.text}</span>
                <button onClick={() => setAlerts(a => a.filter(x => x.id !== alert.id))}
                  style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 12, padding: '0 0 0 8px' }}
                >×</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && !loading && (
            <div style={{ textAlign: 'center', color: MUTED, fontSize: 12, marginTop: 40 }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>
                <span style={{ color: GOLD, fontFamily: '"Space Grotesk"', fontWeight: 700 }}>X</span>
                <span style={{ fontFamily: '"Space Grotesk"', fontWeight: 400 }}>w</span>
                <span style={{ color: GOLD, fontFamily: '"Space Grotesk"', fontWeight: 700 }}>B</span>
              </div>
              Alfred is standing by
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              gap: 8, alignItems: 'flex-start',
            }}>
              {msg.role === 'assistant' && (
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'rgba(232,184,75,0.12)',
                  border: `0.5px solid rgba(232,184,75,0.3)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, color: GOLD, fontFamily: '"Space Grotesk"', fontWeight: 700,
                  flexShrink: 0,
                }}>A</div>
              )}
              <div style={{
                background: msg.role === 'user' ? 'rgba(232,184,75,0.08)' : CARD,
                border: `0.5px solid ${msg.role === 'user' ? 'rgba(232,184,75,0.2)' : BORDER}`,
                borderRadius: msg.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                padding: '9px 12px',
                fontSize: 13,
                color: msg.role === 'user' ? GOLD : TEXT,
                lineHeight: 1.55,
                maxWidth: '85%',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'rgba(232,184,75,0.12)',
                border: `0.5px solid rgba(232,184,75,0.3)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, color: GOLD,
              }}>A</div>
              <div style={{
                background: CARD, border: `0.5px solid ${BORDER}`,
                borderRadius: '10px 10px 10px 2px',
                padding: '12px 16px',
                display: 'flex', gap: 4, alignItems: 'center',
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 5, height: 5, borderRadius: '50%', background: GOLD,
                    animation: 'alfredPulse 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: '8px 16px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Morning briefing', 'Revenue summary', 'Any issues?', 'Who needs approval?'].map(prompt => (
            <button key={prompt} onClick={() => sendMessage(prompt)} disabled={loading} style={{
              background: 'none', border: `0.5px solid ${BORDER}`, borderRadius: 20,
              padding: '4px 10px', fontSize: 11, color: MUTED, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              transition: 'border-color 0.15s, color 0.15s',
            }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = GOLD; (e.target as HTMLButtonElement).style.color = GOLD }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = BORDER; (e.target as HTMLButtonElement).style.color = MUTED }}
            >{prompt}</button>
          ))}
        </div>

        <div style={{ padding: '10px 16px 16px', display: 'flex', gap: 8 }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && sendMessage(input)}
            placeholder="Ask Alfred..." disabled={loading} style={{
              flex: 1, background: CARD, border: `0.5px solid ${BORDER}`, borderRadius: 8,
              padding: '9px 12px', color: TEXT, fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(232,184,75,0.4)'}
            onBlur={e => e.target.style.borderColor = BORDER}
          />
          <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} style={{
            background: input.trim() ? GOLD : 'rgba(232,184,75,0.1)', border: 'none', borderRadius: 8,
            width: 36, height: 36, cursor: input.trim() ? 'pointer' : 'default',
            color: input.trim() ? '#3D2A06' : MUTED, fontSize: 16, transition: 'background 0.15s',
          }}>↑</button>
        </div>
      </div>

      <style>{`
        @keyframes alfredPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  )
}
