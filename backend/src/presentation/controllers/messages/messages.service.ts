/**
 * Messages Service
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { GlpiService } from '../../../infrastructure/external/glpi.service';
import { RabbitMQService } from '../../../infrastructure/messaging/rabbitmq.service';
import { Direction, MessageType } from '@prisma/client';

interface CreateMessageDto {
  ticketId: string;
  content: string;
  type?: MessageType;
  direction: Direction;
  senderId?: string;
  waMessageId?: string;
}

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private glpi: GlpiService,
    private rabbitmq: RabbitMQService,
  ) {}

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
      },
      include: {
        sender: { select: { id: true, name: true } },
      },
    });

    // Se for OUTGOING e tiver senderId (técnico), enviar via WhatsApp
    if (dto.direction === 'OUTGOING' && dto.senderId) {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: dto.ticketId },
      });

      if (ticket) {
        // Enviar via RabbitMQ
        await this.rabbitmq.publishOutgoingMessage({
          to: ticket.phoneNumber,
          text: dto.content,
          ticketId: dto.ticketId,
        });

        // Adicionar followup no GLPI
        if (ticket.glpiId) {
          await this.glpi.addFollowup(ticket.glpiId, {
            content: `[${message.sender?.name || 'Sistema'}] ${dto.content}`,
          });
        }
      }
    }

    // Notificar via Socket.IO
    await this.rabbitmq.publishNotification({
      type: 'new_message',
      ticketId: dto.ticketId,
      payload: message,
    });

    return message;
  }

  async createFromWhatsApp(
    ticketId: string,
    content: string,
    waMessageId: string,
  ) {
    return this.create({
      ticketId,
      content,
      direction: 'INCOMING',
      waMessageId,
    });
  }

  async createFromTechnician(
    ticketId: string,
    content: string,
    senderId: string,
  ) {
    return this.create({
      ticketId,
      content,
      direction: 'OUTGOING',
      senderId,
    });
  }
}
