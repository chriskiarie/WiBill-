'use client'
import { useAuth } from '@/lib/auth'
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Wifi, AlertCircle } from 'lucide-react'

export default function NetworkPage() {
  const { token } = useAuth()
  const { status, loading, error, refetch, isHealthy } = useNetworkStatus(token, { pollInterval: 10000 })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Network Status" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: '#030303' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Network Status</h1>

        {error && (
          <div style={{ padding: 12, background: '#3a1a1a', border: '1px solid #5a2d2d', borderRadius: 6, color: '#ff6b6b', marginBottom: 16 }}>
            {error}
            <button onClick={refetch} style={{ marginLeft: 8, color: '#ff8787', cursor: 'pointer' }}>
              Retry
            </button>
          </div>
        )}

        {loading && !status ? (
          <LoadingSpinner size="md" label="Checking network..." />
        ) : status ? (
          <div style={{ display: 'grid', gap: 16, maxWidth: 600 }}>
            {/* Status Card */}
            <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <Wifi size={24} color={isHealthy ? '#22c55e' : '#f87171'} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Status</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    {status.status === 'up' ? '🟢 Online' : '🔴 Offline'}
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#666', marginBottom: 8 }}>LATENCY</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#fff' }}>{status.latency_ms}ms</div>
              </div>
              <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#666', marginBottom: 8 }}>ACTIVE USERS</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#fff' }}>{status.active_users || 0}</div>
              </div>
            </div>

            <button
              onClick={refetch}
              style={{
                padding: '10px 20px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Refresh Now
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}