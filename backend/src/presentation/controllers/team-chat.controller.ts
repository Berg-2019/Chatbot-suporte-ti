import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TeamChatService } from './team-chat.service';
import { TeamChatGateway } from '../websockets/team-chat.gateway';

@Controller('team-chat')
@UseGuards(AuthGuard('jwt'))
export class TeamChatController {
    constructor(
        private service: TeamChatService,
        private gateway: TeamChatGateway
    ) { }

    @Get()
    async getMessages(@Req() req: any) {
        // Filter messages by user's sector
        const sector = req.user.sector || 'TI';
        return this.service.getMessages(sector);
    }

    @Post()
    async sendMessage(@Body() dto: { content: string }, @Req() req: any) {
        // userId and sector come from JWT guard (req.user)
        const userId = req.user.id;
        const sector = req.user.sector || 'TI';
        const message = await this.service.saveMessage(userId, dto.content, sector);

        // Notify via WebSocket - emit to sector-specific room
        this.gateway.server.to(`team-chat:${sector}`).emit('newMessage', message);

        return message;
    }
}
