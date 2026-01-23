/**
 * API Client - Axios configurado
 */

import axios from 'axios';

// Use relative URL for API calls - Next.js rewrites will proxy to backend
// This works both in development and when accessed externally
export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor para erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// === Auth ===
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  glpiLogin: (login: string, password: string) =>
    api.post('/auth/glpi-login', { login, password }),

  me: () => api.get('/auth/me'),

  register: (data: { email: string; password: string; name: string; role?: string }) =>
    api.post('/auth/register', data),
};

// === Tickets ===
export const ticketsApi = {
  list: (params?: { status?: string; assignedTo?: string }) =>
    api.get('/tickets', { params }),

  pending: () => api.get('/tickets/pending'),

  get: (id: string) => api.get(`/tickets/${id}`),

  assign: (id: string) => api.post(`/tickets/${id}/assign`),

  transfer: (id: string, userId: string) =>
    api.post(`/tickets/${id}/transfer`, { userId }),

  updateStatus: (id: string, status: string) =>
    api.put(`/tickets/${id}/status`, { status }),

  close: (id: string, closeData?: {
    solution?: string;
    solutionType?: string;
    timeWorked?: number;
    parts?: Array<{
      partId?: string;
      partName: string;
      quantity: number;
      unitCost: number;
      purchased?: boolean;
    }>;
  }) => api.post(`/tickets/${id}/close`, closeData || {}),
};

// === Messages ===
export const messagesApi = {
  list: (ticketId: string) => api.get(`/tickets/${ticketId}/messages`),

  send: (ticketId: string, content: string) =>
    api.post(`/tickets/${ticketId}/messages`, { content }),
};

// === Users ===
export const usersApi = {
  list: () => api.get('/users'),

  technicians: () => api.get('/users/technicians'),

  groups: () => api.get('/users/groups'),

  get: (id: string) => api.get(`/users/${id}`),

  update: (id: string, data: any) => api.put(`/users/${id}`, data),

  delete: (id: string) => api.delete(`/users/${id}`),

  createGlpi: (data: {
    login: string;
    password: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    groupId?: number;
  }) => api.post('/users/glpi', data),
};

// === Bot ===
export const botApi = {
  status: () => api.get('/bot/status'),
  qr: () => api.get('/bot/qr'),
  pairingCode: (phoneNumber: string) => api.post('/bot/pairing-code', { phoneNumber }),
  disconnect: () => api.post('/bot/disconnect'),
  restart: () => api.post('/bot/restart'),
  logout: () => api.post('/bot/logout'),
};

// === Parts (Estoque) ===
export const partsApi = {
  list: () => api.get('/parts'),
  get: (id: string) => api.get(`/parts/${id}`),
  create: (data: { name: string; code: string; description?: string; quantity?: number; minQuantity?: number; unitCost: number }) =>
    api.post('/parts', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/parts/${id}`, data),
  addStock: (id: string, quantity: number) => api.post(`/parts/${id}/add-stock`, { quantity }),
  removeStock: (id: string, quantity: number) => api.post(`/parts/${id}/remove-stock`, { quantity }),
};

// === FAQ (Base de Conhecimento) ===
export const faqApi = {
  list: () => api.get('/faq?includeInactive=true'),
  search: (q: string) => api.get(`/faq/search?q=${encodeURIComponent(q)}`),
  create: (data: { question: string; answer: string; keywords: string; category?: string }) =>
    api.post('/faq', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/faq/${id}`, data),
  delete: (id: string) => api.delete(`/faq/${id}`),
};

// === Metrics (Métricas e Relatórios) ===
export const metricsApi = {
  dashboard: () => api.get('/metrics/dashboard'),
  technicians: () => api.get('/metrics/technicians'),
  technician: (id: string) => api.get(`/metrics/technicians/${id}`),
  sector: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return api.get(`/metrics/sector?${params.toString()}`);
  },
};

// === Printers (Monitoramento de Impressoras) ===
export const printerApi = {
  list: () => api.get('/printers'),
  get: (id: string) => api.get(`/printers/${id}`),
  status: (id: string) => api.get(`/printers/${id}/status`),
  statusAll: () => api.get('/printers/status/all'),
  create: (data: { name: string; ip: string; community?: string; location?: string }) =>
    api.post('/printers', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/printers/${id}`, data),
  delete: (id: string) => api.delete(`/printers/${id}`),
};

// === Team Chat ===
export const teamChatApi = {
  list: () => api.get('/team-chat'),
};

// === Purchases (Compras de Equipamentos) ===
export type EquipmentCategory = 'COMPUTER' | 'PRINTER' | 'MONITOR' | 'PERIPHERAL' | 'NETWORK' | 'SOFTWARE' | 'OTHER';

export interface CreatePurchaseDto {
  name: string;
  category?: EquipmentCategory;
  serialNumber?: string;
  assetTag?: string;
  quantity?: number;
  unitPrice: number;
  supplierId?: string;
  supplierName?: string;
  sector: string;
  location?: string;
  responsibleName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  warrantyMonths?: number;
  purchaseDate?: string;
  notes?: string;
}

export const purchasesApi = {
  list: (params?: { sector?: string; category?: EquipmentCategory; startDate?: string; endDate?: string; supplierId?: string }) =>
    api.get('/purchases', { params }),
  get: (id: string) => api.get(`/purchases/${id}`),
  create: (data: CreatePurchaseDto) => api.post('/purchases', data),
  update: (id: string, data: Partial<CreatePurchaseDto>) => api.put(`/purchases/${id}`, data),
  delete: (id: string) => api.delete(`/purchases/${id}`),
  stats: () => api.get('/purchases/stats'),
  sectors: () => api.get('/purchases/sectors'),
  monthlyReport: (year: number, month: number) =>
    api.get(`/purchases/reports/monthly?year=${year}&month=${month}`),
  sectorReport: (sector: string, startDate?: string, endDate?: string) =>
    api.get('/purchases/reports/sector', { params: { sector, startDate, endDate } }),
};

// === Suppliers (Fornecedores) ===
export const suppliersApi = {
  list: () => api.get('/suppliers'),
  get: (id: string) => api.get(`/suppliers/${id}`),
  create: (data: { name: string; cnpj?: string; phone?: string; email?: string; address?: string }) =>
    api.post('/suppliers', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/suppliers/${id}`, data),
  delete: (id: string) => api.delete(`/suppliers/${id}`),
};
