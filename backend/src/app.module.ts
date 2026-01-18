/**
 * App Module - Root Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Infrastructure
import { PrismaModule } from './infrastructure/database/prisma.module';
import { RedisModule } from './infrastructure/cache/redis.module';
import { RabbitMQModule } from './infrastructure/messaging/rabbitmq.module';
import { ExternalModule } from './infrastructure/external/external.module';
import { ServicesModule } from './infrastructure/services/services.module';

// Presentation
import { AuthModule } from './presentation/controllers/auth/auth.module';
import { TicketsModule } from './presentation/controllers/tickets/tickets.module';
import { MessagesModule } from './presentation/controllers/messages/messages.module';
import { BotModule } from './presentation/controllers/bot/bot.module';
import { UsersModule } from './presentation/controllers/users/users.module';
import { PartsModule } from './presentation/controllers/parts/parts.module';
import { FaqModule } from './presentation/controllers/faq/faq.module';
import { MetricsModule } from './presentation/controllers/metrics/metrics.module';
import { ContactsModule } from './presentation/controllers/contacts/contacts.module';
import { WebsocketModule } from './presentation/websockets/websocket.module';

// Health check
import { HealthController } from './presentation/controllers/health.controller';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Infrastructure
    PrismaModule,
    RedisModule,
    RabbitMQModule,
    ExternalModule,
    ServicesModule,

    // Features
    AuthModule,
    TicketsModule,
    MessagesModule,
    BotModule,
    UsersModule,
    PartsModule,
    FaqModule,
    MetricsModule,
    ContactsModule,
    WebsocketModule,
  ],
  controllers: [HealthController],
})
export class AppModule { }

