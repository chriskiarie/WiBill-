'use client'

import { useState, useEffect } from 'react'
import {
  MessageSquare,
  Send,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Zap,
  Pencil,
  Eye,
  EyeOff,
  History as HistoryIcon,
} from 'lucide-react'
import {
  getSmsTemplates,
  previewSmsTemplate,
  sendBulkSms,
  getSmsHistory,
  getSmsStats,
  subscriberCount,
} from '@/lib/api'

const C = {
  void: 'var(--theme-bg)', base: 'var(--theme-card-base)', border: 'var(--theme-border)', border2: 'var(--theme-border2)',
  text: 'var(--theme-text)', dim: 'var(--theme-dim)', mute: 'var(--theme-mute)', faint: 'var(--theme-faint)',
  gold: 'var(--theme-gold)', green: 'var(--theme-green)', red: 'var(--theme-red)',
}

type TargetGroup = 'all' | 'monthly' | 'active' | 'suspended' | 'custom'

const TARGET_LABELS: Record<TargetGroup, string> = {
  all: 'All Subscribers',
  monthly: 'Monthly Clients',
  active: 'Active Only',
  suspended: 'Suspended / Paused',
  custom: 'Custom List',
}

const TARGET_ICONS: Record<TargetGroup, React.ReactNode> = {
  all: <Users size={14} />,
  monthly: <Users size={14} />,
  active: <CheckCircle size={14} />,
  suspended: <XCircle size={14} />,
  custom: <Pencil size={14} />,
}

interface Template {
  id: string
  name: string
  message: string
  category: string
}

interface SmsHistoryItem {
  id: string
  subject: string | null
  message: string
  target_group: string
  target_count: number
  sent_count: number
  status: string
  created_at: string | null
}

export default function CommsPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [targetGroup, setTargetGroup] = useState<TargetGroup>('all')
  const [customPhones, setCustomPhones] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [preview, setPreview] = useState('')
  const [history, setHistory] = useState<SmsHistoryItem[]>([])
  const [stats, setStats] = useState({ total_bursts: 0, total_messages: 0 })
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose')
  const [targetCount, setTargetCount] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [tplRes, histRes, statsRes, countRes] = await Promise.all([
        getSmsTemplates(),
        getSmsHistory(0, 10),
        getSmsStats(),
        subscriberCount().catch(() => ({ count: 0 })),
      ])
      setTemplates(tplRes.templates || [])
      setHistory(histRes.items || [])
      setStats(statsRes || { total_bursts: 0, total_messages: 0 })
      setTargetCount(countRes?.count || 0)
    } catch (e) {
      console.error('Failed to load SMS data:', e)
    }
  }

  async function loadTargetCount(group: TargetGroup) {
    try {
      const res = await subscriberCount().catch(() => ({ count: 0 }))
      const total = res?.count || 0
      if (group === 'all') setTargetCount(total)
      else if (group === 'active') setTargetCount(Math.round(total * 0.85))
      else if (group === 'suspended') setTargetCount(Math.round(total * 0.15))
      else if (group === 'monthly') setTargetCount(total)
    } catch {}
  }

  function selectTemplate(tpl: Template) {
    setSelectedTemplate(tpl)
    setMessage(tpl.message)
    setShowPreview(false)
  }

  async function handlePreview() {
    try {
      const res = await previewSmsTemplate({ template: message, sample_name: 'John' })
      setPreview(res.preview)
      setShowPreview(true)
    } catch {
      setPreview(message)
      setShowPreview(true)
    }
  }

  async function handleSend() {
    if (!message.trim()) {
      setError('Message is empty')
      return
    }
    if (message.length > 1600) {
      setError('Message too long (max 1600 characters)')
      return
    }

    setSending(true)
    setError('')

    const phones =
      targetGroup === 'custom'
        ? customPhones
            .split(/[\n,]+/)
            .map((p) => p.trim())
            .filter(Boolean)
        : undefined

    if (targetGroup === 'custom' && (!phones || phones.length === 0)) {
      setError('Enter at least one phone number')
      setSending(false)
      return
    }

    try {
      const res = await sendBulkSms({
        message,
        subject: subject || undefined,
        target_group: targetGroup,
        custom_phones: phones,
      })
      setSent(true)
      setSentCount(res.recipients)
      // Reload history
      const histRes = await getSmsHistory(0, 10)
      setHistory(histRes.items || [])
      const statsRes = await getSmsStats()
      setStats(statsRes || { total_bursts: 0, total_messages: 0 })
    } catch (e: any) {
      setError(e?.message || 'Failed to send SMS')
    } finally {
      setSending(false)
    }
  }

  function resetCompose() {
    setMessage('')
    setSubject('')
    setTargetGroup('all')
    setCustomPhones('')
    setSelectedTemplate(null)
    setSent(false)
    setSentCount(0)
    setError('')
    setShowPreview(false)
  }

  const charCount = message.length

  return (
    <div style={{ padding: '20px 32px 40px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${C.gold}15, ${C.gold}08)`,
              border: `1px solid ${C.gold}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MessageSquare size={20} style={{ color: C.gold }} />
          </div>
          <div>
            <h1
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: C.text,
                margin: 0,
              }}
            >
              Bulk SMS
            </h1>
            <p style={{ fontSize: 11, color: C.dim, margin: 0 }}>
              Send messages to your subscribers via Africa's Talking
            </p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'Bursts sent', value: stats.total_bursts, icon: <Send size={14} /> },
            { label: 'Total messages', value: stats.total_messages, icon: <MessageSquare size={14} /> },
            { label: 'Subscribers', value: targetCount, icon: <Users size={14} /> },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: C.base,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div style={{ color: C.dim }}>{s.icon}</div>
              <div>
                <div
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 18,
                    fontWeight: 600,
                    color: C.text,
                    lineHeight: 1,
                  }}
                >
                  {s.value.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          marginBottom: 20,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {(['compose', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none',
              border: 'none',
              padding: '10px 16px',
              fontSize: 12,
              fontWeight: 600,
              color: activeTab === tab ? C.gold : C.dim,
              borderBottom: activeTab === tab ? `2px solid ${C.gold}` : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: -1,
              transition: 'all 0.15s',
            }}
          >
            {tab === 'compose' ? <Pencil size={14} /> : <HistoryIcon size={14} />}
            {tab === 'compose' ? 'Compose' : 'History'}
          </button>
        ))}
      </div>

      {activeTab === 'compose' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 'calc(100vh - 200px)', overflow: 'hidden' }}>
          {/* Success message */}
          {sent && (
            <div
              style={{
                background: '#22c55e10',
                border: `1px solid #22c55e30`,
                borderRadius: 10,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <CheckCircle size={18} style={{ color: '#22c55e' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#22c55e' }}>
                  Message sent to {sentCount.toLocaleString()} subscribers
                </div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
                  Delivery reports may take a few minutes
                </div>
              </div>
              <button
                onClick={resetCompose}
                style={{
                  background: 'none',
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 11,
                  color: C.text,
                  cursor: 'pointer',
                }}
              >
                Send another
              </button>
            </div>
          )}

          {!sent && (
            <>
              {/* Top row: Target + Subject side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 12 }}>
                {/* Target group */}
                <div style={{ background: C.base, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Send to</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {(Object.keys(TARGET_LABELS) as TargetGroup[]).map((group) => (
                      <button
                        key={group}
                        onClick={() => { setTargetGroup(group); loadTargetCount(group) }}
                        style={{
                          background: targetGroup === group ? `${C.gold}12` : 'none',
                          border: `1px solid ${targetGroup === group ? C.gold : 'transparent'}`,
                          borderRadius: 6,
                          padding: '6px 10px',
                          fontSize: 11,
                          fontWeight: 500,
                          color: targetGroup === group ? C.gold : C.text,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          textAlign: 'left',
                          transition: 'all 0.15s',
                        }}
                      >
                        {TARGET_ICONS[group]}
                        {TARGET_LABELS[group]}
                      </button>
                    ))}
                  </div>
                  {targetGroup === 'custom' && (
                    <textarea
                      value={customPhones}
                      onChange={(e) => setCustomPhones(e.target.value)}
                      placeholder={"0712345678\n0798765432"}
                      rows={3}
                      style={{
                        width: '100%', marginTop: 6, background: C.void, border: `1px solid ${C.border}`,
                        borderRadius: 6, padding: '8px', fontSize: 10, fontFamily: "'DM Mono', monospace",
                        color: C.text, outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                      }}
                    />
                  )}
                </div>

                {/* Subject + Message */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject (optional) — e.g. Scheduled Maintenance"
                    maxLength={100}
                    style={{
                      width: '100%', background: C.base, border: `1px solid ${C.border}`,
                      borderRadius: 8, padding: '9px 12px', fontSize: 12, color: C.text,
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ position: 'relative', flex: 1 }}>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message... Use {name} to personalize per subscriber."
                      maxLength={1600}
                      style={{
                        width: '100%', height: '100%', minHeight: 80, background: C.base,
                        border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px',
                        fontSize: 12, lineHeight: 1.5, color: C.text, outline: 'none',
                        resize: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
                      }}
                    />
                    <span style={{
                      position: 'absolute', bottom: 8, right: 10, fontSize: 10,
                      fontFamily: "'DM Mono', monospace",
                      color: charCount > 1600 ? '#ef4444' : charCount > 1200 ? C.gold : C.dim,
                    }}>
                      {charCount}/1600
                    </span>
                  </div>
                  {error && (
                    <div style={{ background: '#ef444410', border: `1px solid #ef444430`, borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={12} />{error}
                    </div>
                  )}
                </div>
              </div>

              {/* Templates strip */}
              <div style={{ background: C.base, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Templates</div>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => selectTemplate(tpl)}
                      style={{
                        flexShrink: 0,
                        background: selectedTemplate?.id === tpl.id ? `${C.gold}12` : 'none',
                        border: `1px solid ${selectedTemplate?.id === tpl.id ? C.gold : C.border}`,
                        borderRadius: 6,
                        padding: '6px 12px',
                        fontSize: 11,
                        color: selectedTemplate?.id === tpl.id ? C.gold : C.text,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <FileText size={11} style={{ color: C.dim }} />
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottom bar: Preview + Cost + Send */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={handlePreview}
                  disabled={!message}
                  style={{
                    background: 'none', border: `1px solid ${C.border}`, borderRadius: 8,
                    padding: '8px 14px', fontSize: 11, fontWeight: 500, color: C.text,
                    cursor: message ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 5,
                    opacity: message ? 1 : 0.4, transition: 'all 0.15s',
                  }}
                >
                  {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
                  {showPreview ? 'Hide' : 'Preview'}
                </button>

                {showPreview && (
                  <div style={{
                    flex: 1, background: C.void, border: `1px solid ${C.border}`, borderRadius: 8,
                    padding: '8px 12px', fontSize: 11, color: C.text, lineHeight: 1.4,
                    fontFamily: 'Inter, sans-serif', minWidth: 200,
                  }}>
                    {preview}
                  </div>
                )}

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 11, color: C.dim }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", color: C.text, fontWeight: 600 }}>{targetCount}</span> recipients
                    {charCount > 0 && <span> · <span style={{ fontFamily: "'DM Mono', monospace", color: C.text }}>{Math.ceil(charCount / 160)}</span> segments</span>}
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={sending || !message.trim()}
                    style={{
                      background: sending ? `${C.gold}60` : C.gold, color: '#000', border: 'none',
                      borderRadius: 8, padding: '10px 20px', fontSize: 12, fontWeight: 700,
                      cursor: sending || !message.trim() ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6, opacity: sending || !message.trim() ? 0.6 : 1,
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    {sending ? (
                      <><div style={{ width: 14, height: 14, border: '2px solid #00000040', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Sending...</>
                    ) : (
                      <><Zap size={14} />Send</>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* History tab */
        <div
          style={{
            background: C.base,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {history.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <MessageSquare size={28} style={{ color: C.mute, margin: '0 auto 10px' }} />
              <div style={{ fontSize: 12, color: C.dim, marginBottom: 4 }}>No messages sent yet</div>
              <div style={{ fontSize: 11, color: C.mute }}>Your SMS history will appear here</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Time', 'Subject', 'Target', 'Recipients', 'Status'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 14px',
                        fontSize: 10,
                        fontWeight: 700,
                        color: C.dim,
                        textAlign: 'left',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 11,
                        color: C.dim,
                        fontFamily: "'DM Mono', monospace",
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 12,
                        color: C.text,
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.subject || item.message.slice(0, 40)}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: C.dim }}>
                      <span
                        style={{
                          background: `${C.gold}12`,
                          color: C.gold,
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}
                      >
                        {item.target_group}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 12,
                        fontFamily: "'DM Mono', monospace",
                        color: C.text,
                      }}
                    >
                      {item.sent_count.toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          background:
                            item.status === 'completed'
                              ? '#22c55e15'
                              : item.status === 'failed'
                                ? '#ef444415'
                                : '#E8B84B15',
                          color:
                            item.status === 'completed'
                              ? '#22c55e'
                              : item.status === 'failed'
                                ? '#ef4444'
                                : C.gold,
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        {item.status === 'completed' ? (
                          <CheckCircle size={10} />
                        ) : item.status === 'failed' ? (
                          <XCircle size={10} />
                        ) : (
                          <Clock size={10} />
                        )}
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
