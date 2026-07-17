import { Sector } from '@prisma/client';

export enum FlowState {
  IDLE = 'idle',
  GREETING = 'greeting',
  COLLECT_SECTOR = 'collect_sector',
  COLLECT_PROBLEM = 'collect_problem',
  COLLECT_LOCATION = 'collect_location',
  COLLECT_NAME = 'collect_name',
  CHECK_FAQ = 'check_faq',
  CONFIRM_TICKET = 'confirm_ticket',
  WAITING_AGENT = 'waiting_agent',
  CONSULT_STATUS = 'consult_status',
  RATING = 'rating',
}

export interface ConversationSession {
  state: FlowState;
  data: {
    sector?: Sector;
    problem?: string;
    location?: string;
    ticketId?: string;
    contactId?: string;
    customerName?: string;
    suggestedName?: string; // pushName do WhatsApp — sugestão a confirmar, nunca usada direto no ticket
    foundFaqs?: Array<{ id: string; question: string; answer: string }>;
    messageHistory: Array<{ role: 'user' | 'bot'; content: string }>;
  };
  updatedAt: number;
}

export interface WhatsAppStatus {
  connected: boolean;
  phoneNumber: string | null;
  uptime: number;
  lastConnected: string | null;
  qrCode: string | null;
}
