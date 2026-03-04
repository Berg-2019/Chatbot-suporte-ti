/**
 * App Module - Root Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { validate } from './config/env.validation';

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
import { TeamChatModule } from './presentation/controllers/team-chat.module';
import { PurchasesModule } from './presentation/controllers/purchases/purchases.module';
import { ReportsModule } from './presentation/controllers/reports/reports.module';
import { StockModule } from './presentation/controllers/stock/stock.module';
import { ReservationModule } from './presentation/controllers/reservations/reservation.module';
import { PrinterModule } from './presentation/controllers/printers/printer.module';
import { WebsocketModule } from './presentation/websockets/websocket.module';
import { CannedResponsesModule } from './presentation/controllers/canned-responses/canned-responses.module';
import { WebhooksModule } from './presentation/controllers/webhooks/webhooks.module';
// import { RolesModule } from './presentation/controllers/roles/roles.module'; // DISABLED - requires customRole model
import { CsatModule } from './presentation/controllers/csat/csat.module';
import { AutomationModule } from './presentation/controllers/automation/automation.module';
import { AutoAssignmentModule } from './presentation/controllers/auto-assignment/auto-assignment.module';
import { IntentModule } from './presentation/controllers/intent/intent.module';
import { AgentMetricsModule } from './presentation/controllers/agent-metrics/agent-metrics.module';
import { LabelsModule } from './presentation/controllers/labels/labels.module';
import { BotVariablesModule } from './presentation/controllers/bot-variables/bot-variables.module';
import { EmailConfigModule } from './presentation/controllers/email-config/email-config.module';
import { KnowledgeModule } from './presentation/controllers/knowledge/knowledge.module';

// Health check
import { HealthController } from './presentation/controllers/health.controller';
import { LogsController } from './presentation/controllers/admin/logs.controller';

@Module({
  imports: [
    // Config with validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),

    // Rate Limiting (60 requests per minute)
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 60,  // 60 requests
    }]),

    // Cron Jobs (for Agent Metrics)
    ScheduleModule.forRoot(),

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
    TeamChatModule,
    PurchasesModule,
    ReportsModule,
    StockModule,
    ReservationModule,
    PrinterModule,
    WebsocketModule,
    CannedResponsesModule,
    WebhooksModule,
    // RolesModule, // DISABLED - requires customRole model
    CsatModule,
    AutomationModule,
    AutoAssignmentModule,
    IntentModule,
    AgentMetricsModule,
    LabelsModule,
    BotVariablesModule,
    EmailConfigModule,
    KnowledgeModule,
  ],
  controllers: [HealthController, LogsController],
  providers: [
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }

