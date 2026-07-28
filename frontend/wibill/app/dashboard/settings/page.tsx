'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { useToast } from '@/context/ToastContext'
import { useRouter } from 'next/navigation'

const C = {
  void: 'var(--theme-bg)', base: 'var(--theme-card-base)', border: 'var(--theme-border)', border2: 'var(--theme-border2)',
  text: 'var(--theme-text)', dim: 'var(--theme-dim)', mute: 'var(--theme-mute)', faint: 'var(--theme-faint)',
  gold: 'var(--theme-gold)', green: 'var(--theme-green)', red: 'var(--theme-red)',
}

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
    <div style={{ background: 'var(--theme-surface)', border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 24, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 20, paddingBottom: 12, borderBottom: `0.5px solid ${C.border}` }}>{title}</div>
      {children}
    </div>
  )

  const Input = ({ label, value, onChange, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '10px 12px', background: C.void, border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
    </div>
  )

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Topbar title="Settings" />
      <div className="dashboard-content" style={{ flex: 1, background: C.void, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.dim, fontSize: 13 }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Topbar title="Settings" />
      <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', background: C.void }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Account Settings</h1>

        {/* Business Info */}
        <Section title="Business Information">
          <div style={{ maxWidth: 480 }}>
            <Input label="ISP / Business Name" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="Your ISP name" />
            <Input label="Support Phone Number" value={form.support_phone} onChange={v => setForm(p => ({ ...p, support_phone: v }))} placeholder="254712345678" />
            <Input label="Logo URL" value={form.logo_url} onChange={v => setForm(p => ({ ...p, logo_url: v }))} placeholder="https://example.com/logo.png" />
            <button onClick={handleSave} disabled={saving} style={{ marginTop: 8, padding: '10px 20px', background: saving ? C.faint : C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </Section>

        {/* Portal Configuration */}
        <Section title="Portal Configuration">
          <div style={{ maxWidth: 480 }}>
            <div style={{ fontSize: 12, color: C.dim, marginBottom: 16, lineHeight: 1.6 }}>
              Your branded captive portal is live at <strong style={{ color: C.gold, fontFamily: 'DM Mono, monospace' }}>/portal/{tenant?.slug}</strong>.
              Re-run the onboarding wizard to update colors, fonts, layout, and branding.
            </div>
            <button onClick={() => window.open('/onboarding?force=true', '_blank')} style={{ padding: '10px 20px', background: C.gold, border: 'none', borderRadius: 7, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Re-open Portal Wizard
            </button>
          </div>
        </Section>

        {/* Team Members */}
        <Section title="Team Members">
          <div style={{ maxWidth: 480 }}>
            <div style={{ fontSize: 12, color: C.dim, marginBottom: 16, lineHeight: 1.6 }}>
              Your account: <strong style={{ color: C.text }}>{user?.email}</strong>
            </div>
            <div style={{ padding: '16px', background: 'var(--theme-surface)', borderRadius: 8, fontSize: 12, color: C.dim, textAlign: 'center' }}>
              Team member invite coming soon. For now, contact the platform admin to add additional users.
            </div>
          </div>
        </Section>

        {/* Danger Zone */}
        <Section title="Danger Zone">
          <div style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--theme-surface)', borderRadius: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>Reset Portal Config</div>
                  <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>Clear custom branding and re-run wizard</div>
                </div>
                <button onClick={handleResetPortal} style={{ padding: '6px 14px', background: 'var(--theme-surface)', border: `0.5px solid ${C.border2}`, borderRadius: 6, color: C.gold, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Reset</button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--theme-surface)', borderRadius: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>Delete All Packages</div>
                  <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>Remove all packages and their data</div>
                </div>
                <button onClick={handleDeletePackages} style={{ padding: '6px 14px', background: 'var(--theme-surface)', border: `0.5px solid ${C.border2}`, borderRadius: 6, color: C.red, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Delete All</button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--theme-surface)', borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>Request Account Deletion</div>
                  <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>Submit a deletion request to the platform admin</div>
                </div>
                <button onClick={() => { if (confirm('Request account deletion? This sends a notification to the platform admin.')) showToast('Deletion request sent to admin', { type: 'warning' }) }} style={{ padding: '6px 14px', background: 'var(--theme-surface)', border: `0.5px solid ${C.border2}`, borderRadius: 6, color: C.red, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Request</button>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
