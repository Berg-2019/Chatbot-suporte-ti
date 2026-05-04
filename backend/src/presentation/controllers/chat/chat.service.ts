import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Sector } from '@prisma/client';

@Injectable()
export class ChatService {
    constructor(private prisma: PrismaService) { }

    async getConversations(sector?: Sector) {
        const tickets = await this.prisma.ticket.findMany({
            where: sector ? { sector } : undefined,
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

    async getMessages(ticketId: string) {
        const rows = await this.prisma.message.findMany({
            where: { ticketId },
            orderBy: { createdAt: 'asc' },
            include: {
                sender: { select: { id: true, name: true, role: true } },
            },
        });

        return rows.map(m => ({
            id: m.id,
            content: m.content,
            createdAt: m.createdAt,
            sender: this.deriveSenderType(m),
            senderName: m.sender?.name ?? (m.direction === 'INCOMING' ? 'Cliente' : 'Sistema'),
            isInternal: m.isInternal,
            intent: undefined as string | undefined,
            confidence: undefined as number | undefined,
        }));
    }

    private deriveSenderType(m: { direction: string; sender: { role?: string } | null }): 'user' | 'technician' | 'bot' {
        if (m.direction === 'INCOMING') return 'user';
        if (!m.sender) return 'bot';
        if (m.sender.role === 'BOT') return 'bot';
        return 'technician';
    }

    async sendMessage(ticketId: string, content: string, senderId: string, senderType: 'user' | 'technician' | 'bot' = 'technician') {
        const direction = senderType === 'user' ? 'INCOMING' : 'OUTGOING';
        return this.prisma.message.create({
            data: {
                ticketId,
                content,
                senderId,
                direction,
            },
            include: {
                sender: { select: { id: true, name: true, role: true } },
            },
        });
    }
}