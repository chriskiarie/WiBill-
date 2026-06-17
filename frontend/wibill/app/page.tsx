'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export default function Root() {
  const { token } = useAuth()
  const router = useRouter()
  useEffect(() => { router.push(token ? '/dashboard' : '/login') }, [token])
  return (
    <div style={{ minHeight:'100vh', background:'#030303', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ fontFamily:'"Space Grotesk", sans-serif', fontSize:22, fontWeight:700 }}><span style={{ color:'#E8B84B' }}>X</span><span style={{ color:'#111' }}>w</span><span style={{ color:'#E8B84B' }}>B</span></span>
    </div>
  )
}
