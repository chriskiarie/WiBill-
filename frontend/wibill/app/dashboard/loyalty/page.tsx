'use client'
import Topbar from '@/components/Topbar'
import { useAuth } from '@/lib/auth'

export default function LoyaltyPage() {
  const { user } = useAuth()

  const mono: React.CSSProperties = { fontFamily: 'DM Mono, monospace' }
  const card: React.CSSProperties = {
    background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 22,
  }

  const tiers = [
    { name: 'Starter',  min: 0,     max: 999,   color: '#555',    perks: ['Basic support', 'Standard portal templates'] },
    { name: 'Growth',   min: 1000,  max: 4999,  color: '#3b82f6', perks: ['Priority support', 'Custom domain', '2% fee discount'] },
    { name: 'Pro',      min: 5000,  max: 14999, color: '#a78bfa', perks: ['Dedicated support', 'White-label portal', '5% fee discount', 'Analytics export'] },
    { name: 'Elite',    min: 15000, max: null,   color: '#f59e0b', perks: ['SLA support', 'Full white-label', '8% fee discount', 'Custom integrations', 'Early feature access'] },
  ]

  const howToEarn = [
    { action: 'Customer completes a paid session',   points: '+10 pts' },
    { action: 'Customer pays via M-Pesa STK push',   points: '+5 pts'  },
    { action: 'Monthly active sessions > 100',        points: '+500 pts' },
    { action: 'Referring another ISP to WiBill',      points: '+2000 pts' },
    { action: 'On-time invoice payment',              points: '+200 pts' },
    { action: 'Complete ISP profile setup',           points: '+100 pts' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Loyalty Points" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: '#030303' }}>

        {/* coming soon banner */}
        <div style={{
          background: '#06132a', border: '0.5px solid #1a3a6e', borderRadius: 10,
          padding: '14px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 18 }}>🚀</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', marginBottom: 2 }}>
              Loyalty system — launching with Phase 5
            </div>
            <div style={{ ...mono, fontSize: 10, color: '#2a5090' }}>
              Points will track automatically once the live M-Pesa payment loop is fully deployed. Your tier and perks are locked in from day one.
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14, marginBottom: 14 }}>

          {/* current tier card */}
          <div style={{ ...card, borderTop: '1.5px solid #3b82f6' }}>
            <div style={{ fontSize: 10, color: '#2a2a2a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>
              Your tier
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: '#06132a', border: '1px solid #1a3a6e',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
              }}>
                🌱
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#3b82f6', letterSpacing: '-0.5px' }}>
                  Starter
                </div>
                <div style={{ ...mono, fontSize: 10, color: '#2a2a2a', marginTop: 2 }}>
                  0 / 1,000 pts to Growth
                </div>
              </div>
            </div>
            {/* progress bar */}
            <div style={{ height: 4, background: '#0d0d0d', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '0%', background: '#3b82f6', borderRadius: 2 }} />
            </div>
            <div style={{ ...mono, fontSize: 28, fontWeight: 500, color: '#f0f0f0', letterSpacing: '-1px', marginBottom: 4 }}>
              0
            </div>
            <div style={{ fontSize: 10, color: '#2a2a2a' }}>points earned</div>
          </div>

          {/* how to earn */}
          <div style={card}>
            <div style={{ fontSize: 10, color: '#2a2a2a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>
              How to earn points
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {howToEarn.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 0', borderBottom: i < howToEarn.length - 1 ? '0.5px solid #0a0a0a' : 'none',
                }}>
                  <span style={{ fontSize: 11, color: '#444', flex: 1 }}>{item.action}</span>
                  <span style={{
                    ...mono, fontSize: 10, fontWeight: 700,
                    color: '#22c55e', background: '#0d2010',
                    padding: '2px 8px', borderRadius: 4, flexShrink: 0, marginLeft: 12,
                  }}>
                    {item.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* tier table */}
        <div style={card}>
          <div style={{ fontSize: 10, color: '#2a2a2a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 18 }}>
            Tier benefits
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {tiers.map((tier, i) => (
              <div key={i} style={{
                background: '#060606', border: `0.5px solid ${i === 0 ? '#141414' : tier.color + '30'}`,
                borderRadius: 10, padding: 16,
                borderTop: `2px solid ${tier.color}`,
                opacity: i === 0 ? 1 : 0.6,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: tier.color, marginBottom: 4 }}>
                  {tier.name}
                </div>
                <div style={{ ...mono, fontSize: 9, color: '#1e1e1e', marginBottom: 14 }}>
                  {tier.max
                    ? `${tier.min.toLocaleString()} – ${tier.max.toLocaleString()} pts`
                    : `${tier.min.toLocaleString()}+ pts`}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {tier.perks.map((perk, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <span style={{ color: tier.color, fontSize: 10, flexShrink: 0, marginTop: 1 }}>✓</span>
                      <span style={{ fontSize: 10, color: '#333', lineHeight: 1.4 }}>{perk}</span>
                    </div>
                  ))}
                </div>
                {i === 0 && (
                  <div style={{
                    ...mono, fontSize: 9, color: '#3b82f6',
                    background: '#06132a', borderRadius: 4, padding: '3px 8px',
                    marginTop: 12, textAlign: 'center',
                  }}>
                    CURRENT TIER
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}