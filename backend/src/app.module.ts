/**
 * App Module - Root Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { validate } from './config/env.validation';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';
import { AuditModule } from './common/audit/audit.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { TraceIdInterceptor } from './common/interceptors/trace-id.interceptor';

// Infrastructure
import { PrismaModule } from './infrastructure/database/prisma.module';
import { RedisModule } from './infrastructure/cache/redis.module';
import { RabbitMQModule } from './infrastructure/messaging/rabbitmq.module';
import { ServicesModule } from './infrastructure/services/services.module';

// Presentation
import { AuthModule } from './presentation/controllers/auth/auth.module';
import { TicketsModule } from './presentation/controllers/tickets/tickets.module';
import { MessagesModule } from './presentation/controllers/messages/messages.module';
import { UsersModule } from './presentation/controllers/users/users.module';
import { PartsModule } from './presentation/controllers/parts/parts.module';
import { FaqModule } from './presentation/controllers/faq/faq.module';
import { MetricsModule } from './presentation/controllers/metrics/metrics.module';
import { ContactsModule } from './presentation/controllers/contacts/contacts.module';
import { TeamChatModule } from './presentation/controllers/team-chat.module';
import { ChatModule } from './presentation/controllers/chat/chat.module';
import { PurchasesModule } from './presentation/controllers/purchases/purchases.module';
import { PurchaseRequestsModule } from './presentation/controllers/purchase-requests/purchase-requests.module';
import { ReportsModule } from './presentation/controllers/reports/reports.module';
import { StockModule } from './presentation/controllers/stock/stock.module';
import { ReservationModule } from './presentation/controllers/reservations/reservation.module';
import { PrinterModule } from './presentation/controllers/printers/printer.module';
import { WebsocketModule } from './presentation/websockets/websocket.module';
import { CannedResponsesModule } from './presentation/controllers/canned-responses/canned-responses.module';
import { WebhooksModule } from './presentation/controllers/webhooks/webhooks.module';
import { CsatModule } from './presentation/controllers/csat/csat.module';
import { AutomationModule } from './presentation/controllers/automation/automation.module';
import { AutoAssignmentModule } from './presentation/controllers/auto-assignment/auto-assignment.module';
import { IntentModule } from './presentation/controllers/intent/intent.module';
import { AgentMetricsModule } from './presentation/controllers/agent-metrics/agent-metrics.module';
import { LabelsModule } from './presentation/controllers/labels/labels.module';
import { BotVariablesModule } from './presentation/controllers/bot-variables/bot-variables.module';
import { EmailConfigModule } from './presentation/controllers/email-config/email-config.module';
import { KnowledgeModule } from './presentation/controllers/knowledge/knowledge.module';
import { MacrosModule } from './presentation/controllers/macros/macros.module';
import { LiveViewModule } from './presentation/controllers/live-view/live-view.module';
import { NotificationPreferencesModule } from './presentation/controllers/notification-preferences/notification-preferences.module';
import { SettingsModule } from './presentation/controllers/settings/settings.module';
import { HermesModule } from './presentation/controllers/hermes/hermes.module';
import { ToolsModule } from './presentation/controllers/tools/tools.module';
import { AssetsModule } from './presentation/controllers/assets/assets.module';
import { LicensesModule } from './presentation/controllers/licenses/licenses.module';
import { SlaModule } from './presentation/controllers/sla/sla.module';
import { PushModule } from './presentation/controllers/push/push.module';
import { TechnicalReportsModule } from './presentation/controllers/technical-reports/technical-reports.module';
import { AiModule } from './presentation/controllers/ai/ai.module';

// Admin
import { AdminModule } from './presentation/controllers/admin/admin.module';

// Jobs
import { DataRetentionJob } from './infrastructure/jobs/data-retention.job';

// Health check
import { HealthController } from './presentation/controllers/health.controller';

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

    // AuditLog (LGPD Art. 37)
    AuditModule,

    // Infrastructure
    PrismaModule,
    RedisModule,
    RabbitMQModule,
    ServicesModule,

    // Features
    AuthModule,
    TicketsModule,
    MessagesModule,
    UsersModule,
    PartsModule,
    FaqModule,
    MetricsModule,
    ContactsModule,
    TeamChatModule,
    ChatModule,
    PurchasesModule,
    PurchaseRequestsModule,
    ReportsModule,
    StockModule,
    ReservationModule,
    PrinterModule,
    WebsocketModule,
    CannedResponsesModule,
    WebhooksModule,
    CsatModule,
    AutomationModule,
    AutoAssignmentModule,
    IntentModule,
    AgentMetricsModule,
    LabelsModule,
    BotVariablesModule,
    EmailConfigModule,
    KnowledgeModule,
    MacrosModule,
    LiveViewModule,
    NotificationPreferencesModule,
    SettingsModule,
    HermesModule,
    ToolsModule,
    AssetsModule,
    LicensesModule,
    SlaModule,
    PushModule,
    TechnicalReportsModule,
    AiModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    DataRetentionJob,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TraceIdInterceptor,
    },
  ],
})
export class AppModule { }

