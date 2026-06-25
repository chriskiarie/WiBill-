'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const C = {
  text: '#EDEBE6', dim: '#8C8A84', mute: '#6B6964',
  gold: '#E8B84B', green: '#6FCF73', red: '#E5707A',
}

const typeConfig: Record<string, { icon: string; color: string; label: string }> = {
  broadcast:       { icon: '📢', color: C.gold, label: 'Platform Announcement' },
  direct:          { icon: '✉️', color: '#3b82f6', label: 'Direct Message' },
  invoice_due:     { icon: '📄', color: '#f59e0b', label: 'Invoice Due' },
  payment_received:{ icon: '✅', color: C.green, label: 'Payment Received' },
  network_alert:   { icon: '⚠️', color: C.red, label: 'Network Alert' },
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
}

export default function NotificationsPage() {
  const { token } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  const fetchNotifications = useCallback(async () => {
    if (!token) return
    try {
      const r = await fetch(`${API}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (r.ok) {
        const data = await r.json()
        setNotifications(Array.isArray(data) ? data : [])
      }
    } catch {} finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const markRead = async (id: string) => {
    try {
      await fetch(`${API}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await fetch(`${API}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })))
    } catch {}
  }

  const filtered = filter === 'all'
    ? notifications
    : filter === 'unread'
      ? notifications.filter(n => !n.read_at)
      : notifications.filter(n => n.type === filter)

  const unreadCount = notifications.filter(n => !n.read_at).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Top Bar */}
      <div style={{
        background: '#080808', borderBottom: '0.5px solid #141414',
        padding: '0 28px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 52, minHeight: 52,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 16, fontWeight: 500, color: '#e8e8e8', margin: 0, fontFamily: '"Space Grotesk", sans-serif' }}>
            Notifications
          </h1>
          {unreadCount > 0 && (
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 10,
              background: C.gold, color: '#000', fontWeight: 600,
            }}>{unreadCount} new</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{
              background: 'transparent', border: '0.5px solid #333', borderRadius: 6,
              padding: '6px 12px', fontSize: 11, color: '#777', cursor: 'pointer',
            }}>Mark all read</button>
          )}
          <button onClick={fetchNotifications} style={{
            background: 'transparent', border: '0.5px solid #333', borderRadius: 6,
            padding: '6px 12px', fontSize: 11, color: '#777', cursor: 'pointer',
          }}>↻ Refresh</button>
        </div>
      </div>

      {/* Filter Pills */}
      <div style={{
        display: 'flex', gap: 8, padding: '12px 28px',
        borderBottom: '0.5px solid #141414', background: '#050505',
      }}>
        {[
          { id: 'all', label: 'All' },
          { id: 'unread', label: `Unread (${unreadCount})` },
          { id: 'invoice_due', label: 'Invoices' },
          { id: 'payment_received', label: 'Payments' },
          { id: 'broadcast', label: 'Announcements' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 11,
            border: `0.5px solid ${filter === f.id ? '#3a2a00' : '#1e1e1e'}`,
            background: filter === f.id ? '#1a1200' : 'transparent',
            color: filter === f.id ? C.gold : '#555', cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}>{f.label}</button>
        ))}
      </div>

      {/* Notifications List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px', background: '#030303' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#444', fontSize: 12 }}>Loading notifications...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#444' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: 13, color: '#666' }}>No notifications yet</div>
            <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>Invoice alerts, payment confirmations, and platform announcements will appear here</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map((n: any) => {
              const cfg = typeConfig[n.type] || { icon: '🔔', color: '#666', label: n.type }
              const isUnread = !n.read_at
              return (
                <div
                  key={n.id}
                  onClick={() => { if (isUnread) markRead(n.id) }}
                  style={{
                    display: 'flex', gap: 14, padding: '14px 16px',
                    borderRadius: 10,
                    border: `0.5px solid ${isUnread ? '#2a2a27' : '#141414'}`,
                    background: isUnread ? '#0a0a0a' : '#060606',
                    cursor: isUnread ? 'pointer' : 'default',
                    transition: 'background 0.1s',
                    opacity: isUnread ? 1 : 0.6,
                  }}
                  onMouseEnter={e => { if (isUnread) e.currentTarget.style.background = '#0f0f0f' }}
                  onMouseLeave={e => { if (isUnread) e.currentTarget.style.background = '#0a0a0a' }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: `${cfg.color}15`, border: `0.5px solid ${cfg.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, flexShrink: 0,
                  }}>{cfg.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <span style={{ fontSize: 13, color: C.text, fontWeight: isUnread ? 600 : 400 }}>{n.title}</span>
                        <span style={{ fontSize: 10, color: cfg.color, marginLeft: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cfg.label}</span>
                      </div>
                      <span style={{ fontSize: 10, color: '#555', whiteSpace: 'nowrap', fontFamily: '"DM Mono", monospace' }}>{formatTime(n.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4, lineHeight: 1.5 }}>{n.message}</div>
                    {n.type === 'invoice_due' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push('/dashboard/billing') }}
                        style={{
                          marginTop: 8, background: C.gold, color: '#000', border: 'none',
                          borderRadius: 5, padding: '5px 12px', fontSize: 10, fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >Pay Now →</button>
                    )}
                  </div>
                  {isUnread && <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, marginTop: 4, flexShrink: 0 }} />}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '0.5px solid #141414', padding: '11px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 11, color: '#444', background: '#050505',
      }}>
        <span>{filtered.length} notification{filtered.length !== 1 ? 's' : ''}</span>
        {unreadCount > 0 && <span>{unreadCount} unread</span>}
      </div>
    </div>
  )
}
