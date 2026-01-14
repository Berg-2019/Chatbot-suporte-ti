/**
 * GLPI Service - Integração com API REST do GLPI
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { RedisService } from '../cache/redis.service';

export interface GlpiTicket {
  id?: number;
  name: string;
  content: string;
  status?: number;
  urgency?: number;
  priority?: number;
  type?: number;
}

export interface GlpiFollowup {
  content: string;
  is_private?: boolean;
}

@Injectable()
export class GlpiService implements OnModuleInit {
  private client: AxiosInstance;
  private appToken: string;
  private userToken: string;
  private sessionToken: string | null = null;

  constructor(
    private config: ConfigService,
    private redis: RedisService,
  ) {}

  onModuleInit() {
    const baseURL = this.config.get<string>('GLPI_URL') || 'http://localhost:8080/apirest.php';
    this.appToken = this.config.get<string>('GLPI_APP_TOKEN') || '';
    this.userToken = this.config.get<string>('GLPI_USER_TOKEN') || '';

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'App-Token': this.appToken,
      },
    });

    console.log('✅ GLPI Service inicializado');
  }

  /**
   * Inicia sessão na API do GLPI
   */
  async initSession(): Promise<string> {
    // Verificar cache primeiro
    const cached = await this.redis.getGlpiSession();
    if (cached) {
      this.sessionToken = cached;
      return cached;
    }

    try {
      const response = await this.client.get('/initSession', {
        headers: {
          Authorization: `user_token ${this.userToken}`,
        },
      });

      this.sessionToken = response.data.session_token;
      
      // Cachear por 1 hora
      await this.redis.setGlpiSession(this.sessionToken, 3500);
      
      console.log('✅ Sessão GLPI iniciada');
      return this.sessionToken;
    } catch (error: any) {
      console.error('❌ Erro ao iniciar sessão GLPI:', error.response?.data || error.message);
      throw new Error('Falha ao conectar com GLPI');
    }
  }

  /**
   * Encerra sessão
   */
  async killSession(): Promise<void> {
    if (!this.sessionToken) return;

    try {
      await this.client.get('/killSession', {
        headers: { 'Session-Token': this.sessionToken },
      });
      this.sessionToken = null;
      await this.redis.del('glpi:session');
    } catch (error) {
      // Ignora erros ao encerrar
    }
  }

  /**
   * Garante que há uma sessão ativa
   */
  private async ensureSession(): Promise<void> {
    if (!this.sessionToken) {
      await this.initSession();
    }
  }

  /**
   * Headers com sessão
   */
  private getHeaders(): Record<string, string> {
    return {
      'Session-Token': this.sessionToken || '',
      'App-Token': this.appToken,
    };
  }

  /**
   * Criar ticket no GLPI
   */
  async createTicket(ticket: GlpiTicket): Promise<number> {
    await this.ensureSession();

    try {
      const response = await this.client.post(
        '/Ticket',
        {
          input: {
            name: ticket.name,
            content: ticket.content,
            status: ticket.status || 1, // 1 = Novo
            urgency: ticket.urgency || 3, // 3 = Média
            priority: ticket.priority || 3,
            type: ticket.type || 1, // 1 = Incidente
          },
        },
        { headers: this.getHeaders() },
      );

      const ticketId = response.data.id;
      console.log(`✅ Ticket GLPI criado: #${ticketId}`);
      return ticketId;
    } catch (error: any) {
      console.error('❌ Erro ao criar ticket GLPI:', error.response?.data || error.message);
      
      // Se sessão expirou, renovar e tentar novamente
      if (error.response?.status === 401) {
        this.sessionToken = null;
        await this.redis.del('glpi:session');
        return this.createTicket(ticket);
      }
      
      throw new Error('Falha ao criar ticket no GLPI');
    }
  }

  /**
   * Obter ticket por ID
   */
  async getTicket(id: number): Promise<any> {
    await this.ensureSession();

    try {
      const response = await this.client.get(`/Ticket/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao buscar ticket GLPI:', error.response?.data || error.message);
      throw new Error('Ticket não encontrado no GLPI');
    }
  }

  /**
   * Atualizar status do ticket
   */
  async updateTicketStatus(id: number, status: number): Promise<void> {
    await this.ensureSession();

    try {
      await this.client.put(
        `/Ticket/${id}`,
        {
          input: { status },
        },
        { headers: this.getHeaders() },
      );
      console.log(`✅ Status do ticket GLPI #${id} atualizado: ${status}`);
    } catch (error: any) {
      console.error('❌ Erro ao atualizar ticket GLPI:', error.response?.data || error.message);
      throw new Error('Falha ao atualizar ticket no GLPI');
    }
  }

  /**
   * Adicionar followup (resposta) ao ticket
   */
  async addFollowup(ticketId: number, followup: GlpiFollowup): Promise<void> {
    await this.ensureSession();

    try {
      await this.client.post(
        `/Ticket/${ticketId}/ITILFollowup`,
        {
          input: {
            content: followup.content,
            is_private: followup.is_private ? 1 : 0,
          },
        },
        { headers: this.getHeaders() },
      );
      console.log(`✅ Followup adicionado ao ticket GLPI #${ticketId}`);
    } catch (error: any) {
      console.error('❌ Erro ao adicionar followup GLPI:', error.response?.data || error.message);
      throw new Error('Falha ao adicionar followup no GLPI');
    }
  }

  /**
   * Buscar tickets por filtro
   */
  async searchTickets(criteria: Record<string, any>): Promise<any[]> {
    await this.ensureSession();

    try {
      const response = await this.client.get('/search/Ticket', {
        headers: this.getHeaders(),
        params: {
          criteria: JSON.stringify(criteria),
          forcedisplay: [1, 2, 12, 15, 19], // campos a retornar
        },
      });
      return response.data.data || [];
    } catch (error: any) {
      console.error('❌ Erro ao buscar tickets GLPI:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Status codes do GLPI
   */
  static readonly STATUS = {
    NEW: 1,
    PROCESSING_ASSIGNED: 2,
    PROCESSING_PLANNED: 3,
    PENDING: 4,
    SOLVED: 5,
    CLOSED: 6,
  };

  /**
   * Urgency codes do GLPI
   */
  static readonly URGENCY = {
    VERY_LOW: 1,
    LOW: 2,
    MEDIUM: 3,
    HIGH: 4,
    VERY_HIGH: 5,
  };
}
