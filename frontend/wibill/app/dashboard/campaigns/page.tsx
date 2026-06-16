'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { useToast } from '@/context/ToastContext'
import { Plus, X, Rocket, Play, Search, Star, Ticket, Clock, Users, TrendingUp } from 'lucide-react'

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

const campaignTypes = [
  { value: 'win_back', label: 'Win-Back', desc: 'Re-engage inactive customers' },
  { value: 'loyalty_reward', label: 'Loyalty Reward', desc: 'Reward frequent buyers' },
  { value: 'engagement', label: 'Engagement', desc: 'Drive repeat purchases' },
  { value: 'promotional', label: 'Promotional', desc: 'Limited-time offers' },
]

const statusColors: Record<string, string> = {
  draft: C.dim, launched: C.green, completed: C.gold, cancelled: C.red,
}

export default function CampaignsPage() {
  const { token } = useAuth()
  const { showToast } = useToast()

  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [launching, setLaunching] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', campaign_type: 'win_back', reward_minutes: 30, quantity: 100, expiry_hours: 48, target_filter: '',
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { showToast('Campaign name is required', { type: 'error' }); return }
    setSubmitting(true)
    try {
      await api.createCampaign({
        name: form.name,
        campaign_type: form.campaign_type,
        reward_minutes: form.reward_minutes,
        quantity: form.quantity,
        expiry_hours: form.expiry_hours,
        target_filter: form.target_filter || undefined,
      })
      showToast('Campaign created', { type: 'success' })
      setShowCreate(false)
      fetchCampaigns()
    } catch (e: any) { showToast(e.message || 'Failed', { type: 'error' }) } finally { setSubmitting(false) }
  }

  const handleLaunch = async (id: string) => {
    if (!confirm('Launch this campaign? Tokens will be generated immediately and cannot be undone.')) return
    setLaunching(id)
    try {
      const r = await api.launchCampaign(id)
      showToast(`Campaign launched! ${r.tokens_generated} tokens generated.`, { type: 'success' })
      fetchCampaigns()
    } catch (e: any) { showToast(e.message || 'Failed', { type: 'error' }) } finally { setLaunching(null) }
  }

  const stats = {
    total: campaigns.length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    launched: campaigns.filter(c => c.status === 'launched').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
    totalTokens: campaigns.reduce((s, c) => s + (c.sent_count || 0), 0),
    totalRedeemed: campaigns.reduce((s, c) => s + (c.redeemed_count || 0), 0),
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Campaigns" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: C.void }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: C.text }}>
            Engagement Campaigns
          </h1>
          <button onClick={() => setShowCreate(true)} style={{ padding: '8px 14px', background: C.gold, border: 'none', borderRadius: 7, color: C.void, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
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
            <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>
              <Rocket size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Active
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 500, color: C.green }}>{stats.launched}</div>
          </div>
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '16px 20px', flex: 1, borderTop: `2px solid ${C.mute}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>Drafts</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 500, color: C.dim }}>{stats.draft}</div>
          </div>
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '16px 20px', flex: 1, borderTop: `2px solid ${C.dim}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>
              <Ticket size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Tokens Sent
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 500, color: C.text }}>{stats.totalTokens}</div>
          </div>
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '16px 20px', flex: 1, borderTop: `2px solid ${C.green}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>
              <TrendingUp size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Redeemed
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 500, color: C.green }}>{stats.totalRedeemed}</div>
          </div>
        </div>

        {/* Loading */}
        {loading && <div style={{ textAlign: 'center', padding: 40, color: C.dim, fontSize: 13 }}>Loading...</div>}

        {/* Campaign List */}
        {!loading && campaigns.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
            <Star size={32} color={C.mute} />
            <div style={{ fontSize: 11, fontWeight: 600, color: C.dim }}>No campaigns yet</div>
            <div style={{ fontSize: 11, color: C.mute, textAlign: 'center', maxWidth: 280 }}>Create win-back or loyalty campaigns to engage your customers with reward tokens.</div>
            <button onClick={() => setShowCreate(true)} style={{ marginTop: 8, padding: '8px 14px', background: C.gold, color: C.void, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> Create Campaign
            </button>
          </div>
        )}

        {!loading && campaigns.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {campaigns.map(c => {
              const progress = c.quantity > 0 ? Math.round(((c.sent_count || 0) / c.quantity) * 100) : 0
              return (
                <div key={c.id} style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}>{c.name}</span>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: `${(statusColors[c.status] || C.dim)}20`, color: statusColors[c.status] || C.dim, fontFamily: "'DM Mono', monospace" }}>
                          {c.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 10, color: C.dim, fontFamily: "'DM Mono', monospace" }}>
                        <span>{c.campaign_type}</span>
                        <span>{c.reward_minutes} min reward</span>
                        <span>{c.quantity} tokens</span>
                        <span>{c.expiry_hours}h expiry</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {c.status === 'draft' && (
                        <button onClick={() => handleLaunch(c.id)} disabled={launching === c.id}
                          style={{ padding: '6px 12px', background: C.gold, border: 'none', borderRadius: 5, color: C.void, fontSize: 9, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Play size={12} /> {launching === c.id ? 'Launching...' : 'Launch'}
                        </button>
                      )}
                    </div>
                  </div>

                  {(c.sent_count > 0 || c.redeemed_count > 0) && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 16, fontSize: 10, color: C.dim, fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>
                        <span>Sent: <span style={{ color: C.text, fontWeight: 600 }}>{c.sent_count}</span></span>
                        <span>Redeemed: <span style={{ color: C.green, fontWeight: 600 }}>{c.redeemed_count}</span></span>
                      </div>
                      <div style={{ height: 3, background: C.mute, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: C.gold, borderRadius: 2, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 8, fontSize: 9, color: C.mute, fontFamily: "'DM Mono', monospace" }}>
                    Created {new Date(c.created_at).toLocaleDateString()}
                    {c.launched_at && <> · Launched {new Date(c.launched_at).toLocaleDateString()}</>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowCreate(false)}>
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 24, maxWidth: 520, width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: C.text }}>New Campaign</div>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>Campaign Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. July Win-Back" style={inputSx} required />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>Campaign Type *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {campaignTypes.map(t => (
                    <button key={t.value} type="button" onClick={() => setForm(p => ({ ...p, campaign_type: t.value }))}
                      style={{ padding: '10px', borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: 'pointer', textAlign: 'left', background: form.campaign_type === t.value ? C.gold : '#080808', border: `0.5px solid ${form.campaign_type === t.value ? C.gold : C.border2}`, color: form.campaign_type === t.value ? '#000' : C.dim }}>
                      <div>{t.label}</div>
                      <div style={{ fontSize: 8, fontWeight: 400, marginTop: 2, opacity: 0.7 }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>Reward (minutes) *</label>
                  <input type="number" min={5} max={1440} value={form.reward_minutes} onChange={e => setForm(p => ({ ...p, reward_minutes: parseInt(e.target.value) || 30 }))} style={inputSx} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>Quantity *</label>
                  <input type="number" min={1} max={10000} value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: parseInt(e.target.value) || 100 }))} style={inputSx} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>Expiry (hours)</label>
                  <input type="number" min={1} value={form.expiry_hours} onChange={e => setForm(p => ({ ...p, expiry_hours: parseInt(e.target.value) || 48 }))} style={inputSx} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>Target Filter</label>
                  <input type="text" value={form.target_filter} onChange={e => setForm(p => ({ ...p, target_filter: e.target.value }))} placeholder="phone prefix, area..." style={inputSx} />
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: '#0d0d00', border: `0.5px solid ${C.gold}30`, borderRadius: 7, marginBottom: 16, fontSize: 10, color: C.gold, lineHeight: 1.6 }}>
                This will create a <strong>{form.campaign_type.replace('_', ' ')}</strong> campaign with {form.quantity} reward tokens ({form.reward_minutes} min each). Tokens expire after {form.expiry_hours}h. Launch when ready.
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={submitting} style={{ flex: 1, padding: '12px', background: submitting ? C.mute : C.gold, border: 'none', borderRadius: 7, color: C.void, fontSize: 12, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                  {submitting ? 'Creating...' : 'Create Campaign'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} style={{ padding: '12px 16px', background: C.base, border: `0.5px solid ${C.border2}`, borderRadius: 7, color: C.dim, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}