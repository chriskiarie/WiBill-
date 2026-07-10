'use client'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Topbar from '@/components/Topbar'
import { Smartphone, Copy, Check, ExternalLink, Package, Palette, QrCode, Settings } from 'lucide-react'

const C = {
  void: 'var(--theme-bg)', base: 'var(--theme-card-base)', border: 'var(--theme-border)',
  text: 'var(--theme-text)', dim: 'var(--theme-dim)', mute: 'var(--theme-mute)',
  gold: 'var(--theme-gold)', green: 'var(--theme-green)',
}

export default function PortalPreviewPage() {
  const { user, token } = useAuth()
  const [copied, setCopied] = useState(false)
  const [packages, setPackages] = useState<any[]>([])
  const [portalReady, setPortalReady] = useState<boolean | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://wibill-production-2e9c.up.railway.app'
  const slug = user?.tenant_slug
  const portalUrl = slug ? `${backendUrl}/portal/${slug}` : null

  const qrUrl = portalUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(portalUrl)}` : null

  useEffect(() => {
    if (!token || !user?.tenant_id) return
    api.getPackages(user.tenant_id).then((pkgs: any) => {
      setPackages(Array.isArray(pkgs) ? pkgs : [])
    }).catch(() => {})
  }, [token, user?.tenant_id])

  useEffect(() => {
    if (!token) return
    setPortalReady(null)
    api.getPortalConfig().then((res: any) => {
      setPortalReady(res?.configured === true)
    }).catch(() => {
      setPortalReady(false)
    })
  }, [token])

  const handleCopy = () => {
    if (!portalUrl) return
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!slug) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Topbar title="Portal Preview" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.dim, fontSize: 13 }}>
          Set up your ISP account to preview your portal
        </div>
      </div>
    )
  }

  const activePkgs = packages.filter((p: any) => p.is_active !== false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar title="Portal Preview" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: C.void, color: C.text }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Portal Preview</h1>
          <p style={{ margin: 0, fontSize: 11, color: C.dim }}>
            This is what your customers see when they connect to your WiFi.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 320px', gap: 24, alignItems: 'start' }}>

          {/* ───── PHONE FRAME ───── */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: 320, height: 650,
              border: '2px solid var(--theme-border)',
              borderRadius: 36,
              overflow: 'hidden',
              background: 'var(--theme-surface)',
              boxShadow: 'var(--theme-shadow)',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 100, height: 20, background: 'var(--theme-surface)',
                borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
                zIndex: 2,
              }} />
              <div style={{
                position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
                width: 8, height: 8, borderRadius: '50%', background: 'var(--theme-border)', zIndex: 3,
              }} />

              {portalReady === null ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--theme-faint)', fontSize: 12 }}>
                  Checking portal configuration...
                </div>
              ) : portalReady ? (
                <iframe
                  ref={iframeRef}
                  src={portalUrl || ''}
                  title="Portal Preview"
                  style={{
                    width: '100%', height: '100%', border: 'none',
                    display: 'block',
                  }}
                  sandbox="allow-scripts allow-forms allow-same-origin"
                />
              ) : (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
                  <Settings size={32} color={C.dim} style={{ marginBottom: 16 }} />
                  <div style={{ color: 'var(--theme-text)', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                    Portal Not Configured
                  </div>
                  <div style={{ color: 'var(--theme-dim)', fontSize: 11, maxWidth: 220, lineHeight: 1.5, marginBottom: 20 }}>
                    Set up your portal theme, colors, and packages to see a live preview of what your customers will see.
                  </div>
                  <a href="/dashboard/settings" style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '10px 20px', borderRadius: 8,
                    background: C.gold, color: '#000', fontSize: 12,
                    textDecoration: 'none', fontWeight: 600,
                  }}>
                    <Settings size={14} />
                    Configure Portal
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* ───── SIDE PANEL ───── */}
          <div>
            {/* Status */}
            <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 20, marginBottom: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14 }}>Portal Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: portalReady ? C.green : C.dim,
                  boxShadow: portalReady ? `0 0 6px ${C.green}` : 'none',
                }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: portalReady ? C.green : C.dim }}>
                  {portalReady ? 'Live and accepting payments' : portalReady === null ? 'Checking...' : 'Not configured'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: C.dim }}>Portal URL:</span>
                <a href={portalUrl!} target="_blank" rel="noopener noreferrer" style={{
                  fontSize: 10, fontFamily: 'DM Mono, monospace', color: C.gold,
                  wordBreak: 'break-all', textDecoration: 'none',
                }}>{portalUrl}</a>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={handleCopy} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
                    background: 'var(--theme-surface)', border: '0.5px solid var(--theme-border)', color: C.dim, fontSize: 11, cursor: 'pointer',
                  }}>
                    {copied ? <Check size={13} color={C.green} /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy URL'}
                  </button>
                  <a href={portalUrl!} target="_blank" rel="noopener noreferrer" style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
                    background: 'var(--theme-surface)', border: '0.5px solid var(--theme-border)', color: portalReady ? C.dim : 'var(--theme-faint)', fontSize: 11, cursor: portalReady ? 'pointer' : 'not-allowed',
                  textDecoration: 'none', opacity: portalReady ? 1 : 0.5, pointerEvents: portalReady ? 'auto' : ('none' as const),
                }}>
                  <ExternalLink size={13} />
                  Open Live
                </a>
              </div>
              {portalReady === false && (
                <div style={{ marginTop: 12, fontSize: 10, color: 'var(--theme-faint)', lineHeight: 1.4 }}>
                  Go to <a href="/dashboard/settings" style={{ color: C.gold, textDecoration: 'none' }}>Settings</a> to configure your portal first.
                </div>
              )}
            </div>

            {/* QR Code */}
            <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 20, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Customer QR Code</span>
                <QrCode size={14} color={C.dim} />
              </div>
              {qrUrl ? (
                <div style={{ textAlign: 'center' }}>
                  <img src={qrUrl} alt="Portal QR Code" style={{ width: 140, height: 140, borderRadius: 8, background: '#fff', padding: 8 }} />
                  <div style={{ fontSize: 9, color: C.dim, marginTop: 8, fontFamily: 'DM Mono, monospace' }}>
                    Print this and place at your hotspot
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--theme-faint)', marginTop: 4, wordBreak: 'break-all', fontFamily: 'DM Mono, monospace' }}>
                    {portalUrl}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: C.dim, fontSize: 11 }}>Configure your portal to generate QR</div>
              )}
            </div>

            {/* Packages */}
            <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 11, padding: 20, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Packages</span>
                <Package size={14} color={C.dim} />
              </div>
              <div style={{ fontSize: 22, fontFamily: 'DM Mono, monospace', fontWeight: 500, color: C.gold, marginBottom: 4 }}>
                {activePkgs.length}
              </div>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 12 }}>
                {activePkgs.length === 1 ? '1 active package' : `${activePkgs.length} active packages`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <a href="/dashboard/packages" style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8,
                  background: 'var(--theme-surface)', border: '0.5px solid var(--theme-border)', color: C.gold, fontSize: 11, cursor: 'pointer', textDecoration: 'none',
                }}>
                  <Package size={12} />
                  Edit Packages
                </a>
                <a href="/dashboard/settings" style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8,
                  background: 'var(--theme-surface)', border: '0.5px solid var(--theme-border)', color: C.gold, fontSize: 11, cursor: 'pointer', textDecoration: 'none',
                }}>
                  <Palette size={12} />
                  Change Theme
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
