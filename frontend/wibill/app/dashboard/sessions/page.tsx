'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/context/ToastContext'
import { Search, X, Clock, Wifi, ChevronRight } from 'lucide-react'

interface Session {
  id: string; mac?: string; mac_address?: string; ip_address?: string
  phone?: string; phone_number?: string; package?: string; package_id?: string
  expires_at: string; created_at: string; status: string
  activated_at?: string; disconnected_at?: string
}

function Countdown({ expires_at }: { expires_at: string }) {
  const [left, setLeft] = useState('')
  const [crit, setCrit] = useState(false)
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(expires_at).getTime() - Date.now()) / 1000))
      const h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60), s = diff % 60
      setCrit(diff < 300)
      setLeft(h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [expires_at])
  return <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: crit ? '#f87171' : '#22c55e' }}>{left || '—'}</span>
}

export default function SessionsPage() {
  const { token } = useAuth()
  const { showToast } = useToast()

  const [tab, setTab] = useState<'active' | 'history'>('active')
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedMac, setSelectedMac] = useState<string | null>(null)
  const [macDetail, setMacDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchSessions = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await api.getSessions()
      setSessions(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) { setError((err as Error).message); setSessions([]) } finally { setLoading(false) }
  }, [token])

  useEffect(() => { fetchSessions() }, [fetchSessions])
  useEffect(() => { if (tab === 'active') { const t = setInterval(fetchSessions, 30000); return () => clearInterval(t) } }, [tab, fetchSessions])

  const handleKick = async (id: string) => {
    if (!confirm('Terminate this session?')) return
    try {
      await api.terminateSession(id)
      setSessions(s => s.filter(x => x.id !== id))
      showToast('Session terminated', { type: 'success' })
    } catch { showToast('Failed to terminate', { type: 'error' }) }
  }

  const viewMacDetail = async (mac: string) => {
    setSelectedMac(mac); setDetailLoading(true)
    try {
      const allSessions = await api.getSessions()
      const macSessions = (Array.isArray(allSessions) ? allSessions : []).filter((s: any) => (s.mac || s.mac_address) === mac)
      const totalSpent = macSessions.reduce((sum: number, s: any) => sum + (s.amount_ksh || 0), 0)
      const now = new Date()
      const firstSeen = macSessions.length > 0 ? macSessions[macSessions.length - 1].created_at : null
      const activeSession = macSessions.find((s: any) => s.status === 'active')
      setMacDetail({ mac, sessions: macSessions, totalSpent, firstSeen, activeSession, totalSessions: macSessions.length })
    } catch { /* ignore */ } finally { setDetailLoading(false) }
  }

  const filtered = sessions.filter(s => {
    if (tab === 'active' && s.status !== 'active') return false
    if (tab === 'history' && s.status === 'active') return false
    const mac = (s.mac || s.mac_address || '').toLowerCase()
    const ip = (s.ip_address || '').toLowerCase()
    const phone = (s.phone || s.phone_number || '').toLowerCase()
    const q = search.toLowerCase()
    return mac.includes(q) || ip.includes(q) || phone.includes(q)
  })

  const activeCount = sessions.filter(s => s.status === 'active').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title={tab === 'active' ? `Live Sessions (${activeCount})` : 'Session History'} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: '#030303', display: 'flex', gap: 16 }}>
        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => setTab('active')} style={{ padding: '7px 16px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: tab === 'active' ? '#3b82f6' : '#0a0a0a', border: tab === 'active' ? '0.5px solid #3b82f6' : '0.5px solid #1a1a1a', color: tab === 'active' ? '#fff' : '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wifi size={14} /> Active {activeCount > 0 && `(${activeCount})`}
            </button>
            <button onClick={() => setTab('history')} style={{ padding: '7px 16px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: tab === 'history' ? '#3b82f6' : '#0a0a0a', border: tab === 'history' ? '0.5px solid #3b82f6' : '0.5px solid #1a1a1a', color: tab === 'history' ? '#fff' : '#555' }}>
              History
            </button>
            <div style={{ flex: 1 }} />
            <div style={{ position: 'relative', width: 240 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#333' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search MAC, IP, or phone..."
                style={{ width: '100%', padding: '7px 10px 7px 30px', background: '#080808', border: '0.5px solid #1a1a1a', borderRadius: 6, color: '#e0e0e0', fontSize: 11, boxSizing: 'border-box', outline: 'none' }} />
            </div>
          </div>

          {error && (
            <div style={{ padding: 10, background: '#3a1a1a', border: '1px solid #5a2d2d', borderRadius: 6, color: '#ff6b6b', marginBottom: 12, fontSize: 12 }}>
              {error}
            </div>
          )}

          {loading && sessions.length === 0 ? (
            <LoadingSpinner size="md" label="Loading sessions..." />
          ) : (
            <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr 0.8fr 0.6fr 0.5fr', borderBottom: '0.5px solid #101010', background: '#0a0a0a' }}>
                {['MAC', 'IP', 'Phone', 'Package', tab === 'active' ? 'Remaining' : 'Duration', ''].map((h, i) => (
                  <div key={i} style={{ padding: '10px 14px', fontSize: 9, fontWeight: 700, color: '#2a2a2a', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{h}</div>
                ))}
              </div>
              {filtered.length === 0 ? (
                <div style={{ border: '1px dashed #1a1a1a', borderRadius: 8, textAlign: 'center', padding: '32px 16px', margin: 12 }}>
                  <div style={{ color: '#333', fontSize: 12 }}>{search ? 'No matching sessions' : `No ${tab === 'active' ? 'active' : ''} sessions yet`}</div>
                  <div style={{ fontSize: 10, color: '#1a1a1a', marginTop: 4 }}>
                    {tab === 'active' ? 'Active sessions appear here when users connect to your WiFi' : 'Completed sessions will show in this list'}
                  </div>
                </div>
              ) : filtered.map((s, i) => {
                const mac = s.mac || s.mac_address || '—'
                return (
                  <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr 0.8fr 0.6fr 0.5fr', borderBottom: i < filtered.length - 1 ? '0.5px solid #0a0a0a' : 'none', alignItems: 'center' }}>
                    <div style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#3b82f6', cursor: 'pointer', fontWeight: 500 }} onClick={() => viewMacDetail(mac)}>
                      {mac}
                    </div>
                    <div style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#555' }}>{s.ip_address || '—'}</div>
                    <div style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#666' }}>{(s.phone || s.phone_number || '—')?.replace(/(\d{3})\d{4}(\d{3})/, '$1••••$2')}</div>
                    <div style={{ padding: '10px 14px', fontSize: 11, color: '#888' }}>{s.package || '—'}</div>
                    <div style={{ padding: '10px 14px' }}>
                      {s.status === 'active' ? <Countdown expires_at={s.expires_at} /> : <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#555' }}>{s.status}</span>}
                    </div>
                    <div style={{ padding: '6px 10px' }}>
                      {tab === 'active' && (
                        <button onClick={() => handleKick(s.id)} style={{ padding: '4px 10px', background: '#3a1a1a', border: '0.5px solid #5a2d2d', borderRadius: 4, color: '#f87171', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>
                          Kick
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* MAC Detail Drawer */}
        {selectedMac && (
          <div style={{ width: 340, minWidth: 340, background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 20, alignSelf: 'flex-start', position: 'sticky', top: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', fontFamily: 'DM Mono, monospace' }}>{selectedMac}</div>
              <button onClick={() => { setSelectedMac(null); setMacDetail(null) }} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><X size={16} /></button>
            </div>

            {detailLoading ? (
              <div style={{ color: '#444', fontSize: 12 }}>Loading...</div>
            ) : macDetail ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  <div style={{ background: '#0a0a0a', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 9, color: '#444', marginBottom: 4 }}>SESSIONS</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 600, color: '#e0e0e0' }}>{macDetail.totalSessions}</div>
                  </div>
                  <div style={{ background: '#0a0a0a', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 9, color: '#444', marginBottom: 4 }}>TOTAL SPENT</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 600, color: '#22c55e' }}>Ksh {macDetail.totalSpent}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 9, color: '#444', marginBottom: 4 }}>FIRST SEEN</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{macDetail.firstSeen ? new Date(macDetail.firstSeen).toLocaleDateString() : '—'}</div>
                </div>

                {macDetail.activeSession && (
                  <div style={{ padding: 10, background: '#030d06', border: '0.5px solid #0a2214', borderRadius: 8, marginBottom: 16 }}>
                    <div style={{ fontSize: 9, color: '#22c55e', marginBottom: 4 }}>CURRENTLY ACTIVE</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#22c55e' }}><Countdown expires_at={macDetail.activeSession.expires_at} /></div>
                  </div>
                )}

                {macDetail.sessions.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#2a2a2a', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Session History</div>
                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                      {macDetail.sessions.slice(0, 20).map((s: any) => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid #0a0a0a', fontSize: 10, color: '#666' }}>
                          <span style={{ color: s.status === 'active' ? '#22c55e' : '#888' }}>{s.status}</span>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9 }}>{new Date(s.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
