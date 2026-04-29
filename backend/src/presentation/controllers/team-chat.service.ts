import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Sector } from '@prisma/client';

@Injectable()
export class TeamChatService {
    constructor(private prisma: PrismaService) { }

    async getChannels() {
        const sectors: Sector[] = ['TI', 'ELECTRIC', 'COMPRAS'];
        const channels = await Promise.all(
            sectors.map(async (sector) => {
                const lastMessage = await this.prisma.teamMessage.findFirst({
                    where: { sector },
                    orderBy: { createdAt: 'desc' },
                    include: {
                        sender: { select: { name: true } },
                    },
                });
                const count = await this.prisma.teamMessage.count({ where: { sector } });
                return {
                    id: sector,
                    name: sector === 'TI' ? 'Geral TI' : sector === 'ELECTRIC' ? 'Elétrica' : 'Compras',
                    description: `Canal da equipe de ${sector}`,
                    unreadCount: 0,
                    lastMessage: lastMessage ? {
                        content: lastMessage.content,
                        sender: lastMessage.sender?.name,
                        createdAt: lastMessage.createdAt,
                    } : null,
                    messageCount: count,
                };
            })
        );
        return channels;
    }

    async getChannelMessages(channelId: string) {
        const messages = await this.prisma.teamMessage.findMany({
            where: { sector: channelId as Sector },
            orderBy: { createdAt: 'asc' },
            take: 100,
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        sector: true,
                    },
                },
            },
        });
        return messages;
    }

    async saveChannelMessage(userId: string, channelId: string, content: string) {
        return this.prisma.teamMessage.create({
            data: {
                content,
                senderId: userId,
                sector: channelId as Sector,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        sector: true,
                    },
                },
            },
        });
    }

    async getMessages(sector: Sector = 'TI') {
        const messages = await this.prisma.teamMessage.findMany({
            where: { sector },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        sector: true,
                    },
                },
            },
        });
        return messages.reverse();
    }

    async saveMessage(userId: string, content: string, sector: Sector = 'TI') {
        return this.prisma.teamMessage.create({
            data: {
                content,
                senderId: userId,
                sector,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        sector: true,
                    },
                },
            },
        });
    }
}
