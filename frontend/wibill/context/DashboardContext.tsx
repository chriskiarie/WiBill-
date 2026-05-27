'use client'
import { createContext, useContext, useState, ReactNode, useCallback } from 'react'

export interface DashboardStats {
  revenue: {
    gross_ksh: number
    isp_earnings_ksh: number
    platform_fee_ksh: number
    transaction_count: number
  }
  active_sessions: number
  network: {
    status: 'up' | 'down' | 'degraded'
    latency_ms: number
  }
}

interface DashboardContextType {
  stats: DashboardStats | null
  setStats: (stats: DashboardStats) => void
  refreshing: boolean
  lastUpdated: Date | null
  refresh: () => Promise<void>
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    // This will be overridden by pages that use the context
    setRefreshing(true)
    // Simulated delay
    await new Promise(resolve => setTimeout(resolve, 300))
    setRefreshing(false)
  }, [])

  return (
    <DashboardContext.Provider value={{ stats, setStats, refreshing, lastUpdated, refresh }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within DashboardProvider')
  }
  return context
}