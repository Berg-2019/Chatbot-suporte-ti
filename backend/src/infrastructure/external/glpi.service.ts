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
  ) { }

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
      await this.redis.setGlpiSession(this.sessionToken!, 3500);

      console.log('✅ Sessão GLPI iniciada');
      return this.sessionToken!;
    } catch (error: any) {
      console.error('❌ Erro ao iniciar sessão GLPI:', error.response?.data || error.message);
      throw new Error('Falha ao conectar com GLPI');
    }
  }

  /**
   * Encerra sessão GLPI
   * @param sessionToken Token específico ou usa o token interno
   */
  async killSession(sessionToken?: string): Promise<void> {
    const token = sessionToken || this.sessionToken;
    if (!token) return;

    try {
      await this.client.get('/killSession', {
        headers: { 'Session-Token': token },
      });
      if (!sessionToken) {
        this.sessionToken = null;
        await this.redis.del('glpi:session');
      }
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
      // Método 1: Usando ITILFollowup diretamente
      await this.client.post(
        '/ITILFollowup',
        {
          input: {
            itemtype: 'Ticket',
            items_id: ticketId,
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

  // ===========================================================================
  // Grupos e Técnicos
  // ===========================================================================

  // getGroups movido para seção de autenticação e usuários

  /**
   * Buscar usuários de um grupo
   */
  async getGroupUsers(groupId: number): Promise<any[]> {
    await this.ensureSession();

    try {
      const response = await this.client.get(`/Group/${groupId}/Group_User`, {
        headers: this.getHeaders(),
      });
      return response.data || [];
    } catch (error: any) {
      console.error('❌ Erro ao buscar usuários do grupo GLPI:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Atribuir ticket a um grupo
   */
  async assignTicketToGroup(ticketId: number, groupId: number): Promise<void> {
    await this.ensureSession();

    try {
      await this.client.post(
        `/Ticket/${ticketId}/Group_Ticket`,
        {
          input: {
            groups_id: groupId,
            type: 2, // 2 = Assigned to
          },
        },
        { headers: this.getHeaders() },
      );
      console.log(`✅ Ticket GLPI #${ticketId} atribuído ao grupo ${groupId}`);
    } catch (error: any) {
      console.error('❌ Erro ao atribuir ticket ao grupo:', error.response?.data || error.message);
      throw new Error('Falha ao atribuir ticket ao grupo');
    }
  }

  /**
   * Atribuir ticket a um usuário/técnico
   */
  async assignTicketToUser(ticketId: number, userId: number): Promise<void> {
    await this.ensureSession();

    try {
      await this.client.post(
        `/Ticket/${ticketId}/Ticket_User`,
        {
          input: {
            users_id: userId,
            type: 2, // 2 = Assigned to
          },
        },
        { headers: this.getHeaders() },
      );
      console.log(`✅ Ticket GLPI #${ticketId} atribuído ao usuário ${userId}`);
    } catch (error: any) {
      console.error('❌ Erro ao atribuir ticket ao usuário:', error.response?.data || error.message);
      throw new Error('Falha ao atribuir ticket ao usuário');
    }
  }

  // ===========================================================================
  // SLA
  // ===========================================================================

  /**
   * Buscar SLAs configurados
   */
  async getSLAs(): Promise<any[]> {
    await this.ensureSession();

    try {
      const response = await this.client.get('/SLA', {
        headers: this.getHeaders(),
        params: {
          range: '0-50',
        },
      });
      return response.data || [];
    } catch (error: any) {
      console.error('❌ Erro ao buscar SLAs GLPI:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Obter informações de SLA de um ticket
   */
  async getTicketSLA(ticketId: number): Promise<any> {
    await this.ensureSession();

    try {
      const ticket = await this.getTicket(ticketId);
      return {
        slas_id_tto: ticket.slas_id_tto,
        slas_id_ttr: ticket.slas_id_ttr,
        time_to_own: ticket.time_to_own,
        time_to_resolve: ticket.time_to_resolve,
        date_creation: ticket.date_creation,
        date_mod: ticket.date_mod,
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar SLA do ticket:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Buscar tickets com SLA próximo de estourar
   */
  async getTicketsNearSLABreach(hoursRemaining: number = 1): Promise<any[]> {
    await this.ensureSession();

    try {
      // Buscar tickets abertos ordenados por tempo restante
      const response = await this.client.get('/search/Ticket', {
        headers: this.getHeaders(),
        params: {
          criteria: JSON.stringify([
            { field: 12, searchtype: 'notequals', value: 6 }, // Status != Closed
            { field: 12, searchtype: 'notequals', value: 5 }, // Status != Solved
          ]),
          forcedisplay: [1, 2, 12, 15, 18, 19, 30, 82], // ID, name, status, priority, time_to_resolve
          sort: 30, // Sort by time_to_resolve
          order: 'ASC',
        },
      });
      return response.data?.data || [];
    } catch (error: any) {
      console.error('❌ Erro ao buscar tickets próximos do SLA:', error.response?.data || error.message);
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

  // ============================================================
  // AUTENTICAÇÃO E USUÁRIOS
  // ============================================================

  /**
   * Autenticar usuário com login e senha do GLPI
   * Retorna dados do usuário + session token
   */
  async authenticateWithCredentials(login: string, password: string): Promise<{
    success: boolean;
    sessionToken?: string;
    user?: {
      id: number;
      name: string;
      realname: string;
      firstname: string;
      email: string;
      phone: string;
    };
    error?: string;
  }> {
    try {
      // Codificar credenciais em Base64
      const credentials = Buffer.from(`${login}:${password}`).toString('base64');

      const response = await this.client.get('/initSession', {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      });

      const sessionToken = response.data.session_token;

      // Buscar dados do usuário logado
      const userResponse = await this.client.get('/getFullSession', {
        headers: {
          'Session-Token': sessionToken,
        },
      });

      const userData = userResponse.data?.session?.glpiactiveprofile;
      const glpiUser = userResponse.data?.session?.glpiname_full || login;
      const glpiId = userResponse.data?.session?.glpiID;

      // Buscar dados completos do usuário
      let fullUser = null;
      if (glpiId) {
        try {
          const userDetailResponse = await this.client.get(`/User/${glpiId}`, {
            headers: {
              'Session-Token': sessionToken,
            },
          });
          fullUser = userDetailResponse.data;
        } catch (e) {
          // Ignorar se não conseguir buscar detalhes
        }
      }

      return {
        success: true,
        sessionToken,
        user: {
          id: glpiId,
          name: fullUser?.name || login,
          realname: fullUser?.realname || '',
          firstname: fullUser?.firstname || '',
          email: fullUser?.email || fullUser?.email1 || '',
          phone: fullUser?.phone || fullUser?.mobile || '',
        },
      };
    } catch (error: any) {
      console.error('❌ Erro na autenticação GLPI:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.[1] || 'Credenciais inválidas',
      };
    }
  }

  /**
   * Buscar grupos de um usuário GLPI
   */
  async getUserGroups(userId: number, sessionToken?: string): Promise<{
    id: number;
    name: string;
    completename: string;
    is_manager: boolean;
  }[]> {
    const token = sessionToken || this.sessionToken;
    if (!token) {
      await this.ensureSession();
    }

    try {
      const response = await this.client.get('/Group_User', {
        headers: {
          'Session-Token': token || this.sessionToken,
        },
        params: {
          'searchText[users_id]': userId,
          expand_dropdowns: true,
        },
      });

      const groups = response.data || [];
      return groups.map((g: any) => ({
        id: g.groups_id || g.id,
        name: g.groups_id_name || g.name || 'Grupo',
        completename: g.groups_id_completename || g.completename || '',
        is_manager: g.is_manager === 1,
      }));
    } catch (error: any) {
      console.error('❌ Erro ao buscar grupos do usuário:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Listar todos os usuários do GLPI
   */
  async getUsers(): Promise<{
    id: number;
    name: string;
    realname: string;
    firstname: string;
    email: string;
    is_active: boolean;
  }[]> {
    await this.ensureSession();

    try {
      const response = await this.client.get('/User', {
        headers: this.getHeaders(),
        params: {
          range: '0-100',
          expand_dropdowns: true,
        },
      });

      return (response.data || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        realname: u.realname || '',
        firstname: u.firstname || '',
        email: u.email || u.email1 || '',
        is_active: u.is_active === 1,
      }));
    } catch (error: any) {
      console.error('❌ Erro ao listar usuários GLPI:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Listar todos os grupos do GLPI
   */
  async getGroups(): Promise<{
    id: number;
    name: string;
    completename: string;
    level: number;
  }[]> {
    await this.ensureSession();

    try {
      const response = await this.client.get('/Group', {
        headers: this.getHeaders(),
        params: {
          range: '0-100',
        },
      });

      return (response.data || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        completename: g.completename || g.name,
        level: g.level || 0,
      }));
    } catch (error: any) {
      console.error('❌ Erro ao listar grupos GLPI:', error.response?.data || error.message);
      return [];
    }
  }
}
