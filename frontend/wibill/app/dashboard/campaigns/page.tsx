'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { useToast } from '@/context/ToastContext'
import { Plus, X, Rocket, Play, Users, TrendingUp, Ticket, Clock, Eye, MessageSquare, ChevronLeft, ChevronRight, Copy, Check, type LucideIcon } from 'lucide-react'

const C = {
  void: '#030303', base: '#0a0a0a', border: '#141414', border2: '#1a1a1a',
  text: '#f0f0f0', dim: '#666666', mute: '#2a2a2a',
  gold: '#E8B84B', green: '#22c55e', red: '#ef4444',
}

const inputSx: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: '#080808',
  border: `0.5px solid ${C.border2}`, borderRadius: 7, color: C.text,
  fontSize: 12, boxSizing: 'border-box', outline: 'none',
}

const statusColors: Record<string, string> = {
  draft: C.dim, launched: C.green, completed: C.gold, cancelled: C.red,
}

const audienceOptions: { value: string; label: string; desc?: string; icon: LucideIcon }[] = [
  { value: 'all', label: 'All customers', icon: Users },
  { value: 'active_7d', label: 'Active in last 7 days', desc: 'Purchased recently', icon: TrendingUp },
  { value: 'inactive_5d', label: 'Inactive for 5+ days', desc: 'Might be slipping', icon: Clock },
  { value: 'inactive_10d', label: 'Inactive for 10+ days', desc: 'Needs re-engagement', icon: Clock },
  { value: 'top_spenders', label: 'Top spenders', desc: 'Highest lifetime spend', icon: TrendingUp },
  { value: 'new_30d', label: 'New customers (30 days)', desc: 'Joined recently', icon: Users },
  { value: 'custom', label: 'Custom list', desc: 'Paste phone numbers', icon: MessageSquare },
]

export default function CampaignsPage() {
  const { token } = useAuth()
  const { showToast } = useToast()

  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createStep, setCreateStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [launching, setLaunching] = useState<string | null>(null)
  const [viewingTokens, setViewingTokens] = useState<any[] | null>(null)
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const copyToClipboard = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedToken(id); setTimeout(() => setCopiedToken(null), 2000) } catch { /* ignore */ }
  }

  const [form, setForm] = useState({
    name: '',
    audience: 'all',
    custom_phones: '',
    reward_minutes: 120,
    expiry_hours: 12,
    quantity_cap: 0,
    sms_body: 'Hey {name}! Here is {minutes} minutes of free internet on us. Tap to connect: {portal_link}',
  })

  const fetchCampaigns = async () => {
    if (!token) return
    setLoading(true)
    try {
      const d = await api.getCampaigns({ limit: 200 })
      setCampaigns(d.campaigns || [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { fetchCampaigns() }, [token])

  const resetForm = () => {
    setForm({ name: '', audience: 'all', custom_phones: '', reward_minutes: 120, expiry_hours: 12, quantity_cap: 0, sms_body: 'Hey {name}! Here is {minutes} minutes of free internet on us. Tap to connect: {portal_link}' })
    setCreateStep(1)
  }

  const handleCreate = async () => {
    if (!form.name.trim()) { showToast('Campaign name is required', { type: 'error' }); return }
    setSubmitting(true)
    try {
      let target_filter = form.audience
      if (form.audience === 'custom') target_filter = `phones:${form.custom_phones}`
      const qty = form.quantity_cap > 0 ? form.quantity_cap : 9999
      await api.createCampaign({
        name: form.name,
        campaign_type: form.audience === 'top_spenders' ? 'loyalty_reward' : 'win_back',
        reward_minutes: form.reward_minutes,
        quantity: qty,
        expiry_hours: form.expiry_hours,
        target_filter,
      })
      showToast('Campaign created as draft', { type: 'success' })
      setShowCreate(false)
      resetForm()
      fetchCampaigns()
    } catch (e: any) { showToast(e.message || 'Failed', { type: 'error' }) } finally { setSubmitting(false) }
  }

  const handleLaunch = async (id: string) => {
    if (!confirm('Launch this campaign? Tokens will be generated and this cannot be undone.')) return
    setLaunching(id)
    try {
      const r = await api.launchCampaign(id)
      showToast(`Launched! ${r.tokens_generated} tokens generated.`, { type: 'success' })
      fetchCampaigns()
    } catch (e: any) { showToast(e.message || 'Failed', { type: 'error' }) } finally { setLaunching(null) }
  }

  const viewTokens = async (id: string) => {
    try {
      const d = await api.getCampaign(id)
      setViewingTokens(d.tokens || [])
      setShowTokenModal(true)
    } catch { showToast('Failed to load tokens', { type: 'error' }) }
  }

  const stats = {
    total: campaigns.length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    launched: campaigns.filter(c => c.status === 'launched').length,
    totalSent: campaigns.reduce((s, c) => s + (c.sent_count || 0), 0),
    totalRedeemed: campaigns.reduce((s, c) => s + (c.redeemed_count || 0), 0),
  }

  const smb = (n: number) => n?.toLocaleString() ?? '0'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Campaigns" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: C.void }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: C.text }}>
            Engagement Campaigns
          </h1>
          <button onClick={() => { resetForm(); setShowCreate(true) }} style={{ padding: '8px 14px', background: C.gold, border: 'none', borderRadius: 7, color: C.void, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> New Campaign
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '16px 20px', flex: 1, borderTop: `2px solid ${C.gold}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>Total Campaigns</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 500, color: C.text }}>{stats.total}</div>
          </div>
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '16px 20px', flex: 1, borderTop: `2px solid ${C.green}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}><Rocket size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Active</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 500, color: C.green }}>{stats.launched}</div>
          </div>
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '16px 20px', flex: 1, borderTop: `2px solid ${C.mute}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>Drafts</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 500, color: C.dim }}>{stats.draft}</div>
          </div>
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '16px 20px', flex: 1, borderTop: `2px solid ${C.dim}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}><Ticket size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Tokens Sent</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 500, color: C.text }}>{smb(stats.totalSent)}</div>
          </div>
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '16px 20px', flex: 1, borderTop: `2px solid ${C.gold}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}><TrendingUp size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Redeemed</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 500, color: C.gold }}>{smb(stats.totalRedeemed)}</div>
          </div>
        </div>

        {/* Loading */}
        {loading && <div style={{ textAlign: 'center', padding: 40, color: C.dim, fontSize: 13 }}>Loading...</div>}

        {/* Campaign List */}
        {!loading && campaigns.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
            <Rocket size={32} color={C.mute} />
            <div style={{ fontSize: 11, fontWeight: 600, color: C.dim }}>No campaigns yet</div>
            <div style={{ fontSize: 11, color: C.mute, textAlign: 'center', maxWidth: 280 }}>Create win-back or loyalty campaigns to engage your customers with reward tokens sent via SMS.</div>
            <button onClick={() => { resetForm(); setShowCreate(true) }} style={{ marginTop: 8, padding: '8px 14px', background: C.gold, color: C.void, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> Create Campaign
            </button>
          </div>
        )}

        {!loading && campaigns.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {campaigns.map(c => {
              const sent = c.sent_count || 0
              const redeemed = c.redeemed_count || 0
              const redemptionRate = sent > 0 ? Math.round((redeemed / sent) * 100) : 0
              const fillRate = c.quantity > 0 ? Math.min(100, Math.round((sent / c.quantity) * 100)) : 0
              return (
                <div key={c.id} style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}>{c.name}</span>
                        <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', background: `${C.dim}20`, color: C.dim, fontFamily: "'DM Mono', monospace" }}>
                          {c.campaign_type?.replace(/_/g, ' ')}
                        </span>
                        <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', background: `${(statusColors[c.status] || C.dim)}20`, color: statusColors[c.status] || C.dim, fontFamily: "'DM Mono', monospace" }}>
                          {c.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, fontSize: 9, color: C.dim, fontFamily: "'DM Mono', monospace" }}>
                        <span>{c.reward_minutes} min reward</span>
                        <span>{c.quantity} max tokens</span>
                        <span>{c.expiry_hours}h token expiry</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button onClick={() => viewTokens(c.id)} style={{ padding: '5px 10px', background: C.base, border: `0.5px solid ${C.border2}`, borderRadius: 5, color: C.dim, fontSize: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Eye size={11} /> Tokens
                      </button>
                      {c.status === 'draft' && (
                        <button onClick={() => handleLaunch(c.id)} disabled={launching === c.id} style={{ padding: '6px 12px', background: C.gold, border: 'none', borderRadius: 5, color: C.void, fontSize: 9, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Play size={12} /> {launching === c.id ? 'Launching...' : 'Launch'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fill progress bar */}
                  {c.quantity > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: C.mute, fontFamily: "'DM Mono', monospace", marginBottom: 3 }}>
                        <span>Tokens: {smb(sent)} / {smb(c.quantity)}</span>
                        <span>{fillRate}%</span>
                      </div>
                      <div style={{ height: 4, background: C.mute, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${fillRate}%`, background: C.dim, borderRadius: 2 }} />
                      </div>
                    </div>
                  )}

                  {/* Redemption rate — most prominent */}
                  {(sent > 0 || redeemed > 0) && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
                        <div>
                          <span style={{ fontSize: 9, color: C.dim, fontFamily: "'DM Mono', monospace" }}>
                            Redeemed: <strong style={{ color: C.green }}>{smb(redeemed)}</strong> / <span style={{ color: C.text }}>{smb(sent)}</span> sent
                          </span>
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: redemptionRate > 30 ? C.gold : C.dim, lineHeight: 1 }}>
                          {redemptionRate}%
                          <span style={{ fontSize: 8, fontWeight: 400, color: C.dim }}> redemption</span>
                        </div>
                      </div>
                      <div style={{ height: 6, background: C.mute, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${redemptionRate}%`, background: C.gold, borderRadius: 3, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 9, color: C.mute, fontFamily: "'DM Mono', monospace" }}>
                    <span>Created {new Date(c.created_at).toLocaleDateString()}</span>
                    {c.launched_at && <span>Launched {new Date(c.launched_at).toLocaleDateString()}</span>}
                    {!c.launched_at && <span style={{ color: C.dim }}>Draft · not yet launched</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Modal — 3 Steps */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowCreate(false)}>
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 24, maxWidth: 560, width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            {/* Step indicator */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
              {[1, 2, 3].map(step => (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: step < 3 ? 1 : 0 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, background: createStep >= step ? C.gold : C.mute, color: createStep >= step ? C.void : C.dim }}>
                    {step}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: createStep >= step ? C.gold : C.dim, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    {step === 1 ? 'Audience' : step === 2 ? 'Reward' : 'Message'}
                  </span>
                  {step < 3 && <div style={{ flex: 1, height: 1, background: createStep > step ? C.gold : C.mute }} />}
                </div>
              ))}
            </div>

            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 16 }}>
              {createStep === 1 ? 'Step 1: Who do you want to reach?' : createStep === 2 ? 'Step 2: What are you giving away?' : 'Step 3: Your message'}
            </div>

            {createStep === 1 && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>Campaign Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. July Win-Back" style={inputSx} required />
                </div>
                <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>Audience *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {audienceOptions.map(opt => {
                    const active = form.audience === opt.value
                    const Icon = opt.icon
                    return (
                      <button key={opt.value} type="button" onClick={() => setForm(p => ({ ...p, audience: opt.value }))}
                        style={{ padding: '10px 12px', borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: 'pointer', textAlign: 'left', background: active ? C.gold : '#080808', border: `0.5px solid ${active ? C.gold : C.border2}`, color: active ? '#000' : C.dim }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <Icon size={13} />
                          <span>{opt.label}</span>
                        </div>
                        {opt.desc && <div style={{ fontSize: 8, fontWeight: 400, opacity: 0.6 }}>{opt.desc}</div>}
                      </button>
                    )
                  })}
                </div>
                {form.audience === 'custom' && (
                  <div style={{ marginTop: 12 }}>
                    <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>Phone Numbers (one per line)</label>
                    <textarea value={form.custom_phones} onChange={e => setForm(p => ({ ...p, custom_phones: e.target.value }))} placeholder="0712345678&#10;0723456789&#10;0734567890" rows={4} style={{ ...inputSx, resize: 'vertical', fontFamily: "'DM Mono', monospace", fontSize: 11 }} />
                  </div>
                )}
              </div>
            )}

            {createStep === 2 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>Free Internet (minutes) *</label>
                    <input type="number" min={5} max={1440} value={form.reward_minutes} onChange={e => setForm(p => ({ ...p, reward_minutes: parseInt(e.target.value) || 120 }))} style={inputSx} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>Token Expiry (hours) *</label>
                    <input type="number" min={1} max={720} value={form.expiry_hours} onChange={e => setForm(p => ({ ...p, expiry_hours: parseInt(e.target.value) || 12 }))} style={inputSx} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>Quantity Cap (0 = unlimited)</label>
                  <input type="number" min={0} max={10000} value={form.quantity_cap} onChange={e => setForm(p => ({ ...p, quantity_cap: parseInt(e.target.value) || 0 }))} style={inputSx} />
                </div>
                <div style={{ padding: '12px 14px', background: '#0d0d00', border: `0.5px solid ${C.gold}30`, borderRadius: 7, fontSize: 10, color: C.gold, lineHeight: 1.6 }}>
                  Each customer gets <strong>{form.reward_minutes} minutes</strong> of free internet. Tokens expire <strong>{form.expiry_hours} hours</strong> after sending — the FOMO window. {form.quantity_cap > 0 ? `Capped at ${form.quantity_cap} tokens total.` : 'No quantity cap — send to everyone in the segment.'}
                </div>
              </div>
            )}

            {createStep === 3 && (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>SMS Message *</label>
                  <div style={{ position: 'relative' }}>
                    <textarea value={form.sms_body} onChange={e => setForm(p => ({ ...p, sms_body: e.target.value }))} rows={5}
                      style={{ ...inputSx, resize: 'vertical', fontFamily: 'Inter, sans-serif', fontSize: 12, lineHeight: 1.6, paddingBottom: 28 }} />
                    <div style={{ position: 'absolute', bottom: 6, right: 10, fontSize: 9, fontFamily: "'DM Mono', monospace", color: form.sms_body.length > 160 ? C.red : C.dim }}>
                      {form.sms_body.length} / 160 chars
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  {['{name}', '{minutes}', '{expiry_time}', '{portal_link}'].map(v => (
                    <button key={v} type="button" onClick={() => setForm(p => ({ ...p, sms_body: p.sms_body + v }))}
                      style={{ padding: '4px 8px', background: '#0d0d00', border: `0.5px solid ${C.gold}30`, borderRadius: 4, color: C.gold, fontSize: 9, fontFamily: "'DM Mono', monospace", cursor: 'pointer' }}>
                      {v}
                    </button>
                  ))}
                </div>
                <div style={{ padding: '12px 14px', background: '#080808', border: `0.5px solid ${C.border}`, borderRadius: 7 }}>
                  <div style={{ fontSize: 9, color: C.dim, marginBottom: 4, fontWeight: 700 }}>Preview</div>
                  <div style={{ fontSize: 11, color: C.text, lineHeight: 1.5, fontFamily: 'Inter, sans-serif' }}>
                    {form.sms_body.replace('{name}', 'John').replace('{minutes}', String(form.reward_minutes)).replace('{expiry_time}', `${form.expiry_hours}h`).replace('{portal_link}', 'wi-bill.vercel.app/portal?token=abc123')}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 20 }}>
              <div>
                {createStep > 1 ? (
                  <button type="button" onClick={() => setCreateStep(s => s - 1)} style={{ padding: '10px 16px', background: C.base, border: `0.5px solid ${C.border2}`, borderRadius: 7, color: C.dim, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ChevronLeft size={14} /> Back
                  </button>
                ) : (
                  <button type="button" onClick={() => setShowCreate(false)} style={{ padding: '10px 16px', background: C.base, border: `0.5px solid ${C.border2}`, borderRadius: 7, color: C.dim, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                )}
              </div>
              {createStep < 3 ? (
                <button type="button" onClick={() => setCreateStep(s => s + 1)} disabled={createStep === 1 && !form.name.trim()} style={{ padding: '10px 20px', background: C.gold, border: 'none', borderRadius: 7, color: C.void, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: createStep === 1 && !form.name.trim() ? 0.5 : 1 }}>
                  Next <ChevronRight size={14} />
                </button>
              ) : (
                <button type="button" onClick={handleCreate} disabled={submitting} style={{ padding: '10px 20px', background: submitting ? C.mute : C.gold, border: 'none', borderRadius: 7, color: C.void, fontSize: 11, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                  {submitting ? 'Saving...' : 'Save as Draft'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Token View Modal */}
      {showTokenModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowTokenModal(false)}>
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 24, maxWidth: 700, width: '90%', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: C.text }}>Campaign Tokens</div>
              <button onClick={() => setShowTokenModal(false)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer' }}><X size={20} /></button>
            </div>
            {!viewingTokens || viewingTokens.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: C.dim, fontSize: 11 }}>No tokens generated yet. Launch the campaign to generate tokens.</div>
            ) : (
              <div>
                <div style={{ padding: '10px 12px', background: '#0d0d00', border: `0.5px solid ${C.gold}30`, borderRadius: 7, marginBottom: 12, fontSize: 9, color: C.gold, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>
                  Redemption URL format:<br />
                  <strong style={{ color: C.text }}>https://wibill-production.up.railway.app/portal/YOUR_ISP_SLUG?token=CODE</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.4fr 0.4fr 0.4fr 0.3fr', borderBottom: `0.5px solid ${C.border}`, padding: '8px 12px', fontSize: 9, color: C.dim, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>
                  <span>Code</span><span>Minutes</span><span>Status</span><span>Expires</span><span></span>
                </div>
                {viewingTokens.map(t => {
                  const redemptionUrl = `https://wibill-production.up.railway.app/portal/YOUR_ISP_SLUG?token=${t.token_code}`
                  return (
                    <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr 0.4fr 0.4fr 0.4fr 0.3fr', padding: '8px 12px', borderBottom: `0.5px solid ${C.border}`, fontSize: 10, fontFamily: "'DM Mono', monospace", color: C.text, alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {t.token_code}
                        <button onClick={() => copyToClipboard(redemptionUrl, t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedToken === t.id ? C.green : C.dim, padding: 0, display: 'inline-flex' }}>
                          {copiedToken === t.id ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </span>
                      <span>{t.minutes}</span>
                      <span style={{ color: t.redeemed ? C.green : C.dim }}>{t.redeemed ? 'Redeemed' : 'Active'}</span>
                      <span style={{ color: C.mute }}>{new Date(t.expires_at).toLocaleDateString()}</span>
                      <span></span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}