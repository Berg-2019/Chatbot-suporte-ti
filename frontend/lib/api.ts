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
  
  close: (id: string) => api.post(`/tickets/${id}/close`),
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
