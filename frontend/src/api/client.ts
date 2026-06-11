const BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': localStorage.getItem('chopfirst_user') || '',
      ...options?.headers,
    },
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Server error (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!json.success) throw new Error(json.error || 'Request failed');
  return json.data;
}

export const api = {
  // Users
  getMe: () => request<any>('/users/me'),
  getUser: (id: string) => request<any>(`/users/${id}`),
  login: (credential: string, password: string) =>
    request<any>('/users/login', { method: 'POST', body: JSON.stringify({ credential, password }) }),
  createUser: (data: { phone?: string; email?: string; name: string; password: string }) =>
    request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  payUser: (amount: number) =>
    request<any>('/users/pay', { method: 'POST', body: JSON.stringify({ amount }) }),

  // Merchants
  getMerchants: () => request<any[]>('/merchants'),
  getMerchant: (id: string) => request<any>(`/merchants/${id}`),
  toggleMenuItem: (merchantId: string, itemId: string) =>
    request<any>(`/merchants/${merchantId}/menu/${itemId}/toggle`, { method: 'PUT' }),

  // Orders
  getOrders: () => request<any[]>('/orders'),
  getOrder: (id: string) => request<any>(`/orders/${id}`),
  createOrder: (data: { merchantId: string; items: { menuItemId: string; quantity: number }[]; downPayment: number }) =>
    request<any>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  payOrder: (id: string, amount: number) =>
    request<any>(`/orders/${id}/pay`, { method: 'POST', body: JSON.stringify({ amount }) }),

  // Tasks
  getTasks: () => request<any[]>('/tasks'),
  getAllTasks: () => request<any[]>('/tasks/all'),
  assignTask: (id: string) => request<any>(`/tasks/${id}/assign`, { method: 'POST' }),
  completeTask: (id: string) => request<any>(`/tasks/${id}/complete`, { method: 'POST' }),
  verifyTask: (id: string) => request<any>(`/tasks/${id}/verify`, { method: 'POST' }),

  // Admin
  getMetrics: () => request<any>('/admin/metrics'),
  getAdminUsers: () => request<any[]>('/admin/users'),
  toggleFreeze: (userId: string) => request<any>(`/admin/users/${userId}/freeze`, { method: 'POST' }),
  manualCredit: (userId: string, amount: number) =>
    request<any>(`/admin/users/${userId}/credit`, { method: 'POST', body: JSON.stringify({ amount }) }),

  // Platform
  getPlatformInfo: () => request<any>('/platform/info'),
};
