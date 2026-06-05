'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/context/ToastContext'
import Topbar from '@/components/Topbar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function apiCall(path: string, token: string, method = 'GET', body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
  return data
}

export default function SettingsPage() {
  const { token, user } = useAuth()
  const { showToast } = useToast()

  const [profile, setProfile] = useState({ full_name: '', email: '', role: '', tenant_id: '' })
  const [tenant, setTenant] = useState({ name: '', slug: '', support_phone: '', primary_color: '#3b82f6' })
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)
  const [pwd, setPwd] = useState({ current: '', new_: '', confirm: '' })
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const me = await apiCall('/api/auth/me', token)
      setProfile({
        full_name: me.full_name || '',
        email: me.email || '',
        role: me.role || '',
        tenant_id: me.tenant_id || '',
      })
      if (me.tenant_id) {
        try {
          const t = await apiCall(`/api/tenants/${me.tenant_id}/public`, token)
          setTenant({
            name: t.name || '',
            slug: t.slug || '',
            support_phone: t.support_phone || '',
            primary_color: t.primary_color || '#3b82f6',
          })
        } catch (_) {}
      }
    } catch (err) {
      showToast((err as Error).message, { type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [token, showToast])

  useEffect(() => { load() }, [load])

  const saveProfile = async () => {
    if (!profile.full_name.trim()) { showToast('Name is required', { type: 'error' }); return }
    setSavingProfile(true)
    try {
      await apiCall('/api/auth/me', token!, 'PATCH', { full_name: profile.full_name })
      showToast('Profile updated', { type: 'success' })
    } catch (err) {
      showToast((err as Error).message, { type: 'error' })
    } finally {
      setSavingProfile(false)
    }
  }

  const changePassword = async () => {
    if (!pwd.current || !pwd.new_ || !pwd.confirm) {
      showToast('Fill in all password fields', { type: 'error' }); return
    }
    if (pwd.new_ !== pwd.confirm) {
      showToast('New passwords do not match', { type: 'error' }); return
    }
    if (pwd.new_.length < 8) {
      showToast('Password must be at least 8 characters', { type: 'error' }); return
    }
    setSavingPwd(true)
    try {
      await apiCall('/api/auth/change-password', token!, 'POST', {
        current_password: pwd.current,
        new_password: pwd.new_,
      })
      showToast('Password changed', { type: 'success' })
      setPwd({ current: '', new_: '', confirm: '' })
    } catch (err) {
      showToast((err as Error).message, { type: 'error' })
    } finally {
      setSavingPwd(false)
    }
  }

  const copyPortalUrl = () => {
    const url = `${window.location.origin}/${tenant.slug}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const inp: React.CSSProperties = {
    background: '#0a0a0a', border: '0.5px solid #1e1e1e', borderRadius: 7,
    color: '#e0e0e0', fontFamily: 'DM Mono, monospace', fontSize: 13,
    padding: '9px 12px', width: '100%', boxSizing: 'border-box', outline: 'none',
  }
  const lbl: React.CSSProperties = {
    fontSize: 10, color: '#444', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.6px', display: 'block', marginBottom: 5,
  }
  const mono: React.CSSProperties = { fontFamily: 'DM Mono, monospace' }
  const card: React.CSSProperties = {
    background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 22,
  }
  const saveBtn = (loading: boolean, label: string, loadingLabel = 'Saving…'): React.CSSProperties => ({
    padding: '10px 20px', background: loading ? '#0a1628' : '#3b82f6',
    border: 'none', borderRadius: 7, color: loading ? '#3b82f6' : '#030303',
    fontSize: 11, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
    textTransform: 'uppercase', letterSpacing: '0.3px', marginTop: 16,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Settings" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: '#030303' }}>
        {loading ? <LoadingSpinner size="md" label="Loading settings…" /> : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 800 }}>

            {/* profile */}
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f0', marginBottom: 16 }}>Profile</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={lbl}>Full name</label>
                  <input style={inp} value={profile.full_name}
                    onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Email address</label>
                  <input style={{ ...inp, color: '#333', cursor: 'not-allowed' }}
                    value={profile.email} readOnly />
                  <div style={{ ...mono, fontSize: 9, color: '#1e1e1e', marginTop: 4 }}>
                    Contact support to change your email
                  </div>
                </div>
                <div>
                  <label style={lbl}>Role</label>
                  <div style={{ ...inp, color: '#555', cursor: 'default' }}>
                    {profile.role.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>
              <button onClick={saveProfile} disabled={savingProfile} style={saveBtn(savingProfile, 'Save profile')}>
                {savingProfile ? 'Saving…' : 'Save profile'}
              </button>
            </div>

            {/* portal URL */}
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f0', marginBottom: 16 }}>Portal URL</div>
              <div style={{ ...mono, fontSize: 10, color: '#2a2a2a', marginBottom: 14 }}>
                Share this URL with your customers — this is your captive portal login page
              </div>
              <div style={{
                background: '#060606', border: '0.5px solid #1a1a1a', borderRadius: 8,
                padding: '14px 16px', marginBottom: 14,
              }}>
                <div style={{ ...mono, fontSize: 10, color: '#444', marginBottom: 6 }}>YOUR PORTAL URL</div>
                <div style={{ ...mono, fontSize: 12, color: '#3b82f6', wordBreak: 'break-all' }}>
                  {typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/{tenant.slug}
                </div>
              </div>
              <button onClick={copyPortalUrl} style={{
                padding: '9px 18px', background: copied ? '#0d2010' : '#0a0a0a',
                border: `0.5px solid ${copied ? '#22c55e' : '#1e1e1e'}`,
                borderRadius: 7, color: copied ? '#22c55e' : '#3b82f6',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', ...mono,
              }}>
                {copied ? '✓ Copied' : 'Copy URL'}
              </button>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '0.5px solid #0d0d0d' }}>
                <div style={{ fontSize: 10, color: '#2a2a2a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  Account info
                </div>
                {[
                  { label: 'ISP name', value: tenant.name || '—' },
                  { label: 'Slug', value: tenant.slug || '—' },
                  { label: 'Tenant ID', value: (profile.tenant_id || '—').slice(0, 8) + '…' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid #0a0a0a' }}>
                    <span style={{ fontSize: 10, color: '#2a2a2a' }}>{r.label}</span>
                    <span style={{ ...mono, fontSize: 11, color: '#444' }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* change password */}
            <div style={{ ...card, gridColumn: '1/-1' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f0', marginBottom: 16 }}>Change password</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {[
                  { label: 'Current password', key: 'current' as const },
                  { label: 'New password',      key: 'new_' as const },
                  { label: 'Confirm new',        key: 'confirm' as const },
                ].map(f => (
                  <div key={f.key}>
                    <label style={lbl}>{f.label}</label>
                    <input style={inp} type="password" value={pwd[f.key]}
                      onChange={e => setPwd(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder="••••••••" />
                  </div>
                ))}
              </div>
              {pwd.new_ && pwd.confirm && pwd.new_ !== pwd.confirm && (
                <div style={{ ...mono, fontSize: 10, color: '#f87171', marginTop: 8 }}>
                  Passwords do not match
                </div>
              )}
              <button onClick={changePassword} disabled={savingPwd} style={saveBtn(savingPwd, 'Change password')}>
                {savingPwd ? 'Saving…' : 'Change password'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}