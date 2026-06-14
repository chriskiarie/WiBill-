'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { useToast } from '@/context/ToastContext'
import { Search, Award, TrendingUp, Users, Gift } from 'lucide-react'

export default function LoyaltyPage() {
  const { token } = useAuth()
  const { showToast } = useToast()

  const [accounts, setAccounts] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [accountDetail, setAccountDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fmt = (n: number) => n?.toLocaleString() ?? '0'
  const fmtKsh = (n: number) => `Ksh ${fmt(Math.round(n))}`

  const fetchData = async () => {
    if (!token) return
    setLoading(true)
    try {
      const [a, s] = await Promise.all([
        api.getLoyaltyAccounts({ search: search || undefined, limit: 100 }),
        api.getLoyaltyStats(),
      ])
      setAccounts(a.accounts || [])
      setStats(s)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [token])

  const handleSearch = () => fetchData()

  const viewCustomer = async (phone: string) => {
    setSelectedPhone(phone)
    setDetailLoading(true)
    try {
      const d = await api.getLoyaltyAccountByPhone(phone)
      setAccountDetail(d)
    } catch { showToast('Failed to load customer', { type: 'error' }) } finally { setDetailLoading(false) }
  }

  const StatCard = ({ label, value, color, icon }: any) => (
    <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: '16px 20px', flex: 1, borderTop: `2px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {icon}
        <div style={{ fontSize: 9, fontWeight: 700, color: '#2a2a2a', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</div>
      </div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 500, color }}>{value}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Loyalty Points" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: '#030303' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, marginBottom: 20 }}>Customer Loyalty</h1>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <StatCard label="Enrolled Customers" value={fmt(stats?.total_enrolled ?? 0)} color="#3b82f6" icon={<Users size={14} color="#3b82f6" />} />
          <StatCard label="Points Outstanding" value={fmt(stats?.total_points_outstanding ?? 0)} color="#22c55e" icon={<Award size={14} color="#22c55e" />} />
          <StatCard label="Points Redeemed" value={fmt(stats?.total_points_redeemed ?? 0)} color="#f59e0b" icon={<Gift size={14} color="#f59e0b" />} />
          <StatCard label="Lifetime Spend" value={fmtKsh(stats?.total_lifetime_spent_ksh ?? 0)} color="#f0f0f0" icon={<TrendingUp size={14} color="#f0f0f0" />} />
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#333' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by phone number..." onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
              style={{ width: '100%', padding: '9px 12px 9px 34px', background: '#080808', border: '0.5px solid #1a1a1a', borderRadius: 7, color: '#e0e0e0', fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <button onClick={handleSearch} style={{ padding: '8px 14px', background: '#3b82f6', border: 'none', borderRadius: 7, color: '#030303', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Search</button>
        </div>

        {/* Main Content */}
        <div style={{ display: 'grid', gridTemplateColumns: selectedPhone ? '1fr 360px' : '1fr', gap: 16 }}>
          {/* Customer List */}
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#444', fontSize: 13 }}>Loading...</div>
            ) : accounts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🏆</div>
                <div style={{ fontSize: 14, marginBottom: 8 }}>No loyalty customers yet</div>
                <div style={{ fontSize: 12, color: '#666' }}>Customers earn points automatically when they purchase packages</div>
              </div>
            ) : (
              <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr 1fr 1fr', borderBottom: '0.5px solid #101010', background: '#0a0a0a' }}>
                  {['Phone', 'Points', 'Sessions', 'Total Spent', 'Last Active'].map((h, i) => (
                    <div key={i} style={{ padding: '11px 16px', fontSize: 9, fontWeight: 700, color: '#2a2a2a', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</div>
                  ))}
                </div>
                {accounts.map((a, i) => (
                  <div key={a.id} onClick={() => viewCustomer(a.phone_number)} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr 1fr 1fr', borderBottom: i < accounts.length - 1 ? '0.5px solid #0a0a0a' : 'none', alignItems: 'center', cursor: 'pointer' }}>
                    <div style={{ padding: '12px 16px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: selectedPhone === a.phone_number ? '#3b82f6' : '#e0e0e0', fontWeight: 600 }}>
                      {a.phone_number?.replace(/(\d{3})\d{4}(\d{3})/, '$1••••$2')}
                    </div>
                    <div style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'DM Mono, monospace', color: a.points_balance > 0 ? '#22c55e' : '#666' }}>
                      {a.points_balance}
                    </div>
                    <div style={{ padding: '12px 16px', fontSize: 11, color: '#666' }}>{a.lifetime_sessions}</div>
                    <div style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#e0e0e0' }}>
                      Ksh {fmt(a.total_spent_ksh)}
                    </div>
                    <div style={{ padding: '12px 16px', fontSize: 10, color: '#555', fontFamily: 'DM Mono, monospace' }}>
                      {a.last_activity_at ? new Date(a.last_activity_at).toLocaleDateString() : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Top Customers */}
            {stats?.top_customers?.length > 0 && (
              <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 20, marginTop: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#2a2a2a', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>🏅 Top Customers</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {stats.top_customers.map((c: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < stats.top_customers.length - 1 ? '0.5px solid #0a0a0a' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, color: '#555', fontFamily: 'DM Mono, monospace' }}>#{i + 1}</span>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#ccc' }}>{c.phone_number?.replace(/(\d{3})\d{4}(\d{3})/, '$1••••$2')}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 10, color: '#666', fontFamily: 'DM Mono, monospace' }}>
                        <span style={{ color: '#22c55e' }}>{c.points_balance} pts</span>
                        <span>Ksh {fmt(c.total_spent_ksh)}</span>
                        <span>{c.lifetime_sessions} sessions</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Customer Detail Drawer */}
          {selectedPhone && (
            <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 20, position: 'sticky', top: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>Customer Profile</div>
                <button onClick={() => { setSelectedPhone(null); setAccountDetail(null) }} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 16 }}>&times;</button>
              </div>

              {detailLoading ? (
                <div style={{ color: '#444', fontSize: 12 }}>Loading...</div>
              ) : accountDetail ? (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>PHONE</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, color: '#e0e0e0', fontWeight: 600 }}>{accountDetail.account.phone_number}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    <div style={{ background: '#0a0a0a', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 9, color: '#444', marginBottom: 4 }}>POINTS</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 600, color: '#22c55e' }}>{accountDetail.account.points_balance}</div>
                    </div>
                    <div style={{ background: '#0a0a0a', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 9, color: '#444', marginBottom: 4 }}>SPENT</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 600, color: '#f0f0f0' }}>Ksh {fmt(accountDetail.account.total_spent_ksh)}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    <div style={{ background: '#0a0a0a', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 9, color: '#444', marginBottom: 4 }}>EARNED</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 500, color: '#f59e0b' }}>{accountDetail.account.total_points_earned} pts</div>
                    </div>
                    <div style={{ background: '#0a0a0a', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 9, color: '#444', marginBottom: 4 }}>REDEEMED</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 500, color: '#3b82f6' }}>{accountDetail.account.total_redeemed} pts</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: '#444', marginBottom: 4 }}>SESSIONS</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 500, color: '#e0e0e0' }}>{accountDetail.account.lifetime_sessions}</div>
                  </div>

                  {accountDetail.transactions?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#2a2a2a', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Recent Activity</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {accountDetail.transactions.slice(0, 10).map((t: any) => (
                          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid #0a0a0a', fontSize: 10, color: '#666' }}>
                            <span style={{ color: t.type === 'earn' ? '#22c55e' : '#3b82f6' }}>
                              {t.type === 'earn' ? '+' : '−'}{t.points} pts
                            </span>
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9 }}>{new Date(t.created_at).toLocaleDateString()}</span>
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
    </div>
  )
}
