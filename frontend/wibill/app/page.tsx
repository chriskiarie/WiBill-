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
      <div style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:800, color:'#111', letterSpacing:'-0.5px' }}>WiBill</div>
    </div>
  )
}
