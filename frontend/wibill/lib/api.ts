const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('wb_token')
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

// Auth
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

// Dashboard
export const api = {
  // Sessions
  getSessions: () => request<any[]>('/api/sessions'),
  kickSession: (id: string) => request(`/api/sessions/${id}`, { method: 'DELETE' }),
  getSessionStatus: (id: string) => request<any>(`/api/sessions/${id}/status`),

  // Packages
  getPackages: () => request<any[]>('/api/packages'),
  createPackage: (data: any) => request('/api/packages', { method: 'POST', body: JSON.stringify(data) }),
  updatePackage: (id: string, data: any) => request(`/api/packages/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePackage: (id: string) => request(`/api/packages/${id}`, { method: 'DELETE' }),

  // Transactions
  getTransactions: () => request<any[]>('/api/sessions/transactions'),

  // Tenants (admin)
  getTenants: () => request<any[]>('/api/tenants'),
  getTenant: (id: string) => request<any>(`/api/tenants/${id}`),
  updateTenant: (id: string, data: any) => request(`/api/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Network
  getNetworkStatus: () => request<any>('/api/system/health'),

// Me
   getMe: () => request<any>('/api/auth/me'),

   // Portal Config
   savePortalConfig: (data: any) => request('/api/tenants/portal-config', { method: 'POST', body: JSON.stringify(data) }),
}
