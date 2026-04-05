import axios from 'axios';

// Relative base URL — requests go to whatever host served the page.
// In production: Nginx proxies /api/* → api-gateway:3000
// In local dev:  Next.js rewrites /api/* → http://localhost:3000 (see next.config.js)
export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('pos_token');
    const tenantId = localStorage.getItem('pos_tenant_id');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (tenantId) config.headers['x-tenant-id'] = tenantId;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_tenant_id');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

export const authApi = {
  login:       (email: string, password: string) => api.post('/auth/login', { email, password }),
  register:    (data: any)                       => api.post('/auth/register', data),
  createUser:  (data: any)                       => api.post('/auth/users', data),
  getUsers:    (role?: string)                   => api.get('/auth/users', { params: role ? { role } : {} }),
  updateUser:  (id: string, data: any)           => api.patch(`/auth/users/${id}`, data),
  deleteUser:  (id: string)                      => api.delete(`/auth/users/${id}`),
};
export const productsApi = {
  list: (params?: any) => api.get('/products', { params }),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};
export const categoriesApi = {
  list: () => api.get('/categories'),
  create: (data: any) => api.post('/categories', data),
  update: (id: string, data: any) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};
export const ordersApi = {
  list: (params?: any) => api.get('/orders', { params }),
  get: (id: string) => api.get(`/orders/${id}`),
  create: (data: any) => api.post('/orders', data),
  updateStatus: (id: string, status: string, reason?: string) => api.patch(`/orders/${id}/status`, { status, reason }),
  updateItems: (id: string, data: any) => api.put(`/orders/${id}/items`, data),
  getActive: () => api.get('/orders/active'),
};
export const inventoryApi = {
  list: () => api.get('/inventory'),
  getLowStock: () => api.get('/inventory/low-stock'),
  adjust: (data: any) => api.post('/inventory/adjust', data),
  getMovements: (productId?: string) => api.get('/inventory/movements', { params: productId ? { productId } : {} }),
};
export const paymentsApi = {
  process: (data: any) => api.post('/payments', data),
  getByOrder: (orderId: string) => api.get(`/payments/order/${orderId}`),
  getDailySummary: (date?: string) => api.get('/payments/summary/daily', { params: date ? { date } : {} }),
};
export const kitchenApi = {
  create: (data: any) => api.post('/kitchen/tickets', data),
  getActive: () => api.get('/kitchen/tickets'),
  updateStatus: (id: string, status: string, assignedTo?: string) =>
    api.patch(`/kitchen/tickets/${id}/status`, { status, assignedTo }),
  getHistory: () => api.get('/kitchen/tickets/history'),
};
export const analyticsApi = {
  getDashboard:     (date?: string)                        => api.get('/analytics/dashboard',       { params: date ? { date } : {} }),
  getSales:         (from?: string, to?: string)           => api.get('/analytics/sales',            { params: { from, to } }),
  getOverview:      (period: string, date: string)         => api.get('/analytics/overview',         { params: { period, date } }),
  getRevenueTrend:  (period: string, date: string)         => api.get('/analytics/revenue-trend',    { params: { period, date } }),
  getTopProducts:   (period: string, date: string)         => api.get('/analytics/top-products',     { params: { period, date } }),
  getPaymentMethods:(period: string, date: string)         => api.get('/analytics/payment-methods',  { params: { period, date } }),
  getHourly:        (date: string)                         => api.get('/analytics/hourly',           { params: { date } }),
};
