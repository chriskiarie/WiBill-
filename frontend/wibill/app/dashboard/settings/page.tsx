'use client'
import Topbar from '@/components/Topbar'

export default function SettingsPage() {
  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
      <Topbar title="Settings" />
      <div style={{ flex:1, padding:'22px 28px', background:'#030303', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:800, color:'#111', letterSpacing:'-0.5px', marginBottom:8 }}>Settings</div>
          <div style={{ fontFamily:'DM Mono, monospace', fontSize:11, color:'#1a1a1a' }}>Coming in next build sprint</div>
        </div>
      </div>
    </div>
  )
}
