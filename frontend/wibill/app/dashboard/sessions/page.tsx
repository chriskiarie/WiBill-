'use client'
import { useAuth } from '@/lib/auth'
import { useSession } from '@/lib/hooks/useSession'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/context/ToastContext'
import React from 'react'

export default function SessionsPage() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const { sessions, loading, error, kickSession } = useSession(token, { status: 'active', pollInterval: 30000 })

  const handleKick = async (id: string) => {
    if (!confirm('Terminate this session?')) return
    const success = await kickSession(id)
    if (success) {
      showToast('Session terminated', { type: 'success' })
    } else {
      showToast('Failed to terminate', { type: 'error' })
    }
  }

  function Countdown({ expires_at }: { expires_at: string }) {
    const [left, setLeft] = React.useState('')
    const [crit, setCrit] = React.useState(false)
    React.useEffect(() => {
      const tick = () => {
        const diff = Math.max(0, Math.floor((new Date(expires_at).getTime() - Date.now()) / 1000))
        const h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60), s = diff % 60
        setCrit(diff < 300)
        setLeft(h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
      }
      tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
    }, [expires_at])
    return <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: crit ? '#f87171' : '#22c55e' }}>{left || '—'}</span>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Live Sessions" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: '#030303' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, marginBottom: 20 }}>Active Sessions ({sessions.length})</h1>

        {error && (
          <div style={{ padding: 12, background: '#3a1a1a', border: '1px solid #5a2d2d', borderRadius: 6, color: '#ff6b6b', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {loading && sessions.length === 0 ? (
          <LoadingSpinner size="md" label="Loading sessions..." />
        ) : sessions.length === 0 ? (
          <div style={{ color: '#444', fontSize: 14, padding: '40px', textAlign: 'center' }}>
            No active sessions
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sessions.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#080808', borderRadius: 8, border: '0.5px solid #141414' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#666', flex: 1 }}>{s.mac}</span>
                <span style={{ fontSize: 12, color: '#888' }}>{s.package || '—'}</span>
                <Countdown expires_at={s.expires_at} />
                <button onClick={() => handleKick(s.id)} style={{ padding: '4px 12px', background: '#f87171', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
                  Kick
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}