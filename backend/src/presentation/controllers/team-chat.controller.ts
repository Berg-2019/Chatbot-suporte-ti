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
    async getMessages() {
        return this.service.getMessages();
    }

    @Post()
    async sendMessage(@Body() dto: { content: string }, @Req() req: any) {
        // userId comes from JWT guard (req.user)
        const userId = req.user.id;
        const message = await this.service.saveMessage(userId, dto.content);

        // Notify via WebSocket
        this.gateway.server.emit('newMessage', message);

        return message;
    }
}
