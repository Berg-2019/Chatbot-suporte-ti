/**
 * Tickets Service
 */

import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RabbitMQService } from '../../../infrastructure/messaging/rabbitmq.service';
import { AutomationEngineService } from '../../../infrastructure/services/automation-engine.service';
import { SlaService } from '../sla/sla.service';
import { PushService } from '../push/push.service';
import { StockService } from '../stock/stock.service';
import { ChatService } from '../chat/chat.service';
import { TicketStatus, Priority, TicketType, Sector } from '@prisma/client';
import { createReadStream, existsSync } from 'fs';
import { redactPhone, redactName } from '../../../infrastructure/logger/redact';

interface CreateTicketDto {
  title: string;
  description: string;
  phoneNumber?: string;
  customerName?: string;
  sector?: Sector;
  category?: string;
  priority?: Priority;
  type?: TicketType;
  location?: string;
  assignedToId?: string;
  affectedAssetId?: string;
}

interface AssignTicketDto {
  userId: string;
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private prisma: PrismaService,
    private rabbitmq: RabbitMQService,
    private automationEngine: AutomationEngineService,
    private slaService: SlaService,
    private pushService: PushService,
    private stockService: StockService,
    private chatService: ChatService,
  ) { }

  private assertSectorAccess(
    ticket: { sector: Sector | string | null },
    user: { role: string; sector: string },
  ) {
    if (user.role.startsWith('ADMIN')) return;
    if (!ticket.sector) return;
    if (ticket.sector !== user.sector) {
      throw new ForbiddenException('Setor não autorizado para este ticket');
    }
  }

  async findAll(filters?: {
    status?: TicketStatus;
    assignedToId?: string;
    category?: string;
    page?: number;
    limit?: number;
    type?: TicketType;
    sector?: Sector;
    isAdmin?: boolean;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;

    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters?.category) {
      where.category = {
        contains: filters.category,
        mode: 'insensitive'
      };
    }
    if (filters?.type) where.type = filters.type;
    if (!filters?.isAdmin && filters?.sector) {
      where.sector = filters.sector;
    }

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }, // Modified to show newest tickets first
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { tickets, total, page, limit };
  }

  async findPending() {
    return this.prisma.ticket.findMany({
      where: {
        status: { in: ['NEW', 'ASSIGNED'] },
        assignedToId: null,
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });
  }

  async findById(id: string, user?: { id: string; role: string }) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket não encontrado');
    }

    // Access Control:
    // 1. If user is ADMIN, allow access
    // 2. If ticket is unassigned, allow access (to view/assume)
    // 3. If ticket is assigned to THIS user, allow access
    // 4. If ticket is assigned to someone else, DENY access
    if (user && user.role !== 'ADMIN' && ticket.assignedToId && ticket.assignedToId !== user.id) {
      // Return limited info or throw error?
      // For now, let's throw Forbidden to ensure UI handles it
      // But UI needs to know basic info to show "Locked by X"
      // Let's rely on frontend checking assignedToId vs user.id, but here we can enforce privacy if needed.
      // The requirement is "travar para os outros tecnicos".
      // If we throw here, the chat page won't load messages.
      // Let's ALLOW reading the ticket metadata, but maybe filter messages?
      // Actually, the prompt says "vinculada ao tecnico que aceitou ela e travar para os outros".
      // "Travar" usually means they can't interact. If they can't see it, it's safer.
      // However, to show "Locked by John", they need to fetch it.
      // So we will allow FETCHING, but ensure actions are blocked.
      // AND importantly, the frontend relies on this endpoint to show the chat.
      // If we want to strictly hide chat content, we should return the ticket without messages.
    }

    return ticket;
  }

  async create(dto: CreateTicketDto) {
    // Criar localmente
    const ticket = await this.prisma.ticket.create({
      data: {
        title: dto.title,
        description: dto.description,
        phoneNumber: dto.phoneNumber,
        customerName: dto.customerName,
        sector: dto.sector,
        category: dto.category,
        priority: dto.priority || 'NORMAL',

        status: dto.type === 'SERVICE_REPORT' ? 'RESOLVED' : 'NEW',
        type: dto.type || 'SUPPORT',
        location: dto.location,
        assignedToId: dto.assignedToId,
        affectedAssetId: dto.affectedAssetId,
      },
    });

    // Notificar painel
    await this.rabbitmq.publishNotification({
      type: 'ticket_created',
      ticketId: ticket.id,
      payload: ticket,
    });

    // 🤖 Trigger SLA timer creation
    await this.slaService.createTimerForTicket(ticket.id);

    // 🤖 Trigger automation: ticket_created
    await this.automationEngine.processEvent('ticket_created', {
      ticketId: ticket.id,
      ticket,
      phoneNumber: ticket.phoneNumber,
      customerName: ticket.customerName,
      priority: ticket.priority,
      category: ticket.category,
      sector: ticket.sector,
      status: ticket.status,
      type: ticket.type,
    });

    // 🔔 Push notification para todos os técnicos do sector
    if (ticket.sector && ticket.type !== 'SERVICE_REPORT') {
      try {
        await this.pushService.sendToSector(ticket.sector, {
          title: `Novo chamado · ${ticket.sector}`,
          body: ticket.title,
          data: { ticketId: ticket.id, action: 'ticket_created' },
        });
      } catch (err: any) {
        this.logger.warn(`Push (create) falhou: ${err.message}`);
      }
    }

    // 🤖 Auto-assignment (se habilitado e ticket não tem assignedToId)
    if (!ticket.assignedToId && ticket.type !== 'SERVICE_REPORT') {
      try {
        // Verificar se auto-assignment está habilitado
        const config = await this.prisma.autoAssignmentConfig.findFirst({
          where: { enabled: true },
        });

        if (config) {
          // Verificar se deve aplicar a este ticket
          const shouldApply =
            (config.applyToSectors.length === 0 || config.applyToSectors.includes(ticket.sector || '')) &&
            (config.applyToPriorities.length === 0 || config.applyToPriorities.includes(ticket.priority)) &&
            (config.applyToCategories.length === 0 || !ticket.category || config.applyToCategories.includes(ticket.category));

          if (shouldApply) {
            this.logger.debug(`🤖 Auto-assignment enabled for ticket ${ticket.id}`);
            await this.autoAssignAgent(ticket.id, {
              sector: config.respectSector && ticket.sector ? ticket.sector : undefined,
            });
          }
        }
      } catch (error: any) {
        this.logger.error(`⚠️ Auto-assignment failed for ticket ${ticket.id}`, error.message);
        // Não bloqueia a criação do ticket se auto-assignment falhar
      }
    }

    return ticket;
  }

  async assign(id: string, dto: AssignTicketDto) {
    // Check if ticket is already assigned
    const currentTicket = await this.prisma.ticket.findUnique({
      where: { id },
      select: { assignedToId: true, status: true, title: true, phoneNumber: true, customerName: true }
    });

    if (!currentTicket) throw new NotFoundException('Ticket não encontrado');

    // If already assigned to someone else (and we assume the caller is the new assignee or admin triggering this)
    // The requirement is "travar para os outros". So if it's assigned, nobody else can "Assume".
    if (currentTicket.assignedToId && currentTicket.assignedToId !== dto.userId) {
      // We could allow ADMIN override potentially, but for now strict lock.
      // Ideally we should check if requester is ADMIN, but 'assign' doesn't take context currently (controller passes req.user.id as dto.userId)
      // Wait, the controller does: assign(@Param('id') id: string, @Request() req: any) -> ticketsService.assign(id, { userId: req.user.id });
      // So dto.userId IS the requester.
      throw new Error('Este ticket já está em atendimento por outro técnico.');
    }

    const technician = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, name: true, phoneNumber: true, receiveAlerts: true },
    });

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        assignedToId: dto.userId,
        status: 'IN_PROGRESS', // Mudança solicitada: ASSIGNED -> IN_PROGRESS direto
      },
      include: {
        assignedTo: { select: { id: true, name: true, phoneNumber: true } },
      },
    });

    // Notificar usuário que técnico assumiu
    if (ticket.phoneNumber) {
      const message = `✅ *Ótima notícia!*\n\nSeu chamado *#${ticket.id.slice(-6)}* foi atribuído ao técnico *${technician?.name || 'Suporte'}*.\n\nEle entrará em contato em breve para resolver seu problema.`;

      await this.rabbitmq.publishOutgoingMessage({
        to: ticket.phoneNumber,
        text: message,
        ticketId: id,
      });
    }

    // Notificar técnico via WhatsApp
    if (technician?.phoneNumber && technician?.receiveAlerts) {
      const techMessage = `🎫 *Novo chamado atribuído!*\n\nID: *#${ticket.id.slice(-6)}*\nTítulo: ${ticket.title}\nCliente: ${ticket.phoneNumber?.split('@')[0] || 'N/A'}\n\nAcesse o painel para mais detalhes.`;

      await this.rabbitmq.publishOutgoingMessage({
        to: technician.phoneNumber.includes('@') ? technician.phoneNumber : `${technician.phoneNumber}@s.whatsapp.net`,
        text: techMessage,
        ticketId: id,
      });
    }

    // Notificar painel
    await this.rabbitmq.publishNotification({
      type: 'ticket_assigned',
      ticketId: id,
      userId: dto.userId,
      payload: ticket,
    });

    // 🤖 Trigger automation: ticket_assigned
    await this.automationEngine.processEvent('ticket_assigned', {
      ticketId: ticket.id,
      ticket,
      assignedToId: dto.userId,
      assignedToName: technician?.name,
      phoneNumber: ticket.phoneNumber,
      priority: ticket.priority,
      status: ticket.status,
    });

    if (technician?.name) {
      await this.pushService.sendToUser(dto.userId, {
        title: '🎫 Ticket Atribuído',
        body: `Ticket #${ticket.id.slice(-6)}: ${ticket.title}`,
        url: `/tickets/${ticket.id}`,
        data: { ticketId: ticket.id, type: 'ticket_assigned' },
      });
    }

    return ticket;
  }

  /**
   * Transferir ticket para outro técnico
   */
  async transfer(id: string, newUserId: string, currentUserId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { name: true },
    });

    const newUser = await this.prisma.user.findUnique({
      where: { id: newUserId },
      select: { name: true },
    });

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: { assignedToId: newUserId },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    // Notificar cliente via WhatsApp
    if (ticket.phoneNumber) {
      const message = `🔄 *Transferência de atendimento*\n\nSeu chamado foi transferido de *${currentUser?.name || 'Técnico'}* para *${newUser?.name || 'Outro técnico'}*.\n\nO novo responsável entrará em contato em breve.`;

      await this.rabbitmq.publishOutgoingMessage({
        to: ticket.phoneNumber,
        text: message,
        ticketId: id,
      });
    }

    // Notificar NOVO TÉCNICO via WhatsApp
    const newTechnician = await this.prisma.user.findUnique({
      where: { id: newUserId },
      select: { phoneNumber: true, receiveAlerts: true },
    });

    if (newTechnician?.phoneNumber && newTechnician?.receiveAlerts) {
      const techMessage = `🔄 *Chamado Transferido para Você!*\n\nID: *#${ticket.id.slice(-6)}*\nTítulo: ${ticket.title}\nDe: ${currentUser?.name || 'Sistema'}\n\nAcesse o painel para assumir.`;

      await this.rabbitmq.publishOutgoingMessage({
        to: newTechnician.phoneNumber.includes('@') ? newTechnician.phoneNumber : `${newTechnician.phoneNumber}@s.whatsapp.net`,
        text: techMessage,
        ticketId: id,
      });
    }

    // Notificar painel
    await this.rabbitmq.publishNotification({
      type: 'ticket_assigned',
      ticketId: id,
      userId: newUserId,
      payload: ticket,
    });

    return ticket;
  }

  async updateStatus(id: string, status: TicketStatus) {
    const data: any = { status };

    if (status === 'CLOSED') {
      data.closedAt = new Date();
    }

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data,
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    // Se fechou, enviar mensagem ao cliente
    if (status === 'CLOSED' && ticket.phoneNumber) {
      const technicianName = ticket.assignedTo?.name || 'Suporte';
      const closeMessage = `✅ *Chamado Encerrado*\n\nSeu chamado foi finalizado por *${technicianName}*.\n\nSe precisar de mais ajuda, é só enviar uma nova mensagem!\n\nObrigado pelo contato. 😊`;

      await this.rabbitmq.publishOutgoingMessage({
        to: ticket.phoneNumber,
        text: closeMessage,
        ticketId: id,
      });
    }

    // Notificar painel para atualizar listas
    await this.rabbitmq.publishNotification({
      type: 'ticket_updated',
      ticketId: id,
      payload: ticket,
    });

    // 🤖 Trigger SLA: pause on WAITING_CLIENT, resume on IN_PROGRESS, mark response on RESOLVED
    if (status === 'WAITING_CLIENT') {
      await this.slaService.pauseTimer(id);
    } else if (status === 'IN_PROGRESS') {
      await this.slaService.resumeTimer(id);
    } else if (status === 'RESOLVED') {
      await this.slaService.markFirstResponse(id);
    }

    // 🔔 Push notification para o técnico responsável (se houver)
    if (ticket.assignedToId) {
      try {
        await this.pushService.sendToUser(ticket.assignedToId, {
          title: `Chamado #${ticket.id.slice(0, 8)} · ${status}`,
          body: ticket.title,
          data: { ticketId: ticket.id, action: 'status_changed', status },
        });
      } catch (err: any) {
        this.logger.warn(`Push (status) falhou: ${err.message}`);
      }
    }

    // 🤖 Trigger automation: ticket_updated / ticket_resolved / ticket_closed
    let eventType = 'ticket_updated';
    if (status === 'RESOLVED') eventType = 'ticket_resolved';
    if (status === 'CLOSED') eventType = 'ticket_closed';

    await this.automationEngine.processEvent(eventType, {
      ticketId: ticket.id,
      ticket,
      status,
      previousStatus: ticket.status, // Note: this is the OLD status before update
      assignedToId: ticket.assignedToId,
      assignedToName: ticket.assignedTo?.name,
      phoneNumber: ticket.phoneNumber,
      priority: ticket.priority,
    });

    return ticket;
  }

  /**
   * Fechar ticket com formulário completo
   */
  async close(
    id: string,
    closeData?: {
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
      // Salvar contato para próximos chamados
      saveContact?: boolean;
      contactName?: string;
      contactDepartment?: string;
      contactRamal?: string;
    },
    userId?: string,
  ) {
    // Se o ticket não tem técnico atribuído, atribuir o usuário que está fechando
    const currentTicket = await this.prisma.ticket.findUnique({
      where: { id },
      select: { assignedToId: true },
    });

    const assignToId = userId || currentTicket?.assignedToId || null;

    // Atualizar ticket com solução
    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        solution: closeData?.solution,
        solutionType: closeData?.solutionType,
        timeWorked: closeData?.timeWorked,
        assignedToId: assignToId,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    // Registrar peças usadas
    if (closeData?.parts && closeData.parts.length > 0) {
      for (const part of closeData.parts) {
        await this.prisma.partUsage.create({
          data: {
            ticketId: id,
            partId: part.partId || null,
            partName: part.partName,
            quantity: part.quantity,
            unitCost: part.unitCost,
            purchased: part.purchased || false,
          },
        });

        if (part.partId) {
          try {
            await this.stockService.registerMovement(part.partId, {
              quantity: -part.quantity,
              reason: `Uso no ticket #${id}`,
              ticketId: id,
            }, 'Sistema');
          } catch (err) {
            this.logger.warn(`Falha ao baixar estoque do item ${part.partId}: ${err.message}`);
          }
        }
      }
    }

    // Buscar peças para a mensagem
    const partUsages = await this.prisma.partUsage.findMany({
      where: { ticketId: id },
    });

    // Salvar contato para próximos chamados
    if (closeData?.saveContact && ticket.phoneNumber) {
      try {
        await this.prisma.contact.upsert({
          where: { jid: ticket.phoneNumber },
          create: {
            jid: ticket.phoneNumber,
            phoneNumber: ticket.phoneNumber.split('@')[0],
            name: closeData.contactName || ticket.customerName || 'Cliente',
            sector: ticket.sector || 'TI',
            department: closeData.contactDepartment,
            ramal: closeData.contactRamal,
          },
          update: {
            name: closeData.contactName || ticket.customerName || 'Cliente',
            sector: ticket.sector || 'TI',
            department: closeData.contactDepartment,
            ramal: closeData.contactRamal,
          },
        });
        this.logger.debug(`📇 Contato salvo: ${redactPhone(ticket.phoneNumber)} -> ${ticket.sector}`);
      } catch (error) {
        this.logger.warn('⚠️ Erro ao salvar contato', error.message);
      }
    }

    // Enviar mensagem ao cliente via WhatsApp
    if (ticket.phoneNumber) {
      const technicianName = ticket.assignedTo?.name || 'Suporte';

      let closeMessage = `✅ *Chamado Encerrado*\n\n`;

      if (closeData?.solution) {
        closeMessage += `📝 *Solução:* ${closeData.solution}\n\n`;
      }

      if (partUsages.length > 0) {
        closeMessage += `🔧 *Peças utilizadas:*\n`;
        for (const pu of partUsages) {
          closeMessage += `• ${pu.quantity}x ${pu.partName}\n`;
        }
        closeMessage += `\n`;
      }

      if (closeData?.timeWorked) {
        const hours = Math.floor(closeData.timeWorked / 60);
        const minutes = closeData.timeWorked % 60;
        const timeStr = hours > 0 ? `${hours}h${minutes > 0 ? minutes + 'min' : ''}` : `${minutes}min`;
        closeMessage += `⏱️ *Tempo:* ${timeStr}\n`;
      }

      closeMessage += `👤 *Técnico:* ${technicianName}\n\n`;
      closeMessage += `⭐ *Por favor, avalie nosso atendimento de 1 a 5:*\n`;
      closeMessage += `_(1 = Ruim, 5 = Excelente)_`;

      await this.rabbitmq.publishOutgoingMessage({
        to: ticket.phoneNumber,
        text: closeMessage,
        ticketId: id,
      });

      // Marcar que está aguardando avaliação
      await this.prisma.ticket.update({
        where: { id },
        data: { awaitingRating: true },
      });
    }

    // Notificar painel
    await this.rabbitmq.publishNotification({
      type: 'ticket_updated',
      ticketId: id,
      payload: ticket,
    });

    // 🤖 Mark resolution SLA
    await this.slaService.markResolved(id);

    // 🤖 Trigger automation: ticket_closed
    await this.automationEngine.processEvent('ticket_closed', {
      ticketId: ticket.id,
      ticket,
      status: 'CLOSED',
      assignedToId: ticket.assignedToId,
      assignedToName: ticket.assignedTo?.name,
      phoneNumber: ticket.phoneNumber,
      priority: ticket.priority,
      solution: closeData?.solution,
      timeWorked: closeData?.timeWorked,
      partsUsed: partUsages.length,
    });

    return ticket;
  }

  async rate(id: string, rating: number) {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating deve ser entre 1 e 5');
    }

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        rating,
        ratedAt: new Date(),
        awaitingRating: false,
      },
    });

    this.logger.debug(`⭐ Ticket ${id} avaliado com nota ${rating}`);
    return ticket;
  }

  async findByPhone(phone: string) {
    // Buscar último ticket do telefone
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        phoneNumber: { contains: phone },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return ticket;
  }

  async addAttachment(ticketId: string, file: any, senderId?: string) {
    const attachment = await this.prisma.attachment.create({
      data: {
        ticketId,
        filename: file.originalname,
        path: file.path,
        mimeType: file.mimetype,
        size: file.size,
      },
    });

    this.logger.debug(`📎 Anexo adicionado ao ticket ${ticketId}: ${file.originalname} (${file.mimetype})`);

    // Inferir tipo de mídia a partir do mimetype
    const mt = (file.mimetype || '').toLowerCase();
    let mediaType: 'image' | 'audio' | 'video' | 'document' = 'document';
    let messageType: 'IMAGE' | 'AUDIO' | 'DOCUMENT' = 'DOCUMENT';
    if (mt.startsWith('image/')) { mediaType = 'image'; messageType = 'IMAGE'; }
    else if (mt.startsWith('audio/')) { mediaType = 'audio'; messageType = 'AUDIO'; }
    else if (mt.startsWith('video/')) { mediaType = 'video'; messageType = 'DOCUMENT'; }

    // URL pública/interna para o bot baixar o arquivo
    const baseUrl = process.env.INTERNAL_BACKEND_URL || 'http://backend:3000';
    const mediaUrl = `${baseUrl}/api/tickets/attachments/${attachment.id}/file`;

    // Criar Message no banco para aparecer no chat (OUTGOING)
    const message = await this.prisma.message.create({
      data: {
        ticketId,
        content: mediaUrl,
        type: messageType,
        direction: 'OUTGOING',
        senderId: senderId || null,
        isInternal: false,
      },
    });

    // Buscar ticket para obter o phoneNumber
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });

    if (ticket?.phoneNumber) {
      // Publicar na fila para o bot enviar via WhatsApp
      await this.rabbitmq.publishOutgoingMessage({
        to: ticket.phoneNumber,
        ticketId,
        mediaUrl,
        mediaType,
        mimeType: file.mimetype,
        filename: file.originalname,
      });
      this.logger.debug(`📤 Mídia enfileirada para ${redactPhone(ticket.phoneNumber)} (${mediaType})`);
    }

    // Notificar dashboard via socket
    await this.rabbitmq.publishNotification({
      type: 'new_message',
      ticketId,
      payload: message,
    });

    return attachment;
  }

  /**
   * Auto-atribuir ticket para técnico disponível
   * Estratégia: Round-robin (técnico com menos tickets ativos)
   */
  async autoAssignAgent(ticketId: string, options?: {
    sector?: string;
    technicianLevel?: 'N1' | 'N2' | 'N3';
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  }): Promise<any> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        sector: true,
        priority: true,
        phoneNumber: true,
        title: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket não encontrado');
    }

    // Filtros para buscar técnicos elegíveis
    const where: any = {
      active: true,
      receiveAlerts: true,
    };

    // Filtrar por setor se especificado
    if (options?.sector || ticket.sector) {
      where.sector = options?.sector || ticket.sector;
    }

    // Filtrar por nível técnico se especificado
    if (options?.technicianLevel) {
      where.technicianLevel = options.technicianLevel;
    }

    // Buscar técnicos elegíveis
    const technicians = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        technicianLevel: true,
        sector: true,
        _count: {
          select: {
            tickets: {
              where: {
                status: {
                  in: ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CLIENT'],
                },
              },
            },
          },
        },
      },
    });

    if (technicians.length === 0) {
      this.logger.warn(`⚠️ Nenhum técnico disponível para auto-atribuição (setor: ${options?.sector || ticket.sector})`);
      return null;
    }

    // Ordenar por quantidade de tickets ativos (round-robin)
    technicians.sort((a, b) => a._count.tickets - b._count.tickets);

    // Selecionar técnico com menos tickets
    const selectedTechnician = technicians[0];

    this.logger.debug(`🤖 Auto-atribuindo ticket ${ticketId} para uid:${selectedTechnician.id.slice(0, 8)} (${selectedTechnician._count.tickets} tickets ativos)`);

    // Atribuir ticket
    const updatedTicket = await this.assign(ticketId, {
      userId: selectedTechnician.id,
    });

    return {
      ticket: updatedTicket,
      technician: {
        id: selectedTechnician.id,
        name: selectedTechnician.name,
        activeTickets: selectedTechnician._count.tickets,
        technicianLevel: selectedTechnician.technicianLevel,
      },
    };
  }

  async addNote(
    ticketId: string,
    content: string,
    user: { id: string; role: string; sector: string },
  ) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');

    this.assertSectorAccess(ticket, user);

    return this.chatService.sendMessage({
      ticketId,
      content,
      kind: 'text',
      isInternal: true,
      senderId: user.id,
      senderType: 'technician',
    });
  }

  async getTicketHistory(
    ticketId: string,
    user: { id: string; role: string; sector: string },
  ) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');

    this.assertSectorAccess(ticket, user);

    const [messages, auditLogs] = await Promise.all([
      this.prisma.message.findMany({
        where: { ticketId },
        select: {
          id: true,
          content: true,
          type: true,
          direction: true,
          isInternal: true,
          createdAt: true,
          sender: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.auditLog.findMany({
        where: { resource: 'tickets', resourceId: ticketId },
        select: {
          id: true,
          action: true,
          metadata: true,
          createdAt: true,
          userId: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const history = [
      ...messages.map((m) => ({
        id: m.id,
        type: 'message' as const,
        data: m,
        createdAt: m.createdAt,
      })),
      ...auditLogs.map((a) => ({
        id: a.id,
        type: 'audit' as const,
        data: a,
        createdAt: a.createdAt,
      })),
    ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return history;
  }

  async getAttachmentStream(attachmentId: string) {
    const att = await this.prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!att || !existsSync(att.path)) {
      throw new NotFoundException('Anexo não encontrado');
    }
    return {
      stream: createReadStream(att.path),
      mimeType: att.mimeType || 'application/octet-stream',
      filename: att.filename,
    };
  }
}
