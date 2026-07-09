'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/Topbar'
import { Bell, CheckCheck, RefreshCw, ExternalLink, DollarSign, AlertTriangle, Mail, Megaphone } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const C = {
  void: 'var(--theme-bg)',
  base: 'var(--theme-card-base)',
  border: 'var(--theme-border)',
  border2: 'var(--theme-border2)',
  text: 'var(--theme-text)',
  dim: 'var(--theme-dim)',
  mute: 'var(--theme-mute)',
  gold: 'var(--theme-gold)',
  green: 'var(--theme-green)',
  red: 'var(--theme-red)',
}

const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
  broadcast:       { icon: Megaphone, color: '#E8B84B', label: 'Platform Announcement' },
  direct:          { icon: Mail, color: '#3b82f6', label: 'Direct Message' },
  invoice_due:     { icon: DollarSign, color: '#f59e0b', label: 'Invoice Due' },
  payment_received:{ icon: CheckCheck, color: '#22c55e', label: 'Payment Received' },
  network_alert:   { icon: AlertTriangle, color: '#ef4444', label: 'Network Alert' },
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
      <Topbar title="Notifications" />
      <div style={{ flex: 1, overflowY: 'auto', background: C.void, display: 'flex', flexDirection: 'column' }}>

        {/* Filter + actions bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 28px', borderBottom: '1px solid var(--theme-border)',
          background: 'var(--theme-card-base)',
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: `Unread` },
              { id: 'invoice_due', label: 'Invoices' },
              { id: 'payment_received', label: 'Payments' },
              { id: 'broadcast', label: 'Announcements' },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 11,
                border: `0.5px solid ${filter === f.id ? 'var(--theme-gold)' : 'var(--theme-border)'}`,
                background: filter === f.id ? 'rgba(232,184,75,0.1)' : 'transparent',
                color: filter === f.id ? 'var(--theme-gold)' : 'var(--theme-dim)',
                cursor: 'pointer',
              }}>{f.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 6, border: '1px solid var(--theme-border)',
                background: 'transparent', color: 'var(--theme-dim)', fontSize: 11, cursor: 'pointer',
              }}>
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
            <button onClick={fetchNotifications} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 6, border: '1px solid var(--theme-border)',
              background: 'transparent', color: 'var(--theme-dim)', fontSize: 11, cursor: 'pointer',
            }}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--theme-dim)', fontSize: 13 }}>Loading notifications...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 80, color: 'var(--theme-dim)' }}>
              <Bell size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontSize: 14, color: 'var(--theme-text)' }}>No notifications yet</div>
              <div style={{ fontSize: 12, color: 'var(--theme-dim)', marginTop: 4 }}>Invoice alerts, payment confirmations, and platform announcements will appear here</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtered.map((n: any) => {
                const cfg = typeConfig[n.type] || { icon: Bell, color: '#666', label: n.type }
                const isUnread = !n.read_at
                const IconComp = cfg.icon
                return (
                  <div
                    key={n.id}
                    onClick={() => { if (isUnread) markRead(n.id) }}
                    style={{
                      display: 'flex', gap: 14, padding: '14px 16px',
                      borderRadius: 10,
                      border: `0.5px solid ${isUnread ? 'var(--theme-border2)' : 'var(--theme-border)'}`,
                      background: isUnread ? 'var(--theme-card-base)' : 'transparent',
                      cursor: isUnread ? 'pointer' : 'default',
                      opacity: isUnread ? 1 : 0.55,
                    }}
                    onMouseEnter={e => { if (isUnread) e.currentTarget.style.borderColor = 'var(--theme-border)' }}
                    onMouseLeave={e => { if (isUnread) e.currentTarget.style.borderColor = 'var(--theme-border2)' }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: `${cfg.color}15`, border: `0.5px solid ${cfg.color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <IconComp size={16} color={cfg.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div>
                          <span style={{ fontSize: 13, color: 'var(--theme-text)', fontWeight: isUnread ? 600 : 400 }}>{n.title}</span>
                          <span style={{ fontSize: 10, color: cfg.color, marginLeft: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cfg.label}</span>
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--theme-dim)', whiteSpace: 'nowrap', fontFamily: '"DM Mono", monospace' }}>{formatTime(n.created_at)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--theme-dim)', marginTop: 4, lineHeight: 1.5 }}>{n.message}</div>
                      {n.type === 'invoice_due' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push('/dashboard/billing') }}
                          style={{
                            marginTop: 8, background: 'var(--theme-gold)', color: '#000', border: 'none',
                            borderRadius: 5, padding: '5px 12px', fontSize: 10, fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >Pay Now →</button>
                      )}
                    </div>
                    {isUnread && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--theme-gold)', marginTop: 4, flexShrink: 0 }} />}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid var(--theme-border)', padding: '11px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 11, color: 'var(--theme-dim)', background: 'var(--theme-card-base)',
        }}>
          <span>{filtered.length} notification{filtered.length !== 1 ? 's' : ''}</span>
          {unreadCount > 0 && <span>{unreadCount} unread</span>}
        </div>
      </div>
    </div>
  )
}
