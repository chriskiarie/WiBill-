'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { useToast } from '@/context/ToastContext'
import { Users, Wifi, Tv, PauseCircle, PlayCircle, AlertTriangle, X, Plus, Search, RefreshCw, Router, Download, MoreHorizontal, ChevronRight, Check } from 'lucide-react'

const C = {
  void: 'var(--theme-bg)', base: 'var(--theme-card-base)', border: 'var(--theme-border)', border2: 'var(--theme-border2)',
  text: 'var(--theme-text)', dim: 'var(--theme-dim)', mute: 'var(--theme-mute)',
  gold: 'var(--theme-gold)', green: 'var(--theme-green)', red: 'var(--theme-red)',
}

function ksh(n: number) {
  return `Ksh ${(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmt(n: number) {
  return (n || 0).toLocaleString()
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 8) return phone || '—'
  return `${phone.slice(0, 4)} ••• ${phone.slice(-4)}`
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: 'Active', color: C.green, bg: 'rgba(34,197,94,0.08)' },
    paused: { label: 'Paused', color: C.gold, bg: 'rgba(232,184,75,0.08)' },
    suspended: { label: 'Suspended', color: C.red, bg: 'rgba(239,68,68,0.08)' },
    overdue: { label: 'Overdue', color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
    pending_suspension: { label: 'Pending', color: C.gold, bg: 'rgba(232,184,75,0.08)' },
  }
  const s = map[status] || { label: status, color: C.dim, bg: 'var(--theme-surface)' }
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
      fontFamily: 'DM Mono, monospace', textTransform: 'uppercase',
      background: s.bg, color: s.color,
    }}>{s.label}</span>
  )
}

const inputSx: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: C.void,
  border: `0.5px solid ${C.mute}`, borderRadius: 7, color: C.text,
  fontSize: 13, boxSizing: 'border-box', outline: 'none',
}

const labelSx: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: C.dim,
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
  fontFamily: 'Inter, sans-serif',
}

interface SubscriberForm {
  client_name: string; phone_number: string; networking_ip: string; plan_id: string;
  networking_mac: string; networking_vlan: string; networking_interface: string;
  networking_gateway: string; id_number: string; email: string;
  installation_address: string; notes: string; billing_cycle_date: number;
  billing_cycle_days: number; data_cap_gb: string;
}

export default function ClientsPage() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [subscribers, setSubscribers] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [availableIps, setAvailableIps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'wifi' | 'tv'>('all')
  const [search, setSearch] = useState('')
  const [showDrawer, setShowDrawer] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [plansLoading, setPlansLoading] = useState(false)

  const [form, setForm] = useState<SubscriberForm>({
    client_name: '', phone_number: '', networking_ip: '', plan_id: '',
    networking_mac: '', networking_vlan: '', networking_interface: '',
    networking_gateway: '', id_number: '', email: '',
    installation_address: '', notes: '', billing_cycle_date: 1,
    billing_cycle_days: 30, data_cap_gb: '',
  })

  const [planForm, setPlanForm] = useState({
    name: '', price_ksh: 0, bandwidth_down_mbps: 10, bandwidth_up_mbps: 5,
    client_type: 'wifi', billing_cycle_days: 30, description: '',
  })

  const loadAll = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [subData, planData, statsData] = await Promise.all([
        api.getSubscribers({ client_type: tab !== 'all' ? tab : undefined, search: search || undefined }),
        api.getSubscriberPlans(),
        api.getSubscriberStats(),
      ])
      setSubscribers(subData.items || [])
      setTotal(subData.total || 0)
      setPlans(Array.isArray(planData) ? planData : [])
      setStats(statsData)
    } catch (e: any) {
      showToast(e.message || 'Failed to load', { type: 'error' })
    } finally { setLoading(false) }
  }, [token, tab, search, showToast])

  useEffect(() => { loadAll() }, [loadAll])

  const loadAvailableIps = async () => {
    try {
      const data = await api.getAvailableIps(tab === 'tv' ? 'tv' : 'wifi')
      setAvailableIps(data.available_ips || [])
    } catch {}
  }

  const openCreate = () => {
    setForm({
      client_name: '', phone_number: '', networking_ip: '', plan_id: '',
      networking_mac: '', networking_vlan: '', networking_interface: '',
      networking_gateway: '', id_number: '', email: '',
      installation_address: '', notes: '', billing_cycle_date: 1,
      billing_cycle_days: 30, data_cap_gb: '',
    })
    loadAvailableIps()
    setShowDrawer(true)
  }

  const handleSubmit = async () => {
    if (!form.client_name || !form.phone_number || !form.networking_ip) {
      showToast('Name, phone, and IP are required', { type: 'error' })
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        plan_id: form.plan_id || null,
        networking_vlan: form.networking_vlan ? parseInt(form.networking_vlan) : null,
        billing_cycle_date: form.billing_cycle_date,
        billing_cycle_days: form.billing_cycle_days,
        data_cap_gb: form.data_cap_gb ? parseFloat(form.data_cap_gb) : null,
      }
      await api.createSubscriber(payload)
      showToast('Subscriber created', { type: 'success' })
      setShowDrawer(false)
      loadAll()
    } catch (e: any) {
      showToast(e.message || 'Failed to create', { type: 'error' })
    } finally { setSubmitting(false) }
  }

  const handleAction = async (id: string, action: 'pause' | 'resume' | 'suspend' | 'activate') => {
    setActionLoading(id)
    try {
      const actions: Record<string, () => Promise<any>> = {
        pause: () => api.pauseSubscriber(id),
        resume: () => api.resumeSubscriber(id),
        suspend: () => api.suspendSubscriber(id),
        activate: () => api.activateSubscriber(id),
      }
      await actions[action]()
      showToast(`Subscriber ${action}d`, { type: 'success' })
      loadAll()
    } catch (e: any) {
      showToast(e.message || `Failed to ${action}`, { type: 'error' })
    } finally { setActionLoading(null) }
  }

  const handleCreatePlan = async () => {
    if (!planForm.name || !planForm.price_ksh) {
      showToast('Name and price required', { type: 'error' })
      return
    }
    setPlansLoading(true)
    try {
      await api.createSubscriberPlan(planForm)
      showToast('Plan created', { type: 'success' })
      setShowPlanModal(false)
      const data = await api.getSubscriberPlans()
      setPlans(Array.isArray(data) ? data : [])
    } catch (e: any) {
      showToast(e.message || 'Failed to create plan', { type: 'error' })
    } finally { setPlansLoading(false) }
  }

  const handleReconcile = async () => {
    try {
      const res = await api.reconcileSubscribers()
      const disc = res.discrepancies || []
      if (disc.length > 0) {
        showToast(`${disc.length} discrepancy(ies) found — check router`, { type: 'error' })
      } else {
        showToast('All in sync with router', { type: 'success' })
      }
    } catch (e: any) {
      showToast(e.message || 'Reconciliation failed', { type: 'error' })
    }
  }

  const filteredPlans = plans.filter(p => {
    if (tab === 'all') return true
    return p.client_type === tab
  })

  const statsCards = stats ? [
    { label: 'Total Clients', value: fmt(stats.total), sub: `${stats.active} active · ${stats.online} online`, color: C.text },
    { label: 'Active', value: fmt(stats.active), sub: `${stats.online} online now`, color: C.green },
    { label: 'Suspended', value: fmt(stats.suspended), sub: `${stats.overdue} overdue · ${stats.paused} paused`, color: stats.suspended > 0 ? C.red : C.dim },
    { label: 'Data Used', value: `${(stats.total_data_gb_month || 0).toFixed(1)} GB`, sub: 'This month', color: C.gold },
  ] : []

  const isBusy = (id: string) => actionLoading === id

  return (
    <div style={{
      background: C.void, color: C.text, minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, sans-serif',
      display: 'flex', flexDirection: 'column', flex: 1,
    }}>
      <Topbar title="Monthly Clients" />

      <div style={{
        flex: 1, overflowY: 'auto', padding: '28px 32px',
        maxWidth: 1240, margin: '0 auto', width: '100%',
      }}>
        {/* ═══ STATS CARDS ═══ */}
        {statsCards.length > 0 && (
          <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {statsCards.map((c, i) => (
              <div key={i} style={{
                background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11,
                padding: 16, position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'Inter, sans-serif' }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 22, fontFamily: 'DM Mono, monospace', fontWeight: 500, color: c.color, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                  {c.value}
                </div>
                <div style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: C.dim, marginTop: 4 }}>
                  {c.sub}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ TOOLBAR ═══ */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16, gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'wifi', 'tv'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
                background: tab === t ? 'rgba(232,184,75,0.1)' : 'transparent',
                border: tab === t ? '0.5px solid rgba(232,184,75,0.2)' : `0.5px solid ${C.border}`,
                color: tab === t ? C.gold : C.dim, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {t === 'all' ? <Users size={12} /> : t === 'wifi' ? <Wifi size={12} /> : <Tv size={12} />}
                {t === 'all' ? 'All' : t === 'wifi' ? 'Home WiFi' : 'TV'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative', width: 200 }}>
              <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.dim }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..."
                style={{
                  width: '100%', padding: '8px 10px 8px 28px', borderRadius: 8,
                  border: `0.5px solid ${C.border}`, background: C.base, color: C.text,
                  fontSize: 12, outline: 'none', fontFamily: 'Inter, sans-serif',
                  boxSizing: 'border-box',
                }} />
            </div>
            <button onClick={loadAll} title="Refresh" style={{
              width: 28, height: 28, borderRadius: 6, border: `0.5px solid ${C.border}`,
              background: 'transparent', color: C.dim, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', padding: 0,
            }}>
              <RefreshCw size={12} />
            </button>
            <button onClick={handleReconcile} title="Reconcile with router" style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
              borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: 'DM Mono, monospace',
              border: `0.5px solid ${C.border}`, background: C.base, color: C.dim, cursor: 'pointer',
            }}>
              <Router size={11} /> Sync
            </button>
            <button onClick={() => setShowPlanModal(true)} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
              borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: 'DM Mono, monospace',
              border: `0.5px solid ${C.border}`, background: C.base, color: C.dim, cursor: 'pointer',
            }}>
              <Download size={11} /> Plans
            </button>
            <button onClick={openCreate} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: C.gold, color: C.void, border: 'none', cursor: 'pointer',
              fontFamily: '"Space Grotesk", sans-serif',
            }}>
              <Plus size={14} /> Add Client
            </button>
          </div>
        </div>

        {/* ═══ SUBSCRIBER TABLE ═══ */}
        <div style={{
          background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `0.5px solid ${C.border}` }}>
                  {['Account', 'Client Name', 'IP / VLAN', 'Plan', 'Phone', 'Status', 'Online', 'Data Used', 'Actions'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '10px 14px', fontWeight: 700,
                      color: C.dim, fontSize: 10, fontFamily: 'Inter, sans-serif',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: C.dim }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(232,184,75,0.15)', borderTop: '2px solid #E8B84B', margin: '0 auto 10px', animation: 'spin 1s linear infinite' }} />
                    Loading...
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </td></tr>
                ) : subscribers.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center' }}>
                    <Users size={20} color={C.mute} style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dim }}>No monthly clients yet</div>
                    <div style={{ fontSize: 11, color: C.mute, marginTop: 4 }}>
                      Create subscriber plans and add clients to get started
                    </div>
                    <button onClick={openCreate} style={{
                      marginTop: 12, padding: '8px 18px', borderRadius: 8,
                      background: C.gold, color: C.void, border: 'none',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif',
                    }}>
                      <Plus size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Add Client
                    </button>
                  </td></tr>
                ) : subscribers.map(s => {
                  const outOfSync = s.out_of_sync
                  return (
                    <tr key={s.id} style={{
                      borderBottom: `0.5px solid ${C.border}`,
                      transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: C.text }}>
                          {outOfSync && <AlertTriangle size={10} color={C.red} style={{ verticalAlign: 'middle', marginRight: 4 }} />}
                          {s.account_number}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: C.text }}>{s.client_name}</div>
                        <div style={{ fontSize: 10, color: C.dim, fontFamily: 'DM Mono, monospace' }}>
                          {s.phone_number ? maskPhone(s.phone_number) : '—'}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {s.networking_ip}
                        {s.networking_vlan && <span style={{ color: C.dim }}> · VLAN {s.networking_vlan}</span>}
                        {s.networking_mac && <div style={{ fontSize: 9, color: C.mute }}>{s.networking_mac}</div>}
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {s.plan_name ? (
                          <div>
                            <div style={{ color: C.text, fontSize: 11 }}>{s.plan_name}</div>
                            {s.amount_due_ksh > 0 && (
                              <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.dim }}>
                                {ksh(s.amount_due_ksh)}/mo
                              </div>
                            )}
                          </div>
                        ) : <span style={{ color: C.mute }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 11, whiteSpace: 'nowrap', color: C.dim }}>
                        {maskPhone(s.phone_number)}
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {statusBadge(s.status)}
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 600,
                          color: s.online_status === 'online' ? C.green : C.dim,
                        }}>
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: s.online_status === 'online' ? C.green : C.mute,
                            display: 'inline-block',
                          }} />
                          {s.online_status === 'online' ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 11, whiteSpace: 'nowrap', color: C.dim }}>
                        <div>{(s.data_used_today_gb || 0).toFixed(2)} GB today</div>
                        <div style={{ fontSize: 9, color: C.mute }}>{(s.data_used_month_gb || 0).toFixed(1)} GB month</div>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {s.status === 'active' && (
                            <>
                              <button onClick={() => handleAction(s.id, 'pause')} disabled={isBusy(s.id)} title="Pause"
                                style={actionBtnStyle}>
                                <PauseCircle size={12} />
                              </button>
                              <button onClick={() => handleAction(s.id, 'suspend')} disabled={isBusy(s.id)} title="Suspend"
                                style={{ ...actionBtnStyle, color: C.red }}>
                                <AlertTriangle size={12} />
                              </button>
                            </>
                          )}
                          {(s.status === 'paused' || s.status === 'suspended') && (
                            <button onClick={() => handleAction(s.id, 'resume')} disabled={isBusy(s.id)} title="Resume"
                              style={{ ...actionBtnStyle, color: C.green }}>
                              <PlayCircle size={12} />
                            </button>
                          )}
                          {s.out_of_sync && (
                            <button onClick={() => handleAction(s.id, 'activate')} disabled={isBusy(s.id)} title="Re-activate on router"
                              style={{ ...actionBtnStyle, color: C.gold }}>
                              <RefreshCw size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {total > 50 && (
            <div style={{ padding: '10px 14px', fontSize: 11, color: C.dim, borderTop: `0.5px solid ${C.border}`, textAlign: 'center' }}>
              Showing {subscribers.length} of {total} clients
            </div>
          )}
        </div>
      </div>

      {/* ═══ CREATE SUBSCRIBER DRAWER ═══ */}
      {showDrawer && (
        <>
          <div onClick={() => setShowDrawer(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
            width: '100%', maxWidth: 460, background: C.base,
            borderLeft: '0.5px solid rgba(232,184,75,0.08)',
            boxShadow: '-10px 0 40px rgba(0,0,0,0.4)',
            transform: 'translateX(0)', transition: 'transform 0.25s ease',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ padding: '20px 20px 0', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 18, fontWeight: 700, color: C.text }}>
                    Add Client
                  </div>
                  <div style={{ fontSize: 11, color: C.dim, fontFamily: 'Inter, sans-serif', marginTop: 2 }}>
                    Create a new monthly subscriber
                  </div>
                </div>
                <button onClick={() => setShowDrawer(false)} style={{
                  width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.06)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.dim,
                }}>
                  <X size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={labelSx}>Client Name *</div>
                  <input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="John Doe" style={inputSx} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={labelSx}>Phone Number *</div>
                    <input value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} placeholder="254712345678" style={inputSx} />
                  </div>
                  <div>
                    <div style={labelSx}>ID Number</div>
                    <input value={form.id_number} onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))} placeholder="12345678" style={inputSx} />
                  </div>
                </div>

                <div>
                  <div style={labelSx}>Plan</div>
                  <select value={form.plan_id} onChange={e => setForm(f => ({ ...f, plan_id: e.target.value }))} style={inputSx}>
                    <option value="">No plan (custom)</option>
                    {filteredPlans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — {ksh(p.price_ksh)}/mo</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={labelSx}>Static IP Address *</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input value={form.networking_ip} onChange={e => setForm(f => ({ ...f, networking_ip: e.target.value }))}
                      placeholder="192.168.88.50" style={{ ...inputSx, flex: 1 }} />
                    {availableIps.length > 0 && (
                      <select onChange={e => {
                        if (e.target.value) {
                          const ip = availableIps.find(i => i.ip === e.target.value)
                          if (ip) setForm(f => ({
                            ...f, networking_ip: ip.ip, networking_gateway: ip.gateway,
                            networking_vlan: ip.vlan_id?.toString() || '',
                            networking_interface: ip.interface_name || '',
                          }))
                        }
                      }} style={{
                        ...inputSx, width: 'auto', minWidth: 100, padding: '10px 8px',
                      }}>
                        <option value="">Auto-assign</option>
                        {availableIps.slice(0, 20).map(i => (
                          <option key={i.ip} value={i.ip}>{i.ip} ({i.pool_name})</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={labelSx}>MAC Address</div>
                    <input value={form.networking_mac} onChange={e => setForm(f => ({ ...f, networking_mac: e.target.value }))} placeholder="AA:BB:CC:DD:EE:FF" style={inputSx} />
                  </div>
                  <div>
                    <div style={labelSx}>VLAN ID</div>
                    <input value={form.networking_vlan} onChange={e => setForm(f => ({ ...f, networking_vlan: e.target.value }))} placeholder="100" style={inputSx} />
                  </div>
                  <div>
                    <div style={labelSx}>Interface</div>
                    <input value={form.networking_interface} onChange={e => setForm(f => ({ ...f, networking_interface: e.target.value }))} placeholder="ether2" style={inputSx} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={labelSx}>Gateway</div>
                    <input value={form.networking_gateway} onChange={e => setForm(f => ({ ...f, networking_gateway: e.target.value }))} placeholder="192.168.88.1" style={inputSx} />
                  </div>
                  <div>
                    <div style={labelSx}>Email</div>
                    <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" style={inputSx} />
                  </div>
                </div>

                <div>
                  <div style={labelSx}>Installation Address</div>
                  <input value={form.installation_address} onChange={e => setForm(f => ({ ...f, installation_address: e.target.value }))} placeholder="Plot 42, Kimathi Street" style={inputSx} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={labelSx}>Billing Day</div>
                    <select value={form.billing_cycle_date} onChange={e => setForm(f => ({ ...f, billing_cycle_date: parseInt(e.target.value) }))} style={inputSx}>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div style={labelSx}>Cycle (days)</div>
                    <select value={form.billing_cycle_days} onChange={e => setForm(f => ({ ...f, billing_cycle_days: parseInt(e.target.value) }))} style={inputSx}>
                      <option value={30}>30</option>
                      <option value={15}>15</option>
                      <option value={7}>7</option>
                    </select>
                  </div>
                  <div>
                    <div style={labelSx}>Data Cap (GB)</div>
                    <input value={form.data_cap_gb} onChange={e => setForm(f => ({ ...f, data_cap_gb: e.target.value }))} placeholder="Unlimited" style={inputSx} />
                  </div>
                </div>

                <div>
                  <div style={labelSx}>Notes</div>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." rows={2} style={{
                    ...inputSx, resize: 'vertical', fontFamily: 'Inter, sans-serif',
                  }} />
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 20px', borderTop: `0.5px solid ${C.border}` }}>
              <button onClick={handleSubmit} disabled={submitting} style={{
                width: '100%', padding: '12px', borderRadius: 8, border: 'none',
                background: submitting ? C.mute : C.gold, color: submitting ? C.dim : C.void,
                fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: '"Space Grotesk", sans-serif',
              }}>
                {submitting ? 'Creating...' : 'Create Client'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══ PLANS MODAL ═══ */}
      {showPlanModal && (
        <div onClick={() => setShowPlanModal(false)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)', padding: 24,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 520, background: 'rgba(10,10,10,0.85)',
            backdropFilter: 'blur(24px)', border: '0.5px solid rgba(232,184,75,0.15)',
            borderRadius: 16, padding: '24px 20px 20px',
            boxShadow: '0 0 60px rgba(232,184,75,0.04)',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 18, fontWeight: 700, color: C.text }}>
                  Subscriber Plans
                </div>
                <div style={{ fontSize: 11, color: C.dim, fontFamily: 'Inter, sans-serif', marginTop: 2 }}>
                  Define monthly bandwidth plans for WiFi and TV clients
                </div>
              </div>
              <button onClick={() => setShowPlanModal(false)} style={{
                width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.06)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.dim,
              }}>
                <X size={14} />
              </button>
            </div>

            {/* Create plan form */}
            <div style={{ background: 'var(--theme-surface)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 12, fontFamily: 'Inter, sans-serif' }}>
                New Plan
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <input value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} placeholder="Plan name" style={inputSx} />
                </div>
                <div>
                  <input value={planForm.price_ksh || ''} onChange={e => setPlanForm(f => ({ ...f, price_ksh: parseFloat(e.target.value) || 0 }))} placeholder="Price (Ksh)" type="number" style={inputSx} />
                </div>
                <div>
                  <select value={planForm.client_type} onChange={e => setPlanForm(f => ({ ...f, client_type: e.target.value }))} style={inputSx}>
                    <option value="wifi">Home WiFi</option>
                    <option value="tv">TV/IPTV</option>
                  </select>
                </div>
                <div>
                  <input value={planForm.bandwidth_down_mbps || ''} onChange={e => setPlanForm(f => ({ ...f, bandwidth_down_mbps: parseInt(e.target.value) || 0 }))} placeholder="Download (Mbps)" type="number" style={inputSx} />
                </div>
                <div>
                  <input value={planForm.bandwidth_up_mbps || ''} onChange={e => setPlanForm(f => ({ ...f, bandwidth_up_mbps: parseInt(e.target.value) || 0 }))} placeholder="Upload (Mbps)" type="number" style={inputSx} />
                </div>
              </div>
              <button onClick={handleCreatePlan} disabled={plansLoading} style={{
                marginTop: 10, width: '100%', padding: '10px', borderRadius: 7, border: 'none',
                background: plansLoading ? C.mute : C.gold, color: plansLoading ? C.dim : C.void,
                fontSize: 12, fontWeight: 700, cursor: plansLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}>
                {plansLoading ? 'Creating...' : 'Create Plan'}
              </button>
            </div>

            {/* Plan list */}
            {plans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 16, color: C.dim, fontSize: 12 }}>
                No plans yet. Create your first plan above.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {plans.map(p => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 8,
                    background: 'var(--theme-surface)', border: `0.5px solid ${C.border}`,
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                        {p.client_type === 'tv' ? <Tv size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> : <Wifi size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />}
                        {p.name}
                      </div>
                      <div style={{ fontSize: 10, color: C.dim, fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
                        {p.bandwidth_down_mbps}/{p.bandwidth_up_mbps} Mbps · {p.billing_cycle_days}d cycle
                      </div>
                    </div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 500, color: C.gold }}>
                      {ksh(p.price_ksh)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const actionBtnStyle: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 6,
  border: `0.5px solid ${C.border}`, background: 'transparent',
  cursor: 'pointer', display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center',
  color: C.dim, padding: 0,
}
