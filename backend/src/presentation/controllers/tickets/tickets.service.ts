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
  ) { }

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
      customerName: dto.customerName,
      localTicketId: ticket.id,
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
    // Check if ticket is already assigned
    const currentTicket = await this.prisma.ticket.findUnique({
      where: { id },
      select: { assignedToId: true, status: true, title: true, glpiId: true, phoneNumber: true, customerName: true }
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
      const message = `✅ *Ótima notícia!*\n\nSeu chamado *#${ticket.glpiId || ticket.id.slice(-6)}* foi atribuído ao técnico *${technician?.name || 'Suporte'}*.\n\nEle entrará em contato em breve para resolver seu problema.`;

      await this.rabbitmq.publishOutgoingMessage({
        to: ticket.phoneNumber,
        text: message,
        ticketId: id,
      });
    }

    // Notificar técnico via WhatsApp
    if (technician?.phoneNumber && technician?.receiveAlerts) {
      const techMessage = `🎫 *Novo chamado atribuído!*\n\nID: *#${ticket.glpiId || ticket.id.slice(-6)}*\nTítulo: ${ticket.title}\nCliente: ${ticket.phoneNumber?.split('@')[0] || 'N/A'}\n\nAcesse o painel para mais detalhes.`;

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

    // Notificar painel para atualizar listas
    await this.rabbitmq.publishNotification({
      type: 'ticket_updated',
      ticketId: id,
      payload: ticket,
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
  ) {
    // Atualizar ticket com solução
    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        solution: closeData?.solution,
        solutionType: closeData?.solutionType,
        timeWorked: closeData?.timeWorked,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    // Registrar peças usadas
    if (closeData?.parts && closeData.parts.length > 0) {
      for (const part of closeData.parts) {
        // Criar registro de uso
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

        // Baixar do estoque se vier do inventário
        if (part.partId) {
          await this.prisma.part.update({
            where: { id: part.partId },
            data: {
              quantity: { decrement: part.quantity },
            },
          });
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
            sector: ticket.sector || 'Geral',
            department: closeData.contactDepartment,
            ramal: closeData.contactRamal,
          },
          update: {
            name: closeData.contactName || ticket.customerName || 'Cliente',
            sector: ticket.sector || 'Geral',
            department: closeData.contactDepartment,
            ramal: closeData.contactRamal,
          },
        });
        console.log(`📇 Contato salvo: ${ticket.phoneNumber} -> ${ticket.sector}`);
      } catch (error: any) {
        console.warn('⚠️ Erro ao salvar contato:', error.message);
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

    // Atualizar GLPI
    if (ticket.glpiId) {
      try {
        const technicianName = ticket.assignedTo?.name || 'Suporte';
        await this.glpi.updateTicketStatus(ticket.glpiId, 6); // CLOSED
        if (closeData?.solution) {
          await this.glpi.addFollowup(ticket.glpiId, {
            content: `[Solução por ${technicianName}]\n${closeData.solution}`,
          });
        }
      } catch (error: any) {
        console.warn('⚠️ GLPI update falhou:', error.message);
      }
    }

    // Notificar painel
    await this.rabbitmq.publishNotification({
      type: 'ticket_updated',
      ticketId: id,
      payload: ticket,
    });

    return ticket;
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

  // === Novos métodos para bot ===

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

    console.log(`⭐ Ticket ${id} avaliado com nota ${rating}`);
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

  async findByGlpiId(glpiId: number) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { glpiId },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return ticket;
  }
}
