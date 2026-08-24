'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/Topbar'
import { Bell, CheckCheck, RefreshCw, ExternalLink, DollarSign, AlertTriangle, Mail, Megaphone, UserPlus, Wifi, WifiOff, Clock, CircleDot } from 'lucide-react'

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
  broadcast:        { icon: Megaphone, color: C.gold, label: 'Platform Announcement' },
  direct:           { icon: Mail, color: C.gold, label: 'Direct Message' },
  invoice_due:      { icon: DollarSign, color: C.gold, label: 'Invoice Due' },
  payment_received: { icon: CheckCheck, color: C.green, label: 'Payment Received' },
  network_alert:    { icon: WifiOff, color: C.red, label: 'Network Alert' },
  lead_submission:  { icon: UserPlus, color: C.gold, label: 'New Lead' },
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
      <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', background: C.void, padding: 20 }}>

        <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

          {/* Header row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderBottom: `0.5px solid ${C.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <Bell size={18} color={C.text} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -6,
                    minWidth: 16, height: 16, borderRadius: 8,
                    background: C.gold, color: '#000', fontSize: 9,
                    fontWeight: 700, fontFamily: 'DM Mono, monospace',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px', lineHeight: 1,
                  }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Inbox</span>
              {unreadCount > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: C.gold,
                  background: `${C.gold}12`, padding: '2px 8px', borderRadius: 6,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 6, border: `0.5px solid ${C.border}`,
                  background: 'transparent', color: C.gold, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
              <button onClick={fetchNotifications} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 6, border: `0.5px solid ${C.border}`,
                background: 'transparent', color: C.dim, fontSize: 11, cursor: 'pointer',
              }}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{
            display: 'flex', gap: 0, borderBottom: `0.5px solid ${C.border}`,
            paddingLeft: 20,
          }}>
            {[
              { id: 'all', label: 'All', count: notifications.length },
              { id: 'unread', label: 'Unread', count: unreadCount },
              { id: 'network_alert', label: 'Network', count: 0 },
              { id: 'invoice_due', label: 'Invoices', count: 0 },
              { id: 'payment_received', label: 'Payments', count: 0 },
              { id: 'broadcast', label: 'Announcements', count: 0 },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding: '10px 14px', fontSize: 11, fontWeight: 600,
                border: 'none', borderBottom: filter === f.id ? `2px solid ${C.gold}` : '2px solid transparent',
                background: 'transparent',
                color: filter === f.id ? C.gold : C.dim,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                marginBottom: -1, transition: 'all 0.15s',
              }}>
                {f.label}
                {'count' in f && f.count > 0 && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, fontFamily: 'DM Mono, monospace',
                    background: f.id === 'unread' ? `${C.gold}20` : `${C.dim}20`,
                    color: f.id === 'unread' ? C.gold : C.dim,
                    padding: '1px 5px', borderRadius: 6,
                  }}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Notification list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: C.dim, fontSize: 12 }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, background: C.void, borderRadius: 9, margin: '8px 0' }}>
                <Bell size={28} style={{ opacity: 0.15, marginBottom: 10 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                  {filter === 'unread' ? 'All caught up' : 'No notifications'}
                </div>
                <div style={{ fontSize: 11, color: C.mute }}>
                  {filter === 'unread'
                    ? 'You have read all your notifications'
                    : filter === 'network_alert'
                      ? 'Network status alerts will appear here'
                      : 'Invoice alerts, payment confirmations, and announcements will appear here'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {filtered.map((n: any) => {
                  const cfg = typeConfig[n.type] || { icon: Bell, color: '#666', label: n.type }
                  const isUnread = !n.read_at
                  const IconComp = cfg.icon
                  return (
                    <div
                      key={n.id}
                      onClick={() => { if (isUnread) markRead(n.id) }}
                      style={{
                        display: 'flex', gap: 12, padding: '12px 14px',
                        borderRadius: 8,
                        border: `0.5px solid ${isUnread ? C.border2 : 'transparent'}`,
                        background: isUnread ? 'var(--theme-surface)' : 'transparent',
                        cursor: isUnread ? 'pointer' : 'default',
                        opacity: isUnread ? 1 : 0.5,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (isUnread) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = 'var(--theme-card-base)' } }}
                      onMouseLeave={e => { if (isUnread) { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.background = 'var(--theme-surface)' } }}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: 8,
                        background: `${cfg.color}12`, border: `0.5px solid ${cfg.color}25`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <IconComp size={15} color={cfg.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: isUnread ? 600 : 400, color: C.text }}>{n.title}</span>
                          <span style={{ fontSize: 10, color: C.dim, whiteSpace: 'nowrap', fontFamily: '"DM Mono", monospace' }}>{formatTime(n.created_at)}</span>
                        </div>
                        <div style={{ fontSize: 11, color: C.dim, marginTop: 3, lineHeight: 1.4 }}>{n.message}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                          <span style={{ fontSize: 9, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{cfg.label}</span>
                          {n.type === 'invoice_due' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push('/dashboard/billing') }}
                              style={{
                                background: C.gold, color: '#000', border: 'none',
                                borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >Pay Now</button>
                          )}
                        </div>
                      </div>
                      {isUnread && <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.gold, flexShrink: 0, marginTop: 4 }} />}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            borderTop: `0.5px solid ${C.border}`, padding: '10px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 10, color: C.mute,
          }}>
            <span>{filtered.length} notification{filtered.length !== 1 ? 's' : ''}</span>
            {unreadCount > 0 && <span style={{ color: C.gold }}>{unreadCount} unread</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
