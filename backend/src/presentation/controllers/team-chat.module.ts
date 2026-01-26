import { Module } from '@nestjs/common';
import { TeamChatController } from './team-chat.controller';
import { PrismaModule } from '../../infrastructure/database/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [TeamChatController],
})
export class TeamChatModule { }
