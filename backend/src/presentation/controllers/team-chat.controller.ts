import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Controller('team-chat')
@UseGuards(AuthGuard('jwt'))
export class TeamChatController {
    constructor(private prisma: PrismaService) { }

    @Get()
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
}
