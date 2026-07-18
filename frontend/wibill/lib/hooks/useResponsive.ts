'use client'
import { useState, useEffect } from 'react'

type Breakpoint = 'mobile' | 'tablet' | 'desktop'

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>('desktop')

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth
      if (w <= 480) setBp('mobile')
      else if (w <= 768) setBp('tablet')
      else setBp('desktop')
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return bp
}

export function responsive<T>(map: { mobile: T; tablet: T; desktop: T }, bp?: Breakpoint): T {
  const currentBp = bp || 'desktop'
  return map[currentBp]
}
