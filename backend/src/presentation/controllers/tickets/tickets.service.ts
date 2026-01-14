/**
 * Tickets Service
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { GlpiService } from '../../../infrastructure/external/glpi.service';
import { RabbitMQService } from '../../../infrastructure/messaging/rabbitmq.service';
import { TicketStatus, Priority } from '@prisma/client';

interface CreateTicketDto {
  title: string;
  description: string;
  phoneNumber: string;
  customerName?: string;
  sector?: string;
  category?: string;
  priority?: Priority;
}

interface AssignTicketDto {
  userId: string;
}

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private glpi: GlpiService,
    private rabbitmq: RabbitMQService,
  ) {}

  async findAll(filters?: {
    status?: TicketStatus;
    assignedToId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;

    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.assignedToId) where.assignedToId = filters.assignedToId;

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' },
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

  async findById(id: string) {
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
        status: 'NEW',
      },
    });

    // Criar no GLPI (async via RabbitMQ para não bloquear)
    await this.rabbitmq.publishCreateTicket({
      phoneNumber: dto.phoneNumber,
      title: dto.title,
      description: dto.description,
      category: dto.category,
      sector: dto.sector,
    });

    // Notificar painel
    await this.rabbitmq.publishNotification({
      type: 'ticket_created',
      ticketId: ticket.id,
      payload: ticket,
    });

    return ticket;
  }

  async assign(id: string, dto: AssignTicketDto) {
    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        assignedToId: dto.userId,
        status: 'ASSIGNED',
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    // Notificar
    await this.rabbitmq.publishNotification({
      type: 'ticket_assigned',
      ticketId: id,
      userId: dto.userId,
      payload: ticket,
    });

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

    // Se tiver GLPI ID, atualizar lá também
    if (ticket.glpiId) {
      try {
        const glpiStatus = this.mapStatusToGlpi(status);
        await this.glpi.updateTicketStatus(ticket.glpiId, glpiStatus);
      } catch (error: any) {
        console.warn('⚠️ GLPI status update falhou:', error.message);
      }
    }

    return ticket;
  }

  async close(id: string) {
    return this.updateStatus(id, 'CLOSED');
  }

  async linkToGlpi(id: string, glpiId: number) {
    return this.prisma.ticket.update({
      where: { id },
      data: { glpiId },
    });
  }

  private mapStatusToGlpi(status: TicketStatus): number {
    const map: Record<TicketStatus, number> = {
      NEW: 1,
      ASSIGNED: 2,
      IN_PROGRESS: 2,
      WAITING_CLIENT: 4,
      RESOLVED: 5,
      CLOSED: 6,
    };
    return map[status] || 1;
  }
}
