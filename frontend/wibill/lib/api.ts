const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('wb_token')
}

interface RequestOptions extends RequestInit {
  retries?: number
  retryDelay?: number
}

async function request<T>(
  path: string,
  opts: RequestOptions = {},
  attempt = 0
): Promise<T> {
  const { retries = 3, retryDelay = 1000, ...fetchOpts } = opts
  const token = getToken()

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...fetchOpts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...fetchOpts.headers,
      },
    })

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Unauthorized - Please log in again')
      }
      if (res.status === 403) {
        throw new Error('Access denied')
      }
      const err = await res.json().catch(() => ({ detail: 'Request failed' }))
      const e = new Error(err.detail || `HTTP ${res.status}`) as any
      e.status = res.status
      throw e
    }

    return res.json() as Promise<T>
  } catch (error: any) {
    if (error?.status && error.status >= 400 && error.status < 500) {
      throw error
    }
    if (attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
      return request<T>(path, opts, attempt + 1)
    }
    throw error
  }
}

// ============================================================================
// AUTH ENDPOINTS
// ============================================================================

export async function login(username: string, password: string) {
  const form = new URLSearchParams({ username, password })
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })
  if (!res.ok) throw new Error('Invalid credentials')
  return res.json()
}

// ============================================================================
// DASHBOARD API
// ============================================================================

export const api = {
  // Auth
  getMe: () => request<any>('/api/auth/me'),

  // ========================================================================
  // SESSIONS
  // ========================================================================
  getSessions: (params?: { status?: string; skip?: number; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.status) query.append('status', params.status)
    if (params?.skip !== undefined) query.append('skip', params.skip.toString())
    if (params?.limit !== undefined) query.append('limit', params.limit.toString())
    const qs = query.toString()
    return request<any[]>(`/api/sessions${qs ? '?' + qs : ''}`)
  },
  getSession: (id: string) => request<any>(`/api/sessions/${id}`),
  kickSession: (id: string) =>
    request<any>(`/api/sessions/${id}/terminate`, { method: 'POST' }),
  terminateSession: (id: string) =>
    request<any>(`/api/sessions/${id}/terminate`, { method: 'POST' }),
  getSessionStatus: (id: string) => request<any>(`/api/sessions/${id}`),

  // ========================================================================
  // PACKAGES
  // ========================================================================
  getPackages: (tenant_id?: string) => {
    // Use authenticated endpoint if no tenant_id passed (logged-in admin)
    if (!tenant_id) return request<any[]>('/api/packages/mine')
    return request<any[]>(`/api/packages?tenant_id=${tenant_id}`)
  },
  getPackage: (id: string) => request<any>(`/api/packages/${id}`),
  createPackage: (data: any) =>
    request<any>('/api/packages', { method: 'POST', body: JSON.stringify(data) }),
  updatePackage: (id: string, data: any) =>
    request<any>(`/api/packages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deletePackage: (id: string) =>
    request(`/api/packages/${id}`, { method: 'DELETE' }),
  bulkUpdatePackages: (package_ids: string[], is_active: boolean) =>
    request('/api/packages/bulk-status', {
      method: 'POST',
      body: JSON.stringify({ package_ids, is_active }),
    }),

  // ========================================================================
  // TRANSACTIONS
  // ========================================================================
  getTransactions: (skip?: number, limit?: number) => {
    const query = new URLSearchParams()
    if (skip !== undefined) query.append('skip', skip.toString())
    if (limit !== undefined) query.append('limit', limit.toString())
    const queryStr = query.toString()
    return request<any[]>(`/api/transactions${queryStr ? '?' + queryStr : ''}`)
  },
  getTransaction: (id: string) => request<any>(`/api/transactions/${id}`),
  getTransactionStats: () => request<any>('/api/transactions/stats'),
  retryStkPush: (sessionId: string) =>
    request(`/api/mpesa/pay/session`, {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    }),

  // ========================================================================
  // TENANTS (ISP Management)
  // ========================================================================
  getTenant: (id: string) => request<any>(`/api/tenants/${id}`),
  updateTenant: (id: string, data: any) =>
    request(`/api/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getTenantDashboard: () => request<any>('/api/tenants/dashboard'),
  getTenantBalance: () => request<{ balance_ksh: number }>('/api/tenants/balance'),

  // ========================================================================
  // NETWORK & SYSTEM
  // ========================================================================
   getNetworkStatus: (tenantId?: string) => {
     if (!tenantId) return Promise.reject(new Error('tenantId required'))
     return request<any>(`/api/${tenantId}/network-status`)
   },
   getNetworkStats: () => request<any>('/api/network/stats'),
   getTenantNetworkEvents: (tenantId?: string, limit?: number) => {
     if (!tenantId) return Promise.reject(new Error('tenantId required'))
     const query = limit ? `?limit=${limit}` : ''
     return request<any[]>(`/api/${tenantId}/network-events${query}`)
   },

   // ========================================================================
   // MIKROTIK
   // ========================================================================
   getMikrotikConfig: () => request<any>('/api/mikrotik/config'),
   saveMikrotikConfig: (data: any) =>
     request('/api/mikrotik/config', { method: 'POST', body: JSON.stringify(data) }),
   updateMikrotikConfig: (data: any) =>
     request('/api/mikrotik/config', { method: 'PATCH', body: JSON.stringify(data) }),
   testMikrotikConnection: () =>
      request<{ connected: boolean; error?: string; router_identity?: string; router_os_version?: string; board_name?: string; uptime?: string; hotspot_found?: boolean }>('/api/mikrotik/test'),
getMikrotikHealth: () =>
      request<any>('/api/mikrotik/health'),
    getMikrotikActions: () =>
      request<any>('/api/mikrotik/actions'),
    getMikrotikUsers: () => request<{ users: any[]; count: number }>('/api/mikrotik/users'),
   provisionMikrotik: () =>
      request<any>('/api/mikrotik/provision', { method: 'POST' }),
   decommissionMikrotik: () =>
      request<any>('/api/mikrotik/decomission', { method: 'POST' }),
    getMikrotikRouterOsScript: async () => {
       const token = getToken()
       const res = await fetch(`${BASE}/api/mikrotik/routeros-script`, {
         headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
       })
       if (!res.ok) {
         const err = await res.json().catch(() => ({ detail: 'Failed to generate script' }))
         throw new Error(err.detail || `HTTP ${res.status}`)
       }
       return res.text()
     },
      getMikrotikInstallScript: async () => {
        const token = getToken()
        const res = await fetch(`${BASE}/api/mikrotik/install-script`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: 'Failed to generate script' }))
          throw new Error(err.detail || `HTTP ${res.status}`)
        }
        return res.text()
      },
      getMikrotikInstallScriptData: async () => {
        const token = getToken()
        const res = await fetch(`${BASE}/api/mikrotik/install-script-data`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: 'Failed to get script data' }))
          throw new Error(err.detail || `HTTP ${res.status}`)
        }
        return res.json()
      },
    // ========================================================================
    // MIKROTIK WIZARD API
    // ========================================================================
    getMikrotikInterfaces: () => request<any>('/api/mikrotik/interfaces'),
    checkMikrotikSubnet: (octet: number) => request<any>(`/api/mikrotik/subnet-check?octet=${octet}`),
    generateMikrotikScript: async (params: any) => {
       const token = getToken()
       const res = await fetch(`${BASE}/api/mikrotik/generate-script`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
         body: JSON.stringify(params),
       })
       if (!res.ok) { const err = await res.json().catch(() => ({ detail: 'Failed' })); throw new Error(err.detail) }
       return res.text()
     },
    uploadPortalFile: (html: string) =>
      request<any>('/api/mikrotik/upload-portal', { method: 'POST', body: JSON.stringify({ html }) }),
    getMikrotikFileStatus: (path: string = 'hotspot/login.html') =>
      request<any>(`/api/mikrotik/file-status?path=${encodeURIComponent(path)}`),
    getMikrotikHosts: () => request<any>('/api/mikrotik/hosts'),
    getMikrotikPreflight: () => request<any>('/api/mikrotik/preflight'),
    goLiveMikrotik: () => request<any>('/api/mikrotik/go-live', { method: 'POST' }),

  // ========================================================================
  // REMOTE ONBOARDING
  // ========================================================================
  generateOnboardToken: (ros_version: string) =>
    request<any>('/api/onboard/generate', { method: 'POST', body: JSON.stringify({ ros_version }) }),
  getOnboardStatus: () => request<any>('/api/onboard/status'),
  resolveOnboardConflict: (token: string, overwrite_hotspot: boolean) =>
    request<any>('/api/onboard/resolve-conflict', { method: 'POST', body: JSON.stringify({ token, overwrite_hotspot }) }),
     // ========================================================================
     // MONTHLY SUBSCRIBERS
    // ========================================================================
    getSubscribers: (params?: { status?: string; client_type?: string; search?: string; skip?: number; limit?: number }) => {
      const q = new URLSearchParams()
      if (params?.status) q.append('status', params.status)
      if (params?.client_type) q.append('client_type', params.client_type)
      if (params?.search) q.append('search', params.search)
      if (params?.skip !== undefined) q.append('skip', params.skip.toString())
      if (params?.limit !== undefined) q.append('limit', params.limit.toString())
      const qs = q.toString()
      return request<any>(`/api/subscribers${qs ? '?' + qs : ''}`)
    },
    getSubscriber: (id: string) => request<any>(`/api/subscribers/${id}`),
    createSubscriber: (data: any) =>
      request<any>('/api/subscribers', { method: 'POST', body: JSON.stringify(data) }),
    updateSubscriber: (id: string, data: any) =>
      request<any>(`/api/subscribers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    pauseSubscriber: (id: string) =>
      request<any>(`/api/subscribers/${id}/pause`, { method: 'POST' }),
    suspendSubscriber: (id: string) =>
      request<any>(`/api/subscribers/${id}/suspend`, { method: 'POST' }),
    resumeSubscriber: (id: string) =>
      request<any>(`/api/subscribers/${id}/resume`, { method: 'POST' }),
    activateSubscriber: (id: string) =>
      request<any>(`/api/subscribers/${id}/activate`, { method: 'POST' }),
    reconnectSubscriber: (id: string) =>
      request<any>(`/api/subscribers/${id}/reconnect`, { method: 'POST' }),
    restartSubscriber: (id: string) =>
      request<any>(`/api/subscribers/${id}/restart`, { method: 'POST' }),
    getSubscriberStats: () => request<any>('/api/subscribers/stats'),
    reconcileSubscribers: () =>
      request<any>('/api/subscribers/reconcile', { method: 'POST' }),
    getAvailableIps: (poolType: string = 'wifi') =>
      request<any>(`/api/subscribers/ipam/available?pool_type=${poolType}`),

    // ========================================================================
    // SUBSCRIBER PLANS
    // ========================================================================
    getSubscriberPlans: (params?: { client_type?: string; is_active?: boolean }) => {
      const q = new URLSearchParams()
      if (params?.client_type) q.append('client_type', params.client_type)
      if (params?.is_active !== undefined) q.append('is_active', params.is_active.toString())
      const qs = q.toString()
      return request<any[]>(`/api/subscriber-plans${qs ? '?' + qs : ''}`)
    },
    createSubscriberPlan: (data: any) =>
      request<any>('/api/subscriber-plans', { method: 'POST', body: JSON.stringify(data) }),
    updateSubscriberPlan: (id: string, data: any) =>
      request<any>(`/api/subscriber-plans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteSubscriberPlan: (id: string) =>
      request(`/api/subscriber-plans/${id}`, { method: 'DELETE' }),

    // ========================================================================
    // IPAM POOLS
    // ========================================================================
    getIpamPools: (poolType?: string) => {
      const q = poolType ? `?pool_type=${poolType}` : ''
      return request<any[]>(`/api/ipam/pools${q}`)
    },
    createIpamPool: (data: any) =>
      request<any>('/api/ipam/pools', { method: 'POST', body: JSON.stringify(data) }),
    deleteIpamPool: (id: string) =>
      request(`/api/ipam/pools/${id}`, { method: 'DELETE' }),

    getMikrotikLoginHtml: async () => {
       const token = getToken()
       const res = await fetch(`${BASE}/api/mikrotik/login-html`, {
         headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
       })
       if (!res.ok) throw new Error('Failed to generate login.html')
       return res.text()
     },

    // ========================================================================
    // INVOICES
    // ========================================================================
    getInvoiceStatus: () => request<any>('/api/invoices/current-status'),
    getInvoices: (status?: string) => {
      const query = status ? `?status=${status}` : ''
      return request<any[]>(`/api/invoices${query}`)
    },

  // ========================================================================
  // M-PESA
  // ========================================================================
  getMpesaConfig: () => request<any>('/api/mpesa/config'),
  saveMpesaConfig: (data: any) =>
    request('/api/mpesa/config', { method: 'POST', body: JSON.stringify(data) }),
  initiateMpesaPayment: (phone: string, amount: number) =>
    request('/api/mpesa/pay/invoice', {
      method: 'POST',
      body: JSON.stringify({ phone, amount }),
    }),
  getMpesaTransactions: () => request<any[]>('/api/mpesa/transactions'),
  testMpesaConnection: () =>
    request<{ status: boolean; message: string }>('/api/mpesa/config/test'),

  // ========================================================================
  // PORTAL CONFIGURATION
  // ========================================================================
  savePortalConfig: (data: any) =>
    request('/api/portal-config', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getPortalConfig: () => request<any>('/api/portal-config'),
  checkPortalReady: () =>
    request<{ portal_config: any; configured: boolean }>('/api/portal-config'),
  getTemplates: (category?: string) =>
    request<any>(`/api/portal-templates${category ? `?category=${category}` : ''}`),
  getTemplate: (id: string) =>
    request<any>(`/api/portal-templates/${id}`),
  getSnapshots: () =>
    request<any>('/api/portal-config/snapshots'),
  createSnapshot: (tag: string) =>
    request('/api/portal-config/snapshots', { method: 'POST', body: JSON.stringify({ version_tag: tag }) }),
  restoreSnapshot: (id: string) =>
    request(`/api/portal-config/snapshots/${id}/restore`, { method: 'POST' }),
  uploadAsset: (file: File, subfolder = 'assets') => {
    const form = new FormData()
    form.append('file', file)
    form.append('subfolder', subfolder)
    return request('/api/portal/assets/upload', { method: 'POST', body: form })
  },
  listAssets: (subfolder = 'assets') =>
    request<any>(`/api/portal/assets?subfolder=${subfolder}`),
  deleteAsset: (url: string) =>
    request(`/api/portal/assets?url=${encodeURIComponent(url)}`, { method: 'DELETE' }),
  exportZip: () => request('/api/portal/export/zip'),
  exportQRPoster: () => request('/api/portal/export/qr-poster'),

  // ========================================================================
  // VOUCHERS
  // ========================================================================
  getVouchers: (params?: { status?: string; batch_id?: string; search?: string; skip?: number; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.status) q.append('status', params.status)
    if (params?.batch_id) q.append('batch_id', params.batch_id)
    if (params?.search) q.append('search', params.search)
    if (params?.skip !== undefined) q.append('skip', params.skip.toString())
    if (params?.limit !== undefined) q.append('limit', params.limit.toString())
    const qs = q.toString()
    return request<any>(`/api/vouchers${qs ? '?' + qs : ''}`)
  },
  generateVouchers: (data: { package_id?: string; quantity: number; prefix?: string; expires_in_days?: number; duration_minutes?: number }) =>
    request<any>('/api/vouchers/generate', { method: 'POST', body: JSON.stringify(data) }),
  checkVoucherStatus: (code: string) => request<any>(`/api/vouchers/${code}/status`),
  voidVoucher: (id: string) => request(`/api/vouchers/${id}`, { method: 'DELETE' }),
  suspendVoucher: (id: string) => request<any>(`/api/vouchers/${id}/suspend`, { method: 'POST' }),
  unsuspendVoucher: (id: string) => request<any>(`/api/vouchers/${id}/unsuspend`, { method: 'POST' }),
  suspendVoucherBatch: (batchId: string) => request<any>(`/api/vouchers/batch/${batchId}/suspend`, { method: 'POST' }),
  unsuspendVoucherBatch: (batchId: string) => request<any>(`/api/vouchers/batch/${batchId}/unsuspend`, { method: 'POST' }),

  // ========================================================================
  // REWARD TOKENS (Premium Tier)
  // ========================================================================
  generateCompensationToken: (data: { session_id: string; minutes: number; reason?: string; bound_phone?: string; bound_mac?: string }) =>
    request<any>('/api/reward-tokens/generate-compensation', { method: 'POST', body: JSON.stringify(data) }),
  getRewardTokens: (params?: { redeemed?: boolean; search?: string; skip?: number; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.redeemed !== undefined) q.append('redeemed', params.redeemed.toString())
    if (params?.search) q.append('search', params.search)
    if (params?.skip !== undefined) q.append('skip', params.skip.toString())
    if (params?.limit !== undefined) q.append('limit', params.limit.toString())
    const qs = q.toString()
    return request<any>(`/api/reward-tokens${qs ? '?' + qs : ''}`)
  },
  getRewardToken: (id: string) => request<any>(`/api/reward-tokens/${id}`),

  // ========================================================================
  // CAMPAIGNS (Premium Tier)
  // ========================================================================
  createCampaign: (data: { name: string; campaign_type: string; reward_minutes: number; quantity: number; expiry_hours?: number; target_filter?: string }) =>
    request<any>('/api/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  getCampaigns: (params?: { status?: string; skip?: number; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.status) q.append('status', params.status)
    if (params?.skip !== undefined) q.append('skip', params.skip.toString())
    if (params?.limit !== undefined) q.append('limit', params.limit.toString())
    const qs = q.toString()
    return request<any>(`/api/campaigns${qs ? '?' + qs : ''}`)
  },
  getCampaign: (id: string) => request<any>(`/api/campaigns/${id}`),
  updateCampaignStatus: (id: string, status: string) =>
    request<any>(`/api/campaigns/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  launchCampaign: (id: string) =>
    request<any>(`/api/campaigns/${id}/launch`, { method: 'POST' }),

  // ========================================================================
  // LOYALTY
  // ========================================================================
  getLoyaltyAccounts: (params?: { search?: string; sort_by?: string; skip?: number; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.search) q.append('search', params.search)
    if (params?.sort_by) q.append('sort_by', params.sort_by)
    if (params?.skip !== undefined) q.append('skip', params.skip.toString())
    if (params?.limit !== undefined) q.append('limit', params.limit.toString())
    const qs = q.toString()
    return request<any>(`/api/loyalty/accounts${qs ? '?' + qs : ''}`)
  },
  getLoyaltyAccountByPhone: (phone: string) => request<any>(`/api/loyalty/accounts/${phone}`),
  getLoyaltyStats: () => request<any>('/api/loyalty/stats'),
  getLoyaltyConfig: () => request<any>('/api/loyalty/config'),
  sendReward: (data: { account_id: string; minutes: number; reason?: string }) =>
    request<any>('/api/loyalty/send-reward', { method: 'POST', body: JSON.stringify(data) }),
  redeemLoyaltyPortal: (data: { phone_number: string; mac_address?: string; ip_address?: string }) =>
    request<any>('/api/loyalty/redeem-portal', { method: 'POST', body: JSON.stringify(data) }),

  // ========================================================================
  // ANALYTICS (ISP Dashboard)
  // ========================================================================
  getRevenueTrend: (days?: number) => {
    const query = days ? `?days=${days}` : '';
    return request<any>(`/api/analytics/revenue-trend${query}`);
  },
  getTopPackages: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return request<any>(`/api/analytics/top-packages${query}`);
  },
  getDashboardSummary: () => request<any>('/api/dashboard/summary'),

  // ========================================================================
  // ADMIN ENDPOINTS (Platform Admin)
  // ========================================================================
  admin: {
    getTenants: () => request<any[]>('/api/admin/tenants'),
    getTenant: (id: string) => request<any>(`/api/admin/tenants/${id}`),
    createTenant: (data: any) =>
      request('/api/admin/tenants', { method: 'POST', body: JSON.stringify(data) }),
    updateTenant: (id: string, data: any) =>
      request(`/api/admin/tenants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deleteTenant: (id: string) =>
      request(`/api/admin/tenants/${id}`, { method: 'DELETE' }),

    // Admin Invites
    getInvites: () => request<any[]>('/api/admin/invites'),
    createInvite: (data: any) =>
      request('/api/admin/invites', { method: 'POST', body: JSON.stringify(data) }),
    revokeInvite: (id: string) =>
      request(`/api/admin/invites/${id}`, { method: 'DELETE' }),

    // Admin Transactions
    getAllTransactions: (skip?: number, limit?: number) => {
      const query = new URLSearchParams()
      if (skip !== undefined) query.append('skip', skip.toString())
      if (limit !== undefined) query.append('limit', limit.toString())
      const queryStr = query.toString()
      return request<any[]>(
        `/api/mpesa/admin/transactions${queryStr ? '?' + queryStr : ''}`
      )
    },
    getTransactionStats: () => request<any>('/api/mpesa/admin/transactions/stats'),

    // Admin Revenue
    getRevenueStats: () => request<any>('/api/admin/revenue/stats'),
    getRevenueByTenant: () => request<any>('/api/admin/revenue/by-tenant'),

    // Dashboard
    getDashboard: () => request<any>('/api/admin/dashboard'),

    // System
    getSystemStats: () => request<any>('/api/admin/system/stats'),
    getSystemHealth: () => request<any>('/api/admin/system/health'),
  },

  // ========================================================================
  // OUTAGES
  // ========================================================================
  getOutages: (status?: string) => {
    const q = status ? `?status=${status}` : ''
    return request<any[]>(`/api/isp/outages${q}`)
  },
  createOutage: (data: { status?: string; description?: string; eta?: string; zone?: string; router_id?: string }) =>
    request<any>('/api/isp/outages', { method: 'POST', body: JSON.stringify(data) }),
  resolveOutage: (id: string, data?: { description?: string }) =>
    request<any>(`/api/isp/outages/${id}/resolve`, { method: 'PATCH', body: JSON.stringify(data || {}) }),
  getPortalStatus: (slug: string) => request<any>(`/api/portal/${slug}/status`),
  deviceLookup: (slug: string, mac: string) => request<any>(`/api/portal/${slug}/device-lookup?mac=${encodeURIComponent(mac)}`),
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export async function batchFetch<T>(
  endpoints: string[],
  options: { retries?: number } = {}
): Promise<T[]> {
  const promises = endpoints.map(ep => request<T>(ep, { retries: options.retries }))
  return Promise.all(promises)
}

// ============================================================================
// EXPORT HELPERS
// ============================================================================

export type API = typeof api

/**
 * Format phone number for display
 * "0712345678" => "0712 ••• 5678"
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 8) return phone
  const start = phone.slice(0, 4)
  const end = phone.slice(-4)
  return `${start} ••• ${end}`
}

/**
 * Format currency (KSH)
 * 1000 => "Ksh 1,000"
 */
export function formatKsh(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'Ksh 0'
  return `Ksh ${amount.toLocaleString('en-KE')}`
}

/**
 * Format date for display
 * "2024-01-15T10:30:00Z" => "Jan 15, 10:30"
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getMonth()]
  const day = date.getDate()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month} ${day}, ${hours}:${minutes}`
}

/**
 * Subscriber count
 */
export async function subscriberCount(): Promise<{ count: number }> {
  return request<{ count: number }>('/api/subscribers/count')
}

/**
 * Bulk SMS API methods
 */
export async function getSmsTemplates() {
  return request<any>('/api/sms/templates')
}

export async function previewSmsTemplate(data: { template: string; sample_name?: string }) {
  return request<{ preview: string; char_count: number }>('/api/sms/preview', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function sendBulkSms(data: {
  message: string
  subject?: string
  target_group: string
  custom_phones?: string[]
}) {
  return request<{
    success: boolean
    message_id: string
    recipients: number
    sent: number
    status: string
  }>('/api/sms/send', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function getSmsHistory(skip = 0, limit = 20) {
  return request<{
    items: Array<{
      id: string
      subject: string | null
      message: string
      target_group: string
      target_count: number
      sent_count: number
      status: string
      created_at: string | null
    }>
    total: number
  }>(`/api/sms/history?skip=${skip}&limit=${limit}`)
}

export async function getSmsStats() {
  return request<{ total_bursts: number; total_messages: number }>('/api/sms/stats')
}

/**
 * Format relative time
 * "2024-01-15T10:30:00Z" => "2 hours ago"
 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(isoString)
}

