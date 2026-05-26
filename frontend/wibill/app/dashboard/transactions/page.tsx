'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import Topbar from '@/components/Topbar'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const MOCK = [
  { id:'1', phone_number:'0712345456', package_id:'1hr', amount:20, platform_fee:2, isp_earnings:18, mpesa_receipt:'RGX8A2KL1P', created_at: new Date(Date.now()-3*60000).toISOString() },
  { id:'2', phone_number:'0798123012', package_id:'6hr', amount:50, platform_fee:5, isp_earnings:45, mpesa_receipt:'RGX8A2KL2P', created_at: new Date(Date.now()-21*60000).toISOString() },
  { id:'3', phone_number:'0723456789', package_id:'24hr', amount:100, platform_fee:10, isp_earnings:90, mpesa_receipt:'RGX8A2KL3P', created_at: new Date(Date.now()-57*60000).toISOString() },
  { id:'4', phone_number:'0745678321', package_id:'1hr', amount:20, platform_fee:2, isp_earnings:18, mpesa_receipt:'RGX8A2KL4P', created_at: new Date(Date.now()-80*60000).toISOString() },
  { id:'5', phone_number:'0711654987', package_id:'6hr', amount:50, platform_fee:5, isp_earnings:45, mpesa_receipt:'RGX8A2KL5P', created_at: new Date(Date.now()-122*60000).toISOString() },
  { id:'6', phone_number:'0733987123', package_id:'24hr', amount:100, platform_fee:10, isp_earnings:90, mpesa_receipt:'RGX8A2KL6P', created_at: new Date(Date.now()-200*60000).toISOString() },
]

function fmt(n: number) { return n.toLocaleString('en-KE') }
function ago(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'just now'
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff/60)}h ago`
  return `${Math.floor(diff/1440)}d ago`
}

export default function TransactionsPage() {
  const { token } = useAuth()
  const [txns, setTxns] = useState<any[]>(MOCK)

  useEffect(() => {
    if (!token) return
    fetch(`${API}/api/transactions/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.length) setTxns(d) })
      .catch(() => {})
  }, [token])

  const gross = txns.reduce((a, t) => a + (t.amount || t.amount_ksh || 0), 0)
  const fees = txns.reduce((a, t) => a + (t.platform_fee || t.platform_fee_ksh || 0), 0)
  const net = txns.reduce((a, t) => a + (t.isp_earnings || t.isp_earnings_ksh || 0), 0)

  const exportCSV = () => {
    const rows = [['Receipt', 'Phone', 'Package', 'Amount', 'Fee', 'Net', 'Time'],
      ...txns.map(t => [t.mpesa_receipt, t.phone_number, t.package_id || '—', t.amount || t.amount_ksh, t.platform_fee || t.platform_fee_ksh, t.isp_earnings || t.isp_earnings_ksh, t.created_at])]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `wibill-transactions-${new Date().toISOString().slice(0,10)}.csv`; a.click()
  }

  const SumCard = ({ label, value, color }: any) => (
    <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: '18px', flex: 1, borderTop: `1.5px solid ${color}` }}>
      <div style={{ fontSize: 10, color: '#2a2a2a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 22, fontWeight: 500, color: '#f0f0f0', letterSpacing: '-0.5px' }}>Ksh {fmt(value)}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Transactions" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: '#030303' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <SumCard label="Gross revenue" value={gross} color="#3b82f6" />
          <SumCard label="Platform fees (10%)" value={fees} color="#f59e0b" />
          <SumCard label="Your earnings (90%)" value={net} color="#22c55e" />
          <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 10, color: '#2a2a2a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{txns.length} Transactions</div>
            <button onClick={exportCSV} style={{ background: '#0a0a0a', border: '0.5px solid #1a1a1a', borderRadius: 7, padding: '8px 14px', color: '#3b82f6', fontFamily: 'DM Mono, monospace', fontSize: 10, cursor: 'pointer' }}>Export CSV</button>
          </div>
        </div>

        <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.7fr 0.9fr 0.7fr 0.7fr 0.8fr', borderBottom: '0.5px solid #101010' }}>
            {['M-PESA RECEIPT', 'PHONE', 'PACKAGE', 'AMOUNT', 'FEE', 'NET', 'TIME'].map((h, i) => (
              <div key={i} style={{ padding: '11px 16px', fontSize: 9, fontWeight: 700, color: '#1e1e1e', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</div>
            ))}
          </div>
          {txns.map((t, i) => (
            <div key={t.id || i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.7fr 0.9fr 0.7fr 0.7fr 0.8fr', borderBottom: i < txns.length - 1 ? '0.5px solid #0a0a0a' : 'none' }}>
              <div style={{ padding: '12px 16px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#2a2a2a' }}>{t.mpesa_receipt || '—'}</div>
              <div style={{ padding: '12px 16px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#2a2a2a' }}>{t.phone_number?.replace(/(\d{3})\d{4}(\d{3})/, '$1••••$2') || '—'}</div>
              <div style={{ padding: '12px 16px', fontSize: 11, color: '#1e1e1e' }}>{t.package_id || '—'}</div>
              <div style={{ padding: '12px 16px', fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 500, color: '#e0e0e0' }}>Ksh {fmt(t.amount || t.amount_ksh || 0)}</div>
              <div style={{ padding: '12px 16px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#f59e0b' }}>−{t.platform_fee || t.platform_fee_ksh || 0}</div>
              <div style={{ padding: '12px 16px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#22c55e' }}>{t.isp_earnings || t.isp_earnings_ksh || 0}</div>
              <div style={{ padding: '12px 16px', fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#1a1a1a' }}>{ago(t.created_at)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
