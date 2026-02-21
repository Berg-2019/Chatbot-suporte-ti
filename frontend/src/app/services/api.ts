/**
 * API Service - Centralized API calls for the frontend
 */

const API_URL = import.meta.env.VITE_API_URL ?? '';

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
        // NestJS retorna { message, error, statusCode } - extrair a mensagem corretamente
        const errorMessage = error.message || error.error || `HTTP ${response.status}`;
        throw new Error(errorMessage);
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
    isReservable?: boolean;
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

export interface StockListResponse {
    items: StockItem[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export const stockApi = {
    // Get all stock items with optional filters
    getAll: (filters?: StockFilters): Promise<StockListResponse> => {
        const params = new URLSearchParams();
        if (filters?.stockType) params.set('stockType', filters.stockType);
        if (filters?.category) params.set('category', filters.category);
        if (filters?.assetStatus) params.set('assetStatus', filters.assetStatus);
        if (filters?.search) params.set('search', filters.search);
        if (filters?.lowStock) params.set('lowStock', 'true');

        // Force high limit for now to match unlimited behavior expectation
        params.set('limit', '100');

        const query = params.toString();
        return apiFetch<StockListResponse>(`/stock${query ? `?${query}` : ''}`);
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
    stockType?: 'TI' | 'ELECTRIC';
}

export const reservationApi = {
    // Get all reservations
    getAll: (filters?: ReservationFilters): Promise<Reservation[]> => {
        const params = new URLSearchParams();
        if (filters?.stockItemId) params.set('stockItemId', filters.stockItemId);
        if (filters?.status) params.set('status', filters.status);
        if (filters?.startDate) params.set('startDate', filters.startDate);
        if (filters?.endDate) params.set('endDate', filters.endDate);
        if (filters?.stockType) params.set('stockType', filters.stockType);

        const query = params.toString();
        return apiFetch<Reservation[]>(`/reservations${query ? `?${query}` : ''}`);
    },

    // Get timeline for a date range
    getTimeline: (startDate: Date, endDate: Date, stockType?: 'TI' | 'ELECTRIC'): Promise<Reservation[]> => {
        const params = new URLSearchParams({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        });
        if (stockType) params.set('stockType', stockType);
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
// Printers API
// ================================================================

export interface PrinterStatus {
    online: boolean;
    status: string;
    model?: string;
    tonerBlack?: number;
    tonerCyan?: number;
    tonerMagenta?: number;
    tonerYellow?: number;
    pageCount?: number;
    error?: string;
}

export interface Printer {
    id: string;
    name: string;
    ip: string;
    port?: number;
    location: string | null;
    status: PrinterStatus;
}

export const printerApi = {
    getAllStatus: (): Promise<Printer[]> => {
        return apiFetch<Printer[]>('/printers/status/all');
    },

    create: (data: Partial<Printer>): Promise<Printer> => {
        return apiFetch<Printer>('/printers', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    update: (id: string, data: Partial<Printer>): Promise<Printer> => {
        return apiFetch<Printer>(`/printers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    delete: (id: string): Promise<void> => {
        return apiFetch<void>(`/printers/${id}`, { method: 'DELETE' });
    },
};

// ================================================================
// Messages API
// ================================================================

export interface Message {
    id: string;
    ticketId: string;
    content: string;
    direction: 'INCOMING' | 'OUTGOING';
    type?: 'TEXT' | 'IMAGE' | 'AUDIO' | 'DOCUMENT';
    senderId?: string;
    sender?: { id: string; name: string };
    createdAt: string;
}

// ================================================================
// Users API
// ================================================================

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'AGENT' | 'USER';
    active: boolean;
    createdAt?: string;
    phone?: string;
    department?: string;
}

export interface GlpiUser {
    id: number;
    name: string;
    realname: string;
    firstname: string;
    email: string;
    phone: string;
    is_active: boolean;
    department?: string;
    permissions?: string[];
    groups?: { id: number; name: string }[];
}

export const usersApi = {
    getAll: (): Promise<User[]> => {
        return apiFetch<User[]>('/users');
    },

    getGlpiUsers: (): Promise<GlpiUser[]> => {
        return apiFetch<GlpiUser[]>('/users/glpi');
    },

    getGroups: (): Promise<{ id: number; name: string; completename: string; level: number }[]> => {
        return apiFetch('/users/groups');
    },

    getTechnicians: (): Promise<User[]> => {
        return apiFetch<User[]>('/users/technicians');
    },

    createGlpiUser: (data: any): Promise<any> => {
        return apiFetch('/users/glpi', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    deleteGlpiUser: (id: string): Promise<void> => {
        return apiFetch<void>(`/users/glpi/${id}`, { method: 'DELETE' });
    },

    updateGlpiUser: (id: string, data: any): Promise<any> => {
        return apiFetch(`/users/glpi/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    update: (id: string, data: any): Promise<User> => {
        return apiFetch<User>(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    delete: (id: string): Promise<void> => {
        return apiFetch<void>(`/users/${id}`, { method: 'DELETE' });
    }
};

// ================================================================
// Tickets API
// ================================================================

export interface Ticket {
    id: string;
    title: string;
    category: string;
    status: 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED';
    ticketNumber: string;
    client: string;
    customerName?: string;
    sector?: string;
    description: string;
    technician?: string;
    phoneNumber?: string;
    createdAt: string;
    priority?: number;
    type?: 'SUPPORT' | 'SERVICE_REPORT';
    location?: string;
}

export interface TicketsResponse {
    tickets: Ticket[];
    total: number;
    page: number;
    limit: number;
}

export interface TicketFilters {
    status?: string;
    technician?: string;
    description?: string; // search usually maps to description or title
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface CreateTicketDto {
    title: string;
    description: string;
    phoneNumber?: string;
    customerName?: string;
    sector?: string;
    category?: string;
    priority?: 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'URGENT';
    type?: 'SUPPORT' | 'SERVICE_REPORT';
    location?: string;
    assignedToId?: string;
    files?: File[];
}

export const ticketsApi = {
    // Get all tickets
    getAll: (filters?: TicketFilters): Promise<TicketsResponse> => {
        const params = new URLSearchParams();
        if (filters?.status) params.set('status', filters.status);
        if (filters?.technician) params.set('technician', filters.technician);
        if (filters?.category) params.set('category', filters.category);
        if (filters?.search) params.set('search', filters.search);
        if (filters?.page) params.set('page', filters.page.toString());
        if (filters?.limit) params.set('limit', filters.limit.toString());

        const query = params.toString();
        return apiFetch<TicketsResponse>(`/tickets${query ? `?${query}` : ''}`);
    },

    // Create new ticket (manual)
    create: (data: CreateTicketDto): Promise<Ticket> => {
        return apiFetch<Ticket>('/tickets', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Upload attachment
    uploadAttachment: (ticketId: string, file: File): Promise<any> => {
        const formData = new FormData();
        formData.append('file', file);
        return apiFetch<any>(`/tickets/${ticketId}/attachments`, {
            method: 'POST',
            body: formData,
        });
    },

    // Get single ticket
    getById: (id: string): Promise<Ticket> => {
        return apiFetch<Ticket>(`/tickets/${id}`);
    },

    // Update ticket status
    updateStatus: (id: string, status: string): Promise<Ticket> => {
        return apiFetch<Ticket>(`/tickets/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    },

    // Close ticket with details
    closeTicket: (id: string, data: any): Promise<Ticket> => {
        return apiFetch<Ticket>(`/tickets/${id}/close`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Assign ticket to technician
    assign: (id: string, technicianId: string): Promise<Ticket> => {
        return apiFetch<Ticket>(`/tickets/${id}/assign`, {
            method: 'POST',
            body: JSON.stringify({ technicianId }),
        });
    },

    // Transfer ticket to another technician
    transfer: (id: string, userId: string): Promise<Ticket> => {
        return apiFetch<Ticket>(`/tickets/${id}/transfer`, {
            method: 'POST',
            body: JSON.stringify({ userId }),
        });
    },

    // Get messages
    getMessages: (ticketId: string): Promise<Message[]> => {
        return apiFetch<Message[]>(`/tickets/${ticketId}/messages`);
    },

    // Send message
    sendMessage: (ticketId: string, content: string): Promise<Message> => {
        return apiFetch<Message>(`/tickets/${ticketId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
    },
};

// ================================================================
// Bot API (WhatsApp Connection)
// ================================================================

export interface BotStatus {
    status: 'connected' | 'disconnected' | 'connecting' | 'qr_ready' | 'maintenance';
    uptime?: number;
    connectedNumber?: string;
    messagesReceived?: number;
    messagesSent?: number;
    lastActivity?: string;
}

export interface QRCodeResponse {
    qrCode?: string; // base64 QR code image
    status: string;
    message?: string;
}

export interface PairingCodeResponse {
    pairingCode?: string;
    status: string;
    message?: string;
    expiresIn?: number;
}

export const botApi = {
    // Get bot status
    getStatus: (): Promise<BotStatus> => {
        return apiFetch<BotStatus>('/bot/status');
    },

    // Get QR code for connection
    getQR: (): Promise<QRCodeResponse> => {
        return apiFetch<QRCodeResponse>('/bot/qr');
    },

    // Get pairing code (alternative to QR)
    getPairingCode: (phoneNumber: string): Promise<PairingCodeResponse> => {
        return apiFetch<PairingCodeResponse>('/bot/pairing-code', {
            method: 'POST',
            body: JSON.stringify({ phoneNumber }),
        });
    },

    // Disconnect from WhatsApp
    disconnect: (): Promise<{ success: boolean; message: string }> => {
        return apiFetch('/bot/disconnect', { method: 'POST' });
    },

    // Restart bot
    restart: (): Promise<{ success: boolean; message: string }> => {
        return apiFetch('/bot/restart', { method: 'POST' });
    },

    // Logout (clear session)
    logout: (): Promise<{ success: boolean; message: string }> => {
        return apiFetch('/bot/logout', { method: 'POST' });
    },
};

// ================================================================
// Metrics API
// ================================================================

export interface DashboardSummary {
    ticketsToday: number;
    ticketsOpen: number;
    ticketsClosed: number;
    avgResponseTime: number;
    slaCompliance: number;
}

export interface TechnicianMetrics {
    id: string;
    name: string;
    ticketsAssigned: number;
    ticketsClosed: number;
    avgRating: number;
    avgResponseTime: number;
}

export interface SectorMetrics {
    totalTickets: number;
    ticketsByDay: { day: string; total: number; open: number; closed: number }[];
    ticketsByCategory: { name: string; value: number }[];
    responseTimeByHour: { hour: string; tempo: number }[];
    avgResolutionTime: number;
    slaCompliance: number;
}

export const metricsApi = {
    // Get dashboard summary
    getDashboard: (): Promise<DashboardSummary> => {
        return apiFetch<DashboardSummary>('/metrics/dashboard');
    },

    // Get all technicians metrics
    getTechnicians: (): Promise<TechnicianMetrics[]> => {
        return apiFetch<TechnicianMetrics[]>('/metrics/technicians');
    },

    // Get single technician metrics
    getTechnician: (id: string): Promise<TechnicianMetrics> => {
        return apiFetch<TechnicianMetrics>(`/metrics/technicians/${id}`);
    },

    // Get sector metrics
    getSector: (startDate?: Date, endDate?: Date): Promise<SectorMetrics> => {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate.toISOString());
        if (endDate) params.set('endDate', endDate.toISOString());
        const query = params.toString();
        return apiFetch<SectorMetrics>(`/metrics/sector${query ? `?${query}` : ''}`);
    },
};

// ================================================================
// FAQ API
// ================================================================

export interface FAQ {
    id: string;
    question: string;
    answer: string;
    keywords: string;
    category: string | null;
    views: number;
    helpful: number;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export const faqApi = {
    // Get all FAQs
    getAll: (includeInactive?: boolean): Promise<FAQ[]> => {
        const query = includeInactive ? '?includeInactive=true' : '';
        return apiFetch<FAQ[]>(`/faq${query}`);
    },

    // Search FAQs (public endpoint)
    search: (query: string): Promise<FAQ[]> => {
        return apiFetch<FAQ[]>(`/faq/search?q=${encodeURIComponent(query)}`);
    },

    // Get single FAQ
    getById: (id: string): Promise<FAQ> => {
        return apiFetch<FAQ>(`/faq/${id}`);
    },

    // Create FAQ
    create: (data: { question: string; answer: string; keywords: string; category?: string }): Promise<FAQ> => {
        return apiFetch<FAQ>('/faq', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Update FAQ
    update: (id: string, data: Partial<FAQ>): Promise<FAQ> => {
        return apiFetch<FAQ>(`/faq/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    // Deactivate FAQ
    delete: (id: string): Promise<void> => {
        return apiFetch<void>(`/faq/${id}`, { method: 'DELETE' });
    },

    // Increment views
    incrementViews: (id: string): Promise<FAQ> => {
        return apiFetch<FAQ>(`/faq/${id}/view`, { method: 'POST' });
    },

    // Mark as helpful
    markHelpful: (id: string): Promise<FAQ> => {
        return apiFetch<FAQ>(`/faq/${id}/helpful`, { method: 'POST' });
    },
};

// ================================================================
// Team Chat API
// ================================================================

export interface TeamMessage {
    id: string;
    content: string;
    senderId: string;
    sender: {
        id: string;
        name: string;
        role: 'ADMIN' | 'AGENT';
        sector?: string;
    };
    createdAt: string;
}

export const teamChatApi = {
    // Get messages
    getMessages: (): Promise<TeamMessage[]> => {
        return apiFetch<TeamMessage[]>('/team-chat');
    },

    // Send message
    sendMessage: (content: string): Promise<TeamMessage> => {
        return apiFetch<TeamMessage>('/team-chat', {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
    },
};

// ================================================================
// Reports API
// ================================================================

export interface ReportRecipient {
    id: string;
    name: string;
    jid: string;
    active: boolean;
}

// Ticket closure report types
export interface TicketClosureReport {
    tickets: {
        id: string;
        title: string;
        category: string | null;
        priority: string;
        status: string;
        customerName: string | null;
        sector: string | null;
        solution: string | null;
        solutionType: string | null;
        timeWorked: number | null;
        rating: number | null;
        createdAt: string;
        closedAt: string | null;
        assignedTo: { id: string; name: string; email: string } | null;
        partUsages: { partName: string; quantity: number; unitCost: number; purchased: boolean }[];
    }[];
    summary: {
        totalClosed: number;
        totalTimeWorked: number;
        avgTimeWorked: number;
        avgRating: number;
        ratedCount: number;
    };
    aggregates: {
        byTechnician: { name: string; count: number; avgTime: number }[];
        bySolutionType: { name: string; count: number }[];
        byCategory: { name: string; count: number }[];
        byDay: { date: string; total: number }[];
    };
}

export interface TicketReportFilters {
    startDate?: string;
    endDate?: string;
    technicianId?: string;
    category?: string;
    solutionType?: string;
}

// Stock movement report types
export interface StockMovementReport {
    movements: {
        id: string;
        type: 'IN' | 'OUT';
        quantity: number;
        reason: string | null;
        performedBy: string | null;
        createdAt: string;
        stockItem: {
            id: string;
            name: string;
            code: string | null;
            stockType: string;
            category: string;
            unit: string;
            location: string | null;
            printerModel: string | null;
            inkColor: string | null;
            assetTag: string | null;
        };
    }[];
    summary: {
        totalMovements: number;
        totalIn: number;
        totalOut: number;
        netBalance: number;
    };
    aggregates: {
        byItem: { name: string; totalIn: number; totalOut: number; net: number }[];
        byDay: { date: string; totalIn: number; totalOut: number }[];
    };
}

export interface StockReportFilters {
    startDate?: string;
    endDate?: string;
    stockType?: string;
    category?: string;
    movementType?: string;
}

export const reportsApi = {
    // Get all recipients
    getRecipients: (): Promise<ReportRecipient[]> => {
        return apiFetch<ReportRecipient[]>('/reports/recipients');
    },

    // Send report to recipients (optional specific recipient)
    sendReport: (data: { reportType?: string; filters?: any; recipientJid?: string }): Promise<any> => {
        return apiFetch('/reports/recipients/send', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Ticket closure report
    getTicketReport: (filters?: TicketReportFilters): Promise<TicketClosureReport> => {
        const params = new URLSearchParams();
        if (filters?.startDate) params.set('startDate', filters.startDate);
        if (filters?.endDate) params.set('endDate', filters.endDate);
        if (filters?.technicianId) params.set('technicianId', filters.technicianId);
        if (filters?.category) params.set('category', filters.category);
        if (filters?.solutionType) params.set('solutionType', filters.solutionType);
        const query = params.toString();
        return apiFetch<TicketClosureReport>(`/reports/tickets${query ? `?${query}` : ''}`);
    },

    // Stock movement report
    getStockReport: (filters?: StockReportFilters): Promise<StockMovementReport> => {
        const params = new URLSearchParams();
        if (filters?.startDate) params.set('startDate', filters.startDate);
        if (filters?.endDate) params.set('endDate', filters.endDate);
        if (filters?.stockType) params.set('stockType', filters.stockType);
        if (filters?.category) params.set('category', filters.category);
        if (filters?.movementType) params.set('movementType', filters.movementType);
        const query = params.toString();
        return apiFetch<StockMovementReport>(`/reports/stock${query ? `?${query}` : ''}`);
    },
};

// ================================================================
// Canned Responses API (Fase 1 - Feature 1)
// ================================================================

export interface CannedResponse {
    id: string;
    shortcode: string;
    title: string;
    content: string;
    category: string | null;
    isPublic: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface CannedResponseFilters {
    search?: string;
    category?: string;
    isPublic?: boolean;
    limit?: number;
}

export const cannedResponsesApi = {
    // List all canned responses
    list: (filters?: CannedResponseFilters): Promise<CannedResponse[]> => {
        const params = new URLSearchParams();
        if (filters?.search) params.set('search', filters.search);
        if (filters?.category) params.set('category', filters.category);
        if (filters?.isPublic !== undefined) params.set('isPublic', String(filters.isPublic));
        if (filters?.limit) params.set('limit', String(filters.limit));
        const query = params.toString();
        return apiFetch<CannedResponse[]>(`/canned-responses${query ? `?${query}` : ''}`);
    },

    // Get categories
    getCategories: (): Promise<string[]> => {
        return apiFetch<string[]>('/canned-responses/categories');
    },

    // Autocomplete/suggest
    suggest: (query: string): Promise<CannedResponse[]> => {
        return apiFetch<CannedResponse[]>(`/canned-responses/suggest?q=${encodeURIComponent(query)}`);
    },

    // Get by ID
    getById: (id: string): Promise<CannedResponse> => {
        return apiFetch<CannedResponse>(`/canned-responses/${id}`);
    },

    // Get by shortcode
    getByShortcode: (shortcode: string): Promise<CannedResponse> => {
        return apiFetch<CannedResponse>(`/canned-responses/shortcode/${shortcode}`);
    },

    // Create
    create: (data: Omit<CannedResponse, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<CannedResponse> => {
        return apiFetch<CannedResponse>('/canned-responses', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Update
    update: (id: string, data: Partial<Omit<CannedResponse, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>): Promise<CannedResponse> => {
        return apiFetch<CannedResponse>(`/canned-responses/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    // Delete
    delete: (id: string): Promise<void> => {
        return apiFetch<void>(`/canned-responses/${id}`, {
            method: 'DELETE',
        });
    },
};

// ================================================================
// Webhooks API (Fase 1 - Feature 2)
// ================================================================

export interface Webhook {
    id: string;
    name: string;
    url: string;
    events: string[];
    active: boolean;
    secret: string | null;
    customHeaders: Record<string, string> | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface WebhookLog {
    id: string;
    webhookId: string;
    event: string;
    payload: any;
    statusCode: number | null;
    response: string | null;
    success: boolean;
    error: string | null;
    executedAt: string;
}

export interface WebhookStats {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    lastExecution: string | null;
}

export interface WebhookFilters {
    active?: boolean;
    event?: string;
}

export const webhooksApi = {
    // List all webhooks
    list: (filters?: WebhookFilters): Promise<Webhook[]> => {
        const params = new URLSearchParams();
        if (filters?.active !== undefined) params.set('active', String(filters.active));
        if (filters?.event) params.set('event', filters.event);
        const query = params.toString();
        return apiFetch<Webhook[]>(`/webhooks${query ? `?${query}` : ''}`);
    },

    // Get by ID
    getById: (id: string): Promise<Webhook> => {
        return apiFetch<Webhook>(`/webhooks/${id}`);
    },

    // Get logs
    getLogs: (id: string, limit?: number): Promise<WebhookLog[]> => {
        const query = limit ? `?limit=${limit}` : '';
        return apiFetch<WebhookLog[]>(`/webhooks/${id}/logs${query}`);
    },

    // Get stats
    getStats: (id: string): Promise<WebhookStats> => {
        return apiFetch<WebhookStats>(`/webhooks/${id}/stats`);
    },

    // Create
    create: (data: Omit<Webhook, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<Webhook> => {
        return apiFetch<Webhook>('/webhooks', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Test webhook
    test: (id: string): Promise<{ success: boolean; message: string }> => {
        return apiFetch<{ success: boolean; message: string }>(`/webhooks/${id}/test`, {
            method: 'POST',
        });
    },

    // Update
    update: (id: string, data: Partial<Omit<Webhook, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>): Promise<Webhook> => {
        return apiFetch<Webhook>(`/webhooks/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    // Delete
    delete: (id: string): Promise<void> => {
        return apiFetch<void>(`/webhooks/${id}`, {
            method: 'DELETE',
        });
    },
};

// ================================================================
// Contacts API (Fase 1 - Feature 3)
// ================================================================

export interface Contact {
    id: string;
    jid: string;
    phoneNumber: string | null;
    name: string;
    email: string | null;
    sector: string;
    company: string | null;
    department: string | null;
    ramal: string | null;
    customAttributes: Record<string, any> | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ContactStats {
    totalTickets: number;
    resolvedTickets: number;
    resolutionRate: number;
    daysSinceLastContact: number | null;
}

export interface ContactFilters {
    search?: string;
    sector?: string;
    page?: number;
    limit?: number;
}

export interface ContactListResponse {
    items: Contact[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export const contactsApi = {
    // List all contacts with pagination
    list: (filters?: ContactFilters): Promise<ContactListResponse> => {
        const params = new URLSearchParams();
        if (filters?.search) params.set('search', filters.search);
        if (filters?.sector) params.set('sector', filters.sector);
        if (filters?.page) params.set('page', String(filters.page));
        if (filters?.limit) params.set('limit', String(filters.limit));
        const query = params.toString();
        return apiFetch<ContactListResponse>(`/contacts${query ? `?${query}` : ''}`);
    },

    // Get sectors
    getSectors: (): Promise<string[]> => {
        return apiFetch<string[]>('/contacts/sectors');
    },

    // Get by ID
    getById: (id: string): Promise<Contact> => {
        return apiFetch<Contact>(`/contacts/${id}`);
    },

    // Get ticket history
    getTicketHistory: (id: string, limit?: number): Promise<any[]> => {
        const query = limit ? `?limit=${limit}` : '';
        return apiFetch<any[]>(`/contacts/${id}/tickets${query}`);
    },

    // Get stats
    getStats: (id: string): Promise<ContactStats> => {
        return apiFetch<ContactStats>(`/contacts/${id}/stats`);
    },

    // Get by phone
    getByPhone: (phone: string): Promise<Contact> => {
        return apiFetch<Contact>(`/contacts/phone/${encodeURIComponent(phone)}`);
    },

    // Get by JID
    getByJid: (jid: string): Promise<Contact> => {
        return apiFetch<Contact>(`/contacts/jid/${encodeURIComponent(jid)}`);
    },

    // Create
    create: (data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> => {
        return apiFetch<Contact>('/contacts', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Upsert by JID
    upsertByJid: (data: { jid: string; phoneNumber: string; name: string; [key: string]: any }): Promise<Contact> => {
        return apiFetch<Contact>('/contacts/upsert/jid', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Upsert by phone
    upsertByPhone: (data: { phoneNumber: string; name: string; [key: string]: any }): Promise<Contact> => {
        return apiFetch<Contact>('/contacts/upsert/phone', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Merge contacts
    merge: (keepId: string, mergeId: string): Promise<Contact> => {
        return apiFetch<Contact>(`/contacts/${keepId}/merge/${mergeId}`, {
            method: 'POST',
        });
    },

    // Update
    update: (id: string, data: Partial<Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Contact> => {
        return apiFetch<Contact>(`/contacts/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    // Update custom attributes
    updateCustomAttributes: (id: string, attributes: Record<string, any>): Promise<Contact> => {
        return apiFetch<Contact>(`/contacts/${id}/custom-attributes`, {
            method: 'PATCH',
            body: JSON.stringify(attributes),
        });
    },

    // Delete
    delete: (id: string): Promise<void> => {
        return apiFetch<void>(`/contacts/${id}`, {
            method: 'DELETE',
        });
    },
};

// ================================================================
// Roles API (Fase 1 - Feature 4)
// ================================================================

export interface CustomRole {
    id: string;
    name: string;
    description: string | null;
    permissions: string[];
    isSystem: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PermissionModule {
    module: string;
    actions: string[];
}

export interface RoleFilters {
    isSystem?: boolean;
}

export const rolesApi = {
    // List all roles
    list: (filters?: RoleFilters): Promise<CustomRole[]> => {
        const params = new URLSearchParams();
        if (filters?.isSystem !== undefined) params.set('isSystem', String(filters.isSystem));
        const query = params.toString();
        return apiFetch<CustomRole[]>(`/roles${query ? `?${query}` : ''}`);
    },

    // Get available permissions
    getPermissions: (): Promise<PermissionModule[]> => {
        return apiFetch<PermissionModule[]>('/roles/permissions');
    },

    // Get by ID
    getById: (id: string): Promise<CustomRole> => {
        return apiFetch<CustomRole>(`/roles/${id}`);
    },

    // Create
    create: (data: Omit<CustomRole, 'id' | 'createdAt' | 'updatedAt' | 'isSystem'>): Promise<CustomRole> => {
        return apiFetch<CustomRole>('/roles', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Assign role to user
    assignToUser: (roleId: string, userId: string): Promise<{ message: string }> => {
        return apiFetch<{ message: string }>(`/roles/${roleId}/assign/${userId}`, {
            method: 'POST',
        });
    },

    // Update
    update: (id: string, data: Partial<Omit<CustomRole, 'id' | 'createdAt' | 'updatedAt' | 'isSystem'>>): Promise<CustomRole> => {
        return apiFetch<CustomRole>(`/roles/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    // Delete
    delete: (id: string): Promise<void> => {
        return apiFetch<void>(`/roles/${id}`, {
            method: 'DELETE',
        });
    },
};

// ================================================================
// Export all APIs
// ================================================================

export const api = {
    stock: stockApi,
    reservations: reservationApi,
    tickets: ticketsApi,
    printers: printerApi,
    users: usersApi,
    bot: botApi,
    metrics: metricsApi,
    faq: faqApi,
    teamChat: teamChatApi,
    reports: reportsApi,
    cannedResponses: cannedResponsesApi,
    webhooks: webhooksApi,
    contacts: contactsApi,
    roles: rolesApi,
};

export default api;
