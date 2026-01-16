/**
 * API Client - Axios configurado
 */

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
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

  get: (id: string) => api.get(`/users/${id}`),

  update: (id: string, data: any) => api.put(`/users/${id}`, data),

  delete: (id: string) => api.delete(`/users/${id}`),
};

// === Bot ===
export const botApi = {
  status: () => api.get('/bot/status'),
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

