import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RabbitMQService } from '../../../infrastructure/messaging/rabbitmq.service';
import { MessageType, Direction } from '@prisma/client';

const KIND_TO_TYPE: Record<string, MessageType> = {
  text: 'TEXT',
  image: 'IMAGE',
  video: 'VIDEO',
  audio: 'AUDIO',
  file: 'DOCUMENT',
};

interface SendMessageInput {
  ticketId: string;
  content: string;
  kind: 'text' | 'image' | 'video' | 'audio' | 'file';
  file?: Express.Multer.File;
  duration?: number;
  isInternal: boolean;
  senderId: string;
  senderType: 'user' | 'technician' | 'bot';
}

@Injectable()
export class ChatService {
    constructor(
        private prisma: PrismaService,
        private rabbitmq: RabbitMQService,
    ) { }

    async getConversations(sector?: string) {
        const tickets = await this.prisma.ticket.findMany({
            where: sector ? { sector: sector as any } : undefined,
            orderBy: { updatedAt: 'desc' },
            take: 50,
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: {
                        sender: { select: { name: true, role: true } },
                    },
                },
                assignedTo: { select: { name: true } },
            },
        });

        return tickets.map(ticket => {
            const lastMessage = ticket.messages[0];
            return {
                id: ticket.id,
                ticketId: ticket.id,
                ticketNumber: `#${ticket.id.slice(0, 8).toUpperCase()}`,
                ticketTitle: ticket.title,
                userName: ticket.customerName || 'Cliente',
                lastMessage: lastMessage?.content || ticket.description,
                lastMessageAt: lastMessage?.createdAt || ticket.createdAt,
                unreadCount: 0,
                status: ticket.status.toLowerCase(),
                level: ticket.priority || 'N1',
                lastSenderType: lastMessage?.direction === 'INCOMING' ? 'user' : 'technician',
            };
        });
    }

    async getMessages(ticketId: string, viewerUserId?: string) {
        const rows = await this.prisma.message.findMany({
            where: { ticketId },
            orderBy: { createdAt: 'asc' },
            include: {
                sender: { select: { id: true, name: true, role: true } },
                reads: true,
            },
        });

        return rows.map(m => {
            const msg = m as any;
            return {
                ...this.normalize(msg),
                status: viewerUserId ? this.deriveStatus(msg, viewerUserId) : 'sent' as const,
            };
        });
    }

    private deriveStatus(m: any, viewerUserId: string): 'sent' | 'read' {
        if (m.senderId === viewerUserId) {
            return m.reads && m.reads.length > 0 ? 'read' : 'sent';
        }
        return 'sent';
    }

    async sendMessage(input: SendMessageInput) {
        const direction = input.senderType === 'user' ? 'INCOMING' : 'OUTGOING';
        const type = KIND_TO_TYPE[input.kind];

        const m = await this.prisma.message.create({
            data: {
                ticketId: input.ticketId,
                content: input.content,
                type,
                direction,
                senderId: input.senderId,
                isInternal: input.isInternal,
                mediaUrl: input.file ? `/uploads/messages/${input.file.filename}` : null,
                fileName: input.file?.originalname ?? null,
                fileSize: input.file?.size ?? null,
                duration: input.duration ?? null,
            },
            include: {
                sender: { select: { id: true, name: true, role: true } },
            },
        });

        const msg = m as any;

        if (direction === 'OUTGOING' && !input.isInternal) {
            const ticket = await this.prisma.ticket.findUnique({
                where: { id: input.ticketId },
                select: { phoneNumber: true },
            });

            if (ticket?.phoneNumber) {
                const mediaTypeMap: Record<string, 'image' | 'audio' | 'video' | 'document'> = {
                    IMAGE: 'image', AUDIO: 'audio', VIDEO: 'video', DOCUMENT: 'document',
                };

                await this.rabbitmq.publishOutgoingMessage({
                    to: ticket.phoneNumber,
                    text: input.content,
                    ticketId: input.ticketId,
                    messageId: msg.id,
                    direction,
                    content: input.content,
                    mediaUrl: msg.mediaUrl || undefined,
                    mediaType: mediaTypeMap[type] || 'document',
                    filename: msg.fileName || undefined,
                });
            }
        }

        return this.normalize(msg);
    }

    async markAsRead(messageId: string, userId: string) {
        await this.prisma.messageRead.upsert({
            where: { messageId_userId: { messageId, userId } },
            update: {},
            create: { messageId, userId },
        });
        return { ok: true };
    }

    async setWaMessageId(messageId: string, waMessageId: string) {
        await this.prisma.message.update({
            where: { id: messageId },
            data: { waMessageId },
        });
        return { ok: true };
    }

    private normalize(m: any) {
        return {
            id: m.id,
            content: m.content,
            kind: m.type?.toLowerCase() as 'text' | 'image' | 'video' | 'audio' | 'file',
            mediaUrl: m.mediaUrl ? `/chat/media/${m.id}` : null,
            fileName: m.fileName,
            fileSize: m.fileSize,
            duration: m.duration,
            sender: this.deriveSenderType(m),
            senderName: m.sender?.name ?? (m.direction === 'INCOMING' ? 'Cliente' : 'Sistema'),
            isInternal: m.isInternal,
            createdAt: m.createdAt,
            status: 'sent' as const,
        };
    }

    private deriveSenderType(m: { direction: string; sender: { role?: string } | null }): 'user' | 'technician' | 'bot' {
        if (m.direction === 'INCOMING') return 'user';
        if (!m.sender) return 'bot';
        if (m.sender.role === 'BOT') return 'bot';
        return 'technician';
    }
}