'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/context/ToastContext'
import { Search, X, Clock, Wifi, ChevronRight, Gift } from 'lucide-react'

const C = {
  void: 'var(--theme-bg)', base: 'var(--theme-card-base)', border: 'var(--theme-border)', border2: 'var(--theme-border2)',
  text: 'var(--theme-text)', dim: 'var(--theme-dim)', mute: 'var(--theme-mute)',
  gold: 'var(--theme-gold)', green: 'var(--theme-green)', red: 'var(--theme-red)',
}

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
  return <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: crit ? C.red : C.green }}>{left || '—'}</span>
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
  const [compensateSession, setCompensateSession] = useState<any>(null)
  const [compMinutes, setCompMinutes] = useState(15)
  const [compReason, setCompReason] = useState('')
  const [compSubmitting, setCompSubmitting] = useState(false)

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
      <Topbar title="Sessions" subsection={tab === 'active' ? `Active (${activeCount})` : 'History'} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: C.void, display: 'flex', gap: 16 }}>
        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <button onClick={() => setTab('active')} style={{ padding: '7px 16px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: tab === 'active' ? C.gold : 'var(--theme-surface)', border: tab === 'active' ? `0.5px solid ${C.gold}` : `0.5px solid ${C.border2}`, color: tab === 'active' ? '#000' : C.dim, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wifi size={14} /> Active {activeCount > 0 && `(${activeCount})`}
            </button>
            <button onClick={() => setTab('history')} style={{ padding: '7px 16px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: tab === 'history' ? C.gold : 'var(--theme-surface)', border: tab === 'history' ? `0.5px solid ${C.gold}` : `0.5px solid ${C.border2}`, color: tab === 'history' ? '#000' : C.dim }}>
              History
            </button>
            <div style={{ flex: 1 }} />
            <div style={{ position: 'relative', width: '100%', maxWidth: 240 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--theme-faint)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search MAC, IP, or phone..."
                style={{ width: '100%', padding: '7px 10px 7px 30px', background: 'var(--theme-surface)', border: `0.5px solid ${C.border2}`, borderRadius: 6, color: C.text, fontSize: 11, boxSizing: 'border-box', outline: 'none' }} />
            </div>
          </div>

          {error && (
            <div style={{ padding: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: C.red, marginBottom: 12, fontSize: 12 }}>
              {error}
            </div>
          )}

          {loading && sessions.length === 0 ? (
            <LoadingSpinner size="md" label="Loading sessions..." />
          ) : (
            <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr 0.8fr 0.6fr 0.6fr 0.5fr', minWidth: 600, borderBottom: `0.5px solid ${C.border}`, background: 'var(--theme-surface)' }}>
                {['MAC', 'IP', 'Phone', 'Package', tab === 'active' ? 'Remaining' : 'Duration', '', ''].map((h, i) => (
                  <div key={i} style={{ padding: '10px 14px', fontSize: 9, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{h}</div>
                ))}
              </div>
              {filtered.length === 0 ? (
                <div style={{ border: `1px dashed ${C.border2}`, borderRadius: 8, textAlign: 'center', padding: '32px 16px', margin: 12 }}>
                  <div style={{ color: 'var(--theme-faint)', fontSize: 12 }}>{search ? 'No matching sessions' : `No ${tab === 'active' ? 'active' : ''} sessions yet`}</div>
                  <div style={{ fontSize: 10, color: 'var(--theme-faint)', marginTop: 4 }}>
                    {tab === 'active' ? 'Active sessions appear here when users connect to your WiFi' : 'Completed sessions will show in this list'}
                  </div>
                </div>
              ) : filtered.map((s, i) => {
                const mac = s.mac || s.mac_address || '—'
                return (
                  <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr 0.8fr 0.6fr 0.6fr 0.5fr', borderBottom: i < filtered.length - 1 ? `0.5px solid ${C.border}` : 'none', alignItems: 'center' }}>
                    <div style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: C.gold, cursor: 'pointer', fontWeight: 500 }} onClick={() => viewMacDetail(mac)}>
                      {mac}
                    </div>
                    <div style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--theme-faint)' }}>{s.ip_address || '—'}</div>
                    <div style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 10, color: C.dim }}>{(s.phone || s.phone_number || '—')?.replace(/(\d{3})\d{4}(\d{3})/, '$1••••$2')}</div>
                    <div style={{ padding: '10px 14px', fontSize: 11, color: C.dim }}>{s.package || '—'}</div>
                    <div style={{ padding: '10px 14px' }}>
                      {s.status === 'active' ? <Countdown expires_at={s.expires_at} /> : <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#555' }}>{s.status}</span>}
                    </div>
                    <div style={{ padding: '6px 4px' }}>
                      {tab === 'active' && (
                        <button onClick={() => handleKick(s.id)} style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.2)', borderRadius: 4, color: C.red, fontSize: 8, fontWeight: 700, cursor: 'pointer' }}>
                          Kick
                        </button>
                      )}
                    </div>
                    <div style={{ padding: '6px 4px' }}>
                      <button onClick={() => { setCompensateSession(s); setCompMinutes(15); setCompReason('') }} style={{ padding: '4px 8px', background: 'rgba(34,197,94,0.08)', border: '0.5px solid rgba(34,197,94,0.2)', borderRadius: 4, color: C.green, fontSize: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Gift size={10} /> Comp
                      </button>
                    </div>
                  </div>
                )
              })}
              </div>
            </div>
          )}
        </div>

        {/* MAC Detail Drawer */}
        {selectedMac && (
          <div className="session-mac-detail" style={{ width: 340, minWidth: 340, background: 'var(--theme-surface)', border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 20, alignSelf: 'flex-start', position: 'sticky', top: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, fontFamily: 'DM Mono, monospace' }}>{selectedMac}</div>
                  <button onClick={() => { setSelectedMac(null); setMacDetail(null) }} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer' }}><X size={16} /></button>
            </div>

            {detailLoading ? (
              <div style={{ color: '#444', fontSize: 12 }}>Loading...</div>
            ) : macDetail ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  <div style={{ background: 'var(--theme-surface)', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 9, color: 'var(--theme-faint)', marginBottom: 4 }}>SESSIONS</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 600, color: C.text }}>{macDetail.totalSessions}</div>
                  </div>
                  <div style={{ background: 'var(--theme-surface)', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 9, color: 'var(--theme-faint)', marginBottom: 4 }}>TOTAL SPENT</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 600, color: C.green }}>Ksh {macDetail.totalSpent}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 9, color: '#444', marginBottom: 4 }}>FIRST SEEN</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{macDetail.firstSeen ? new Date(macDetail.firstSeen).toLocaleDateString() : '—'}</div>
                </div>

                {macDetail.activeSession && (
                  <div style={{ padding: 10, background: 'rgba(34,197,94,0.06)', border: '0.5px solid rgba(34,197,94,0.15)', borderRadius: 8, marginBottom: 16 }}>
                    <div style={{ fontSize: 9, color: C.green, marginBottom: 4 }}>CURRENTLY ACTIVE</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: C.green }}><Countdown expires_at={macDetail.activeSession.expires_at} /></div>
                  </div>
                )}

                {macDetail.sessions.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Session History</div>
                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                      {macDetail.sessions.slice(0, 20).map((s: any) => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `0.5px solid ${C.border}`, fontSize: 10, color: C.dim }}>
                          <span style={{ color: s.status === 'active' ? C.green : C.dim }}>{s.status}</span>
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

      {/* Compensate Modal */}
      {compensateSession && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setCompensateSession(null)}>
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 24, maxWidth: 400, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}>Compensate Customer</div>
              <button onClick={() => setCompensateSession(null)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: C.dim, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>
                Session: {(compensateSession.mac || compensateSession.mac_address || '').slice(0, 17)}
              </div>
              <div style={{ fontSize: 10, color: C.dim, fontFamily: "'DM Mono', monospace" }}>
                Phone: {(compensateSession.phone || compensateSession.phone_number || '—')}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>Free Minutes *</label>
              <input type="number" min={5} max={1440} value={compMinutes} onChange={e => setCompMinutes(parseInt(e.target.value) || 15)}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--theme-surface)', border: `0.5px solid ${C.border2}`, borderRadius: 7, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>Reason</label>
              <input type="text" value={compReason} onChange={e => setCompReason(e.target.value)} placeholder="e.g. Early disconnection"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--theme-surface)', border: `0.5px solid ${C.border2}`, borderRadius: 7, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={async () => {
                if (compMinutes < 5) { showToast('Minimum 5 minutes', { type: 'error' }); return }
                setCompSubmitting(true)
                try {
                  await api.generateCompensationToken({
                    session_id: compensateSession.id,
                    minutes: compMinutes,
                    reason: compReason || undefined,
                    bound_phone: compensateSession.phone || compensateSession.phone_number || undefined,
                    bound_mac: compensateSession.mac || compensateSession.mac_address || undefined,
                  })
                  showToast(`Compensation token created: ${compMinutes} minutes`, { type: 'success' })
                  setCompensateSession(null)
                } catch (e: any) { showToast(e.message || 'Failed', { type: 'error' }) } finally { setCompSubmitting(false) }
              }} disabled={compSubmitting}
                style={{ flex: 1, padding: '10px', background: compSubmitting ? C.mute : C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 11, fontWeight: 700, cursor: compSubmitting ? 'not-allowed' : 'pointer' }}>
                {compSubmitting ? 'Creating...' : 'Send Compensation'}
              </button>
              <button onClick={() => setCompensateSession(null)} style={{ padding: '10px 16px', background: 'var(--theme-surface)', border: `0.5px solid ${C.border2}`, borderRadius: 7, color: C.dim, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
