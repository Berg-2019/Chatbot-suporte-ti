/**
 * API Client - Configuração do Axios
 */

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

const api = axios.create({
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

// Interceptor para tratar erros de auth
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authAPI = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  register: (data: { email: string; password: string; name: string; role?: string }) =>
    api.post('/auth/register', data),
};

// Bot
export const botAPI = {
  status: () => api.get('/bot/status'),
  qr: () => api.get('/bot/qr'),
  pairing: () => api.get('/bot/pairing'),
  connectQR: () => api.post('/bot/connect/qr'),
  connectPairing: (phone: string) => api.post('/bot/connect/pairing', { phone }),
  disconnect: () => api.post('/bot/disconnect'),
  clearSession: () => api.post('/bot/clear-session'),
  send: (phone: string, message: string) => api.post('/bot/send', { phone, message }),
};

// Tickets
export const ticketsAPI = {
  list: (params?: { status?: string; queue_id?: number }) => 
    api.get('/tickets', { params }),
  pending: () => api.get('/tickets/pending'),
  get: (id: number) => api.get(`/tickets/${id}`),
  assign: (id: number) => api.post(`/tickets/${id}/assign`),
  transfer: (id: number, data: { technician_id?: number; queue_id?: number }) =>
    api.post(`/tickets/${id}/transfer`, data),
  close: (id: number) => api.post(`/tickets/${id}/close`),
};

// Chats
export const chatsAPI = {
  messages: (ticketId: number) => api.get(`/chats/${ticketId}/messages`),
  send: (ticketId: number, content: string) =>
    api.post(`/chats/${ticketId}/messages`, { content }),
};

// Users
export const usersAPI = {
  list: () => api.get('/users'),
  technicians: () => api.get('/users/technicians'),
  get: (id: number) => api.get(`/users/${id}`),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
};

// Queues
export const queuesAPI = {
  list: () => api.get('/queues'),
  create: (data: { name: string; description?: string; skills?: string[] }) =>
    api.post('/queues', data),
  update: (id: number, data: any) => api.put(`/queues/${id}`, data),
  delete: (id: number) => api.delete(`/queues/${id}`),
};
