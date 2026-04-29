/**
 * Hermes Service
 *
 * Camada de serviço que encapsula a lógica de negócio dos endpoints do Hermes Agent.
 * Separa responsabilidades do controller, seguindo Clean Architecture.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AlertService } from '../../../infrastructure/services/alert.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import {
  CreateHermesTicketDto,
  EscalateDto,
  CreateHermesReservationDto,
} from './dto';

@Injectable()
export class HermesService {
  private readonly logger = new Logger(HermesService.name);

  constructor(
    private prisma: PrismaService,
    private alertService: AlertService,
    private redis: RedisService,
  ) {}

  // ============================================
  // TICKETS
  // ============================================

  /**
   * Cria um ticket originado pelo Hermes Agent.
   */
  async createTicket(dto: CreateHermesTicketDto) {
    this.logger.log(`🤖 Hermes criando ticket: "${dto.title}" | Telefone: ${dto.phone}`);

    const ticket = await this.prisma.ticket.create({
      data: {
        title: dto.title,
        description: `[Via Hermes] ${dto.description}`,
        phoneNumber: dto.phone,
        customerName: dto.requesterName || 'Via Hermes',
        sector: dto.sector || 'TI',
        category: dto.area === 'ELECTRIC' ? 'Elétrica' : 'Incidente',
        priority: 'NORMAL',
        status: 'NEW',
        type: 'SUPPORT',
      },
    });

    this.logger.log(`✅ Ticket criado: ${ticket.id} (${dto.area})`);

    // Notificar equipe sobre novo chamado (completamente assíncrono, não bloqueia resposta)
    setImmediate(() => {
      this.alertService.sendAlertToLevel('N1', {
        ticketId: ticket.id,
        type: 'NEW_TICKET',
        title: '🤖 Novo Chamado (Hermes)',
        message: `Chamado #${ticket.id.slice(0, 8).toUpperCase()}: ${dto.title}\nCliente: ${dto.requesterName || 'N/A'}\nÁrea: ${dto.area}\nTelefone: ${dto.phone}`,
        priority: 'NORMAL',
      }).catch(err => this.logger.warn(`⚠️ Falha ao enviar alerta: ${err.message}`));
    });

    return {
      ticket_id: ticket.id,
      ticket_number: ticket.id.slice(0, 8).toUpperCase(),
      status: ticket.status,
      area: dto.area,
      estimated_response: this.getEstimatedResponse('NORMAL'),
      message: 'Ticket criado com sucesso via Hermes',
    };
  }

  /**
   * Busca um ticket por ID.
   */
  async getTicketById(id: string) {
    const cleanId = id.replace('#', '').trim();
    this.logger.log(`🔍 Hermes buscando ticket: ${cleanId}`);

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: cleanId },
      include: {
        assignedTo: { select: { id: true, name: true } },
        messages: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            content: true,
            direction: true,
            createdAt: true,
          },
        },
      },
    });

    if (!ticket) {
      return { found: false, error: 'Ticket não encontrado' };
    }

    return {
      found: true,
      ticket_id: ticket.id,
      ticket_number: ticket.id.slice(0, 8).toUpperCase(),
      status: ticket.status,
      status_label: this.getStatusLabel(ticket.status),
      title: ticket.title,
      description: ticket.description,
      area: ticket.category === 'Elétrica' ? 'ELECTRIC' : 'TI',
      sector: ticket.sector,
      location: ticket.location,
      requesterName: ticket.customerName,
      phone: ticket.phoneNumber,
      assignedTo: ticket.assignedTo
        ? { id: ticket.assignedTo.id, name: ticket.assignedTo.name }
        : null,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      recentMessages: ticket.messages.map(m => ({
        content: m.content?.substring(0, 200),
        direction: m.direction,
        date: m.createdAt,
      })),
    };
  }

  /**
   * Busca tickets por número de telefone.
   */
  async getTicketsByPhone(phone: string) {
    const cleanPhone = phone.replace(/\D/g, '');
    this.logger.log(`🔍 Hermes buscando tickets do telefone: ${cleanPhone}`);

    const tickets = await this.prisma.ticket.findMany({
      where: { phoneNumber: { contains: cleanPhone } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    const activeTickets = tickets.filter(
      t => !['RESOLVED', 'CLOSED'].includes(t.status),
    );

    return {
      phone: cleanPhone,
      total: tickets.length,
      active_count: activeTickets.length,
      has_active_ticket: activeTickets.length > 0,
      active_ticket: activeTickets.length > 0
        ? {
            ticket_id: activeTickets[0].id,
            ticket_number: activeTickets[0].id.slice(0, 8).toUpperCase(),
            status: activeTickets[0].status,
            status_label: this.getStatusLabel(activeTickets[0].status),
            title: activeTickets[0].title,
            createdAt: activeTickets[0].createdAt,
            assignedTo: activeTickets[0].assignedTo?.name || null,
          }
        : null,
      recent_tickets: tickets.slice(0, 5).map(t => ({
        ticket_id: t.id,
        ticket_number: t.id.slice(0, 8).toUpperCase(),
        status: t.status,
        status_label: this.getStatusLabel(t.status),
        title: t.title,
        createdAt: t.createdAt,
      })),
    };
  }

  // ============================================
  // FAQ
  // ============================================

  /**
   * Busca na base de FAQ.
   */
  async searchFaq(query: string, category?: string) {
    if (!query || query.trim().length < 2) {
      return { results: [], total: 0, query: query || '' };
    }

    this.logger.log(`📚 Hermes buscando FAQ: "${query}" (categoria: ${category || 'todas'})`);

    const results = await this.prisma.faq.findMany({
      where: {
        active: true,
        OR: [
          { question: { contains: query, mode: 'insensitive' } },
          { answer: { contains: query, mode: 'insensitive' } },
          { keywords: { contains: query, mode: 'insensitive' } },
        ],
        ...(category ? { category } : {}),
      },
      take: 5,
      orderBy: [
        { helpful: 'desc' },
        { views: 'desc' },
      ],
    });

    // Incrementar contagem de visualizações
    if (results.length > 0) {
      await this.prisma.faq.updateMany({
        where: { id: { in: results.map(r => r.id) } },
        data: { views: { increment: 1 } },
      });
    }

    return {
      results: results.map(f => ({
        id: f.id,
        title: f.question,
        content: f.answer,
        category: f.category,
        tags: f.keywords?.split(',').map(k => k.trim()).filter(Boolean) || [],
        helpful_count: f.helpful || 0,
      })),
      total: results.length,
      query,
    };
  }

  /**
   * Marca um FAQ como útil ou não.
   */
  async markFaqHelpful(id: string, helpful: boolean) {
    const faq = await this.prisma.faq.findUnique({ where: { id } });
    if (!faq) {
      return { success: false, error: 'FAQ não encontrada' };
    }

    await this.prisma.faq.update({
      where: { id },
      data: { helpful: Math.max(0, faq.helpful + (helpful ? 1 : -1)) },
    });

    this.logger.log(`${helpful ? '👍' : '👎'} FAQ "${faq.question.substring(0, 40)}..." marcada como ${helpful ? 'útil' : 'não útil'}`);
    return { success: true };
  }

  // ============================================
  // ESTOQUE / RESERVAS
  // ============================================

  /**
   * Verifica disponibilidade de equipamentos.
   */
  async checkStock(stockType?: string) {
    this.logger.log(`📦 Hermes verificando estoque: ${stockType || 'todos'}`);

    const items = await this.prisma.stockItem.findMany({
      where: {
        ...(stockType ? { stockType: stockType as any } : {}),
      },
      select: {
        id: true,
        name: true,
        stockType: true,
        assetStatus: true,
        location: true,
        assetTag: true,
      },
    });

    const available = items.filter(i => i.assetStatus === 'AVAILABLE');
    const inUse = items.filter(i => i.assetStatus === 'IN_USE');

    return {
      stock_type: stockType || 'ALL',
      total: items.length,
      available_count: available.length,
      in_use_count: inUse.length,
      has_available: available.length > 0,
      items: available.slice(0, 10).map(i => ({
        id: i.id,
        name: i.name,
        type: i.stockType,
        location: i.location || 'TI',
        asset_tag: i.assetTag,
      })),
    };
  }

  /**
   * Cria uma reserva de equipamento.
   */
  async createReservation(dto: CreateHermesReservationDto) {
    this.logger.log(`📋 Hermes criando reserva: item ${dto.stockItemId} | ${dto.requesterName}`);

    // Verificar se o item existe e está disponível
    const item = await this.prisma.stockItem.findUnique({
      where: { id: dto.stockItemId },
    });

    if (!item) {
      return { success: false, error: 'Item de estoque não encontrado' };
    }

    if (item.assetStatus !== 'AVAILABLE') {
      return {
        success: false,
        error: `Equipamento "${item.name}" não está disponível (status: ${item.assetStatus})`,
      };
    }

    const reservation = await this.prisma.reservation.create({
      data: {
        stockItemId: dto.stockItemId,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        notes: dto.notes,
        userPhone: dto.phone,
        userName: dto.requesterName,
        userSector: dto.requesterSector,
        status: 'PENDING',
      },
    });

    this.logger.log(`✅ Reserva criada: ${reservation.id}`);

    return {
      success: true,
      reservation_id: reservation.id,
      reservation_number: reservation.id.slice(0, 8).toUpperCase(),
      status: 'PENDING',
      item_name: item.name,
      start_time: dto.startTime,
      end_time: dto.endTime,
      message: 'Reserva criada, aguardando aprovação da equipe de TI',
    };
  }

  // ============================================
  // AGENTES / ESCALAÇÃO
  // ============================================

  /**
   * Retorna status dos agentes disponíveis.
   */
  async getAgentsStatus() {
    const agents = await this.prisma.user.findMany({
      where: { role: { in: ['AGENT', 'ADMIN'] }, active: true },
      select: {
        id: true,
        name: true,
        status: true,
        sector: true,
      },
    });

    const online = agents.filter(a => a.status === 'ONLINE');
    const busy = agents.filter(a => a.status === 'BUSY' || a.status === 'IN_SERVICE');

    // Contar tickets na fila (sem técnico atribuído)
    const queueCount = await this.prisma.ticket.count({
      where: {
        status: { in: ['NEW', 'ASSIGNED'] },
        assignedToId: null,
      },
    });

    return {
      agents_total: agents.length,
      agents_online: online.length,
      agents_busy: busy.length,
      agents_available: Math.max(0, online.length - busy.length),
      queue_length: queueCount,
      avg_response_time: online.length > 0 ? '5 minutos' : '30 minutos (sem agentes online)',
      estimated_wait: this.calculateEstimatedWait(online.length, busy.length, queueCount),
      agents: online.map(a => ({
        name: a.name,
        status: a.status,
        sector: a.sector,
      })),
    };
  }

  /**
   * Escala uma conversa para atendimento humano.
   */
  async escalateToAgent(dto: EscalateDto) {
    this.logger.log(`📞 Hermes escalando conversa: ${dto.phone} | Urgência: ${dto.urgency}`);

    // Determinar nível de escalação
    const level = dto.urgency === 'CRITICAL' ? 'N3' : dto.urgency === 'HIGH' ? 'N2' : 'N1';

    // Enviar alerta (completamente assíncrono, não bloqueia resposta)
    setImmediate(() => {
      this.alertService.sendAlertToLevel(level, {
        ticketId: dto.ticketId,
        type: 'ESCALATED',
        title: `${this.getUrgencyEmoji(dto.urgency)} Escalação Hermes`,
        message: [
          `Problema: ${dto.problemSummary}`,
          `Área: ${dto.area}`,
          `Telefone: ${dto.phone}`,
          dto.ticketId ? `Ticket: #${dto.ticketId.slice(0, 8).toUpperCase()}` : null,
          dto.attemptedSolutions?.length
            ? `Soluções tentadas: ${dto.attemptedSolutions.join(', ')}`
            : null,
        ].filter(Boolean).join('\n'),
        priority: dto.urgency === 'CRITICAL' ? 'URGENT' : dto.urgency === 'HIGH' ? 'HIGH' : 'NORMAL',
      }).catch(err => this.logger.error(`❌ Falha ao enviar alerta de escalação: ${err.message}`));
    });

    // Salvar histórico da conversa se fornecido
    if (dto.conversationHistory?.length && dto.ticketId) {
      try {
        for (const msg of dto.conversationHistory.slice(-10)) {
          await this.prisma.message.create({
            data: {
              ticketId: dto.ticketId,
              content: msg.content,
              direction: msg.role === 'user' ? 'INCOMING' : 'OUTGOING',
              type: 'TEXT',
              isInternal: true,
            },
          });
        }
        this.logger.log(`💾 ${dto.conversationHistory.length} mensagens de contexto salvas`);
      } catch (msgError) {
        this.logger.warn(`⚠️ Falha ao salvar histórico: ${msgError.message}`);
      }
    }

    // Obter status atual dos agentes
    const agentStatus = await this.getAgentsStatus();

    return {
      escalation_id: `esc_${Date.now()}`,
      ticket_id: dto.ticketId || null,
      ticket_number: dto.ticketId ? dto.ticketId.slice(0, 8).toUpperCase() : null,
      status: agentStatus.agents_available > 0 ? 'AGENT_AVAILABLE' : 'QUEUED',
      estimated_response_time: dto.urgency === 'CRITICAL'
        ? '2 minutos'
        : agentStatus.agents_available > 0
          ? '5 minutos'
          : agentStatus.estimated_wait,
      position_in_queue: agentStatus.queue_length + 1,
      agents_online: agentStatus.agents_online,
      agents_available: agentStatus.agents_available,
      message: agentStatus.agents_available > 0
        ? 'Um agente está disponível e será notificado.'
        : 'Escalação registrada. Você está na fila de atendimento.',
    };
  }

  // ============================================
  // WEBHOOK / CALLBACK
  // ============================================

  /**
   * Recebe callbacks/webhooks do Hermes Agent.
   * Usado para sincronizar eventos (conversa encerrada, feedback, etc.)
   */
  async handleWebhook(event: string, payload: any) {
    // Idempotency check for WhatsApp messages
    if (event === 'whatsapp.message' && payload.wa_message_id) {
      const alreadyProcessed = await this.redis.tryMarkMessageProcessed(payload.wa_message_id);
      if (!alreadyProcessed) {
        this.logger.log(`⏭️ Mensagem WhatsApp ${payload.wa_message_id} já processada, ignorando`);
        return { received: true, event, skipped: true, reason: 'duplicate_message' };
      }
      this.logger.log(`🔔 Nova mensagem WhatsApp: ${payload.wa_message_id}`);
    }

    this.logger.log(`🔔 Hermes webhook: ${event}`);

    switch (event) {
      case 'conversation.started':
        this.logger.log(`💬 Nova conversa Hermes: ${payload.phone}`);
        break;

      case 'conversation.ended':
        this.logger.log(`✅ Conversa Hermes encerrada: ${payload.phone}`);
        break;

      case 'ticket.resolved_by_ai':
        this.logger.log(`🤖 Ticket resolvido por IA: ${payload.ticketId}`);
        // Atualizar status do ticket se existir
        if (payload.ticketId) {
          try {
            await this.prisma.ticket.update({
              where: { id: payload.ticketId },
              data: {
                status: 'RESOLVED',
                solution: payload.resolution || 'Resolvido automaticamente pelo Hermes Agent',
              },
            });
          } catch (e) {
            this.logger.warn(`⚠️ Ticket ${payload.ticketId} não encontrado para atualização`);
          }
        }
        break;

      case 'feedback':
        this.logger.log(`📊 Feedback Hermes: ${payload.helpful ? 'positivo' : 'negativo'}`);
        break;

      case 'whatsapp.message':
        // Processar mensagem WhatsApp - acionar Captain para auto-resolve
        if (payload.text && payload.phone) {
          this.handleWhatsAppMessage(payload).catch(err => {
            this.logger.error(`❌ Erro ao processar mensagem WhatsApp: ${err.message}`);
          });
        }
        break;

      default:
        this.logger.warn(`⚠️ Evento Hermes desconhecido: ${event}`);
    }

    return { received: true, event };
  }

  /**
   * Process incoming WhatsApp message through Captain for auto-resolution.
   */
  private async handleWhatsAppMessage(payload: { text: string; phone: string; name?: string }) {
    this.logger.log(`💬 Mensagem WhatsApp de ${payload.phone}: "${payload.text?.substring(0, 50)}..."`);

    // This is handled by the Captain service which is called separately
    // The webhook just acknowledges receipt
    // The actual auto-resolve happens via POST /api/hermes/auto-resolve
  }

  // ============================================
  // HELPERS
  // ============================================

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      NEW: 'Novo',
      OPEN: 'Aberto',
      IN_PROGRESS: 'Em Atendimento',
      PENDING: 'Pendente',
      RESOLVED: 'Resolvido',
      CLOSED: 'Fechado',
    };
    return labels[status] || status;
  }

  private getEstimatedResponse(priority: string): string {
    const estimates: Record<string, string> = {
      URGENT: 'Em até 2 horas',
      HIGH: 'Em até 4 horas',
      NORMAL: 'Em até 8 horas úteis',
      LOW: 'Em até 24 horas úteis',
    };
    return estimates[priority] || 'Em até 8 horas úteis';
  }

  private getUrgencyEmoji(urgency: string): string {
    const emojis: Record<string, string> = {
      CRITICAL: '🔴 CRÍTICO',
      HIGH: '🟠 URGENTE',
      MEDIUM: '🟡',
      LOW: '🟢',
    };
    return emojis[urgency] || '📞';
  }

  private calculateEstimatedWait(online: number, busy: number, queue: number): string {
    if (online === 0) return 'Sem agentes online. Previsão: próximo dia útil';
    const available = Math.max(1, online - busy);
    const waitMinutes = Math.ceil((queue + 1) / available) * 5;
    if (waitMinutes <= 5) return '5 minutos';
    if (waitMinutes <= 15) return `${waitMinutes} minutos`;
    return `Aproximadamente ${Math.ceil(waitMinutes / 10) * 10} minutos`;
  }
}
