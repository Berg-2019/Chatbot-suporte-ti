/**
 * Messages Service
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RabbitMQService } from '../../../infrastructure/messaging/rabbitmq.service';
import { AutomationEngineService } from '../../../infrastructure/services/automation-engine.service';
import { SlaService } from '../sla/sla.service';
import { Direction, MessageType } from '@prisma/client';
import { redactName } from '../../../infrastructure/logger/redact';

interface CreateMessageDto {
  ticketId: string;
  content: string;
  type?: MessageType;
  direction: Direction;
  senderId?: string;
  waMessageId?: string;
  isInternal?: boolean;
  mentions?: string[];
  mediaUrl?: string;
  fileName?: string;
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private prisma: PrismaService,
    private rabbitmq: RabbitMQService,
    private automationEngine: AutomationEngineService,
    private slaService: SlaService,
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
        mediaUrl: dto.mediaUrl ?? null,
        fileName: dto.fileName ?? null,
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
          to: ticket.phoneNumber ?? '',
          text: formattedMessage,
          ticketId: dto.ticketId,
        });
      }

      // 💬 Marcar primeira resposta SLA (técnico respondeu ao cliente pela 1ª vez)
      await this.slaService.markFirstResponse(dto.ticketId);
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

    // 💬 Notificar usuários mencionados (@mentions)
    if (dto.mentions && dto.mentions.length > 0) {
      await this.notifyMentionedUsers(message.id, dto.ticketId, dto.mentions, dto.senderId, dto.content);
    }

    return message;
  }

  /**
   * Notificar usuários mencionados em uma mensagem
   */
  private async notifyMentionedUsers(
    messageId: string,
    ticketId: string,
    mentions: string[],
    senderId: string | undefined,
    content: string,
  ): Promise<void> {
    try {
      // Buscar informações do ticket e sender
      const [ticket, sender] = await Promise.all([
        this.prisma.ticket.findUnique({
          where: { id: ticketId },
          select: { id: true, title: true },
        }),
        senderId
          ? this.prisma.user.findUnique({
              where: { id: senderId },
              select: { id: true, name: true },
            })
          : null,
      ]);

      if (!ticket) return;

      // Buscar usuários mencionados que têm phoneNumber e receiveAlerts
      const mentionedUsers = await this.prisma.user.findMany({
        where: {
          id: { in: mentions },
          phoneNumber: { not: null },
          receiveAlerts: true,
        },
        select: {
          id: true,
          name: true,
          phoneNumber: true,
        },
      });

      // Enviar notificação para cada usuário mencionado
      for (const user of mentionedUsers) {
        const senderName = sender?.name || 'Alguém';
        const ticketRef = `#${ticket.id.slice(-6)}`;

        // Truncar conteúdo se muito longo
        const truncatedContent = content.length > 100
          ? content.substring(0, 100) + '...'
          : content;

        const notificationMessage = `💬 *Você foi mencionado!*\n\n*${senderName}* mencionou você no ticket *${ticketRef}*:\n\n"${truncatedContent}"\n\n_Acesse o painel para ver a mensagem completa._`;

        await this.rabbitmq.publishOutgoingMessage({
          to: user.phoneNumber!.includes('@')
            ? user.phoneNumber!
            : `${user.phoneNumber}@s.whatsapp.net`,
          text: notificationMessage,
          ticketId,
        });

        this.logger.debug(`💬 Notificação de @mention enviada para uid:${user.id.slice(0, 8)}`);
      }

      // Notificar via Socket.IO também (para notificações no painel)
      await this.rabbitmq.publishNotification({
        type: 'user_mentioned',
        ticketId,
        payload: {
          messageId,
          mentions,
          sender: sender?.name,
          ticketRef: ticket.id,
        },
      });
    } catch (error: any) {
      this.logger.error('⚠️ Erro ao notificar usuários mencionados', error.message);
      // Não bloqueia a criação da mensagem se notificação falhar
    }
  }

  async createFromWhatsApp(
    ticketId: string,
    content: string,
    waMessageId: string | undefined,
    type: MessageType = 'TEXT',
    mediaUrl?: string,
    fileName?: string,
  ) {
    // Evitar duplicações se tiver ID válido
    if (waMessageId && waMessageId !== 'UNKNOWN_WA_ID') {
      const existing = await this.prisma.message.findFirst({
        where: { waMessageId },
      });

      if (existing) {
        this.logger.debug(`⚠️ Mensagem duplicada ignorada: ${waMessageId}`);
        return { message: existing, isNew: false };
      }
    }

    const message = await this.create({
      ticketId,
      content,
      direction: 'INCOMING',
      waMessageId,
      type,
      mediaUrl,
      fileName,
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
