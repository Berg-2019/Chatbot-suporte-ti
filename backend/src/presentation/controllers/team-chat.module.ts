import { Module } from '@nestjs/common';
import { TeamChatController } from './team-chat.controller';
import { TeamChatService } from './team-chat.service';
import { TeamChatGateway } from '../websockets/team-chat.gateway';
import { PrismaModule } from '../../infrastructure/database/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [TeamChatController],
    providers: [TeamChatService, TeamChatGateway],
})
export class TeamChatModule { }
