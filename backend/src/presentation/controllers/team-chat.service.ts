import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class TeamChatService {
    constructor(private prisma: PrismaService) { }

    async getMessages() {
        // Buscar últimas 50 mensagens
        const messages = await this.prisma.teamMessage.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                    },
                },
            },
        });

        // Inverter para ordem cronológica (mais antigas primeiro) para o frontend
        return messages.reverse();
    }

    async saveMessage(userId: string, content: string) {
        return this.prisma.teamMessage.create({
            data: {
                content,
                senderId: userId,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                    },
                },
            },
        });
    }
}
