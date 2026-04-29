import { Controller, Get, Post, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
    constructor(private service: ChatService) { }

    @Get('conversations')
    async getConversations(@Req() req: any, @Query('sector') sector?: string) {
        const userSector = sector || req.user.sector || 'TI';
        return this.service.getConversations(userSector);
    }

    @Get('messages/:ticketId')
    async getMessages(@Param('ticketId') ticketId: string) {
        return this.service.getMessages(ticketId);
    }

    @Post('messages/:ticketId')
    async sendMessage(
        @Param('ticketId') ticketId: string,
        @Body() dto: { content: string },
        @Req() req: any
    ) {
        return this.service.sendMessage(ticketId, dto.content, req.user.id, 'technician');
    }
}