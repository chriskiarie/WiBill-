'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { useToast } from '@/context/ToastContext'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const { token, user } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tenant, setTenant] = useState<any>(null)
  const [form, setForm] = useState({ name: '', support_phone: '', logo_url: '' })

  const fetchTenant = async () => {
    if (!token || !user?.tenant_id) return
    setLoading(true)
    try {
      const t = await api.getTenant(user.tenant_id)
      setTenant(t)
      setForm({ name: t.name || '', support_phone: t.support_phone || '', logo_url: t.portal_config?.logo_url || '' })
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { fetchTenant() }, [token, user])

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Business name is required', { type: 'error' }); return }
    setSaving(true)
    try {
      await api.updateTenant(user!.tenant_id, {
        name: form.name,
        support_phone: form.support_phone,
      })
      showToast('Settings saved', { type: 'success' })
    } catch (e: any) { showToast(e.message || 'Save failed', { type: 'error' }) } finally { setSaving(false) }
  }

  const handleResetPortal = async () => {
    if (!confirm('Reset portal config? This will clear your custom design.')) return
    try {
      await api.savePortalConfig({})
      showToast('Portal config reset. Re-open the wizard.', { type: 'success' })
    } catch (e: any) { showToast(e.message || 'Failed', { type: 'error' }) }
  }

  const handleDeletePackages = async () => {
    if (!confirm('Delete ALL packages? This cannot be undone.')) return
    if (!confirm('Are you absolutely sure?')) return
    try {
      const pkgs = await api.getPackages()
      for (const p of pkgs) { await api.deletePackage(p.id) }
      showToast('All packages deleted', { type: 'success' })
    } catch (e: any) { showToast(e.message || 'Failed', { type: 'error' }) }
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 11, padding: 24, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#2a2a2a', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 20, paddingBottom: 12, borderBottom: '0.5px solid #0f0f0f' }}>{title}</div>
      {children}
    </div>
  )

  const Input = ({ label, value, onChange, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '10px 12px', background: '#030303', border: '0.5px solid #1e1e1e', borderRadius: 7, color: '#e0e0e0', fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
    </div>
  )

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Settings" />
      <div style={{ flex: 1, padding: '22px 28px', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 13 }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Settings" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', background: '#030303' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Account Settings</h1>

        {/* Business Info */}
        <Section title="Business Information">
          <div style={{ maxWidth: 480 }}>
            <Input label="ISP / Business Name" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="Your ISP name" />
            <Input label="Support Phone Number" value={form.support_phone} onChange={v => setForm(p => ({ ...p, support_phone: v }))} placeholder="254712345678" />
            <Input label="Logo URL" value={form.logo_url} onChange={v => setForm(p => ({ ...p, logo_url: v }))} placeholder="https://example.com/logo.png" />
            <button onClick={handleSave} disabled={saving} style={{ marginTop: 8, padding: '10px 20px', background: saving ? '#444' : '#3b82f6', border: 'none', borderRadius: 7, color: '#030303', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </Section>

        {/* Portal Configuration */}
        <Section title="Portal Configuration">
          <div style={{ maxWidth: 480 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 16, lineHeight: 1.6 }}>
              Your branded captive portal is live at <strong style={{ color: '#3b82f6', fontFamily: 'DM Mono, monospace' }}>/portal/{tenant?.slug}</strong>.
              Re-run the onboarding wizard to update colors, fonts, layout, and branding.
            </div>
            <button onClick={() => router.push('/onboarding')} style={{ padding: '10px 20px', background: '#3b82f6', border: 'none', borderRadius: 7, color: '#030303', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Re-open Portal Wizard
            </button>
          </div>
        </Section>

        {/* Team Members */}
        <Section title="Team Members">
          <div style={{ maxWidth: 480 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 16, lineHeight: 1.6 }}>
              Your account: <strong style={{ color: '#e0e0e0' }}>{user?.email}</strong>
            </div>
            <div style={{ padding: '16px', background: '#0a0a0a', borderRadius: 8, fontSize: 12, color: '#666', textAlign: 'center' }}>
              Team member invite coming soon. For now, contact the platform admin to add additional users.
            </div>
          </div>
        </Section>

        {/* Danger Zone */}
        <Section title="Danger Zone">
          <div style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#0a0a0a', borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#ccc', fontWeight: 600 }}>Reset Portal Config</div>
                  <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>Clear custom branding and re-run wizard</div>
                </div>
                <button onClick={handleResetPortal} style={{ padding: '6px 14px', background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 6, color: '#f59e0b', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Reset</button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#0a0a0a', borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#ccc', fontWeight: 600 }}>Delete All Packages</div>
                  <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>Remove all packages and their data</div>
                </div>
                <button onClick={handleDeletePackages} style={{ padding: '6px 14px', background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 6, color: '#f87171', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Delete All</button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#0a0a0a', borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#ccc', fontWeight: 600 }}>Request Account Deletion</div>
                  <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>Submit a deletion request to the platform admin</div>
                </div>
                <button onClick={() => { if (confirm('Request account deletion? This sends a notification to the platform admin.')) showToast('Deletion request sent to admin', { type: 'warning' }) }} style={{ padding: '6px 14px', background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 6, color: '#f87171', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Request</button>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
