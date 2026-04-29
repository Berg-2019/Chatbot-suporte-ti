/**
 * Live View Service - Real-time conversation monitoring
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface ActiveConversation {
    ticketId: string;
    customerName: string | null;
    customerJid: string;
    assignedTo?: {
        id: string;
        name: string;
    };
    status: string;
    priority: string;
    lastMessageAt: Date;
    lastMessageContent: string;
    unreadCount: number;
    responseTime?: number; // seconds since last message
    sector: string | null;
    isActive: boolean; // Active in last 5 minutes
}

export interface LiveViewStats {
    totalActive: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    bySector: Record<string, number>;
    avgResponseTime: number;
    longestWaiting: {
        ticketId: string;
        waitTime: number;
        customerName: string | null;
    } | null;
}

@Injectable()
export class LiveViewService {
    private readonly logger = new Logger(LiveViewService.name);
    private readonly ACTIVE_THRESHOLD_MINUTES = 5;

    constructor(private prisma: PrismaService) {}

    /**
     * Get all active conversations (updated in last 5 minutes)
     */
    async getActiveConversations(
        sector?: string,
        status?: string,
        agentId?: string,
    ): Promise<ActiveConversation[]> {
        const now = new Date();
        const thresholdTime = new Date(now.getTime() - this.ACTIVE_THRESHOLD_MINUTES * 60 * 1000);

        // Build where clause
        const where: any = {
            status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS'] },
            updatedAt: { gte: thresholdTime },
        };

        if (sector) {
            where.sector = sector;
        }

        if (status) {
            where.status = status;
        }

        if (agentId) {
            where.assignedToId = agentId;
        }

        // Fetch tickets with last message
        const tickets = await this.prisma.ticket.findMany({
            where,
            include: {
                assignedTo: {
                    select: { id: true, name: true },
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    where: {
                        isInternal: false, // Only customer-facing messages
                    },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });

        // Transform to ActiveConversation format
        const conversations: ActiveConversation[] = tickets.map((ticket) => {
            const lastMessage = ticket.messages[0];
            const lastMessageAt = lastMessage?.createdAt || ticket.createdAt;
            const responseTime = Math.floor((now.getTime() - lastMessageAt.getTime()) / 1000);

            return {
                ticketId: ticket.id,
                customerName: ticket.customerName,
                customerJid: ticket.phoneNumber ?? '',
                assignedTo: ticket.assignedTo
                    ? {
                          id: ticket.assignedTo.id,
                          name: ticket.assignedTo.name,
                      }
                    : undefined,
                status: ticket.status,
                priority: ticket.priority,
                lastMessageAt,
                lastMessageContent: lastMessage?.content || 'Sem mensagens',
                unreadCount: 0, // Could be calculated from message read status
                responseTime,
                sector: ticket.sector,
                isActive: responseTime < this.ACTIVE_THRESHOLD_MINUTES * 60,
            };
        });

        return conversations;
    }

    /**
     * Get live view statistics
     */
    async getLiveStats(sector?: string): Promise<LiveViewStats> {
        const now = new Date();
        const thresholdTime = new Date(now.getTime() - this.ACTIVE_THRESHOLD_MINUTES * 60 * 1000);

        const where: any = {
            status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS'] },
            updatedAt: { gte: thresholdTime },
        };

        if (sector) {
            where.sector = sector;
        }

        const tickets = await this.prisma.ticket.findMany({
            where,
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });

        // Calculate statistics
        const byStatus: Record<string, number> = {};
        const byPriority: Record<string, number> = {};
        const bySector: Record<string, number> = {};
        let totalResponseTime = 0;
        let longestWaiting: LiveViewStats['longestWaiting'] = null;

        tickets.forEach((ticket) => {
            // Count by status
            byStatus[ticket.status] = (byStatus[ticket.status] || 0) + 1;

            // Count by priority
            byPriority[ticket.priority] = (byPriority[ticket.priority] || 0) + 1;

            // Count by sector
            if (ticket.sector) {
                bySector[ticket.sector] = (bySector[ticket.sector] || 0) + 1;
            }

            // Calculate response time
            const lastMessage = ticket.messages[0];
            const lastMessageAt = lastMessage?.createdAt || ticket.createdAt;
            const responseTime = Math.floor((now.getTime() - lastMessageAt.getTime()) / 1000);
            totalResponseTime += responseTime;

            // Track longest waiting
            if (!longestWaiting || responseTime > longestWaiting.waitTime) {
                longestWaiting = {
                    ticketId: ticket.id,
                    waitTime: responseTime,
                    customerName: ticket.customerName,
                };
            }
        });

        return {
            totalActive: tickets.length,
            byStatus,
            byPriority,
            bySector,
            avgResponseTime: tickets.length > 0 ? Math.floor(totalResponseTime / tickets.length) : 0,
            longestWaiting,
        };
    }

    /**
     * Get agent activity (who's handling what)
     */
    async getAgentActivity() {
        const now = new Date();
        const thresholdTime = new Date(now.getTime() - this.ACTIVE_THRESHOLD_MINUTES * 60 * 1000);

        const agents = await this.prisma.user.findMany({
            where: {
                active: true,
                role: { in: ['AGENT', 'ADMIN'] },
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
        });

        const agentActivity = await Promise.all(
            agents.map(async (agent) => {
                const activeTickets = await this.prisma.ticket.count({
                    where: {
                        assignedToId: agent.id,
                        status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS'] },
                        updatedAt: { gte: thresholdTime },
                    },
                });

                const totalAssigned = await this.prisma.ticket.count({
                    where: {
                        assignedToId: agent.id,
                        status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS'] },
                    },
                });

                return {
                    agent: {
                        id: agent.id,
                        name: agent.name,
                        email: agent.email,
                    },
                    activeTickets,
                    totalAssigned,
                    isActive: activeTickets > 0,
                };
            }),
        );

        return agentActivity;
    }

    /**
     * Get conversation timeline for a ticket
     */
    async getConversationTimeline(ticketId: string) {
        const messages = await this.prisma.message.findMany({
            where: { ticketId },
            orderBy: { createdAt: 'asc' },
            include: {
                sender: {
                    select: { name: true, email: true },
                },
            },
        });

        return messages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            senderName: msg.sender?.name || 'System',
            isInternal: msg.isInternal,
            createdAt: msg.createdAt,
            direction: msg.direction,
            type: msg.type,
            mentions: msg.mentions || [],
        }));
    }

    /**
     * Get unassigned tickets (waiting for assignment)
     */
    async getUnassignedTickets() {
        const now = new Date();
        const tickets = await this.prisma.ticket.findMany({
            where: {
                assignedToId: null,
                status: 'NEW',
            },
            orderBy: { createdAt: 'asc' },
            take: 50,
        });

        return tickets.map((ticket) => ({
            ticketId: ticket.id,
            customerName: ticket.customerName,
            title: ticket.title,
            description: ticket.description,
            priority: ticket.priority,
            sector: ticket.sector,
            createdAt: ticket.createdAt,
            waitingTime: Math.floor((now.getTime() - ticket.createdAt.getTime()) / 1000),
        }));
    }
}
