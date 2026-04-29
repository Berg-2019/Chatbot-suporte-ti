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
        return this.prisma.message.findMany({
            where: { ticketId },
            orderBy: { createdAt: 'asc' },
            include: {
                sender: { select: { id: true, name: true, role: true } },
            },
        });
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