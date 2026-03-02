/**
 * Messages Service
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { GlpiService } from '../../../infrastructure/external/glpi.service';
import { RabbitMQService } from '../../../infrastructure/messaging/rabbitmq.service';
import { AutomationEngineService } from '../../../infrastructure/services/automation-engine.service';
import { Direction, MessageType } from '@prisma/client';

interface CreateMessageDto {
  ticketId: string;
  content: string;
  type?: MessageType;
  direction: Direction;
  senderId?: string;
  waMessageId?: string;
  isInternal?: boolean;
  mentions?: string[];
}

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private glpi: GlpiService,
    private rabbitmq: RabbitMQService,
    private automationEngine: AutomationEngineService,
  ) { }

  async findByTicket(ticketId: string) {
    return this.prisma.message.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true } },
      },
    });
  }

  async create(dto: CreateMessageDto) {
    const message = await this.prisma.message.create({
      data: {
        ticketId: dto.ticketId,
        content: dto.content,
        type: dto.type || 'TEXT',
        direction: dto.direction,
        senderId: dto.senderId,
        waMessageId: dto.waMessageId,
        isInternal: dto.isInternal || false,
        mentions: dto.mentions || [],
      },
      include: {
        sender: { select: { id: true, name: true } },
      },
    }) as any;

    // Se for OUTGOING, tiver senderId (técnico), e NÃO for nota interna → enviar via WhatsApp
    if (dto.direction === 'OUTGOING' && dto.senderId && !dto.isInternal) {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: dto.ticketId },
      });

      if (ticket) {
        // Formatar mensagem com nome do técnico
        const technicianName = message.sender?.name || 'Suporte';
        const formattedMessage = `*${technicianName}:*\n${dto.content}`;

        // Enviar via RabbitMQ
        await this.rabbitmq.publishOutgoingMessage({
          to: ticket.phoneNumber,
          text: formattedMessage,
          ticketId: dto.ticketId,
        });

        // Adicionar followup no GLPI (não bloqueia se falhar)
        if (ticket.glpiId) {
          try {
            await this.glpi.addFollowup(ticket.glpiId, {
              content: `[${message.sender?.name || 'Sistema'}] ${dto.content}`,
            });
          } catch (glpiError: any) {
            console.warn('⚠️ GLPI followup falhou (não crítico):', glpiError.message);
          }
        }
      }
    }

    // Notificar via Socket.IO
    await this.rabbitmq.publishNotification({
      type: 'new_message',
      ticketId: dto.ticketId,
      payload: message,
    });

    // 🤖 Trigger automation: message_sent (apenas se for OUTGOING)
    if (dto.direction === 'OUTGOING') {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: dto.ticketId },
        select: {
          id: true,
          phoneNumber: true,
          assignedToId: true,
          priority: true,
          status: true,
        },
      });

      await this.automationEngine.processEvent('message_sent', {
        ticketId: dto.ticketId,
        messageId: message.id,
        message,
        content: dto.content,
        senderId: dto.senderId,
        isInternal: dto.isInternal || false,
        mentions: dto.mentions || [],
        ticket,
      });
    }

    return message;
  }

  async createFromWhatsApp(
    ticketId: string,
    content: string,
    waMessageId: string,
    type: MessageType = 'TEXT'
  ) {
    // Evitar duplicações se tiver ID válido
    if (waMessageId && waMessageId !== 'UNKNOWN_WA_ID') {
      const existing = await this.prisma.message.findFirst({
        where: { waMessageId },
      });

      if (existing) {
        console.log(`⚠️ Mensagem duplicada ignorada: ${waMessageId}`);
        return { message: existing, isNew: false };
      }
    }

    const message = await this.create({
      ticketId,
      content,
      direction: 'INCOMING',
      waMessageId,
      type,
    });

    // 🤖 Trigger automation: message_received
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        phoneNumber: true,
        customerName: true,
        assignedToId: true,
        priority: true,
        status: true,
        category: true,
        sector: true,
      },
    });

    await this.automationEngine.processEvent('message_received', {
      ticketId,
      messageId: message.id,
      message,
      content,
      waMessageId,
      type,
      ticket,
      phoneNumber: ticket?.phoneNumber,
      customerName: ticket?.customerName,
    });

    return { message, isNew: true };
  }

  async createFromTechnician(
    ticketId: string,
    content: string,
    senderId: string,
    isInternal: boolean = false,
    mentions: string[] = [],
  ) {
    return this.create({
      ticketId,
      content,
      direction: 'OUTGOING',
      senderId,
      isInternal,
      mentions,
    });
  }
}
