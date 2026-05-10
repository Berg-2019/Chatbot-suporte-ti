import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsNotEmpty } from 'class-validator';
import { SectorGuard } from '../../common/guards/sector.guard';
import { TeamChatService } from './team-chat.service';
import { TeamChatGateway } from '../websockets/team-chat.gateway';

class SendTeamMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}

@Controller('team-chat')
@UseGuards(AuthGuard('jwt'), SectorGuard)
export class TeamChatController {
    constructor(
        private service: TeamChatService,
        private gateway: TeamChatGateway
    ) { }

    @Get('channels')
    async getChannels() {
        return this.service.getChannels();
    }

    @Get('messages/:channelId')
    async getMessages(@Param('channelId') channelId: string) {
        return this.service.getChannelMessages(channelId);
    }

    @Post('messages/:channelId')
    async sendMessage(
        @Param('channelId') channelId: string,
        @Body() dto: SendTeamMessageDto,
        @Req() req: any
    ) {
        const userId = req.user.id;
        const message = await this.service.saveChannelMessage(userId, channelId, dto.content);

        this.gateway.server.to(`team-chat:${channelId}`).emit('newMessage', message);
        return message;
    }

    @Get()
    async getMessagesBySector(@Req() req: any) {
        const sector = req.user.sector || 'TI';
        return this.service.getMessages(sector);
    }

    @Post()
    async sendMessageBySector(@Body() dto: SendTeamMessageDto, @Req() req: any) {
        const userId = req.user.id;
        const sector = req.user.sector || 'TI';
        const message = await this.service.saveMessage(userId, dto.content, sector);

        this.gateway.server.to(`team-chat:${sector}`).emit('newMessage', message);
        return message;
    }
}
