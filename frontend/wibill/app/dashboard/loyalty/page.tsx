'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { api, maskPhone } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { useToast } from '@/context/ToastContext'
import { Search, Users, Gift, Award, TrendingUp, Send, X, Crown, ExternalLink } from 'lucide-react'

const C = {
  void: '#000000', base: '#0a0a0a', border: '#141414', border2: '#1a1a1a',
  text: '#f0f0f0', dim: '#666666', mute: '#2a2a2a',
  gold: '#E8B84B', green: '#22c55e', red: '#ef4444',
}

interface Account {
  id: string; phone_number: string; points_balance: number; total_points_earned: number
  total_redeemed: number; total_spent_ksh: number; lifetime_sessions: number
  created_at: string; last_activity_at: string | null
}

export default function LoyaltyPage() {
  const { token, user } = useAuth()
  const { showToast } = useToast()

  const features = (user as any)?.features ?? {}
  const isAllowed = features.loyalty !== false

  const [accounts, setAccounts] = useState<Account[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendTarget, setSendTarget] = useState<Account | null>(null)
  const [rewardMinutes, setRewardMinutes] = useState(60)
  const [rewardReason, setRewardReason] = useState('')
  const [sending, setSending] = useState(false)
  const [sentCode, setSentCode] = useState<string | null>(null)

  const fmt = (n: number) => n?.toLocaleString() ?? '0'
  const fmtKsh = (n: number) => `Ksh ${fmt(Math.round(n))}`

  const fetchData = async () => {
    if (!token) return; setLoading(true)
    try {
      const [a, s] = await Promise.all([
        api.getLoyaltyAccounts({ search: search || undefined, limit: 200 }),
        api.getLoyaltyStats(),
      ])
      setAccounts(a.accounts || [])
      setStats(s)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [token])

  const handleSearch = () => fetchData()

  // Sort by points desc for leaderboard
  const leaderboard = [...accounts].sort((a, b) => b.points_balance - a.points_balance)

  // Stats
  const avgSpend = accounts.length > 0
    ? accounts.reduce((s, a) => s + a.total_spent_ksh, 0) / accounts.length
    : 0
  const topAccount = accounts.length > 0
    ? accounts.reduce((best, a) => a.total_spent_ksh > (best?.total_spent_ksh || 0) ? a : best, accounts[0])
    : null

  const openSend = (account: Account) => {
    setSendTarget(account); setRewardMinutes(60); setRewardReason(''); setSentCode(null); setShowSendModal(true)
  }

  const handleSendReward = async () => {
    if (!sendTarget) return; setSending(true)
    try {
      const res = await api.sendReward({ account_id: sendTarget.id, minutes: rewardMinutes, reason: rewardReason || undefined })
      setSentCode(res.token_code)
      // Update local state
      setAccounts(accounts.map(a => a.id === sendTarget.id ? { ...a, points_balance: res.points_remaining, total_redeemed: a.total_redeemed + rewardMinutes } : a))
      showToast(`Reward token sent: ${res.token_code}`, { type: 'success' })
    } catch (err) { showToast('Failed to send reward', { type: 'error', message: (err as Error).message }) }
    finally { setSending(false) }
  }

  if (!isAllowed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: C.void, color: C.dim, fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
        <Award size={32} color={C.mute} />
        <div style={{ marginTop: 12, fontWeight: 600, color: C.text }}>Loyalty not available</div>
        <div style={{ marginTop: 4, color: C.mute, fontSize: 11, textAlign: 'center', maxWidth: 280 }}>Upgrade to Premium to access loyalty rewards.</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Loyalty" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: C.void }}>
        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: C.text }}>Loyalty</h1>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Users size={13} color={C.dim} />
              <span style={{ fontSize: 9, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Inter, sans-serif' }}>Enrolled Customers</span>
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 500, color: C.text }}>{fmt(stats?.total_enrolled ?? accounts.length)}</div>
          </div>
          <div style={{ flex: 1, background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Award size={13} color={C.gold} />
              <span style={{ fontSize: 9, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Inter, sans-serif' }}>Points Outstanding</span>
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 500, color: C.gold }}>{fmt(stats?.total_points_outstanding ?? 0)}</div>
          </div>
          <div style={{ flex: 1, background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <TrendingUp size={13} color={C.dim} />
              <span style={{ fontSize: 9, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Inter, sans-serif' }}>Avg Lifetime Spend</span>
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 500, color: C.text }}>{fmtKsh(Math.round(avgSpend))}</div>
          </div>
          <div style={{ flex: 1, background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Crown size={13} color={C.gold} />
              <span style={{ fontSize: 9, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Inter, sans-serif' }}>Top Customer</span>
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 500, color: C.text }}>
              {topAccount ? maskPhone(topAccount.phone_number) : '—'}
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '0 0 300px' }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.mute }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by phone..." onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
              style={{ width: '100%', padding: '9px 12px 9px 32px', background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' }} />
          </div>
          <button onClick={handleSearch}
            style={{ padding: '9px 14px', background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Search
          </button>
        </div>

        {/* Loading */}
        {loading && <div style={{ textAlign: 'center', padding: 40, color: C.dim, fontSize: 13, fontFamily: "'DM Mono', monospace" }}>Loading...</div>}

        {/* Empty */}
        {!loading && leaderboard.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
            <Gift size={32} color={C.mute} />
            <div style={{ fontSize: 11, fontWeight: 600, color: C.dim, fontFamily: 'Inter, sans-serif' }}>No loyalty customers yet</div>
            <div style={{ fontSize: 11, color: C.mute, textAlign: 'center', maxWidth: 280, fontFamily: 'Inter, sans-serif' }}>Customers earn 1 point per Ksh spent on packages. Points appear here automatically.</div>
          </div>
        )}

        {/* Leaderboard table */}
        {!loading && leaderboard.length > 0 && (
          <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1.2fr 1fr 1fr 1fr 80px', borderBottom: `0.5px solid ${C.border}`, background: '#070707' }}>
              {['Rank', 'Customer', 'Points', 'Lifetime Spend', 'Last Seen', ''].map(h => (
                <div key={h} style={{ padding: '11px 16px', fontSize: 9, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Inter, sans-serif' }}>{h}</div>
              ))}
            </div>
            {leaderboard.map((a, i) => (
              <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '40px 1.2fr 1fr 1fr 1fr 80px', alignItems: 'center', borderBottom: i < leaderboard.length - 1 ? `0.5px solid #0d0d0d` : 'none' }}>
                <div style={{ padding: '12px 16px', fontFamily: "'DM Mono', monospace", fontSize: 11, color: i < 3 ? C.gold : C.dim, fontWeight: i < 3 ? 700 : 400 }}>
                  #{i + 1}
                </div>
                <div style={{ padding: '12px 16px', fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.text, fontWeight: 600 }}>
                  {maskPhone(a.phone_number)}
                </div>
                <div style={{ padding: '12px 16px', fontFamily: "'DM Mono', monospace", fontSize: 12, color: a.points_balance > 0 ? C.gold : C.dim, fontWeight: 500 }}>
                  {fmt(a.points_balance)}
                </div>
                <div style={{ padding: '12px 16px', fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.text, fontWeight: 500 }}>
                  {fmtKsh(a.total_spent_ksh)}
                </div>
                <div style={{ padding: '12px 16px', fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.dim }}>
                  {a.last_activity_at ? new Date(a.last_activity_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '—'}
                </div>
                <div style={{ padding: '12px 16px' }}>
                  <button onClick={() => openSend(a)} disabled={a.points_balance < 5}
                    title={a.points_balance < 5 ? 'Minimum 5 points to send reward' : 'Send reward token'}
                    style={{
                      padding: '5px 10px', borderRadius: 6, cursor: a.points_balance >= 5 ? 'pointer' : 'not-allowed',
                      background: a.points_balance >= 5 ? 'rgba(232,184,75,0.12)' : 'transparent',
                      border: a.points_balance >= 5 ? 'none' : `0.5px solid ${C.mute}`,
                      color: a.points_balance >= 5 ? C.gold : C.mute,
                      display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                    }}>
                    <Send size={11} /> Send
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send Reward Modal */}
      {showSendModal && sendTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.base, border: `0.5px solid ${C.border2}`, borderRadius: 11, padding: 24, maxWidth: 420, width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}>
                <Send size={14} style={{ marginRight: 6, verticalAlign: 'middle', color: C.gold }} />
                Send Reward
              </div>
              <button onClick={() => { setShowSendModal(false); setSentCode(null) }} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {sentCode ? (
              <div>
                <div style={{
                  background: 'rgba(232,184,75,0.08)', border: `0.5px solid ${C.gold}`, borderRadius: 8,
                  padding: 16, textAlign: 'center', marginBottom: 16,
                }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: C.gold, marginBottom: 4 }}>Reward Token Generated</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 700, color: C.text, letterSpacing: '1px', marginBottom: 8 }}>{sentCode}</div>
                  <button onClick={() => { navigator.clipboard.writeText(sentCode); showToast('Copied!', { type: 'success' }) }}
                    style={{ padding: '6px 12px', background: C.gold, border: 'none', borderRadius: 5, color: '#000', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    Copy Code
                  </button>
                </div>
                <div style={{ fontSize: 10, color: C.dim, fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
                  Share this code with {maskPhone(sendTarget.phone_number)}. They can redeem it on the portal.
                </div>
                <button onClick={() => { setShowSendModal(false); setSentCode(null) }}
                  style={{ width: '100%', marginTop: 16, padding: '10px', background: C.gold, border: 'none', borderRadius: 6, color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  Done
                </button>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>CUSTOMER</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: C.text, fontWeight: 600 }}>{maskPhone(sendTarget.phone_number)}</div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>Available Points</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: C.gold, fontWeight: 600 }}>{fmt(sendTarget.points_balance)}</div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5, fontFamily: 'Inter, sans-serif' }}>Minutes *</label>
                  <input type="number" min={5} max={1440} value={rewardMinutes} onChange={e => setRewardMinutes(parseInt(e.target.value) || 5)}
                    style={{ width: '100%', padding: '10px 12px', background: '#050505', border: `0.5px solid ${C.mute}`, borderRadius: 7, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                  <div style={{ fontSize: 9, color: sendTarget.points_balance >= rewardMinutes ? C.dim : C.red, marginTop: 4, fontFamily: 'Inter, sans-serif' }}>
                    Will deduct {rewardMinutes} points {sendTarget.points_balance >= rewardMinutes ? `(${fmt(sendTarget.points_balance - rewardMinutes)} remaining)` : '(insufficient!)'}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5, fontFamily: 'Inter, sans-serif' }}>Reason (optional)</label>
                  <input type="text" value={rewardReason} onChange={e => setRewardReason(e.target.value)} placeholder="e.g. Customer of the month"
                    style={{ width: '100%', padding: '10px 12px', background: '#050505', border: `0.5px solid ${C.mute}`, borderRadius: 7, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setShowSendModal(false); setSentCode(null) }} disabled={sending}
                    style={{ padding: '10px 16px', background: 'transparent', border: `0.5px solid ${C.mute}`, borderRadius: 6, color: C.dim, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Cancel</button>
                  <button onClick={handleSendReward} disabled={sending || sendTarget.points_balance < rewardMinutes}
                    style={{ padding: '10px 16px', background: sending || sendTarget.points_balance < rewardMinutes ? C.mute : C.gold, border: 'none', borderRadius: 6, color: '#000', fontSize: 11, fontWeight: 700, cursor: sending || sendTarget.points_balance < rewardMinutes ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {sending ? 'Generating\u2026' : 'Generate Reward Token'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}