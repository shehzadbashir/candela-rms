import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getSalesChart: () => api.get('/dashboard/sales-chart'),
};

// Products API
export const productsAPI = {
  getProducts: (params?: any) => api.get('/products', { params }),
  getProductById: (id: string) => api.get(`/products/${id}`),
  getByBarcode: (barcode: string) => api.get(`/products/barcode/${barcode}`),
  search: (query: string, storeId?: string) =>
    api.get('/products/search', { params: { q: query, storeId } }),
  createProduct: (data: any) => api.post('/products', data),
  updateProduct: (id: string, data: any) => api.put(`/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/products/${id}`),
  importProducts: (formData: FormData) =>
    api.post('/products/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  exportProducts: (params?: any) =>
    api.get('/products/export', { params, responseType: 'blob' }),
  downloadTemplate: () => api.get('/products/template', { responseType: 'blob' }),
  getLowStockAlert: (params?: any) => api.get('/products/alerts/low-stock', { params }),
  getExpiringProductsAlert: (params?: any) => api.get('/products/alerts/expiring', { params }),
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
};

// Brands API
export const brandsAPI = {
  getAll: () => api.get('/brands'),
};

// Units API
export const unitsAPI = {
  getAll: () => api.get('/units'),
};

// GRN API
export const grnAPI = {
  getGRNs: (params?: any) => api.get('/grn', { params }),
  getGRNById: (id: string) => api.get(`/grn/${id}`),
  createGRN: (data: any) => api.post('/grn', data),
  updateGRN: (id: string, data: any) => api.put(`/grn/${id}`, data),
  deleteGRN: (id: string) => api.delete(`/grn/${id}`),
  getPurchaseOrdersForGRN: () => api.get('/grn/purchase-orders'),
  exportGRN: (id: string) => api.get(`/grn/${id}/export`, { responseType: 'blob' }),
};

// Suppliers API
export const suppliersAPI = {
  getAll: () => api.get('/suppliers'),
};

// POS API
export const posAPI = {
  createSale: (data: any) => api.post('/pos/sale', data),
  getSales: (params?: any) => api.get('/pos/sales', { params }),
  printReceipt: (saleId: string) => api.post(`/pos/print-receipt/${saleId}`),
};

// Backup API
export const backupAPI = {
  getBackups: () => api.get('/backup'),
  createBackup: (data: any) => api.post('/backup', data),
  restoreBackup: (id: string) => api.post(`/backup/${id}/restore`),
  downloadBackup: (id: string) => api.get(`/backup/${id}/download`, { responseType: 'blob' }),
  deleteBackup: (id: string) => api.delete(`/backup/${id}`),
  scheduleBackup: (data: any) => api.post('/backup/schedule', data),
};
// Auth API
export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  refreshToken: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  changePassword: (data: any) => api.post('/auth/change-password', data),
};
export default api;