import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TeamChatController } from './team-chat.controller';
import { TeamChatService } from './team-chat.service';
import { TeamChatGateway } from '../websockets/team-chat.gateway';
import { PrismaModule } from '../../infrastructure/database/prisma.module';

@Module({
    imports: [
        PrismaModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('JWT_SECRET')!,
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [TeamChatController],
    providers: [TeamChatService, TeamChatGateway],
})
export class TeamChatModule { }
