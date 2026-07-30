'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { useToast } from '@/context/ToastContext'
import { Users, Wifi, Tv, PauseCircle, PlayCircle, AlertTriangle, X, Plus, Search, RefreshCw, Router, Download, ChevronDown, ChevronUp, Check, RotateCcw, Zap, Clock, ArrowLeftRight, Signal, Activity, User, Phone, MapPin, Mail, CreditCard, HardDrive } from 'lucide-react'

const C = {
  void: 'var(--theme-bg)', base: 'var(--theme-card-base)', border: 'var(--theme-border)', border2: 'var(--theme-border2)',
  text: 'var(--theme-text)', dim: 'var(--theme-dim)', mute: 'var(--theme-mute)', faint: 'var(--theme-faint)',
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
    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

const inputSx: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: C.void,
  border: `0.5px solid ${C.mute}`, borderRadius: 7, color: C.text,
  fontSize: 13, boxSizing: 'border-box', outline: 'none',
}

const labelSx: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: C.dim,
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
  fontFamily: 'Inter, sans-serif',
}

interface WizardForm {
  client_name: string
  phone_number: string
  client_type: 'wifi' | 'tv'
  installation_address: string
  id_number: string
  email: string
  plan_id: string
  networking_ip: string
  networking_mac: string
  networking_vlan: string
  networking_interface: string
  networking_gateway: string
  billing_cycle_days: number
  billing_cycle_date: number
  data_cap_gb: string
  notes: string
}

const stepLabels = ['Profile', 'Provisioning', 'Billing']

const initialWizardForm: WizardForm = {
  client_name: '', phone_number: '', client_type: 'wifi',
  installation_address: '', id_number: '', email: '',
  plan_id: '', networking_ip: '', networking_mac: '',
  networking_vlan: '', networking_interface: '', networking_gateway: '',
  billing_cycle_days: 30, billing_cycle_date: 1,
  data_cap_gb: '', notes: '',
}

const actionBtnStyle: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 6,
  border: `0.5px solid ${C.border}`, background: 'transparent',
  cursor: 'pointer', display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center',
  color: C.dim, padding: 0,
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
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [plansLoading, setPlansLoading] = useState(false)

  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [showMoreDetails, setShowMoreDetails] = useState(false)
  const [showAdvancedNetwork, setShowAdvancedNetwork] = useState(false)
  const [ipsLoading, setIpsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [ipAutoAssigned, setIpAutoAssigned] = useState(false)

  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [queueStats, setQueueStats] = useState<any>(null)
  const [realtimeOnline, setRealtimeOnline] = useState<boolean | null>(null)
  const [neighbors, setNeighbors] = useState<any[]>([])
  const [speedForm, setSpeedForm] = useState({ down: '', up: '' })
  const [savingSpeed, setSavingSpeed] = useState(false)

  const [form, setForm] = useState<WizardForm>({ ...initialWizardForm })

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

  const loadAvailableIps = async (clientType: 'wifi' | 'tv') => {
    setIpsLoading(true)
    try {
      const data = await api.getAvailableIps(clientType)
      const ips = data.available_ips || []
      setAvailableIps(ips)
      if (ips.length > 0) {
        const firstIp = ips[0]
        setForm(f => ({
          ...f,
          networking_ip: firstIp.ip,
          networking_gateway: firstIp.gateway || '',
          networking_vlan: firstIp.vlan_id?.toString() || '',
          networking_interface: firstIp.interface_name || '',
        }))
        setIpAutoAssigned(true)
      } else {
        setForm(f => ({ ...f, networking_ip: '' }))
        setIpAutoAssigned(false)
      }
    } catch {
      setAvailableIps([])
      setIpAutoAssigned(false)
    } finally { setIpsLoading(false) }
  }

  const openCreate = () => {
    setForm({ ...initialWizardForm })
    setWizardStep(1)
    setShowMoreDetails(false)
    setShowAdvancedNetwork(false)
    setIpAutoAssigned(false)
    setShowWizard(true)
  }

  const wizardPlans = plans.filter(p => p.client_type === form.client_type)

  const handleNext = () => {
    if (wizardStep === 1) {
      if (!form.client_name.trim() || !form.phone_number.trim()) {
        showToast('Client name and phone number are required', { type: 'error' })
        return
      }
      setWizardStep(2)
      loadAvailableIps(form.client_type)
    } else if (wizardStep === 2) {
      if (!form.networking_ip.trim()) {
        showToast('Static IP address is required', { type: 'error' })
        return
      }
      setWizardStep(3)
    }
  }

  const handleBack = () => {
    if (wizardStep > 1) setWizardStep(s => s - 1)
  }

  const handleCloseWizard = () => {
    setShowWizard(false)
    setWizardStep(1)
  }

  const handleIpManualOverride = (ip: string) => {
    setForm(f => ({ ...f, networking_ip: ip }))
    setIpAutoAssigned(false)
  }

  const handleIpDropdown = (ipVal: string) => {
    if (ipVal) {
      const ip = availableIps.find(i => i.ip === ipVal)
      if (ip) {
        setForm(f => ({
          ...f, networking_ip: ip.ip, networking_gateway: ip.gateway || '',
          networking_vlan: ip.vlan_id?.toString() || '',
          networking_interface: ip.interface_name || '',
        }))
        setIpAutoAssigned(true)
      }
    }
  }

  const handleSubmit = async () => {
    if (!form.client_name.trim() || !form.phone_number.trim() || !form.networking_ip.trim()) {
      showToast('Name, phone, and IP are required', { type: 'error' })
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        client_name: form.client_name,
        phone_number: form.phone_number,
        client_type: form.client_type,
        installation_address: form.installation_address || undefined,
        id_number: form.id_number || undefined,
        email: form.email || undefined,
        plan_id: form.plan_id || null,
        networking_ip: form.networking_ip,
        networking_mac: form.networking_mac || undefined,
        networking_vlan: form.networking_vlan ? parseInt(form.networking_vlan) : null,
        networking_interface: form.networking_interface || undefined,
        networking_gateway: form.networking_gateway || undefined,
        billing_cycle_date: form.billing_cycle_date,
        billing_cycle_days: form.billing_cycle_days,
        data_cap_gb: form.data_cap_gb ? parseFloat(form.data_cap_gb) : null,
        notes: form.notes || undefined,
      }
      await api.createSubscriber(payload)
      showToast('Subscriber created', { type: 'success' })
      setShowWizard(false)
      setWizardStep(1)
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

  const handleSelectClient = async (client: any) => {
    setSelectedClient(client)
    setDetailLoading(true)
    setQueueStats(null)
    setRealtimeOnline(null)
    setNeighbors([])
    setSpeedForm({ down: '', up: '' })
    try {
      const [full, queue, allSubs] = await Promise.all([
        api.getSubscriber(client.id).catch(() => client),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/subscribers/${client.id}/queue-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.ok ? r.json() : null).catch(() => null),
        api.getSubscribers().catch(() => ({ items: [] })),
      ])
      setSelectedClient(full)
      setQueueStats(queue)
      setRealtimeOnline(full?.online_status === 'online')
      if (full?.installation_address) {
        const sameAddr = (allSubs.items || []).filter((s: any) =>
          s.id !== client.id && s.installation_address && s.installation_address.toLowerCase() === full.installation_address.toLowerCase()
        )
        setNeighbors(sameAddr)
      }
      if (full?.plan_name) {
        setSpeedForm({ down: '', up: '' })
      }
    } catch {
      setSelectedClient(client)
    } finally { setDetailLoading(false) }
  }

  const handleRefreshRealtime = async () => {
    if (!selectedClient) return
    try {
      const full = await api.getSubscriber(selectedClient.id)
      setSelectedClient(full)
      setRealtimeOnline(full?.online_status === 'online')
    } catch {}
  }

  const handleClientAction = async (action: 'pause' | 'resume' | 'suspend' | 'activate' | 'reconnect' | 'restart') => {
    if (!selectedClient) return
    setActionLoading(selectedClient.id)
    try {
      const actions: Record<string, () => Promise<any>> = {
        pause: () => api.pauseSubscriber(selectedClient.id),
        resume: () => api.resumeSubscriber(selectedClient.id),
        suspend: () => api.suspendSubscriber(selectedClient.id),
        activate: () => api.activateSubscriber(selectedClient.id),
        reconnect: () => api.reconnectSubscriber(selectedClient.id),
        restart: () => api.restartSubscriber(selectedClient.id),
      }
      await actions[action]()
      showToast(`Subscriber ${action}ed`, { type: 'success' })
      const updated = await api.getSubscriber(selectedClient.id)
      setSelectedClient(updated)
      loadAll()
    } catch (e: any) {
      showToast(e.message || `Failed to ${action}`, { type: 'error' })
    } finally { setActionLoading(null) }
  }

  const statsCards = stats ? [
    { label: 'Total Clients', value: fmt(stats.total), sub: `${stats.active} active · ${stats.online} online`, color: C.text },
    { label: 'Active', value: fmt(stats.active), sub: `${stats.online} online now`, color: C.green },
    { label: 'Suspended', value: fmt(stats.suspended), sub: `${stats.overdue} overdue · ${stats.paused} paused`, color: stats.suspended > 0 ? C.red : C.dim },
    { label: 'Data Used', value: `${(stats.total_data_gb_month || 0).toFixed(1)} GB`, sub: 'This month', color: C.gold },
  ] : []

  const isBusy = (id: string) => actionLoading === id

  const renderStepIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 28, padding: '0 20px' }}>
      {[1, 2, 3].map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, fontFamily: 'DM Mono, monospace',
              background: wizardStep === s ? C.gold : wizardStep > s ? 'rgba(34,197,94,0.15)' : C.mute,
              color: wizardStep === s ? C.void : wizardStep > s ? C.green : C.dim,
              border: wizardStep === s ? 'none' : wizardStep > s ? '1.5px solid rgba(34,197,94,0.3)' : `0.5px solid ${C.border}`,
              transition: 'all 0.3s ease',
            }}>
              {wizardStep > s ? '✓' : s}
            </div>
            <div style={{
              fontSize: 11, fontWeight: 600, fontFamily: 'Inter, sans-serif',
              color: wizardStep === s ? C.text : C.dim, letterSpacing: '0.02em',
            }}>
              {stepLabels[i]}
            </div>
          </div>
          {i < 2 && (
            <div style={{
              width: 60, height: 1.5, margin: '0 8px', marginBottom: 18,
              background: wizardStep > s ? 'rgba(34,197,94,0.3)' : C.mute,
              borderRadius: 1, transition: 'background 0.3s ease',
            }} />
          )}
        </div>
      ))}
    </div>
  )

  const renderStep1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={labelSx}>Client Name *</div>
        <input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="John Doe" style={inputSx} />
      </div>
      <div>
        <div style={labelSx}>Phone Number *</div>
        <input value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} placeholder="254712345678" style={inputSx} />
      </div>
      <div>
        <div style={{ ...labelSx, marginBottom: 8 }}>Service Type</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['wifi', 'tv'] as const).map(t => (
            <button key={t} type="button" onClick={() => setForm(f => ({ ...f, client_type: t }))} style={{
              flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
              fontFamily: 'Inter, sans-serif', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: form.client_type === t ? 'rgba(232,184,75,0.1)' : 'transparent',
              border: form.client_type === t ? '1px solid rgba(232,184,75,0.25)' : `0.5px solid ${C.border}`,
              color: form.client_type === t ? C.gold : C.dim, transition: 'all 0.2s ease',
            }}>
              {t === 'wifi' ? <Wifi size={13} /> : <Tv size={13} />}
              {t === 'wifi' ? 'Home WiFi' : 'TV'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div style={labelSx}>Installation Address</div>
        <input value={form.installation_address} onChange={e => setForm(f => ({ ...f, installation_address: e.target.value }))} placeholder="Plot 42, Kimathi Street" style={inputSx} />
      </div>
      <button type="button" onClick={() => setShowMoreDetails(!showMoreDetails)} style={{
        display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
        color: C.dim, fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '4px 0', fontFamily: 'Inter, sans-serif',
      }}>
        {showMoreDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {showMoreDetails ? 'Hide details' : 'Add more details'}
      </button>
      {showMoreDetails && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={labelSx}>ID Number</div>
            <input value={form.id_number} onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))} placeholder="12345678" style={inputSx} />
          </div>
          <div>
            <div style={labelSx}>Email</div>
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" style={inputSx} />
          </div>
        </div>
      )}
    </div>
  )

  const renderStep2 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={labelSx}>Plan</div>
        <select value={form.plan_id} onChange={e => setForm(f => ({ ...f, plan_id: e.target.value }))} style={inputSx}>
          <option value="">No plan (custom)</option>
          {wizardPlans.map(p => (
            <option key={p.id} value={p.id}>{p.name} — {ksh(p.price_ksh)}/mo</option>
          ))}
        </select>
      </div>
      <div>
        <div style={labelSx}>Static IP Address *</div>
        {ipsLoading ? (
          <div style={{ ...inputSx, display: 'flex', alignItems: 'center', gap: 8, color: C.dim }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${C.mute}`, borderTop: `2px solid ${C.gold}`, animation: 'spin 1s linear infinite' }} />
            Fetching available IPs...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                value={form.networking_ip}
                onChange={e => handleIpManualOverride(e.target.value)}
                placeholder="192.168.88.50"
                style={{ ...inputSx, flex: 1 }}
              />
              {availableIps.length > 0 && (
                <select onChange={e => handleIpDropdown(e.target.value)} value="" style={{ ...inputSx, width: 'auto', minWidth: 100, padding: '10px 8px' }}>
                  <option value="">Pick IP</option>
                  {availableIps.slice(0, 20).map(i => (
                    <option key={i.ip} value={i.ip}>{i.ip}</option>
                  ))}
                </select>
              )}
            </div>
            {ipAutoAssigned && form.networking_ip && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                <span style={{
                  padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                  fontFamily: 'DM Mono, monospace', textTransform: 'uppercase',
                  background: 'rgba(34,197,94,0.08)', color: C.green,
                }}>Auto-assigned</span>
              </div>
            )}
            {availableIps.length === 0 && !ipsLoading && (
              <div style={{ fontSize: 11, color: C.dim, marginTop: 6, fontFamily: 'Inter, sans-serif' }}>
                No IPs available in pool. Enter manually or add IPs to pool.
              </div>
            )}
          </div>
        )}
      </div>
      <div>
        <div style={labelSx}>MAC Address {form.client_type === 'tv' ? '*' : ''}</div>
        <input value={form.networking_mac} onChange={e => setForm(f => ({ ...f, networking_mac: e.target.value }))} placeholder="AA:BB:CC:DD:EE:FF" style={inputSx} />
      </div>
      <button type="button" onClick={() => setShowAdvancedNetwork(!showAdvancedNetwork)} style={{
        display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
        color: C.dim, fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '4px 0', fontFamily: 'Inter, sans-serif',
      }}>
        {showAdvancedNetwork ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Advanced Network Settings
      </button>
      {showAdvancedNetwork && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <div style={labelSx}>VLAN ID</div>
            <input value={form.networking_vlan} onChange={e => setForm(f => ({ ...f, networking_vlan: e.target.value }))} placeholder="100" style={inputSx} />
          </div>
          <div>
            <div style={labelSx}>Interface</div>
            <input value={form.networking_interface} onChange={e => setForm(f => ({ ...f, networking_interface: e.target.value }))} placeholder="ether2" style={inputSx} />
          </div>
          <div>
            <div style={labelSx}>Gateway</div>
            <input value={form.networking_gateway} onChange={e => setForm(f => ({ ...f, networking_gateway: e.target.value }))} placeholder="192.168.88.1" style={inputSx} />
          </div>
        </div>
      )}
    </div>
  )

  const renderStep3 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ ...labelSx, marginBottom: 8 }}>Billing Cycle</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ label: 'Monthly', days: 30 }, { label: 'Quarterly', days: 90 }].map(opt => (
            <button key={opt.days} type="button" onClick={() => setForm(f => ({ ...f, billing_cycle_days: opt.days }))} style={{
              flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
              fontFamily: 'Inter, sans-serif', cursor: 'pointer', textAlign: 'center',
              background: form.billing_cycle_days === opt.days ? 'rgba(232,184,75,0.1)' : 'transparent',
              border: form.billing_cycle_days === opt.days ? '1px solid rgba(232,184,75,0.25)' : `0.5px solid ${C.border}`,
              color: form.billing_cycle_days === opt.days ? C.gold : C.dim, transition: 'all 0.2s ease',
            }}>
              {opt.label}
              <div style={{ fontSize: 10, color: C.mute, marginTop: 2 }}>{opt.days} days</div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div style={labelSx}>Billing Day</div>
        <select value={form.billing_cycle_date} onChange={e => setForm(f => ({ ...f, billing_cycle_date: parseInt(e.target.value) }))} style={inputSx}>
          {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      <div>
        <div style={labelSx}>Data Cap (GB)</div>
        <input value={form.data_cap_gb} onChange={e => setForm(f => ({ ...f, data_cap_gb: e.target.value }))} placeholder="Unlimited" style={inputSx} />
      </div>
      <div>
        <div style={labelSx}>Notes</div>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." rows={3} style={{ ...inputSx, resize: 'vertical', fontFamily: 'Inter, sans-serif' }} />
      </div>
    </div>
  )

  return (
    <div style={{ background: C.void, color: C.text, minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Monthly Clients" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', maxWidth: 1240, margin: '0 auto', width: '100%' }}>
        {statsCards.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {statsCards.map((c, i) => (
              <div key={i} style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'Inter, sans-serif' }}>{c.label}</div>
                <div style={{ fontSize: 24, fontFamily: 'DM Mono, monospace', fontWeight: 500, color: c.color, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{c.value}</div>
                <div style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', color: C.dim, marginTop: 4 }}>{c.sub}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'wifi', 'tv'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                background: tab === t ? 'rgba(232,184,75,0.1)' : 'transparent',
                border: tab === t ? '0.5px solid rgba(232,184,75,0.2)' : `0.5px solid ${C.border}`,
                color: tab === t ? C.gold : C.dim, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {t === 'all' ? <Users size={12} /> : t === 'wifi' ? <Wifi size={12} /> : <Tv size={12} />}
                {t === 'all' ? 'All' : t === 'wifi' ? 'Home WiFi' : 'TV'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative', width: 200 }}>
              <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.dim }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..." style={{
                width: '100%', padding: '8px 10px 8px 28px', borderRadius: 8,
                border: `0.5px solid ${C.border}`, background: C.base, color: C.text,
                fontSize: 13, outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
              }} />
            </div>
            <button onClick={loadAll} title="Refresh" style={{ width: 28, height: 28, borderRadius: 6, border: `0.5px solid ${C.border}`, background: 'transparent', color: C.dim, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              <RefreshCw size={12} />
            </button>
            <button onClick={handleReconcile} title="Reconcile with router" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'DM Mono, monospace', border: `0.5px solid ${C.border}`, background: C.base, color: C.dim, cursor: 'pointer' }}>
              <Router size={11} /> Sync
            </button>
            <button onClick={() => setShowPlanModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'DM Mono, monospace', border: `0.5px solid ${C.border}`, background: C.base, color: C.dim, cursor: 'pointer' }}>
              <Download size={11} /> Plans
            </button>
            <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: C.gold, color: C.void, border: 'none', cursor: 'pointer', fontFamily: '"Space Grotesk", sans-serif' }}>
              <Plus size={14} /> Add Client
            </button>
          </div>
        </div>

        <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `0.5px solid ${C.border}` }}>
                  {['Account', 'Client Name', 'IP / VLAN', 'Plan', 'Phone', 'Status', 'Online', 'Data Used', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: C.dim, fontSize: 11, fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{h}</th>
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
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.dim }}>No monthly clients yet</div>
                    <div style={{ fontSize: 12, color: C.mute, marginTop: 4 }}>Create subscriber plans and add clients to get started</div>
                    <button onClick={openCreate} style={{ marginTop: 12, padding: '8px 18px', borderRadius: 8, background: C.gold, color: C.void, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      <Plus size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Add Client
                    </button>
                  </td></tr>
                ) : subscribers.map(s => {
                  const outOfSync = s.out_of_sync
                  return (
                    <tr key={s.id} style={{ borderBottom: `0.5px solid ${C.border}`, transition: 'background 0.15s', cursor: 'pointer' }}
                      onClick={() => handleSelectClient(s)}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: C.text }}>
                          {outOfSync && <AlertTriangle size={10} color={C.red} style={{ verticalAlign: 'middle', marginRight: 4 }} />}
                          {s.account_number}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>{s.client_name}</div>
                        <div style={{ fontSize: 11, color: C.dim, fontFamily: 'DM Mono, monospace' }}>{s.phone_number ? maskPhone(s.phone_number) : '—'}</div>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {s.networking_ip}
                        {s.networking_vlan && <span style={{ color: C.dim }}> · VLAN {s.networking_vlan}</span>}
                        {s.networking_mac && <div style={{ fontSize: 9, color: C.mute }}>{s.networking_mac}</div>}
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {s.plan_name ? (
                          <div>
                            <div style={{ color: C.text, fontSize: 12 }}>{s.plan_name}</div>
                            {s.amount_due_ksh > 0 && <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.dim }}>{ksh(s.amount_due_ksh)}/mo</div>}
                          </div>
                        ) : <span style={{ color: C.mute }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 12, whiteSpace: 'nowrap', color: C.dim }}>{maskPhone(s.phone_number)}</td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{statusBadge(s.status)}</td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'DM Mono, monospace', fontWeight: 600, color: s.online_status === 'online' ? C.green : C.dim }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.online_status === 'online' ? C.green : C.mute, display: 'inline-block' }} />
                          {s.online_status === 'online' ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 12, whiteSpace: 'nowrap', color: C.dim }}>
                        <div>{(s.data_used_today_gb || 0).toFixed(2)} GB today</div>
                        <div style={{ fontSize: 10, color: C.mute }}>{(s.data_used_month_gb || 0).toFixed(1)} GB month</div>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {s.status === 'active' && (
                            <>
                              <button onClick={() => handleAction(s.id, 'pause')} disabled={isBusy(s.id)} title="Pause" style={actionBtnStyle}><PauseCircle size={12} /></button>
                              <button onClick={() => handleAction(s.id, 'suspend')} disabled={isBusy(s.id)} title="Suspend" style={{ ...actionBtnStyle, color: C.red }}><AlertTriangle size={12} /></button>
                            </>
                          )}
                          {(s.status === 'paused' || s.status === 'suspended') && (
                            <button onClick={() => handleAction(s.id, 'resume')} disabled={isBusy(s.id)} title="Resume" style={{ ...actionBtnStyle, color: C.green }}><PlayCircle size={12} /></button>
                          )}
                          {s.out_of_sync && (
                            <button onClick={() => handleAction(s.id, 'activate')} disabled={isBusy(s.id)} title="Re-activate on router" style={{ ...actionBtnStyle, color: C.gold }}><RefreshCw size={12} /></button>
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
            <div style={{ padding: '10px 14px', fontSize: 12, color: C.dim, borderTop: `0.5px solid ${C.border}`, textAlign: 'center' }}>
              Showing {subscribers.length} of {total} clients
            </div>
          )}
        </div>
      </div>

      {showWizard && (
        <>
          <div onClick={handleCloseWizard} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 201, width: '100%', maxWidth: 520, background: 'rgba(10,10,10,0.92)',
            backdropFilter: 'blur(24px)', border: '0.5px solid rgba(232,184,75,0.12)',
            borderRadius: 16, boxShadow: '0 0 80px rgba(0,0,0,0.5), 0 0 40px rgba(232,184,75,0.03)',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px 0', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div>
                  <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 19, fontWeight: 700, color: C.text }}>Add Client</div>
                  <div style={{ fontSize: 12, color: C.dim, fontFamily: 'Inter, sans-serif', marginTop: 2 }}>Step {wizardStep} of 3 — {stepLabels[wizardStep - 1]}</div>
                </div>
                <button onClick={handleCloseWizard} style={{
                  width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.06)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.dim,
                }}>
                  <X size={14} />
                </button>
              </div>

              {renderStepIndicator()}

              <div style={{ minHeight: 220 }}>
                {wizardStep === 1 && renderStep1()}
                {wizardStep === 2 && renderStep2()}
                {wizardStep === 3 && renderStep3()}
              </div>
            </div>

            <div style={{ padding: '16px 24px 20px', borderTop: `0.5px solid ${C.border}`, display: 'flex', gap: 10, justifyContent: wizardStep > 1 ? 'space-between' : 'flex-end' }}>
              {wizardStep > 1 && (
                <button onClick={handleBack} style={{
                  padding: '10px 20px', borderRadius: 8, border: `0.5px solid ${C.border}`,
                  background: 'transparent', color: C.dim, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}>
                  Back
                </button>
              )}
              {wizardStep < 3 ? (
                <button onClick={handleNext} style={{
                  padding: '10px 28px', borderRadius: 8, border: 'none',
                  background: C.gold, color: C.void, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: '"Space Grotesk", sans-serif',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  Next <ChevronDown size={12} style={{ transform: 'rotate(-90deg)' }} />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting} style={{
                  padding: '10px 28px', borderRadius: 8, border: 'none',
                  background: submitting ? C.mute : C.gold, color: submitting ? C.dim : C.void,
                  fontSize: 12, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: '"Space Grotesk", sans-serif',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {submitting ? 'Creating...' : 'Create Client'} {!submitting && <Check size={13} />}
                </button>
              )}
            </div>
          </div>
        </>
      )}

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
                <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 19, fontWeight: 700, color: C.text }}>Subscriber Plans</div>
                <div style={{ fontSize: 12, color: C.dim, fontFamily: 'Inter, sans-serif', marginTop: 2 }}>Define monthly bandwidth plans for WiFi and TV clients</div>
              </div>
              <button onClick={() => setShowPlanModal(false)} style={{
                width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.06)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.dim,
              }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ background: 'var(--theme-surface)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12, fontFamily: 'Inter, sans-serif' }}>New Plan</div>
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
                fontSize: 13, fontWeight: 700, cursor: plansLoading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
              }}>
                {plansLoading ? 'Creating...' : 'Create Plan'}
              </button>
            </div>

            {plans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 16, color: C.dim, fontSize: 13 }}>
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
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                        {p.client_type === 'tv' ? <Tv size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> : <Wifi size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />}
                        {p.name}
                      </div>
                      <div style={{ fontSize: 11, color: C.dim, fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
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

      {selectedClient && (
        <>
          <div onClick={() => { setSelectedClient(null); setQueueStats(null); setRealtimeOnline(null); setNeighbors([]) }} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 201, width: '100%', maxWidth: 680, maxHeight: '90vh',
            background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(24px)',
            border: '0.5px solid rgba(232,184,75,0.1)', borderRadius: 16,
            boxShadow: '0 0 80px rgba(0,0,0,0.5), 0 0 40px rgba(232,184,75,0.03)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: `0.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => { setSelectedClient(null); setQueueStats(null); setRealtimeOnline(null); setNeighbors([]) }} style={{
                  width: 30, height: 30, borderRadius: 7, border: `0.5px solid ${C.border}`,
                  background: 'transparent', color: C.dim, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                }}>
                  <X size={14} />
                </button>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
                      background: realtimeOnline ? C.green : C.mute,
                      boxShadow: realtimeOnline ? `0 0 8px ${C.green}80` : 'none',
                    }} />
                    <span style={{ fontWeight: 700, fontSize: 16, color: C.text, fontFamily: '"Space Grotesk", sans-serif' }}>{selectedClient.client_name}</span>
                    <span style={{ fontSize: 11, color: C.dim, fontFamily: 'DM Mono, monospace', background: 'var(--theme-surface)', padding: '2px 8px', borderRadius: 4 }}>{selectedClient.account_number}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>
                    {selectedClient.networking_ip} {selectedClient.installation_address ? `· ${selectedClient.installation_address}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {statusBadge(selectedClient.status)}
                <button onClick={handleRefreshRealtime} title="Refresh" style={{
                  width: 30, height: 30, borderRadius: 7, border: `0.5px solid ${C.border}`,
                  background: 'transparent', color: C.dim, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                }}>
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: C.dim }}>Loading...</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

                  {/* ── LEFT COLUMN ── */}

                  {/* Usage Graph */}
                  <div style={{ gridColumn: '1 / -1', padding: '16px 18px', borderRadius: 10, background: C.base, border: `0.5px solid ${C.border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Network Traffic</div>
                    {/* Daily usage bars (simulated last 7 days) */}
                    <div style={{ display: 'flex', gap: 4, height: 60, alignItems: 'flex-end', marginBottom: 8 }}>
                      {Array.from({ length: 7 }, (_, i) => {
                        const d = new Date()
                        d.setDate(d.getDate() - (6 - i))
                        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' })
                        const isToday = i === 6
                        const base = isToday ? (selectedClient.data_used_today_gb || 0.1) : (Math.random() * 0.8 + 0.1)
                        const maxDaily = Math.max(selectedClient.data_used_month_gb / 30 || 0.5, 0.5)
                        const pct = Math.min((base / maxDaily) * 100, 100)
                        return (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{
                              width: '100%', height: `${Math.max(pct, 8)}%`, borderRadius: 3,
                              background: isToday ? C.gold : `${C.gold}40`,
                              transition: 'height 0.3s',
                            }} title={`${dayLabel}: ${base.toFixed(2)} GB`} />
                            <span style={{ fontSize: 8, color: isToday ? C.gold : C.faint, fontFamily: 'DM Mono, monospace' }}>{dayLabel}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 20, paddingTop: 8, borderTop: `0.5px solid ${C.border}` }}>
                      <div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 500, color: C.text }}>{(selectedClient.data_used_today_gb || 0).toFixed(2)} <span style={{ fontSize: 11, color: C.dim }}>GB</span></div>
                        <div style={{ fontSize: 10, color: C.dim }}>Today</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 500, color: C.gold }}>{(selectedClient.data_used_month_gb || 0).toFixed(1)} <span style={{ fontSize: 11, color: C.dim }}>GB</span></div>
                        <div style={{ fontSize: 10, color: C.dim }}>This Month</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 500, color: C.dim }}>{(selectedClient.data_used_total_gb || 0).toFixed(1)} <span style={{ fontSize: 11, color: C.dim }}>GB</span></div>
                        <div style={{ fontSize: 10, color: C.dim }}>Lifetime</div>
                      </div>
                      {selectedClient.data_cap_gb && (
                        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, color: (selectedClient.data_used_month_gb || 0) / selectedClient.data_cap_gb > 0.9 ? C.red : C.dim }}>
                            {((selectedClient.data_used_month_gb || 0) / selectedClient.data_cap_gb * 100).toFixed(0)}%
                          </div>
                          <div style={{ fontSize: 10, color: C.dim }}>of {selectedClient.data_cap_gb} GB cap</div>
                        </div>
                      )}
                    </div>
                    {/* Usage bar */}
                    {selectedClient.data_cap_gb && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--theme-surface)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${Math.min((selectedClient.data_used_month_gb || 0) / selectedClient.data_cap_gb * 100, 100)}%`,
                            background: (selectedClient.data_used_month_gb || 0) / selectedClient.data_cap_gb > 0.9 ? C.red : C.gold,
                            transition: 'width 0.3s',
                          }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Speed Control */}
                  <div style={{ padding: '14px 16px', borderRadius: 10, background: C.base, border: `0.5px solid ${C.border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Speed Cap</div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: C.dim, display: 'block', marginBottom: 3 }}>Download (Mbps)</label>
                        <input value={speedForm.down} onChange={e => setSpeedForm(f => ({ ...f, down: e.target.value }))} placeholder={selectedClient.plan_name ? 'From plan' : 'e.g. 10'}
                          style={{ width: '100%', padding: '8px 10px', background: 'var(--theme-surface)', border: `0.5px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13, fontFamily: 'DM Mono, monospace', boxSizing: 'border-box', outline: 'none' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: C.dim, display: 'block', marginBottom: 3 }}>Upload (Mbps)</label>
                        <input value={speedForm.up} onChange={e => setSpeedForm(f => ({ ...f, up: e.target.value }))} placeholder={selectedClient.plan_name ? 'From plan' : 'e.g. 5'}
                          style={{ width: '100%', padding: '8px 10px', background: 'var(--theme-surface)', border: `0.5px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13, fontFamily: 'DM Mono, monospace', boxSizing: 'border-box', outline: 'none' }} />
                      </div>
                    </div>
                    {queueStats && (
                      <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--theme-surface)', fontSize: 11, display: 'flex', gap: 12 }}>
                        <span style={{ color: C.dim }}>Current: <span style={{ color: C.text, fontFamily: 'DM Mono, monospace' }}>{queueStats.rate_limit_down || '—'}</span> ↓ / <span style={{ color: C.text, fontFamily: 'DM Mono, monospace' }}>{queueStats.rate_limit_up || '—'}</span> ↑</span>
                      </div>
                    )}
                    <button disabled={savingSpeed} style={{
                      marginTop: 8, width: '100%', padding: '8px', borderRadius: 6, border: 'none',
                      background: C.gold, color: '#000', fontSize: 11, fontWeight: 700, cursor: savingSpeed ? 'not-allowed' : 'pointer',
                    }}>
                      {savingSpeed ? 'Applying...' : 'Apply Speed Cap'}
                    </button>
                  </div>

                  {/* Connection Status */}
                  <div style={{ padding: '14px 16px', borderRadius: 10, background: C.base, border: `0.5px solid ${C.border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Connection</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: C.dim }}>Status</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: realtimeOnline ? C.green : C.dim }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: realtimeOnline ? C.green : C.mute }} />
                          {realtimeOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      {selectedClient.last_seen_at && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, color: C.dim }}>Last Seen</span>
                          <span style={{ fontSize: 11, color: C.text, fontFamily: 'DM Mono, monospace' }}>{new Date(selectedClient.last_seen_at).toLocaleString()}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: C.dim }}>IP Address</span>
                        <span style={{ fontSize: 11, color: C.text, fontFamily: 'DM Mono, monospace' }}>{selectedClient.networking_ip}</span>
                      </div>
                      {selectedClient.networking_mac && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, color: C.dim }}>MAC</span>
                          <span style={{ fontSize: 11, color: C.text, fontFamily: 'DM Mono, monospace' }}>{selectedClient.networking_mac}</span>
                        </div>
                      )}
                    </div>
                    {/* Quick Actions */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 12, paddingTop: 10, borderTop: `0.5px solid ${C.border}` }}>
                      {selectedClient.status === 'active' && (
                        <>
                          <button onClick={() => handleClientAction('reconnect')} disabled={actionLoading === selectedClient.id} style={{
                            flex: 1, padding: '7px', borderRadius: 6, border: `0.5px solid ${C.border}`,
                            background: 'rgba(59,130,246,0.06)', color: '#60a5fa', fontSize: 10, fontWeight: 600,
                            cursor: actionLoading === selectedClient.id ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                          }}>
                            <ArrowLeftRight size={10} /> Reconnect
                          </button>
                          <button onClick={() => handleClientAction('restart')} disabled={actionLoading === selectedClient.id} style={{
                            flex: 1, padding: '7px', borderRadius: 6, border: `0.5px solid ${C.border}`,
                            background: 'rgba(168,85,247,0.06)', color: '#c084fc', fontSize: 10, fontWeight: 600,
                            cursor: actionLoading === selectedClient.id ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                          }}>
                            <RotateCcw size={10} /> Restart
                          </button>
                        </>
                      )}
                      {(selectedClient.status === 'paused' || selectedClient.status === 'suspended') && (
                        <button onClick={() => handleClientAction('resume')} disabled={actionLoading === selectedClient.id} style={{
                          flex: 1, padding: '7px', borderRadius: 6, border: '0.5px solid rgba(34,197,94,0.2)',
                          background: 'rgba(34,197,94,0.06)', color: C.green, fontSize: 10, fontWeight: 600,
                          cursor: actionLoading === selectedClient.id ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                        }}>
                          <PlayCircle size={10} /> Resume
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Client Details */}
                  <div style={{ padding: '14px 16px', borderRadius: 10, background: C.base, border: `0.5px solid ${C.border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Details</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {[
                        { label: 'Plan', value: selectedClient.plan_name || 'No plan' },
                        { label: 'Phone', value: selectedClient.phone_number || '—' },
                        { label: 'Email', value: selectedClient.email || '—' },
                        { label: 'Address', value: selectedClient.installation_address || '—' },
                        { label: 'Amount Due', value: selectedClient.amount_due_ksh > 0 ? ksh(selectedClient.amount_due_ksh) + '/mo' : '—' },
                        { label: 'Next Bill', value: selectedClient.next_billing_at ? new Date(selectedClient.next_billing_at).toLocaleDateString() : '—' },
                      ].map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
                          <span style={{ color: C.dim }}>{r.label}</span>
                          <span style={{ color: C.text, fontFamily: 'DM Mono, monospace', fontSize: 11, textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                    {/* Sync status */}
                    {selectedClient.out_of_sync && (
                      <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={11} color={C.red} />
                        <span style={{ fontSize: 11, color: C.red }}>Out of sync with router</span>
                        <button onClick={() => handleClientAction('activate')} disabled={actionLoading === selectedClient.id} style={{
                          marginLeft: 'auto', padding: '4px 10px', borderRadius: 5, border: 'none',
                          background: C.gold, color: '#000', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                        }}>Fix</button>
                      </div>
                    )}
                  </div>

                  {/* Plot Neighbors */}
                  <div style={{ gridColumn: '1 / -1', padding: '14px 16px', borderRadius: 10, background: C.base, border: `0.5px solid ${C.border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                      {selectedClient.installation_address ? `Neighbors at ${selectedClient.installation_address}` : 'Plot / Location'}
                    </div>
                    {!selectedClient.installation_address ? (
                      <div style={{ fontSize: 12, color: C.mute, padding: '8px 0' }}>No installation address set</div>
                    ) : neighbors.length === 0 ? (
                      <div style={{ fontSize: 12, color: C.mute, padding: '8px 0' }}>No other clients at this location</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {neighbors.map((n: any) => (
                          <div key={n.id} style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6,
                            background: 'var(--theme-surface)', border: `0.5px solid ${C.border}`,
                            cursor: 'pointer', transition: 'border-color 0.15s',
                          }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = C.gold}
                            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                            onClick={() => { setSelectedClient(null); setTimeout(() => handleSelectClient(n), 100) }}
                          >
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                              background: n.online_status === 'online' ? C.green : C.mute,
                            }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{n.client_name}</span>
                            <span style={{ fontSize: 10, color: C.dim, fontFamily: 'DM Mono, monospace' }}>{n.networking_ip}</span>
                            <span style={{ marginLeft: 'auto', fontSize: 10 }}>{statusBadge(n.status)}</span>
                          </div>
                        ))}
                        <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>
                          {neighbors.filter((n: any) => n.online_status !== 'online').length > 0 && (
                            <span style={{ color: C.red }}>
                              {neighbors.filter((n: any) => n.online_status !== 'online').length} neighbor(s) offline — possible area outage
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Admin Actions */}
                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
                    {selectedClient.status === 'active' && (
                      <>
                        <button onClick={() => handleClientAction('pause')} disabled={actionLoading === selectedClient.id} style={{
                          flex: 1, padding: '9px', borderRadius: 7, border: `0.5px solid ${C.border}`,
                          background: 'rgba(232,184,75,0.06)', color: C.gold, fontSize: 11, fontWeight: 600,
                          cursor: actionLoading === selectedClient.id ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        }}>
                          <PauseCircle size={12} /> Pause
                        </button>
                        <button onClick={() => handleClientAction('suspend')} disabled={actionLoading === selectedClient.id} style={{
                          flex: 1, padding: '9px', borderRadius: 7, border: '0.5px solid rgba(239,68,68,0.2)',
                          background: 'rgba(239,68,68,0.06)', color: C.red, fontSize: 11, fontWeight: 600,
                          cursor: actionLoading === selectedClient.id ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        }}>
                          <AlertTriangle size={12} /> Suspend
                        </button>
                      </>
                    )}
                    {(selectedClient.status === 'paused' || selectedClient.status === 'suspended') && (
                      <button onClick={() => handleClientAction('resume')} disabled={actionLoading === selectedClient.id} style={{
                        flex: 1, padding: '9px', borderRadius: 7, border: '0.5px solid rgba(34,197,94,0.2)',
                        background: 'rgba(34,197,94,0.06)', color: C.green, fontSize: 11, fontWeight: 600,
                        cursor: actionLoading === selectedClient.id ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      }}>
                        <PlayCircle size={12} /> Resume Connection
                      </button>
                    )}
                  </div>

                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
