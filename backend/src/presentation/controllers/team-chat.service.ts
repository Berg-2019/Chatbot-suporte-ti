import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class TeamChatService {
    constructor(private prisma: PrismaService) { }

    async getMessages(sector: string = 'TI') {
        // Buscar últimas 50 mensagens do setor específico
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

        // Inverter para ordem cronológica (mais antigas primeiro) para o frontend
        return messages.reverse();
    }

    async saveMessage(userId: string, content: string, sector: string = 'TI') {
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
