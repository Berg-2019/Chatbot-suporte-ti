/**
 * API Service - Centralized API calls for the frontend
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Helper to get auth token
const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

// Generic fetch wrapper with error handling
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_URL}/api${endpoint}`, {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...options?.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
}

// ================================================================
// Stock API
// ================================================================

export interface StockItem {
    id: string;
    name: string;
    code: string | null;
    description: string | null;
    stockType: 'TI' | 'ELECTRIC';
    category: 'SUPPLY' | 'INK' | 'ASSET';
    quantity: number;
    minQuantity: number;
    unit: 'UN' | 'M' | 'L' | 'ML' | 'CX' | 'PCT' | 'KG';
    unitCost: number | null;
    location: string | null;
    printerModel: string | null;
    inkColor: 'BLACK' | 'CYAN' | 'MAGENTA' | 'YELLOW' | null;
    assetTag: string | null;
    assetStatus: 'AVAILABLE' | 'RESERVED' | 'IN_USE' | 'MAINTENANCE';
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface StockStats {
    total: number;
    lowStock: number;
    assets: number;
    supplies: number;
}

export interface StockFilters {
    stockType?: 'TI' | 'ELECTRIC';
    category?: 'SUPPLY' | 'INK' | 'ASSET';
    assetStatus?: string;
    search?: string;
    lowStock?: boolean;
}

export const stockApi = {
    // Get all stock items with optional filters
    getAll: (filters?: StockFilters): Promise<StockItem[]> => {
        const params = new URLSearchParams();
        if (filters?.stockType) params.set('stockType', filters.stockType);
        if (filters?.category) params.set('category', filters.category);
        if (filters?.assetStatus) params.set('assetStatus', filters.assetStatus);
        if (filters?.search) params.set('search', filters.search);
        if (filters?.lowStock) params.set('lowStock', 'true');

        const query = params.toString();
        return apiFetch<StockItem[]>(`/stock${query ? `?${query}` : ''}`);
    },

    // Get single item
    getById: (id: string): Promise<StockItem> => {
        return apiFetch<StockItem>(`/stock/${id}`);
    },

    // Get stats
    getStats: (stockType?: string): Promise<StockStats> => {
        const query = stockType ? `?stockType=${stockType}` : '';
        return apiFetch<StockStats>(`/stock/stats${query}`);
    },

    // Create item
    create: (data: Partial<StockItem>): Promise<StockItem> => {
        return apiFetch<StockItem>('/stock', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Update item
    update: (id: string, data: Partial<StockItem>): Promise<StockItem> => {
        return apiFetch<StockItem>(`/stock/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    // Delete item
    delete: (id: string): Promise<void> => {
        return apiFetch<void>(`/stock/${id}`, { method: 'DELETE' });
    },

    // Register movement (entrada/saída)
    registerMovement: (id: string, quantity: number, reason?: string): Promise<StockItem> => {
        return apiFetch<StockItem>(`/stock/${id}/movement`, {
            method: 'POST',
            body: JSON.stringify({ quantity, reason }),
        });
    },
};

// ================================================================
// Reservations API
// ================================================================

export interface Reservation {
    id: string;
    stockItemId: string;
    stockItem?: {
        id: string;
        name: string;
        assetTag: string | null;
        category: string;
    };
    userId: string | null;
    userName: string;
    userPhone: string | null;
    userSector: string | null;
    startTime: string;
    endTime: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_USE' | 'COMPLETED' | 'CANCELLED';
    ticketId: string | null;
    notes: string | null;
    approvedById: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ReservationFilters {
    stockItemId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
}

export const reservationApi = {
    // Get all reservations
    getAll: (filters?: ReservationFilters): Promise<Reservation[]> => {
        const params = new URLSearchParams();
        if (filters?.stockItemId) params.set('stockItemId', filters.stockItemId);
        if (filters?.status) params.set('status', filters.status);
        if (filters?.startDate) params.set('startDate', filters.startDate);
        if (filters?.endDate) params.set('endDate', filters.endDate);

        const query = params.toString();
        return apiFetch<Reservation[]>(`/reservations${query ? `?${query}` : ''}`);
    },

    // Get timeline for a date range
    getTimeline: (startDate: Date, endDate: Date): Promise<Reservation[]> => {
        const params = new URLSearchParams({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        });
        return apiFetch<Reservation[]>(`/reservations/timeline?${params}`);
    },

    // Get pending count
    getPendingCount: (): Promise<{ count: number }> => {
        return apiFetch<{ count: number }>('/reservations/pending-count');
    },

    // Create reservation
    create: (data: Partial<Reservation>): Promise<Reservation> => {
        return apiFetch<Reservation>('/reservations', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Update status
    updateStatus: (id: string, status: string, notes?: string): Promise<Reservation> => {
        return apiFetch<Reservation>(`/reservations/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, notes }),
        });
    },

    // Approve shortcut
    approve: (id: string): Promise<Reservation> => {
        return apiFetch<Reservation>(`/reservations/${id}/approve`, {
            method: 'POST',
        });
    },

    // Reject shortcut
    reject: (id: string, notes?: string): Promise<Reservation> => {
        return apiFetch<Reservation>(`/reservations/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify({ notes }),
        });
    },
};

// ================================================================
// Export all APIs
// ================================================================

export const api = {
    stock: stockApi,
    reservations: reservationApi,
};

export default api;
